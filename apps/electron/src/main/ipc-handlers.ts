import { app, ipcMain, dialog, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, watch, FSWatcher } from 'node:fs'
import { join, dirname, basename, resolve, relative } from 'node:path'
import type { EngineManager, StartTaskParams } from './engine-manager'
import { autoResolveModel } from './engine-manager'
import type { ExecutionEvent, ExecutionState, TaskDefinition } from '@kova/shared'
import { terminalManager } from './terminal-manager'
import {
  assertTrustedIpcSender,
  mergeSettingsForSave,
  optionalNumber,
  sanitizeDiffReviewSelection,
  sanitizeHistory,
  sanitizeSession,
  sanitizeStartTaskParams,
  stringField,
} from './ipc-security'

export interface KovaSettings {
  defaultProvider: string
  anthropicKey: string
  openaiKey: string
  deepseekKey: string
  openrouterKey: string
  kimiKey: string
  geminiKey: string
  xaiKey: string
  openaiCompatibleKey: string
  ollamaUrl: string
  compatibleUrl: string
  model: string
  autoApply: boolean
  maxIterations: number
  // Fallback provider — kicks in when primary fails with rate-limit / model-not-found / unavailable
  fallbackProvider?: string
  fallbackModel?: string
  // NVIDIA Secure
  nvidiaKey?: string
  hasNvidiaKey?: boolean
  nvidiaKeyPreview?: string
  nvidiaEnableThinking?: boolean
}

const DEFAULT_SETTINGS: KovaSettings = {
  defaultProvider: 'lmstudio',
  anthropicKey: '',
  openaiKey: '',
  deepseekKey: '',
  openrouterKey: '',
  kimiKey: '',
  geminiKey: '',
  xaiKey: '',
  openaiCompatibleKey: '',
  ollamaUrl: 'http://localhost:11434/v1',
  compatibleUrl: 'http://localhost:1234/v1',
  model: '',
  autoApply: true,
  maxIterations: 5,
  nvidiaEnableThinking: true,
}

function settingsPath(): string {
  return join(app.getPath('userData'), 'kova-settings.json')
}

