import type { TaskDefinition, AgentContext, AgentOutput, AgentMode, AgentMessage } from '@kova/shared'
import type { AgentProvider, LLMResponse } from './providers/provider'
import { AGENT_TOOLS, READ_ONLY_PERMISSION_POLICY, READ_ONLY_TOOLS, ToolExecutor } from './tools'
import { MODE_PROMPTS } from './modes'

const MAX_TURNS = 10
const AGENT_TIMEOUT_MS = 8 * 60 * 1000 // 8 min — generous for slow local models

const WRITE_MODES = new Set<AgentMode>(['code', 'test', 'fix', 'unified'])

const STACK_LANGUAGE: Record<string, string> = {
  go: 'Go', python: 'Python', typescript: 'TypeScript',
  javascript: 'JavaScript', rust: 'Rust', java: 'Java',
  kotlin: 'Kotlin', ruby: 'Ruby', php: 'PHP',
  swift: 'Swift', dart: 'Dart/Flutter', csharp: 'C#',
  cpp: 'C++', c: 'C', generic: 'the language specified in the task',
}

export class Agent {
  constructor(
    private readonly provider: AgentProvider,
    private readonly projectRoot: string,
  ) {}

  async execute(
    task: TaskDefinition,
    context: AgentContext,
    mode: AgentMode = 'code',
    options?: {
      history?: AgentMessage[]
      signal?: AbortSignal
      onToken?: (token: string) => void
      onToolCall?: (name: string, input: Record<string, unknown>) => void
      onToolResult?: (name: string, result: string) => void
    }
  ): Promise<AgentOutput> {
    const tools = WRITE_MODES.has(mode) ? AGENT_TOOLS : READ_ONLY_TOOLS
    const executor = new ToolExecutor(
      this.projectRoot,
      options?.signal,
      WRITE_MODES.has(mode) ? undefined : READ_ONLY_PERMISSION_POLICY,
    )
    const caps = this.provider.capabilities()
    const system = buildSystemPrompt(mode, task, caps.supportsToolCalls)
    const userMessage = buildUserMessage(task, context)

    const msgs: AgentMessage[] = [
      ...(options?.history ?? []),
      { role: 'user', content: userMessage }
    ]

    // Race the agent loop against a hard timeout. Crucially: when the timeout
    // fires we abort the loop's own signal so any in-flight tool call
    // (e.g. write_file) is cancelled and cannot write stale content to disk.
    const timeoutController = new AbortController()
    const composedSignal = options?.signal
      ? AbortSignal.any([options.signal, timeoutController.signal])
      : timeoutController.signal

    const timeoutId = setTimeout(
      () => timeoutController.abort(new Error(`Agent timeout after ${AGENT_TIMEOUT_MS / 60_000} minutes — LLM may be overloaded`)),
      AGENT_TIMEOUT_MS,
    )

    let result: LLMResponse
    try {
      result = await this.provider.runAgentLoop(msgs, {
        system, tools, executor, maxTurns: MAX_TURNS,
        signal: composedSignal,
        onToken: options?.onToken,
        onToolCall: options?.onToolCall,
        onToolResult: options?.onToolResult,
      })
    } catch (err) {
      if (timeoutController.signal.aborted) {
        throw new Error(`Agent timeout after ${AGENT_TIMEOUT_MS / 60_000} minutes — LLM may be overloaded`)
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
    }

    return { mode, thought: result.thought, changes: result.changes, tokensUsed: result.tokensUsed }
  }
}

function buildSystemPrompt(mode: AgentMode, task: TaskDefinition, supportsToolCalls: boolean): string {
  const lang = STACK_LANGUAGE[task.stackAdapter] ?? task.stackAdapter
  const langHint = mode !== 'plan' && mode !== 'review'
    ? `LANGUAGE: ${lang}. Every file you create must use ${lang}. Never switch to another language.`
    : ''

  // For models that don't reliably use tool calls, reinforce the XML fallback format
  const xmlReminder = !supportsToolCalls && WRITE_MODES.has(mode)
    ? `OUTPUT FORMAT (MANDATORY when write_file tool is unavailable):\nWrap EVERY file in XML — no exceptions:\n<kova_file path="relative/path/file.ext">\ncomplete file content\n</kova_file>`
    : ''

  return [MODE_PROMPTS[mode], langHint, xmlReminder].filter(Boolean).join('\n\n')
}

function buildUserMessage(task: TaskDefinition, context: AgentContext): string {
  const lang = STACK_LANGUAGE[task.stackAdapter] ?? task.stackAdapter
  const pack = (context as AgentContext & {
    pack?: {
      files: Array<{ path: string; reason: string; score: number; source: string }>
      validations: Array<{ kind: string; command?: string; scope: string; confidence: number }>
      omitted: { sensitiveFiles: string[] }
    }
  }).pack
  const parts: string[] = [
    `## Task: ${task.objective}`,
    `Stack: ${lang} | Type: ${task.type} | Impact: ${task.impact}`,
  ]

  if (task.constraints.length > 0) {
    parts.push(`\n### Constraints\n${task.constraints.map(c => `- ${c}`).join('\n')}`)
  }
  if (task.validationCriteria.length > 0) {
    parts.push(`\n### Acceptance criteria (must all pass)\n${task.validationCriteria.map(c => `- ${c}`).join('\n')}`)
  }
  if (context.learnings.length > 0) {
    parts.push('\n### Known patterns\n' + context.learnings.map(l => `- ${l.description}`).join('\n'))
  }
  if (pack) {
    const fileEvidence = pack.files
      .map(file => `- ${file.path}: ${file.reason} (score ${file.score}; source ${file.source})`)
      .join('\n')
    const validationEvidence = pack.validations
      .slice(0, 6)
      .map(item => `- ${item.kind}: ${item.command ?? 'configured'} (${item.scope}; confidence ${item.confidence})`)
      .join('\n')
    const omitted = pack.omitted.sensitiveFiles.length > 0
      ? `\nSensitive files omitted: ${pack.omitted.sensitiveFiles.join(', ')}`
      : ''
    parts.push([
      '\n### Context pack evidence',
      fileEvidence,
      validationEvidence ? `\nValidation candidates:\n${validationEvidence}` : '',
      omitted,
    ].filter(Boolean).join('\n'))
  }
  if (context.files.length > 0) {
    parts.push('\n### Project context')
    for (const f of context.files) {
      parts.push(`\n**${f.path}**\n\`\`\`\n${f.content}\n\`\`\``)
    }
  }

  return parts.join('\n')
}
