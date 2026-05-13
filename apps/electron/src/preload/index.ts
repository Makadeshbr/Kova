import { contextBridge, ipcRenderer } from 'electron'
import type { DiffReviewSelection, ExecutionEvent, ExecutionState, TaskDefinition } from '@kova/shared'
import type { StartTaskParams } from '../main/engine-manager'
import type { KovaSettings } from '../main/ipc-handlers'

type UnsubFn = () => void
type MsgHistory = { role: string; content: string }[]

const kovaAPI = {
  openFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('kova:open-folder'),

  sendMessage: (message: string, history: MsgHistory, params: StartTaskParams): Promise<void> =>
    ipcRenderer.invoke('kova:send-message', message, history, params),

  detectModel: (url: string): Promise<string | null> =>
    ipcRenderer.invoke('kova:detect-model', url),

  pause: (): Promise<void> => ipcRenderer.invoke('kova:pause'),
  abort: (): Promise<void> => ipcRenderer.invoke('kova:abort'),
  forceApply: (selection?: DiffReviewSelection): Promise<void> => ipcRenderer.invoke('kova:force-apply', selection),
  getState: (): Promise<ExecutionState | null> => ipcRenderer.invoke('kova:get-state'),
  getSettings: (): Promise<KovaSettings> => ipcRenderer.invoke('kova:get-settings'),
  saveSettings: (settings: KovaSettings): Promise<void> => ipcRenderer.invoke('kova:save-settings', settings),

  onStateUpdate: (cb: (state: ExecutionState) => void): UnsubFn => {
    const h = (_: Electron.IpcRendererEvent, s: ExecutionState) => cb(s)
    ipcRenderer.on('kova:state-update', h)
    return () => ipcRenderer.removeListener('kova:state-update', h)
  },

  onTaskStructured: (cb: (task: TaskDefinition) => void): UnsubFn => {
    const h = (_: Electron.IpcRendererEvent, t: TaskDefinition) => cb(t)
    ipcRenderer.on('kova:task-structured', h)
    return () => ipcRenderer.removeListener('kova:task-structured', h)
  },

  onError: (cb: (msg: string) => void): UnsubFn => {
    const h = (_: Electron.IpcRendererEvent, m: string) => cb(m)
    ipcRenderer.on('kova:error', h)
    return () => ipcRenderer.removeListener('kova:error', h)
  },

  onModelDetected: (cb: (model: string) => void): UnsubFn => {
    const h = (_: Electron.IpcRendererEvent, m: string) => cb(m)
    ipcRenderer.on('kova:model-detected', h)
    return () => ipcRenderer.removeListener('kova:model-detected', h)
  },

  onChatResponse: (cb: (msg: string) => void): UnsubFn => {
    const h = (_: Electron.IpcRendererEvent, m: string) => cb(m)
    ipcRenderer.on('kova:chat-response', h)
    return () => ipcRenderer.removeListener('kova:chat-response', h)
  },

  onExecutionEvent: (cb: (event: ExecutionEvent) => void): UnsubFn => {
    const h = (_: Electron.IpcRendererEvent, event: ExecutionEvent) => cb(event)
    ipcRenderer.on('kova:execution-event', h)
    return () => ipcRenderer.removeListener('kova:execution-event', h)
  },

  onFileTreeChanged: (cb: () => void): UnsubFn => {
    const h = () => cb()
    ipcRenderer.on('kova:file-tree-changed', h)
    return () => ipcRenderer.removeListener('kova:file-tree-changed', h)
  },

  listDir: (dir: string) => ipcRenderer.invoke('kova:list-dir', dir),
  watchProject: (root: string): Promise<boolean> => ipcRenderer.invoke('kova:watch-project', root),
  unwatchProject: (): Promise<boolean> => ipcRenderer.invoke('kova:unwatch-project'),
  readFile: (path: string): Promise<string | null> => ipcRenderer.invoke('kova:read-file', path),
  writeFile: (path: string, content: string): Promise<void> => ipcRenderer.invoke('kova:write-file', path, content),

  listSessions: (root: string): Promise<any[]> => ipcRenderer.invoke('kova:list-sessions', root),
  saveSession: (root: string, session: any): Promise<void> => ipcRenderer.invoke('kova:save-session', root, session),
  deleteSession: (root: string, id: string): Promise<void> => ipcRenderer.invoke('kova:delete-session', root, id),

  // ─── Terminal / PTY ───────────────────────────────────────────────────────
  terminalOpen: (id: string, command: string, cwd: string) => ipcRenderer.invoke('kova:terminal-open', id, command, cwd),
  terminalInput: (id: string, data: string): void => { ipcRenderer.invoke('kova:terminal-input', id, data) },
  terminalResize: (id: string, cols: number, rows: number): void => { ipcRenderer.invoke('kova:terminal-resize', id, cols, rows) },
  terminalKill: (id: string): void => { ipcRenderer.invoke('kova:terminal-kill', id) },
  terminalApprove: (id: string, approved: boolean): void => { ipcRenderer.invoke('kova:terminal-approve', id, approved) },

  onTerminalData: (cb: (id: string, data: string) => void): (() => void) => {
    const h = (_: Electron.IpcRendererEvent, payload: {id: string; data: string}) => cb(payload.id, payload.data)
    ipcRenderer.on('kova:terminal-data', h)
    return () => ipcRenderer.removeListener('kova:terminal-data', h)
  },
  onTerminalStarted: (cb: (id: string, command: string, cwd: string) => void): (() => void) => {
    const h = (_: Electron.IpcRendererEvent, p: {id: string; command: string; cwd: string}) => cb(p.id, p.command, p.cwd)
    ipcRenderer.on('kova:terminal-started', h)
    return () => ipcRenderer.removeListener('kova:terminal-started', h)
  },
  onTerminalExit: (cb: (id: string, exitCode: number) => void): (() => void) => {
    const h = (_: Electron.IpcRendererEvent, payload: {id: string; exitCode: number}) => cb(payload.id, payload.exitCode)
    ipcRenderer.on('kova:terminal-exit', h)
    return () => ipcRenderer.removeListener('kova:terminal-exit', h)
  },
  onInteractiveRequest: (cb: (id: string, command: string, reason: string) => void): (() => void) => {
    const h = (_: Electron.IpcRendererEvent, p: {id: string; command: string; reason: string}) => cb(p.id, p.command, p.reason)
    ipcRenderer.on('kova:interactive-request', h)
    return () => ipcRenderer.removeListener('kova:interactive-request', h)
  },

  getPendingLearnings: (root: string): Promise<Array<{
    candidateDescription: string; type: string; scope: string; tags: string[]
    stack?: string; source: string; reason: string; classification: string; queuedAt: string
  }>> => ipcRenderer.invoke('kova:get-pending-learnings', root),
  getContradictedLearnings: (root: string): Promise<Array<{
    id: string; description: string; type: string; scope: string; status: string
    confidence: number; contradictions: number; tags: string[]; stack?: string
  }>> => ipcRenderer.invoke('kova:get-contradicted-learnings', root),
  getInvalidatedLearnings: (root: string): Promise<Array<{
    id: string; description: string; type: string; scope: string; status: string
    confidence: number; contradictions: number; tags: string[]; stack?: string
    invalidatedAt?: string; invalidationReason?: string
  }>> => ipcRenderer.invoke('kova:get-invalidated-learnings', root),

  windowMinimize: () => ipcRenderer.send('kova:window-minimize'),
  windowMaximize: () => ipcRenderer.send('kova:window-maximize'),
  windowClose: () => ipcRenderer.send('kova:window-close'),

  platform: process.platform as string,
}

contextBridge.exposeInMainWorld('kova', kovaAPI)

declare global {
  interface Window { kova: typeof kovaAPI }
}
