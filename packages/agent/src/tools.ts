import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { CommandOutputCallback, FileChange, Todo, TodoStatus, ValidationCommandKind } from '@kova/shared'
import { classifyCommandEnvironmentIssue, isLongRunningCommand, normalizeCommandInvocation, runCommandInvocation } from '@kova/shared'
import { grepCodebase, type GrepOptions, type GrepOutputMode } from './grep-codebase'
import { globFiles, type GlobOptions } from './glob-files'

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

export const ASK_PERMISSION_POLICY: PermissionPolicy = {
  read: DEFAULT_PERMISSION_POLICY.read,
  edit: 'ask',
  list: 'allow',
  bash: 'ask',
}

const RUN_TIMEOUT_MS = 120_000  // 2 min — enough for npm install on slow machines

const TOOL_ABORT_MESSAGE = 'Aborted: session was cancelled'
const TOOL_ABORT_CHECK_INTERVAL = 100

class ToolAbortError extends Error {
  constructor(message = TOOL_ABORT_MESSAGE) {
    super(message)
    this.name = 'AbortError'
  }
}

export function formatCommandEnvironmentFailureForAgent(output: string): string | null {
  const issue = classifyCommandEnvironmentIssue(output)
  if (!issue) return null
  return [
    'Environment blocked:',
    issue.humanMessage,
    `Suggestion: ${issue.suggestion}`,
    'Do not retry this command or edit source files to fix this environment failure. Stop and report the validation blocker to the user.',
    output.trim() ? `Output:\n${output.trim()}` : '',
  ].filter(Boolean).join('\n')
}

// FIX-006: read_file returns up to this many characters per call. Files larger
// than this are truncated with a clear message instructing the agent how to
// continue reading via the `offset` parameter. Previously 8_000 — too small for
// real-world files and caused silent data loss on re-writes.
const READ_CHUNK_SIZE = 32_000

// Command validation now lives entirely in @kova/shared's
// normalizeCommandInvocation. It enforces a permissive policy (blocklist of
// dangerous patterns) — same model as Claude Code / Cursor / Codex. Per-command
// user approval is configured via `permissionPolicy.bash: 'ask' | 'allow' | 'deny'`.

