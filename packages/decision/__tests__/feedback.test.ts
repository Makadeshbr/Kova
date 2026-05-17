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
  it('returns an empty array when all layers pass', () => {
    const r = result([passedLayer('build'), passedLayer('lint')])
    expect(buildFeedback(r)).toHaveLength(0)
  })

  it('builds feedback for build errors', () => {
    const r = result([failedLayer('build', [makeError('build', "Type 'string' is not assignable")])])
    const fb = buildFeedback(r)
    expect(fb).toHaveLength(1)
    expect(fb[0].instruction).toContain('Fix the compilation error')
    expect(fb[0].instruction).toContain('src/file.ts:10')
  })

  it('marks security errors as critical', () => {
    const r = result([failedLayer('security', [makeError('security', 'OpenAI API key detected', 'critical')])])
    const fb = buildFeedback(r)
    expect(fb[0].instruction).toContain('CRITICAL')
    expect(fb[0].instruction).toContain('environment variable')
  })

  it('suggests extracting helper functions for complexity errors', () => {
    const r = result([failedLayer('rules', [makeError('rules', 'Complexidade ciclomatica 14 excede 10')])])
    const fb = buildFeedback(r)
    expect(fb[0].instruction).toContain('Extract helper functions')
    expect(fb[0].instruction).toContain('14')
  })

  it('suggests early returns for nesting errors', () => {
    const r = result([failedLayer('rules', [makeError('rules', 'Nesting 3 exceeds 2')])])
    const fb = buildFeedback(r)
    expect(fb[0].instruction).toContain('early returns')
  })

  it('includes context with file, line, and severity', () => {
    const r = result([failedLayer('lint', [makeError('lint', 'Missing semicolon')])])
    const fb = buildFeedback(r)
    expect(fb[0].context).toContain('src/file.ts')
    expect(fb[0].context).toContain('10')
    expect(fb[0].context).toContain('high')
  })

  it('builds one feedback item per error', () => {
    const errors = [
      makeError('build', 'Error 1'),
      makeError('build', 'Error 2'),
      makeError('build', 'Error 3'),
    ]
    const r = result([failedLayer('build', errors)])
    expect(buildFeedback(r)).toHaveLength(3)
  })
})
