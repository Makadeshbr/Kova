import Anthropic from '@anthropic-ai/sdk'
import type { AgentMessage } from '@kova/shared'
import type { LLMResponse, GenerateOptions, AgentProvider, AgentLoopOptions, ProviderCapabilities } from './provider'
import type { KovaTool } from '../tools'

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
    return { supportsToolCalls: true, contextTokenLimit: 180_000 }
  }

  // Single-turn — used for task structuring (no tools)
  async generate(messages: AgentMessage[], options: GenerateOptions = {}): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: options.model ?? this.defaultModel,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: options.system,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })
    const thought = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map(b => b.text).join('\n').trim()
    return { thought, changes: [], tokensUsed: response.usage.input_tokens + response.usage.output_tokens }
  }

  // Multi-turn agentic loop — streams text tokens when onToken is provided
  async runAgentLoop(messages: AgentMessage[], options: AgentLoopOptions): Promise<LLMResponse> {
    const { system, tools, executor, maxTurns = 10, onToken, onToolCall, onToolResult, signal } = options
    if (!tools.length) {
      if (!onToken) return this.generate(messages, { system, model: options.model, maxTokens: options.maxTokens })
      // Streaming chat without tools (Anthropic doesn't stream via generate())
      const stream = this.client.messages.stream({
        model: options.model ?? this.defaultModel,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        system,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }, { signal })
      let thought = ''
      stream.on('text', text => { thought += text; onToken(text) })
      const response = await stream.finalMessage()
      return { thought, changes: [], tokensUsed: response.usage.input_tokens + response.usage.output_tokens }
    }

    const history: Anthropic.Messages.MessageParam[] = messages.map(m => ({ role: m.role, content: m.content }))
    const anthropicTools = tools.map(toAnthropicTool)
    let thought = ''
    let tokensUsed = 0

    for (let turn = 0; turn < maxTurns; turn++) {
      if (signal?.aborted) break
      const params = {
        model: options.model ?? this.defaultModel,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        system,
        tools: anthropicTools,
        messages: history,
      }

      let response: Anthropic.Messages.Message
      let turnText = ''

      if (onToken) {
        // Streaming path — emit tokens in real time and accumulate the full response
        const stream = this.client.messages.stream(params, { signal })
        const contentBlocks: Anthropic.Messages.ContentBlock[] = []

        stream.on('text', (text) => {
          turnText += text
          onToken(text)
        })

        stream.on('contentBlock', (block) => {
          contentBlocks.push(block)
        })

        response = await stream.finalMessage()
      } else {
        response = await this.client.messages.create(params)
        turnText = response.content
          .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
          .map(b => b.text).join('\n').trim()
      }

      tokensUsed += response.usage.input_tokens + response.usage.output_tokens
      if (turnText.trim()) thought += (thought ? '\n' : '') + turnText.trim()

      history.push({ role: 'assistant', content: response.content })
      if (response.stop_reason !== 'tool_use') break

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

    return { thought, changes: executor.getChanges(), tokensUsed }
  }
}

function toAnthropicTool(tool: KovaTool): Anthropic.Tool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as Anthropic.Tool['input_schema'],
  }
}