export interface KovaTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export const AGENT_TOOLS: KovaTool[] = [
  {
    name: 'write_file',
    description: 'Create a new file, or completely rewrite an existing one. Always provide the complete file content. For surgical changes to an existing file, prefer edit_file — it is cheaper and safer.',
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
    name: 'edit_file',
    description: `Prefer this tool for surgical changes to an existing file. Replaces an exact literal string with a new one — much cheaper than rewriting the whole file with write_file.

Rules:
- old_string must match the file content EXACTLY, including indentation and newlines. Read the file first to copy it verbatim.
- old_string must be unique in the file. If it appears more than once, either add surrounding context to make it unique, or set replace_all: true to substitute every occurrence.
- Use write_file for new files or complete rewrites. Use delete_file (not edit_file with new_string: "") to remove a file.`,
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from project root' },
        old_string: { type: 'string', description: 'Exact literal text to find. Must match including whitespace and newlines.' },
        new_string: { type: 'string', description: 'Replacement text. Empty string is allowed (deletes the match).' },
        replace_all: { type: 'boolean', description: 'When true, replaces every occurrence of old_string. Default false.' },
      },
      required: ['path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'read_file',
    description: 'Read an existing file from the project. Files larger than 32000 characters are truncated — use the `offset` parameter to read subsequent chunks (e.g. offset=32000 for the next chunk).',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from project root' },
        offset: { type: 'number', description: 'Character offset to start reading from. Default 0. Use to continue reading large files that were truncated.' },
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
    name: 'grep_codebase',
    description: `Search across project files. Prefer this over run_command grep/rg/findstr — it works on every OS, ignores node_modules/dist/.git by default, and respects the staged buffer (you can search files you wrote earlier in the same turn).

Inputs:
- pattern (required): regex (ripgrep dialect when ripgrep is on PATH; otherwise standard JS RegExp).
- path: subdir scope, relative to the project root. Defaults to the whole project.
- glob: file path filter, e.g. "**/*.test.ts".
- type: language filter — ts, js, py, go, rust, java, kotlin, ruby, php, swift, dart, csharp, cpp, c, md, json.
- output_mode: 'files_with_matches' (default), 'content' (path:line:match), or 'count' (path:count).
- case_insensitive: boolean.
- head_limit: max output lines, default 100.`,
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regex pattern to search for' },
        path: { type: 'string', description: 'Optional subdirectory relative to project root' },
        glob: { type: 'string', description: 'Optional file-path glob filter (e.g. "**/*.ts")' },
        type: { type: 'string', description: 'Optional language type filter (ts, js, py, go, rust, etc.)' },
        output_mode: {
          type: 'string',
          enum: ['files_with_matches', 'content', 'count'],
          description: 'Output shape. Defaults to files_with_matches.',
        },
        case_insensitive: { type: 'boolean', description: 'Match case-insensitively' },
        head_limit: { type: 'number', description: 'Max output lines (default 100)' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'todo_write',
    description: `Track multi-step work as a todo list. Use this whenever a task requires 3+ distinct steps, a refactor that spans several files, or anything that benefits from an explicit plan. Replace the full list every call — there is no merging. Mark items completed immediately when finished. Only ONE item may be in_progress at a time.

Inputs:
- todos: full replacement list. Each item: { content (imperative, e.g. "Refactor auth"), activeForm (present-continuous, e.g. "Refactoring auth"), status (pending | in_progress | completed) }.

Returns "OK: todo list updated (N item(s))". Calling with [] clears the plan. Empty content or activeForm is rejected.`,
    inputSchema: {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          description: 'Full replacement list of todos. The previous list is discarded.',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'Imperative description (e.g. "Refactor auth module")' },
              activeForm: { type: 'string', description: 'Present-continuous form shown while in_progress (e.g. "Refactoring auth module")' },
              status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
            },
            required: ['content', 'activeForm', 'status'],
          },
        },
      },
      required: ['todos'],
    },
  },
  {
    name: 'glob_files',
    description: `List project files matching a glob pattern, sorted most-recently-modified first. Prefer this over run_command find/ls — it works on every OS, ignores node_modules/dist/.git/.turbo/out by default, and respects the staged buffer (files you wrote earlier in the same turn are visible).

Inputs:
- pattern (required): glob, forward-slash style. Examples: "**/*.ts", "src/**/components/*.tsx", "**/*.{md,mdx}".
- path: subdir scope relative to project root. Defaults to the whole project.
- head_limit: max paths returned, default 100, hard ceiling 500.

Returns paths relative to the project root with forward slashes, newest first. Symbolic links are not followed.`,
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern (e.g. "**/*.ts", "src/**/components/*.tsx")' },
        path: { type: 'string', description: 'Optional subdirectory relative to project root' },
        head_limit: { type: 'number', description: 'Max paths returned (default 100, max 500)' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'run_command',
    description: 'Run a single safe command in the project root or a structured cwd. Use for build, test, lint, typecheck, format, install, or read-only inspection. Do not use for dev servers/watch modes; those must use run_interactive_command. Do not use cd, pipes, redirects, &&, or ;.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Single command to run (e.g. "go test ./...", "npm run build", "cargo test")' },
        cwd: { type: 'string', description: 'Optional relative working directory inside the project root' },
        kind: { type: 'string', enum: ['test', 'build', 'lint', 'typecheck', 'format', 'security', 'run'], description: 'Command kind used by the safe policy' },
      },
      required: ['command'],
    },
  },
  {
    name: 'run_interactive_command',
    description: `Run a command that requires interactive user input or stays alive via a built-in terminal panel.
Use this for: authentication (gh auth login, npm login, docker login), interactive setup wizards,
git operations that open an editor, dev servers (npm run dev, pnpm dev, vite, next dev), watch modes,
or any command that prompts for keyboard input or does not exit by itself.
DO NOT use run_command for these — it cannot handle interactive prompts and will fail.
DO NOT try to install missing CLIs with shell scripts; ask the user to install them.
The user will see an approval dialog before the terminal opens. Examples:
- gh auth login → authenticate GitHub CLI
- npm login → authenticate npm registry
- git commit (without -m) → opens editor for commit message`,
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The exact command to run (e.g. "gh auth login")' },
        reason: { type: 'string', description: 'Why interactive input is needed — shown in the approval dialog' },
        cwd: { type: 'string', description: 'Optional working directory relative to project root' },
      },
      required: ['command', 'reason'],
    },
  },
]

// Read-only subset for plan and review modes — no side effects.
// grep_codebase, glob_files, and todo_write never mutate the project.
const READ_ONLY_TOOL_NAMES = new Set(['read_file', 'list_files', 'grep_codebase', 'glob_files', 'todo_write'])
export const READ_ONLY_TOOLS: KovaTool[] = AGENT_TOOLS.filter(t => READ_ONLY_TOOL_NAMES.has(t.name))

export type InteractiveRunner = (command: string, cwd: string, reason: string, options?: { previewChanges?: FileChange[] }) => Promise<{
  exitCode: number
  output: string
  sessionId?: string
  persistent?: boolean
  ready?: boolean
  url?: string
  port?: number
  cwd?: string
  diagnostics?: string[]
}>

/**
 * FIX-018: optional knobs for the multi-step todo list. Passed as the 6th
 * positional argument to keep existing 5-arg call sites backward compatible.
 */
export interface TodoExecutorOptions {
  /** Seed the executor with a prior session's todos so plans persist across iterations. */
  initialTodos?: Todo[]
  /** Fired after every successful todo_write with the full new list. */
  onTodosUpdated?: (todos: Todo[]) => void
}

