import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { runRulesLayer } from '../../src/layers/rules'
import type { FileChange } from '@kova/shared'

let tmpDir: string

function setup(files: Record<string, string>): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-rules-'))
  for (const [path, content] of Object.entries(files)) {
    const fullPath = join(tmpDir, path)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, content, 'utf-8')
  }
  return tmpDir
}

afterEach(() => { if (tmpDir) rmSync(tmpDir, { recursive: true, force: true }) })

function change(path: string, content: string): FileChange {
  return { path, type: 'modify', diff: content.split('\n').map(l => `+${l}`).join('\n') }
}

// CC = 11 (1 base + 10 if statements)
const HIGH_CC = `function complex(a: number, b: number, c: number): number {
  if (a > 0) return a
  if (b > 0) return b
  if (c > 0) return c
  if (a < 0) return -a
  if (b < 0) return -b
  if (c < 0) return -c
  if (a === b) return 0
  if (b === c) return 1
  if (a === c) return 2
  if (a + b > c) return 3
  return -1
}`

// nesting depth = 3 (viola limite 2)
const DEEP_NEST = `function deep(): void {
  if (true) {
    if (true) {
      if (true) { return }
    }
  }
}`

// CC = 3, nesting = 2 — tudo dentro do limite
const CLEAN = `function clean(x: number): number {
  if (x > 0) return x
  if (x < 0) return -x
  return 0
}`

describe('runRulesLayer — complexidade ciclomática (AST real)', () => {
  it('deve detectar CC > 10 com TypeScript compiler', async () => {
    const dir = setup({ 'src/file.ts': HIGH_CC })
    const result = await runRulesLayer(
      { changes: [change('src/file.ts', HIGH_CC)], projectRoot: dir, adapter: 'typescript' }, '',
    )
    const ccErrors = result.errors.filter(e => e.message.includes('Complexidade'))
    expect(ccErrors.length).toBeGreaterThanOrEqual(1)
    expect(ccErrors[0].severity).toBe('high')
    expect(result.passed).toBe(false)
  })

  it('deve aceitar CC <= 10', async () => {
    const dir = setup({ 'src/file.ts': CLEAN })
    const result = await runRulesLayer(
      { changes: [change('src/file.ts', CLEAN)], projectRoot: dir, adapter: 'typescript' }, '',
    )
    expect(result.errors.filter(e => e.message.includes('Complexidade'))).toHaveLength(0)
  })
})

describe('runRulesLayer — nesting level (AST real)', () => {
  it('deve bloquear nesting > 2 em lógica', async () => {
    const dir = setup({ 'src/file.ts': DEEP_NEST })
    const result = await runRulesLayer(
      { changes: [change('src/file.ts', DEEP_NEST)], projectRoot: dir, adapter: 'typescript' }, '',
    )
    const nestErrors = result.errors.filter(e => e.message.includes('Nesting'))
    expect(nestErrors.length).toBeGreaterThanOrEqual(1)
    expect(result.passed).toBe(false)
  })

  it('deve aceitar nesting = 2 (limite exato)', async () => {
    const code = `function ok(): void { if (true) { if (true) { return } } }`
    const dir = setup({ 'src/file.ts': code })
    const result = await runRulesLayer(
      { changes: [change('src/file.ts', code)], projectRoot: dir, adapter: 'typescript' }, '',
    )
    expect(result.errors.filter(e => e.message.includes('Nesting'))).toHaveLength(0)
  })

  it('deve permitir nesting alto em arquivos UI (.tsx)', async () => {
    const dir = setup({ 'src/Component.tsx': DEEP_NEST })
    const result = await runRulesLayer(
      { changes: [change('src/Component.tsx', DEEP_NEST)], projectRoot: dir, adapter: 'typescript' }, '',
    )
    // UI tem limite 4 — nesting 3 passa
    expect(result.errors.filter(e => e.message.includes('Nesting'))).toHaveLength(0)
  })
})

describe('runRulesLayer — forbidden patterns', () => {
  it('deve detectar any em diff TypeScript', async () => {
    const dir = setup({ 'src/file.ts': 'const x: number = 1' })
    const result = await runRulesLayer(
      { changes: [change('src/file.ts', 'const x: any = 1')], projectRoot: dir, adapter: 'typescript' }, '',
    )
    expect(result.errors.some(e => e.message.includes("'any'"))).toBe(true)
  })

  it('deve ignorar regras TypeScript em arquivos Python', async () => {
    const dir = setup({ 'src/file.py': 'x = 1' })
    const result = await runRulesLayer(
      { changes: [change('src/file.py', 'const x: any = 1')], projectRoot: dir, adapter: 'python' }, '',
    )
    expect(result.passed).toBe(true)
  })

  it('deve ignorar linhas removidas no diff', async () => {
    const dir = setup({ 'src/file.ts': CLEAN })
    const result = await runRulesLayer(
      { changes: [{ path: 'src/file.ts', type: 'modify', diff: '-const x: any = 5' }], projectRoot: dir, adapter: 'typescript' }, '',
    )
    expect(result.passed).toBe(true)
  })
})
