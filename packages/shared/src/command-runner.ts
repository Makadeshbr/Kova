import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, resolve, relative } from 'node:path'

export type ValidationCommandKind = 'test' | 'build' | 'lint' | 'typecheck' | 'format' | 'security' | 'run'

export interface CommandInvocationInput {
  command: string
  workspaceRoot: string
  cwd?: string
  kind?: ValidationCommandKind
  timeoutMs?: number
  signal?: AbortSignal
  /** Called for each output line in real-time (requires spawn mode). */
  onLine?: (line: string, stream: 'stdout' | 'stderr') => void
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

const DANGEROUS_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\brm\s+-r\b/i,
  /\bdel\s+\/f\b/i,
  /\brd\s+\/s\b/i,
  /\brmdir\s+\/s\b/i,
  /\bsudo\b/i,
  /\bchmod\s+(?:-r|777|666)\b/i,
  /\bchown\b/i,
  /\b(?:bash|sh)\s+-c\b/i,
  /\beval\b/i,
  /\bexec\b/i,
  /\bgit\s+push\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-f\b/i,
  /\b(?:ssh|scp|nc|netcat|ncat)\b/i,
  /:\(\)\{/,
  /\b(?:npm|pnpm|yarn|cargo)\s+publish\b/i,
]

const ALLOWED_EXECUTABLES = new Set([
  'go', 'gofmt', 'staticcheck', 'golangci-lint',
  'npm', 'npx', 'node', 'pnpm', 'yarn', 'bun', 'tsc', 'biome', 'eslint', 'prettier',
  'python', 'python3', 'pip', 'pip3', 'pytest', 'ruff', 'mypy', 'uv', 'poetry',
  'cargo', 'rustfmt',
  'mvn', 'gradle', 'gradlew', 'javac', 'kotlinc', 'kotlin',
  'dotnet', 'dotnet-script',
  'ruby', 'bundle', 'rspec', 'rubocop', 'php', 'composer',
  'swift', 'swiftc', 'flutter', 'dart',
  'gcc', 'g++', 'clang', 'clang++', 'make', 'cmake', 'ctest',
  'semgrep',
  'ls', 'dir', 'find', 'head', 'tail', 'cat', 'grep', 'which', 'where', 'echo',
  'wc', 'sort', 'type', 'pwd', 'git', 'chmod',
])

const WINDOWS_CMD_SHIMS = new Set(['npm', 'npx', 'pnpm', 'yarn', 'bun'])
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
  if (!command) return block('Comando vazio.')

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
    warning = 'Comando com cd foi convertido para execução estruturada com cwd.'
  } else if (/^\s*cd\s+/i.test(command)) {
    return block('Comando bloqueado porque usa cd/shell composition.', 'Use execução estruturada com cwd.')
  }

  const stripped = stripNativeStderrMerge(effectiveCommand)
  effectiveCommand = stripped.command
  warning = warning ?? stripped.warning

  const meta = findShellMeta(effectiveCommand)
  if (meta) {
    return block(`Comando bloqueado porque contém shell composition/redirecionamento (${meta}).`, 'Use um único comando de validação e capture stdout/stderr pelo executor.')
  }

  if (DANGEROUS_PATTERNS.some(pattern => pattern.test(effectiveCommand))) {
    return block('Comando perigoso bloqueado pela policy.')
  }

  const parsed = parseCommandLine(effectiveCommand)
  if (!parsed.ok) return block(parsed.reason)
  if (parsed.tokens.length === 0) return block('Comando vazio.')

  const executable = normalizeExecutableName(parsed.tokens[0])
  if (!ALLOWED_EXECUTABLES.has(executable)) {
    return block(`Comando "${parsed.tokens[0]}" não está na allowlist segura.`, 'Use comandos de build, test, lint, typecheck, format ou leitura.')
  }

  if (executable === 'git' && !isAllowedGitCommand(parsed.tokens)) {
    return block('Comando git bloqueado. Apenas diff/status/log/branch/show são permitidos.')
  }
  if (executable === 'chmod' && parsed.tokens[1] !== '+x') {
    return block('chmod bloqueado. Apenas chmod +x é permitido.')
  }

  const manifestError = validateManifestRequirement(executable, parsed.tokens, cwd)
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
    try {
      execFile(prepared.executable, prepared.args, {
      cwd: normalized.cwd,
      timeout: input.timeoutMs,
      signal: input.signal,
      windowsHide: true,
      }, (error, stdout, stderr) => {
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
    } catch (error) {
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
    return block('cwd bloqueado porque aponta para fora do workspace permitido.')
  }
  return { ok: true, cwd: resolved }
}

function stripNativeStderrMerge(command: string): { command: string; warning?: string } {
  if (/\s+2>&1\s*$/.test(command)) {
    return {
      command: command.replace(/\s+2>&1\s*$/, '').trim(),
      warning: 'Redirecionamento 2>&1 removido; stdout/stderr são capturados nativamente.',
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
  if (quote) return { ok: false, reason: 'Comando com aspas não fechadas.' }
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

function prepareExecFile(executable: string, args: string[]): { executable: string; args: string[] } {
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

function isAllowedGitCommand(tokens: string[]): boolean {
  return ['diff', 'status', 'log', 'branch', 'show'].includes((tokens[1] ?? '').toLowerCase())
}

function validateManifestRequirement(executable: string, tokens: string[], cwd: string): string | null {
  if (!MANIFEST_REQUIRED.has(executable)) return null
  if (executable === 'dotnet' && tokens.some(token => token.endsWith('.csproj') || token.endsWith('.sln'))) return null
  if (PROJECT_MANIFESTS.some(file => existsSync(resolve(cwd, file)))) return null
  return `Validação bloqueada: nenhum manifest/build file reconhecido foi encontrado em ${cwd}. Execute no root do projeto/módulo correto ou crie o manifest necessário antes da validação.`
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
