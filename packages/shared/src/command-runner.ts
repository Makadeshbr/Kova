import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, resolve, relative, sep } from 'node:path'

export type ValidationCommandKind = 'test' | 'build' | 'lint' | 'typecheck' | 'format' | 'security' | 'run'

/**
 * Real-time callback fired for each line of stdout/stderr emitted by a `run_command`
 * tool invocation. `commandId` correlates lines back to a single command (set by the
 * caller, typically a UUID generated when the command starts).
 */
export type CommandOutputCallback = (commandId: string, line: string, stream: 'stdout' | 'stderr') => void

export interface CommandInvocationInput {
  command: string
  workspaceRoot: string
  cwd?: string
  kind?: ValidationCommandKind
  timeoutMs?: number
  signal?: AbortSignal
  /** Called for each output line in real-time (requires spawn mode). */
  onLine?: (line: string, stream: 'stdout' | 'stderr') => void
  /**
   * Workspace-relative paths the caller knows will exist by the time the
   * command runs (e.g. files staged in @kova/agent's ToolExecutor buffer that
   * will be materialised by `withStagedFilesOnDisk` before exec). Used by the
   * manifest validator so the agent can write `package.json` and run
   * `pnpm install` in the same iteration.
   */
  additionalManifests?: string[]
}

export interface NormalizedCommandInvocation {
  command: string
  executable: string
  args: string[]
  cwd: string
  relativeCwd: string
  kind: ValidationCommandKind
  warning?: string
}

export interface CommandPolicyBlock {
  ok: false
  reason: string
  hint?: string
}

export type CommandPolicyResult =
  | ({ ok: true } & NormalizedCommandInvocation)
  | CommandPolicyBlock

export interface CommandRunResult {
  command: string
  cwd: string
  kind: ValidationCommandKind
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  startedAt: string
  timedOut: boolean
}

/**
 * Patterns that are dangerous regardless of context — they always block.
 * Matches the security model of Claude Code / Cursor / Codex: a permissive
 * blocklist plus an approval gate (`permissionPolicy.bash`) for the user.
 *
 * Adding to this list is the only safety control that survives the agent
 * deciding to run something off-piste. Everything NOT matching here is
 * allowed at this layer — UI-side approval still applies.
 */