export function getSettingsInternal(): KovaSettings {
  const p = settingsPath()
  if (!existsSync(p)) return DEFAULT_SETTINGS
  try {
    const saved = { ...DEFAULT_SETTINGS, ...JSON.parse(readFileSync(p, 'utf-8')) } as KovaSettings
    const PROVIDER_NAMES = new Set(['deepseek','DeepSeek','openai','OpenAI','anthropic','Anthropic','kimi','Kimi','ollama','openrouter','OpenRouter', 'nvidia', 'NVIDIA'])
    if (PROVIDER_NAMES.has(saved.model)) saved.model = ''
    return saved
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function registerIpcHandlers(win: BrowserWindow, manager: EngineManager): void {
  let projectWatcher: FSWatcher | null = null
  let projectWatchTimer: NodeJS.Timeout | null = null

  const notifyFileTreeChanged = (): void => {
    if (projectWatchTimer) clearTimeout(projectWatchTimer)
    projectWatchTimer = setTimeout(() => {
      if (!win.isDestroyed()) win.webContents.send('kova:file-tree-changed')
    }, 150)
  }

  terminalManager.setWebContents(win.webContents)

  manager.setHandlers(
    (state: ExecutionState) => win.webContents.send('kova:state-update', state),
    (task: TaskDefinition) => win.webContents.send('kova:task-structured', task),
    (msg: string) => win.webContents.send('kova:error', msg),
    (model: string) => win.webContents.send('kova:model-detected', model),
    (msg: string) => win.webContents.send('kova:chat-response', msg),
    (event: ExecutionEvent) => win.webContents.send('kova:execution-event', event),
  )

  ipcMain.handle('kova:open-folder', async (event) => {
    assertTrustedIpcSender(event)
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Selecionar projeto',
    })
    const folder = result.canceled ? null : result.filePaths[0]
    if (folder) updateProjectScope(folder)
    return folder
  })

  ipcMain.handle('kova:send-message', async (event, message: string, history: { role: string; content: string }[], params: StartTaskParams) => {
    assertTrustedIpcSender(event)
    const safeMessage = stringField(message, 'message', 80_000)
    const safeHistory = sanitizeHistory(history)
    const safeParams = sanitizeStartTaskParams(params)
    if (safeParams.projectRoot) updateProjectScope(safeParams.projectRoot)
    await manager.sendMessage(safeMessage, safeHistory as never, safeParams)
  })

  ipcMain.handle('kova:detect-model', async (event, url: string): Promise<string | null> => {
    assertTrustedIpcSender(event)
    return (await autoResolveModel(stringField(url, 'url', 2_000))) ?? null
  })

  ipcMain.handle('kova:pause', (event) => { assertTrustedIpcSender(event); manager.pause() })
  ipcMain.handle('kova:abort', async (event) => { assertTrustedIpcSender(event); return manager.abort() })
  ipcMain.handle('kova:force-apply', async (event, selection?: unknown) => {
    assertTrustedIpcSender(event)
    return manager.forceApply(sanitizeDiffReviewSelection(selection))
  })
  ipcMain.handle('kova:get-state', (event) => { assertTrustedIpcSender(event); return manager.getState() })

  // ─── Terminal / PTY ─────────────────────────────────────────────────────────
  ipcMain.handle('kova:terminal-open', (event, id: string, command: string, cwd: string) => {
    assertTrustedIpcSender(event)
    terminalManager.openTerminal(stringField(id, 'id', 200), stringField(command, 'command', 2_000), stringField(cwd, 'cwd', 2_000))
  })
  ipcMain.handle('kova:terminal-input', (event, id: string, data: string) => {
    assertTrustedIpcSender(event)
    terminalManager.writeInput(stringField(id, 'id', 200), stringField(data, 'data', 20_000))
  })
  ipcMain.handle('kova:terminal-resize', (event, id: string, cols: number, rows: number) => {
    assertTrustedIpcSender(event)
    terminalManager.resize(stringField(id, 'id', 200), optionalNumber(cols, 10, 500) ?? 80, optionalNumber(rows, 5, 200) ?? 24)
  })
  ipcMain.handle('kova:terminal-kill', (event, id: string) => {
    assertTrustedIpcSender(event)
    terminalManager.kill(stringField(id, 'id', 200))
  })
  ipcMain.handle('kova:terminal-approve', (event, id: string, approved: boolean) => {
    assertTrustedIpcSender(event)
    terminalManager.approveInteractive(stringField(id, 'id', 200), Boolean(approved))
  })

  // Memory inspection — uses the trusted currentProjectRoot. The renderer-supplied
  // projectRoot is validated to match — a compromised renderer cannot read learnings
  // from a different workspace.
  ipcMain.handle('kova:get-pending-learnings', async (event, projectRoot: string) => {
    assertTrustedIpcSender(event)
    const trusted = trustedProjectRoot(projectRoot)
    if (!trusted) return []
    try {
      const { MemorySystem } = await import('@kova/memory')
      return new MemorySystem(trusted).listPending()
    } catch { return [] }
  })
  ipcMain.handle('kova:get-contradicted-learnings', async (event, projectRoot: string) => {
    assertTrustedIpcSender(event)
    const trusted = trustedProjectRoot(projectRoot)
    if (!trusted) return []
    try {
      const { MemorySystem } = await import('@kova/memory')
      return new MemorySystem(trusted).list().filter(l => l.contradictions > 0)
    } catch { return [] }
  })
  ipcMain.handle('kova:get-invalidated-learnings', async (event, projectRoot: string) => {
    assertTrustedIpcSender(event)
    const trusted = trustedProjectRoot(projectRoot)
    if (!trusted) return []
    try {
      const { MemorySystem } = await import('@kova/memory')
      return new MemorySystem(trusted).list({ status: 'invalidated' })
    } catch { return [] }
  })

  ipcMain.handle('kova:get-settings', (event): KovaSettings => {
    assertTrustedIpcSender(event)
    const saved = getSettingsInternal()

    // Masking logic for NVIDIA key
    if (saved.nvidiaKey) {
      saved.hasNvidiaKey = true
      saved.nvidiaKeyPreview = `nvapi-${'*'.repeat(16)}`
      saved.nvidiaKey = '' // Never send actual key to renderer
    } else {
      saved.hasNvidiaKey = false
    }
    return saved
  })

  ipcMain.handle('kova:save-settings', (event, settings: KovaSettings) => {
    assertTrustedIpcSender(event)
    const p = settingsPath()
    let existingSettings: Partial<KovaSettings> = {}
    if (existsSync(p)) {
      try { existingSettings = JSON.parse(readFileSync(p, 'utf-8')) } catch {}
    }

    settings = mergeSettingsForSave(settings, existingSettings)

    // Clean up temporary UI flags before saving
    delete settings.hasNvidiaKey
    delete settings.nvidiaKeyPreview

    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, JSON.stringify(settings, null, 2), 'utf-8')
  })

  ipcMain.handle('kova:list-dir', async (event, dir: string) => {
    assertTrustedIpcSender(event)
    dir = stringField(dir, 'dir', 2_000)
    // Allow listing only within the current project root
    if (currentProjectRoot && dir !== currentProjectRoot) {
      const safe = validateProjectPath(dir, currentProjectRoot)
      if (!safe) return []
    }
    try { return listDir(dir, 0) } catch { return [] }
  })

  ipcMain.handle('kova:watch-project', async (event, root: string) => {
    assertTrustedIpcSender(event)
    root = stringField(root, 'root', 2_000)
    projectWatcher?.close()
    projectWatcher = null
    if (!root || !existsSync(root)) return false
    try {
      projectWatcher = watch(root, { recursive: true }, (_event, filename) => {
        if (!filename) return notifyFileTreeChanged()
        const first = String(filename).replace(/\\/g, '/').split('/')[0]
        if (SKIP.has(first)) return
        notifyFileTreeChanged()
      })
      projectWatcher.on('error', () => {
        projectWatcher?.close()
        projectWatcher = null
      })
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('kova:unwatch-project', async (event) => {
    assertTrustedIpcSender(event)
    projectWatcher?.close()
    projectWatcher = null
    return true
  })

  ipcMain.handle('kova:read-file', async (event, filePath: string) => {
    assertTrustedIpcSender(event)
    filePath = stringField(filePath, 'filePath', 2_000)
    if (isProtectedFilePath(filePath)) return null
    // Validate that the file is within the current project root (path traversal guard)
    if (currentProjectRoot) {
      const safe = validateProjectPath(filePath, currentProjectRoot)
      if (!safe) return null  // path traversal attempt silently rejected
    }
    try { return readFileSync(filePath, 'utf-8') } catch { return null }
  })

  ipcMain.handle('kova:write-file', async (event, filePath: string, content: string) => {
    assertTrustedIpcSender(event)
    filePath = stringField(filePath, 'filePath', 2_000)
    content = stringField(content, 'content', 2_000_000)
    if (isProtectedFilePath(filePath)) throw new Error('Protected file')
    if (currentProjectRoot) {
      const safe = validateProjectPath(filePath, currentProjectRoot)
      if (!safe) throw new Error('Path outside project — operation blocked')
    }
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, content, 'utf-8')
  })

  ipcMain.handle('kova:list-sessions', (event, root: string) => {
    assertTrustedIpcSender(event)
    root = stringField(root, 'root', 2_000)
    try {
      const dir = join(root, '.kova', 'sessions')
      if (!existsSync(dir)) return []
      return readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => JSON.parse(readFileSync(join(dir, f), 'utf-8')))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    } catch { return [] }
  })

  ipcMain.handle('kova:save-session', (event, root: string, session: any) => {
    assertTrustedIpcSender(event)
    root = stringField(root, 'root', 2_000)
    session = sanitizeSession(session)
    try {
      const dir = join(root, '.kova', 'sessions')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, `${session.id}.json`), JSON.stringify(session, null, 2))
    } catch (e) { console.error('Failed to save session', e) }
  })

  ipcMain.handle('kova:delete-session', (event, root: string, id: string) => {
    assertTrustedIpcSender(event)
    root = stringField(root, 'root', 2_000)
    id = stringField(id, 'id', 200)
    try {
      const p = join(root, '.kova', 'sessions', `${id}.json`)
      if (existsSync(p)) unlinkSync(p)
    } catch {}
  })

  ipcMain.on('kova:window-minimize', (event) => { assertTrustedIpcSender(event); win.minimize() })
  ipcMain.on('kova:window-maximize', (event) => { assertTrustedIpcSender(event); win.isMaximized() ? win.unmaximize() : win.maximize() })
  ipcMain.on('kova:window-close', (event) => { assertTrustedIpcSender(event); win.close() })
}

