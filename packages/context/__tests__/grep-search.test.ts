import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { grepForTask, extractKeywords } from '../src/grep-search'

let tmpDir = ''

function setup(): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-grep-'))
  return tmpDir
}

afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
  tmpDir = ''
})

describe('extractKeywords', () => {
  it('deve extrair palavras com mais de 2 chars', () => {
    const kws = extractKeywords('build the context engine')
    expect(kws).toContain('build')
    expect(kws).toContain('context')
    expect(kws).toContain('engine')
  })

  it('deve ignorar stop words', () => {
    const kws = extractKeywords('build the context for the engine')
    expect(kws).not.toContain('the')
    expect(kws).not.toContain('for')
  })

  it('deve deduplicar palavras', () => {
    const kws = extractKeywords('build build build')
    expect(kws.filter(k => k === 'build')).toHaveLength(1)
  })
})

describe('grepForTask', () => {
  it('deve encontrar arquivo com keyword no nome', async () => {
    const root = setup()
    writeFileSync(join(root, 'auth-service.ts'), 'export function login() {}')

    const results = await grepForTask('implement authentication service', root)
    const found = results.find(r => r.file.includes('auth'))
    expect(found).toBeTruthy()
    expect(found!.score).toBeGreaterThan(0)
  })

  it('deve encontrar arquivo com keyword no conteúdo', async () => {
    const root = setup()
    writeFileSync(join(root, 'utils.ts'), 'export function validateToken(token: string) { return token.length > 0 }')

    const results = await grepForTask('validate token authentication', root)
    const found = results.find(r => r.file.includes('utils'))
    expect(found).toBeTruthy()
  })

  it('deve ordenar por score decrescente', async () => {
    const root = setup()
    writeFileSync(join(root, 'auth.ts'), 'auth auth auth token token token')
    writeFileSync(join(root, 'other.ts'), 'auth')

    const results = await grepForTask('auth token', root)
    expect(results.length).toBeGreaterThanOrEqual(2)
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score)
  })

  it('deve ignorar node_modules e dist', async () => {
    const root = setup()
    mkdirSync(join(root, 'node_modules', 'lib'), { recursive: true })
    writeFileSync(join(root, 'node_modules', 'lib', 'auth.ts'), 'auth auth auth')
    writeFileSync(join(root, 'src.ts'), 'other content')

    const results = await grepForTask('auth token', root)
    expect(results.every(r => !r.file.includes('node_modules'))).toBe(true)
  })

  it('deve retornar array vazio para task sem keywords', async () => {
    const root = setup()
    const results = await grepForTask('', root)
    expect(results).toHaveLength(0)
  })
})
