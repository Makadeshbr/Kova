import type { DiffReviewDecision, DiffReviewHunk, DiffReviewSelection, FileChange } from '@kova/shared'

interface DiffLine {
  text: string
  type: 'same' | 'add' | 'remove'
  beforeLine?: number
  afterLine?: number
}

export function createDiffReviewDecision(
  changes: FileChange[],
  selection: DiffReviewSelection = approveAllSelection(changes),
): DiffReviewDecision {
  const hunks = changes.flatMap(change => buildReviewHunks(change))
  const approvedChanges = applyDiffReviewSelection(changes, selection)
  const approvedPaths = new Set(approvedChanges.map(change => change.path))
  return {
    changes,
    selection,
    approvedChanges,
    rejectedPaths: changes.filter(change => !approvedPaths.has(change.path)).map(change => change.path),
    hunks,
  }
}

export function approveAllSelection(changes: FileChange[]): DiffReviewSelection {
  return { files: changes.map(change => ({ path: change.path, decision: 'approve' as const })) }
}

export function applyDiffReviewSelection(changes: FileChange[], selection?: DiffReviewSelection): FileChange[] {
  if (!selection) return changes
  const decisions = new Map(selection.files.map(file => [file.path, file]))
  const reviewed: FileChange[] = []

  for (const change of changes) {
    const decision = decisions.get(change.path)
    if (!decision || decision.decision === 'approve') {
      reviewed.push(change)
      continue
    }
    if (decision.decision === 'reject') continue
    const partial = applyPartialHunks(change, new Set(decision.approvedHunkIds ?? []))
    if (partial) reviewed.push(partial)
  }

  return reviewed
}

export function buildReviewHunks(change: FileChange): DiffReviewHunk[] {
  if (change.type === 'create') {
    return splitLines(change.diff).map((line, index) => ({
      id: `${change.path}:add:${index + 1}`,
      path: change.path,
      type: 'add',
      beforeStart: 1,
      beforeLines: [],
      afterStart: index + 1,
      afterLines: [line],
    }))
  }
  if (change.type === 'delete') {
    return splitLines(change.before ?? '').map((line, index) => ({
      id: `${change.path}:remove:${index + 1}`,
      path: change.path,
      type: 'remove',
      beforeStart: index + 1,
      beforeLines: [line],
      afterStart: 1,
      afterLines: [],
    }))
  }
  return diffLines(splitLines(change.before ?? ''), splitLines(change.diff))
    .filter(line => line.type === 'add' || line.type === 'remove')
    .map((line, index) => ({
      id: `${change.path}:${line.type}:${index + 1}`,
      path: change.path,
      type: line.type as 'add' | 'remove',
      beforeStart: line.beforeLine ?? 1,
      beforeLines: line.type === 'remove' ? [line.text] : [],
      afterStart: line.afterLine ?? 1,
      afterLines: line.type === 'add' ? [line.text] : [],
    }))
}

function applyPartialHunks(change: FileChange, approvedHunkIds: Set<string>): FileChange | null {
  if (approvedHunkIds.size === 0) return null
  if (change.type === 'create') {
    const approvedLines = buildReviewHunks(change)
      .filter(hunk => approvedHunkIds.has(hunk.id))
      .flatMap(hunk => hunk.afterLines)
    return approvedLines.length > 0 ? { ...change, diff: approvedLines.join('\n') } : null
  }
  if (change.type === 'delete') {
    const beforeLines = splitLines(change.before ?? '')
    const remainingLines = beforeLines.filter((_, index) => !approvedHunkIds.has(`${change.path}:remove:${index + 1}`))
    if (remainingLines.length === beforeLines.length) return null
    if (remainingLines.length === 0) return change
    return { ...change, type: 'modify', diff: remainingLines.join('\n') }
  }

  const lines = diffLines(splitLines(change.before ?? ''), splitLines(change.diff))
  let changeIndex = 0
  const rebuilt: string[] = []
  for (const line of lines) {
    if (line.type === 'same') {
      rebuilt.push(line.text)
      continue
    }
    changeIndex += 1
    const id = `${change.path}:${line.type}:${changeIndex}`
    if (line.type === 'add') {
      if (approvedHunkIds.has(id)) rebuilt.push(line.text)
      continue
    }
    if (line.type === 'remove' && !approvedHunkIds.has(id)) rebuilt.push(line.text)
  }
  const next = rebuilt.join('\n')
  if (next === (change.before ?? '')) return null
  return { ...change, diff: next }
}

function diffLines(before: string[], after: string[]): DiffLine[] {
  const m = before.length
  const n = after.length
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = before[i - 1] === after[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const result: DiffLine[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && before[i - 1] === after[j - 1]) {
      result.unshift({ type: 'same', text: before[i - 1], beforeLine: i, afterLine: j })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'add', text: after[j - 1], afterLine: j, beforeLine: i + 1 })
      j--
    } else {
      result.unshift({ type: 'remove', text: before[i - 1], beforeLine: i, afterLine: j + 1 })
      i--
    }
  }
  return result
}

function splitLines(text: string): string[] {
  return text.length === 0 ? [] : text.split('\n')
}
