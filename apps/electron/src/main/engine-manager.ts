import {
  Agent, AnthropicProvider, OpenAICompatibleProvider,
  READ_ONLY_PERMISSION_POLICY, READ_ONLY_TOOLS, ToolExecutor,
  normalizeProviderError,
} from '@kova/agent'
import type { AgentProvider, InteractiveRunner } from '@kova/agent'
import { terminalManager } from './terminal-manager'
import { CodeApplicationEngine, createDiffReviewDecision } from '@kova/application'
import { ContextEngine } from '@kova/context'
import { ExecutionEngine } from '@kova/execution'
import { HarnessOrchestrator } from '@kova/orchestrator'
import type { AgentContext, DiffReviewSelection, ExecutionEvent, ExecutionState, TaskDefinition, AgentMessage } from '@kova/shared'
import { basename } from 'node:path'
import { readdirSync } from 'node:fs'
import { MemorySystem } from '@kova/memory'
import { adapterFromProjectProfile, detectStack } from '@kova/adapters'
import { buildProjectProfile } from '@kova/project'
import { resolveAtRefs, shouldShortCircuitDeniedRefs, deniedRefsMessage } from './at-refs'
import type { ResolvedAtRefs } from './at-refs'
import { chatOnlyPrompt, reviewOnlyPrompt, planOnlyPrompt, inferRunMode, parsePlanResultRobust, stripPlanXml } from './session-prompts'
import type { KovaRunMode } from './session-prompts'
import {
  buildContextEngine, contextBudgetFor, contextBuildOptions, contextEventPayload,
  createReasoningEmitter, estimateMessagesTokens, buildFallbackTask, toRelative,
} from './session-utils'
import { buildProvider, tryFallbackProvider } from './provider-resolver'
import type { ProviderFactory, ProviderResolution } from './provider-resolver'
import { buildPatchTask } from './task-structurer'
import { LruCache } from './lru-cache'

// Re-export provider types so existing consumers of engine-manager keep working unchanged.
export { autoResolveModel, buildProvider } from './provider-resolver'
export type { ProviderFactory, ProviderResolution } from './provider-resolver'

export type { KovaRunMode }
export type KovaPermissionMode = 'auto-review' | 'ask' | 'full-access'

export interface StartTaskParams {
  objective: string
  projectRoot: string
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

  async sendMessage(message: string, history: AgentMessage[], params: StartTaskParams): Promise<void> {
    return this.sendMessageWithMode(message, history, params)
  }