/**
 * Executes agent tools with in-memory staging for file writes.
 *
 * Writes and deletes are buffered in memory — the project root on disk
 * is never touched during the agent loop. This prevents watchers (Vite HMR,
 * nodemon, etc.) from reacting to intermediate broken states.
 *
 * The HarnessOrchestrator already creates its own isolated staging workspace
 * from the FileChange[] returned by getChanges(), so the harness always
 * validates the correct final state regardless of disk content.
 *
 * run_command executes against the real projectRoot (original disk state).
 * This is an accepted trade-off: agent self-verification runs on original
 * files, but the harness is the authoritative validator.
 *
 * Lifecycle: create one instance per agent.execute() call. rollbackWrites()
 * is always called in the finally block — it clears the buffer and is the
 * correct cleanup path on both success and error.
 */
export class ToolExecutor {
  /** In-memory file buffer: path → content (null means deleted) */
  private readonly buffer = new Map<string, string | null>()
  /** Snapshot of original disk content before first write, for FileChange.before */
  private readonly originals = new Map<string, string | undefined>()
  /** Accumulated FileChange records for getChanges() — consumed by orchestrator */
  private readonly written = new Map<string, FileChange>()
  /**
   * Claude Code parity: paths of files this executor wrote directly to disk
   * (brand-new creates). Tracked so rollbackWrites() can clean them up if the
   * iteration aborts before ApplicationEngine.apply commits.
   */
  private readonly streamedCreates = new Set<string>()
  /**
   * Receives each stdout/stderr line emitted by run_command in real time.
   * A fresh commandId is generated per command so the UI can group lines.
   */
  private readonly onCommandOutput?: CommandOutputCallback
  /** FIX-018: current todo list (replaced wholesale by every todo_write call). */
  private todos: Todo[] = []
  /** FIX-018: fired after every successful todo_write with the full new list. */
  private readonly onTodosUpdated?: (todos: Todo[]) => void

  constructor(
    private readonly projectRoot: string,
    private readonly signal?: AbortSignal,
    private readonly permissionPolicy: PermissionPolicy = DEFAULT_PERMISSION_POLICY,
    private readonly interactiveRunner?: InteractiveRunner,
    onCommandOutput?: CommandOutputCallback,
    todoOptions?: TodoExecutorOptions,
  ) {
    this.onCommandOutput = onCommandOutput
    if (todoOptions?.initialTodos) {
      // Defensive copy: mutating the source array must not leak into executor state.
      this.todos = todoOptions.initialTodos.map(t => ({ ...t }))
    }
    this.onTodosUpdated = todoOptions?.onTodosUpdated
  }

  /** FIX-018: read-only snapshot of the current todo list. Defensive copy. */
  getTodos(): Todo[] {
    return this.todos.map(t => ({ ...t }))
  }

  async execute(name: string, input: Record<string, unknown>): Promise<string> {
    try {
      this.throwIfAborted()
      switch (name) {
        case 'write_file':  return this.writeFile(String(input.path ?? ''), String(input.content ?? ''))
        case 'edit_file':   return this.editFile(
          String(input.path ?? ''),
          String(input.old_string ?? ''),
          String(input.new_string ?? ''),
          input.replace_all === true,
        )
        case 'read_file':   return this.readFile(String(input.path ?? ''), numberOrZero(input.offset))
        case 'delete_file': return this.deleteFile(String(input.path ?? ''))
        case 'list_files':  return await this.listFiles(String(input.dir ?? '.'))
        case 'grep_codebase': return await this.grepCodebase(input)
        case 'glob_files':    return await this.globFiles(input)
        case 'todo_write':    return await this.todoWrite(input)
        case 'run_command': return await this.runCommand(
          String(input.command ?? ''),
          stringOrUndefined(input.cwd),
          stringOrUndefined(input.kind) as ValidationCommandKind | undefined,
        )
        case 'run_interactive_command': return await this.runInteractiveCommand(
          String(input.command ?? ''),
          String(input.reason ?? ''),
          stringOrUndefined(input.cwd),
        )
        default: return `Unknown tool: ${name}`
      }
    } catch (err) {
      if (err instanceof ToolAbortError) return err.message
      throw err
    }
  }

  getChanges(): FileChange[] {
    return [...this.written.values()]
  }

  /**
   * Clears the in-memory buffer and all tracking maps.
   * Streamed-create files (new files written directly to disk for live
   * feedback) are left in place — the agent may have crashed mid-task, and
   * leaving partial work on disk matches Claude Code's behaviour and lets the
   * user inspect what was generated. The streamed paths are still recorded
   * in `written`, so a successful iteration commits them via ApplicationEngine.
   * Always called in the agent.execute() finally block.
   */
  rollbackWrites(): void {
    this.buffer.clear()
    this.written.clear()
    this.originals.clear()
    this.streamedCreates.clear()
  }

