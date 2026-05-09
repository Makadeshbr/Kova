import React, { useState, useEffect, useCallback, useMemo } from 'react'
import type { ExecutionEvent, ExecutionState, TaskDefinition, KovaSettings, StartTaskParams } from './types'
import type { StructuredAgentMessage } from '@kova/shared'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { ChatArea } from './components/ChatArea'
import { HarnessDashboard } from './components/HarnessDashboard'
import { FilesViewer } from './components/FilesViewer'
import { FileEditor } from './components/FileEditor'
import { StatusBar } from './components/StatusBar'
import { ProviderModal } from './components/ProviderModal'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isTask: boolean
  structured?: StructuredAgentMessage
}

export type ChatMode = 'chat' | 'plan' | 'patch' | 'review'
export type PermissionMode = 'auto-review' | 'ask' | 'full-access'

export interface QueuedMessage {
  id: string
  content: string
  mode: ChatMode
  permissionMode: PermissionMode
  includeProjectContext: boolean
}

export interface SessionUsage {
  contextTokens: number
  completionTokens: number
  contextFiles: string[]
  learningsCount: number
  maxContextTokens: number | null
}

function localServerUrl(s: KovaSettings): string | null {
  if (s.defaultProvider === 'ollama') return s.ollamaUrl
  if (s.defaultProvider === 'lmstudio' || s.defaultProvider === 'openai-compatible') return s.compatibleUrl
  return null
}

interface AppState {
  projectRoot: string | null
  task: TaskDefinition | null
  executionState: ExecutionState | null
  settings: KovaSettings | null
  messages: ChatMessage[]
  executionEvents: ExecutionEvent[]
  streamingText: string   // tokens accumulating in real time
  isThinking: boolean
  showSettings: boolean
  showDiff: boolean
  activeModel: string | null
  modelConnected: boolean
  openFilePath: string | null
  fileRefreshKey: number
  sessionId: string | null
  sessionUsage: SessionUsage
  queuedMessages: QueuedMessage[]
  activeMode: ChatMode
  permissionMode: PermissionMode
  includeProjectContext: boolean
}

const EMPTY_USAGE: SessionUsage = {
  contextTokens: 0,
  completionTokens: 0,
  contextFiles: [],
  learningsCount: 0,
  maxContextTokens: null,
}

