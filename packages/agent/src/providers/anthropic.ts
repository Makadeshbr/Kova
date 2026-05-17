import Anthropic from '@anthropic-ai/sdk'
import type { AgentMessage } from '@kova/shared'
import { formatTextAttachment } from '@kova/shared'
import type { LLMResponse, GenerateOptions, AgentProvider, AgentLoopOptions, ProviderCapabilities, ProviderUsageReport } from './provider'
import type { KovaTool } from '../tools'
import { normalizeProviderError } from './errors'
import { detectCapabilities } from './model-catalog'
import {
  withCachedSystem,
  withCachedTools,
  withHistoryCacheBreakpoint,
  parseCacheUsage,
} from './anthropic-cache'

export interface AnthropicProviderOptions {
  apiKey?: string
  model?: string
}

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 8192

export class AnthropicProvider implements AgentProvider {
  private readonly client: Anthropic
  private readonly defaultModel: string

  constructor(options: AnthropicProviderOptions = {}) {
    this.client = new Anthropic({ apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '' })
    this.defaultModel = options.model ?? DEFAULT_MODEL
  }

  capabilities(): ProviderCapabilities {
    // FIX-014: explicit prompt caching is wired up via cache_control breakpoints.
    // Vision capability is per-model — Claude 3.5+ accept images, legacy haiku 3.5 does not.
    const detected = detectCapabilities(this.defaultModel)
    return {
      supportsToolCalls: true,
      contextTokenLimit: 180_000,
      supportsPromptCaching: true,
      supportsVision: detected.supportsVision ?? false,
    }
  }

  // Single-turn — used for task structuring (no tools)
  async generate(messages: AgentMessage[], options: GenerateOptions = {}): Promise<LLMResponse> {
    const model = options.model ?? this.defaultModel
    // FIX-014: cache the system prompt + the prior history. Single-shot calls
    // still benefit when the same system+history shape repeats (task structuring).
    const cachedSystem = withCachedSystem(options.system)
    const cachedMessages = withHistoryCacheBreakpoint(toAnthropicMessages(messages))

    let response: Anthropic.Messages.Message
    try {
      response = await this.client.messages.create({
        model,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...(cachedSystem ? { system: cachedSystem } : {}),
        messages: cachedMessages,
      })
    } catch (err) {
      throw normalizeProviderError(err, { provider: 'anthropic', model })
    }
    const thought = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map(b => b.text).join('\n').trim()
    return { thought, changes: [], tokensUsed: response.usage.input_tokens + response.usage.output_tokens }
  }

