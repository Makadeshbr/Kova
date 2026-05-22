/**
 * FIX-015: `grep_codebase` — search across project files without making the
 * model spawn `grep` / `rg` / `findstr` via run_command (fragile on Windows
 * and blocked by allowlist policies).
 *
 * Engines:
 *   1. ripgrep on PATH — fast, respects --max-count/--max-filesize/timeout.
 *   2. JS fallback — fast-glob + RegExp. Always works; slower for huge trees.
 *
 * Output modes (mirror Claude Code Grep):
 *   - 'files_with_matches' (default): one path per line
 *   - 'content'                     : path:lineNumber:matchedLine
 *   - 'count'                       : path:count (files with >= 1 match only)
 *
 * Caller-side concerns (path traversal, staging overlay) are validated here
 * but the function is pure: it takes a projectRoot and returns a result. The
 * tool dispatcher in tools.ts is responsible for sanitising user input and
 * wrapping the call in withStagedFilesOnDisk().
 */

import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import fastGlob from 'fast-glob'

export type GrepOutputMode = 'files_with_matches' | 'content' | 'count'

export interface GrepOptions {
  /** Regex pattern (ripgrep dialect for the rg path; RegExp dialect for JS). */
  pattern: string
  /** Subdir relative to projectRoot. Defaults to the project root. */
  path?: string
  /** File path glob filter (e.g. "**\/*.test.ts"). Applied to both engines. */
  glob?: string
  /** Language type. Mapped to a glob in the JS engine; passed verbatim as --type to ripgrep. */
  type?: string
  /** Output shape. Default 'files_with_matches'. */
  outputMode?: GrepOutputMode
  /** Case-insensitive match (rg -i). Default false. */
  caseInsensitive?: boolean
  /** Maximum number of output lines. Default 100. */
  headLimit?: number
  /** Force a specific engine — used in tests to make behaviour deterministic. */
  forceEngine?: 'ripgrep' | 'js'
}

export interface GrepResult {
  /** True when the search ran successfully (even with zero matches). */
  ok: boolean
  /** Engine that produced the result. Undefined on validation failure. */
  engine?: 'ripgrep' | 'js'
  /** Output lines ready to render. Empty on no match. */
  lines: string[]
  /** True when the result was capped at headLimit. */
  truncated: boolean
  /** Human-readable error when ok=false. */
  error?: string
}

const DEFAULT_HEAD_LIMIT = 100
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB — same cap as ripgrep default
const RIPGREP_TIMEOUT_MS = 5_000
const JS_BINARY_PROBE_BYTES = 8_000

/** Directories never searched. Aligned with orchestrator STAGING_SKIP_DIRS. */
const DEFAULT_IGNORE_DIRS = [
  'node_modules', 'dist', 'out', 'build', '.next', '.turbo',
  '.git', 'coverage', '.kova',
]

/**
 * Language type → JS-engine glob. Aligned with the 14 stack adapters in
 * @kova/adapters. Unknown types are ignored silently (no filter applied).
 */
const TYPE_TO_GLOB: Record<string, string> = {
  ts: '**/*.{ts,tsx,mts,cts}',
  typescript: '**/*.{ts,tsx,mts,cts}',
  tsx: '**/*.tsx',
  js: '**/*.{js,jsx,mjs,cjs}',
  javascript: '**/*.{js,jsx,mjs,cjs}',
  jsx: '**/*.jsx',
  py: '**/*.py',
  python: '**/*.py',
  go: '**/*.go',
  rust: '**/*.rs',
  rs: '**/*.rs',
  java: '**/*.java',
  kotlin: '**/*.kt',
  kt: '**/*.kt',
  ruby: '**/*.rb',
  rb: '**/*.rb',
  php: '**/*.php',
  swift: '**/*.swift',
  dart: '**/*.dart',
  csharp: '**/*.cs',
  cs: '**/*.cs',
  cpp: '**/*.{cpp,cc,cxx,hpp,hh,hxx,h}',
  c: '**/*.{c,h}',
  md: '**/*.{md,mdx}',
  json: '**/*.json',
}

let cachedRgProbe: boolean | null = null

/**
 * Synchronous one-shot probe for ripgrep availability. Cached for the lifetime
 * of the process. Exposed so the dispatcher can choose engine without paying
 * the probe cost on every call.
 */
export function isRipgrepAvailable(): boolean {
  if (cachedRgProbe !== null) return cachedRgProbe
  try {
    const probe = spawnSync('rg', ['--version'], { stdio: 'ignore', timeout: 1_500 })
    cachedRgProbe = probe.status === 0
  } catch {
    cachedRgProbe = false
  }
  return cachedRgProbe
}