const DANGEROUS_PATTERNS = [
  // Destructive filesystem ops
  /\brm\s+-rf\b/i,
  /\brm\s+-r\b/i,
  /\bdel\s+\/f\b/i,
  /\brd\s+\/s\b/i,
  /\brmdir\s+\/s\b/i,
  // Privilege escalation
  /\bsudo\b/i,
  /\brunas\b/i,
  // Permission destruction
  /\bchmod\s+(?:-r|777|666)\b/i,
  /\bchown\b/i,
  // Arbitrary shell execution
  /\b(?:bash|sh|zsh|fish|pwsh|powershell)\s+-c\b/i,
  /\beval\b/i,
  /\bexec\b/i,
  // Git destructive
  /\bgit\s+push\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-f/i,
  /\bgit\s+force-/i,
  // Remote shell / exfiltration
  /\b(?:ssh|scp|nc|netcat|ncat|telnet)\b/i,
  /\b(?:curl|wget)\s+https?:\/\//i,
  // Fork bomb
  /:\(\)\{/,
  // Publishing without approval (deploys)
  /\b(?:npm|pnpm|yarn|cargo)\s+publish\b/i,
  // Raw disk / filesystem-destroy
  /\bdd\s+if=/i,
  /\bmkfs(?:\.\w+)?\b/i,
  /\bformat\s+[a-z]:/i,
  /\bdiskpart\b/i,
  /\bfdisk\b/i,
  // Power state
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bhalt\b/i,
  /\bpoweroff\b/i,
  // Credential / auth destruction
  /\bnpm\s+logout\b/i,
  /\bgh\s+auth\s+logout\b/i,
]

const WINDOWS_CMD_SHIMS = new Set(['npm', 'npx', 'pnpm', 'yarn', 'bun'])
const WINDOWS_SHELL_BUILTINS = new Set(['dir', 'type', 'echo'])
const MANIFEST_REQUIRED = new Set(['go', 'npm', 'npx', 'pnpm', 'yarn', 'bun', 'cargo', 'mvn', 'gradle', 'gradlew', 'dotnet', 'composer', 'bundle', 'poetry', 'uv', 'flutter'])
const PROJECT_MANIFESTS = [
  'package.json', 'go.mod', 'Cargo.toml', 'pyproject.toml', 'setup.py', 'setup.cfg',
  'requirements.txt', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'composer.json',
  'Gemfile', 'pubspec.yaml', 'Package.swift', 'CMakeLists.txt', 'Makefile', 'makefile',
  'Taskfile.yml', 'Taskfile.yaml', 'justfile', 'Justfile',
]

export function normalizeCommandInvocation(input: CommandInvocationInput): CommandPolicyResult {
  const workspaceRoot = resolve(input.workspaceRoot)
  const command = input.command.trim()
  if (!command) return block('Empty command.')

  const baseCwd = resolveCommandCwd(workspaceRoot, input.cwd)
  if (!baseCwd.ok) return baseCwd

  const cd = extractSimpleCd(command)
  let effectiveCommand = command
  let cwd = baseCwd.cwd
  let warning: string | undefined
  if (cd) {
    const cdCwd = resolveCommandCwd(workspaceRoot, cd.dir)
    if (!cdCwd.ok) return cdCwd
    cwd = cdCwd.cwd
    effectiveCommand = cd.command.trim()
    warning = 'Command with cd was converted to structured execution with cwd.'
  } else if (/^\s*cd\s+/i.test(command)) {
    return block('Command blocked because it uses cd/shell composition.', 'Use structured execution with cwd.')
  }

  const stripped = stripNativeStderrMerge(effectiveCommand)
  effectiveCommand = stripped.command
  warning = warning ?? stripped.warning

  const meta = findShellMeta(effectiveCommand)
  if (meta) {
    return block(`Command blocked because it contains shell composition/redirection (${meta}).`, 'Use a single validation command and let the executor capture stdout/stderr.')
  }

  if (DANGEROUS_PATTERNS.some(pattern => pattern.test(effectiveCommand))) {
    return block('Dangerous command blocked by policy.')
  }

  const parsed = parseCommandLine(effectiveCommand)
  if (!parsed.ok) return block(parsed.reason)
  if (parsed.tokens.length === 0) return block('Empty command.')

  if (isInteractiveCommand(parsed.tokens)) {
    return block('Interactive command blocked.', 'Use run_interactive_command so the user can approve and interact with it.')
  }

  const executable = normalizeExecutableName(parsed.tokens[0])

  // PERMISSIVE POLICY (Claude Code / Cursor / Codex parity): any binary is
  // allowed unless it matches a DANGEROUS_PATTERN. The runtime approval gate
  // (`permissionPolicy.bash`) is the user-facing safety control — set it to
  // 'ask' to require per-command approval.

  const manifestError = validateManifestRequirement(
    executable, parsed.tokens, cwd, workspaceRoot, input.additionalManifests,
  )
  if (manifestError) return block(manifestError)

  return {
    ok: true,
    command: parsed.tokens.join(' '),
    executable: executableForPlatform(parsed.tokens[0]),
    args: parsed.tokens.slice(1),
    cwd,
    relativeCwd: relativeLabel(workspaceRoot, cwd),
    kind: input.kind ?? inferCommandKind(parsed.tokens),
    warning,
  }
}

export async function runCommandInvocation(input: CommandInvocationInput): Promise<CommandRunResult> {
  const normalized = normalizeCommandInvocation(input)
  const startedAt = new Date().toISOString()
  const start = Date.now()
  if (!normalized.ok) {
    return {
      command: input.command,
      cwd: resolve(input.cwd ? resolve(input.workspaceRoot, input.cwd) : input.workspaceRoot),
      kind: input.kind ?? 'run',
      stdout: '',
      stderr: `${normalized.reason}${normalized.hint ? ` ${normalized.hint}` : ''}`,
      exitCode: 1,
      durationMs: Date.now() - start,
      startedAt,
      timedOut: false,
    }
  }

  if (input.onLine) {
    return runWithSpawn(normalized, input, start, startedAt)
  }

  return new Promise(resolveResult => {
    const prepared = prepareExecFile(normalized.executable, normalized.args)
    let cancelEscalation: () => void = () => {}
    try {
      const child = execFile(prepared.executable, prepared.args, {
      cwd: normalized.cwd,
      timeout: input.timeoutMs,
      signal: input.signal,
      windowsHide: true,
      }, (error, stdout, stderr) => {
        cancelEscalation()
        const err = error as ({ code?: number | string; killed?: boolean } | null)
        resolveResult({
          command: normalized.command,
          cwd: normalized.cwd,
          kind: normalized.kind,
          stdout: stdout ?? '',
          stderr: stderr ?? '',
          exitCode: typeof err?.code === 'number' ? err.code : (error ? 1 : 0),
          durationMs: Date.now() - start,
          startedAt,
          timedOut: Boolean(err?.killed),
        })
      })
      // FIX-009: SIGKILL escalation in case the child swallows SIGTERM.
      // Must be attached AFTER child is created. Cancelled in the close callback.
      cancelEscalation = attachAbortEscalation(child, input.signal)
    } catch (error) {
      cancelEscalation()
      resolveResult({
        command: normalized.command,
        cwd: normalized.cwd,
        kind: normalized.kind,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        durationMs: Date.now() - start,
        startedAt,
        timedOut: false,
      })
    }
  })
}

function runWithSpawn(
  normalized: NormalizedCommandInvocation,
  input: CommandInvocationInput,
  start: number,
  startedAt: string,
): Promise<CommandRunResult> {
  return new Promise(resolveResult => {
    const prepared = prepareExecFile(normalized.executable, normalized.args)
    let timedOut = false
    let stdoutBuf = ''
    let stderrBuf = ''
    let partialStdout = ''
    let partialStderr = ''

    const child = spawn(prepared.executable, prepared.args, {
      cwd: normalized.cwd,
      windowsHide: true,
      signal: input.signal,
    })

    // FIX-009: SIGKILL escalation if the child swallows SIGTERM.
    const cancelEscalation = attachAbortEscalation(child, input.signal)

    const timeoutHandle = input.timeoutMs
      ? setTimeout(() => {
          timedOut = true
          child.kill()
        }, input.timeoutMs)
      : null

    const emitLines = (buf: string, chunk: string, stream: 'stdout' | 'stderr'): string => {
      const combined = buf + chunk
      const lines = combined.split('\n')
      const remaining = lines.pop() ?? ''
      for (const line of lines) {
        input.onLine!(line, stream)
      }
      return remaining
    }

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stdoutBuf += text
      partialStdout = emitLines(partialStdout, text, 'stdout')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderrBuf += text
      partialStderr = emitLines(partialStderr, text, 'stderr')
    })

    child.on('close', (code) => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      cancelEscalation()
      if (partialStdout) input.onLine!(partialStdout, 'stdout')
      if (partialStderr) input.onLine!(partialStderr, 'stderr')
      resolveResult({
        command: normalized.command,
        cwd: normalized.cwd,
        kind: normalized.kind,
        stdout: stdoutBuf,
        stderr: stderrBuf,
        exitCode: timedOut ? 1 : (code ?? 1),
        durationMs: Date.now() - start,
        startedAt,
        timedOut,
      })
    })

    child.on('error', (error) => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      cancelEscalation()
      resolveResult({
        command: normalized.command,
        cwd: normalized.cwd,
        kind: normalized.kind,
        stdout: stdoutBuf,
        stderr: error.message,
        exitCode: 1,
        durationMs: Date.now() - start,
        startedAt,
        timedOut: false,
      })
    })
  })
}