  // Multi-turn agentic loop — streams text tokens when onToken is provided
  async runAgentLoop(messages: AgentMessage[], options: AgentLoopOptions): Promise<LLMResponse> {
    const { system, tools, executor, maxTurns = 10, onToken, onToolCall, onToolResult, onUsageReport, signal } = options

    // FIX-014: precompute cache-marked system and tools once — they're stable across turns.
    const cachedSystem = withCachedSystem(system)
    const anthropicTools = withCachedTools(tools.map(toAnthropicTool))

    if (!tools.length) {
      const baseHistory = toAnthropicMessages(messages)
      const cachedHistory = withHistoryCacheBreakpoint(baseHistory)

      if (!onToken) return this.generate(messages, { system, model: options.model, maxTokens: options.maxTokens })

      // Streaming chat without tools (Anthropic doesn't stream via generate())
      const stream = this.client.messages.stream({
        model: options.model ?? this.defaultModel,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...(cachedSystem ? { system: cachedSystem } : {}),
        messages: cachedHistory,
      }, { signal })
      let thought = ''
      stream.on('text', text => { thought += text; onToken(text) })
      let response: Anthropic.Messages.Message
      try {
        response = await stream.finalMessage()
      } catch (err) {
        throw normalizeProviderError(err, { provider: 'anthropic', model: options.model ?? this.defaultModel })
      }
      reportUsage(response.usage, onUsageReport)
      return { thought, changes: [], tokensUsed: response.usage.input_tokens + response.usage.output_tokens }
    }

    const history: Anthropic.Messages.MessageParam[] = toAnthropicMessages(messages)
    let thought = ''
    let tokensUsed = 0
    let completedNaturally = false

    for (let turn = 0; turn < maxTurns; turn++) {
      if (signal?.aborted) break

      // FIX-014: refresh the history breakpoint every turn — the marker moves
      // forward as the loop appends assistant turns and tool_result blocks, so
      // each turn's cached prefix grows.
      const cachedHistory = withHistoryCacheBreakpoint(history)

      const params = {
        model: options.model ?? this.defaultModel,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...(cachedSystem ? { system: cachedSystem } : {}),
        tools: anthropicTools,
        messages: cachedHistory,
      }

      let response: Anthropic.Messages.Message
      let turnText = ''

      if (onToken) {
        // Streaming path — emit tokens in real time and accumulate the full response
        const stream = this.client.messages.stream(params, { signal })

        stream.on('text', (text) => {
          turnText += text
          onToken(text)
        })

        try {
          response = await stream.finalMessage()
        } catch (err) {
          throw normalizeProviderError(err, { provider: 'anthropic', model: options.model ?? this.defaultModel })
        }
      } else {
        try {
          response = await this.client.messages.create(params)
        } catch (err) {
          throw normalizeProviderError(err, { provider: 'anthropic', model: options.model ?? this.defaultModel })
        }
        turnText = response.content
          .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
          .map(b => b.text).join('\n').trim()
      }

      reportUsage(response.usage, onUsageReport)
      tokensUsed += response.usage.input_tokens + response.usage.output_tokens
      if (turnText.trim()) thought += (thought ? '\n' : '') + turnText.trim()

      history.push({ role: 'assistant', content: response.content })
      if (response.stop_reason !== 'tool_use') {
        completedNaturally = true
        break
      }

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const input = block.input as Record<string, unknown>
        onToolCall?.(block.name, input)
        const result = await executor.execute(block.name, input)
        onToolResult?.(block.name, result)
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
      }
      history.push({ role: 'user', content: toolResults })
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
}

function toAnthropicTool(tool: KovaTool): Anthropic.Tool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as Anthropic.Tool['input_schema'],
  }
}

/**
 * Convert Kova AgentMessage[] to Anthropic MessageParam[]. When a user message
 * carries attachments, expand `content` into a multi-block array with image
 * blocks (for image attachments) and a trailing text block. Assistant turns
 * and attachment-free user turns keep the simpler string content form.
 *
 * Non-image attachments (PDF, text files) are inlined as text excerpts so they
 * still reach the model even on calls that don't accept document blocks.
 */
function toAnthropicMessages(messages: AgentMessage[]): Anthropic.Messages.MessageParam[] {
  return messages.map(m => {
    if (m.role !== 'user' || !m.attachments?.length) {
      return { role: m.role, content: m.content }
    }
    const blocks: Anthropic.Messages.ContentBlockParam[] = []
    for (const att of m.attachments) {
      if (att.kind === 'image') {
        blocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: att.mimeType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
            data: att.base64,
          },
        })
      } else {
        blocks.push({ type: 'text', text: formatTextAttachment(att) })
      }
    }
    blocks.push({ type: 'text', text: m.content })
    return { role: 'user', content: blocks }
  })
}


/**
 * FIX-014: surface cache hit / miss counters to the caller. Called once per
 * API response (i.e. once per agent-loop turn).
 */
function reportUsage(
  usage: Anthropic.Messages.Usage,
  onUsageReport: ((report: ProviderUsageReport) => void) | undefined,
): void {
  if (!onUsageReport) return
  const parsed = parseCacheUsage(usage)
  onUsageReport({
    cacheReadInputTokens: parsed.cacheReadInputTokens,
    cacheCreationInputTokens: parsed.cacheCreationInputTokens,
    inputTokens: parsed.inputTokens,
    outputTokens: parsed.outputTokens,
  })
}
