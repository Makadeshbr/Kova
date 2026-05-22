import type { FileChange, IterationRecord } from '@kova/shared'

/**
 * Consolidates the final patch across multiple iterations.
 *
 * Repair/continuation loops often create files in one iteration and then touch
 * different files in the next. The user reviews and applies the whole task, not
 * only the last model turn, so downstream apply/proof code must see the latest
 * final state per path across the entire run.
 */
export function consolidateIterationChanges(iterations: IterationRecord[]): FileChange[] {
  const byPath = new Map<string, FileChange>()

  for (const iteration of iterations) {
    for (const change of iteration.changes) {
      const previous = byPath.get(change.path)
      if (!previous) {
        byPath.set(change.path, { ...change })
        continue
      }

      if (previous.type === 'create' && previous.before === undefined) {
        if (change.type === 'delete') {
          byPath.delete(change.path)
        } else {
          byPath.set(change.path, {
            ...change,
            type: 'create',
            before: undefined,
          })
        }
        continue
      }

      if (change.type === 'delete') {
        byPath.set(change.path, {
          ...change,
          before: previous.before ?? change.before,
        })
        continue
      }

      byPath.set(change.path, {
        ...change,
        before: previous.before ?? change.before,
      })
    }
  }

  return [...byPath.values()]
}

export function consolidateWithPendingChanges(
  iterations: IterationRecord[],
  pending: FileChange[],
): FileChange[] {
  if (pending.length === 0) return consolidateIterationChanges(iterations)
  return consolidateIterationChanges([
    ...iterations,
    {
      iteration: -1,
      agentMode: 'pending',
      agentThought: '',
      changes: pending,
      harnessResult: {
        passed: false,
        score: 0,
        layers: [],
        duration: 0,
        iteration: -1,
      },
      decision: {
        decision: 'reject',
        score: 0,
        reason: 'pending',
        feedback: [],
      },
      duration: 0,
      tokensUsed: 0,
    },
  ])
}