/**
 * FIX-009: Attach a SIGKILL escalation to a child process when its abort signal
 * fires. Defense-in-depth on top of Node's built-in `signal: AbortSignal` (which
 * sends SIGTERM only). On POSIX, well-behaved processes die on SIGTERM; misbehaved
 * ones (with a `process.on('SIGTERM', () => {})` handler) would survive without this.
 *
 * Returns a cleanup function — MUST be called when the child exits naturally so
 * the escalation timer is cancelled.
 *
 * Cross-platform notes:
 *   - Windows: child.kill() always invokes TerminateProcess (effectively SIGKILL).
 *     The escalation is still applied for consistency and defense in depth.
 *   - Linux/Mac: SIGTERM may be ignored by the child. SIGKILL after grace is fatal.
 */
const KILL_GRACE_MS = 3_000

function attachAbortEscalation(
  child: { kill: (signal?: NodeJS.Signals | number) => boolean; killed: boolean; exitCode: number | null },
  signal: AbortSignal | undefined,
): () => void {
  if (!signal) return () => {}
  let killTimer: NodeJS.Timeout | null = null

  const onAbort = (): void => {
    if (child.killed || child.exitCode !== null) return
    // Schedule SIGKILL fallback. Node's auto-kill on AbortSignal sends SIGTERM
    // immediately; we follow up with SIGKILL after the grace period if needed.
    killTimer = setTimeout(() => {
      if (!child.killed && child.exitCode === null) {
        try { child.kill('SIGKILL') } catch { /* already dead */ }
      }
    }, KILL_GRACE_MS)
    // Don't keep the Node event loop alive just for the kill timer.
    if (killTimer && typeof killTimer.unref === 'function') killTimer.unref()
  }

  if (signal.aborted) {
    onAbort()
  } else {
    signal.addEventListener('abort', onAbort, { once: true })
  }

  return (): void => {
    if (killTimer) clearTimeout(killTimer)
    signal.removeEventListener('abort', onAbort)
  }
}

