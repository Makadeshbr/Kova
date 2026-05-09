import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { HarnessResult, FileChange } from '@kova/shared'

vi.mock('@kova/harness', () => ({
  runPipeline: vi.fn(),
  runBuildLayer: vi.fn(),
  runTestsLayer: vi.fn(),
  runRulesLayer: vi.fn(),
  runSecurityLayer: vi.fn(),
  runLintLayer: vi.fn(),
}))

import { runPipeline } from '@kova/harness'
import { HarnessOrchestrator } from '../src/orchestrator'
import type { OrchestratorConfig } from '../src/orchestrator'

const mockPipeline = vi.mocked(runPipeline)

function fakeResult(score: number, passed = true): HarnessResult {
  return { passed, score, layers: [], duration: 100, iteration: 1 }
}

const cfg: OrchestratorConfig = {
  projectRoot: '/tmp',
  adapter: 'typescript',
  buildCommand: 'tsc --noEmit',
  typecheckCommand: 'tsc --noEmit',
  testCommand: 'vitest run',
  lintCommand: 'eslint .',
  iteration: 1,
}

const srcChange: FileChange[] = [
  { path: 'src/engine.ts', type: 'modify', diff: '+const x = 1' },
]

describe('HarnessOrchestrator — seleção de modo', () => {
  let o: HarnessOrchestrator

  beforeEach(() => {
    o = new HarnessOrchestrator()
    vi.resetAllMocks()
    mockPipeline.mockResolvedValue(fakeResult(80))
  })

  it('deve usar STANDARD para mudanças em src/', async () => {
    const result = await o.run(srcChange, cfg)
    const [layers] = mockPipeline.mock.calls[0]
    expect(result.mode).toBe('standard')
    expect(layers.map((l: { name: string }) => l.name)).toEqual(['build', 'typecheck', 'tests', 'rules'])
  })

  it('deve usar FAST para mudanças apenas em arquivos de teste', async () => {
    const testChanges: FileChange[] = [
      { path: 'src/engine.test.ts', type: 'modify', diff: '+test' },
    ]
    const result = await o.run(testChanges, cfg)
    expect(result.mode).toBe('fast')
    const [layers] = mockPipeline.mock.calls[0]
    expect(layers.map((l: { name: string }) => l.name)).toEqual(['rules', 'lint'])
  })

  it('deve usar FULL quando mais de 5 arquivos mudaram', async () => {
    const many: FileChange[] = Array.from({ length: 6 }, (_, i) => ({
      path: `src/file${i}.ts`, type: 'modify' as const, diff: '+x',
    }))
    const result = await o.run(many, cfg)
    expect(result.mode).toBe('full')
    const [layers] = mockPipeline.mock.calls[0]
    expect(layers).toHaveLength(6)
  })

  it('deve respeitar modo explícito ignorando heurística', async () => {
    const result = await o.run(srcChange, cfg, 'full')
    expect(result.mode).toBe('full')
  })
})

describe('HarnessOrchestrator — Scratchpad Fallback', () => {
  let o: HarnessOrchestrator

  beforeEach(() => {
    o = new HarnessOrchestrator()
    vi.resetAllMocks()
  })

  it('deve emitir sinal após 2 iterações sem melhora', async () => {
    mockPipeline
      .mockResolvedValueOnce(fakeResult(50))
      .mockResolvedValueOnce(fakeResult(50))
      .mockResolvedValueOnce(fakeResult(50))

    await o.run(srcChange, cfg)
    await o.run(srcChange, cfg)
    const result = await o.run(srcChange, cfg)
    expect(result.scratchpadFallback).toBe(true)
  })

  it('não deve emitir sinal quando score está melhorando', async () => {
    mockPipeline
      .mockResolvedValueOnce(fakeResult(40))
      .mockResolvedValueOnce(fakeResult(60))
      .mockResolvedValueOnce(fakeResult(80))

    await o.run(srcChange, cfg)
    await o.run(srcChange, cfg)
    const result = await o.run(srcChange, cfg)
    expect(result.scratchpadFallback).toBe(false)
  })

  it('não deve emitir sinal com menos de 3 iterações', async () => {
    mockPipeline
      .mockResolvedValueOnce(fakeResult(50))
      .mockResolvedValueOnce(fakeResult(50))

    await o.run(srcChange, cfg)
    const result = await o.run(srcChange, cfg)
    expect(result.scratchpadFallback).toBe(false)
  })

  it('deve resetar histórico ao chamar reset()', async () => {
    mockPipeline.mockResolvedValue(fakeResult(50))

    await o.run(srcChange, cfg)
    await o.run(srcChange, cfg)
    await o.run(srcChange, cfg) // triggers fallback

    o.reset()
    await o.run(srcChange, cfg)
    const result = await o.run(srcChange, cfg) // only 2 after reset
    expect(result.scratchpadFallback).toBe(false)
  })
})