  private writeFile(rawPath: string, content: string): string {
    const path = this.sanitizePath(rawPath)
    if (!path) return `Blocked: "${rawPath.slice(0, 80)}" is outside the project root`
    const permission = this.requirePermission('edit', path)
    if (permission) return permission
    if (!content.trim()) return 'Error: content cannot be empty'
    if (path.endsWith('.py')) {
      const syntaxHole = findPythonEmptyBlock(content)
      if (syntaxHole) return `Error: Python syntax invalid before write: ${syntaxHole}`
    }

    // Capture original disk content once — used for FileChange.before and detectExternalChange
    if (!this.originals.has(path)) {
      const fullPath = join(this.projectRoot, path)
      this.originals.set(path, existsSync(fullPath) ? readFileSync(fullPath, 'utf-8') : undefined)
    }
    const original = this.originals.get(path)
    const isCreate = original === undefined

    // Claude Code parity: stream brand-new files to disk immediately so the
    // user sees them appearing live in the file tree. Modifies stay buffered
    // — the user's existing code is not touched until ApplicationEngine.apply
    // commits the full iteration atomically.
    //
    // Order matters: do the disk write FIRST, then update bookkeeping. If the
    // write fails (disk full, permission, path conflict), the executor's
    // state stays consistent with disk and the agent sees a clear error.
    if (isCreate) {
      const fullPath = join(this.projectRoot, path)
      try {
        mkdirSync(dirname(fullPath), { recursive: true })
        writeFileSync(fullPath, content, 'utf-8')
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        return `Error: could not write ${path} to disk — ${reason}`
      }
      this.streamedCreates.add(path)
    }

    this.buffer.set(path, content)
    this.written.set(path, {
      path,
      type: isCreate ? 'create' : 'modify',
      diff: content,
      before: original,
    })

    return `OK: wrote ${path} (${content.split('\n').length} lines)`
  }

  /**
   * FIX-013: surgical edit by literal string replacement.
   *
   * Reads current content (staged buffer takes precedence over disk), validates
   * uniqueness of `oldString`, applies the replacement, and stages the result
   * in the same in-memory buffer used by write_file. Disk is never touched.
   *
   * Returns a descriptive error (without staging anything) when:
   *   - oldString is empty
   *   - oldString === newString (no-op)
   *   - file does not exist or was deleted in this session
   *   - oldString is not found
   *   - oldString matches multiple times and replaceAll is false
   *   - the result would be an empty file (use delete_file instead)
   *   - resulting Python file would have an empty block
   *
   * Change type is preserved across edits: if the file was created earlier in the
   * same session (originals === undefined), subsequent edits keep type='create'.
   */
  private editFile(rawPath: string, oldString: string, newString: string, replaceAll: boolean): string {
    const path = this.sanitizePath(rawPath)
    if (!path) return `Blocked: "${rawPath.slice(0, 80)}" is outside the project root`
    const permission = this.requirePermission('edit', path)
    if (permission) return permission

    if (oldString === '') {
      return 'Error: old_string cannot be empty — use write_file to create a new file or insert content at a known anchor.'
    }
    if (oldString === newString) {
      return 'Error: old_string and new_string are identical — no edit needed.'
    }

    // Resolve current content (staged buffer takes precedence over disk)
    const current = this.resolveCurrentContent(path)
    if ('error' in current) return current.error

    // Count occurrences using literal split (handles regex special chars and dollar signs)
    const parts = current.content.split(oldString)
    const occurrences = parts.length - 1

    if (occurrences === 0) {
      return `Error: old_string not found in ${path}. Read the file first and copy the exact text — whitespace and newlines must match character-for-character.`
    }
    if (occurrences > 1 && !replaceAll) {
      return `Error: old_string appears ${occurrences} times in ${path}. Add more surrounding context to make it unique, or pass replace_all: true to substitute every occurrence.`
    }

    const newContent = parts.join(newString)

    if (newContent === '') {
      return `Error: this edit would produce an empty file. Use delete_file to remove ${path} instead.`
    }
    if (path.endsWith('.py')) {
      const syntaxHole = findPythonEmptyBlock(newContent)
      if (syntaxHole) return `Error: Python syntax invalid after edit: ${syntaxHole}`
    }

    // Capture original disk content once for FileChange.before — also marks
    // whether the file existed on disk before the agent loop started.
    if (!this.originals.has(path)) {
      const fullPath = join(this.projectRoot, path)
      this.originals.set(path, existsSync(fullPath) ? readFileSync(fullPath, 'utf-8') : undefined)
    }
    const original = this.originals.get(path)

    // If this path was already streamed to disk (a create + subsequent edit
    // in the same iteration), keep the disk content in sync so the user sees
    // the live edit too. Pre-existing files stay buffered — their on-disk
    // state is only changed by ApplicationEngine.apply.
    if (this.streamedCreates.has(path)) {
      const fullPath = join(this.projectRoot, path)
      try {
        mkdirSync(dirname(fullPath), { recursive: true })
        writeFileSync(fullPath, newContent, 'utf-8')
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        return `Error: could not update streamed ${path} on disk — ${reason}`
      }
    }

    this.buffer.set(path, newContent)
    this.written.set(path, {
      path,
      type: original === undefined ? 'create' : 'modify',
      diff: newContent,
      before: original,
    })

    const occurrencesText = occurrences === 1 ? '1 occurrence' : `${occurrences} occurrences`
    return `OK: edited ${path} (replaced ${occurrencesText}; file now ${newContent.split('\n').length} lines)`
  }

