/**
 * FIX-016 — glob_files helper tests.
 *
 * TDD-first: contract is locked here before the implementation exists.
 * Mirror of grep-codebase.test.ts in shape: pure helper, deterministic via
 * temp directories, no reliance on host tooling beyond fast-glob.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync, symlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir, platform } from 'node:os'
import { globFiles, type GlobOptions } from '../src/glob-files'

let projectRoot: string

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'kova-glob-files-'))
})

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true })
})

function write(rel: string, content = '', mtimeSec?: number): void {
  const abs = join(projectRoot, rel)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content)
  if (mtimeSec != null) {
    const date = new Date(mtimeSec * 1000)
    utimesSync(abs, date, date)
  }
}

const run = (opts: GlobOptions, signal?: AbortSignal) => globFiles(projectRoot, opts, signal)

describe('globFiles — basic matching', () => {
  it('matches a flat glob like "*.ts"', async () => {
    write('a.ts')
    write('b.ts')
    write('c.js')
    const result = await run({ pattern: '*.ts' })
    expect(result.ok).toBe(true)
    expect(result.paths.sort()).toEqual(['a.ts', 'b.ts'])
  })

  it('matches a recursive glob like "**/*.ts"', async () => {
    write('a.ts')
    write('src/b.ts')
    write('src/nested/c.ts')
    write('README.md')
    const result = await run({ pattern: '**/*.ts' })
    expect(result.ok).toBe(true)
    expect(result.paths.sort()).toEqual(['a.ts', 'src/b.ts', 'src/nested/c.ts'])
  })

  it('matches multiple extensions via brace expansion', async () => {
    write('a.ts')
    write('a.tsx')
    write('a.js')
    const result = await run({ pattern: '**/*.{ts,tsx}' })
    expect(result.ok).toBe(true)
    expect(result.paths.sort()).toEqual(['a.ts', 'a.tsx'])
  })

  it('matches a nested-segment glob like "src/**/components/*.tsx"', async () => {
    write('src/app/components/Button.tsx')
    write('src/app/components/Modal.tsx')
    write('src/app/util.ts')
    write('src/util.tsx')
    const result = await run({ pattern: 'src/**/components/*.tsx' })
    expect(result.ok).toBe(true)
    expect(result.paths.sort()).toEqual(['src/app/components/Button.tsx', 'src/app/components/Modal.tsx'])
  })

  it('returns an empty array (ok:true) when there are no matches', async () => {
    write('a.ts')
    const result = await run({ pattern: '**/*.go' })
    expect(result.ok).toBe(true)
    expect(result.paths).toEqual([])
    expect(result.truncated).toBe(false)
  })
})

describe('globFiles — path scoping', () => {
  it('scopes to a subdir when "path" is provided', async () => {
    write('a.ts')
    write('src/b.ts')
    write('src/nested/c.ts')
    write('other/d.ts')
    const result = await run({ pattern: '**/*.ts', path: 'src' })
    expect(result.ok).toBe(true)
    expect(result.paths.sort()).toEqual(['src/b.ts', 'src/nested/c.ts'])
  })

  it('rejects a path that escapes the project root (traversal guard)', async () => {
    const result = await run({ pattern: '**/*.ts', path: '../escape' })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/outside the project root|path traversal/i)
  })

  it('rejects an absolute path outside the project root', async () => {
    const outsideAbs = platform() === 'win32' ? 'C:\\windows\\system32' : '/etc'
    const result = await run({ pattern: '*.ts', path: outsideAbs })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/outside the project root|path traversal/i)
  })
})

describe('globFiles — default ignores', () => {
  it('does not leak files from node_modules', async () => {
    write('a.ts')
    write('node_modules/pkg/index.ts')
    write('node_modules/pkg/deep/nested.ts')
    const result = await run({ pattern: '**/*.ts' })
    expect(result.ok).toBe(true)
    expect(result.paths).toContain('a.ts')
    expect(result.paths.every(p => !p.includes('node_modules'))).toBe(true)
  })

  it('does not leak files from dist / out / .git / .turbo / coverage / .next / build / .kova', async () => {
    write('keep.ts')
    write('dist/a.ts')
    write('out/b.ts')
    write('.git/HEAD', 'ref')
    write('.turbo/c.ts')
    write('coverage/d.ts')
    write('.next/e.ts')
    write('build/f.ts')
    write('.kova/g.ts')
    const result = await run({ pattern: '**/*.ts' })
    expect(result.ok).toBe(true)
    expect(result.paths.sort()).toEqual(['keep.ts'])
  })
})

describe('globFiles — path normalization (Windows-safe)', () => {
  it('always returns forward-slash paths regardless of platform', async () => {
    write('src/deep/nested/file.ts')
    const result = await run({ pattern: '**/*.ts' })
    expect(result.ok).toBe(true)
    expect(result.paths).toContain('src/deep/nested/file.ts')
    // No backslashes ever in returned paths.
    expect(result.paths.every(p => !p.includes('\\'))).toBe(true)
  })

  it('accepts globs written with forward slashes on all platforms', async () => {
    write('src/components/Button.tsx')
    const result = await run({ pattern: 'src/components/*.tsx' })
    expect(result.ok).toBe(true)
    expect(result.paths).toEqual(['src/components/Button.tsx'])
  })
})

