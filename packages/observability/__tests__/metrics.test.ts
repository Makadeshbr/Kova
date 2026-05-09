import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { ExecutionTrace, TraceFilters } from '../src/tracer'
import { getMetrics, updateMetrics } from '../src/metrics'

let tmpDir = ''

function setup(): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-metrics-'))
  return tmpDir
}

afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
  tmpDir = ''
})

function makeTrace(overrides: Partial<ExecutionTrace> = {}): ExecutionTrace {
  return {
    id: Math.random().toString(36).slice(2),
    taskId: 'task-1', timestamp: new Date().toISOString(),
    status: 'completed', totalIterations: 1,
    totalDurationMs: 2000, totalTokens: 500,
    finalScore: 95, finalDecision: 'auto_apply',
    errorFingerprint: 'clean', iterations: [],
    ...overrides,
  }
}

function makeRejectedTrace(reason: string): ExecutionTrace {
  return makeTrace({
    finalDecision: 'reject', finalScore: 40, status: 'failed',
    iterations: [{
      iteration: 1, agentMode: 'code', agentThought: '',
      changes: [],
      harnessResult: { passed: false, score: 40, layers: [], duration: 100, iteration: 1 },
      decision: { decision: 'reject', score: 40, reason, feedback: [] },
      duration: 1000, tokensUsed: 400,
    }],
  })
}

describe('getMetrics', () => {
  it('deve retornar zeros quando não há dados', () => {
    const root = setup()
    const m = getMetrics(root)
    expect(m.totalRuns).toBe(0)
    expect(m.firstPassRate).toBe(0)
    expect(m.avgIterations).toBe(0)
    expect(m.topRejectionReasons).toHaveLength(0)
  })
})

describe('updateMetrics', () => {
  it('deve incrementar totalRuns a cada trace', () => {
    const root = setup()
    updateMetrics(makeTrace(), root)
    updateMetrics(makeTrace(), root)
    expect(getMetrics(root).totalRuns).toBe(2)
  })

  it('deve calcular firstPassRate corretamente', () => {
    const root = setup()
    updateMetrics(makeTrace({ totalIterations: 1, finalDecision: 'auto_apply' }), root)
    updateMetrics(makeTrace({ totalIterations: 1, finalDecision: 'auto_apply' }), root)
    updateMetrics(makeTrace({ totalIterations: 3, finalDecision: 'reject' }), root)

    const m = getMetrics(root)
    expect(m.totalRuns).toBe(3)
    expect(m.firstPassRate).toBe(66.7)
  })

  it('deve calcular avgIterations corretamente', () => {
    const root = setup()
    updateMetrics(makeTrace({ totalIterations: 1 }), root)
    updateMetrics(makeTrace({ totalIterations: 3 }), root)

    expect(getMetrics(root).avgIterations).toBe(2)
  })

  it('deve calcular avgDurationMs corretamente', () => {
    const root = setup()
    updateMetrics(makeTrace({ totalDurationMs: 1000 }), root)
    updateMetrics(makeTrace({ totalDurationMs: 3000 }), root)

    expect(getMetrics(root).avgDurationMs).toBe(2000)
  })

  it('deve calcular avgTokens corretamente', () => {
    const root = setup()
    updateMetrics(makeTrace({ totalTokens: 400 }), root)
    updateMetrics(makeTrace({ totalTokens: 600 }), root)

    expect(getMetrics(root).avgTokens).toBe(500)
  })

  it('deve agregar topRejectionReasons por frequência', () => {
    const root = setup()
    updateMetrics(makeRejectedTrace('Build falhou'), root)
    updateMetrics(makeRejectedTrace('Build falhou'), root)
    updateMetrics(makeRejectedTrace('Build falhou'), root)
    updateMetrics(makeRejectedTrace('Score baixo'), root)

    const m = getMetrics(root)
    expect(m.topRejectionReasons[0].reason).toBe('Build falhou')
    expect(m.topRejectionReasons[0].count).toBe(3)
    expect(m.topRejectionReasons[1].reason).toBe('Score baixo')
    expect(m.topRejectionReasons[1].count).toBe(1)
  })

  it('deve persistir métricas no disco', () => {
    const root = setup()
    updateMetrics(makeTrace(), root)

    const mem2 = getMetrics(root)
    expect(mem2.totalRuns).toBe(1)
    expect(existsSync(join(root, '.kova', 'metrics.json'))).toBe(true)
  })

  it('deve incluir suggest no firstPassCount', () => {
    const root = setup()
    updateMetrics(makeTrace({ totalIterations: 1, finalDecision: 'suggest' }), root)
    expect(getMetrics(root).firstPassRate).toBe(100)
  })
})
