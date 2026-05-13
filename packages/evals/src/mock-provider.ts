import type { AgentMessage } from '@kova/shared'
import type { AgentProvider, AgentLoopOptions, GenerateOptions, LLMResponse } from '@kova/agent'

/** A single simulated model turn: optionally emit text and/or call tools. */
export interface MockTurn {
  text?: string
  toolCalls?: Array<{ name: string; input: Record<string, unknown> }>
}

/**
 * MockAgentProvider — simulates a real LLM for eval scenarios.
 *
 * Accepts a sequence of turns. Each `runAgentLoop` call consumes the next turn.
 * If turns run out, subsequent calls return an empty text response.
 *
 * Design: calls the real ToolExecutor (not mocked) so file writes, runs and
 * all side effects are real. Only the "intelligence" (what to write) is controlled.
 */
export class MockAgentProvider implements AgentProvider {
  private turns: MockTurn[]
  private callIndex = 0

  constructor(turns: MockTurn[]) {
    this.turns = turns
  }

  capabilities() {
    return { supportsToolCalls: true, contextTokenLimit: 10_000 }
  }

  async generate(_messages: AgentMessage[], _options: GenerateOptions): Promise<LLMResponse> {
    return { thought: 'mock generate', changes: [], tokensUsed: 10 }
  }

  async runAgentLoop(_messages: AgentMessage[], options: AgentLoopOptions): Promise<LLMResponse> {
    const { executor, onToken, onToolCall, onToolResult, signal } = options
    const turn = this.turns[this.callIndex++] ?? { text: '' }

    // Emit text tokens character-by-character (realistic streaming simulation)
    if (turn.text) {
      for (const char of turn.text) {
        if (signal?.aborted) break
        onToken?.(char)
      }
    }

    // Execute tool calls through the real ToolExecutor so changes are real
    if (turn.toolCalls) {
      for (const tc of turn.toolCalls) {
        if (signal?.aborted) break
        onToolCall?.(tc.name, tc.input)
        const result = await executor.execute(tc.name, tc.input)
        onToolResult?.(tc.name, result)
      }
    }

    return {
      thought: turn.text ?? '',
      changes: executor.getChanges(),
      tokensUsed: 100,
    }
  }
}
