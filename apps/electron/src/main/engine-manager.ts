import {
  Agent, AnthropicProvider, OpenAICompatibleProvider,
  ASK_PERMISSION_POLICY, DEFAULT_PERMISSION_POLICY, READ_ONLY_PERMISSION_POLICY, READ_ONLY_TOOLS, ToolExecutor,
  normalizeProviderError,
} from '@kova/agent'
import type { AgentProvider, InteractiveRunner } from '@kova/agent'
import { terminalManager } from './terminal-manager'
import { createPreviewWorkspace } from './preview-manager'
import { CodeApplicationEngine, createDiffReviewDecision } from '@kova/application'
import { ContextEngine } from '@kova/context'
import { ExecutionEngine, consolidateIterationChanges, structureTask } from '@kova/execution'
import { HarnessOrchestrator } from '@kova/orchestrator'
import type { AgentContext, Attachment, DiffReviewSelection, ExecutionEvent, ExecutionState, TaskDefinition, AgentMessage, Todo, ProofPack, AgentResultMessage } from '@kova/shared'
import { basename } from 'node:path'
import { readdirSync } from 'node:fs'
import { MemorySystem } from '@kova/memory'
import { adapterFromProjectProfile, detectStack } from '@kova/adapters'
import { buildProjectProfile } from '@kova/project'
import { resolveAtRefs, shouldShortCircuitDeniedRefs, deniedRefsMessage } from './at-refs'
import type { ResolvedAtRefs } from './at-refs'
import { chatOnlyPrompt, globalChatPrompt, reviewOnlyPrompt, planOnlyPrompt, resolveRunMode, parsePlanResultRobust, stripPlanXml } from './session-prompts'
import type { KovaRunMode } from './session-prompts'
import {
  buildContextEngine, contextBudgetFor, contextBuildOptions, contextEventPayload,
  createReasoningEmitter, estimateMessagesTokens, buildFallbackTask, toRelative,
} from './session-utils'

interface ProviderUsageReport {
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  inputTokens: number
  outputTokens: number
}
import { buildProvider, tryFallbackProvider } from './provider-resolver'
import type { ProviderFactory, ProviderResolution } from './provider-resolver'
import { buildPatchTask } from './task-structurer'
import { LruCache } from './lru-cache'
import {
  createRunSnapshot,
  finalizeRunSnapshot,
  recordSnapshotEvent,
  recordSnapshotState,
  writeRunSnapshot,
} from './run-snapshot-store'

// Re-export provider types so existing consumers of engine-manager keep working unchanged.
export { autoResolveModel, buildProvider } from './provider-resolver'
export type { ProviderFactory, ProviderResolution } from './provider-resolver'

export type { KovaRunMode }
export type KovaPermissionMode = 'auto-review' | 'ask' | 'full-access'

export interface StartTaskParams {
  objective: string
  projectRoot?: string
  sessionId?: string
  provider?: string
  apiKey?: string
  model?: string
  baseUrl?: string
  autoApply?: boolean
  maxIterations?: number
  mode?: KovaRunMode
  permissionMode?: KovaPermissionMode
  includeProjectContext?: boolean
  queuedCount?: number
  openedFiles?: string[]
}

// FIX-004: User-facing copy used to build the AgentResultMessage card after a patch
// session completes. Centralised so translations and tweaks stay together.
const RESULT_COPY = {
  diffReviewMessage: (count: number) => `${count} file${count === 1 ? '' : 's'} awaiting review`,
  contextLoaded: (count: number) => `${count} file${count === 1 ? '' : 's'} in context`,
  titleCompleted: 'Task complete',
  titlePaused: 'Awaiting review',
  titleFailed: 'Repair needed',
  summaryCompleted: 'Changes applied successfully.',
  summaryPaused: 'Review required before applying.',
  summaryMaxIterationsReached: 'Maximum repair attempts reached.',
  summaryFailedLayers: (layers: string, attempts: number) =>
    `${layers} failed after ${attempts} attempt${attempts === 1 ? '' : 's'}.`,
} as const

// ——— Engine Manager ——————————————————————————————————————————————————————————

const BLANK_PROJECT_IGNORED_ENTRIES = new Set([
  '.git',
  '.kova',
  '.turbo',
  'node_modules',
  'dist',
  'out',
  'build',
  '.DS_Store',
  '.gitignore',
  '.gitattributes',
])

function projectLooksBlank(projectRoot: string): boolean {
  try {
    return readdirSync(projectRoot, { withFileTypes: true })
      .filter(entry => !BLANK_PROJECT_IGNORED_ENTRIES.has(entry.name))
      .length === 0
  } catch {
    return false
  }
}

export class EngineManager {
  private engine: ExecutionEngine | null = null
  private sessionAbort: AbortController | null = null
  private onUpdate: ((state: ExecutionState) => void) | null = null
  private onStructured: ((task: TaskDefinition) => void) | null = null
  private onError: ((msg: string) => void) | null = null
  private onModelDetected: ((model: string) => void) | null = null
  private onChatResponse: ((msg: string) => void) | null = null
  private onExecutionEvent: ((event: ExecutionEvent) => void) | null = null
  // FIX-002 + FIX-010: Cache MemorySystem + ContextEngine per projectRoot, bounded by
  // LruCache so opening many projects does not pin instances forever. Both caches share
  // the same key (projectRoot) and the same capacity — when a project is evicted from
  // one, the matching entry is dropped from the other so they stay in sync.
  private static readonly MAX_CACHED_PROJECTS = 3
  private readonly memorySystemCache = new LruCache<string, MemorySystem>(EngineManager.MAX_CACHED_PROJECTS)
  private readonly contextEngineCache = new LruCache<string, { adapterName: string; engine: ContextEngine }>(EngineManager.MAX_CACHED_PROJECTS)

