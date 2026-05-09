import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { FileChange } from '@kova/shared'

const execAsync = promisify(exec)
export type PermissionAction = 'allow' | 'ask' | 'deny'
export type PermissionKey = 'read' | 'edit' | 'list' | 'bash'

export interface PermissionRule {
  pattern: string
  action: PermissionAction
}

export type PermissionPolicy = Partial<Record<PermissionKey, PermissionAction | PermissionRule[]>>

export const DEFAULT_PERMISSION_POLICY: PermissionPolicy = {
  read: [
    { pattern: '*', action: 'allow' },
    { pattern: '.env', action: 'deny' },
    { pattern: '.env.*', action: 'deny' },
    { pattern: '*.env', action: 'deny' },
    { pattern: '*.env.*', action: 'deny' },
    { pattern: '.env.example', action: 'allow' },
  ],
  edit: 'allow',
  list: 'allow',
  bash: 'allow',
}

export const READ_ONLY_PERMISSION_POLICY: PermissionPolicy = {
  read: DEFAULT_PERMISSION_POLICY.read,
  edit: 'deny',
  list: 'allow',
  bash: 'deny',
}
const RUN_TIMEOUT_MS = 120_000  // 2 min — enough for npm install on slow machines

const COMMAND_ALLOWLIST = [
  // Go
  'go ', 'gofmt', 'staticcheck', 'golangci-lint', 'air ',
  // Node / JS / TS
  'npm ', 'npx ', 'node ', 'pnpm ', 'yarn ', 'bun ', 'tsc ', 'biome ', 'eslint ', 'prettier ',
  // Python
  'python ', 'python3 ', 'pip ', 'pip3 ', 'pytest', 'ruff', 'mypy', 'uv ', 'poetry ',
  // Rust
  'cargo ', 'rustfmt', 'rust-analyzer',
  // JVM
  'mvn ', 'gradle ', 'gradlew', 'javac ', 'kotlinc ', 'kotlin ',
  // .NET
  'dotnet ', 'dotnet-script ',
  // Ruby / PHP
  'ruby ', 'bundle ', 'rspec', 'rubocop', 'php ', 'composer ',
  // Mobile
  'swift ', 'swiftc ', 'flutter ', 'dart ',
  // C/C++ — 'make' without trailing space matches 'make', 'make build', etc.
  'gcc ', 'g++ ', 'clang ', 'clang++ ', 'make', 'cmake ',
  // File inspection (read-only, useful for the model to understand the environment)
  'ls ', 'dir ', 'find ', 'head ', 'tail ', 'cat ', 'grep ', 'which ', 'where ',
  'echo ', 'wc ', 'sort ', 'type ', 'pwd',
  // Git read-only
  'git diff', 'git status', 'git log', 'git branch', 'git show',
  // Make executable
  'chmod +x',
]

const COMMAND_BLOCKLIST = [
  // Destructive file ops
  'rm -rf', 'rm -r', 'del /f', 'rd /s', 'rmdir /s',
  // Privilege escalation
  'sudo ',
  // Dangerous permission changes (chmod +x is allowed above, blocked patterns are the dangerous ones)
  'chmod -r', 'chmod 777', 'chmod 666', 'chown ',
  // Arbitrary shell execution
  'curl |', 'wget |', 'bash -c', 'sh -c', 'eval ', 'exec ',
  // Git destructive
  'git push', 'git reset --hard', 'git clean -f', 'git force',
  // Network/remote
  'ssh ', 'scp ', 'nc ', 'netcat', 'ncat ',
  // Fork bomb
  ':(){',
  // Windows disk format (specific — not 'format ' which would break npm run format)
  'format c:', 'format d:', 'format e:', 'format /q',
  // Publishing (no accidental deploys)
  'npm publish', 'pnpm publish', 'yarn publish', 'cargo publish',
]