// ─── IPC path validation ──────────────────────────────────────────────────────

/**
 * Validates that `filePath` is within `allowedRoot` to prevent path traversal attacks.
 * Returns the normalized relative path if valid, or null if the path escapes the root.
 *
 * Examples of blocked paths:
 *   ../../etc/passwd           → null
 *   /absolute/path/outside     → null (unless starts with allowedRoot)
 *   C:\Windows\System32\...    → null (unless starts with allowedRoot)
 */
export function validateProjectPath(filePath: string, allowedRoot: string): string | null {
  if (!filePath?.trim() || !allowedRoot?.trim()) return null
  const abs = resolve(allowedRoot, filePath)
  const rootAbs = resolve(allowedRoot)
  const rel = relative(rootAbs, abs)
  // rel starts with '..' → outside the root (path traversal)
  // rel starts with '/' or drive letter → absolute path outside root
  if (rel.startsWith('..') || rel.startsWith('/') || /^[A-Za-z]:/.test(rel)) return null
  return abs
}

let currentProjectRoot: string | null = null

/**
 * Single source of truth for the active workspace. Propagates to terminalManager so PTY
 * sessions cannot escape the workspace via cwd manipulation from the renderer or the agent.
 */
function updateProjectScope(root: string): void {
  if (currentProjectRoot && currentProjectRoot !== root) {
    manager.clearProjectCache(currentProjectRoot)
  }
  currentProjectRoot = root
  terminalManager.setProjectRoot(root)
}