  constructor(private readonly providerFactory: ProviderFactory = buildProvider) {}

  private getMemorySystem(projectRoot: string): MemorySystem {
    const cached = this.memorySystemCache.get(projectRoot)
    if (cached) return cached
    const memory = new MemorySystem(projectRoot)
    const { evicted } = this.memorySystemCache.set(projectRoot, memory)
    // FIX-010: keep the two caches in sync — when one project ages out of the
    // memory cache, drop its ContextEngine too (the engine holds a reference
    // to the now-evicted memory and would drift on the next access).
    if (evicted) this.contextEngineCache.delete(evicted.key)
    return memory
  }

  private getContextEngine(projectRoot: string, adapter: ReturnType<typeof detectStack>): ContextEngine {
    const cached = this.contextEngineCache.get(projectRoot)
    if (cached?.adapterName === adapter.name) return cached.engine
    const engine = buildContextEngine(projectRoot, adapter, this.getMemorySystem(projectRoot))
    const { evicted } = this.contextEngineCache.set(projectRoot, { adapterName: adapter.name, engine })
    if (evicted) this.memorySystemCache.delete(evicted.key)
    return engine
  }

  /**
   * FIX-010: Explicit cache cleanup for a project. Called when the user closes or
   * switches projects — frees the in-memory ContextEngine + MemorySystem instances
   * for that root so they don't linger if they would otherwise survive eviction.
   */
  clearProjectCache(projectRoot: string): void {
    this.contextEngineCache.delete(projectRoot)
    this.memorySystemCache.delete(projectRoot)
  }

  /** Thin wrapper that injects this instance's state into the pure tryFallbackProvider helper. */
  private async resolveFallbackProvider(
    params: StartTaskParams,
    primaryError: unknown,
  ): Promise<ProviderResolution | null> {
    return tryFallbackProvider({
      params,
      primaryError,
      factory: this.providerFactory,
      isAborted: () => Boolean(this.sessionAbort?.signal.aborted),
      onModelDetected: this.onModelDetected ?? undefined,
    })
  }

  setHandlers(
    onUpdate: (state: ExecutionState) => void,
    onStructured: (task: TaskDefinition) => void,
    onError: (msg: string) => void,
    onModelDetected: (model: string) => void,
    onChatResponse: (msg: string) => void,
    onExecutionEvent: (event: ExecutionEvent) => void,
  ): void {
    this.onUpdate = onUpdate; this.onStructured = onStructured
    this.onError = onError; this.onModelDetected = onModelDetected
    this.onChatResponse = onChatResponse; this.onExecutionEvent = onExecutionEvent
  }

  private emit(e: Omit<ExecutionEvent, 'taskId' | 'timestamp'> & { taskId?: string }): void {
    this.onExecutionEvent?.({ taskId: 'chat', timestamp: new Date().toISOString(), ...e })
  }

  async sendMessage(message: string, history: AgentMessage[], params: StartTaskParams, attachments?: Attachment[]): Promise<void> {
    return this.sendMessageWithMode(message, history, params, attachments)
  }

