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

/**
 * FIX-014: per-call token usage report from a provider. Lets the surface
 * surface (EngineManager / CLI) measure prompt-cache hit rate and cost.
 */
export interface ProviderUsageReport {
  /** Input tokens read from cache (Anthropic ephemeral cache — 0.10× cost). */
  cacheReadInputTokens: number
  /** Input tokens written into the cache this call (1.25× cost). */
  cacheCreationInputTokens: number
  /** Input tokens not served from cache (full price). */
  inputTokens: number
  /** Output tokens generated. */
  outputTokens: number
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
  /**
   * FIX-014: receives a token-usage report after every API call (every turn
   * of the agent loop). Used by EngineManager to measure cache hit rate.
   */
  onUsageReport?: (report: ProviderUsageReport) => void
}

// What a provider/model can reliably do — used to adapt prompts and strategies
export interface ProviderCapabilities {
  // Whether the model reliably uses structured tool calls (vs text output)
  supportsToolCalls: boolean
  // Approximate usable context window in tokens (conservative estimate)
  contextTokenLimit: number
  /**
   * FIX-014: whether the provider supports explicit prompt caching via
   * cache breakpoints (Anthropic-style `cache_control`). Providers that rely
   * on implicit/automatic prefix caching should leave this false.
   */
  supportsPromptCaching?: boolean
}

// Multi-turn agentic interface — handles real tool execution loops
export interface AgentProvider extends LLMProvider {
  runAgentLoop(messages: AgentMessage[], options: AgentLoopOptions): Promise<LLMResponse>
  // Providers expose their capabilities so the agent can adapt prompts
  capabilities(): ProviderCapabilities
}
