import { describe, it, expect } from 'vitest'
import type { ExecutionState, DecisionResult } from '@kova/shared'
import { shouldStop } from '../src/stop-conditions'

function makeState(overrides: Partial<ExecutionState> = {}): ExecutionState {
  return {
    taskId: 't1', status: 'coding',
    currentIteration: 0, maxIterations: 5,
    iterationHistory: [],
    startedAt: new Date().toISOString(),
    totalTokens: 0,
    ...overrides,
  }
}

function makeDecision(decision: DecisionResult['decision']): DecisionResult {
  return { decision, score: 85, reason: 'test', feedback: [] }
}

describe('shouldStop', () => {
  it('deve retornar null sem lastDecision (primeira iteração)', () => {
    expect(shouldStop(makeState())).toBeNull()
  })

  it('deve retornar success quando status é completed', () => {
    expect(shouldStop(makeState({ status: 'completed' }))).toBe('success')
  })

  it('deve retornar aborted quando status é failed', () => {
    expect(shouldStop(makeState({ status: 'failed' }))).toBe('aborted')
  })

  it('deve retornar success para auto_apply', () => {
    expect(shouldStop(makeState(), makeDecision('auto_apply'))).toBe('success')
  })

  it('deve retornar success para suggest (loop para, espera humano)', () => {
    expect(shouldStop(makeState(), makeDecision('suggest'))).toBe('success')
  })

  it('deve retornar human_required para human_required', () => {
    expect(shouldStop(makeState(), makeDecision('human_required'))).toBe('human_required')
  })

  it('deve retornar null para reject abaixo do max', () => {
    const state = makeState({ currentIteration: 2, maxIterations: 5 })
    expect(shouldStop(state, makeDecision('reject'))).toBeNull()
  })

  it('deve retornar max_iterations quando atingiu o limite', () => {
    const state = makeState({ currentIteration: 5, maxIterations: 5 })
    expect(shouldStop(state, makeDecision('reject'))).toBe('max_iterations')
  })

  it('deve retornar max_iterations com limite customizado', () => {
    const state = makeState({ currentIteration: 3, maxIterations: 5 })
    expect(shouldStop(state, makeDecision('reject'), { maxIterations: 3 })).toBe('max_iterations')
  })

  it('deve retornar timeout quando startedAt está no passado além do limite', () => {
    const state = makeState({
      startedAt: new Date(Date.now() - 130_000).toISOString(),
    })
    expect(shouldStop(state, undefined, { timeoutMs: 120_000 })).toBe('timeout')
  })

  it('permite uma tentativa de repair quando reject ainda tem iteracoes disponiveis mesmo apos timeout', () => {
    const state = makeState({
      currentIteration: 1,
      maxIterations: 3,
      startedAt: new Date(Date.now() - 130_000).toISOString(),
    })
    expect(shouldStop(state, makeDecision('reject'), { timeoutMs: 120_000 })).toBeNull()
  })

  it('deve respeitar timeoutMs customizado (0ms = timeout imediato)', () => {
    const state = makeState({ startedAt: new Date(Date.now() - 10).toISOString() })
    expect(shouldStop(state, undefined, { timeoutMs: 1 })).toBe('timeout')
  })

  it('não deve retornar timeout para execução recente', () => {
    const state = makeState()
    expect(shouldStop(state, undefined, { timeoutMs: 120_000 })).toBeNull()
  })
})
