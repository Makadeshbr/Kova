import type { AgentMessage } from '@kova/shared'
import { formatTextAttachment } from '@kova/shared'
import type { GenerateOptions, LLMResponse, AgentProvider, AgentLoopOptions, ProviderCapabilities } from './provider'
import type { KovaTool } from '../tools'
import { extractChangesFromXml, extractChangesFromTools, extractChangesFromText, type OpenAIToolCall } from './openai-text-parser'
import { normalizeProviderError } from './errors'
import { detectCapabilities } from './model-catalog'
import { withProviderRetry, type ProviderRetryPolicyInput } from './retry'

export interface OpenAICompatibleProviderOptions {
  apiKey?: string
  baseUrl: string
  model: string
  extraBody?: Record<string, unknown>
  retryPolicy?: ProviderRetryPolicyInput
}

// OpenAI multimodal content parts — used when a user message includes images.
// `image_url.url` accepts data: URLs (data:<mime>;base64,<base64>) so we can
// inline attachments without uploading to a separate file endpoint.
type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }

interface ChatMessage {
  role: string
  content?: string | null | ChatContentPart[]
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

  // Capabilities are derived from the model ID via the shared catalog, which
  // covers every search-confirmed 2026 family (Gemini 3.x, Kimi K2.x, DeepSeek
  // V3.2/R1, Grok 4, GPT-5.x, Claude 4.x) and falls back to conservative 8k
  // no-tools defaults for unknown IDs.
  capabilities(): ProviderCapabilities {
    return detectCapabilities(this.options.model)
  }

  // Single-turn — used for task structuring
  async generate(messages: AgentMessage[], options: GenerateOptions = {}): Promise<LLMResponse> {
    const userMessages = toOpenAIMessages(messages)
    const chatMessages: ChatMessage[] = options.system
      ? [{ role: 'system', content: options.system }, ...userMessages]
      : userMessages
    const response = await this.callApi(chatMessages, [], options)
    const message = response.choices?.[0]?.message
    // Assistant responses always come back as plain text strings — the
    // multimodal array shape is request-side only (user → model image inputs).
    const text = typeof message?.content === 'string' ? message.content : ''
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
      ...toOpenAIMessages(messages),
    ]
    const openaiTools = tools.map(toOpenAITool)
    let thought = ''
    let tokensUsed = 0
    const requestedPaths = extractRequestedPaths(messages)
    let completedNaturally = false

    for (let turn = 0; turn < maxTurns; turn++) {
      if (signal?.aborted) break
      const { text: textContent, toolCalls, tokens, reasoningContent } = await this.streamingTurn(
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

      if (toolCalls.length > 0) {
        // Some OpenAI-compatible providers emit valid tool calls while reporting
        // finish_reason=stop. Tool calls are authoritative; text extraction is
        // only a fallback for a final turn with no tool calls.
        for (const tc of toolCalls) {
          const name = tc.function?.name ?? ''
          const input = parseArgs(tc.function?.arguments)
          onToolCall?.(name, input ?? {})
          const result = input ? await executor.execute(name, input) : 'Error: invalid arguments'
          onToolResult?.(name, result)
          history.push({ role: 'tool', tool_call_id: tc.id ?? '', content: result })
        }
        continue
      }

      if (textContent) {
        const existingPaths = new Set(executor.getChanges().map(change => change.path))
        // XML extraction is always allowed — `<kova_file path="...">` is an
        // explicit "write this file" instruction in the text, used by older
        // models without native tool calling.
        //
        // Bare code-block extraction (``` foo.ts ... ``` style) is dangerous
        // for tool-capable models: they often include code blocks as EXAMPLES
        // in explanations and we'd mistakenly write those as project files.
        // Only enable it when the model has no tool support at all.
        const xmlChanges = extractChangesFromXml(textContent)
        const allowBareBlocks =
          !this.capabilities().supportsToolCalls &&
          existingPaths.size === 0 &&
          requestedPaths.size === 0
        const changes = xmlChanges.length > 0
          ? xmlChanges
          : extractChangesFromText(textContent, { includeBareBlocks: allowBareBlocks })
        for (const c of changes) {
          if (c.type === 'delete' || existingPaths.has(c.path)) continue
          const input = { path: c.path, content: c.diff }
          onToolCall?.('write_file', input)
          const result = await executor.execute('write_file', input)
          onToolResult?.('write_file', result)
          existingPaths.add(c.path)
        }
      }
      completedNaturally = true
      break
    }

    const maxTurnsReached = !completedNaturally && !signal?.aborted
    return {
      thought,
      changes: executor.getChanges(),
      tokensUsed,
      maxTurnsReached,
      incompleteReason: maxTurnsReached ? `Agent reached maxTurns (${maxTurns}) before a final response.` : undefined,
    }
  }

