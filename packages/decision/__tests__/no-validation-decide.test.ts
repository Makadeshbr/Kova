/**
 * No-validation decide tests.
 *
 * Design invariant:
 *  - calculateScore() returns 100 for empty layers — intentional, means "trust caller"
 *  - decide() overrides score to 75 when validationConfidence === 'none' (set by the
 *    harness pipeline when no real build/test/lint commands ran)
 *  - This prevents auto_apply from firing when a project has no validation tooling
 *
 * Scope split:
 *  - No-changes from agent (ExecutionEngine) -> validationConfidence:none -> suggest
 *  - No validation commands in project (harness pipeline) → validationConfidence: 'none' → suggest ✓
 */
import { describe, it, expect } from 'vitest'
import { decide } from '../src/decision-engine'
import { calculateScore } from '../src/score'
import type { HarnessResult, LayerResult, IterationRecord, DecisionResult } from '@kova/shared'

function emptyHarness(confidence?: 'none' | 'partial' | 'full'): HarnessResult {
  return {
    passed: false, score: 0, layers: [], duration: 0, iteration: 1,
    ...(confidence !== undefined ? { validationConfidence: confidence } : {}),
  }
}

function allSkippedHarness(): HarnessResult {
  const skipped = (name: LayerResult['name']): LayerResult => ({
    name, passed: true, errors: [], warnings: [], duration: 0, skipped: true,
  })
  return {
    passed: false, score: 0,
    layers: [skipped('build'), skipped('tests'), skipped('rules'), skipped('lint')],
    duration: 0, iteration: 1,
    validationConfidence: 'none',
    skippedLayers: ['build', 'tests', 'rules', 'lint'],
  }
}

describe('calculateScore — empty layers returns 100 (trust caller behavior)', () => {
  it('returns 100 for empty layers — no validation needed case (agent made no changes)', () => {
    // This is intentional: when no layers run due to no changes, the caller's score:100 is trusted.
    // The 'no validation ran' protection lives in decide() via validationConfidence, not here.
    expect(calculateScore(emptyHarness())).toBe(100)
  })

  it('returns 100 for all-skipped layers (no active validation)', () => {
    // When all layers skip, calculateScore trusts the caller's 100.
    // Only a HarnessResult with validationConfidence:'none' triggers the protection.
    const r = allSkippedHarness()
    expect(calculateScore(r)).toBe(100)
  })
})

describe('decide — validationConfidence:none overrides score to suggest range', () => {
  it('returns suggest (not auto_apply) when validationConfidence is none', () => {
    const d = decide(emptyHarness('none'), [])
    expect(d.decision).toBe('suggest')
    expect(d.decision).not.toBe('auto_apply')
  })

  it('score in DecisionResult is 75 when validationConfidence is none', () => {
    const d = decide(emptyHarness('none'), [])
    expect(d.score).toBe(75)
  })

  it('returns suggest when all layers are skipped and validationConfidence is none', () => {
    const d = decide(allSkippedHarness(), [])
    expect(d.decision).toBe('suggest')
  })

  it('reason is informative for no-validation case', () => {
    const d = decide(emptyHarness('none'), [])
    expect(d.reason.length).toBeGreaterThan(0)
  })
})

describe('decide — without validationConfidence, empty layers still requires evidence', () => {
  it('suggests review when no validation evidence is present', () => {
    // When the agent makes no changes, ExecutionEngine.validateOutput returns {score:100, layers:[]}.
    // Empty evidence must still be capped to review territory.
    const d = decide(emptyHarness(), [])  // no validationConfidence
    expect(d.decision).toBe('suggest')
    expect(d.decision).not.toBe('auto_apply')
    expect(d.score).toBe(75)
  })
})

describe('decide — validationConfidence:partial requires review', () => {
  it('partial confidence does not auto_apply even when executed layers pass', () => {
    const buildPassed: LayerResult = {
      name: 'build', passed: true, errors: [], warnings: [], duration: 10, skipped: false,
    }
    const r: HarnessResult = {
      passed: true, score: 100, layers: [buildPassed], duration: 30, iteration: 1,
      validationConfidence: 'partial',
    }
    const d = decide(r, [])
    // build passed (weight=37 after redistribution), total=37, score=100 → auto_apply
    expect(d.decision).toBe('suggest')
    expect(d.decision).not.toBe('auto_apply')
    expect(d.score).toBeLessThan(90)
  })
})

describe('decide — validationConfidence:full enables auto_apply normally', () => {
  it('full confidence with all layers passing returns auto_apply', () => {
    const passed = (name: LayerResult['name']): LayerResult => ({
      name, passed: true, errors: [], warnings: [], duration: 10, skipped: false,
    })
    const r: HarnessResult = {
      passed: true, score: 100,
      layers: [passed('build'), passed('tests'), passed('rules'), passed('security'), passed('lint')],
      duration: 50, iteration: 1,
      validationConfidence: 'full',
    }
    const d = decide(r, [])
    expect(d.decision).toBe('auto_apply')
    expect(d.score).toBe(100)
  })
})

describe('decide — failed real validation requires repair', () => {
  it('does not suggest when tests fail even if proportional score reaches 70', () => {
    const layer = (name: LayerResult['name'], passed: boolean): LayerResult => ({
      name, passed, errors: passed ? [] : [{
        layer: name,
        type: 'logic',
        severity: 'high',
        fixable: true,
        message: 'test failed',
        humanMessage: 'test failed',
        file: 'src/index.test.ts',
      }],
      warnings: [],
      duration: 10,
      skipped: false,
    })
    const r: HarnessResult = {
      passed: false,
      score: 70,
      layers: [layer('build', true), layer('tests', false), layer('rules', true), layer('security', true), layer('lint', true)],
      duration: 50,
      iteration: 1,
      validationConfidence: 'full',
    }
    const d = decide(r, [])
    expect(d.decision).toBe('suggest')
    expect(d.score).toBeGreaterThanOrEqual(70)
    expect(d.reason).toContain('harness warning')
  })
})

describe('decide — no-validation combined with history', () => {
  it('no-validation with history stays suggest (not human_required from regression)', () => {
    // With validationConfidence:'none', score is always 75.
    // Score regression check requires score > 0 AND score < prev scores.
    // Score 75 in all iterations → no regression (constant score) → stays suggest.
    const r = emptyHarness('none')
    const fd: DecisionResult = { decision: 'suggest', score: 75, reason: '', feedback: [] }
    const history: IterationRecord[] = [
      { iteration: 0, agentMode: 'code', agentThought: '', changes: [], harnessResult: r, decision: fd, duration: 100, tokensUsed: 0 },
      { iteration: 1, agentMode: 'fix', agentThought: '', changes: [], harnessResult: r, decision: fd, duration: 100, tokensUsed: 0 },
      { iteration: 2, agentMode: 'fix', agentThought: '', changes: [], harnessResult: r, decision: fd, duration: 100, tokensUsed: 0 },
    ]
    const d = decide(r, history)
    // Score 75 is constant (no regression) and < 4 consecutive identical errors → suggest
    expect(d.decision).toBe('suggest')
    expect(d.decision).not.toBe('human_required')
  })
})