export interface KovaTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export const AGENT_TOOLS: KovaTool[] = [
  {
    name: 'write_file',
    description: 'Create or overwrite a file. Always provide the complete file content — never partial.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from project root (e.g. src/main.go)' },
        content: { type: 'string', description: 'Complete file content' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Read an existing file from the project.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from project root' },
      },
      required: ['path'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file no longer needed.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from project root' },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_files',
    description: 'List files in a project directory.',
    inputSchema: {
      type: 'object',
      properties: {
        dir: { type: 'string', description: 'Relative directory path. Defaults to "."' },
      },
      required: [],
    },
  },
  {
    name: 'run_command',
    description: 'Run a shell command in the project root. Use for: installing dependencies (npm install, pip install, cargo build, go mod download), building (npm run build, go build), testing (npm test, go test), linting, formatting. Always run install/build before finishing a task that adds new dependencies.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to run (e.g. "go test ./...", "npm run build", "cargo test")' },
      },
      required: ['command'],
    },
  },
]

// Read-only subset for plan and review modes — no side effects
export const READ_ONLY_TOOLS: KovaTool[] = AGENT_TOOLS.filter(
  t => t.name === 'read_file' || t.name === 'list_files',
)

export class ToolExecutor {
  private readonly written = new Map<string, FileChange>()
  // Tracks original content before any agent write — for diff display and detectExternalChange
  private readonly originals = new Map<string, string | undefined>()

  constructor(
    private readonly projectRoot: string,
    private readonly signal?: AbortSignal,
    private readonly permissionPolicy: PermissionPolicy = DEFAULT_PERMISSION_POLICY,
  ) {}

  async execute(name: string, input: Record<string, unknown>): Promise<string> {
    switch (name) {
      case 'write_file':  return this.writeFile(String(input.path ?? ''), String(input.content ?? ''))
      case 'read_file':   return this.readFile(String(input.path ?? ''))
      case 'delete_file': return this.deleteFile(String(input.path ?? ''))
      case 'list_files':  return this.listFiles(String(input.dir ?? '.'))
      case 'run_command': return this.runCommand(String(input.command ?? ''))
      default: return `Unknown tool: ${name}`
    }
  }

  getChanges(): FileChange[] {
    return [...this.written.values()]
  }

