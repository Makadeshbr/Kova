import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { ExecutionState, IterationRecord, HarnessResult, LayerResult, DecisionResult } from '@kova/shared'
import { recordTrace, queryTraces } from '../src/tracer'

let tmpDir = ''

function setup(): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-tracer-'))
  return tmpDir
}

afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
  tmpDir = ''
})

function makeLayer(name: string, passed: boolean): LayerResult {
  return { name: name as LayerResult['name'], passed, errors: [], warnings: [], duration: 10, skipped: false }
}

function makeHarnessResult(score: number, passed = true): HarnessResult {
  return { passed, score, layers: [makeLayer('build', passed)], duration: 50, iteration: 1 }
}

function makeDecision(decision: DecisionResult['decision']): DecisionResult {
  return { decision, score: 85, reason: `${decision} reason`, feedback: [] }
}

function makeIteration(n: number): IterationRecord {
  return {
    iteration: n, agentMode: 'code', agentThought: `thought ${n}`,
    changes: [], harnessResult: makeHarnessResult(85), decision: makeDecision('auto_apply'),
    duration: 1000, tokensUsed: 500,
  }
}

function makeState(overrides: Partial<ExecutionState> = {}): ExecutionState {
  return {
    taskId: 'task-abc', status: 'completed',
    currentIteration: 1, maxIterations: 5,
    iterationHistory: [makeIteration(1)],
    startedAt: new Date(Date.now() - 2000).toISOString(),
    totalTokens: 500,
    ...overrides,
  }
}

describe('recordTrace', () => {
  it('deve salvar trace em .kova/traces/ e retornar objeto completo', () => {
    const root = setup()
    const trace = recordTrace(makeState(), root)

    expect(trace.id).toBeTruthy()
    expect(trace.taskId).toBe('task-abc')
    expect(trace.status).toBe('completed')
    expect(trace.totalIterations).toBe(1)
    expect(trace.totalTokens).toBe(500)
    expect(existsSync(join(root, '.kova', 'traces'))).toBe(true)
  })

  it('deve calcular totalDurationMs a partir de startedAt', () => {
    const root = setup()
    const trace = recordTrace(makeState(), root)
    expect(trace.totalDurationMs).toBeGreaterThan(1000)
    expect(trace.totalDurationMs).toBeLessThan(10_000)
  })

  it('deve extrair finalScore e finalDecision da última iteração', () => {
    const root = setup()
    const state = makeState({
      iterationHistory: [makeIteration(1), {
        ...makeIteration(2),
        harnessResult: makeHarnessResult(72),
        decision: makeDecision('suggest'),
      }],
      currentIteration: 2,
    })
    const trace = recordTrace(state, root)

    expect(trace.finalScore).toBe(72)
    expect(trace.finalDecision).toBe('suggest')
  })

  it('deve gerar errorFingerprint "clean" quando não há erros', () => {
    const root = setup()
    const trace = recordTrace(makeState(), root)
    expect(trace.errorFingerprint).toBe('clean')
  })

  it('deve gerar errorFingerprint não-vazio quando há erros', () => {
    const root = setup()
    const iter = makeIteration(1)
    iter.harnessResult.layers[0].errors = [{
      layer: 'build', type: 'syntax', severity: 'high', fixable: false,
      message: 'error', humanMessage: 'error', file: 'src/app.ts', line: 10, rule: 'TS2345',
    }]
    const state = makeState({ iterationHistory: [iter] })
    const trace = recordTrace(state, root)

    expect(trace.errorFingerprint).not.toBe('clean')
    expect(trace.errorFingerprint.length).toBeGreaterThan(0)
  })

  it('deve gerar fingerprints idênticos para os mesmos erros', () => {
    const root = setup()
    const makeErrorIter = () => {
      const iter = makeIteration(1)
      iter.harnessResult.layers[0].errors = [{
        layer: 'build', type: 'syntax', severity: 'high', fixable: false,
        message: 'err', humanMessage: 'err', file: 'src/a.ts', line: 5, rule: 'TS2304',
      }]
      return iter
    }
    const t1 = recordTrace(makeState({ iterationHistory: [makeErrorIter()] }), root)
    const t2 = recordTrace(makeState({ iterationHistory: [makeErrorIter()] }), root)
    expect(t1.errorFingerprint).toBe(t2.errorFingerprint)
  })
})

describe('queryTraces', () => {
  it('deve retornar array vazio quando não há traces', () => {
    const root = setup()
    expect(queryTraces(root)).toHaveLength(0)
  })

  it('deve retornar traces salvos em ordem decrescente de timestamp', () => {
    const root = setup()
    recordTrace(makeState({ taskId: 'a' }), root)
    recordTrace(makeState({ taskId: 'b' }), root)
    const results = queryTraces(root)
    expect(results).toHaveLength(2)
    // Mais recente primeiro
    expect(results[0].timestamp >= results[1].timestamp).toBe(true)
  })

  it('deve filtrar por status', () => {
    const root = setup()
    recordTrace(makeState({ status: 'completed' }), root)
    recordTrace(makeState({ status: 'failed' }), root)

    expect(queryTraces(root, { status: 'completed' })).toHaveLength(1)
    expect(queryTraces(root, { status: 'failed' })).toHaveLength(1)
  })

  it('deve filtrar por finalDecision', () => {
    const root = setup()
    recordTrace(makeState(), root) // auto_apply
    const rejectedIter = makeIteration(1)
    rejectedIter.decision = makeDecision('reject')
    recordTrace(makeState({ iterationHistory: [rejectedIter] }), root)

    expect(queryTraces(root, { finalDecision: 'auto_apply' })).toHaveLength(1)
    expect(queryTraces(root, { finalDecision: 'reject' })).toHaveLength(1)
  })

  it('deve filtrar por taskId', () => {
    const root = setup()
    recordTrace(makeState({ taskId: 'task-1' }), root)
    recordTrace(makeState({ taskId: 'task-2' }), root)

    expect(queryTraces(root, { taskId: 'task-1' })).toHaveLength(1)
  })
})