  private async sendMessageWithMode(message: string, history: AgentMessage[], params: StartTaskParams, attachments?: Attachment[]): Promise<void> {
    // Cancel any in-flight session or engine. The renderer queues user messages, so this
    // mainly protects direct IPC calls and stale work in the main process.
    this.sessionAbort?.abort()
    this.sessionAbort = new AbortController()
    if (this.engine) { await this.engine.abort().catch(() => null); this.engine = null }

    const mode = resolveRunMode(message, params.mode)
    // Strip the leading slash command so the model receives the actual request,
    // not the routing token. Done uniformly for all slash-routed modes.
    const rawContent = stripModeSlash(message, mode)

    if (!params.projectRoot) {
      if (mode !== 'chat') {
        this.emit({ type: 'token', token: workspaceRequiredMessage(mode) })
        this.emit({ type: 'stream_end' })
        return
      }
      await this.runGlobalChatSession(rawContent, history, params, this.sessionAbort.signal, attachments)
      return
    }

    const { projectRoot } = params
    const profile = buildProjectProfile(projectRoot)
    const adapter = profile.confidence > 0 ? adapterFromProjectProfile(profile) : detectStack(projectRoot)
    const resolution = resolveAtRefs(rawContent, projectRoot)

    if (resolution.refs.length) this.emit({ type: 'tool_result', message: `@ ${resolution.refs.map(r => r.path).join(', ')}` })
    if (resolution.denied.length) {
      for (const ref of resolution.denied) this.emit({ type: 'context_ref_denied', message: ref.reason, toolInput: { path: ref.path } })
    }
    if (resolution.missing.length) this.emit({ type: 'tool_result', message: `@ not found: ${resolution.missing.join(', ')}` })

    if (shouldShortCircuitDeniedRefs(rawContent, resolution)) {
      this.onChatResponse?.(deniedRefsMessage(resolution))
      this.emit({ type: 'stream_end' })
      return
    }

    // Deterministic short-circuit — "devo testar agora?" after applied changes.
    // Runs BEFORE mode inference so the deterministic reply fires regardless of
    // whether the message phrasing would route to chat or patch. Avoids burning
    // a provider call when we already know the answer from session state.
    const deterministicReply = buildTestingFollowupReply(resolution.userContent, history)
    if (deterministicReply) {
      const tokens = estimateMessagesTokens([{ role: 'assistant', content: deterministicReply }])
      this.emit({ type: 'token', token: deterministicReply })
      this.emit({ type: 'token_usage', message: `${tokens} tokens`, tokensUsed: tokens })
      this.emit({ type: 'stream_end' })
      return
    }

    let resolution2: ProviderResolution | null
    try {
      resolution2 = await this.providerFactory(params, this.onModelDetected ?? undefined)
    } catch (err) {
      // Try fallback provider on hard error if configured
      const fallback = await this.resolveFallbackProvider(params, err)
      if (fallback) {
        resolution2 = fallback
      } else {
        this.emitProviderError(err)
        if (!this.sessionAbort.signal.aborted) this.onChatResponse?.(formatProviderError(err))
        this.emit({ type: 'stream_end' })
        return
      }
    }
    if (!resolution2) {
      // Try fallback when primary returned null (auth missing, no model)
      const fallback = await this.resolveFallbackProvider(params, new Error('Primary provider not configured'))
      if (fallback) {
        resolution2 = fallback
      } else {
        this.onChatResponse?.('Provider not configured. Open Settings.')
        this.emit({ type: 'stream_end' })
        return
      }
    }

    const provider = resolution2.provider
    // Emit auditable session-start event — always records requested vs resolved model/provider
    this.emit({
      type: 'provider_session_start',
      message: resolution2.fallback
        ? `Provider: ${resolution2.resolvedProvider} / model: ${resolution2.resolvedModel} (fallback — ${resolution2.fallbackReason ?? 'configured model unavailable'})`
        : `Provider: ${resolution2.resolvedProvider} / model: ${resolution2.resolvedModel ?? 'auto'}`,
      providerMeta: {
        requestedProvider: params.provider ?? 'anthropic',
        requestedModel: params.model || undefined,
        resolvedProvider: resolution2.resolvedProvider,
        resolvedModel: resolution2.resolvedModel,
        fallback: resolution2.fallback,
        fallbackReason: resolution2.fallbackReason,
      },
    })

    const explicitFiles = resolution.refs.map(ref => ref.path)
    if (mode === 'plan') {
      await this.runPlanSession(resolution.userContent || 'Create an implementation plan for this project.', history, provider, projectRoot, adapter, params.includeProjectContext !== false, this.sessionAbort.signal, explicitFiles, params.openedFiles ?? [], attachments)
      return
    }
    if (mode === 'chat') {
      await this.runChatSession(resolution.userContent, history, provider, projectRoot, adapter, params, this.sessionAbort.signal, explicitFiles, attachments)
      return
    }
    if (mode === 'review') {
      await this.runReviewSession(resolution.userContent, history, provider, projectRoot, adapter, params, this.sessionAbort.signal, explicitFiles, attachments)
      return
    }
    const task = await buildPatchTask(resolution.userContent, provider, projectRoot, adapter, {
      signal: this.sessionAbort.signal,
    })
    this.onStructured?.(task)
    // FIX-001: Patch mode receives history so the agent has memory of prior turns
    // ("now add X to the file you just created" requires knowing what was created).
    // Caller (App.tsx) already filters via buildTokenBudgetedHistory — only clean
    // user/assistant turns reach here, never tool-call narration.
    await this.runUnifiedSession(
      resolution.userContent,
      history,
      params,
      provider,
      projectRoot,
      adapter,
      task,
      true,
      this.sessionAbort.signal,
      explicitFiles,
      attachments,
    )
  }

