import type { AgentMessage } from '@kova/shared'
import type { GenerateOptions, LLMResponse, AgentProvider, AgentLoopOptions, ProviderCapabilities } from './provider'
import type { KovaTool } from '../tools'
import { extractChangesFromXml, extractChangesFromTools, extractChangesFromText, type OpenAIToolCall } from './openai-text-parser'
import { normalizeProviderError } from './errors'

export interface OpenAICompatibleProviderOptions {
  apiKey?: string
  baseUrl: string
  model: string
  extraBody?: Record<string, unknown>
}

interface ChatMessage {
  role: string
  content?: string | null
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
  // DeepSeek / extended thinking: must be echoed back in subsequent turns
  reasoning_content?: string
}

interface ToolCall extends OpenAIToolCall {
  id?: string
  type?: string
}

interface ChatChoice {
  message?: ChatMessage & { reasoning_content?: string }
  finish_reason?: string
}

interface ChatResponse {
  choices?: ChatChoice[]
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

interface ReasoningCallbacks {
  onStart?: () => void
  onDelta?: (delta: string) => void
  onEnd?: () => void
}

export class OpenAICompatibleProvider implements AgentProvider {
  constructor(private readonly options: OpenAICompatibleProviderOptions) {}

  // Local/compatible models vary widely — conservative defaults
  capabilities(): ProviderCapabilities {
    const model = this.options.model.toLowerCase()
    // Larger models generally support tool calls reliably
    const likelySupportsTools = /gpt-4|claude|gemini|qwen2\.5|mistral-large|llama-3\.[12]/.test(model)
    const contextLimit = /128k|200k|1m/.test(model) ? 100_000 : 8_000
    return { supportsToolCalls: likelySupportsTools, contextTokenLimit: contextLimit }
  }

  // Single-turn — used for task structuring
  async generate(messages: AgentMessage[], options: GenerateOptions = {}): Promise<LLMResponse> {
    const chatMessages = options.system
      ? [{ role: 'system', content: options.system }, ...messages]
      : messages
    const response = await this.callApi(chatMessages, [], options)
    const message = response.choices?.[0]?.message
    const text = message?.content ?? ''
    const toolChanges = extractChangesFromTools(message?.tool_calls ?? [])
    if (toolChanges.length > 0) return { thought: text.trim(), changes: toolChanges, tokensUsed: tokenCount(response) }
    const xmlChanges = extractChangesFromXml(text)
    if (xmlChanges.length > 0) return { thought: text.trim(), changes: xmlChanges, tokensUsed: tokenCount(response) }
    return { thought: text.trim(), changes: extractChangesFromText(text), tokensUsed: tokenCount(response) }
  }

  // Multi-turn agentic loop with SSE streaming for text turns
  async runAgentLoop(messages: AgentMessage[], options: AgentLoopOptions): Promise<LLMResponse> {
    const { system, tools, executor, maxTurns = 10, onToken, onToolCall, onToolResult, signal } = options
    const history: ChatMessage[] = [
      { role: 'system', content: system },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ]
    const openaiTools = tools.map(toOpenAITool)
    let thought = ''
    let tokensUsed = 0

    for (let turn = 0; turn < maxTurns; turn++) {
      if (signal?.aborted) break
      const { text: textContent, toolCalls, finishReason, tokens, reasoningContent } = await this.streamingTurn(
        history, openaiTools, options, onToken, signal, {
          onStart: options.onReasoningStart,
          onDelta: options.onReasoningDelta,
          onEnd: options.onReasoningEnd,
        },
      )
      tokensUsed += tokens
      if (textContent.trim()) thought += (thought ? '\n' : '') + textContent.trim()

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: textContent || null,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        // Preserve reasoning_content — required by DeepSeek thinking mode in subsequent turns
        ...(reasoningContent ? { reasoning_content: reasoningContent } : {}),
      }
      history.push(assistantMsg)

      if (finishReason !== 'tool_calls' || !toolCalls.length) {
        if (executor.getChanges().length === 0 && textContent) {
          const xmlChanges = extractChangesFromXml(textContent)
          const changes = xmlChanges.length > 0 ? xmlChanges : extractChangesFromText(textContent)
          for (const c of changes) {
            if (c.type !== 'delete') await executor.execute('write_file', { path: c.path, content: c.diff })
          }
        }
        break
      }

      for (const tc of toolCalls) {
        const name = tc.function?.name ?? ''
        const input = parseArgs(tc.function?.arguments)
        onToolCall?.(name, input ?? {})
        const result = input ? await executor.execute(name, input) : 'Error: invalid arguments'
        onToolResult?.(name, result)
        history.push({ role: 'tool', tool_call_id: tc.id ?? '', content: result })
      }
    }

