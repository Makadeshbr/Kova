import type { AgentMessage, FileChange } from '@kova/shared'
import type { KovaTool, ToolExecutor } from '../tools'

export interface LLMResponse {
  thought: string
  changes: FileChange[]
  tokensUsed: number
}

export interface GenerateOptions {
  system?: string
  maxTokens?: number
  model?: string
}

// Single-turn interface — used for task structuring and simple completions
export interface LLMProvider {
  generate(messages: AgentMessage[], options?: GenerateOptions): Promise<LLMResponse>
}

export interface AgentLoopOptions {
  system: string
  tools: KovaTool[]
  executor: ToolExecutor
  maxTurns?: number
  model?: string
  maxTokens?: number
  signal?: AbortSignal
  // Streaming callbacks — called in real time as the LLM generates output
  onToken?: (token: string) => void
  onReasoningStart?: () => void
  onReasoningDelta?: (delta: string) => void
  onReasoningEnd?: () => void
  onToolCall?: (name: string, input: Record<string, unknown>) => void
  onToolResult?: (name: string, output: string) => void
}

// What a provider/model can reliably do — used to adapt prompts and strategies
export interface ProviderCapabilities {
  // Whether the model reliably uses structured tool calls (vs text output)
  supportsToolCalls: boolean
  // Approximate usable context window in tokens (conservative estimate)
  contextTokenLimit: number
}

// Multi-turn agentic interface — handles real tool execution loops
export interface AgentProvider extends LLMProvider {
  runAgentLoop(messages: AgentMessage[], options: AgentLoopOptions): Promise<LLMResponse>
  // Providers expose their capabilities so the agent can adapt prompts
  capabilities(): ProviderCapabilities
}