  private async runGlobalChatSession(
    userContent: string,
    history: AgentMessage[],
    params: StartTaskParams,
    signal?: AbortSignal,
    attachments?: Attachment[],
  ): Promise<void> {
    let streamEndEmitted = false
    const reasoning = createReasoningEmitter((event) => this.emit(event))
    try {
      const deterministicReply = buildTestingFollowupReply(userContent, history)
      if (deterministicReply) {
        const tokens = estimateMessagesTokens([{ role: 'assistant', content: deterministicReply }])
        this.emit({ type: 'token', token: deterministicReply })
        this.emit({ type: 'token_usage', message: `${tokens} tokens`, tokensUsed: tokens })
        this.emit({ type: 'stream_end' })
        streamEndEmitted = true
        return
      }

      let resolution: ProviderResolution | null
      try {
        resolution = await this.providerFactory(params, this.onModelDetected ?? undefined)
      } catch (err) {
        const fallback = await this.resolveFallbackProvider(params, err)
        if (!fallback) {
          this.emitProviderError(err)
          if (!signal?.aborted) this.onChatResponse?.(formatProviderError(err))
          this.emit({ type: 'stream_end' })
          streamEndEmitted = true
          return
        }
        resolution = fallback
      }

      if (!resolution) {
        const fallback = await this.resolveFallbackProvider(params, new Error('Primary provider not configured'))
        if (!fallback) {
          this.onChatResponse?.('Provider not configured. Open Settings.')
          this.emit({ type: 'stream_end' })
          streamEndEmitted = true
          return
        }
        resolution = fallback
      }

      this.emit({
        type: 'provider_session_start',
        message: resolution.fallback
          ? `Provider: ${resolution.resolvedProvider} / model: ${resolution.resolvedModel} (fallback - ${resolution.fallbackReason ?? 'configured model unavailable'})`
          : `Provider: ${resolution.resolvedProvider} / model: ${resolution.resolvedModel ?? 'auto'}`,
        providerMeta: {
          requestedProvider: params.provider ?? 'anthropic',
          requestedModel: params.model || undefined,
          resolvedProvider: resolution.resolvedProvider,
          resolvedModel: resolution.resolvedModel,
          fallback: resolution.fallback,
          fallbackReason: resolution.fallbackReason,
        },
      })

      const messages: AgentMessage[] = [...history, { role: 'user', content: userContent, ...(attachments ? { attachments } : {}) }]
      reasoning.start()
      const output = await resolution.provider.generate(messages, { system: globalChatPrompt() })
      reasoning.end()
      if (output.thought.trim()) this.emit({ type: 'token', token: output.thought })
      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: 'assistant', content: output.thought }])
      this.emit({ type: 'token_usage', message: `${turnTokens} tokens`, tokensUsed: turnTokens })
    } catch (err) {
      if (!signal?.aborted) {
        this.emitProviderError(err)
        this.onChatResponse?.(formatProviderError(err))
      }
    } finally {
      reasoning.end()
      if (!streamEndEmitted) {
        this.emit({ type: 'stream_end' })
        streamEndEmitted = true
      }
    }
  }


  private async runChatSession(
    userContent: string,
    history: AgentMessage[],
    provider: AgentProvider,
    projectRoot: string,
    adapter: ReturnType<typeof detectStack>,
    params: StartTaskParams,
    signal?: AbortSignal,
    explicitFiles: string[] = [],
    attachments?: Attachment[],
  ): Promise<void> {
    let streamEndEmitted = false
    const reasoning = createReasoningEmitter((event) => this.emit(event))
    try {
      // Deterministic testing-followup reply is now handled at the top of
      // sendMessageWithMode (works in all modes). No duplicate check here.

      let content = userContent
      if (params.includeProjectContext !== false && (history.length === 0 || !history.some(h => h.role === 'assistant'))) {
        const contextEngine = this.getContextEngine(projectRoot, adapter)
        const maxContextTokens = contextBudgetFor(provider)
        const task = buildFallbackTask(userContent.split('\n')[0].slice(0, 120), adapter.name)
        const ctx = await contextEngine.buildContext(task, projectRoot, contextBuildOptions(projectRoot, maxContextTokens, explicitFiles, params.openedFiles ?? []))
        this.emit({
          type: 'context_loaded',
          message: RESULT_COPY.contextLoaded(ctx.files.length),
          context: contextEventPayload(ctx, maxContextTokens),
        })
        if (ctx.files.length > 0) {
          content += '\n\n---\nProject context:\n' + ctx.files.map(f => `\n### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n')
        }
      }

      const messages: AgentMessage[] = [...history, { role: 'user', content, ...(attachments ? { attachments } : {}) }]
      reasoning.start()
      let usageReported = false
      // Chat mode runs the agent with READ_ONLY_TOOLS so the model can grep,
      // glob, and read files when the user's question depends on actual code
      // state. Edit/bash are denied by READ_ONLY_PERMISSION_POLICY so the
      // session remains side-effect-free. Without tools the model would refuse
      // honestly ("I cannot inspect files") even when context promised access —
      // a UX bug that surfaced as "ele me disse que não pode rodar comandos".
      let emittedText = false
      const output = await provider.runAgentLoop(messages, {
        system: chatOnlyPrompt(adapter.name),
        tools: READ_ONLY_TOOLS,
        executor: new ToolExecutor(projectRoot, signal, READ_ONLY_PERMISSION_POLICY),
        maxTurns: 6,
        signal,
        onToken: t => {
          reasoning.end()
          if (t.trim()) emittedText = true
          this.emit({ type: 'token', token: t })
        },
        onReasoningStart: () => reasoning.start(),
        onReasoningDelta: delta => reasoning.delta(delta),
        onReasoningEnd: () => reasoning.end(),
        onToolCall: (name, input) => {
          const preview = String(input.path ?? input.dir ?? input.pattern ?? name)
          this.emit({ type: 'tool_call', toolName: name, toolInput: input, message: preview })
        },
        onToolResult: (name, result) => this.emit({
          type: 'tool_result',
          toolName: name,
          message: result.slice(0, 2_000),
          toolOutput: result.slice(0, 20_000),
        }),
        onUsageReport: report => {
          usageReported = true
          this.emit(usageEventFromReport(report))
        },
      })
      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: 'assistant', content: output.thought }])
      if (!usageReported) this.emit({ type: 'token_usage', message: `${turnTokens} tokens`, tokensUsed: turnTokens })
      if (!emittedText && output.thought.trim()) this.emit({ type: 'token', token: output.thought })
    } catch (err) {
      if (!signal?.aborted) {
        this.emitProviderError(err)
        this.onChatResponse?.(formatProviderError(err))
      }
    } finally {
      reasoning.end()
      if (!streamEndEmitted) {
        this.emit({ type: 'stream_end' })
        streamEndEmitted = true
      }
    }
  }

  private async runReviewSession(
    userContent: string,
    history: AgentMessage[],
    provider: AgentProvider,
    projectRoot: string,
    adapter: ReturnType<typeof detectStack>,
    params: StartTaskParams,
    signal?: AbortSignal,
    explicitFiles: string[] = [],
    attachments?: Attachment[],
  ): Promise<void> {
    let streamEndEmitted = false
    const reasoning = createReasoningEmitter((event) => this.emit(event))
    try {
      const contextEngine = this.getContextEngine(projectRoot, adapter)
      const maxContextTokens = contextBudgetFor(provider)
      const task = buildFallbackTask(userContent.split('\n')[0].slice(0, 120), adapter.name)
      const ctx = params.includeProjectContext === false
        ? { files: [], tokensUsed: 0, learnings: [] as { description: string; confidence: number; tags: string[] }[] }
        : await contextEngine.buildContext(task, projectRoot, contextBuildOptions(projectRoot, maxContextTokens, explicitFiles, params.openedFiles ?? []))

      this.emit({
        type: 'context_loaded',
        message: RESULT_COPY.contextLoaded(ctx.files.length),
        context: {
          ...contextEventPayload(ctx as AgentContext, maxContextTokens),
        },
      })

      const contextText = ctx.files.length > 0
        ? ctx.files.map(f => `\n### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n')
        : '(no project context attached)'
      const messages: AgentMessage[] = [
        ...history,
        { role: 'user', content: `${userContent}\n\n---\nProject root: ${projectRoot}\nProject context:\n${contextText}`, ...(attachments ? { attachments } : {}) },
      ]
      const executor = new ToolExecutor(projectRoot, signal, READ_ONLY_PERMISSION_POLICY, undefined, undefined, todoEmitter(todos => this.emit(todosEvent(todos))))
      reasoning.start()
      let usageReported = false
      const output = await provider.runAgentLoop(messages, {
        system: reviewOnlyPrompt(adapter.name),
        tools: READ_ONLY_TOOLS,
        executor,
        maxTurns: 20, // increased: real projects need more turns to read all relevant files
        signal,
        onToken: t => { reasoning.end(); this.emit({ type: 'token', token: t }) },
        onReasoningStart: () => reasoning.start(),
        onReasoningDelta: delta => reasoning.delta(delta),
        onReasoningEnd: () => reasoning.end(),
        onToolCall: (name, input) => {
          const preview = String(input.path ?? input.dir ?? name)
          this.emit({ type: 'tool_call', toolName: name, toolInput: input, message: preview })
        },
        onToolResult: (name, result) => this.emit({
          type: 'tool_result',
          toolName: name,
          message: result.slice(0, 2_000),
          toolOutput: result.slice(0, 20_000),
        }),
        onUsageReport: report => {
          usageReported = true
          this.emit(usageEventFromReport(report))
        },
      })
      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: 'assistant', content: output.thought }])
      if (!usageReported) this.emit({ type: 'token_usage', message: `${turnTokens} tokens`, tokensUsed: turnTokens })

      // If onToken events were never fired (model finished with tool calls only, no final text),
      // emit output.thought directly so the user always sees a response.
      if (output.thought.trim()) {
        this.emit({ type: 'token', token: output.thought })
      }
    } catch (err) {
      if (!signal?.aborted) {
        this.emitProviderError(err)
        this.onChatResponse?.(formatProviderError(err))
      }
    } finally {
      reasoning.end()
      if (!streamEndEmitted) {
        this.emit({ type: 'stream_end' })
        streamEndEmitted = true
      }
    }
  }

  private async runPlanSession(
    userContent: string,
    history: AgentMessage[],
    provider: AgentProvider,
    projectRoot: string,
    adapter: ReturnType<typeof detectStack>,
    includeProjectContext = true,
    signal?: AbortSignal,
    explicitFiles: string[] = [],
    openedFiles: string[] = [],
    attachments?: Attachment[],
  ): Promise<void> {
    let streamEndEmitted = false
    const reasoning = createReasoningEmitter((event) => this.emit(event))
    try {
      const contextEngine = this.getContextEngine(projectRoot, adapter)
      const maxContextTokens = contextBudgetFor(provider)
      const task = buildFallbackTask(userContent.split('\n')[0].slice(0, 120), adapter.name)
      const ctx = includeProjectContext
        ? await contextEngine.buildContext(task, projectRoot, contextBuildOptions(projectRoot, maxContextTokens, explicitFiles, openedFiles))
        : { files: [], tokensUsed: 0, learnings: [] as { description: string; confidence: number; tags: string[] }[] }

      this.emit({
        type: 'context_loaded',
        message: RESULT_COPY.contextLoaded(ctx.files.length),
        context: {
          ...contextEventPayload(ctx as AgentContext, maxContextTokens),
        },
      })

      const contextText = ctx.files.length > 0
        ? ctx.files.map(f => `\n### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n')
        : '(no relevant code files found)'

      const messages: AgentMessage[] = [
        ...history,
        {
          role: 'user',
          content: [
            userContent,
            '',
            '---',
            `Project root: ${projectRoot}`,
            `Stack adapter: ${adapter.name}`,
            '',
            'Project context:',
            contextText,
          ].join('\n'),
          ...(attachments ? { attachments } : {}),
        },
      ]

      const planTools = ctx.files.length > 0 || explicitFiles.length > 0 || openedFiles.length > 0 || !projectLooksBlank(projectRoot)
        ? READ_ONLY_TOOLS
        : []
      const executor = new ToolExecutor(projectRoot, signal, READ_ONLY_PERMISSION_POLICY, undefined, undefined, todoEmitter(todos => this.emit(todosEvent(todos))))
      reasoning.start()
      let usageReported = false
      // FIX-005: suppress raw <plan_result> XML from leaking into the chat as tokens.
      // We accumulate the buffer and only emit text that lives OUTSIDE the XML envelope.
      // Anything emitted up to now is replayed if the new visible text grows.
      let streamBuffer = ''
      let lastVisibleLen = 0
      const output = await provider.runAgentLoop(messages, {
        system: planOnlyPrompt(adapter.name),
        tools: planTools,
        executor,
        maxTurns: 8,
        signal,
        onToken: t => {
          reasoning.end()
          streamBuffer += t
          const visible = stripPlanXml(streamBuffer)
          if (visible.length > lastVisibleLen) {
            this.emit({ type: 'token', token: visible.slice(lastVisibleLen) })
            lastVisibleLen = visible.length
          }
        },
        onReasoningStart: () => reasoning.start(),
        onReasoningDelta: delta => reasoning.delta(delta),
        onReasoningEnd: () => reasoning.end(),
        onToolCall: (name, input) => {
          const preview = String(input.path ?? input.dir ?? name)
          this.emit({ type: 'tool_call', toolName: name, toolInput: input, message: preview })
        },
        onToolResult: (name, result) => this.emit({
          type: 'tool_result',
          toolName: name,
          message: result.slice(0, 2_000),
          toolOutput: result.slice(0, 20_000),
        }),
        onUsageReport: report => {
          usageReported = true
          this.emit(usageEventFromReport(report))
        },
      })

      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: 'assistant', content: output.thought }])
      if (!usageReported) this.emit({ type: 'token_usage', message: `${turnTokens} tokens`, tokensUsed: turnTokens })

      // FIX-005: robust 3-tier parser (strict XML → markdown → minimal). Always produces
      // a card so /plan never fails silently when the model deviates from the XML format.
      const planMsg = parsePlanResultRobust(output.thought, userContent)
      this.emit({ type: 'stream_end', structuredMessage: planMsg })
      streamEndEmitted = true
    } catch (err) {
      if (!signal?.aborted) {
        this.emitProviderError(err)
        this.onChatResponse?.(formatProviderError(err))
      }
    } finally {
      reasoning.end()
      if (!streamEndEmitted) {
        this.emit({ type: 'stream_end' })
        streamEndEmitted = true
      }
    }
  }

  // Unified Session â€” One loop to rule them all
  private async runUnifiedSession(
    objective: string, history: AgentMessage[], params: StartTaskParams,
    provider: AgentProvider, projectRoot: string, adapter: ReturnType<typeof detectStack>,
    task: TaskDefinition, skipPlan: boolean, signal?: AbortSignal,
    explicitFiles: string[] = [],
    attachments?: Attachment[],
  ): Promise<void> {
    const appEngine = new CodeApplicationEngine(projectRoot)
    let snapshot = createRunSnapshot({
      sessionId: params.sessionId ?? task.id,
      projectRoot,
      objective,
      mode: params.mode,
      task,
    })
    const persistSnapshot = (final = false): void => {
      try {
        if (final) finalizeRunSnapshot(projectRoot, snapshot)
        else writeRunSnapshot(projectRoot, snapshot)
      } catch (err) {
        console.warn('[Kova recovery] failed to persist run snapshot', err)
      }
    }
    const captureState = (state: ExecutionState): void => {
      snapshot = recordSnapshotState(snapshot, state)
      persistSnapshot()
    }
    const captureEvent = (event: ExecutionEvent): void => {
      snapshot = recordSnapshotEvent(snapshot, event)
      if (event.type !== 'token' && event.type !== 'reasoning_delta') persistSnapshot()
    }

    // FIX-002: Reuse cached ContextEngine + MemorySystem (single instance per project)
    // so learnings persist across patch turns and disk scans are not repeated.
    const memory = this.getMemorySystem(projectRoot)
    // Append the current user turn (with attachments) so the ExecutionEngine's
    // agent sees attachments on the very first iteration. The objective text
    // stays in TaskDefinition; attachments only travel via the message stream.
    const effectiveHistory: AgentMessage[] = attachments && attachments.length > 0
      ? [...history, { role: 'user', content: objective, attachments }]
      : history
    this.engine = new ExecutionEngine(
      {
        agent: new Agent(provider, projectRoot),
        orchestrator: new HarnessOrchestrator(),
        contextEngine: this.getContextEngine(projectRoot, adapter),
        applicationEngine: appEngine,
        memory,
      },
      {
        projectRoot,
        history: effectiveHistory,
        skipPlan,
        maxIterations: params.maxIterations ?? 5,
        autoApply: params.autoApply ?? false,
        permissionPolicy: permissionPolicyFor(params.permissionMode),
        explicitFiles,
        openedFiles: params.openedFiles ?? [],
        onStateChange: (state) => {
          captureState(state)
          this.onUpdate?.(state)
        },
        onEvent: (event) => this.onExecutionEvent?.(event),
        interactiveRunner: (command, cwd, reason, options) => {
          if (options?.previewChanges?.length) {
            const preview = createPreviewWorkspace(projectRoot, options.previewChanges, task.id)
            return terminalManager.runInteractive(command, preview.root, `${reason} (preview workspace)`)
          }
          return terminalManager.runInteractive(command, cwd, reason)
        },
        // FIX-003: surface live stdout/stderr from run_command to the UI as
        // command_output events. The UI groups lines by commandId under the
        // originating tool_call activity entry.
        onCommandOutput: (commandId, commandLine, commandStream) => this.emit({
          type: 'command_output',
          commandId,
          commandLine,
          commandStream,
        }),
      },
    )

    // The ExecutionEngine emits internal stream_end events when an agent phase ends.
    // Patch mode emits one final stream_end from here so the renderer receives a
    // single message that can include both streamed text and the structured result.
    let engineStreamEndObserved = false
    let finalStreamEndEmitted = false
    const origEventHandler = this.onExecutionEvent
    const emitOriginalWithSnapshot = (event: ExecutionEvent): void => {
      captureEvent(event)
      origEventHandler?.(event)
    }
    const emitFinal = (event: Omit<ExecutionEvent, 'taskId' | 'timestamp'>): void => {
      finalStreamEndEmitted = true
      emitOriginalWithSnapshot({ taskId: 'chat', timestamp: new Date().toISOString(), ...event })
    }
    this.onExecutionEvent = (event) => {
      captureEvent(event)
      if (event.type === 'stream_end') {
        engineStreamEndObserved = true
        return
      }
      origEventHandler?.(event)
    }

    try {
      const state = await this.engine.run(task)
      const last = state.iterationHistory.at(-1)
      const files = consolidateIterationChanges(state.iterationHistory)
      const score = last?.decision.score ?? last?.harnessResult.score ?? 0
      const proof = state.proofPack

      if (files.length > 0) {
        emitOriginalWithSnapshot({
          taskId: task.id,
          timestamp: new Date().toISOString(),
          iteration: last?.iteration,
          type: 'diff_review_ready',
          message: RESULT_COPY.diffReviewMessage(files.length),
          diffReview: createDiffReviewDecision(files),
        })
        // Emit a structured result so the renderer renders a visual card
        const title = state.status === 'completed' ? RESULT_COPY.titleCompleted
          : state.status === 'paused' ? RESULT_COPY.titlePaused
          : RESULT_COPY.titleFailed
        const failedLayers = last?.harnessResult.layers.filter(layer => !layer.skipped && !layer.passed) ?? []
        const failedSummary = failedLayers.length > 0
          ? RESULT_COPY.summaryFailedLayers(
              failedLayers.map(layer => layer.command || layer.name).join(', '),
              state.iterationHistory.length,
            )
          : RESULT_COPY.summaryMaxIterationsReached
        const summary = state.status === 'completed'
          ? RESULT_COPY.summaryCompleted
          : state.status === 'paused'
          ? RESULT_COPY.summaryPaused
          : failedSummary

        const structuredMsg: import('@kova/shared').AgentResultMessage = {
          kind: 'agent_result',
          title,
          summary,
          report: proof ? buildRunReport(task.objective, state.status, proof) : undefined,
          filesChanged: files.map(c => ({
            path: c.path,
            displayName: basename(c.path),
            status: c.type === 'create' ? 'created' : c.type === 'delete' ? 'deleted' : 'modified',
          })),
          validations: last?.harnessResult.layers.map(l => ({
            command: l.command || l.name,
            status: l.skipped ? 'skipped' : l.passed ? 'passed' : 'failed',
            exitCode: l.exitCode,
            durationMs: l.durationMs ?? l.duration,
          })) ?? [],
          risk: proof?.results?.evidenceScore?.risk.riskLevel ?? (score >= 90 ? 'low' : score >= 70 ? 'medium' : 'high'),
          decision: proof?.finalUiDecision ?? mapResultDecision(state.status, last?.decision.decision),
          notes: [
            ...(last?.decision.reason ? [last.decision.reason] : []),
            ...(proof?.nextStepRecommended ? [proof.nextStepRecommended] : []),
          ],
          proofPackRef: proof ? 'executionState.proofPack' : undefined,
        }
        emitFinal({ type: 'stream_end', structuredMessage: structuredMsg })
        engineStreamEndObserved = true
      } else {
        // No files changed (analysis-only run, or agent replied with text only).
        // The streamingText was already sent via token events — we must still
        // emit stream_end so isThinking resets and the UI is not left frozen.
        emitFinal({ type: 'stream_end' })
      }
    } catch (err) {
      // Defensive: if the engine threw before emitting stream_end, flush any accumulated
      // streamingText so it appears as a message and isThinking is reset.
      if (!signal?.aborted) this.emitProviderError(err)
      if (!finalStreamEndEmitted) {
        emitFinal({ type: 'stream_end' })
      }
      if (!signal?.aborted) this.onChatResponse?.(formatProviderError(err))
    } finally {
      // Restore original event handler
      this.onExecutionEvent = origEventHandler
      if (!finalStreamEndEmitted && !engineStreamEndObserved) emitFinal({ type: 'stream_end' })
      const status = snapshot.executionState?.status
      persistSnapshot(status === 'completed' || status === 'paused' || status === 'failed')
      if (this.engine?.getState()?.status !== 'paused') this.engine = null
    }
  }

  pause(): void { this.engine?.pause() }
  async abort(): Promise<void> {
    this.sessionAbort?.abort()
    this.sessionAbort = null
    await this.engine?.abort().catch(() => null)
    this.engine = null
  }
  getState(): ExecutionState | null { return this.engine?.getState() ?? null }

  private emitProviderError(err: unknown): void {
    const normalized = normalizeProviderError(err)
    this.emit({
      type: 'provider_error',
      providerError: normalized.code,
      providerStatus: normalized.status,
      provider: normalized.provider,
      model: normalized.model,
      message: normalized.safeMessage,
    })
  }

  async forceApply(selection?: DiffReviewSelection): Promise<void> {
    // All pending apply state is owned by ExecutionEngine.
    if (this.engine) {
      try { await this.engine.forceApply(selection) } catch (err) { this.onChatResponse?.(formatProviderError(err)) }
      return
    }
    this.onChatResponse?.('No pending changes to apply.')
  }
}

function workspaceRequiredMessage(mode: KovaRunMode): string {
  const label = mode === 'patch' ? 'Code' : mode.charAt(0).toUpperCase() + mode.slice(1)
  return `${label} mode needs an attached project. Open or attach a folder first, then send the request again.`
}

// ——— Error helpers ——————————————————————————————————————————————————————————
function usageEventFromReport(report: ProviderUsageReport): Omit<ExecutionEvent, 'taskId' | 'timestamp'> {
  return {
    type: 'token_usage',
    message: `${report.inputTokens + report.outputTokens} tokens`,
    tokensUsed: report.inputTokens + report.outputTokens,
    usage: report,
    cacheReadInputTokens: report.cacheReadInputTokens,
    cacheCreationInputTokens: report.cacheCreationInputTokens,
    inputTokens: report.inputTokens,
    outputTokens: report.outputTokens,
  } as Omit<ExecutionEvent, 'taskId' | 'timestamp'>
}

function permissionPolicyFor(mode: KovaPermissionMode | undefined): typeof DEFAULT_PERMISSION_POLICY {
  if (mode === 'ask') return ASK_PERMISSION_POLICY
  return DEFAULT_PERMISSION_POLICY
}

function buildTestingFollowupReply(userContent: string, history: AgentMessage[]): string | null {
  if (!isTestingFollowup(userContent)) return null

  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i]
    if (message.role !== 'assistant') continue
    if (!/Changes applied successfully|Task complete/i.test(message.content)) continue
    const files = parseFilesChanged(message.content)
    if (files.length === 0) continue

    const fileList = files.slice(0, 8).join(', ')
    const validationHint = files.some(file => /(^|\/)index\.html$/i.test(file))
      ? 'Abra o index.html no navegador ou rode um servidor estatico como `npx serve -s . -l 3000` na pasta do projeto.'
      : 'Rode a validacao indicada no cartao da tarefa, ou abra os arquivos alterados para revisar o resultado.'
    return `Sim, agora e a hora certa de testar. Os arquivos ja foram aplicados: ${fileList}. ${validationHint}`
  }

  return null
}

function isTestingFollowup(content: string): boolean {
  const text = content.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  return /\b(devo|posso|preciso|vamos|vou)\s+testar\b/.test(text)
    || /\btestar agora\b/.test(text)
    || /\bcomo\s+(eu\s+)?test(o|ar)\b/.test(text)
    || /\bshould i test\b/.test(text)
}

function parseFilesChanged(content: string): string[] {
  const line = content.split(/\r?\n/).find(item => /^Files changed:/i.test(item.trim()))
  if (!line) return []
  const raw = line.replace(/^Files changed:\s*/i, '').trim()
  if (!raw || /^none$/i.test(raw)) return []
  return raw
    .split(',')
    .map(item => item.replace(/\s*\([^)]*\)\s*$/, '').trim())
    .filter(Boolean)
}

function todoEmitter(onTodosUpdated: (todos: Todo[]) => void): { onTodosUpdated: (todos: Todo[]) => void } {
  return { onTodosUpdated }
}

function todosEvent(todos: Todo[]): Omit<ExecutionEvent, 'taskId' | 'timestamp'> {
  return { type: 'todos_updated', todos, message: `${todos.length} todo(s)` }
}

function formatProviderError(err: unknown): string {
  const normalized = normalizeProviderError(err)
  if (normalized.name === 'KovaProviderError') return normalized.safeMessage
  const msg = err instanceof Error ? err.message : String(err)
  if (classifyProviderError(err) === 'provider_rate_limited')
    return 'Rate limit reached. Try again later or switch provider.'
  if (msg.includes('model') && (msg.includes('not found') || msg.includes('404')))
    return 'Model not found. Check the model name in Settings.'
  if (msg.includes('400') && msg.includes('crash'))
    return 'Local model crashed (out of memory). Restart the LLM server.'
  if (msg.includes('reasoning_content'))
    return 'Model context error. Restart the conversation.'
  if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('network'))
    return 'LLM server not responding. Check if it is running.'
  if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('api key'))
    return 'Invalid API key. Check Settings.'
  return msg
}

function classifyProviderError(err: unknown): NonNullable<ExecutionEvent['providerError']> {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  if (msg.includes('429') || msg.includes('too many requests') || msg.includes('rate limit')) return 'provider_rate_limited'
  if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('api key')) return 'provider_auth'
  if (msg.includes('404') && msg.includes('model')) return 'provider_model_not_found'
  if (msg.includes('fetch') || msg.includes('econnrefused') || msg.includes('network')) return 'provider_unavailable'
  return 'provider_unknown'
}

/**
 * Removes a leading slash-command prefix (`/plan`, `/review`, `/chat`) so the
 * model receives the actual user request, not the routing token. Patch mode
 * has no slash, so the message passes through unchanged.
 */
function stripModeSlash(message: string, mode: KovaRunMode): string {
  if (mode === 'plan')   return message.trim().replace(/^\/plan\s*/i, '').trim() || message.trim()
  if (mode === 'review') return message.trim().replace(/^\/review\s*/i, '').trim() || message.trim()
  if (mode === 'chat')   return message.trim().replace(/^\/chat\s*/i, '').trim() || message.trim()
  return message
}

function mapResultDecision(
  status: ExecutionState['status'],
  decision?: 'auto_apply' | 'suggest' | 'reject' | 'human_required',
): import('@kova/shared').AgentResultMessage['decision'] {
  if (status === 'completed') return 'apply'
  if (status === 'failed') return 'repair_needed'
  if (decision === 'suggest') return 'suggest'
  if (decision === 'human_required' || status === 'paused') return 'needs_review'
  if (decision === 'reject') return 'reject'
  return 'reject'
}

function buildRunReport(
  objective: string,
  status: ExecutionState['status'],
  proof: ProofPack,
): NonNullable<AgentResultMessage['report']> {
  const commands = unique([
    ...(proof.completionProof?.commandsRun ?? []),
    ...proof.validationsRun.map(validation => validation.command).filter((command): command is string => Boolean(command)),
  ])
  const contextFiles = unique((proof.contextUsed?.files ?? proof.analyzedFiles).map(file => file.path))
  const evidence = [
    `${proof.iterations} iteration${proof.iterations === 1 ? '' : 's'} recorded`,
    `${proof.changes.length} file${proof.changes.length === 1 ? '' : 's'} changed`,
    `final decision ${proof.finalDecision}; score ${proof.finalScore}`,
    proof.results?.validationConfidence ? `validation confidence ${proof.results.validationConfidence}` : undefined,
  ].filter((item): item is string => Boolean(item))
  const nextSteps = unique([
    proof.nextStepRecommended,
    ...proof.residualRisk.map(risk => `Review risk: ${risk}`),
  ].filter((item): item is string => Boolean(item)))

  return {
    objective: proof.understoodRequest || proof.objective || objective,
    status: status === 'completed' ? 'completed' : status === 'paused' ? 'awaiting_review' : 'failed',
    outcome: proof.summary ?? (status === 'completed' ? 'Task completed.' : 'Task stopped before completion.'),
    files: proof.changes.map(change => ({
      path: change.path,
      status: change.type === 'create' ? 'created' : change.type === 'delete' ? 'deleted' : 'modified',
      reason: change.reason,
    })),
    commandsRun: commands,
    validationsNotRun: proof.validationsNotRun,
    contextFiles,
    evidence,
    nextSteps,
    completedAt: proof.completedAt,
  }
}

function unique(items: string[]): string[] {
  return [...new Set(items)]
}

export { toRelative, structureTask, ContextEngine, MemorySystem, ExecutionEngine }
