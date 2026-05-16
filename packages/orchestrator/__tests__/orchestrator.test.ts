import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { HarnessResult, FileChange } from '@kova/shared'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

vi.mock('@kova/harness', () => ({
  runPipeline: vi.fn(),
  runBuildLayer: vi.fn(),
  runTestsLayer: vi.fn(),
  runRulesLayer: vi.fn(),
  runSecurityLayer: vi.fn(),
  runLintLayer: vi.fn(),
  runTypecheckLayer: vi.fn(),
}))

import { runPipeline } from '@kova/harness'
import { HarnessOrchestrator, createOrchestratorConfig } from '../src/orchestrator'
import type { OrchestratorConfig } from '../src/orchestrator'

const mockPipeline = vi.mocked(runPipeline)

function fakeResult(score: number, passed = true): HarnessResult {
  return { passed, score, layers: [], duration: 100, iteration: 1 }
}

const cfg: OrchestratorConfig = {
  projectRoot: join(tmpdir(), 'kova-orchestrator-missing-root'),
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

describe('HarnessOrchestrator - staging isolado', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('valida em workspace temporario sem escrever alteracoes no worktree real', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kova-orchestrator-real-'))
    try {
      mkdirSync(join(root, 'src'), { recursive: true })
      writeFileSync(join(root, 'src', 'engine.ts'), 'export const value = 1\n', 'utf-8')

      mockPipeline.mockImplementation(async (_layers, config) => {
        expect(config.projectRoot).not.toBe(root)
        expect(readFileSync(join(config.projectRoot, 'src', 'engine.ts'), 'utf-8')).toBe('export const value = 2\n')
        expect(readFileSync(join(root, 'src', 'engine.ts'), 'utf-8')).toBe('export const value = 1\n')
        return fakeResult(80)
      })

      const o = new HarnessOrchestrator()
      await o.run(
        [{ path: 'src/engine.ts', type: 'modify', diff: 'export const value = 2\n', before: 'export const value = 1\n' }],
        { ...cfg, projectRoot: root },
      )

      expect(readFileSync(join(root, 'src', 'engine.ts'), 'utf-8')).toBe('export const value = 1\n')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('remove o workspace temporario depois da validacao', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kova-orchestrator-cleanup-'))
    let stagedRoot = ''
    try {
      mockPipeline.mockImplementation(async (_layers, config) => {
        stagedRoot = config.projectRoot
        return fakeResult(80)
      })

      const o = new HarnessOrchestrator()
      await o.run([{ path: 'created.ts', type: 'create', diff: 'export const ok = true\n' }], { ...cfg, projectRoot: root })

      expect(stagedRoot).toBeTruthy()
      expect(existsSync(stagedRoot)).toBe(false)
      expect(existsSync(join(root, 'created.ts'))).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('createOrchestratorConfig - workspace cwd', () => {
  it('usa o root do subprojeto quando o ProjectProfile detecta scope', () => {
    const root = mkdtempSync(join(tmpdir(), 'kova-subproject-config-'))
    try {
      mkdirSync(join(root, 'task-tracker-api'))
      writeFileSync(join(root, 'task-tracker-api', 'go.mod'), 'module example.com/task-tracker-api\n', 'utf-8')
      writeFileSync(join(root, 'task-tracker-api', 'main.go'), 'package main\n', 'utf-8')

      const config = createOrchestratorConfig(root, 1, ['task-tracker-api/main.go'])

      expect(config.testCommand).toContain('go test')
      expect(config.testCwd).toBe('task-tracker-api')
      expect(config.buildCwd).toBe('task-tracker-api')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('createOrchestratorConfig â€” Python validation commands', () => {
  it('compila todos os arquivos Python reais no estado final e usa unittest', () => {
    const root = mkdtempSync(join(tmpdir(), 'kova-python-config-'))
    try {
      writeFileSync(join(root, 'task_manager.py'), 'def ok():\n    return True\n', 'utf-8')
      writeFileSync(join(root, 'test_task_manager.py'), 'import unittest\n', 'utf-8')

      const config = createOrchestratorConfig(root, 2, ['task_manager.py'])

      expect(config.adapter).toBe('python')
      expect(config.buildCommand).toContain('python -m py_compile')
      expect(config.buildCommand).toContain('"task_manager.py"')
      expect(config.buildCommand).toContain('"test_task_manager.py"')
      expect(config.testCommand).toBe('python -m unittest discover -v')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
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