  /**
   * Returns the current logical content for a path (staged buffer wins over
   * disk), or a structured error describing why it cannot be read for editing.
   * Returning a discriminated result keeps the caller's control flow flat.
   */
  private resolveCurrentContent(path: string): { content: string } | { error: string } {
    if (this.buffer.has(path)) {
      const staged = this.buffer.get(path)
      if (staged === null) {
        return { error: `Error: cannot edit ${path} — file was deleted in this session.` }
      }
      return { content: staged as string }
    }
    const fullPath = join(this.projectRoot, path)
    if (!existsSync(fullPath)) {
      return { error: `Error: cannot edit ${path} — file not found. Use write_file to create it, or read_file first to confirm the path.` }
    }
    try {
      return { content: readFileSync(fullPath, 'utf-8') }
    } catch {
      return { error: `Error: cannot read ${path} for editing` }
    }
  }

  /**
   * FIX-006: read up to READ_CHUNK_SIZE characters starting at `offset`. Files larger
   * than the chunk are truncated with an explicit message telling the agent how to
   * continue (`offset=<next>`). Prevents silent data loss when re-writing large files.
   */
  private readFile(rawPath: string, offset: number = 0): string {
    this.throwIfAborted()
    const path = this.sanitizePath(rawPath)
    if (!path) return `Blocked: "${rawPath.slice(0, 80)}" is outside the project root`
    const permission = this.requirePermission('read', path)
    if (permission) return permission

    // Buffer takes precedence — agent reads its own staged writes
    if (this.buffer.has(path)) {
      const staged = this.buffer.get(path)!
      if (staged === null) return `Error: not found — ${path} (deleted in this session)`
      return sliceWithTruncationNotice(staged, offset, path)
    }

    const fullPath = join(this.projectRoot, path)
    if (!existsSync(fullPath)) return `Error: not found — ${path}`
    try {
      const content = readFileSync(fullPath, 'utf-8')
      this.throwIfAborted()
      return sliceWithTruncationNotice(content, offset, path)
    } catch (err) {
      if (err instanceof ToolAbortError) throw err
      return `Error: cannot read ${path}`
    }
  }

  private deleteFile(rawPath: string): string {
    const path = this.sanitizePath(rawPath)
    if (!path) return `Blocked: "${rawPath.slice(0, 80)}" is outside the project root`
    const permission = this.requirePermission('edit', path)
    if (permission) return permission

    const fullPath = join(this.projectRoot, path)

    // Streamed create followed by delete in the same iteration — undo the
    // disk write and drop the bookkeeping; the file never "existed" for the
    // user. Matches Claude Code's transient-file behaviour.
    if (this.streamedCreates.has(path)) {
      try { rmSync(fullPath, { force: true }) } catch { /* best effort */ }
      this.streamedCreates.delete(path)
      this.buffer.delete(path)
      this.written.delete(path)
      this.originals.delete(path)
      return `OK: deleted ${path}`
    }

    // If file was staged but never existed on disk, just remove from buffer
    if (this.buffer.has(path) && this.buffer.get(path) !== null && !existsSync(fullPath)) {
      this.buffer.delete(path)
      this.written.delete(path)
      return `OK: ${path} does not exist`
    }

    // File must exist on disk (or be staged) to record a delete
    if (!this.buffer.has(path) && !existsSync(fullPath)) return `OK: ${path} does not exist`

    if (!this.originals.has(path)) {
      this.originals.set(path, existsSync(fullPath) ? readFileSync(fullPath, 'utf-8') : undefined)
    }

    // Stage deletion in memory — disk file is not touched
    this.buffer.set(path, null)
    this.written.set(path, { path, type: 'delete', diff: '' })
    return `OK: deleted ${path}`
  }

  private async listFiles(rawDir: string): Promise<string> {
    const dir = this.sanitizePath(rawDir) ?? '.'
    const permission = this.requirePermission('list', dir)
    if (permission) return permission

    const dirNorm = dir === '.' ? '' : `${dir.replace(/\\/g, '/')}/`
    const entries = new Map<string, boolean>() // name → isDir

    // Disk entries
    const fullPath = join(this.projectRoot, dir)
    if (existsSync(fullPath)) {
      try {
        const diskEntries = readdirSync(fullPath)
        for (let i = 0; i < diskEntries.length; i++) {
          if (i % TOOL_ABORT_CHECK_INTERVAL === 0) await this.abortCheckpoint()
          const f = diskEntries[i]
          entries.set(f, statSync(join(fullPath, f)).isDirectory())
        }
      } catch (err) {
        if (err instanceof ToolAbortError) throw err
        if (entries.size === 0) return `Error: cannot list ${dir}`
      }
    }

    // Apply buffer overlay: show staged creates, hide staged deletes
    const bufferedEntries = [...this.buffer.entries()]
    for (let i = 0; i < bufferedEntries.length; i++) {
      if (i % TOOL_ABORT_CHECK_INTERVAL === 0) await this.abortCheckpoint()
      const [bufPath, content] = bufferedEntries[i]
      const normalized = bufPath.replace(/\\/g, '/')
      if (!normalized.startsWith(dirNorm)) continue
      const remainder = normalized.slice(dirNorm.length)
      if (!remainder || remainder.includes('/')) continue // skip nested paths
      if (content === null) {
        entries.delete(remainder) // staged delete hides from listing
      } else if (!entries.has(remainder)) {
        entries.set(remainder, false) // staged create appears in listing
      }
    }

    if (entries.size === 0) {
      const fullExists = existsSync(fullPath)
      return fullExists ? '(empty)' : `Error: directory not found — ${dir}`
    }

    return [...entries.entries()]
      .map(([name, isDir]) => isDir ? `${name}/` : name)
      .sort()
      .join('\n')
  }

