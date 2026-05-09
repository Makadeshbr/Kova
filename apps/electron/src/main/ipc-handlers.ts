import { app, ipcMain, dialog, BrowserWindow } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, watch, FSWatcher } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import type { EngineManager, StartTaskParams } from './engine-manager'
import { autoResolveModel } from './engine-manager'
import type { ExecutionEvent, ExecutionState, TaskDefinition } from '@kova/shared'

export interface KovaSettings {
  defaultProvider: string
  anthropicKey: string
  openaiKey: string
  deepseekKey: string
  openrouterKey: string
  kimiKey: string
  geminiKey: string
  openaiCompatibleKey: string
  ollamaUrl: string
  compatibleUrl: string
  model: string
  autoApply: boolean
  maxIterations: number
}

const DEFAULT_SETTINGS: KovaSettings = {
  defaultProvider: 'lmstudio',
  anthropicKey: '',
  openaiKey: '',
  deepseekKey: '',
  openrouterKey: '',
  kimiKey: '',
  geminiKey: '',
  openaiCompatibleKey: '',
  ollamaUrl: 'http://localhost:11434/v1',
  compatibleUrl: 'http://localhost:1234/v1',
  model: '',
  autoApply: true,
  maxIterations: 5,
}

function settingsPath(): string {
  return join(app.getPath('userData'), 'kova-settings.json')
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

  manager.setHandlers(
    (state: ExecutionState) => win.webContents.send('kova:state-update', state),
    (task: TaskDefinition) => win.webContents.send('kova:task-structured', task),
    (msg: string) => win.webContents.send('kova:error', msg),
    (model: string) => win.webContents.send('kova:model-detected', model),
    (msg: string) => win.webContents.send('kova:chat-response', msg),
    (event: ExecutionEvent) => win.webContents.send('kova:execution-event', event),
  )

  ipcMain.handle('kova:open-folder', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Selecionar projeto',
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('kova:send-message', async (_, message: string, history: { role: string; content: string }[], params: StartTaskParams) => {
    await manager.sendMessage(message, history as never, params)
  })

  ipcMain.handle('kova:detect-model', async (_, url: string): Promise<string | null> => {
    return (await autoResolveModel(url)) ?? null
  })

  ipcMain.handle('kova:pause', () => manager.pause())
  ipcMain.handle('kova:abort', async () => manager.abort())
  ipcMain.handle('kova:force-apply', async () => manager.forceApply())
  ipcMain.handle('kova:get-state', () => manager.getState())

  ipcMain.handle('kova:get-settings', (): KovaSettings => {
    const p = settingsPath()
    if (!existsSync(p)) return DEFAULT_SETTINGS
    try {
      const saved = { ...DEFAULT_SETTINGS, ...JSON.parse(readFileSync(p, 'utf-8')) } as KovaSettings
      // Sanitize: if model looks like a provider name (user error), clear it
      const PROVIDER_NAMES = new Set(['deepseek','DeepSeek','openai','OpenAI','anthropic','Anthropic','kimi','Kimi','ollama','openrouter','OpenRouter'])
      if (PROVIDER_NAMES.has(saved.model)) saved.model = ''
      return saved
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  ipcMain.handle('kova:save-settings', (_, settings: KovaSettings) => {
    const p = settingsPath()
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, JSON.stringify(settings, null, 2), 'utf-8')
  })

  ipcMain.handle('kova:list-dir', async (_, dir: string) => {
    try { return listDir(dir, 0) } catch { return [] }
  })

  ipcMain.handle('kova:watch-project', async (_, root: string) => {
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

  ipcMain.handle('kova:unwatch-project', async () => {
    projectWatcher?.close()
    projectWatcher = null
    return true
  })

  ipcMain.handle('kova:read-file', async (_, filePath: string) => {
    if (isProtectedFilePath(filePath)) return null
    try { return readFileSync(filePath, 'utf-8') } catch { return null }
  })

  ipcMain.handle('kova:write-file', async (_, filePath: string, content: string) => {
    if (isProtectedFilePath(filePath)) throw new Error('Arquivo protegido')
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, content, 'utf-8')
  })

  ipcMain.handle('kova:list-sessions', (_, root: string) => {
    try {
      const dir = join(root, '.kova', 'sessions')
      if (!existsSync(dir)) return []
      return readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => JSON.parse(readFileSync(join(dir, f), 'utf-8')))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    } catch { return [] }
  })

  ipcMain.handle('kova:save-session', (_, root: string, session: any) => {
    try {
      const dir = join(root, '.kova', 'sessions')
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, `${session.id}.json`), JSON.stringify(session, null, 2))
    } catch (e) { console.error('Failed to save session', e) }
  })

  ipcMain.handle('kova:delete-session', (_, root: string, id: string) => {
    try {
      const p = join(root, '.kova', 'sessions', `${id}.json`)
      if (existsSync(p)) unlinkSync(p)
    } catch {}
  })

  ipcMain.on('kova:window-minimize', () => win.minimize())
  ipcMain.on('kova:window-maximize', () => win.isMaximized() ? win.unmaximize() : win.maximize())
  ipcMain.on('kova:window-close', () => win.close())
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