/**
 * Pure function: validates a renderer-supplied projectRoot against a trusted root.
 * Exported for testing — call sites in this file use the `trustedProjectRoot` closure below
 * that pulls the trusted root from `currentProjectRoot`.
 *
 * Returns the trusted root when the input is a string that matches or sits within the
 * trusted root; returns null otherwise. Prevents reading memory from arbitrary workspaces.
 */
export function resolveTrustedProjectRoot(input: unknown, currentRoot: string | null): string | null {
  if (!currentRoot) return null
  if (typeof input !== 'string' || input.length === 0 || input.length > 2_000) return null
  return validateProjectPath(input, currentRoot) ? currentRoot : null
}

function trustedProjectRoot(input: unknown): string | null {
  return resolveTrustedProjectRoot(input, currentProjectRoot)
}

const SKIP = new Set(['node_modules', '.git', '.kova', 'dist', 'out', '.next', '__pycache__', '.cache', 'vendor'])
const VISIBLE_DOTFILES = new Set(['.env', '.env.example', '.gitignore', '.npmrc', '.nvmrc', '.editorconfig', '.prettierrc', '.eslintrc', '.kovarules'])

interface FileNode { name: string; path: string; isDir: boolean; protected?: boolean; children?: FileNode[] }

function isProtectedFilePath(path: string): boolean {
  const name = basename(path).toLowerCase()
  if (name === '.env.example') return false
  return name === '.env' || name.startsWith('.env.') || name.endsWith('.env') || name.includes('.env.')
}

function shouldShowEntry(name: string): boolean {
  if (SKIP.has(name)) return false
  if (!name.startsWith('.')) return true
  if (VISIBLE_DOTFILES.has(name)) return true
  return name.startsWith('.env.')
}

function listDir(dir: string, depth: number): FileNode[] {
  if (depth > 5) return []
  let entries: string[]
  try { entries = readdirSync(dir) } catch { return [] }

  const nodes: FileNode[] = []
  for (const name of entries) {
    if (!shouldShowEntry(name)) continue
    const full = join(dir, name)
    try {
      const isDir = statSync(full).isDirectory()
      nodes.push({ name, path: full, isDir, protected: !isDir && isProtectedFilePath(full), children: isDir ? listDir(full, depth + 1) : undefined })
    } catch { /* skip broken symlinks or permission-denied files */ }
  }
  return nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
