import {
  Agent, AnthropicProvider, OpenAICompatibleProvider,
  READ_ONLY_PERMISSION_POLICY, READ_ONLY_TOOLS, ToolExecutor,
} from '@kova/agent'
import type { AgentProvider } from '@kova/agent'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { readdir, stat, readFile } from 'node:fs/promises'
import { join, relative, resolve, extname, basename } from 'node:path'
import { CodeApplicationEngine } from '@kova/application'
import { ContextEngine, estimateTokens } from '@kova/context'
import { ExecutionEngine, structureTask } from '@kova/execution'
import { HarnessOrchestrator } from '@kova/orchestrator'
import type { ExecutionEvent, ExecutionState, TaskDefinition, AgentMessage } from '@kova/shared'
import { MemorySystem } from '@kova/memory'
import { adapterFromProjectProfile, detectStack } from '@kova/adapters'
import { buildProjectProfile } from '@kova/project'

export type KovaRunMode = 'chat' | 'plan' | 'patch' | 'review'
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
}

const PRESET_URLS: Record<string, string> = {
  openai:     'https://api.openai.com/v1',
  deepseek:   'https://api.deepseek.com',
  openrouter: 'https://openrouter.ai/api/v1',
  kimi:       'https://api.moonshot.ai/v1',
  gemini:     'https://generativelanguage.googleapis.com/v1beta/openai',
  ollama:     process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
  lmstudio:   'http://localhost:1234/v1',
}

const LOCAL_PROVIDERS = new Set(['ollama', 'lmstudio', 'openai-compatible'])

const PRESET_MODELS: Record<string, string> = {
  openai: 'gpt-4.1', deepseek: 'deepseek-v4-flash',
  kimi: 'kimi-k2.5', gemini: 'gemini-2.5-flash',
  openrouter: 'anthropic/claude-sonnet-4.5',
}

const INVALID_MODEL_VALUES = new Set([
  'deepseek', 'DeepSeek', 'openai', 'OpenAI', 'anthropic', 'Anthropic',
  'gemini', 'Gemini', 'kimi', 'Kimi', 'ollama', 'Ollama',
  'openrouter', 'OpenRouter', 'default', 'modelo', 'model', '',
])

export async function autoResolveModel(
  baseUrl: string, configured?: string, onDetected?: (model: string) => void,
): Promise<string | undefined> {
  if (configured) return configured
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return undefined
    const data = await res.json() as { data?: Array<{ id: string }> }
    const first = data.data?.[0]?.id
    if (first) onDetected?.(first)
    return first
  } catch { return undefined }
}

async function buildProvider(
  params: StartTaskParams, onModelDetected?: (model: string) => void,
): Promise<AgentProvider | null> {
  const provider = params.provider ?? 'anthropic'
  const apiKey = params.apiKey ?? ''
  if (provider === 'anthropic') {
    if (!apiKey) return null
    return new AnthropicProvider({ apiKey, model: params.model })
  }
  const baseUrl = params.baseUrl ?? PRESET_URLS[provider] ?? ''
  if (!baseUrl) return null
  if (!apiKey && !LOCAL_PROVIDERS.has(provider)) return null
  const fallback = PRESET_MODELS[provider] ?? ''
  const rawModel = params.model?.trim() ?? ''
  const safeConfigured = INVALID_MODEL_VALUES.has(rawModel) ? undefined : rawModel || undefined
  const resolved = await autoResolveModel(baseUrl, safeConfigured, onModelDetected)
  const model = resolved || fallback
  if (!model) return null
  if (resolved && onModelDetected) onModelDetected(model)
  return new OpenAICompatibleProvider({ apiKey: apiKey || provider, baseUrl, model })
}

// â”€â”€â”€ Project context pre-loader (Removed naive loader, using ContextEngine) â”€â”€
// â”€â”€â”€ @ file references â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface AtRef { name: string; path: string; content: string }
interface DeniedAtRef { name: string; path: string; reason: string }
interface ResolvedAtRefs { userContent: string; refs: AtRef[]; denied: DeniedAtRef[]; missing: string[] }
const SKIP_DIRS = new Set(['node_modules','.git','dist','out','.next','__pycache__','.cache','vendor','target','build','coverage'])

function isProtectedContextPath(path: string): boolean {
  const name = basename(path.replace(/\\/g, '/')).toLowerCase()
  if (name === '.env.example') return false
  return name === '.env' || name.startsWith('.env.') || name.endsWith('.env') || name.includes('.env.')
}

