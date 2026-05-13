import { describe, expect, it } from 'vitest'
import { decide } from '../src/decision-engine'
import type { DecisionResult, HarnessResult, IterationRecord, LayerResult } from '@kova/shared'

function layer(name: LayerResult['name'], passed: boolean, critical = false, file = 'src/file.ts'): LayerResult {
  return {
    name,
    passed,
    errors: passed ? [] : [{
      layer: name,
      type: 'syntax',
      severity: critical ? 'critical' : 'high',
      fixable: false,
      message: `Error in ${name}`,
      humanMessage: `Error in ${name}`,
      file,
      line: 10,
      rule: `rule-${name}`,
    }],
    warnings: [],
    duration: 10,
    skipped: false,
  }
}

function result(layers: LayerResult[], score = 0): HarnessResult {
  return { passed: layers.every(l => l.passed), score, layers, duration: 100, iteration: 1 }
}

function historyEntry(r: HarnessResult, d: DecisionResult): IterationRecord {
  return { iteration: 1, agentMode: 'code', agentThought: '', changes: [], harnessResult: r, decision: d, duration: 100, tokensUsed: 1000 }
}

const emptyHistory: IterationRecord[] = []

describe('decide thresholds', () => {
  it('returns auto_apply when score >= 90', () => {
    const r = result([
      layer('build', true), layer('tests', true), layer('rules', true),
      layer('security', true), layer('lint', true),
    ])
    expect(decide(r, emptyHistory).decision).toBe('auto_apply')
  })

  it('returns suggest when Evidence Score is reviewable and validations passed', () => {
    const r = result([
      layer('build', true), layer('tests', true), layer('security', true),
    ])
    r.evidenceScore = {
      score: 82,
      validationConfidence: 'partial',
      validation: {
        executedLayers: ['build', 'tests', 'security'],
        passedLayers: ['build', 'tests', 'security'],
        failedLayers: [],
        skippedLayers: [],
        totalWeight: 65,
        passedWeight: 65,
      },
      risk: {
        filesChanged: 2,
        changedLines: 80,
        patchSize: 'small',
        riskLevel: 'low',
        penalty: 0,
        reasons: [],
      },
      completeness: {
        hasCompilationCheck: true,
        hasTestEvidence: true,
        hasSecurityEvidence: true,
        partial: true,
        penalty: 8,
        reasons: ['validacao parcial'],
      },
      blockers: [],
      notes: ['validationConfidence=partial'],
    }

    const d = decide(r, emptyHistory)
    expect(d.decision).toBe('suggest')
    expect(d.score).toBe(82)
  })

  it('rejects failed tests even when proportional score would be reviewable', () => {
    const r = result([
      layer('build', true), layer('tests', false), layer('rules', true),
      layer('security', true), layer('lint', true),
    ])
    const d = decide(r, emptyHistory)
    expect(d.decision).toBe('reject')
    expect(d.score).toBeLessThanOrEqual(55)
    expect(d.reason).toContain('repair loop')
  })

  it('returns reject when score < 70', () => {
    const r = result([
      layer('build', true), layer('tests', false), layer('rules', false),
      layer('security', true), layer('lint', true),
    ])
    expect(decide(r, emptyHistory).decision).toBe('reject')
  })

  it('returns reject with score 0 on build hard fail', () => {
    const r = result([layer('build', false), layer('lint', true)])
    const d = decide(r, emptyHistory)
    expect(d.decision).toBe('reject')
    expect(d.score).toBe(0)
    expect(d.reason).toContain('Build')
  })

  it('requires repair when lint fails', () => {
    const r = result([layer('build', true), layer('lint', false)])
    const d = decide(r, emptyHistory)
    expect(d.decision).toBe('reject')
    expect(d.score).toBeLessThanOrEqual(55)
    expect(d.reason).toContain('repair loop')
  })
})

describe('decide loop prevention', () => {
  it('returns human_required when the same error appears in 4 consecutive history entries', () => {
    const r = result([layer('build', false)])
    const fakeDecision: DecisionResult = { decision: 'reject', score: 0, reason: '', feedback: [] }
    const history = [
      historyEntry(r, fakeDecision),
      historyEntry(r, fakeDecision),
      historyEntry(r, fakeDecision),
      historyEntry(r, fakeDecision),
    ]

    const d = decide(r, history)
    expect(d.decision).toBe('human_required')
    expect(d.reason).toContain('repeated')
  })

  it('does not trigger repeated-error prevention with one prior occurrence', () => {
    const r = result([layer('build', false)])
    const fakeDecision: DecisionResult = { decision: 'reject', score: 0, reason: '', feedback: [] }
    const history = [historyEntry(r, fakeDecision)]

    const d = decide(r, history)
    expect(d.decision).not.toBe('human_required')
  })

  it('does not trigger repeated-error prevention when errors differ', () => {
    const r1 = result([layer('build', false, false, 'src/a.ts')])
    const r2 = result([layer('lint', false, false, 'src/b.ts')])
    const fakeDecision: DecisionResult = { decision: 'reject', score: 0, reason: '', feedback: [] }
    const history = [historyEntry(r1, fakeDecision), historyEntry(r2, fakeDecision)]

    const d = decide(r1, history)
    expect(d.decision).not.toBe('human_required')
  })
})

