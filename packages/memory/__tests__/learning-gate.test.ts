import { describe, it, expect } from 'vitest'
import { classifyLearning } from '../src/learning-gate'
import type { LearningCandidate, HarnessResult, LayerResult } from '@kova/shared'

const baseCandidate: LearningCandidate = {
  description: 'use early returns to reduce nesting',
  type: 'pattern',
  scope: 'project',
  tags: ['refactoring', 'functions'],
  evidence: [
    {
      taskId: 'task-1',
      harnessLayer: 'rules',
      file: 'src/func.ts',
      diffSnippet: '- if (x) { return true }\n+ return x',
      outcome: 'approved',
      timestamp: new Date().toISOString(),
    }
  ],
  stack: 'typescript'
}

function createHarnessResult(passed: boolean, layersRun: string[] = ['build', 'tests']): HarnessResult {
  return {
    passed,
    score: passed ? 100 : 50,
    duration: 100,
    iteration: 1,
    layers: layersRun.map(name => ({
      name,
      passed,
      skipped: false,
      duration: 10,
      errors: [],
      warnings: []
    } as LayerResult))
  }
}

describe('Learning Gate - classifyLearning', () => {
  it('classifies as safe_lesson when harness fully passes with tests', () => {
    const result = classifyLearning(baseCandidate, createHarnessResult(true))
    expect(result.classification).toBe('safe_lesson')
    expect(result.approved).toBe(true)
  })

  it('classifies as needs_review when harness passes but without tests', () => {
    const result = classifyLearning(baseCandidate, createHarnessResult(true, ['build']))
    expect(result.classification).toBe('needs_review')
    expect(result.approved).toBe(false)
    expect(result.reason).toContain('test coverage')
  })

  it('classifies as temporary_workaround when description mentions hack/fixme', () => {
    const hackCandidate = { ...baseCandidate, description: 'hack: disable rule temporarily' }
    const result = classifyLearning(hackCandidate, createHarnessResult(true))
    expect(result.classification).toBe('temporary_workaround')
    expect(result.approved).toBe(false)
  })

  it('classifies as local_exception and adjusts scope when global is requested but evidence is sparse', () => {
    const globalCandidate = { ...baseCandidate, scope: 'global' as const }
    const result = classifyLearning(globalCandidate, createHarnessResult(true))
    expect(result.classification).toBe('local_exception')
    expect(result.approved).toBe(true)
    expect(result.adjustedCandidate?.scope).toBe('project')
  })

  it('classifies as rejected_learning when harness failed', () => {
    const result = classifyLearning(baseCandidate, createHarnessResult(false))
    expect(result.classification).toBe('rejected_learning')
    expect(result.approved).toBe(false)
  })

  it('classifies as rejected_learning when candidate has no evidence', () => {
    const noEvidenceCandidate = { ...baseCandidate, evidence: [] }
    const result = classifyLearning(noEvidenceCandidate, createHarnessResult(true))
    expect(result.classification).toBe('rejected_learning')
    expect(result.approved).toBe(false)
  })

  it('rejects gambiarra/workaround regardless of harness result', () => {
    const hackCandidate = { ...baseCandidate, description: 'gambiarra: skip validation temporarily' }
    const result = classifyLearning(hackCandidate, createHarnessResult(true))
    expect(result.classification).toBe('temporary_workaround')
    expect(result.approved).toBe(false)
  })

  it('sets invalidationRule when description has temporal condition', () => {
    const temporal = { ...baseCandidate, description: 'use X until the API is stable' }
    const result = classifyLearning(temporal, createHarnessResult(true))
    expect(result.approved).toBe(true)
    expect(result.invalidationRule).toBeTruthy()
  })

  it('no invalidationRule when description has no temporal condition', () => {
    const result = classifyLearning(baseCandidate, createHarnessResult(true))
    expect(result.approved).toBe(true)
    expect(result.invalidationRule).toBeUndefined()
  })
})
