import { describe, it, expect, vi } from 'vitest'
import type { LayerResult } from '@kova/shared'
import { runPipeline } from '../src/pipeline'
import type { LayerDef } from '../src/pipeline'

function passedLayer(name: LayerResult['name']): LayerDef {
  return {
    name,
    hardFail: name === 'build',
    run: vi.fn().mockResolvedValue({
      name, passed: true, errors: [], warnings: [], duration: 5, skipped: false,
    } satisfies LayerResult),
  }
}

function skippedLayer(name: LayerResult['name']): LayerDef {
  return {
    name,
    hardFail: false,
    run: vi.fn().mockResolvedValue({
      name, passed: true, errors: [], warnings: [], duration: 0, skipped: true,
    } satisfies LayerResult),
  }
}

const cfg = { projectRoot: '/tmp', iteration: 1 }

describe('runPipeline — validationConfidence', () => {
  it('returns none when no layers are provided', async () => {
    const result = await runPipeline([], cfg)
    expect(result.validationConfidence).toBe('none')
  })

  it('returns none when all layers are skipped', async () => {
    const result = await runPipeline([skippedLayer('build'), skippedLayer('tests')], cfg)
    expect(result.validationConfidence).toBe('none')
  })

  it('returns partial when only rules ran (no build or tests)', async () => {
    const result = await runPipeline([passedLayer('rules')], cfg)
    expect(result.validationConfidence).toBe('partial')
  })

  it('returns partial when only lint ran', async () => {
    const result = await runPipeline([passedLayer('lint')], cfg)
    expect(result.validationConfidence).toBe('partial')
  })

  it('returns partial when rules + lint ran (fast mode) — no build/tests', async () => {
    const result = await runPipeline([passedLayer('rules'), passedLayer('lint')], cfg)
    expect(result.validationConfidence).toBe('partial')
  })

  it('returns partial when only build ran (no tests)', async () => {
    const result = await runPipeline([passedLayer('build')], cfg)
    expect(result.validationConfidence).toBe('partial')
  })

  it('returns full when build + tests both ran', async () => {
    const result = await runPipeline([passedLayer('build'), passedLayer('tests')], cfg)
    expect(result.validationConfidence).toBe('full')
  })

  it('returns full when build + tests ran with additional layers (full mode)', async () => {
    const result = await runPipeline([
      passedLayer('build'), passedLayer('tests'), passedLayer('rules'),
      passedLayer('security'), passedLayer('lint'),
    ], cfg)
    expect(result.validationConfidence).toBe('full')
  })

  it('returns partial when build ran but tests was skipped', async () => {
    const result = await runPipeline([passedLayer('build'), skippedLayer('tests')], cfg)
    expect(result.validationConfidence).toBe('partial')
    expect(result.skippedLayers).toContain('tests')
  })
})

describe('runPipeline — skippedLayers metadata', () => {
  it('skippedLayers is undefined when nothing was skipped', async () => {
    const result = await runPipeline([passedLayer('build'), passedLayer('tests')], cfg)
    expect(result.skippedLayers).toBeUndefined()
  })

  it('skippedLayers lists all skipped layer names', async () => {
    const result = await runPipeline([
      passedLayer('build'), skippedLayer('tests'), skippedLayer('lint'),
    ], cfg)
    expect(result.skippedLayers).toEqual(expect.arrayContaining(['tests', 'lint']))
    expect(result.skippedLayers).toHaveLength(2)
  })
})

describe('runPipeline — no-validation synthetic layer', () => {
  it('inserts synthetic rules warning when no layers run', async () => {
    const result = await runPipeline([], cfg)
    // A synthetic rules layer is injected as a user-visible warning
    const syntheticRule = result.layers.find(l => l.name === 'rules')
    expect(syntheticRule).toBeDefined()
    expect(syntheticRule?.warnings.length).toBeGreaterThan(0)
  })

  it('score is 75 (suggest threshold) when no real layers ran', async () => {
    const result = await runPipeline([], cfg)
    // 75 triggers 'suggest' in decide() — never auto_apply for unvalidated code
    expect(result.score).toBe(75)
  })
})