export async function grepCodebase(
  projectRoot: string,
  opts: GrepOptions,
  signal?: AbortSignal,
): Promise<GrepResult> {
  if (signal?.aborted) {
    return failure('Aborted before search started')
  }

  const validation = validateOptions(projectRoot, opts)
  if ('error' in validation) return failure(validation.error)
  const { searchRoot, headLimit, outputMode } = validation

  const useEngine: 'ripgrep' | 'js' = opts.forceEngine
    ?? (isRipgrepAvailable() ? 'ripgrep' : 'js')

  if (useEngine === 'ripgrep') {
    const rgResult = await runRipgrep(searchRoot, projectRoot, opts, headLimit, signal)
    if (rgResult) return { ...rgResult, engine: 'ripgrep' }
    // ripgrep failed unexpectedly — fall through to JS so the agent still gets a result
  }

  const jsResult = await runJsFallback(searchRoot, projectRoot, opts, headLimit, outputMode, signal)
  return { ...jsResult, engine: 'js' }
}

interface ValidatedOptions {
  searchRoot: string
  headLimit: number
  outputMode: GrepOutputMode
}

function validateOptions(
  projectRoot: string,
  opts: GrepOptions,
): ValidatedOptions | { error: string } {
  if (typeof opts.pattern !== 'string' || !opts.pattern.trim()) {
    return { error: 'pattern cannot be empty' }
  }

  const relPath = opts.path?.trim() || '.'
  const searchRoot = resolve(projectRoot, relPath)
  const rel = relative(projectRoot, searchRoot)
  if (rel.startsWith('..') || (rel === '..') || rel.startsWith(`..${sep}`)) {
    return { error: `path "${relPath}" is outside the project root (path traversal)` }
  }

  const headLimit = opts.headLimit && opts.headLimit > 0 ? Math.floor(opts.headLimit) : DEFAULT_HEAD_LIMIT
  const outputMode: GrepOutputMode = opts.outputMode ?? 'files_with_matches'
  return { searchRoot, headLimit, outputMode }
}

function failure(error: string): GrepResult {
  return { ok: false, lines: [], truncated: false, error }
}

// ─── ripgrep engine ──────────────────────────────────────────────────────────

interface RgRun {
  ok: boolean
  lines: string[]
  truncated: boolean
}

/**
 * Runs ripgrep with safe defaults. Returns null when the binary is missing or
 * the child errored before exit — caller will fall back to the JS engine.
 */
async function runRipgrep(
  searchRoot: string,
  projectRoot: string,
  opts: GrepOptions,
  headLimit: number,
  signal: AbortSignal | undefined,
): Promise<RgRun | null> {
  const args = buildRipgrepArgs(opts, headLimit)
  return new Promise((resolvePromise) => {
    let child: ReturnType<typeof spawn>
    try {
      child = spawn('rg', [...args, searchRoot], {
        cwd: projectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch {
      resolvePromise(null)
      return
    }

    let buffer = ''
    const collected: string[] = []
    let truncated = false
    let pendingResult: RgRun | null | undefined
    let closeRequested = false

    const requestClose = (result: RgRun | null) => {
      if (closeRequested) return
      closeRequested = true
      pendingResult = result
      try { child.kill() } catch { /* already gone */ }
    }

    const timeoutId = setTimeout(() => requestClose(toRun(collected, truncated)), RIPGREP_TIMEOUT_MS)
    if (signal) {
      if (signal.aborted) { clearTimeout(timeoutId); requestClose(null) }
      signal.addEventListener('abort', () => { clearTimeout(timeoutId); requestClose(null) }, { once: true })
    }

    child.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf-8')
      let nl: number
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 1)
        if (collected.length >= headLimit) { truncated = true; requestClose(toRun(collected, true)); return }
        if (line) collected.push(normaliseSep(line, projectRoot))
      }
    })

    child.on('error', () => {
      clearTimeout(timeoutId)
      resolvePromise(pendingResult ?? null)
    })

    child.on('close', (code) => {
      clearTimeout(timeoutId)
      if (pendingResult !== undefined) {
        resolvePromise(pendingResult)
        return
      }
      // ripgrep exit codes: 0 = matches, 1 = no matches, 2 = error
      if (code === 2) { resolvePromise(null); return }
      if (buffer && collected.length < headLimit) collected.push(normaliseSep(buffer, projectRoot))
      resolvePromise(toRun(collected, truncated))
    })
  })
}

function toRun(collected: string[], truncated: boolean): RgRun {
  return { ok: true, lines: collected, truncated }
}

function buildRipgrepArgs(opts: GrepOptions, headLimit: number): string[] {
  const args: string[] = [
    '--no-config',
    '--max-filesize', '10M',
    '--max-count', '50',
    '--no-heading',
    '--color', 'never',
  ]

  switch (opts.outputMode ?? 'files_with_matches') {
    case 'files_with_matches': args.push('--files-with-matches'); break
    case 'count':              args.push('--count-matches');     break
    case 'content':            args.push('--line-number');       break
  }

  if (opts.caseInsensitive) args.push('--ignore-case')
  if (opts.type) args.push('--type', opts.type)
  if (opts.glob) args.push('--glob', opts.glob)

  for (const dir of DEFAULT_IGNORE_DIRS) args.push('--glob', `!**/${dir}/**`)

  // Overall result cap is enforced on the consumer side by reading at most headLimit lines.
  // We pass --max-count per file to keep ripgrep memory bounded on noisy patterns.
  void headLimit

  args.push('--regexp', opts.pattern)
  return args
}

