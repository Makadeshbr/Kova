import { contextBridge, ipcRenderer } from 'electron'
import type { ExecutionEvent, ExecutionState, TaskDefinition } from '@kova/shared'
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
  forceApply: (): Promise<void> => ipcRenderer.invoke('kova:force-apply'),
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

  windowMinimize: () => ipcRenderer.send('kova:window-minimize'),
  windowMaximize: () => ipcRenderer.send('kova:window-maximize'),
  windowClose: () => ipcRenderer.send('kova:window-close'),

  platform: process.platform as string,
}

contextBridge.exposeInMainWorld('kova', kovaAPI)

declare global {
  interface Window { kova: typeof kovaAPI }
}
