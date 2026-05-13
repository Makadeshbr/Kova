import { describe, it, expect } from 'vitest'
import { calculateScore } from '../src/score'
import type { HarnessResult, LayerResult } from '@kova/shared'

function layer(name: LayerResult['name'], passed: boolean, critical = false): LayerResult {
  return {
    name,
    passed,
    errors: passed ? [] : [{
      layer: name,
      type: 'syntax',
      severity: critical ? 'critical' : 'high',
      fixable: false,
      message: 'error',
      humanMessage: 'error',
      file: 'file.ts',
    }],
    warnings: [],
    duration: 10,
    skipped: false,
  }
}

function result(layers: LayerResult[]): HarnessResult {
  return { passed: layers.every(l => l.passed), score: 0, layers, duration: 100, iteration: 1 }
}

describe('calculateScore — hard fails', () => {
  it('usa Evidence Score do harness quando disponivel', () => {
    const r: HarnessResult = {
      passed: true,
      score: 100,
      layers: [layer('build', true), layer('tests', true)],
      duration: 100,
      iteration: 1,
      evidenceScore: {
        score: 82,
        validationConfidence: 'partial',
        validation: {
          executedLayers: ['build', 'tests'],
          passedLayers: ['build', 'tests'],
          failedLayers: [],
          skippedLayers: [],
          totalWeight: 50,
          passedWeight: 50,
        },
        risk: {
          filesChanged: 1,
          changedLines: 20,
          patchSize: 'small',
          riskLevel: 'low',
          penalty: 0,
          reasons: [],
        },
        completeness: {
          hasCompilationCheck: true,
          hasTestEvidence: true,
          hasSecurityEvidence: false,
          partial: true,
          penalty: 3,
          reasons: ['sem camada security executada'],
        },
        blockers: [],
        notes: ['validationConfidence=partial'],
      },
    }

    expect(calculateScore(r)).toBe(82)
  })

  it('deve retornar 0 quando build falha', () => {
    const r = result([layer('build', false), layer('tests', true), layer('lint', true)])
    expect(calculateScore(r)).toBe(0)
  })

  it('nao deve zerar quando lint falha sem hard fail', () => {
    const r = result([layer('build', true), layer('tests', true), layer('lint', false)])
    expect(calculateScore(r)).toBeGreaterThan(0)
  })

  it('deve retornar 0 quando security tem erro crítico', () => {
    const r = result([layer('build', true), layer('security', false, true)])
    expect(calculateScore(r)).toBe(0)
  })

  it('não deve zerar quando security falha sem crítico', () => {
    const r = result([layer('build', true), layer('security', false, false)])
    expect(calculateScore(r)).toBeGreaterThan(0)
  })
})

describe('calculateScore — pontuação proporcional', () => {
  it('deve retornar 100 quando todas as 5 camadas passam', () => {
    const r = result([
      layer('build', true), layer('tests', true), layer('rules', true),
      layer('security', true), layer('lint', true),
    ])
    expect(calculateScore(r)).toBe(100)
  })

  it('deve calcular score proporcional quando tests falha', () => {
    // build(25) + rules(25) + security(10) + lint(10) = 70 / total(100) = 70
    const r = result([
      layer('build', true), layer('tests', false), layer('rules', true),
      layer('security', true), layer('lint', true),
    ])
    expect(calculateScore(r)).toBe(70)
  })

  it('deve escalar para 100 quando apenas 3 camadas rodam (STANDARD)', () => {
    // build(25) + tests(30) + rules(25) = 80 / 80 = 100
    const r = result([layer('build', true), layer('tests', true), layer('rules', true)])
    expect(calculateScore(r)).toBe(100)
  })

  it('deve retornar 100 para resultado sem layers (confia no caller)', () => {
    // Empty layers = no validation needed (e.g. no changes). The 'no validation
    // ran' protection lives in pipeline.ts, not in calculateScore.
    const r = result([])
    expect(calculateScore(r)).toBe(100)
  })
})
