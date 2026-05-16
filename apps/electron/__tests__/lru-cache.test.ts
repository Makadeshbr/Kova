/**
 * FIX-010: LruCache used by EngineManager to bound memory growth across projects.
 *
 * Without it, opening 10 projects keeps 10 ContextEngine + MemorySystem instances
 * in memory forever. This LRU caps the live set at MAX_PROJECTS (default 3) and
 * evicts the least-recently-used entry when full.
 */
import { describe, it, expect } from 'vitest'
import { LruCache } from '../src/main/lru-cache'

describe('LruCache — basics', () => {
  it('stores and retrieves values', () => {
    const cache = new LruCache<string, number>(3)
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
    expect(cache.size).toBe(1)
  })

  it('returns undefined for missing keys', () => {
    const cache = new LruCache<string, number>(3)
    expect(cache.get('missing')).toBeUndefined()
  })

  it('size grows with inserts up to capacity', () => {
    const cache = new LruCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    expect(cache.size).toBe(3)
  })
})

describe('LruCache — eviction', () => {
  it('evicts the least-recently-used entry when capacity is exceeded', () => {
    const cache = new LruCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3) // 'a' should be evicted (oldest, never accessed)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
    expect(cache.size).toBe(2)
  })

  it('a get() refreshes recency, protecting the entry from eviction', () => {
    const cache = new LruCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.get('a')).toBe(1) // bump 'a' to most-recent
    cache.set('c', 3)              // evicts 'b' instead
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBe(3)
  })

  it('a re-set() of an existing key updates the value AND refreshes recency', () => {
    const cache = new LruCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('a', 99)             // refresh 'a'
    cache.set('c', 3)              // evicts 'b' (now oldest)
    expect(cache.get('a')).toBe(99)
    expect(cache.get('b')).toBeUndefined()
  })

  it('returns the evicted key from set() so callers can dispose resources', () => {
    const cache = new LruCache<string, number>(1)
    expect(cache.set('a', 1)).toEqual({ evicted: undefined })
    expect(cache.set('b', 2)).toEqual({ evicted: { key: 'a', value: 1 } })
  })
})

describe('LruCache — capacity edge cases', () => {
  it('capacity of 1 holds only the latest entry', () => {
    const cache = new LruCache<string, number>(1)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
  })

  it('throws on capacity <= 0', () => {
    expect(() => new LruCache<string, number>(0)).toThrow()
    expect(() => new LruCache<string, number>(-1)).toThrow()
  })
})

describe('LruCache — explicit operations', () => {
  it('delete() removes a key and returns true if it existed', () => {
    const cache = new LruCache<string, number>(3)
    cache.set('a', 1)
    expect(cache.delete('a')).toBe(true)
    expect(cache.delete('a')).toBe(false)
    expect(cache.size).toBe(0)
  })

  it('clear() removes all entries', () => {
    const cache = new LruCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeUndefined()
  })

  it('has() does NOT refresh recency (read-only check)', () => {
    const cache = new LruCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.has('a')).toBe(true)  // peek, no refresh
    cache.set('c', 3)                   // 'a' still oldest, gets evicted
    expect(cache.has('a')).toBe(false)
    expect(cache.has('b')).toBe(true)
  })
})