  /**
   * FIX-015: grep_codebase dispatcher. Sanitises the input shape coming from
   * the LLM (which may pass numbers as strings or invalid output_mode values),
   * delegates to the pure helper, and materialises staged writes to disk for
   * the duration of the search so the agent can grep its own work-in-progress.
   */
  private async grepCodebase(rawInput: Record<string, unknown>): Promise<string> {
    this.throwIfAborted()
    const pattern = typeof rawInput.pattern === 'string' ? rawInput.pattern : ''
    if (!pattern.trim()) return 'Error: grep_codebase requires a non-empty pattern.'

    const options: GrepOptions = {
      pattern,
      path: stringOrUndefined(rawInput.path),
      glob: stringOrUndefined(rawInput.glob),
      type: stringOrUndefined(rawInput.type),
      outputMode: normalizeOutputMode(rawInput.output_mode),
      caseInsensitive: rawInput.case_insensitive === true,
      headLimit: typeof rawInput.head_limit === 'number' ? rawInput.head_limit : undefined,
    }

    const result = await this.withStagedFilesOnDisk(() => grepCodebase(this.projectRoot, options, this.signal))

    if (!result.ok) return formatToolFailure(result.error, 'grep_codebase failed')
    if (result.lines.length === 0) return 'No matches.'

    const header = `${result.lines.length} ${options.outputMode === 'content' ? 'matching line(s)' : 'result(s)'}${result.truncated ? ' (truncated)' : ''}:`
    return `${header}\n${result.lines.join('\n')}`
  }

  /**
   * FIX-016: glob_files dispatcher. Sanitises LLM input, delegates to the pure
   * helper, and materialises staged writes so the agent can discover files it
   * created earlier in the same iteration.
   */
  private async globFiles(rawInput: Record<string, unknown>): Promise<string> {
    this.throwIfAborted()
    const pattern = typeof rawInput.pattern === 'string' ? rawInput.pattern : ''
    if (!pattern.trim()) return 'Error: glob_files requires a non-empty pattern.'

    const options: GlobOptions = {
      pattern,
      path: stringOrUndefined(rawInput.path),
      headLimit: typeof rawInput.head_limit === 'number' ? rawInput.head_limit : undefined,
    }

    const result = await this.withStagedFilesOnDisk(() => globFiles(this.projectRoot, options, this.signal))

    if (!result.ok) return formatToolFailure(result.error, 'glob_files failed')
    if (result.paths.length === 0) return 'No files matched.'

    const header = `${result.paths.length} file(s)${result.truncated ? ' (truncated; head_limit reached)' : ''}:`
    return `${header}\n${result.paths.join('\n')}`
  }

  /**
   * FIX-018: todo_write dispatcher. Replaces the full list on every successful
   * call (no merging). On any validation failure, the existing list is preserved
   * and onTodosUpdated is NOT fired — the agent sees an error and can correct.
   */
  private async todoWrite(rawInput: Record<string, unknown>): Promise<string> {
    const validation = validateTodos(rawInput.todos)
    if ('error' in validation) return `Error: ${validation.error}`

    this.todos = validation.todos
    this.onTodosUpdated?.(this.getTodos())

    if (validation.todos.length === 0) return 'OK: todo list cleared.'
    return `OK: todo list updated (${validation.todos.length} item${validation.todos.length === 1 ? '' : 's'}).`
  }