  // Streaming turn — uses SSE when onToken is provided, falls back to regular JSON otherwise
  private async streamingTurn(
    messages: ChatMessage[],
    tools: ReturnType<typeof toOpenAITool>[],
    options: { model?: string; maxTokens?: number; onProviderRetry?: AgentLoopOptions['onProviderRetry'] },
    onToken?: (token: string) => void,
    signal?: AbortSignal,
    reasoning?: ReasoningCallbacks,
  ): Promise<{ text: string; toolCalls: ToolCall[]; finishReason: string; tokens: number; reasoningContent?: string }> {
    // Non-streaming fallback (tests, models without SSE support)
    if (!onToken) {
      const response = await this.callApi(messages, tools, options, signal)
      const choice = response.choices?.[0]
      const rawContent = typeof choice?.message?.content === 'string' ? choice.message.content : ''
      const parsed = stripThinkBlocks(rawContent)
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
    response = await this.withRetry(async () => {
      const httpResponse = await fetch(`${trimSlash(this.options.baseUrl)}/chat/completions`, {
        method: 'POST', headers, body: JSON.stringify(body), signal,
      })
      if (!httpResponse.ok) throw normalizeProviderError(new Error(`LLM request failed: ${httpResponse.status} ${await httpResponse.text()}`), {
        provider: 'openai-compatible',
        model: String(body.model ?? ''),
        status: httpResponse.status,
      })
      return httpResponse
    }, String(body.model ?? ''), signal, options.onProviderRetry)

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

  private async callApi(
    messages: ChatMessage[],
    tools: ReturnType<typeof toOpenAITool>[],
    options: { model?: string; maxTokens?: number; onProviderRetry?: AgentLoopOptions['onProviderRetry'] },
    signal?: AbortSignal,
  ): Promise<ChatResponse> {
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
    return this.withRetry(async () => {
      const response = await fetch(`${trimSlash(this.options.baseUrl)}/chat/completions`, {
        method: 'POST', headers, body: JSON.stringify(body), signal,
      })
      if (!response.ok) throw normalizeProviderError(new Error(`LLM request failed: ${response.status} ${await response.text()}`), {
        provider: 'openai-compatible',
        model: String(body.model ?? ''),
        status: response.status,
      })
      return response.json() as Promise<ChatResponse>
    }, String(body.model ?? ''), signal, options.onProviderRetry)
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    model: string,
    signal?: AbortSignal,
    onProviderRetry?: AgentLoopOptions['onProviderRetry'],
  ): Promise<T> {
    return withProviderRetry(operation, {
      provider: 'openai-compatible',
      model,
      signal,
      onRetry: onProviderRetry,
    }, this.options.retryPolicy)
  }
}

function toOpenAITool(tool: KovaTool) {
  return {
    type: 'function' as const,
    function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
  }
}

/**
 * Convert Kova AgentMessage[] to the OpenAI Chat Completions message shape.
 * User messages with attachments become multimodal: image attachments become
 * `image_url` parts (data: URLs so we don't hit any external file endpoint);
 * non-image attachments are inlined as text excerpts so they still reach the
 * model even when only an image-capable schema is supported.
 */
function toOpenAIMessages(messages: AgentMessage[]): ChatMessage[] {
  return messages.map(m => {
    if (m.role !== 'user' || !m.attachments?.length) {
      return { role: m.role, content: m.content }
    }
    const parts: ChatContentPart[] = []
    for (const att of m.attachments) {
      if (att.kind === 'image') {
        parts.push({ type: 'image_url', image_url: { url: `data:${att.mimeType};base64,${att.base64}` } })
      } else {
        parts.push({ type: 'text', text: formatTextAttachment(att) })
      }
    }
    parts.push({ type: 'text', text: m.content })
    return { role: 'user', content: parts }
  })
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

function extractRequestedPaths(messages: AgentMessage[]): Set<string> {
  const paths = new Set<string>()
  for (const message of messages) {
    if (message.role !== 'user') continue
    const text = typeof message.content === 'string' ? message.content : ''
    for (const match of text.matchAll(/\b(?:[A-Za-z0-9_.@-]+[\\/])*[A-Za-z0-9_.@-]+\.[A-Za-z0-9]+\b/g)) {
      const path = normalizeRequestedPath(match[0])
      if (path && !path.includes('://')) paths.add(path)
    }
  }
  return paths
}

function normalizeRequestedPath(raw: string): string {
  return raw.replace(/\\/g, '/').replace(/^\.\//, '').replace(/[),.;:]+$/, '').trim()
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
