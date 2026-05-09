import { describe, expect, it } from 'vitest'
import type { ExecutionContract, FileChange, HarnessResult } from '@kova/shared'
import { decide, runReviewGate } from '../src'

const cleanHarness: HarnessResult = {
  passed: true,
  score: 100,
  duration: 10,
  iteration: 1,
  layers: [{ name: 'build', passed: true, errors: [], warnings: [], duration: 1, skipped: false }],
}

const contract: ExecutionContract = {
  id: 'contract-1',
  taskId: 'task-1',
  objective: 'change app',
  stackAdapter: 'typescript',
  allowedPaths: ['src/**'],
  forbiddenPaths: ['dist/**', 'out/**', 'node_modules/**'],
  safeZones: ['.env', 'package.json'],
  allowedCommands: [],
  forbiddenCommands: [],
  validationCriteria: [],
  requiresTests: true,
  maxFilesChanged: 4,
  createdAt: '2026-01-01T00:00:00.000Z',
}

function change(path: string): FileChange {
  return { path, type: 'modify', diff: '+content', before: 'old' }
}

describe('runReviewGate', () => {
  it('blocks generated files', () => {
    const review = runReviewGate({ changes: [change('dist/index.js')], harnessResult: cleanHarness, contract })

    expect(review.passed).toBe(false)
    expect(review.findings[0].category).toBe('generated')
  })

  it('warns when behavior changes without tests', () => {
    const review = runReviewGate({ changes: [change('src/app.ts')], harnessResult: cleanHarness, contract })

    expect(review.passed).toBe(true)
    expect(review.findings.some(f => f.category === 'tests')).toBe(true)
  })
})

describe('decide with Review Gate', () => {
  it('does not auto-apply when Review Gate blocks the diff', () => {
    const decision = decide(cleanHarness, [], { changes: [change('package.json')], contract })

    expect(decision.decision).toBe('human_required')
    expect(decision.reviewGate?.passed).toBe(false)
  })
})
