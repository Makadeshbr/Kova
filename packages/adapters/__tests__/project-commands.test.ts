import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { TypeScriptAdapter } from '../src/typescript'
import { resolveCommands } from '../src/project-commands'

let tmpDir: string

function setup(pkg: object): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-cmds-'))
  writeFileSync(join(tmpDir, 'package.json'), JSON.stringify(pkg))
  return tmpDir
}

afterEach(() => { if (tmpDir) rmSync(tmpDir, { recursive: true, force: true }) })

describe('resolveCommands — usa scripts do package.json', () => {
  it('deve usar npm run build/test/lint quando scripts estão definidos', () => {
    // npm run garante que node_modules/.bin está no PATH
    const dir = setup({ scripts: { build: 'next build', test: 'jest', lint: 'eslint .' } })
    const cmds = resolveCommands(TypeScriptAdapter, dir)
    expect(cmds.build).toBe('npm run build')
    expect(cmds.test).toBe('npm run test')
    expect(cmds.lint).toBe('npm run lint')
  })

  it('deve ignorar scripts placeholder "echo" e usar npx para dep detectada', () => {
    const dir = setup({ scripts: { test: 'echo "no tests"' }, devDependencies: { vitest: '^1.0.0' } })
    const cmds = resolveCommands(TypeScriptAdapter, dir)
    expect(cmds.test).toBe('npx vitest run')
  })
})

describe('resolveCommands — detecta runner pela devDependency', () => {
  it('deve detectar vitest pelo devDependencies com npx', () => {
    const dir = setup({ devDependencies: { vitest: '^1.0.0' } })
    const cmds = resolveCommands(TypeScriptAdapter, dir)
    expect(cmds.test).toBe('npx vitest run')
  })

  it('deve detectar jest pelo devDependencies com npx', () => {
    const dir = setup({ devDependencies: { jest: '^29.0.0' } })
    const cmds = resolveCommands(TypeScriptAdapter, dir)
    expect(cmds.test).toBe('npx jest --passWithNoTests')
  })

  it('deve detectar biome pelo devDependencies com npx', () => {
    const dir = setup({ devDependencies: { '@biomejs/biome': '^1.0.0' } })
    const cmds = resolveCommands(TypeScriptAdapter, dir)
    expect(cmds.lint).toBe('npx biome lint .')
  })

  it('deve detectar next.js pelo dependencies com npx', () => {
    const dir = setup({ dependencies: { next: '^14.0.0' } })
    const cmds = resolveCommands(TypeScriptAdapter, dir)
    expect(cmds.build).toBe('npx next build')
  })
})

describe('resolveCommands — sistemas de build não-npm', () => {
  it('deve detectar Rust (Cargo.toml)', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kova-cmds-'))
    writeFileSync(join(tmpDir, 'Cargo.toml'), '[package]\nname = "my-app"')
    const cmds = resolveCommands(TypeScriptAdapter, tmpDir)
    expect(cmds.build).toBe('cargo build')
    expect(cmds.test).toBe('cargo test')
    expect(cmds.lint).toContain('clippy')
  })

  it('deve detectar Go (go.mod)', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kova-cmds-'))
    writeFileSync(join(tmpDir, 'go.mod'), 'module myapp\n\ngo 1.21')
    const cmds = resolveCommands(TypeScriptAdapter, tmpDir)
    expect(cmds.build).toBe('go build ./...')
    expect(cmds.test).toBe('go test ./...')
  })

  it('deve detectar Python (pyproject.toml)', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kova-cmds-'))
    writeFileSync(join(tmpDir, 'pyproject.toml'), '[tool.poetry]\nname = "myapp"')
    const cmds = resolveCommands(TypeScriptAdapter, tmpDir)
    expect(cmds.test).toBe('pytest')
    expect(cmds.lint).toContain('ruff')
  })

  it('deve detectar C++ (CMakeLists.txt)', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kova-cmds-'))
    writeFileSync(join(tmpDir, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.0)')
    const cmds = resolveCommands(TypeScriptAdapter, tmpDir)
    expect(cmds.build).toBe('cmake --build .')
    expect(cmds.test).toContain('ctest')
  })

  it('deve detectar Makefile', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kova-cmds-'))
    writeFileSync(join(tmpDir, 'Makefile'), 'all:\n\tgcc main.c -o app')
    const cmds = resolveCommands(TypeScriptAdapter, tmpDir)
    expect(cmds.build).toBe('make')
  })
})

describe('resolveCommands — fallback para defaults do adapter', () => {
  it('deve usar defaults do adapter quando não há package.json', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'kova-cmds-'))
    const cmds = resolveCommands(TypeScriptAdapter, tmpDir)
    expect(cmds.build).toBe(TypeScriptAdapter.commands.build)
    expect(cmds.test).toBe(TypeScriptAdapter.commands.test)
  })

  it('deve usar defaults quando package.json não tem scripts', () => {
    const dir = setup({ name: 'my-project', version: '1.0.0' })
    const cmds = resolveCommands(TypeScriptAdapter, dir)
    expect(cmds.build).toBe(TypeScriptAdapter.commands.build)
  })
})