function extractSimpleCd(command: string): { dir: string; command: string } | null {
  const match = /^cd\s+(.+?)\s*(?:&&|;)\s*(.+)$/i.exec(command.trim())
  if (!match) return null
  const dirTokens = parseCommandLine(match[1].trim())
  if (!dirTokens.ok || dirTokens.tokens.length !== 1) return null
  return { dir: dirTokens.tokens[0], command: match[2] }
}

function resolveCommandCwd(workspaceRoot: string, cwd?: string): { ok: true; cwd: string } | CommandPolicyBlock {
  const raw = cwd?.trim()
  const resolved = raw ? resolve(workspaceRoot, raw) : workspaceRoot
  const rel = relative(workspaceRoot, resolved)
  if (rel.startsWith('..') || rel === '..' || rel.includes(`..\\`) || rel.includes('../')) {
    return block('cwd blocked because it points outside the allowed workspace.')
  }
  return { ok: true, cwd: resolved }
}

function stripNativeStderrMerge(command: string): { command: string; warning?: string } {
  if (/\s+2>&1\s*$/.test(command)) {
    return {
      command: command.replace(/\s+2>&1\s*$/, '').trim(),
      warning: 'Redirection 2>&1 removed; stdout/stderr are captured natively.',
    }
  }
  return { command }
}

function findShellMeta(command: string): string | null {
  let quote: '"' | "'" | null = null
  for (let i = 0; i < command.length; i++) {
    const ch = command[i]
    if (quote) {
      if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '|' || ch === '>' || ch === '<' || ch === '`') return ch
    if (ch === ';') return ';'
    if (ch === '&' && command[i + 1] === '&') return '&&'
    if (ch === '$' && command[i + 1] === '(') return '$()'
  }
  return null
}

function parseCommandLine(command: string): { ok: true; tokens: string[] } | { ok: false; reason: string } {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  for (let i = 0; i < command.length; i++) {
    const ch = command[i]
    if (quote) {
      if (ch === quote) quote = null
      else current += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }
    current += ch
  }
  if (quote) return { ok: false, reason: 'Command has an unclosed quote.' }
  if (current) tokens.push(current)
  return { ok: true, tokens }
}

function normalizeExecutableName(value: string): string {
  return basename(value).replace(/\.(?:cmd|exe|bat)$/i, '').toLowerCase()
}

function executableForPlatform(value: string): string {
  const normalized = normalizeExecutableName(value)
  if (process.platform === 'win32' && WINDOWS_CMD_SHIMS.has(normalized) && !/\.(?:cmd|exe|bat)$/i.test(value)) {
    return `${value}.cmd`
  }
  return value
}

function isInteractiveCommand(tokens: string[]): boolean {
  const exe = normalizeExecutableName(tokens[0])
  const sub = (tokens[1] ?? '').toLowerCase()
  const third = (tokens[2] ?? '').toLowerCase()
  if (exe === 'gh' && sub === 'auth' && ['login', 'refresh'].includes(third)) return true
  if (['npm', 'pnpm', 'yarn', 'bun'].includes(exe) && ['login', 'adduser'].includes(sub)) return true
  if (['docker', 'vercel', 'netlify', 'railway', 'fly', 'gcloud', 'aws', 'az'].includes(exe) && sub === 'login') return true
  return false
}

function prepareExecFile(executable: string, args: string[]): { executable: string; args: string[] } {
  if (process.platform === 'win32' && WINDOWS_SHELL_BUILTINS.has(normalizeExecutableName(executable))) {
    const command = [executable, ...args.map(quoteCmdArg)].join(' ')
    return {
      executable: process.env.ComSpec ?? 'cmd.exe',
      args: ['/d', '/s', '/c', command],
    }
  }
  if (process.platform !== 'win32' || !/\.(?:cmd|bat)$/i.test(executable)) {
    return { executable, args }
  }
  const command = [quoteCmdArg(executable), ...args.map(quoteCmdArg)].join(' ')
  return {
    executable: process.env.ComSpec ?? 'cmd.exe',
    args: ['/d', '/s', '/c', command],
  }
}

