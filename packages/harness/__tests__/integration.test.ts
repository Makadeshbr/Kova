/**
 * Testes de integração — zero mocks.
 * Rodam o pipeline completo contra projetos TypeScript reais em disco.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { runBuildLayer } from '../src/layers/build'
import { runRulesLayer } from '../src/layers/rules'
import { runSecurityLayer } from '../src/layers/security'
import { runPipeline } from '../src/pipeline'
import type { FileChange } from '@kova/shared'

// __tests__/ → packages/harness/ → node_modules/.bin/tsc.cmd
const HARNESS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TSC = resolve(HARNESS_ROOT, 'node_modules', '.bin', 'tsc.cmd')

let tmpDir: string

function setup(files: Record<string, string>): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-int-'))
  for (const [path, content] of Object.entries(files)) {
    const full = join(tmpDir, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content, 'utf-8')
  }
  return tmpDir
}

afterEach(() => { if (tmpDir) rmSync(tmpDir, { recursive: true, force: true }) })

function change(path: string, content: string): FileChange {
  return { path, type: 'modify', diff: content.split('\n').map(l => `+${l}`).join('\n') }
}

const TSCONFIG = JSON.stringify({ compilerOptions: { strict: true, noEmit: true } })

// ─── Build layer ─────────────────────────────────────────────────────────────

describe('runBuildLayer — tsc real', () => {
  it('deve passar em TypeScript válido', async () => {
    const dir = setup({
      'tsconfig.json': TSCONFIG,
      'index.ts': 'export const x: number = 42',
    })
    const result = await runBuildLayer({ command: `"${TSC}" --noEmit`, projectRoot: dir })
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('deve detectar erro de tipo real e extrair rule TS', async () => {
    const dir = setup({
      'tsconfig.json': TSCONFIG,
      'index.ts': 'const x: number = "tipo errado"\nexport { x }',
    })
    const result = await runBuildLayer({ command: `"${TSC}" --noEmit`, projectRoot: dir })
    expect(result.passed).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(1)
    expect(result.errors[0].message).toMatch(/string.*number|number.*string/)
    expect(result.errors[0].file).toContain('index.ts')
    expect(result.errors[0].line).toBe(1)
  })
})

// ─── Rules layer (AST real) ──────────────────────────────────────────────────

describe('runRulesLayer — AST real', () => {
  it('deve detectar complexidade ciclomática alta via TypeScript compiler', async () => {
    const code = [
      'export function f(a:number,b:number,c:number,d:number,e:number,f:number):number{',
      '  if(a>0)return a;if(b>0)return b;if(c>0)return c',
      '  if(d>0)return d;if(e>0)return e;if(f>0)return f',
      '  if(a<0)return-a;if(b<0)return-b;if(c<0)return-c',
      '  if(d<0)return-d;return 0}',
    ].join('\n')
    const dir = setup({ 'src/heavy.ts': code })
    const result = await runRulesLayer(
      { changes: [change('src/heavy.ts', code)], projectRoot: dir, adapter: 'typescript' }, '',
    )
    expect(result.errors.some(e => e.message.includes('Complexidade'))).toBe(true)
    expect(result.passed).toBe(false)
  })

  it('deve passar em código limpo sem erros de AST', async () => {
    const code = 'export const add = (a: number, b: number): number => a + b'
    const dir = setup({ 'src/math.ts': code })
    const result = await runRulesLayer(
      { changes: [change('src/math.ts', code)], projectRoot: dir, adapter: 'typescript' }, '',
    )
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

// ─── Security layer (regex real) ─────────────────────────────────────────────

describe('runSecurityLayer — regex real', () => {
  it('deve detectar API key hardcoded no diff', async () => {
    const dir = setup({ 'src/config.ts': 'export const x = 1' })
    const result = await runSecurityLayer({
      changes: [{ path: 'src/config.ts', type: 'modify',
        diff: '+const KEY = "sk-abcdefghijklmnopqrstuvwxyz12345"' }],
      projectRoot: dir,
    })
    expect(result.passed).toBe(false)
    expect(result.errors[0].severity).toBe('critical')
    expect(result.errors[0].message).toContain('OpenAI')
  })

  it('deve passar sem secrets no diff', async () => {
    const dir = setup({ 'src/utils.ts': 'export const x = 1' })
    const result = await runSecurityLayer({
      changes: [{ path: 'src/utils.ts', type: 'modify', diff: '+export const pi = 3.14' }],
      projectRoot: dir,
    })
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

// ─── Pipeline encadeado sem mocks ────────────────────────────────────────────

describe('Pipeline completo — sem mocks', () => {
  it('deve passar build → rules em projeto limpo', async () => {
    const code = 'export const add = (a: number, b: number): number => a + b'
    const dir = setup({ 'tsconfig.json': TSCONFIG, 'src/math.ts': code })
    const changes: FileChange[] = [change('src/math.ts', code)]

    const result = await runPipeline([
      {
        name: 'build', hardFail: true,
        run: () => runBuildLayer({ command: `"${TSC}" --noEmit`, projectRoot: dir }),
      },
      {
        name: 'rules', hardFail: false,
        run: () => runRulesLayer({ changes, projectRoot: dir, adapter: 'typescript' }, ''),
      },
    ], { projectRoot: dir, iteration: 1 })

    expect(result.passed).toBe(true)
    expect(result.layers).toHaveLength(2)
    expect(result.layers.every(l => l.passed)).toBe(true)
  })

  it('deve parar no build (hard fail) sem rodar rules', async () => {
    const dir = setup({
      'tsconfig.json': TSCONFIG,
      'src/bad.ts': 'const x: number = "erro"\nexport { x }',
    })
    const rulesCalled = { value: false }

    const result = await runPipeline([
      {
        name: 'build', hardFail: true,
        run: () => runBuildLayer({ command: `"${TSC}" --noEmit`, projectRoot: dir }),
      },
      {
        name: 'rules', hardFail: false,
        run: async () => { rulesCalled.value = true; return runRulesLayer({ changes: [], projectRoot: dir }, '') },
      },
    ], { projectRoot: dir, iteration: 1 })

    expect(result.passed).toBe(false)
    expect(result.layers).toHaveLength(1)
    expect(rulesCalled.value).toBe(false)
  })
})