describe('globFiles — mtime descending sort', () => {
  it('returns most-recently-modified files first', async () => {
    write('old.ts',   '', 1_700_000_000) // 2023-11-14
    write('mid.ts',   '', 1_750_000_000) // 2025-06-15
    write('newest.ts','', 1_800_000_000) // 2027-01-15

    const result = await run({ pattern: '**/*.ts' })
    expect(result.ok).toBe(true)
    expect(result.paths).toEqual(['newest.ts', 'mid.ts', 'old.ts'])
  })

  it('ties broken by lexicographic path (deterministic)', async () => {
    const fixedTime = 1_750_000_000
    write('z.ts', '', fixedTime)
    write('a.ts', '', fixedTime)
    write('m.ts', '', fixedTime)

    const result = await run({ pattern: '**/*.ts' })
    expect(result.ok).toBe(true)
    // mtime tie → alphabetical
    expect(result.paths).toEqual(['a.ts', 'm.ts', 'z.ts'])
  })
})

describe('globFiles — head_limit', () => {
  it('caps results at the default limit (100)', async () => {
    for (let i = 0; i < 150; i++) write(`f${i}.ts`)
    const result = await run({ pattern: '**/*.ts' })
    expect(result.ok).toBe(true)
    expect(result.paths.length).toBe(100)
    expect(result.truncated).toBe(true)
  })

  it('respects a smaller user head_limit', async () => {
    for (let i = 0; i < 30; i++) write(`f${i}.ts`)
    const result = await run({ pattern: '**/*.ts', headLimit: 10 })
    expect(result.ok).toBe(true)
    expect(result.paths.length).toBe(10)
    expect(result.truncated).toBe(true)
  })

  it('caps very large head_limit at an internal MAX (defensive)', async () => {
    write('a.ts')
    const result = await run({ pattern: '**/*.ts', headLimit: 999_999 })
    expect(result.ok).toBe(true)
    // Result must still respect the requested ceiling logically — we just check
    // that the helper does not crash and returns a sensible list.
    expect(result.paths).toEqual(['a.ts'])
    expect(result.truncated).toBe(false)
  })

  it('does NOT mark truncated when result fits within head_limit', async () => {
    write('a.ts')
    write('b.ts')
    const result = await run({ pattern: '**/*.ts', headLimit: 50 })
    expect(result.ok).toBe(true)
    expect(result.truncated).toBe(false)
  })
})

describe('globFiles — input validation', () => {
  it('rejects an empty pattern', async () => {
    const result = await run({ pattern: '' })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/pattern.*empty/i)
  })

  it('rejects whitespace-only pattern', async () => {
    const result = await run({ pattern: '   ' })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/pattern.*empty/i)
  })

  it('rejects head_limit <= 0 by treating it as default', async () => {
    write('a.ts')
    const result = await run({ pattern: '**/*.ts', headLimit: 0 })
    expect(result.ok).toBe(true)
    expect(result.paths).toEqual(['a.ts'])
  })

  it('coerces negative head_limit to default', async () => {
    write('a.ts')
    const result = await run({ pattern: '**/*.ts', headLimit: -5 })
    expect(result.ok).toBe(true)
    expect(result.paths).toEqual(['a.ts'])
  })
})

describe('globFiles — symbolic links are not followed', () => {
  it('does not recurse into a symlinked directory', async () => {
    write('real/a.ts')
    const realDir = join(projectRoot, 'real')
    const linkPath = join(projectRoot, 'link')
    try {
      symlinkSync(realDir, linkPath, 'dir')
    } catch (err) {
      // Windows without symlink permission — skip the assertion silently.
      if ((err as NodeJS.ErrnoException).code === 'EPERM') return
      throw err
    }
    const result = await run({ pattern: '**/*.ts' })
    expect(result.ok).toBe(true)
    expect(result.paths).toContain('real/a.ts')
    // The symlinked twin must not show up.
    expect(result.paths.some(p => p.startsWith('link/'))).toBe(false)
  })
})

describe('globFiles — abort signal', () => {
  it('returns ok:false when aborted before start', async () => {
    write('a.ts')
    const ac = new AbortController()
    ac.abort()
    const result = await run({ pattern: '**/*.ts' }, ac.signal)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/abort/i)
  })
})

describe('globFiles — only files (no directories)', () => {
  it('does not return directories that happen to match the glob', async () => {
    mkdirSync(join(projectRoot, 'matching.ts'), { recursive: true })
    write('real.ts')
    const result = await run({ pattern: '**/*.ts' })
    expect(result.ok).toBe(true)
    expect(result.paths).toContain('real.ts')
    expect(result.paths).not.toContain('matching.ts')
  })
})

describe('globFiles — return shape', () => {
  it('has the documented shape on success', async () => {
    write('a.ts')
    const result = await run({ pattern: '**/*.ts' })
    expect(result).toMatchObject({
      ok: true,
      paths: expect.any(Array),
      truncated: false,
    })
  })

  it('has the documented shape on failure', async () => {
    const result = await run({ pattern: '' })
    expect(result).toMatchObject({
      ok: false,
      paths: [],
      truncated: false,
      error: expect.any(String),
    })
  })
})