  private async sendMessageWithMode(message: string, history: AgentMessage[], params: StartTaskParams): Promise<void> {
    // Cancel any in-flight session or engine. The renderer queues user messages, so this
    // mainly protects direct IPC calls and stale work in the main process.
    this.sessionAbort?.abort()
    this.sessionAbort = new AbortController()
    if (this.engine) { await this.engine.abort().catch(() => null); this.engine = null }

    const { projectRoot } = params
    const profile = buildProjectProfile(projectRoot)
    const adapter = profile.confidence > 0 ? adapterFromProjectProfile(profile) : detectStack(projectRoot)
    const mode = inferRunMode(message, params.mode)
    const rawContent = mode === 'plan'
      ? message.trim().replace(/^\/plan\s*/i, '').trim()
      : message
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
      await this.runPlanSession(resolution.userContent || 'Create an implementation plan for this project.', history, provider, projectRoot, adapter, params.includeProjectContext !== false, this.sessionAbort.signal, explicitFiles, params.openedFiles ?? [])
      return
    }
    if (mode === 'chat') {
      await this.runChatSession(resolution.userContent, history, provider, projectRoot, adapter, params, this.sessionAbort.signal, explicitFiles)
      return
    }
    if (mode === 'review') {
      await this.runReviewSession(resolution.userContent, history, provider, projectRoot, adapter, params, this.sessionAbort.signal, explicitFiles)
      return
    }
    const task = await buildPatchTask(resolution.userContent, provider, projectRoot, adapter)
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
    )
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
  ): Promise<void> {
    let streamEndEmitted = false
    const reasoning = createReasoningEmitter((event) => this.emit(event))
    try {
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

      const messages: AgentMessage[] = [...history, { role: 'user', content }]
      reasoning.start()
      const output = await provider.runAgentLoop(messages, {
        system: chatOnlyPrompt(adapter.name),
        tools: [],
        executor: new ToolExecutor(projectRoot, signal, READ_ONLY_PERMISSION_POLICY),
        maxTurns: 1,
        signal,
        onToken: t => { reasoning.end(); this.emit({ type: 'token', token: t }) },
        onReasoningStart: () => reasoning.start(),
        onReasoningDelta: delta => reasoning.delta(delta),
        onReasoningEnd: () => reasoning.end(),
      })
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

  private async runReviewSession(
    userContent: string,
    history: AgentMessage[],
    provider: AgentProvider,
    projectRoot: string,
    adapter: ReturnType<typeof detectStack>,
    params: StartTaskParams,
    signal?: AbortSignal,
    explicitFiles: string[] = [],
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
        { role: 'user', content: `${userContent}\n\n---\nProject root: ${projectRoot}\nProject context:\n${contextText}` },
      ]
      const executor = new ToolExecutor(projectRoot, signal, READ_ONLY_PERMISSION_POLICY)
      reasoning.start()
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
      })
      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: 'assistant', content: output.thought }])
      this.emit({ type: 'token_usage', message: `${turnTokens} tokens`, tokensUsed: turnTokens })

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
        },
      ]

      const planTools = ctx.files.length > 0 || explicitFiles.length > 0 || openedFiles.length > 0 || !projectLooksBlank(projectRoot)
        ? READ_ONLY_TOOLS
        : []
      const executor = new ToolExecutor(projectRoot, signal, READ_ONLY_PERMISSION_POLICY)
      reasoning.start()
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
      })

      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: 'assistant', content: output.thought }])
      this.emit({ type: 'token_usage', message: `${turnTokens} tokens`, tokensUsed: turnTokens })

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
  ): Promise<void> {
    const appEngine = new CodeApplicationEngine(projectRoot)

    // FIX-002: Reuse cached ContextEngine + MemorySystem (single instance per project)
    // so learnings persist across patch turns and disk scans are not repeated.
    const memory = this.getMemorySystem(projectRoot)
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
        history,
        skipPlan,
        maxIterations: params.maxIterations ?? 5,
        autoApply: params.autoApply ?? false,
        explicitFiles,
        openedFiles: params.openedFiles ?? [],
        onStateChange: (state) => this.onUpdate?.(state),
        onEvent: (event) => this.onExecutionEvent?.(event),
        interactiveRunner: (command, cwd, reason) =>
          terminalManager.runInteractive(command, cwd, reason),
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
    const emitFinal = (event: Omit<ExecutionEvent, 'taskId' | 'timestamp'>): void => {
      finalStreamEndEmitted = true
      origEventHandler?.({ taskId: 'chat', timestamp: new Date().toISOString(), ...event })
    }
    this.onExecutionEvent = (event) => {
      if (event.type === 'stream_end') {
        engineStreamEndObserved = true
        return
      }
      origEventHandler?.(event)
    }

    try {
      const state = await this.engine.run(task)
      const last = state.iterationHistory.at(-1)
      const files = last?.changes ?? []
      const score = last?.decision.score ?? last?.harnessResult.score ?? 0
      const proof = state.proofPack

      if (files.length > 0) {
        origEventHandler?.({
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
    this.onChatResponse?.('Nenhuma mudanca pendente para aplicar.')
  }
}

// ——— Error helpers ——————————————————————————————————————————————————————————
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

export { toRelative, structureTask, ContextEngine, MemorySystem, ExecutionEngine }
