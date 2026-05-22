import { describe, expect, it } from 'vitest'
import type { ExecutionEvent, ExecutionState } from '../src/renderer/src/types'
import { shouldRenderRunOverlay } from '../src/renderer/src/lib/run-overlay'

function baseInput(overrides: Partial<Parameters<typeof shouldRenderRunOverlay>[0]> = {}) {
  return {
    executionState: null,
    events: [],
    todos: [],
    reviewChangeCount: 0,
    isThinking: false,
    activeMode: 'patch' as const,
    ...overrides,
  }
}

function event(type: ExecutionEvent['type'], extra: Partial<ExecutionEvent> = {}): ExecutionEvent {
  return {
    type,
    taskId: 'chat',
    timestamp: '2026-05-20T00:00:00.000Z',
    ...extra,
  }
}

function stateWithChanges(): ExecutionState {
  return {
    taskId: 't',
    status: 'completed',
    currentIteration: 0,
    maxIterations: 1,
    totalTokens: 0,
    startedAt: '2026-05-20T00:00:00.000Z',
    iterationHistory: [{
      iteration: 0,
      agentMode: 'code',
      agentThought: '',
      duration: 1,
      tokensUsed: 0,
      contextFiles: [],
      changes: [{ type: 'create', path: 'src/app.ts', diff: 'export {}' }],
      harnessResult: {
        passed: true,
        score: 90,
        duration: 0,
        iteration: 1,
        layers: [],
        validationConfidence: 'none',
      },
      decision: { decision: 'auto_apply', score: 90, reason: 'ok', feedback: [] },
    }],
  }
}

describe('shouldRenderRunOverlay', () => {
  it('hides the run overlay for normal chat lifecycle events', () => {
    expect(shouldRenderRunOverlay(baseInput({
      events: [
        event('provider_session_start'),
        event('token_usage'),
        event('stream_end'),
        event('proof_pack'),
        event('state_changed'),
      ],
      isThinking: true,
    }))).toBe(false)
  })

  it('hides failed execution state when no files, plan, review, or agentic events exist', () => {
    expect(shouldRenderRunOverlay(baseInput({
      executionState: {
        taskId: 't',
        status: 'failed',
        currentIteration: 1,
        maxIterations: 20,
        totalTokens: 0,
        startedAt: '2026-05-20T00:00:00.000Z',
        iterationHistory: [],
      },
      events: [event('state_changed'), event('proof_pack'), event('stream_end')],
    }))).toBe(false)
  })

  it('shows for plan/review mode while thinking', () => {
    expect(shouldRenderRunOverlay(baseInput({ activeMode: 'plan', isThinking: true }))).toBe(true)
    expect(shouldRenderRunOverlay(baseInput({ activeMode: 'review', isThinking: true }))).toBe(true)
  })

  it('shows for file changes, writable tools, commands, and validation', () => {
    expect(shouldRenderRunOverlay(baseInput({ executionState: stateWithChanges() }))).toBe(true)
    expect(shouldRenderRunOverlay(baseInput({ events: [event('tool_call', { toolName: 'write_file' })] }))).toBe(true)
    expect(shouldRenderRunOverlay(baseInput({ events: [event('tool_call', { toolName: 'run_command' })] }))).toBe(true)
    expect(shouldRenderRunOverlay(baseInput({ events: [event('validation_started')] }))).toBe(true)
  })

  it('does not show for read-only chat tool calls', () => {
    expect(shouldRenderRunOverlay(baseInput({
      events: [event('tool_call', { toolName: 'read_file' }), event('tool_result', { toolName: 'read_file' })],
    }))).toBe(false)
  })
})