  private async runCommand(command: string, cwd?: string, kind?: ValidationCommandKind): Promise<string> {
    this.throwIfAborted('Aborted: session was cancelled before command could run')
    const bashPermission = resolvePermission(this.permissionPolicy.bash, command)
    if (bashPermission === 'deny') return `Blocked: bash denied for ${command}`
    // FIX-CMD: the staged buffer holds writes that will be on disk by the time
    // runCommandInvocation actually executes (withStagedFilesOnDisk runs first).
    // Pass them to the validator so `pnpm install` after `write_file package.json`
    // in the same iteration passes the manifest check.
    const stagedManifests = [...this.buffer.entries()]
      .filter(([, content]) => content !== null)
      .map(([path]) => path)
    const normalized = normalizeCommandInvocation({
      command, workspaceRoot: this.projectRoot, cwd, kind,
      additionalManifests: stagedManifests,
    })
    if (!normalized.ok) {
      if (normalized.reason.includes('Long-running command')) {
        if (!this.interactiveRunner) {
          return `Blocked: "${command}" is a long-running server/watch command. Use run_interactive_command in the Kova terminal panel instead of run_command.`
        }
        return this.runInteractiveCommand(command, `Start persistent dev server in Kova terminal: ${command}`, cwd)
      }
      return `Blocked: ${normalized.reason}${normalized.hint ? ` ${normalized.hint}` : ''}`
    }
    if (bashPermission === 'ask') {
      if (!this.interactiveRunner) return `Approval required: bash ${command}`
      return this.runInteractiveCommand(command, `Kova wants to run this command: ${command}`, cwd)
    }
    if (isGitDiffCommand(normalized.command) && !existsSync(join(normalized.cwd, '.git')) && !existsSync(join(this.projectRoot, '.git'))) {
      return 'Info: diff unavailable — not a Git repository'
    }
    // FIX-003: when a streaming consumer is attached, generate a commandId and forward
    // each line via the callback. Without a consumer, the spawn fast-path is skipped
    // (preserves backward-compatible execFile-based execution).
    const commandId = this.onCommandOutput ? randomUUID() : undefined
    const onLine = this.onCommandOutput && commandId
      ? (line: string, stream: 'stdout' | 'stderr') => this.onCommandOutput!(commandId, line, stream)
      : undefined
    const result = await this.withStagedFilesOnDisk(() => runCommandInvocation({
      command,
      workspaceRoot: this.projectRoot,
      cwd,
      kind,
      additionalManifests: stagedManifests,
      timeoutMs: RUN_TIMEOUT_MS,
      signal: this.signal,
      onLine,
    }))
    this.throwIfAborted('Aborted: command cancelled by session abort')
    if (result.timedOut) return `Timeout: exceeded ${RUN_TIMEOUT_MS / 1000}s`
    const out = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n')
    if (result.exitCode !== 0) {
      const environmentFailure = formatCommandEnvironmentFailureForAgent(out)
      if (environmentFailure) return environmentFailure
      return `Error:\n${out || 'command failed'}`
    }
    return out || 'OK: command completed with no output'
  }

