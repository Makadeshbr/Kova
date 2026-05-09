import { describe, it, expect } from 'vitest'
import { buildFeedback } from '../src/feedback'
import type { HarnessResult, LayerResult, HarnessError } from '@kova/shared'

function makeError(layer: string, msg: string, severity: HarnessError['severity'] = 'high'): HarnessError {
  return { layer, type: 'syntax', severity, fixable: false, message: msg, humanMessage: msg, file: 'src/file.ts', line: 10 }
}

function failedLayer(name: LayerResult['name'], errors: HarnessError[]): LayerResult {
  return { name, passed: false, errors, warnings: [], duration: 10, skipped: false }
}

function passedLayer(name: LayerResult['name']): LayerResult {
  return { name, passed: true, errors: [], warnings: [], duration: 10, skipped: false }
}

function result(layers: LayerResult[]): HarnessResult {
  return { passed: false, score: 0, layers, duration: 100, iteration: 1 }
}

describe('buildFeedback', () => {
  it('deve retornar array vazio quando tudo passa', () => {
    const r = result([passedLayer('build'), passedLayer('lint')])
    expect(buildFeedback(r)).toHaveLength(0)
  })

  it('deve gerar feedback para erro de build', () => {
    const r = result([failedLayer('build', [makeError('build', "Type 'string' is not assignable")])])
    const fb = buildFeedback(r)
    expect(fb).toHaveLength(1)
    expect(fb[0].instruction).toContain('Corrija o erro de compilação')
    expect(fb[0].instruction).toContain('src/file.ts:10')
  })

  it('deve mencionar "CRÍTICO" para erro de security', () => {
    const r = result([failedLayer('security', [makeError('security', 'OpenAI API key detectado', 'critical')])])
    const fb = buildFeedback(r)
    expect(fb[0].instruction).toContain('CRÍTICO')
    expect(fb[0].instruction).toContain('variável de ambiente')
  })

  it('deve sugerir extração de sub-funções para complexidade', () => {
    const r = result([failedLayer('rules', [makeError('rules', 'Complexidade ciclomática 14 excede 10')])])
    const fb = buildFeedback(r)
    expect(fb[0].instruction).toContain('Extraia sub-funções')
    expect(fb[0].instruction).toContain('14')
  })

  it('deve sugerir early-return para nesting', () => {
    const r = result([failedLayer('rules', [makeError('rules', 'Nesting 3 excede 2')])])
    const fb = buildFeedback(r)
    expect(fb[0].instruction).toContain('early-return')
  })

  it('deve incluir contexto com arquivo, linha e severidade', () => {
    const r = result([failedLayer('lint', [makeError('lint', 'Missing semicolon')])])
    const fb = buildFeedback(r)
    expect(fb[0].context).toContain('src/file.ts')
    expect(fb[0].context).toContain('10')
    expect(fb[0].context).toContain('high')
  })

  it('deve gerar um feedback por erro', () => {
    const errors = [
      makeError('build', 'Error 1'),
      makeError('build', 'Error 2'),
      makeError('build', 'Error 3'),
    ]
    const r = result([failedLayer('build', errors)])
    expect(buildFeedback(r)).toHaveLength(3)
  })
})
