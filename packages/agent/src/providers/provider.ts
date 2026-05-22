import type { AgentMessage, FileChange } from '@kova/shared'
import type { KovaTool, ToolExecutor } from '../tools'
import type { ProviderRetryEvent } from './retry'

export interface ProviderUsageReport {
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  inputTokens: number
  outputTokens: number
}

export interface LLMResponse {
  thought: string
  changes: FileChange[]
  tokensUsed: number
  maxTurnsReached?: boolean
  incompleteReason?: string
}

export interface GenerateOptions {
  system?: string
  maxTokens?: number
  model?: string
}

// Single-turn interface - used for task structuring and simple completions.
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
  // Streaming callbacks - called in real time as the LLM generates output.
  onToken?: (token: string) => void
  onReasoningStart?: () => void
  onReasoningDelta?: (delta: string) => void
  onReasoningEnd?: () => void
  onToolCall?: (name: string, input: Record<string, unknown>) => void
  onToolResult?: (name: string, output: string) => void
  /** Emitted before a recoverable provider/API failure is retried. */
  onProviderRetry?: (event: ProviderRetryEvent) => void
  /**
   * Receives a token-usage report after every API call. Used by product
   * surfaces to measure prompt-cache hit rate and cost.
   */
  onUsageReport?: (report: ProviderUsageReport) => void
}

// What a provider/model can reliably do - used to adapt prompts and strategies.
export interface ProviderCapabilities {
  // Whether the model reliably uses structured tool calls (vs text output).
  supportsToolCalls: boolean
  // Approximate usable context window in tokens (conservative estimate).
  contextTokenLimit: number
  /**
   * Whether the provider supports explicit prompt caching via cache breakpoints
   * such as Anthropic cache_control. Automatic prefix caching providers should
   * leave this false until their usage telemetry is wired.
   */
  supportsPromptCaching?: boolean
  /**
   * Whether the active model accepts image attachments (vision). Renderer uses
   * this to gate the "+" attach button so the user is never allowed to send
   * an image to a text-only model. False or undefined → block image attachments
   * with a clear UI message.
   */
  supportsVision?: boolean
}

// Multi-turn agentic interface - handles real tool execution loops.
export interface AgentProvider extends LLMProvider {
  runAgentLoop(messages: AgentMessage[], options: AgentLoopOptions): Promise<LLMResponse>
  // Providers expose their capabilities so the agent can adapt prompts.
  capabilities(): ProviderCapabilities
}