// Search for a file by name anywhere inside projectRoot (depth-limited)
function findFileByName(projectRoot: string, filename: string, depth = 0): string | null {
  if (depth > 6) return null
  let entries: string[]
  try { entries = readdirSync(projectRoot) } catch { return null }
  for (const name of entries) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue
    const full = join(projectRoot, name)
    try {
      const st = statSync(full)
      if (!st.isDirectory() && name === filename) return full
      if (st.isDirectory()) {
        const found = findFileByName(full, filename, depth + 1)
        if (found) return found
      }
    } catch { /* skip */ }
  }
  return null
}

function extractAtTokens(message: string): string[] {
  const tokens: string[] = []
  for (const match of message.matchAll(/@(?:"([^"]+)"|'([^']+)'|([^\s,;]+))/g)) {
    const raw = match[1] ?? match[2] ?? match[3] ?? ''
    const token = raw.replace(/[)\].!?]+$/g, '').trim()
    if (token && !tokens.includes(token)) tokens.push(token)
  }
  return tokens
}

function resolveAtRefs(message: string, projectRoot: string): ResolvedAtRefs {
  const refs: AtRef[] = []
  const denied: DeniedAtRef[] = []
  const missing: string[] = []
  const seen = new Set<string>()
  for (const token of extractAtTokens(message)) {
    if (seen.has(token)) continue
    seen.add(token)

    // 1. Try exact relative path from project root
    let fullPath = join(projectRoot, token)
    // 2. Fallback: search by filename if not found at exact path
    if (!existsSync(fullPath)) {
      fullPath = findFileByName(projectRoot, basename(token)) ?? ''
    }
    if (!fullPath || !existsSync(fullPath)) {
      missing.push(token)
      continue
    }

    try {
      const rel = relative(projectRoot, fullPath).replace(/\\/g, '/')
      if (isProtectedContextPath(rel)) {
        denied.push({ name: token, path: rel, reason: 'Arquivo protegido: segredos nao sao anexados ao contexto.' })
        continue
      }
      const content = readFileSync(fullPath, 'utf-8').slice(0, 8_000)
      refs.push({ name: token, path: rel, content })
    } catch { /* skip */ }
  }
  const attachment = refs.length > 0
    ? '\n\nReferenced files:\n' + refs.map(r => `\`\`\`\n// @${r.path}\n${r.content}\n\`\`\``).join('\n\n')
    : ''
  const deniedText = denied.length > 0
    ? '\n\nDenied references:\n' + denied.map(r => `- @${r.path}: ${r.reason}`).join('\n')
    : ''
  return { userContent: message + attachment + deniedText, refs, denied, missing }
}

// ——— Prompts ————————————————————————————————————————————————————————————————
function chatOnlyPrompt(stack: string): string {
  return `You are Kova, a senior software engineering assistant.
Stack adapter: ${stack}.

This is Chat Mode:
- Reply in text only.
- Do not call tools.
- Use provided referenced files and project context if present.
- If a referenced file was denied, explain the security reason briefly.
- Do not carry out older tasks unless the user explicitly asks for them again.

Respond in the language the user writes in.`
}

function reviewOnlyPrompt(stack: string): string {
  return `You are Kova in Review Mode, a read-only senior code reviewer.
Stack adapter: ${stack}.

Allowed behavior:
- You may inspect files with read_file and list_files.
- You must not edit, create, delete, apply patches, or run shell commands.
- Focus on concrete findings, risks, missing validation, and next steps.
- Do not carry out older tasks unless the user explicitly asks for them again.

Respond in the user's language.`
}

function planOnlyPrompt(stack: string): string {
  return `You are Kova in Plan Mode, a read-only senior engineering planner.
Stack adapter: ${stack}.

Allowed behavior:
- You may inspect files with read_file and list_files.
- You must not edit, create, delete, apply patches, or run shell commands.
- Use existing project structure, instructions, and local conventions as the source of truth.
- Prefer a small, safe implementation plan over broad refactors.

Respond with ONLY the following XML structure:
<plan_result>
  <objective>What the task requires and why</objective>
  <files>
    <file path="path/to/file.ext" reason="Why this file needs to change" />
  </files>
  <approach>Step-by-step implementation strategy</approach>
  <validations>
    <command>Validation commands to run later</command>
  </validations>
  <risk>low</risk> <!-- Must be: low, medium, or high -->
</plan_result>`
}

function inferRunMode(message: string, explicit?: KovaRunMode): KovaRunMode {
  if (explicit) return explicit
  const text = message.trim().toLowerCase()
  if (/^\/plan(\s|$)/i.test(message.trim())) return 'plan'
  if (/\b(review|revise|analise|audit|audite|explique|explain)\b/.test(text)) return 'review'
  if (/\b(crie|criar|implemente|implementar|altere|alterar|corrija|fix|refatore|refactor|adicione|add|remova|delete)\b/.test(text)) return 'patch'
  return 'chat'
}

