import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { TypeScriptAdapter, detectStructure } from '../src/typescript'

let tmpDir: string

function makeTmpDir(): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-ts-'))
  return tmpDir
}

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

describe('TypeScriptAdapter.detect', () => {
  it('deve retornar false para pasta com apenas package.json — JS puro nao e TypeScript', () => {
    const dir = makeTmpDir()
    writeFileSync(join(dir, 'package.json'), '{}')
    expect(TypeScriptAdapter.detect(dir)).toBe(false)
  })

  it('deve retornar false para pasta vazia', () => {
    const dir = makeTmpDir()
    expect(TypeScriptAdapter.detect(dir)).toBe(false)
  })

  it('deve retornar true para pasta com tsconfig.json', () => {
    const dir = makeTmpDir()
    writeFileSync(join(dir, 'tsconfig.json'), '{}')
    expect(TypeScriptAdapter.detect(dir)).toBe(true)
  })

  it('deve retornar true para pasta com tsconfig.json e package.json', () => {
    const dir = makeTmpDir()
    writeFileSync(join(dir, 'tsconfig.json'), '{}')
    writeFileSync(join(dir, 'package.json'), '{}')
    expect(TypeScriptAdapter.detect(dir)).toBe(true)
  })
})

describe('TypeScriptAdapter.parseImports', () => {
  it('deve extrair import com named exports', () => {
    const content = `import { foo, bar } from 'some-pkg'`
    const imports = TypeScriptAdapter.parseImports('file.ts', content)
    expect(imports).toContain('some-pkg')
  })

  it('deve extrair import type', () => {
    const content = `import type { Baz } from './baz'`
    const imports = TypeScriptAdapter.parseImports('file.ts', content)
    expect(imports).toContain('./baz')
  })

  it('deve extrair import namespace', () => {
    const content = `import * as fs from 'node:fs'`
    const imports = TypeScriptAdapter.parseImports('file.ts', content)
    expect(imports).toContain('node:fs')
  })

  it('deve retornar array vazio para arquivo sem imports', () => {
    const imports = TypeScriptAdapter.parseImports('file.ts', 'const x = 1')
    expect(imports).toHaveLength(0)
  })

  it('deve extrair múltiplos imports', () => {
    const content = `import { a } from 'pkg-a'\nimport { b } from 'pkg-b'`
    const imports = TypeScriptAdapter.parseImports('file.ts', content)
    expect(imports).toContain('pkg-a')
    expect(imports).toContain('pkg-b')
  })

  it('deve extrair import side-effect, export from e require', () => {
    const content = `import './setup'\nexport { api } from './api'\nconst path = require('node:path')`
    const imports = TypeScriptAdapter.parseImports('file.ts', content)
    expect(imports).toContain('./setup')
    expect(imports).toContain('./api')
    expect(imports).toContain('node:path')
  })
})

describe('detectStructure', () => {
  it('deve detectar pasta src/', () => {
    const dir = makeTmpDir()
    mkdirSync(join(dir, 'src'))
    expect(detectStructure(dir).hasSrc).toBe(true)
  })

  it('deve retornar hasSrc false quando não há src/', () => {
    const dir = makeTmpDir()
    expect(detectStructure(dir).hasSrc).toBe(false)
  })

  it('deve detectar pasta __tests__/', () => {
    const dir = makeTmpDir()
    mkdirSync(join(dir, '__tests__'))
    expect(detectStructure(dir).hasTests).toBe(true)
  })

  it('deve detectar entry point src/index.ts', () => {
    const dir = makeTmpDir()
    mkdirSync(join(dir, 'src'))
    writeFileSync(join(dir, 'src', 'index.ts'), '')
    expect(detectStructure(dir).entryPoint).toBe('src/index.ts')
  })

  it('deve retornar entryPoint null quando não há entry point', () => {
    const dir = makeTmpDir()
    expect(detectStructure(dir).entryPoint).toBeNull()
  })
})
