/**
 * FIX-019 — context cache pure helpers.
 *
 * Two functions:
 *  - buildContextCacheKey(inputs) → stable, comparable key
 *  - shouldReuseContext(prev, next, ageInIterations) → boolean
 *
 * Kept pure so the cache rules can be unit-tested without spinning up
 * ExecutionEngine + ContextEngine + Agent.
 */
import { describe, it, expect } from 'vitest'
import type { HarnessError } from '@kova/shared'
import {
  buildContextCacheKey,
  shouldReuseContext,
  CONTEXT_CACHE_TTL,
  type ContextCacheKey,
} from '../src/context-cache'

const err = (file: string, type = 'compile'): HarnessError => ({
  layer: 'build',
  type,
  severity: 'high',
  fixable: true,
  message: 'x',
  humanMessage: 'x',
  file,
})

describe('buildContextCacheKey', () => {
  it('captures task, files, diff, and the set of error files', () => {
    const key = buildContextCacheKey({
      taskId: 'task-1',
      explicitFiles: ['src/a.ts'],
      openedFiles: ['src/b.ts'],
      diff: 'diff-blob',
      harnessErrors: [err('src/a.ts'), err('src/c.ts')],
    })
    expect(key.taskId).toBe('task-1')
    expect(key.explicit).toEqual(['src/a.ts'])
    expect(key.opened).toEqual(['src/b.ts'])
    expect(key.diff).toBe('diff-blob')
    // error files are stored as a sorted Set-like array so set-equality is cheap
    expect(key.errorFiles).toEqual(['src/a.ts', 'src/c.ts'])
  })

  it('sorts file lists so order does not matter for equality', () => {
    const a = buildContextCacheKey({
      taskId: 'task-1',
      explicitFiles: ['z.ts', 'a.ts'],
      openedFiles: ['y.ts', 'b.ts'],
      diff: '',
      harnessErrors: [err('z.ts'), err('a.ts')],
    })
    const b = buildContextCacheKey({
      taskId: 'task-1',
      explicitFiles: ['a.ts', 'z.ts'],
      openedFiles: ['b.ts', 'y.ts'],
      diff: '',
      harnessErrors: [err('a.ts'), err('z.ts')],
    })
    expect(a).toEqual(b)
  })

  it('deduplicates repeated file paths', () => {
    const key = buildContextCacheKey({
      taskId: 'task-1',
      explicitFiles: ['a.ts', 'a.ts'],
      openedFiles: [],
      diff: '',
      harnessErrors: [err('a.ts'), err('a.ts'), err('b.ts')],
    })
    expect(key.explicit).toEqual(['a.ts'])
    expect(key.errorFiles).toEqual(['a.ts', 'b.ts'])
  })

  it('handles undefined optional inputs without crashing', () => {
    const key = buildContextCacheKey({
      taskId: 'task-1',
      explicitFiles: undefined,
      openedFiles: undefined,
      diff: undefined,
      harnessErrors: undefined,
    })
    expect(key).toEqual({
      taskId: 'task-1',
      explicit: [],
      opened: [],
      diff: '',
      errorFiles: [],
    })
  })

  it('skips error entries without a file path (some harness errors lack location)', () => {
    const key = buildContextCacheKey({
      taskId: 'task-1',
      explicitFiles: [],
      openedFiles: [],
      diff: '',
      harnessErrors: [err('a.ts'), { ...err(''), file: undefined } as HarnessError],
    })
    expect(key.errorFiles).toEqual(['a.ts'])
  })
})

describe('shouldReuseContext', () => {
  const baseKey = (overrides: Partial<ContextCacheKey> = {}): ContextCacheKey => ({
    taskId: 'task-1',
    explicit: [],
    opened: [],
    diff: '',
    errorFiles: [],
    ...overrides,
  })

  it('reuses when nothing changed and age < TTL', () => {
    expect(shouldReuseContext(baseKey(), baseKey(), 1)).toBe(true)
    expect(shouldReuseContext(baseKey(), baseKey(), CONTEXT_CACHE_TTL - 1)).toBe(true)
  })

  it('invalidates when age >= TTL (3 iterations by default)', () => {
    expect(shouldReuseContext(baseKey(), baseKey(), CONTEXT_CACHE_TTL)).toBe(false)
    expect(shouldReuseContext(baseKey(), baseKey(), 99)).toBe(false)
  })

  it('invalidates when taskId changes', () => {
    expect(shouldReuseContext(baseKey({ taskId: 't1' }), baseKey({ taskId: 't2' }), 1)).toBe(false)
  })

  it('invalidates when explicitFiles changes', () => {
    expect(shouldReuseContext(
      baseKey({ explicit: ['a.ts'] }),
      baseKey({ explicit: ['b.ts'] }),
      1,
    )).toBe(false)
  })

  it('invalidates when openedFiles changes', () => {
    expect(shouldReuseContext(
      baseKey({ opened: ['a.ts'] }),
      baseKey({ opened: ['a.ts', 'b.ts'] }),
      1,
    )).toBe(false)
  })

  it('invalidates when diff changes', () => {
    expect(shouldReuseContext(
      baseKey({ diff: 'v1' }),
      baseKey({ diff: 'v2' }),
      1,
    )).toBe(false)
  })

  it('invalidates when harness reveals a NEW error file', () => {
    // Same task, same explicit/opened/diff, but errors moved to a new file
    expect(shouldReuseContext(
      baseKey({ errorFiles: ['src/auth.ts'] }),
      baseKey({ errorFiles: ['src/auth.ts', 'src/totally-new.ts'] }),
      1,
    )).toBe(false)
  })

  it('REUSES when error files shrink (subset of previous) — same surface, fewer issues', () => {
    expect(shouldReuseContext(
      baseKey({ errorFiles: ['a.ts', 'b.ts'] }),
      baseKey({ errorFiles: ['a.ts'] }),
      1,
    )).toBe(true)
  })

  it('REUSES when error files are identical', () => {
    expect(shouldReuseContext(
      baseKey({ errorFiles: ['a.ts', 'b.ts'] }),
      baseKey({ errorFiles: ['a.ts', 'b.ts'] }),
      1,
    )).toBe(true)
  })

  it('invalidates when no prev key exists (first call always builds fresh)', () => {
    expect(shouldReuseContext(null, baseKey(), 0)).toBe(false)
  })

  it('TTL is 3 (locked invariant — keep cache useful but bounded)', () => {
    expect(CONTEXT_CACHE_TTL).toBe(3)
  })
})