    return { thought, changes: executor.getChanges(), tokensUsed }
  }

  // Streaming turn — uses SSE when onToken is provided, falls back to regular JSON otherwise
  private async streamingTurn(
    messages: ChatMessage[],
    tools: ReturnType<typeof toOpenAITool>[],
    options: { model?: string; maxTokens?: number },
    onToken?: (token: string) => void,
    signal?: AbortSignal,
    reasoning?: ReasoningCallbacks,
  ): Promise<{ text: string; toolCalls: ToolCall[]; finishReason: string; tokens: number; reasoningContent?: string }> {
    // Non-streaming fallback (tests, models without SSE support)
    if (!onToken) {
      const response = await this.callApi(messages, tools, options)
      const choice = response.choices?.[0]
      const parsed = stripThinkBlocks(choice?.message?.content ?? '')
      const toolCalls = ((choice?.message?.tool_calls ?? []) as ToolCall[])
      const reasoningContent = choice?.message?.reasoning_content || undefined
      const combinedReasoning = [reasoningContent, parsed.reasoning].filter(Boolean).join('\n')
      return { text: parsed.text, toolCalls, finishReason: choice?.finish_reason ?? 'stop', tokens: tokenCount(response), reasoningContent: combinedReasoning || undefined }
    }

    const body: Record<string, unknown> = {
      ...this.options.extraBody,
      model: (options.model ?? this.options.model) || undefined,
      messages,
      max_tokens: options.maxTokens,
      stream: true,
    }
    if (tools.length > 0) body.tools = tools
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.options.apiKey) headers['Authorization'] = `Bearer ${this.options.apiKey}`
    let response: Response
    try {
      response = await fetch(`${trimSlash(this.options.baseUrl)}/chat/completions`, {
        method: 'POST', headers, body: JSON.stringify(body), signal,
      })
    } catch (err) {
      throw normalizeProviderError(err, { provider: 'openai-compatible', model: String(body.model ?? '') })
    }
    if (!response.ok) throw normalizeProviderError(new Error(`LLM request failed: ${response.status} ${await response.text()}`), {
      provider: 'openai-compatible',
      model: String(body.model ?? ''),
      status: response.status,
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = '', text = '', reasoningContent = '', finishReason = 'stop', tokens = 0
    const toolAcc: Record<number, { id: string; name: string; args: string }> = {}
    const thinkFilter = new ThinkTagFilter(reasoning)

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          try {
            type Delta = {
              content?: string
              reasoning_content?: string  // DeepSeek thinking mode
              tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }>
            }
            type SseChunk = { choices?: Array<{ delta?: Delta; finish_reason?: string }>; usage?: ChatResponse['usage'] }
            const data = JSON.parse(line.slice(6)) as SseChunk
            if (data.usage) tokens += tokenCount({ usage: data.usage })
            const choice = data.choices?.[0]; if (!choice) continue
            if (choice.finish_reason) finishReason = choice.finish_reason
            const delta = choice.delta; if (!delta) continue
            // reasoning_content is NOT streamed as final user-visible text.
            if (delta.reasoning_content) {
              reasoning?.onStart?.()
              reasoning?.onDelta?.(delta.reasoning_content)
              reasoningContent += delta.reasoning_content
            }
            if (delta.content) {
              const visible = thinkFilter.push(delta.content)
              if (visible) { text += visible; onToken?.(visible) }
            }
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (!toolAcc[tc.index]) toolAcc[tc.index] = { id: '', name: '', args: '' }
                if (tc.id) toolAcc[tc.index].id = tc.id
                if (tc.function?.name) toolAcc[tc.index].name = tc.function.name
                if (tc.function?.arguments) toolAcc[tc.index].args += tc.function.arguments
              }
            }
          } catch { /* malformed SSE chunk — skip and continue */ }
        }
      }
    } catch (err) {
      // Normalize network-level stream errors (socket closed, connection reset, etc.)
      // so callers always receive a KovaProviderError with a recoverable flag.
      throw normalizeProviderError(err, {
        provider: 'openai-compatible',
        model: String(body.model ?? ''),
      })
    } finally {
      // Release the reader lock regardless of success or error so the stream
      // can be garbage-collected cleanly.
      try { reader.releaseLock() } catch { /* ignore — stream may already be closed or errored */ }
    }

    const flushed = thinkFilter.flush()
    if (flushed) { text += flushed; onToken?.(flushed) }

    const toolCalls: ToolCall[] = Object.values(toolAcc).map(tc => ({
      id: tc.id, type: 'function' as const,
      function: { name: tc.name, arguments: tc.args },
    }))
    return {
      text,
      toolCalls,
      finishReason,
      tokens: tokens || estimateTokenCount([...messages.map(m => m.content ?? ''), text].join('\n\n')),
      reasoningContent: reasoningContent || undefined,
    }
  }

  private async callApi(messages: ChatMessage[], tools: ReturnType<typeof toOpenAITool>[], options: { model?: string; maxTokens?: number }): Promise<ChatResponse> {
    const body: Record<string, unknown> = {
      ...this.options.extraBody,
      model: (options.model ?? this.options.model) || undefined,
      messages,
      max_tokens: options.maxTokens,
      stream: false,
    }
    if (tools.length > 0) body.tools = tools
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.options.apiKey) headers['Authorization'] = `Bearer ${this.options.apiKey}`
    let response: Response
    try {
      response = await fetch(`${trimSlash(this.options.baseUrl)}/chat/completions`, {
        method: 'POST', headers, body: JSON.stringify(body),
      })
    } catch (err) {
      throw normalizeProviderError(err, { provider: 'openai-compatible', model: String(body.model ?? '') })
    }
    if (!response.ok) throw normalizeProviderError(new Error(`LLM request failed: ${response.status} ${await response.text()}`), {
      provider: 'openai-compatible',
      model: String(body.model ?? ''),
      status: response.status,
    })
    return response.json() as Promise<ChatResponse>
  }
}