function quoteCmdArg(value: string): string {
  if (!/[\s&()^=;!'+,`~[\]{}]/.test(value)) return value
  return `"${value.replace(/"/g, '\\"')}"`
}

/**
 * Subcommands that BOOTSTRAP a project — they CREATE the manifest, so
 * requiring it upfront makes no sense. Mapped per executable so we don't
 * accidentally allow e.g. `pnpm install` (which legitimately needs a manifest).
 */
const BOOTSTRAP_SUBCOMMANDS: Record<string, ReadonlySet<string>> = {
  npm:     new Set(['init', 'create']),
  npx:     new Set(['create-react-app', 'create-next-app', 'create-vite']),
  pnpm:    new Set(['init', 'create']),
  yarn:    new Set(['init', 'create']),
  bun:     new Set(['init', 'create']),
  cargo:   new Set(['init', 'new']),
  go:      new Set(['mod']),       // `go mod init <name>`
  dotnet:  new Set(['new']),
  composer:new Set(['init', 'create-project']),
  bundle:  new Set(['init', 'gem']),
  poetry:  new Set(['init', 'new']),
  uv:      new Set(['init']),
  flutter: new Set(['create']),
  mvn:     new Set(['archetype:generate']),
  gradle:  new Set(['init']),
}

function isBootstrapInvocation(executable: string, tokens: string[]): boolean {
  const subs = BOOTSTRAP_SUBCOMMANDS[executable]
  if (!subs) return false
  const sub = packageCommandName(tokens[1] ?? '')
  if (!subs.has(sub)) return false
  // `go mod init` requires a second-level subcommand check — `go mod tidy`
  // operates on an EXISTING manifest, so don't bypass for that case.
  if (executable === 'go' && sub === 'mod') {
    return (tokens[2] ?? '').toLowerCase() === 'init'
  }
  return true
}

function packageCommandName(token: string): string {
  const value = token.toLowerCase()
  if (value.startsWith('@')) {
    const secondAt = value.indexOf('@', 1)
    return secondAt === -1 ? value : value.slice(0, secondAt)
  }
  return value.replace(/@[^/]+$/, '')
}

function validateManifestRequirement(
  executable: string,
  tokens: string[],
  cwd: string,
  workspaceRoot: string,
  additionalManifests: string[] | undefined,
): string | null {
  if (!MANIFEST_REQUIRED.has(executable)) return null
  if (isBootstrapInvocation(executable, tokens)) return null
  if (executable === 'dotnet' && tokens.some(token => token.endsWith('.csproj') || token.endsWith('.sln'))) return null
  if (PROJECT_MANIFESTS.some(file => existsSync(resolve(cwd, file)))) return null
  // Honour staged manifests: ToolExecutor passes paths it's about to
  // materialise via withStagedFilesOnDisk. A path qualifies when its basename
  // is a known manifest AND it lives at, or below, the resolved cwd.
  if (additionalManifests && additionalManifests.length > 0) {
    const cwdResolved = resolve(cwd)
    for (const rel of additionalManifests) {
      if (!PROJECT_MANIFESTS.includes(basename(rel))) continue
      const abs = resolve(workspaceRoot, rel)
      if (abs === cwdResolved + sep + basename(rel) || abs.startsWith(cwdResolved + sep)) {
        return null
      }
    }
  }
  return `Validation blocked: no recognized manifest/build file was found in ${cwd}. Run from the correct project/module root or create the required manifest before validation.`
}

function inferCommandKind(tokens: string[]): ValidationCommandKind {
  const text = tokens.join(' ').toLowerCase()
  if (/\b(?:test|pytest|vitest|jest|ctest|rspec)\b/.test(text)) return 'test'
  if (/\b(?:lint|eslint|ruff|clippy|staticcheck|golangci-lint|rubocop|semgrep)\b/.test(text)) return 'lint'
  if (/\b(?:typecheck|tsc|mypy|vet)\b/.test(text)) return 'typecheck'
  if (/\b(?:format|fmt|prettier|gofmt|rustfmt)\b/.test(text)) return 'format'
  if (/\b(?:build|compile)\b/.test(text)) return 'build'
  return 'run'
}

function relativeLabel(root: string, cwd: string): string {
  const rel = relative(root, cwd).replace(/\\/g, '/')
  return rel || 'root'
}

function block(reason: string, hint?: string): CommandPolicyBlock {
  return { ok: false, reason, hint }
}
