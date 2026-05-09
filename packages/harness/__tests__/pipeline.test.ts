import { describe, it, expect, vi } from 'vitest'
import type { LayerResult } from '@kova/shared'
import { runPipeline } from '../src/pipeline'
import type { LayerDef } from '../src/pipeline'

function makeLayer(
  passed: boolean,
  hardFail: boolean,
  name: LayerResult['name'] = 'build',
  critical = false,
): LayerDef {
  return {
    name,
    hardFail,
    run: vi.fn().mockResolvedValue({
      name,
      passed,
      errors: critical
        ? [{ layer: name, type: 'security', severity: 'critical', fixable: false, message: 'secret', humanMessage: 'secret', file: '' }]
        : [],
      warnings: [],
      duration: 10,
      skipped: false,
    } satisfies LayerResult),
  }
}

const cfg = { projectRoot: '/tmp', iteration: 1 }

describe('runPipeline — sequência Build → Tests', () => {
  it('deve executar Tests após Build passar', async () => {
    const build = makeLayer(true, true, 'build')
    const tests = makeLayer(true, false, 'tests')
    const result = await runPipeline([build, tests], cfg)
    expect(result.passed).toBe(true)
    expect(result.layers).toHaveLength(2)
    expect(vi.mocked(tests.run)).toHaveBeenCalledOnce()
  })

  it('deve pular Tests quando Build falhou', async () => {
    const build = makeLayer(false, true, 'build')
    const tests = makeLayer(true, false, 'tests')
    await runPipeline([build, tests], cfg)
    expect(vi.mocked(tests.run)).not.toHaveBeenCalled()
  })
})

describe('runPipeline — critical stop', () => {
  it('deve parar quando security retorna erro crítico (não hardFail)', async () => {
    const security = makeLayer(false, false, 'security', true)
    const lint = makeLayer(true, false, 'lint')
    await runPipeline([security, lint], cfg)
    expect(vi.mocked(lint.run)).not.toHaveBeenCalled()
  })

  it('deve retornar passed:false em critical stop', async () => {
    const security = makeLayer(false, false, 'security', true)
    const result = await runPipeline([security], cfg)
    expect(result.passed).toBe(false)
  })
})

describe('runPipeline', () => {
  it('deve retornar passed:true quando todos os layers passam', async () => {
    const layers = [makeLayer(true, true, 'build'), makeLayer(true, false, 'lint')]
    const result = await runPipeline(layers, cfg)
    expect(result.passed).toBe(true)
    expect(result.layers).toHaveLength(2)
    expect(result.iteration).toBe(1)
  })

  it('deve parar no hard fail e não executar layers seguintes', async () => {
    const build = makeLayer(false, true, 'build')
    const lint = makeLayer(true, false, 'lint')
    const result = await runPipeline([build, lint], cfg)
    expect(result.passed).toBe(false)
    expect(result.layers).toHaveLength(1)
    expect(vi.mocked(lint.run)).not.toHaveBeenCalled()
  })

  it('deve continuar após soft fail', async () => {
    const lint = makeLayer(false, false, 'lint')
    const security = makeLayer(true, false, 'security')
    const result = await runPipeline([lint, security], cfg)
    expect(result.layers).toHaveLength(2)
    expect(vi.mocked(security.run)).toHaveBeenCalledOnce()
  })

  it('deve retornar passed:false se qualquer layer falhar', async () => {
    const layers = [makeLayer(true, false, 'build'), makeLayer(false, false, 'lint')]
    const result = await runPipeline(layers, cfg)
    expect(result.passed).toBe(false)
  })

  it('deve incluir duração total no resultado', async () => {
    const result = await runPipeline([makeLayer(true, true, 'build')], cfg)
    expect(result.duration).toBeGreaterThanOrEqual(0)
  })

  it('deve retornar passed:false para pipeline vazio', async () => {
    const result = await runPipeline([], cfg)
    expect(result.passed).toBe(false)
  })
})