function shouldShortCircuitDeniedRefs(message: string, resolution: ResolvedAtRefs): boolean {
  if (resolution.denied.length === 0 || resolution.refs.length > 0) return false
  const withoutRefs = message.replace(/@(?:"([^"]+)"|'([^']+)'|([^\s,;]+))/g, '').trim().toLowerCase()
  if (!withoutRefs) return true
  return /^(leia|ler|read|explique|explain|mostre|show|abrir|open)\b/.test(withoutRefs)
}

function deniedRefsMessage(resolution: ResolvedAtRefs): string {
  const files = resolution.denied.map(ref => `@${ref.path}`).join(', ')
  return `Nao posso ler ${files}. Arquivos de ambiente podem conter segredos e nao sao anexados ao contexto. Use um arquivo exemplo, como @.env.example, se quiser compartilhar variaveis sem valores sensiveis.`
}

function contextBudgetFor(provider: AgentProvider): number {
  const limit = provider.capabilities().contextTokenLimit
  return Math.min(20_000, Math.max(2_000, Math.floor(limit * 0.35)))
}

function estimateMessagesTokens(messages: AgentMessage[]): number {
  return estimateTokens(messages.map(m => `${m.role}: ${m.content}`).join('\n\n'))
}

// â”€â”€â”€ Engine Manager â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Injectable factory for testing â€” defaults to the real buildProvider function
export type ProviderFactory = (
  params: StartTaskParams,
  onModelDetected?: (model: string) => void,
) => Promise<AgentProvider | null>

export class EngineManager {
  private engine: ExecutionEngine | null = null
  private sessionAbort: AbortController | null = null
  private onUpdate: ((state: ExecutionState) => void) | null = null
  private onStructured: ((task: TaskDefinition) => void) | null = null
  private onError: ((msg: string) => void) | null = null
  private onModelDetected: ((model: string) => void) | null = null
  private onChatResponse: ((msg: string) => void) | null = null
  private onExecutionEvent: ((event: ExecutionEvent) => void) | null = null

  constructor(private readonly providerFactory: ProviderFactory = buildProvider) {}

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
    if (resolution.missing.length) this.emit({ type: 'tool_result', message: `@ nao encontrado: ${resolution.missing.join(', ')}` })

    if (shouldShortCircuitDeniedRefs(rawContent, resolution)) {
      this.onChatResponse?.(deniedRefsMessage(resolution))
      this.emit({ type: 'stream_end' })
      return
    }

    const provider = await this.providerFactory(params, this.onModelDetected ?? undefined)
    if (!provider) {
      this.onChatResponse?.('Provider nao configurado. Abra Configuracoes.')
      this.emit({ type: 'stream_end' })
      return
    }

