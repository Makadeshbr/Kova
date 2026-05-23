import { describe, expect, it } from 'vitest'
import type { ExecutionState, HarnessResult, LayerResult } from '../src/renderer/src/types'
import { deriveProductStatus, layerStatusLabel, skippedReasonLabel } from '../src/renderer/src/lib/product-status'

function layer(overrides: Partial<LayerResult>): LayerResult {
  return {
    name: 'build',
    passed: true,
    errors: [],
    warnings: [],
    duration: 0,
    skipped: false,
    ...overrides,
  }
}

function harness(overrides: Partial<HarnessResult>): HarnessResult {
  return {
    passed: true,
    score: 75,
    layers: [],
    duration: 0,
    iteration: 1,
    validationConfidence: 'full',
    ...overrides,
  }
}

function state(status: ExecutionState['status'], result: HarnessResult, changes = 1): ExecutionState {
  return {
    taskId: 'task',
    status,
    currentIteration: 0,
    maxIterations: 1,
    totalTokens: 0,
    startedAt: '2026-05-23T00:00:00.000Z',
    iterationHistory: [{
      iteration: 0,
      agentMode: 'code',
      agentThought: '',
      changes: changes > 0 ? [{ path: 'index.html', type: 'create', diff: '+html' }] : [],
      harnessResult: result,
      decision: { decision: 'suggest', score: result.score, reason: 'review', feedback: [] },
      duration: 1,
      tokensUsed: 10,
      contextFiles: [],
    }],
  }
}

describe('deriveProductStatus', () => {
  it('maps changes plus only command_not_configured skips to completed_with_warnings', () => {
    const result = harness({
      passed: true,
      validationConfidence: 'none',
      layers: [
        layer({ name: 'build', skipped: true, skippedReason: 'command_not_configured' }),
        layer({ name: 'typecheck', skipped: true, skippedReason: 'command_not_configured' }),
      ],
    })

    const product = deriveProductStatus({ executionState: state('completed', result) })

    expect(product.status).toBe('completed_with_warnings')
    expect(product.title).toBe('Concluido com avisos')
  })

  it('maps security critical to blocked', () => {
    const result = harness({
      passed: false,
      score: 0,
      layers: [
        layer({
          name: 'security',
          passed: false,
          errors: [{ layer: 'security', type: 'security', severity: 'critical', fixable: false, message: 'secret', humanMessage: 'secret', file: '.env' }],
        }),
      ],
    })

    expect(deriveProductStatus({ executionState: state('failed', result) }).status).toBe('blocked')
  })

  it('maps no changes and no useful response to failed', () => {
    const result = harness({ passed: false, score: 0 })

    expect(deriveProductStatus({ executionState: state('failed', result, 0) }).status).toBe('failed')
  })
})

describe('product status copy helpers', () => {
  it('maps command_not_configured to product copy', () => {
    expect(skippedReasonLabel('command_not_configured')).toBe('Nao configurado')
    expect(layerStatusLabel(layer({ skipped: true, skippedReason: 'command_not_configured' }))).toBe('Nao configurado')
  })

  it('maps completion failure to evidence copy', () => {
    expect(layerStatusLabel(layer({ name: 'completion', passed: false }))).toBe('Evidencia incompleta')
  })
})
