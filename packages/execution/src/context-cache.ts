/**
 * FIX-019 — context cache key + invalidation policy.
 *
 * Pure helpers used by ExecutionEngine to skip a full ContextEngine rebuild
 * (grep + dependency graph + memory query) when nothing meaningful changed
 * between repair iterations.
 *
 * Policy summary:
 *  - First iteration always builds fresh (no prev key yet).
 *  - TTL: rebuild after 3 iterations even if inputs look stable. Bounded so
 *    a long-running session never reuses stale grep results indefinitely.
 *  - Rebuild when task, explicitFiles, openedFiles, or diff changes.
 *  - Rebuild when harness reveals a NEW error file (error surface moved).
 *  - Reuse when the error file set shrinks or stays the same (same surface,
 *    same files to inspect, just fewer issues to fix).
 */

import type { HarnessError } from '@kova/shared'

/** Max iterations a cached AgentContext may be reused before forced rebuild. */
export const CONTEXT_CACHE_TTL = 3

export interface ContextCacheInputs {
  taskId: string
  explicitFiles?: string[]
  openedFiles?: string[]
  diff?: string
  harnessErrors?: HarnessError[]
}

export interface ContextCacheKey {
  taskId: string
  explicit: string[]
  opened: string[]
  diff: string
  errorFiles: string[]
}

export function buildContextCacheKey(inputs: ContextCacheInputs): ContextCacheKey {
  return {
    taskId: inputs.taskId,
    explicit: dedupSort(inputs.explicitFiles),
    opened: dedupSort(inputs.openedFiles),
    diff: inputs.diff ?? '',
    errorFiles: dedupSort((inputs.harnessErrors ?? [])
      .map(e => e.file)
      .filter((f): f is string => typeof f === 'string' && f.length > 0)),
  }
}

/**
 * Cache reuse decision. Returns true ONLY when every invariant holds:
 *   age < TTL, same task, same explicit/opened/diff, and error files are a
 *   subset of the previously seen set (no new error surface revealed).
 */
export function shouldReuseContext(
  prev: ContextCacheKey | null,
  next: ContextCacheKey,
  ageInIterations: number,
): boolean {
  if (!prev) return false
  if (ageInIterations >= CONTEXT_CACHE_TTL) return false
  if (prev.taskId !== next.taskId) return false
  if (!arraysEqual(prev.explicit, next.explicit)) return false
  if (!arraysEqual(prev.opened, next.opened)) return false
  if (prev.diff !== next.diff) return false
  return isSubset(next.errorFiles, prev.errorFiles)
}

function dedupSort(arr: string[] | undefined): string[] {
  if (!arr || arr.length === 0) return []
  return Array.from(new Set(arr)).sort()
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function isSubset(subset: string[], superset: string[]): boolean {
  if (subset.length === 0) return true
  const set = new Set(superset)
  for (const item of subset) if (!set.has(item)) return false
  return true
}