    if (mode === 'plan') {
      await this.runPlanSession(resolution.userContent || 'Create an implementation plan for this project.', history, provider, projectRoot, adapter, params.includeProjectContext !== false, this.sessionAbort.signal)
      return
    }
    if (mode === 'chat') {
      await this.runChatSession(resolution.userContent, history, provider, projectRoot, adapter, params, this.sessionAbort.signal)
      return
    }
    if (mode === 'review') {
      await this.runReviewSession(resolution.userContent, history, provider, projectRoot, adapter, params, this.sessionAbort.signal)
      return
    }
    const task = await this.buildPatchTask(resolution.userContent, provider, projectRoot, adapter)
    this.onStructured?.(task)
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
    )
  }

  private async buildPatchTask(
    objective: string,
    provider: AgentProvider,
    projectRoot: string,
    adapter: ReturnType<typeof detectStack>,
  ): Promise<TaskDefinition> {
    try {
      const structured = await structureTask(objective, {
        root: projectRoot,
        stackAdapter: adapter.name,
        affectedFiles: [],
        llm: provider,
      })
      if (structured.valid) return structured.task
    } catch {
      // Fallback below keeps the execution path available when structuring fails.
    }
    return buildFallbackTask(objective.split('\n')[0].slice(0, 120), adapter.name)
  }

  private async runChatSession(
    userContent: string,
    history: AgentMessage[],
    provider: AgentProvider,
    projectRoot: string,
    adapter: ReturnType<typeof detectStack>,
    params: StartTaskParams,
    signal?: AbortSignal,
  ): Promise<void> {
    let streamEndEmitted = false
    try {
      let content = userContent
      if (params.includeProjectContext !== false && (history.length === 0 || !history.some(h => h.role === 'assistant'))) {
        const contextEngine = new ContextEngine(new MemorySystem(projectRoot), adapter)
        const maxContextTokens = contextBudgetFor(provider)
        const task = buildFallbackTask(userContent.split('\n')[0].slice(0, 120), adapter.name)
        const ctx = await contextEngine.buildContext(task, projectRoot, { maxTokens: maxContextTokens })
        this.emit({
          type: 'context_loaded',
          message: `${ctx.files.length} arquivo${ctx.files.length === 1 ? '' : 's'} no contexto`,
          context: {
            files: ctx.files.map(f => f.path),
            tokensUsed: ctx.tokensUsed,
            maxTokens: maxContextTokens,
            learningsCount: ctx.learnings.length,
          },
        })
        if (ctx.files.length > 0) {
          content += '\n\n---\nProject context:\n' + ctx.files.map(f => `\n### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n')
        }
      }

      const messages: AgentMessage[] = [...history, { role: 'user', content }]
      const output = await provider.runAgentLoop(messages, {
        system: chatOnlyPrompt(adapter.name),
        tools: [],
        executor: new ToolExecutor(projectRoot, signal, READ_ONLY_PERMISSION_POLICY),
        maxTurns: 1,
        signal,
        onToken: t => this.emit({ type: 'token', token: t }),
      })
      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: 'assistant', content: output.thought }])
      this.emit({ type: 'token_usage', message: `${turnTokens} tokens`, tokensUsed: turnTokens })
    } catch (err) {
      if (!signal?.aborted) this.onChatResponse?.(formatProviderError(err))
    } finally {
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
  ): Promise<void> {
    let streamEndEmitted = false
    try {
      const contextEngine = new ContextEngine(new MemorySystem(projectRoot), adapter)
      const maxContextTokens = contextBudgetFor(provider)
      const task = buildFallbackTask(userContent.split('\n')[0].slice(0, 120), adapter.name)
      const ctx = params.includeProjectContext === false
        ? { files: [], tokensUsed: 0, learnings: [] as { description: string; confidence: number; tags: string[] }[] }
        : await contextEngine.buildContext(task, projectRoot, { maxTokens: maxContextTokens })

      this.emit({
        type: 'context_loaded',
        message: `${ctx.files.length} arquivo${ctx.files.length === 1 ? '' : 's'} no contexto`,
        context: {
          files: ctx.files.map(f => f.path),
          tokensUsed: ctx.tokensUsed,
          maxTokens: maxContextTokens,
          learningsCount: ctx.learnings.length,
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
      const output = await provider.runAgentLoop(messages, {
        system: reviewOnlyPrompt(adapter.name),
        tools: READ_ONLY_TOOLS,
        executor,
        maxTurns: 8,
        signal,
        onToken: t => this.emit({ type: 'token', token: t }),
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
    } catch (err) {
      if (!signal?.aborted) this.onChatResponse?.(formatProviderError(err))
    } finally {
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
  ): Promise<void> {
    let streamEndEmitted = false
    try {
      const contextEngine = new ContextEngine(new MemorySystem(projectRoot), adapter)
      const maxContextTokens = contextBudgetFor(provider)
      const task = buildFallbackTask(userContent.split('\n')[0].slice(0, 120), adapter.name)
      const ctx = includeProjectContext
        ? await contextEngine.buildContext(task, projectRoot, { maxTokens: maxContextTokens })
        : { files: [], tokensUsed: 0, learnings: [] as { description: string; confidence: number; tags: string[] }[] }

      this.emit({
        type: 'context_loaded',
        message: `${ctx.files.length} arquivo${ctx.files.length === 1 ? '' : 's'} no contexto`,
        context: {
          files: ctx.files.map(f => f.path),
          tokensUsed: ctx.tokensUsed,
          maxTokens: maxContextTokens,
          learningsCount: ctx.learnings.length,
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

      const executor = new ToolExecutor(projectRoot, signal, READ_ONLY_PERMISSION_POLICY)
      const output = await provider.runAgentLoop(messages, {
        system: planOnlyPrompt(adapter.name),
        tools: READ_ONLY_TOOLS,
        executor,
        maxTurns: 8,
        signal,
        onToken: t => this.emit({ type: 'token', token: t }),
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
    } catch (err) {
      if (!signal?.aborted) this.onChatResponse?.(formatProviderError(err))
    } finally {
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
  ): Promise<void> {
    const appEngine = new CodeApplicationEngine(projectRoot)

    // Create the ExecutionEngine with skipPlan and history enabled
    this.engine = new ExecutionEngine(
      {
        agent: new Agent(provider, projectRoot),
        orchestrator: new HarnessOrchestrator(),
        contextEngine: new ContextEngine(new MemorySystem(projectRoot), adapter),
        applicationEngine: appEngine,
      },
      {
        projectRoot,
        history,
        skipPlan,
        maxIterations: params.maxIterations ?? 5,
        autoApply: params.autoApply ?? false,
        onStateChange: (state) => this.onUpdate?.(state),
        onEvent: (event) => this.onExecutionEvent?.(event),
      },
    )

    // The ExecutionEngine emits stream_end itself after each agent phase.
    // If run() throws before doing so, this flag ensures we emit it defensively
    // so isThinking never stays stuck and streamingText is flushed.
    let engineStreamEndObserved = false
    const origEventHandler = this.onExecutionEvent
    this.onExecutionEvent = (event) => {
      if (event.type === 'stream_end') engineStreamEndObserved = true
      origEventHandler?.(event)
    }

    try {
      const state = await this.engine.run(task)
      const last = state.iterationHistory.at(-1)
      const files = last?.changes ?? []
      const fileList = files.map(c => `${c.type === 'create' ? '+' : '~'} ${c.path}`).join('\n')
      const score = last?.harnessResult.score ?? 0

      // In Unified Session, the text was already streamed.
      // If there are files, we just display the summary at the end.
      if (files.length > 0) {
        if (state.status === 'completed') {
          this.onChatResponse?.(`OK: Modificacoes aplicadas - score ${score}\n\n${fileList}`)
        } else if (state.status === 'paused') {
          this.onChatResponse?.(`Aguardando revisao - score ${score}\n\n${fileList}`)
        } else {
          const reason = last?.decision.reason ?? 'Maximo de tentativas atingido'
          this.onChatResponse?.(`Falhou: ${reason}\n\nArquivos no disco:\n${fileList}`)
        }
      } else {
        // If no files changed, we don't need to print anything since the text was streamed.
        // But if the stream failed or returned empty, we could fallback.
        if (state.status === 'failed' && !signal?.aborted) {
          this.onChatResponse?.('Execucao falhou ou foi abortada.')
        }
      }
    } catch (err) {
      // Defensive: if the engine threw before emitting stream_end, flush any accumulated
      // streamingText so it appears as a message and isThinking is reset.
      if (!engineStreamEndObserved) {
        this.emit({ type: 'stream_end' })
        engineStreamEndObserved = true
      }
      if (!signal?.aborted) this.onChatResponse?.(formatProviderError(err))
    } finally {
      // Restore original event handler
      this.onExecutionEvent = origEventHandler
      if (!engineStreamEndObserved) this.emit({ type: 'stream_end' })
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

  async forceApply(): Promise<void> {
    // All pending apply state is owned by ExecutionEngine.
    if (this.engine) {
      try { await this.engine.forceApply() } catch (err) { this.onChatResponse?.(formatProviderError(err)) }
      return
    }
    this.onChatResponse?.('Nenhuma mudanca pendente para aplicar.')
  }
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildFallbackTask(objective: string, stackAdapter: string): TaskDefinition {
  return {
    id: `task-${Date.now()}`, objective: objective.trim(),
    constraints: [], nonGoals: [], validationCriteria: [],
    type: 'feature', impact: 'low', affectedFiles: [], stackAdapter,
  }
}

function formatProviderError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('model') && (msg.includes('not found') || msg.includes('404')))
    return 'Modelo nao encontrado. Verifique o nome do modelo nas configuracoes.'
  if (msg.includes('400') && msg.includes('crash'))
    return 'O modelo local crashou (falta de memoria). Reinicie o servidor LLM.'
  if (msg.includes('reasoning_content'))
    return 'Erro no contexto do modelo. Reinicie a conversa.'
  if (msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('network'))
    return 'Servidor LLM nao responde. Verifique se esta rodando.'
  if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('api key'))
    return 'API key invalida. Verifique nas configuracoes.'
  return msg
}

function toRelative(root: string, filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const rootNorm = root.replace(/\\/g, '/')
  if (normalized.startsWith(rootNorm + '/')) return normalized.slice(rootNorm.length + 1)
  if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith('/')) {
    try {
      const rel = relative(root, resolve(filePath)).replace(/\\/g, '/')
      if (!rel.startsWith('..')) return rel
    } catch { /* ignore */ }
    return normalized.split('/').at(-1) ?? normalized
  }
  return normalized
}

export { toRelative, structureTask, ContextEngine, MemorySystem, ExecutionEngine }