  private writeFile(rawPath: string, content: string): string {
    const path = this.sanitizePath(rawPath)
    if (!path) return `Blocked: "${rawPath.slice(0, 80)}" is outside the project root`
    const permission = this.requirePermission('edit', path)
    if (permission) return permission
    if (!content.trim()) return 'Error: content cannot be empty'
    const fullPath = join(this.projectRoot, path)
    // Record original content once — subsequent writes keep the first snapshot
    if (!this.originals.has(path)) {
      this.originals.set(path, existsSync(fullPath) ? readFileSync(fullPath, 'utf-8') : undefined)
    }
    const original = this.originals.get(path)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, content, 'utf-8')
    this.written.set(path, { path, type: original === undefined ? 'create' : 'modify', diff: content, before: original })
    return `OK: wrote ${path} (${content.split('\n').length} lines)`
  }

  private readFile(rawPath: string): string {
    const path = this.sanitizePath(rawPath)
    if (!path) return `Blocked: "${rawPath.slice(0, 80)}" is outside the project root`
    const permission = this.requirePermission('read', path)
    if (permission) return permission
    const fullPath = join(this.projectRoot, path)
    if (!existsSync(fullPath)) return `Error: not found — ${path}`
    try {
      const content = readFileSync(fullPath, 'utf-8')
      return content.length > 8_000 ? `${content.slice(0, 8_000)}\n...(truncated)` : content
    } catch {
      return `Error: cannot read ${path}`
    }
  }

  private deleteFile(rawPath: string): string {
    const path = this.sanitizePath(rawPath)
    if (!path) return `Blocked: "${rawPath.slice(0, 80)}" is outside the project root`
    const permission = this.requirePermission('edit', path)
    if (permission) return permission
    const fullPath = join(this.projectRoot, path)
    if (!existsSync(fullPath)) return `OK: ${path} does not exist`
    try {
      unlinkSync(fullPath)
      this.written.set(path, { path, type: 'delete', diff: '' })
      return `OK: deleted ${path}`
    } catch {
      return `Error: cannot delete ${path}`
    }
  }

  private listFiles(rawDir: string): string {
    const dir = this.sanitizePath(rawDir) ?? '.'
    const permission = this.requirePermission('list', dir)
    if (permission) return permission
    const fullPath = join(this.projectRoot, dir)
    if (!existsSync(fullPath)) return `Error: directory not found — ${dir}`
    try {
      const entries = readdirSync(fullPath).map(f =>
        statSync(join(fullPath, f)).isDirectory() ? `${f}/` : f,
      )
      return entries.length > 0 ? entries.join('\n') : '(empty)'
    } catch {
      return `Error: cannot list ${dir}`
    }
  }

  private async runCommand(command: string): Promise<string> {
    if (this.signal?.aborted) return 'Aborted: session was cancelled before command could run'
    const permission = this.requirePermission('bash', command)
    if (permission) return permission
    if (!isCommandAllowed(command)) {
      return `Blocked: "${command.slice(0, 80)}" is not an allowed command. Use build, test, lint, or format commands.`
    }
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot,
        timeout: RUN_TIMEOUT_MS,
        signal: this.signal,
      })
      const out = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n')
      return out || 'OK: command completed with no output'
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; killed?: boolean; code?: string; name?: string }
      if (e.code === 'ABORT_ERR' || e.name === 'AbortError') return 'Aborted: command cancelled by session abort'
      if (e.killed) return `Timeout: exceeded ${RUN_TIMEOUT_MS / 1000}s`
      const out = [e.stdout?.trim(), e.stderr?.trim()].filter(Boolean).join('\n')
      return `Error:\n${out || 'command failed'}`
    }
  }

  private sanitizePath(raw: string): string | null {
    if (!raw.trim()) return null
    const p = raw.replace(/\\/g, '/').trim()
    if (!p.startsWith('/') && !/^[A-Za-z]:/.test(p)) {
      return p.startsWith('../') || p.includes('/../') ? null : p.replace(/^\.\//, '')
    }
    const rel = relative(this.projectRoot, raw).replace(/\\/g, '/')
    return rel.startsWith('..') ? null : rel
  }

  private requirePermission(key: PermissionKey, target: string): string | null {
    const action = resolvePermission(this.permissionPolicy[key], target)
    if (action === 'deny') return `Blocked: ${key} denied for ${target}`
    if (action === 'ask') return `Approval required: ${key} ${target}`
    return null
  }
}

function resolvePermission(rule: PermissionAction | PermissionRule[] | undefined, target: string): PermissionAction {
  if (!rule) return 'allow'
  if (typeof rule === 'string') return rule
  let action: PermissionAction = 'deny'
  for (const item of rule) {
    if (matchPermissionPattern(target, item.pattern)) action = item.action
  }
  return action
}

function matchPermissionPattern(target: string, pattern: string): boolean {
  if (pattern === '*') return true
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`).test(target.replace(/\\/g, '/'))
}

function isCommandAllowed(command: string): boolean {
  const cmd = command.trim().toLowerCase()
  // Allowlist takes precedence for explicit safe patterns (e.g. chmod +x before chmod -r check)
  if (COMMAND_ALLOWLIST.some(prefix => cmd.startsWith(prefix))) {
    // Still block if the full command contains a blocklist pattern after the safe prefix
    // Exception: skip blocklist for known-safe prefixes like 'chmod +x'
    const safeByPrefix = ['chmod +x'].some(p => cmd.startsWith(p))
    if (safeByPrefix) return true
    return !COMMAND_BLOCKLIST.some(b => cmd.includes(b))
  }
  return false
}
