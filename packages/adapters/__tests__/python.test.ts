import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PythonAdapter } from '../src/python'

let tmpDir: string

function makeTmpDir(): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-python-'))
  return tmpDir
}

afterEach(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

describe('PythonAdapter.detect', () => {
  it('deve retornar true para pasta com pyproject.toml', () => {
    const dir = makeTmpDir()
    writeFileSync(join(dir, 'pyproject.toml'), '[project]\nname = "demo"')
    expect(PythonAdapter.detect(dir)).toBe(true)
  })

  it('deve retornar true para pasta com setup.py', () => {
    const dir = makeTmpDir()
    writeFileSync(join(dir, 'setup.py'), 'from setuptools import setup')
    expect(PythonAdapter.detect(dir)).toBe(true)
  })

  it('deve retornar true para pasta com requirements.txt', () => {
    const dir = makeTmpDir()
    writeFileSync(join(dir, 'requirements.txt'), 'pytest')
    expect(PythonAdapter.detect(dir)).toBe(true)
  })

  it('deve retornar false para pasta sem manifest Python', () => {
    const dir = makeTmpDir()
    expect(PythonAdapter.detect(dir)).toBe(false)
  })
})

describe('PythonAdapter.parseImports', () => {
  it('deve extrair import simples', () => {
    const imports = PythonAdapter.parseImports('app.py', 'import os\nimport pathlib')
    expect(imports).toContain('os')
    expect(imports).toContain('pathlib')
  })

  it('deve extrair imports separados por virgula e alias', () => {
    const imports = PythonAdapter.parseImports('app.py', 'import os, pathlib as pl')
    expect(imports).toContain('os')
    expect(imports).toContain('pathlib')
  })

  it('deve extrair from import', () => {
    const imports = PythonAdapter.parseImports('app.py', 'from pathlib import Path\nfrom .service import run')
    expect(imports).toContain('pathlib')
    expect(imports).toContain('.service')
  })
})
