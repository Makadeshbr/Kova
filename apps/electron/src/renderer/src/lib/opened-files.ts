const DEFAULT_MAX_OPENED_FILES = 12

export interface CollectOpenedFilesInput {
  openFilePath: string | null
  iterationHistory?: ReadonlyArray<{ changes: ReadonlyArray<{ path: string }> }>
  maxFiles?: number
}

/**
 * Builds openedFiles for the next task: editor focus first, then paths from the
 * last execution run (newest iterations last in history).
 */
export function collectOpenedFiles(input: CollectOpenedFilesInput): string[] {
  const max = input.maxFiles ?? DEFAULT_MAX_OPENED_FILES
  const recentPaths = input.iterationHistory?.flatMap(iter => iter.changes.map(c => c.path)) ?? []
  const unique: string[] = []

  const add = (path: string | null | undefined): void => {
    if (!path || unique.includes(path)) return
    unique.push(path)
  }

  add(input.openFilePath)
  for (const path of recentPaths) {
    if (unique.length >= max) break
    add(path)
  }

  return unique.slice(0, max)
}