export function App(): React.ReactElement {
  const [state, setState] = useState<AppState>({
    projectRoot: null, task: null, executionState: null, settings: null,
    messages: [], executionEvents: [], streamingText: '',
    isThinking: false, showSettings: false, showDiff: false,
    activeModel: null, modelConnected: false, openFilePath: null, fileRefreshKey: 0,
    sessionId: null,
    sessionUsage: EMPTY_USAGE,
    queuedMessages: [],
    activeMode: 'patch',
    permissionMode: 'auto-review',
    includeProjectContext: true,
  })

  useEffect(() => {
    window.kova.getSettings().then(s => {
      setState(prev => ({ ...prev, settings: s }))
      const url = localServerUrl(s)
      if (url) window.kova.detectModel(url).then(m => { if (m) setState(prev => ({ ...prev, activeModel: m, modelConnected: true })) })
    })
    const unsubs = [
      window.kova.onStateUpdate((executionState: ExecutionState) =>
        setState(prev => {
          const finished = ['completed', 'failed', 'paused'].includes(executionState.status)
          // Refresh sidebar when entering validating (files just written) or on completion/pause
          const shouldRefresh = ['validating', 'applying', 'completed', 'paused', 'failed'].includes(executionState.status)
            && !['validating', 'applying', 'completed', 'paused', 'failed'].includes(prev.executionState?.status ?? '')
          return {
            ...prev, executionState,
            isThinking: finished ? false : prev.isThinking,
            fileRefreshKey: shouldRefresh ? prev.fileRefreshKey + 1 : prev.fileRefreshKey,
          }
        })
      ),
      window.kova.onTaskStructured((task: TaskDefinition) => setState(prev => ({ ...prev, task }))),
      window.kova.onError((msg: string) => setState(prev => ({
        ...prev, isThinking: false,
        messages: [...prev.messages, { id: Date.now().toString(), role: 'assistant', content: msg, isTask: false }],
      }))),
      window.kova.onModelDetected((model: string) => setState(prev => ({ ...prev, activeModel: model, modelConnected: true }))),
      window.kova.onChatResponse((msg: string) => setState(prev => {
        // Dedup: stream_end may have already added this content as a message
        const last = prev.messages[prev.messages.length - 1]
        if (last?.role === 'assistant' && last.content.trim() === msg.trim()) {
          return { ...prev, isThinking: false }
        }
        return {
          ...prev, isThinking: false,
          messages: [...prev.messages, { id: Date.now().toString(), role: 'assistant', content: msg, isTask: false }],
        }
      })),
      window.kova.onExecutionEvent((event: ExecutionEvent) => setState(prev => {
        if (event.type === 'context_loaded' && event.context) {
          return {
            ...prev,
            sessionUsage: {
              contextTokens: event.context.tokensUsed,
              completionTokens: prev.sessionUsage.completionTokens,
              contextFiles: event.context.files,
              learningsCount: event.context.learningsCount ?? 0,
              maxContextTokens: event.context.maxTokens ?? null,
            },
            executionEvents: [...prev.executionEvents, event].slice(-200),
          }
        }
        if (event.type === 'token_usage') {
          return {
            ...prev,
            sessionUsage: {
              ...prev.sessionUsage,
              completionTokens: prev.sessionUsage.completionTokens + (event.tokensUsed ?? 0),
            },
            executionEvents: [...prev.executionEvents, event].slice(-200),
          }
        }
        if (event.type === 'token' && event.token) {
          return { ...prev, streamingText: prev.streamingText + event.token, executionEvents: [...prev.executionEvents, event].slice(-160) }
        }
        if (event.type === 'stream_end') {
          const text = prev.streamingText.trim()
          const structured = event.structuredMessage
          // If we got a structuredMessage, always add a message for the card (even if no streamed text)
          const assistantMsg: ChatMessage = {
            id: Date.now().toString(), role: 'assistant', content: text || '', isTask: !!structured, structured,
          }
          const newMessages = (text || structured)
            ? [...prev.messages, assistantMsg]
            : prev.messages
          return { ...prev, streamingText: '', isThinking: false, messages: newMessages, executionEvents: [...prev.executionEvents, event].slice(-160) }
        }
        // Refresh file tree on any file mutation or apply completion
        const isFileMutation = event.type === 'tool_call' && (event.toolName === 'write_file' || event.toolName === 'delete_file')
        const shouldRefresh = isFileMutation || event.type === 'file_mutation' || event.type === 'apply_completed'
        return {
          ...prev,
          executionEvents: [...prev.executionEvents, event].slice(-200),
          fileRefreshKey: shouldRefresh ? prev.fileRefreshKey + 1 : prev.fileRefreshKey,
        }
      })),
    ]
    return () => unsubs.forEach(u => u())
  }, [])

  useEffect(() => {
    if (!state.projectRoot) return
    window.kova.watchProject?.(state.projectRoot).catch(() => false)
    const unsub = window.kova.onFileTreeChanged?.(() => {
      setState(prev => ({ ...prev, fileRefreshKey: prev.fileRefreshKey + 1 }))
    })
    return () => {
      unsub?.()
      window.kova.unwatchProject?.().catch(() => false)
    }
  }, [state.projectRoot])

  useEffect(() => {
    if (!state.settings) return
    const url = localServerUrl(state.settings)
    if (!url) return
    window.kova.detectModel(url).then(m => setState(prev => ({ ...prev, activeModel: m || null, modelConnected: !!m })))
  }, [state.settings?.defaultProvider, state.settings?.compatibleUrl, state.settings?.ollamaUrl])

  // Autosave de sessões quando o Kova termina de pensar
  useEffect(() => {
    if (!state.projectRoot || state.messages.length === 0 || state.isThinking) return
    const id = state.sessionId || Date.now().toString()
    if (!state.sessionId) setState(prev => ({ ...prev, sessionId: id }))
    
    const title = state.messages.find(m => m.role === 'user')?.content.slice(0, 30) || 'Nova Sessão'
    const session = {
      id, title, updatedAt: new Date().toISOString(),
      messages: state.messages, task: state.task, sessionUsage: state.sessionUsage,
      executionState: state.executionState, events: state.executionEvents
    }
    window.kova.saveSession(state.projectRoot, session).catch(console.error)
  }, [state.messages, state.isThinking, state.executionState, state.sessionUsage])

  const buildTaskParams = useCallback((objective: string, overrides?: Partial<Pick<QueuedMessage, 'mode' | 'permissionMode' | 'includeProjectContext'>>): StartTaskParams => {
    const s = state.settings!
    const apiKeyMap: Record<string, string> = {
      anthropic: s.anthropicKey,
      openai: s.openaiKey,
      deepseek: s.deepseekKey,
      gemini: s.geminiKey,
      openrouter: s.openrouterKey,
      kimi: s.kimiKey,
      'openai-compatible': s.openaiCompatibleKey,
    }
    return {
      objective,
      projectRoot: state.projectRoot!,
      provider: s.defaultProvider as never,
      apiKey: apiKeyMap[s.defaultProvider] || undefined,
      baseUrl: s.defaultProvider === 'ollama' ? s.ollamaUrl
             : (s.defaultProvider === 'lmstudio' || s.defaultProvider === 'openai-compatible') ? s.compatibleUrl
             : undefined,
      model: state.activeModel || s.model || undefined,
      autoApply: s.autoApply,
      maxIterations: s.maxIterations,
      mode: overrides?.mode ?? state.activeMode,
      permissionMode: overrides?.permissionMode ?? state.permissionMode,
      includeProjectContext: overrides?.includeProjectContext ?? state.includeProjectContext,
      queuedCount: state.queuedMessages.length,
    }
  }, [state.settings, state.projectRoot, state.activeModel, state.activeMode, state.permissionMode, state.includeProjectContext, state.queuedMessages.length])

  const sendNow = useCallback(async (text: string, queued?: QueuedMessage) => {
    if (!state.settings || !state.projectRoot) return
    const history = state.messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
    setState(prev => ({
      ...prev, isThinking: true, executionState: null, task: null,
      executionEvents: [], showDiff: false, streamingText: '',
      messages: [...prev.messages, { id: Date.now().toString(), role: 'user', content: text, isTask: false }],
    }))
    await window.kova.sendMessage(text, history, buildTaskParams(text, queued))
  }, [state.settings, state.projectRoot, state.messages, buildTaskParams])

  const handleSend = useCallback(async (text: string) => {
    if (!state.settings || !state.projectRoot) return
    const isBusy = state.isThinking || (!!state.executionState && !['completed', 'failed', 'paused'].includes(state.executionState.status))
    const queued: QueuedMessage = {
      id: `${Date.now()}`,
      content: text,
      mode: state.activeMode,
      permissionMode: state.permissionMode,
      includeProjectContext: state.includeProjectContext,
    }
    if (isBusy) {
      setState(prev => ({ ...prev, queuedMessages: [...prev.queuedMessages, queued] }))
      return
    }
    await sendNow(text, queued)
  }, [state.settings, state.projectRoot, state.isThinking, state.executionState, state.activeMode, state.permissionMode, state.includeProjectContext, sendNow])

  useEffect(() => {
    const isBusy = state.isThinking || (!!state.executionState && !['completed', 'failed', 'paused'].includes(state.executionState.status))
    if (isBusy || state.queuedMessages.length === 0 || !state.settings || !state.projectRoot) return
    const [next, ...rest] = state.queuedMessages
    setState(prev => ({ ...prev, queuedMessages: rest }))
    void sendNow(next.content, next)
  }, [state.isThinking, state.executionState?.status, state.queuedMessages, state.settings, state.projectRoot, sendNow])

  const handleOpenFolder = useCallback(async () => {
    const folder = await window.kova.openFolder()
    if (folder) setState(prev => ({
      ...prev, projectRoot: folder, openFilePath: null,
      executionEvents: [], executionState: null, task: null,
      isThinking: false, streamingText: '', showDiff: false,
      messages: [], sessionId: null,
      sessionUsage: EMPTY_USAGE,
      queuedMessages: [],
    }))
  }, [])

  const handleLoadSession = useCallback((session: any) => {
    setState(prev => ({
      ...prev,
      sessionId: session.id,
      messages: session.messages || [],
      task: session.task || null,
      executionState: session.executionState || null,
      executionEvents: session.events || [],
      isThinking: false, streamingText: '', showDiff: false, openFilePath: null,
      sessionUsage: session.sessionUsage || EMPTY_USAGE,
    }))
  }, [])

  const handleSaveSettings = useCallback(async (settings: KovaSettings) => {
    await window.kova.saveSettings(settings)
    const isLocal = ['ollama', 'lmstudio', 'openai-compatible'].includes(settings.defaultProvider)
    setState(prev => ({
      ...prev,
      settings,
      showSettings: false,
      // For cloud providers: show the configured model immediately in the TitleBar
      activeModel: settings.model || (isLocal ? prev.activeModel : null),
      modelConnected: !!(settings.model) || (isLocal && prev.modelConnected),
    }))
  }, [])

  const handleSelectModel = useCallback((model: string) => {
    setState(prev => ({ ...prev, activeModel: model, modelConnected: true }))
    if (state.settings) {
      const updated = { ...state.settings, model }
      window.kova.saveSettings(updated)
      setState(prev => ({ ...prev, settings: updated }))
    }
  }, [state.settings])

  const handleOpenFile = useCallback((path: string) => {
    setState(prev => ({ ...prev, openFilePath: path }))
  }, [])

  const changedPaths = useMemo(() => {
    const paths = new Set<string>()
    state.executionState?.iterationHistory?.forEach(iter => iter.changes.forEach(c => paths.add(c.path)))
    // Also include live tool_call events so sidebar highlights files during execution
    state.executionEvents.forEach(e => {
      if (e.type === 'tool_call' && (e.toolName === 'write_file' || e.toolName === 'delete_file')) {
        const p = e.toolInput?.path as string | undefined
        if (p) paths.add(p)
      }
      if (e.type === 'file_mutation') {
        e.changes?.forEach(c => paths.add(c.path))
      }
    })
    return paths
  }, [state.executionState, state.executionEvents])

  const lastIteration = state.executionState?.iterationHistory?.at(-1) ?? null
  const hasChanges = (lastIteration?.changes?.length ?? 0) > 0
  const isRunning = !!state.executionState && !['completed', 'failed', 'paused'].includes(state.executionState.status)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-1)' }}>
      <TitleBar
        projectRoot={state.projectRoot} status={state.executionState?.status ?? null}
        settings={state.settings} activeModel={state.activeModel} modelConnected={state.modelConnected}
        onOpenFolder={handleOpenFolder} onOpenSettings={() => setState(prev => ({ ...prev, showSettings: true }))}
        onSelectModel={handleSelectModel}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          executionState={state.executionState} projectRoot={state.projectRoot}
          sessionUsage={state.sessionUsage}
          changedPaths={changedPaths} refreshKey={state.fileRefreshKey} onOpenFile={handleOpenFile}
          onLoadSession={handleLoadSession}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {state.openFilePath ? (
            <FileEditor path={state.openFilePath} onClose={() => setState(prev => ({ ...prev, openFilePath: null }))} />
          ) : (
            <ChatArea
              messages={state.messages} executionState={state.executionState} task={state.task}
              isThinking={state.isThinking} isRunning={isRunning}
              streamingText={state.streamingText}
              events={state.executionEvents}
              projectRoot={state.projectRoot} onSend={handleSend} onOpenFolder={handleOpenFolder}
              queuedMessages={state.queuedMessages}
              activeMode={state.activeMode}
              permissionMode={state.permissionMode}
              includeProjectContext={state.includeProjectContext}
              sessionUsage={state.sessionUsage}
              activeModel={state.activeModel}
              onModeChange={(activeMode) => setState(prev => ({ ...prev, activeMode }))}
              onPermissionModeChange={(permissionMode) => setState(prev => ({ ...prev, permissionMode }))}
              onIncludeProjectContextChange={(includeProjectContext) => setState(prev => ({ ...prev, includeProjectContext }))}
              onClearQueue={() => setState(prev => ({ ...prev, queuedMessages: [] }))}
            />
          )}
          {hasChanges && state.showDiff && !state.openFilePath && (
            <FilesViewer changes={lastIteration!.changes} onClose={() => setState(prev => ({ ...prev, showDiff: false }))} />
          )}
        </div>
        <HarnessDashboard
          executionState={state.executionState}
          events={state.executionEvents}
          sessionUsage={state.sessionUsage}
          isThinking={state.isThinking}
          onViewDiff={hasChanges ? () => setState(prev => ({ ...prev, showDiff: !prev.showDiff })) : undefined}
          onPause={() => window.kova.pause()}
          onAbort={() => {
            window.kova.abort()
            // Reset renderer state immediately — don't wait for main process confirmation
            setState(prev => ({ ...prev, executionState: null, isThinking: false, executionEvents: [], streamingText: '' }))
          }}
          onApply={() => window.kova.forceApply()}
        />
      </div>
      <StatusBar executionState={state.executionState} sessionUsage={state.sessionUsage} />
      {state.showSettings && state.settings && (
        <ProviderModal settings={state.settings} onSave={handleSaveSettings} onClose={() => setState(prev => ({ ...prev, showSettings: false }))} />
      )}
    </div>
  )
}
