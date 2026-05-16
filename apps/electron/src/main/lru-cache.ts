/**
 * FIX-010: Bounded LRU cache built on top of native Map.
 *
 * Map preserves insertion order, so the "oldest" entry is the first key returned by
 * iteration. We exploit this:
 *   - get()/has() do NOT refresh recency (peek behaviour)
 *   - get() with refresh would mutate during read; we explicitly bump on access
 *   - set() of an existing key removes it first so the re-insert lands at the tail
 *
 * Used by EngineManager to bound ContextEngine + MemorySystem instances across
 * project switches. Without it, opening 10 projects pins 10 instances forever.
 */

export interface SetResult<K, V> {
  evicted: { key: K; value: V } | undefined
}

export class LruCache<K, V> {
  private readonly store = new Map<K, V>()

  constructor(private readonly capacity: number) {
    if (capacity <= 0) throw new Error(`LruCache capacity must be > 0 (got ${capacity})`)
  }

  get size(): number {
    return this.store.size
  }

  has(key: K): boolean {
    return this.store.has(key)
  }

  /**
   * Returns the value AND moves the key to the most-recent position so it's
   * protected from the next eviction.
   */
  get(key: K): V | undefined {
    if (!this.store.has(key)) return undefined
    const value = this.store.get(key)!
    // Re-insert to refresh recency
    this.store.delete(key)
    this.store.set(key, value)
    return value
  }

  /**
   * Inserts or updates a value. Always lands at the most-recent position. If the
   * cache is at capacity and the key is new, the least-recently-used entry is
   * evicted and returned so the caller can dispose its resources.
   */
  set(key: K, value: V): SetResult<K, V> {
    let evicted: { key: K; value: V } | undefined
    if (this.store.has(key)) {
      // Existing key: drop and re-insert to refresh position
      this.store.delete(key)
    } else if (this.store.size >= this.capacity) {
      // New key, capacity full: evict the oldest (first inserted)
      const oldestKey = this.store.keys().next().value as K | undefined
      if (oldestKey !== undefined) {
        const oldestValue = this.store.get(oldestKey)!
        this.store.delete(oldestKey)
        evicted = { key: oldestKey, value: oldestValue }
      }
    }
    this.store.set(key, value)
    return { evicted }
  }

  delete(key: K): boolean {
    return this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}