function normaliseSep(line: string, projectRoot: string): string {
  // ripgrep prints absolute paths because we pass it the resolved searchRoot.
  // Strip the projectRoot prefix and unify separators to forward slashes for
  // consistency with the JS engine and FileChange.path everywhere else.
  const prefix = projectRoot.endsWith(sep) ? projectRoot : projectRoot + sep
  let trimmed = line.startsWith(prefix) ? line.slice(prefix.length) : line
  trimmed = trimmed.replace(/\\/g, '/')
  return trimmed
}

// ─── JS fallback engine ──────────────────────────────────────────────────────

interface JsRun {
  ok: boolean
  lines: string[]
  truncated: boolean
  error?: string
}

async function runJsFallback(
  searchRoot: string,
  projectRoot: string,
  opts: GrepOptions,
  headLimit: number,
  outputMode: GrepOutputMode,
  signal: AbortSignal | undefined,
): Promise<JsRun> {
  if (signal?.aborted) return abortedRun('Aborted during grep')

  let regex: RegExp
  try {
    regex = new RegExp(opts.pattern, opts.caseInsensitive ? 'i' : '')
  } catch {
    return { ok: false, lines: [], truncated: false }
  }

  // Build the combined glob list. fast-glob's `cwd` controls the base.
  const positiveGlobs: string[] = ['**/*']
  if (opts.glob) positiveGlobs[0] = opts.glob
  else if (opts.type && TYPE_TO_GLOB[opts.type.toLowerCase()]) {
    positiveGlobs[0] = TYPE_TO_GLOB[opts.type.toLowerCase()]
  }

  const ignoreGlobs = DEFAULT_IGNORE_DIRS.map(dir => `**/${dir}/**`)

  let candidates: string[]
  try {
    candidates = await fastGlob(positiveGlobs, {
      cwd: searchRoot,
      ignore: ignoreGlobs,
      dot: true,
      onlyFiles: true,
      followSymbolicLinks: false,
      suppressErrors: true,
    })
  } catch {
    return { ok: false, lines: [], truncated: false }
  }

  candidates.sort()

  const lines: string[] = []
  let truncated = false

  for (let i = 0; i < candidates.length; i++) {
    if (i % 100 === 0) {
      const aborted = await abortCheckpoint(signal, 'Aborted during grep')
      if (aborted) return abortedRun(aborted)
    }
    const rel = candidates[i]
    if (lines.length >= headLimit) { truncated = true; break }

    const absPath = join(searchRoot, rel)
    let bytes: Buffer
    try {
      const stat = statSync(absPath)
      if (!stat.isFile()) continue
      if (stat.size > MAX_FILE_BYTES) continue
      bytes = readFileSync(absPath)
    } catch { continue }

    // Crude binary detection: NUL byte in the first ~8 KB.
    const probe = bytes.subarray(0, Math.min(JS_BINARY_PROBE_BYTES, bytes.length))
    if (probe.includes(0)) continue

    const text = bytes.toString('utf-8')
    const relFromRoot = relative(projectRoot, absPath).replace(/\\/g, '/')

    const outcome = await matchInFile(text, regex, relFromRoot, outputMode, headLimit - lines.length, signal)
    if (outcome.aborted) return abortedRun('Aborted during grep')
    for (const out of outcome.lines) lines.push(out)
    if (outcome.fileTruncated) { truncated = true; break }
  }

  return { ok: true, lines, truncated }
}

interface FileMatchOutcome {
  lines: string[]
  /** True when this file alone caused the global headLimit to be hit. */
  fileTruncated: boolean
  /** True when AbortSignal fired while scanning this file. */
  aborted?: boolean
}

async function matchInFile(
  text: string,
  regex: RegExp,
  relPath: string,
  outputMode: GrepOutputMode,
  remainingSlots: number,
  signal: AbortSignal | undefined,
): Promise<FileMatchOutcome> {
  if (outputMode === 'files_with_matches') {
    if (regex.test(text)) return { lines: [relPath], fileTruncated: false }
    return { lines: [], fileTruncated: false }
  }

  if (outputMode === 'count') {
    // Re-create the regex with global flag for counting; tolerates user pattern w/o /g.
    const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g')
    const matches = text.match(globalRegex)
    if (!matches || matches.length === 0) return { lines: [], fileTruncated: false }
    return { lines: [`${relPath}:${matches.length}`], fileTruncated: false }
  }

  // 'content' — emit path:line:content
  const out: string[] = []
  const fileLines = text.split('\n')
  for (let i = 0; i < fileLines.length; i++) {
    if (i % 100 === 0) {
      const aborted = await abortCheckpoint(signal, 'Aborted during grep')
      if (aborted) return { lines: out, fileTruncated: false, aborted: true }
    }
    if (out.length >= remainingSlots) return { lines: out, fileTruncated: true }
    if (regex.test(fileLines[i])) {
      out.push(`${relPath}:${i + 1}:${fileLines[i]}`)
    }
  }
  return { lines: out, fileTruncated: false }
}

function abortedRun(error: string): JsRun {
  return { ok: false, lines: [], truncated: false, error }
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
