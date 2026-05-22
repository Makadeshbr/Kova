/**
 * FIX-016: `glob_files` — list project files matching a glob pattern, sorted
 * most-recently-modified first. Mirrors Claude Code's Glob tool.
 *
 * Why a dedicated tool: without it the model would either spam `list_files`
 * recursively (slow, many round trips) or try `run_command find` (blocked on
 * Windows, fragile on *nix, and often blocked by allowlist policies).
 *
 * Engine: fast-glob (same dep used by FIX-015). Pure function — takes a
 * projectRoot and returns a deterministic result. The tool dispatcher in
 * tools.ts is responsible for sanitising input and wrapping the call in
 * withStagedFilesOnDisk() so staged writes are visible.
 */

import { statSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import fastGlob from 'fast-glob'

export interface GlobOptions {
  /** Glob pattern, forward-slash style. e.g. "**\/*.tsx", "src/**\/components/*.ts" */
  pattern: string
  /** Subdir relative to projectRoot. Defaults to the project root. */
  path?: string
  /** Maximum number of paths returned. Default 100, hard ceiling 500. */
  headLimit?: number
}

export interface GlobResult {
  /** True when the glob ran successfully (even with zero matches). */
  ok: boolean
  /** Matching file paths, forward-slash, relative to projectRoot. */
  paths: string[]
  /** True when the result was capped at headLimit. */
  truncated: boolean
  /** Human-readable error when ok=false. */
  error?: string
}

const DEFAULT_HEAD_LIMIT = 100
/** Defensive ceiling so an "all files" query can't blow up the agent context. */
const MAX_HEAD_LIMIT = 500

/** Directories never listed. Aligned with grep-codebase + orchestrator STAGING_SKIP_DIRS. */
const DEFAULT_IGNORE_DIRS = [
  'node_modules', 'dist', 'out', 'build', '.next', '.turbo',
  '.git', 'coverage', '.kova',
]

export async function globFiles(
  projectRoot: string,
  opts: GlobOptions,
  signal?: AbortSignal,
): Promise<GlobResult> {
  if (signal?.aborted) {
    return failure('Aborted before glob started')
  }

  const validation = validateOptions(projectRoot, opts)
  if ('error' in validation) return failure(validation.error)
  const { searchRoot, headLimit } = validation

  let candidates: string[]
  try {
    candidates = await fastGlob([opts.pattern], {
      cwd: searchRoot,
      ignore: DEFAULT_IGNORE_DIRS.map(dir => `**/${dir}/**`),
      dot: true,
      onlyFiles: true,
      followSymbolicLinks: false,
      suppressErrors: true,
    })
  } catch (err) {
    return failure(`glob failed: ${(err as Error).message}`)
  }

  if (signal?.aborted) return failure('Aborted during glob')

  // Statting every candidate to get mtime is O(N) but acceptable: headLimit
  // bounds N in practice, and we already filtered binary trees via ignores.
  type Entry = { path: string; mtimeMs: number }
  const entries: Entry[] = []
  for (let i = 0; i < candidates.length; i++) {
    if (i % 100 === 0) {
      const aborted = await abortCheckpoint(signal, 'Aborted during glob')
      if (aborted) return failure(aborted)
    }
    const rel = candidates[i]
    const abs = join(searchRoot, rel)
    let mtimeMs = 0
    try {
      const stat = statSync(abs)
      if (!stat.isFile()) continue
      mtimeMs = stat.mtimeMs
    } catch {
      continue
    }
    // Normalize to projectRoot-relative, forward-slash.
    const relFromRoot = relative(projectRoot, abs).replace(/\\/g, '/')
    entries.push({ path: relFromRoot, mtimeMs })
  }

  // Sort: mtime descending, then path ascending for deterministic tie-break.
  entries.sort((a, b) => {
    if (b.mtimeMs !== a.mtimeMs) return b.mtimeMs - a.mtimeMs
    return a.path.localeCompare(b.path)
  })
  if (signal?.aborted) return failure('Aborted during glob')

  const truncated = entries.length > headLimit
  const paths = truncated ? entries.slice(0, headLimit).map(e => e.path) : entries.map(e => e.path)

  return { ok: true, paths, truncated }
}

interface ValidatedOptions {
  searchRoot: string
  headLimit: number
}

function validateOptions(
  projectRoot: string,
  opts: GlobOptions,
): ValidatedOptions | { error: string } {
  if (typeof opts.pattern !== 'string' || !opts.pattern.trim()) {
    return { error: 'pattern cannot be empty' }
  }

  const rawPath = opts.path?.trim() || '.'
  // Absolute paths are only allowed when they resolve inside projectRoot.
  // Anything that resolves outside (../escape, /etc, C:\windows) is rejected.
  const searchRoot = isAbsolute(rawPath) ? resolve(rawPath) : resolve(projectRoot, rawPath)
  const rel = relative(projectRoot, searchRoot)
  if (rel.startsWith('..') || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    return { error: `path "${rawPath}" is outside the project root (path traversal)` }
  }

  const userLimit = opts.headLimit && opts.headLimit > 0 ? Math.floor(opts.headLimit) : DEFAULT_HEAD_LIMIT
  const headLimit = Math.min(userLimit, MAX_HEAD_LIMIT)
  return { searchRoot, headLimit }
}

function failure(error: string): GlobResult {
  return { ok: false, paths: [], truncated: false, error }
}

function abortCheckpoint(signal: AbortSignal | undefined, message: string): Promise<string | null> {
  if (!signal) return Promise.resolve(null)
  if (signal?.aborted) return Promise.resolve(message)
  return new Promise(resolvePromise => {
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', onAbort)
      resolvePromise(null)
    }, 0)
    const onAbort = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
      resolvePromise(message)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