describe('decide score regression fallback', () => {
  it('requests human review when score regresses across the recent history', () => {
    const high = result([
      layer('build', true), layer('tests', true), layer('rules', true),
      layer('security', true), layer('lint', true),
    ])
    const mid = result([
      layer('build', true), layer('tests', true), layer('rules', false),
      layer('security', true), layer('lint', true),
    ])
    const low = result([
      layer('build', true), layer('tests', false), layer('rules', true),
      layer('security', true), layer('lint', true),
    ])
    const current = result([
      layer('build', true), layer('tests', false), layer('rules', false),
      layer('security', true), layer('lint', true),
    ])
    const fakeDecision: DecisionResult = { decision: 'reject', score: 0, reason: '', feedback: [] }
    const history = [historyEntry(high, fakeDecision), historyEntry(mid, fakeDecision), historyEntry(low, fakeDecision)]

    const d = decide(current, history)
    expect(d.decision).toBe('human_required')
    expect(d.reason).toContain('regressed')
  })

  it('does not request regression fallback when score improves', () => {
    const low = result([
      layer('build', true), layer('tests', false), layer('rules', true),
      layer('security', true), layer('lint', true),
    ])
    const mid = result([
      layer('build', true), layer('tests', true), layer('rules', false),
      layer('security', true), layer('lint', true),
    ])
    const high = result([
      layer('build', true), layer('tests', true), layer('rules', true),
      layer('security', true), layer('lint', true),
    ])
    const fd: DecisionResult = { decision: 'reject', score: 0, reason: '', feedback: [] }
    const history = [historyEntry(low, fd), historyEntry(mid, fd)]

    const d = decide(high, history)
    expect(d.decision).toBe('auto_apply')
  })
})

describe('config error classification', () => {
  function buildLayer(name: 'build' | 'typecheck', command: string, stderr: string): LayerResult {
    return {
      name,
      passed: false,
      command,
      stderr,
      exitCode: 2,
      errors: [{
        layer: name,
        type: 'syntax',
        severity: 'high',
        fixable: false,
        message: stderr,
        humanMessage: stderr,
        file: '',
      }],
      warnings: [],
      duration: 50,
      skipped: false,
    }
  }

  it('first iteration of "no inputs were found" stays as reject (gives agent one chance)', () => {
    const r = result([
      buildLayer('build', 'tsc --noEmit', "error TS18003: No inputs were found in config file 'tsconfig.json'."),
    ])
    const d = decide(r, emptyHistory)
    expect(d.decision).toBe('reject')
  })

  it('repeated tsc misconfig escalates to human_required instead of looping', () => {
    const layerErr = buildLayer('build', 'tsc --noEmit', "error TS18003: No inputs were found in config file 'tsconfig.json'.")
    const r = result([layerErr])
    const fd: DecisionResult = { decision: 'reject', score: 0, reason: '', feedback: [] }
    const history = [historyEntry(result([layerErr]), fd)]

    const d = decide(r, history)
    expect(d.decision).toBe('human_required')
    expect(d.reason).toContain('misconfigured')
    expect(d.reason).toContain('tsc --noEmit')
  })

  it('"command not found" repeated also escalates', () => {
    const layerErr = buildLayer('build', 'tsx --test', '/bin/sh: tsx: command not found')
    const r = result([layerErr])
    const fd: DecisionResult = { decision: 'reject', score: 0, reason: '', feedback: [] }
    const history = [historyEntry(result([layerErr]), fd)]

    const d = decide(r, history)
    expect(d.decision).toBe('human_required')
    expect(d.reason).toContain('tsx --test')
  })

  it('real code error does NOT trigger config-error escalation', () => {
    const codeErr: LayerResult = {
      name: 'tests',
      passed: false,
      command: 'node --test',
      stderr: 'AssertionError [ERR_ASSERTION]: expected 5 to equal 6',
      exitCode: 1,
      errors: [{
        layer: 'tests', type: 'logic', severity: 'high', fixable: true,
        message: 'AssertionError', humanMessage: 'AssertionError', file: 'test/add.test.js',
      }],
      warnings: [], duration: 50, skipped: false,
    }
    const r = result([codeErr])
    const fd: DecisionResult = { decision: 'reject', score: 0, reason: '', feedback: [] }
    const history = [historyEntry(result([codeErr]), fd)]

    const d = decide(r, history)
    expect(d.decision).toBe('reject') // stays in repair loop, not human_required
  })

  it('config error after different command does NOT escalate (agent changed approach)', () => {
    const prevLayer = buildLayer('build', 'tsc --noEmit', 'No inputs were found')
    const currentLayer = buildLayer('build', 'node --check', 'SyntaxError: unexpected token')
    const fd: DecisionResult = { decision: 'reject', score: 0, reason: '', feedback: [] }
    const history = [historyEntry(result([prevLayer]), fd)]

    const d = decide(result([currentLayer]), history)
    expect(d.decision).toBe('reject') // different command, classified differently
  })
})
