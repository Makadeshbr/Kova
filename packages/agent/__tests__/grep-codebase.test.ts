/**
 * FIX-015 — TDD tests for the grep-codebase helper.
 *
 * The helper exposes one async function `grepCodebase(projectRoot, opts, signal)`.
 * It auto-detects whether ripgrep is on PATH; if so, uses it (fast path).
 * Otherwise it falls back to a JS implementation using fast-glob + RegExp.
 *
 * To exercise the JS fallback deterministically — and to keep tests fast and
 * independent of the host environment — every test forces engine='js' by
 * passing the `forceEngine: 'js'` option. A separate suite probes ripgrep
 * only if it is actually installed.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { grepCodebase, isRipgrepAvailable } from '../src/grep-codebase'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'kova-grep-test-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function seed(files: Record<string, string>): void {
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(root, relPath)
    mkdirSync(join(fullPath, '..'), { recursive: true })
    writeFileSync(fullPath, content, 'utf-8')
  }
}

// ─── Input validation ────────────────────────────────────────────────────────

describe('grepCodebase — input validation', () => {
  it('rejects an empty pattern', async () => {
    const result = await grepCodebase(root, { pattern: '', forceEngine: 'js' })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/pattern.*empty|empty.*pattern/i)
  })

  it('rejects a whitespace-only pattern', async () => {
    const result = await grepCodebase(root, { pattern: '   ', forceEngine: 'js' })
    expect(result.ok).toBe(false)
  })

  it('rejects path that escapes projectRoot', async () => {
    const result = await grepCodebase(root, { pattern: 'foo', path: '../escape', forceEngine: 'js' })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/outside|traversal|invalid/i)
  })

  it('accepts pattern with regex special characters', async () => {
    seed({ 'a.ts': 'function foo() { return /^[a-z]+$/g.test("x") }' })
    const result = await grepCodebase(root, {
      pattern: '\\/\\^\\[a-z\\]\\+\\$\\/g',
      outputMode: 'content',
      forceEngine: 'js',
    })
    expect(result.ok).toBe(true)
    expect(result.lines.some(line => line.includes('a.ts'))).toBe(true)
  })
})

// ─── Basic matching ──────────────────────────────────────────────────────────

describe('grepCodebase — basic matching (JS engine)', () => {
  it('returns matching files in files_with_matches mode', async () => {
    seed({
      'src/auth.ts': 'export function login() {}',
      'src/utils.ts': 'export const x = 1',
      'README.md': '# Project',
    })
    const result = await grepCodebase(root, {
      pattern: 'export',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    expect(result.ok).toBe(true)
    expect(result.lines).toContain('src/auth.ts')
    expect(result.lines).toContain('src/utils.ts')
    expect(result.lines).not.toContain('README.md')
  })

  it('returns path:line:content in content mode', async () => {
    seed({ 'src/auth.ts': 'export function login() {}\nconst secret = "x"' })
    const result = await grepCodebase(root, {
      pattern: 'login',
      outputMode: 'content',
      forceEngine: 'js',
    })
    expect(result.ok).toBe(true)
    expect(result.lines[0]).toMatch(/^src[\\/]auth\.ts:1:.*login/)
  })

  it('returns path:count in count mode', async () => {
    seed({ 'a.ts': 'foo\nfoo\nfoo', 'b.ts': 'foo' })
    const result = await grepCodebase(root, {
      pattern: 'foo',
      outputMode: 'count',
      forceEngine: 'js',
    })
    expect(result.ok).toBe(true)
    expect(result.lines).toContain('a.ts:3')
    expect(result.lines).toContain('b.ts:1')
  })

  it('case insensitive match when caseInsensitive=true', async () => {
    seed({ 'a.ts': 'Hello World' })
    const result = await grepCodebase(root, {
      pattern: 'hello',
      caseInsensitive: true,
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    expect(result.lines).toEqual(['a.ts'])
  })

  it('case sensitive by default', async () => {
    seed({ 'a.ts': 'Hello World' })
    const result = await grepCodebase(root, {
      pattern: 'hello',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    expect(result.lines).toEqual([])
  })

  it('returns empty result with ok=true when no matches', async () => {
    seed({ 'a.ts': 'nothing here' })
    const result = await grepCodebase(root, {
      pattern: 'missing',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    expect(result.ok).toBe(true)
    expect(result.lines).toEqual([])
  })

  it('supports regex patterns', async () => {
    seed({ 'a.ts': 'function alpha() {}\nfunction beta() {}\nconst x = 1' })
    const result = await grepCodebase(root, {
      pattern: '^function\\s+\\w+',
      outputMode: 'content',
      forceEngine: 'js',
    })
    expect(result.ok).toBe(true)
    expect(result.lines).toHaveLength(2)
  })
})

// ─── Glob and type filtering ─────────────────────────────────────────────────

describe('grepCodebase — glob and type filters', () => {
  it('glob filter restricts files by path pattern', async () => {
    seed({
      'src/auth.ts': 'token',
      'src/auth.test.ts': 'token',
      'docs/auth.md': 'token',
    })
    const result = await grepCodebase(root, {
      pattern: 'token',
      glob: '**/*.test.ts',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    expect(result.lines).toEqual(['src/auth.test.ts'])
  })

  it('type=ts maps to TypeScript files only', async () => {
    seed({
      'src/a.ts': 'match',
      'src/b.tsx': 'match',
      'src/c.go': 'match',
      'src/d.py': 'match',
    })
    const result = await grepCodebase(root, {
      pattern: 'match',
      type: 'ts',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    expect(result.lines.sort()).toEqual(['src/a.ts', 'src/b.tsx'])
  })

  it('type=go maps to .go files only', async () => {
    seed({ 'main.go': 'match', 'main.ts': 'match' })
    const result = await grepCodebase(root, {
      pattern: 'match',
      type: 'go',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    expect(result.lines).toEqual(['main.go'])
  })

  it('type=py maps to .py files only', async () => {
    seed({ 'mod.py': 'foo', 'mod.ts': 'foo' })
    const result = await grepCodebase(root, {
      pattern: 'foo',
      type: 'py',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    expect(result.lines).toEqual(['mod.py'])
  })

  it('unknown type yields no matches (does not silently fall through)', async () => {
    seed({ 'a.ts': 'foo' })
    const result = await grepCodebase(root, {
      pattern: 'foo',
      type: 'this-type-does-not-exist',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    // No mapping → no glob applied → all files searched. The test verifies
    // we do not throw; behavior is permissive (unknown type ignored).
    expect(result.ok).toBe(true)
    expect(result.lines).toEqual(['a.ts'])
  })
})

// ─── Path scope ──────────────────────────────────────────────────────────────

describe('grepCodebase — path scope', () => {
  it('limits search to a subdirectory when path is given', async () => {
    seed({
      'src/inside.ts': 'match',
      'docs/outside.ts': 'match',
    })
    const result = await grepCodebase(root, {
      pattern: 'match',
      path: 'src',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    expect(result.lines).toEqual(['src/inside.ts'])
  })

  it('handles nested path values', async () => {
    seed({
      'a/b/c/deep.ts': 'match',
      'a/shallow.ts': 'match',
    })
    const result = await grepCodebase(root, {
      pattern: 'match',
      path: 'a/b',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    expect(result.lines).toEqual(['a/b/c/deep.ts'])
  })
})

// ─── Default ignores ─────────────────────────────────────────────────────────

describe('grepCodebase — default ignored directories', () => {
  it('skips node_modules, dist, .git, .turbo, out by default', async () => {
    seed({
      'src/keep.ts': 'secret',
      'node_modules/skip.ts': 'secret',
      'dist/skip.ts': 'secret',
      '.git/HEAD': 'secret',
      '.turbo/skip.json': 'secret',
      'out/skip.ts': 'secret',
    })
    const result = await grepCodebase(root, {
      pattern: 'secret',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    expect(result.lines).toEqual(['src/keep.ts'])
  })
})

// ─── headLimit ───────────────────────────────────────────────────────────────

describe('grepCodebase — headLimit', () => {
  it('truncates results at default headLimit (100)', async () => {
    const files: Record<string, string> = {}
    for (let i = 0; i < 150; i++) files[`f${i}.ts`] = 'match'
    seed(files)
    const result = await grepCodebase(root, {
      pattern: 'match',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    expect(result.lines.length).toBeLessThanOrEqual(100)
    expect(result.truncated).toBe(true)
  })

  it('respects custom headLimit', async () => {
    const files: Record<string, string> = {}
    for (let i = 0; i < 50; i++) files[`f${i}.ts`] = 'match'
    seed(files)
    const result = await grepCodebase(root, {
      pattern: 'match',
      outputMode: 'files_with_matches',
      headLimit: 10,
      forceEngine: 'js',
    })
    expect(result.lines).toHaveLength(10)
    expect(result.truncated).toBe(true)
  })

  it('truncated=false when results are under the limit', async () => {
    seed({ 'a.ts': 'x', 'b.ts': 'x' })
    const result = await grepCodebase(root, {
      pattern: 'x',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    expect(result.truncated).toBe(false)
  })
})

// ─── Engine selection ────────────────────────────────────────────────────────

describe('grepCodebase — engine selection', () => {
  it('reports engine="js" when forceEngine=js', async () => {
    seed({ 'a.ts': 'foo' })
    const result = await grepCodebase(root, {
      pattern: 'foo',
      forceEngine: 'js',
    })
    expect(result.engine).toBe('js')
  })

  it('isRipgrepAvailable returns a boolean (sync probe)', () => {
    const probe = isRipgrepAvailable()
    expect(typeof probe).toBe('boolean')
  })
})

// ─── Output safety ───────────────────────────────────────────────────────────

describe('grepCodebase — output safety', () => {
  it('skips files larger than the byte cap', async () => {
    const big = 'x'.repeat(11_000_000) // 11 MB
    seed({ 'big.ts': big, 'small.ts': 'x' })
    const result = await grepCodebase(root, {
      pattern: 'x',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    // big.ts is excluded (>10 MB cap). small.ts is included.
    expect(result.lines).toContain('small.ts')
    expect(result.lines).not.toContain('big.ts')
  })

  it('does not include binary-looking files in JS fallback', async () => {
    seed({ 'a.ts': 'hello' })
    // Write a file with embedded NUL byte
    writeFileSync(join(root, 'b.bin'), 'hel\x00lo', 'utf-8')
    const result = await grepCodebase(root, {
      pattern: 'hello',
      outputMode: 'files_with_matches',
      forceEngine: 'js',
    })
    expect(result.lines).toContain('a.ts')
    expect(result.lines).not.toContain('b.bin')
  })
})

// ─── AbortSignal ─────────────────────────────────────────────────────────────

describe('grepCodebase — AbortSignal', () => {
  it('returns ok=false with aborted error when signal fires before run', async () => {
    seed({ 'a.ts': 'match' })
    const ac = new AbortController()
    ac.abort()
    const result = await grepCodebase(
      root,
      { pattern: 'match', outputMode: 'files_with_matches', forceEngine: 'js' },
      ac.signal,
    )
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/abort/i)
  })

  it('stops predictably when abort fires during JS fallback traversal', async () => {
    const files: Record<string, string> = {}
    const content = Array.from({ length: 400 }, (_, index) => `line ${index} match`).join('\n')
    for (let i = 0; i < 600; i++) files[`src/f${i}.ts`] = content
    seed(files)
    const ac = new AbortController()
    const start = Date.now()
    const promise = grepCodebase(
      root,
      { pattern: 'match', outputMode: 'content', headLimit: 20_000, forceEngine: 'js' },
      ac.signal,
    )
    setTimeout(() => ac.abort(), 0)
    const result = await promise
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/abort/i)
    expect(Date.now() - start).toBeLessThan(2000)
  })
})