  private async withStagedFilesOnDisk<T>(run: () => Promise<T>): Promise<T> {
    this.throwIfAborted()
    if (this.buffer.size === 0) return run()

    const touched = [...this.buffer.keys()]
    try {
      const stagedEntries = [...this.buffer.entries()]
      for (let i = 0; i < stagedEntries.length; i++) {
        if (i % TOOL_ABORT_CHECK_INTERVAL === 0) await this.abortCheckpoint()
        const [path, content] = stagedEntries[i]
        const fullPath = join(this.projectRoot, path)
        if (content === null) {
          rmSync(fullPath, { force: true })
        } else {
          mkdirSync(dirname(fullPath), { recursive: true })
          writeFileSync(fullPath, content, 'utf-8')
        }
      }
      return await run()
    } finally {
      for (const path of touched.reverse()) {
        const fullPath = join(this.projectRoot, path)
        const original = this.originals.get(path)
        if (original === undefined) {
          rmSync(fullPath, { force: true })
        } else {
          mkdirSync(dirname(fullPath), { recursive: true })
          writeFileSync(fullPath, original, 'utf-8')
        }
      }
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

  private async runInteractiveCommand(command: string, reason: string, cwd?: string): Promise<string> {
    this.throwIfAborted()
    if (!this.interactiveRunner) {
      return 'Interactive commands are not available in this context. Ask the user to run this command manually: ' + command
    }
    const previewChanges = isLongRunningCommand(command) && this.buffer.size > 0 ? [...this.written.values()] : undefined
    const resolvedCwd = cwd ? join(this.projectRoot, cwd) : this.projectRoot
    try {
      const result = await this.interactiveRunner(command, resolvedCwd, reason, previewChanges ? { previewChanges } : undefined)
      if (result.persistent) {
        const meta = [
          `ready=${result.ready === true ? 'true' : 'false'}`,
          result.url ? `url=${result.url}` : '',
          result.port ? `port=${result.port}` : '',
          result.cwd ? `cwd=${result.cwd}` : `cwd=${resolvedCwd}`,
          result.diagnostics?.length ? `diagnostics=${result.diagnostics.join(',')}` : '',
        ].filter(Boolean).join(' ')
        return `Persistent command started in Kova terminal${result.sessionId ? ` (${result.sessionId})` : ''}. ${meta}\nOutput:\n${result.output.slice(-3_000)}`
      }
      return result.exitCode === 0
        ? `Interactive command completed successfully (exit 0).\nOutput:\n${result.output.slice(-3_000)}`
        : `Interactive command exited with code ${result.exitCode}.\nOutput:\n${result.output.slice(-3_000)}`
    } catch (err) {
      return `Interactive command failed: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  private throwIfAborted(message = TOOL_ABORT_MESSAGE): void {
    if (this.signal?.aborted) throw new ToolAbortError(message)
  }

  private async abortCheckpoint(message = TOOL_ABORT_MESSAGE): Promise<void> {
    this.throwIfAborted(message)
    await yieldToEventLoop(this.signal)
    this.throwIfAborted(message)
  }

}

function formatToolFailure(error: string | undefined, fallback: string): string {
  const message = error ?? fallback
  return /^aborted\b/i.test(message) ? `Aborted: ${message.replace(/^aborted:?\s*/i, '')}` : `Error: ${message}`
}

function yieldToEventLoop(signal?: AbortSignal): Promise<void> {
  if (!signal) return Promise.resolve()
  if (signal?.aborted) return Promise.reject(new ToolAbortError())
  return new Promise((resolvePromise, reject) => {
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', onAbort)
      resolvePromise()
    }, 0)
    const onAbort = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
      reject(new ToolAbortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
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

function isGitDiffCommand(command: string): boolean {
  return /^git\s+diff(\s|$)/i.test(command.trim())
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function normalizeOutputMode(value: unknown): GrepOutputMode | undefined {
  if (value === 'content' || value === 'files_with_matches' || value === 'count') return value
  return undefined
}

/**
 * FIX-018: validate the `todos` payload from a todo_write tool call.
 *
 * Returns either the parsed list (which has been defensive-copied so the caller
 * cannot mutate the executor's state after the fact) or a single descriptive
 * error string suitable for the model to read and correct.
 *
 * Contract:
 * - todos must be an array (including [], which means "clear the plan")
 * - each item must have non-empty content + activeForm and a valid status
 * - at most one item may have status='in_progress' simultaneously
 */
export function validateTodos(raw: unknown): { todos: Todo[] } | { error: string } {
  if (!Array.isArray(raw)) {
    return { error: 'todos must be an array of { content, activeForm, status } objects.' }
  }

  const out: Todo[] = []
  let inProgressCount = 0

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i]
    if (!item || typeof item !== 'object') {
      return { error: `todos[${i}] must be an object with content, activeForm, and status.` }
    }
    const obj = item as Record<string, unknown>

    if (typeof obj.content !== 'string' || !obj.content.trim()) {
      return { error: `todos[${i}].content must be a non-empty string.` }
    }
    if (typeof obj.activeForm !== 'string' || !obj.activeForm.trim()) {
      return { error: `todos[${i}].activeForm must be a non-empty string.` }
    }
    if (obj.status !== 'pending' && obj.status !== 'in_progress' && obj.status !== 'completed') {
      return { error: `todos[${i}].status must be one of: pending, in_progress, completed.` }
    }
    if (obj.status === 'in_progress') inProgressCount++

    out.push({
      content: obj.content,
      activeForm: obj.activeForm,
      status: obj.status as TodoStatus,
    })
  }

  if (inProgressCount > 1) {
    return { error: 'Only one item may have status=in_progress at a time — focus on a single step.' }
  }

  return { todos: out }
}

function numberOrZero(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.floor(value)
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n) && n >= 0) return Math.floor(n)
  }
  return 0
}

/**
 * FIX-006: slice file content at `offset`, returning up to READ_CHUNK_SIZE chars.
 * When the file is larger than what fits, returns a TRUNCATED marker that tells the
 * model exactly how to continue (`offset=<next>`). Offset beyond EOF returns a
 * descriptive error so the model can recover instead of silently writing back
 * incomplete content.
 */
function sliceWithTruncationNotice(content: string, offset: number, path: string): string {
  const total = content.length
  if (offset > total) return `Error: offset ${offset} is beyond file end (${total} chars) — ${path}`
  const start = offset
  const end = Math.min(total, start + READ_CHUNK_SIZE)
  const chunk = content.slice(start, end)
  if (end >= total) return chunk
  return `${chunk}\n...(TRUNCATED — ${total} chars total; you read ${start}-${end}. Call read_file again with offset=${end} to continue.)`
}

function findPythonEmptyBlock(content: string): string | null {
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.endsWith(':')) continue
    const indent = line.match(/^\s*/)?.[0].length ?? 0
    let sawBodyCandidate = false
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j]
      const nextTrimmed = next.trim()
      if (!nextTrimmed || nextTrimmed.startsWith('#')) continue
      sawBodyCandidate = true
      const nextIndent = next.match(/^\s*/)?.[0].length ?? 0
      if (nextIndent <= indent) return `empty block after line ${i + 1}`
      break
    }
    if (!sawBodyCandidate) return `empty block after line ${i + 1}`
  }
  return null
}

// Note: command validation lives entirely in @kova/shared's
// normalizeCommandInvocation (permissive blocklist model). The earlier
// allowlist/blocklist arrays + isCommandAllowed helper were dead code and
// were removed when the policy switched to Claude Code parity.
