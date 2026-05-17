/**
 * Pure create-mode decision tests.
 *
 * Rule: pure-create patches may still be reviewable, but the decision layer
 * must not auto-apply them without completion proof and real validation. The
 * execution layer now owns completion proof; decide() preserves honest
 * suggest/reject outcomes instead of lifting weak evidence to auto_apply.
 */
import { describe, it, expect } from 'vitest'
import { decide } from '../src/decision-engine'
import type { FileChange, HarnessResult, LayerResult } from '@kova/shared'

function emptyHarness(confidence: 'none' | 'partial' | 'full' = 'none'): HarnessResult {
  return { passed: false, score: 0, layers: [], duration: 0, iteration: 1, validationConfidence: confidence }
}

function create(path: string, content = 'hello'): FileChange {
  return { path, type: 'create', diff: content }
}

function modify(path: string): FileChange {
  return { path, type: 'modify', diff: 'after', before: 'before' }
}

describe('decide — pure create-mode requires proof before auto_apply', () => {
  it('returns suggest when every change is brand-new but validation is none', () => {
    const changes: FileChange[] = [create('src/index.html'), create('src/styles.css'), create('src/app.js')]
    const d = decide(emptyHarness('none'), [], { changes })
    expect(d.decision).toBe('suggest')
    expect(d.score).toBeLessThan(90)
  })

  it('returns suggest with partial validation even when every change is new', () => {
    const passedBuild: LayerResult = { name: 'build', passed: true, errors: [], warnings: [], duration: 10, skipped: false }
    const r: HarnessResult = {
      passed: true, score: 100, layers: [passedBuild], duration: 30, iteration: 1, validationConfidence: 'partial',
    }
    const d = decide(r, [], { changes: [create('src/new.ts')] })
    expect(d.decision).toBe('suggest')
  })

  it('does NOT lift the cap when any change modifies an existing file', () => {
    const changes: FileChange[] = [create('src/new.ts'), modify('src/existing.ts')]
    const d = decide(emptyHarness('none'), [], { changes })
    expect(d.decision).toBe('suggest')
  })

  it('does NOT lift the cap when a create has a `before` (means file existed)', () => {
    const changes: FileChange[] = [{ path: 'src/x.ts', type: 'create', diff: 'new', before: 'old' }]
    const d = decide(emptyHarness('none'), [], { changes })
    expect(d.decision).toBe('suggest')
  })

  it('does NOT lift the cap when security has a critical error', () => {
    const securityFail: LayerResult = {
      name: 'security', passed: false,
      errors: [{ layer: 'security', type: 'security', severity: 'critical', fixable: false, message: 'secret', humanMessage: 'secret', file: 'src/new.ts' }],
      warnings: [], duration: 5, skipped: false,
    }
    const r: HarnessResult = {
      passed: false, score: 0, layers: [securityFail], duration: 10, iteration: 1, validationConfidence: 'none',
    }
    const d = decide(r, [], { changes: [create('src/new.ts')] })
    // Critical security still triggers hard fail → score 0 → reject
    expect(d.decision).toBe('reject')
  })

  it('does NOT lift the cap when an explicitly required file is missing', () => {
    const rulesFail: LayerResult = {
      name: 'rules',
      passed: false,
      errors: [{
        layer: 'rules',
        type: 'architecture',
        severity: 'high',
        fixable: true,
        message: 'Required file was not produced: package.json',
        humanMessage: 'O pedido exigia package.json, mas o agente nao produziu esse arquivo.',
        file: 'package.json',
        rule: 'missing_required_path',
      }],
      warnings: [],
      duration: 0,
      skipped: false,
    }
    const r: HarnessResult = {
      passed: false,
      score: 0,
      layers: [rulesFail],
      duration: 0,
      iteration: 1,
      validationConfidence: 'partial',
    }

    const d = decide(r, [], { changes: [create('index.html'), create('css/style.css'), create('js/main.js')] })

    expect(d.decision).toBe('reject')
    expect(d.reason).toContain('Contract violation')
  })

  it('does NOT lift the cap when no changes were provided', () => {
    const d = decide(emptyHarness('none'), [], { changes: [] })
    expect(d.decision).toBe('suggest')
  })

  it('does NOT lift the cap when changes context is omitted', () => {
    const d = decide(emptyHarness('none'), [])
    expect(d.decision).toBe('suggest')
  })
})
