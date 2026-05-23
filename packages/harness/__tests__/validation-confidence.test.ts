import { describe, it, expect, vi } from 'vitest'
import type { LayerResult } from '@kova/shared'
import { runPipeline } from '../src/pipeline'
import type { LayerDef } from '../src/pipeline'

function passedLayer(name: LayerResult['name']): LayerDef {
  return {
    name,
    hardFail: false,
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

  it('treats command_not_configured as skipped instead of a fatal failure', async () => {
    const result = await runPipeline([
      {
        ...skippedLayer('build'),
        run: vi.fn().mockResolvedValue({
          name: 'build',
          passed: true,
          errors: [],
          warnings: [],
          duration: 0,
          skipped: true,
          skippedReason: 'command_not_configured',
        } satisfies LayerResult),
      },
    ], cfg)

    expect(result.passed).toBe(true)
    expect(result.validationConfidence).toBe('none')
    expect(result.layers[0].status).toBe('skipped')
    expect(result.layers[0].skippedReason).toBe('command_not_configured')
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

describe('runPipeline - abort propagation', () => {
  it('throws AbortError before running the next layer when signal is aborted', async () => {
    const controller = new AbortController()
    const first = passedLayer('build')
    const second = passedLayer('tests')
    vi.mocked(first.run).mockImplementation(async () => {
      controller.abort()
      return {
        name: 'build',
        passed: true,
        errors: [],
        warnings: [],
        duration: 1,
        skipped: false,
      }
    })

    await expect(runPipeline([first, second], { ...cfg, signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' })
    expect(second.run).not.toHaveBeenCalled()
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

  it('score is capped low when no real layers ran', async () => {
    const result = await runPipeline([], cfg)
    expect(result.score).toBeLessThan(70)
    expect(result.evidenceScore?.validationConfidence).toBe('none')
  })
})

describe('runPipeline - Evidence Score', () => {
  it('returns 100 only for full passing validation without risk penalties', async () => {
    const result = await runPipeline([
      passedLayer('build'),
      passedLayer('tests'),
      passedLayer('security'),
      passedLayer('lint'),
      passedLayer('rules'),
    ], cfg)

    expect(result.score).toBe(100)
    expect(result.evidenceScore?.validation.executedLayers).toEqual(['build', 'tests', 'security', 'lint', 'rules'])
    expect(result.evidenceScore?.blockers).toEqual([])
  })

  it('caps partial validation below auto-apply even when layers pass', async () => {
    const result = await runPipeline([passedLayer('build')], cfg)

    expect(result.validationConfidence).toBe('partial')
    expect(result.score).toBeLessThan(90)
    expect(result.evidenceScore?.completeness.reasons).toContain('sem teste executado')
  })

  it('applies risk penalties for sensitive public-contract changes', async () => {
    const result = await runPipeline([
      passedLayer('build'),
      passedLayer('tests'),
      passedLayer('security'),
    ], {
      ...cfg,
      changes: [
        { path: 'src/auth/routes.ts', type: 'modify', diff: '+export const route = 1\n' },
        { path: 'package.json', type: 'modify', diff: '+{"name":"x"}\n' },
      ],
    })

    expect(result.evidenceScore?.risk.riskLevel).toBe('high')
    expect(result.evidenceScore?.risk.reasons).toEqual(expect.arrayContaining([
      'area sensivel alterada',
      'contrato publico/configuracao alterado',
    ]))
    expect(result.score).toBeLessThan(100)
  })

  it('failed typecheck blocks success and caps score', async () => {
    const failedTypecheck: LayerDef = {
      name: 'typecheck',
      hardFail: false,
      run: vi.fn().mockResolvedValue({
        name: 'typecheck',
        passed: false,
        errors: [{ layer: 'typecheck', type: 'syntax', severity: 'high', fixable: false, message: 'bad type', humanMessage: 'bad type', file: 'src/a.ts' }],
        warnings: [],
        duration: 3,
        skipped: false,
      } satisfies LayerResult),
    }

    const result = await runPipeline([passedLayer('build'), failedTypecheck, passedLayer('tests')], cfg)

    expect(result.passed).toBe(false)
    expect(result.score).toBeLessThanOrEqual(75)
    expect(result.evidenceScore?.blockers).toContain('typecheck failed')
  })

  it('failed build does not zero score and continues pipeline', async () => {
    const failedBuild: LayerDef = {
      name: 'build',
      hardFail: false,
      run: vi.fn().mockResolvedValue({
        name: 'build',
        passed: false,
        errors: [{ layer: 'build', type: 'syntax', severity: 'high', fixable: false, message: 'bad', humanMessage: 'bad', file: 'src/a.ts' }],
        warnings: [],
        duration: 3,
        skipped: false,
      } satisfies LayerResult),
    }
    const tests = passedLayer('tests')

    const result = await runPipeline([failedBuild, tests], cfg)

    expect(result.layers).toHaveLength(2)
    expect(vi.mocked(tests.run)).toHaveBeenCalledOnce()
    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThanOrEqual(75)
  })
})
