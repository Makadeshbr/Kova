import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { ProjectProfile } from '@kova/shared'
import { adapterFromProjectProfile, detectStack, detectStackFromChanges } from '../src/detect'

let tmpDir: string

function makeTmpDir(): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-detect-'))
  return tmpDir
}

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

describe('adapterFromProjectProfile', () => {
  it('deve escolher adapter pela linguagem mais forte do profile', () => {
    const profile = {
      root: '/repo',
      projectKind: 'existing',
      traits: ['multi_stack'],
      languages: [
        { name: 'go', confidence: 0.95, source: 'go.mod' },
        { name: 'typescript', confidence: 0.8, source: 'tsconfig.json' },
      ],
      frameworks: [],
      packageManagers: [],
      workspaces: [],
      buildCommands: [],
      testCommands: [],
      lintCommands: [],
      typecheckCommands: [],
      validations: [],
      ci: [],
      containers: [],
      taskRunners: [],
      instructionFiles: [],
      sensitiveFiles: [],
      risks: [],
      entrypoints: [],
      architectureHints: [],
      signals: [],
      observations: [],
      confidence: 0.9,
    } satisfies ProjectProfile

    expect(adapterFromProjectProfile(profile).name).toBe('go')
  })
})

describe('detectStack', () => {
  it('deve retornar JavaScriptAdapter para pasta com apenas package.json (Node.js/JS puro)', () => {
    // package.json sem tsconfig = JavaScript — adapter proprio sem tsc
    const dir = makeTmpDir()
    writeFileSync(join(dir, 'package.json'), '{}')
    const adapter = detectStack(dir)
    expect(adapter.name).toBe('javascript')
  })

  it('deve retornar TypeScriptAdapter apenas quando tsconfig.json existe', () => {
    const dir = makeTmpDir()
    writeFileSync(join(dir, 'tsconfig.json'), '{}')
    const adapter = detectStack(dir)
    expect(adapter.name).toBe('typescript')
  })

  it('deve retornar TypeScriptAdapter para pasta com tsconfig.json + package.json', () => {
    const dir = makeTmpDir()
    writeFileSync(join(dir, 'tsconfig.json'), '{}')
    writeFileSync(join(dir, 'package.json'), '{}')
    const adapter = detectStack(dir)
    expect(adapter.name).toBe('typescript')
  })

  it('deve retornar PythonAdapter para pasta com pyproject.toml', () => {
    const dir = makeTmpDir()
    writeFileSync(join(dir, 'pyproject.toml'), '[project]\nname = "demo"')
    const adapter = detectStack(dir)
    expect(adapter.name).toBe('python')
  })

  it('deve retornar GoAdapter para pasta com go.mod', () => {
    const dir = makeTmpDir()
    writeFileSync(join(dir, 'go.mod'), 'module example.com/demo')
    const adapter = detectStack(dir)
    expect(adapter.name).toBe('go')
  })

  it('deve retornar GenericAdapter para projeto C++/Rust/qualquer outra linguagem', () => {
    const dir = makeTmpDir()
    // Projeto sem package.json ou tsconfig.json — C++, Rust, etc.
    const adapter = detectStack(dir)
    expect(adapter.name).toBe('generic')
  })

  it('nunca deve lançar erro — todo projeto tem um fallback', () => {
    const dir = makeTmpDir()
    expect(() => detectStack(dir)).not.toThrow()
  })
})

describe('detectStackFromChanges', () => {
  it('retorna TypeScriptAdapter para arquivos .ts', () => {
    expect(detectStackFromChanges(['src/app.ts', 'test/app.test.ts'])?.name).toBe('typescript')
  })

  it('retorna JavaScriptAdapter para arquivos .js puros — nao deve rodar tsc', () => {
    const adapter = detectStackFromChanges(['calculator.js', 'test/calculator.test.js'])
    expect(adapter?.name).toBe('javascript')
  })

  it('prefere .ts sobre .js quando ambos estao presentes', () => {
    const adapter = detectStackFromChanges(['src/app.ts', 'dist/app.js'])
    expect(adapter?.name).toBe('typescript')
  })

  it('retorna GoAdapter para arquivos .go', () => {
    expect(detectStackFromChanges(['main.go', 'handler.go'])?.name).toBe('go')
  })

  it('retorna null para extensoes desconhecidas', () => {
    expect(detectStackFromChanges(['README.md', 'Makefile'])).toBeNull()
  })
})