function toOpenAITool(tool: KovaTool) {
  return {
    type: 'function' as const,
    function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
  }
}

function parseArgs(raw?: string): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function tokenCount(response: ChatResponse): number {
  const u = response.usage
  if (!u) return 0
  return u.total_tokens ?? (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0)
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function stripThinkBlocks(input: string): { text: string; reasoning: string } {
  let text = ''
  let reasoning = ''
  let cursor = 0
  const open = '<think>'
  const close = '</think>'

  while (cursor < input.length) {
    const start = input.indexOf(open, cursor)
    if (start === -1) {
      text += input.slice(cursor)
      break
    }
    text += input.slice(cursor, start)
    const bodyStart = start + open.length
    const end = input.indexOf(close, bodyStart)
    if (end === -1) {
      reasoning += input.slice(bodyStart)
      break
    }
    reasoning += input.slice(bodyStart, end)
    cursor = end + close.length
  }

  return { text, reasoning }
}

class ThinkTagFilter {
  private pending = ''
  private inThink = false

  constructor(private readonly callbacks?: ReasoningCallbacks) {}

  push(chunk: string): string {
    this.pending += chunk
    let visible = ''

    while (this.pending.length > 0) {
      if (this.inThink) {
        const end = this.pending.indexOf('</think>')
        if (end >= 0) {
          this.emitReasoning(this.pending.slice(0, end))
          this.pending = this.pending.slice('</think>'.length + end)
          this.inThink = false
          this.callbacks?.onEnd?.()
          continue
        }
        const safeLen = Math.max(0, this.pending.length - '</think>'.length + 1)
        if (safeLen === 0) break
        this.emitReasoning(this.pending.slice(0, safeLen))
        this.pending = this.pending.slice(safeLen)
        break
      }

      const start = this.pending.indexOf('<think>')
      if (start >= 0) {
        visible += this.pending.slice(0, start)
        this.pending = this.pending.slice(start + '<think>'.length)
        this.inThink = true
        this.callbacks?.onStart?.()
        continue
      }

      const hold = partialPrefixLength(this.pending, '<think>')
      const safeLen = this.pending.length - hold
      if (safeLen > 0) {
        visible += this.pending.slice(0, safeLen)
        this.pending = this.pending.slice(safeLen)
      }
      break
    }

    return visible
  }

  flush(): string {
    if (!this.pending) return ''
    if (this.inThink) {
      this.emitReasoning(this.pending)
      this.pending = ''
      this.inThink = false
      this.callbacks?.onEnd?.()
      return ''
    }
    const visible = this.pending
    this.pending = ''
    return visible
  }

  private emitReasoning(text: string): void {
    if (!text) return
    this.callbacks?.onStart?.()
    this.callbacks?.onDelta?.(text)
  }
}

function partialPrefixLength(value: string, token: string): number {
  const max = Math.min(value.length, token.length - 1)
  for (let len = max; len > 0; len--) {
    if (token.startsWith(value.slice(-len))) return len
  }
  return 0
}
