import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useEngineEvents } from './hooks/useEngineEvents'
import { useSessionPersistence } from './hooks/useSessionPersistence'
import type { ExecutionEvent, ExecutionState, TaskDefinition, StartTaskParams } from './types'
import type { KovaSettings } from '../../main/ipc-handlers'
import { buildTokenBudgetedHistory } from '../../main/history-utils'
import { parseUserInput, type UserCommand } from './lib/parse-user-input'
import { createChatMessageId } from './lib/message-ids'
import { detectVisionSupport } from './lib/vision-detection'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { ChatArea } from './components/ChatArea'
import { HarnessDashboard } from './components/HarnessDashboard'
import { FilesViewer } from './components/FilesViewer'
import { FileEditor } from './components/FileEditor'
import { StatusBar } from './components/StatusBar'
import { ProviderModal } from './components/ProviderModal'
// TerminalPanel uses xterm which is a large native-like module.
// Lazy-load it so xterm never blocks the initial app render.
const TerminalPanel = React.lazy(() => import('./components/TerminalPanel').then(m => ({ default: m.TerminalPanel })))
import type { TerminalSessionInfo, PendingApproval } from './app-state'
// All shared state types live in app-state.ts to avoid circular imports with hooks
import type {
  AppState, ChatMessage, ChatMode, QueuedMessage,
  SessionUsage, ReasoningState, PermissionMode,
} from './app-state'
export type { AppState, ChatMessage, ChatMode, PermissionMode, QueuedMessage, SessionUsage, ReasoningState }

const EMPTY_REASONING: ReasoningState = {
  active: false,
  text: '',
  startedAt: null,
  endedAt: null,
}

function localServerUrl(s: KovaSettings): string | null {
  if (s.defaultProvider === 'ollama') return s.ollamaUrl
  if (s.defaultProvider === 'lmstudio' || s.defaultProvider === 'openai-compatible') return s.compatibleUrl
  return null
}

// AppState is defined in app-state.ts — imported and re-exported above

const EMPTY_USAGE: SessionUsage = {
  contextTokens: 0,
  completionTokens: 0,
  cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0,
  contextFiles: [],
  selectedFiles: [],
  blockedFiles: [],
  rejectedFiles: [],
  contextWarnings: [],
  learningsCount: 0,
  maxContextTokens: null,
}

function normalizeSessionUsage(usage: Partial<SessionUsage> | null | undefined): SessionUsage {
  return { ...EMPTY_USAGE, ...(usage ?? {}) }
}

function appendServerExitEvent(
  events: ExecutionEvent[],
  task: TaskDefinition | null,
  session: TerminalSessionInfo | undefined,
  exitCode: number,
): ExecutionEvent[] {
  if (!task || !session || !looksLikeDevServerCommand(session.command)) return events
  const lastMatchingEvent = [...events].reverse().find(event => event.serverSession?.sessionId === session.id)
  if (lastMatchingEvent?.type === 'server_failed') return events
  return [
    ...events,
    {
      type: 'server_failed',
      taskId: task.id,
      timestamp: new Date().toISOString(),
      message: `Dev server process exited with code ${exitCode}.`,
      toolInput: { command: session.command },
      serverSession: {
        sessionId: session.id,
        command: session.command,
        cwd: session.cwd,
        persistent: true,
        ready: false,
        diagnostics: [`process_exited:${exitCode}`],
      },
    },
  ]
}

function looksLikeDevServerCommand(command: string): boolean {
  const normalized = command.trim().toLowerCase()
  return [
    /^npm(?:\.cmd)?\s+run\s+dev\b/,
    /^pnpm(?:\.cmd)?\s+(?:run\s+)?dev\b/,
    /^yarn(?:\.cmd)?\s+dev\b/,
    /^bun(?:\.cmd)?\s+dev\b/,
    /^(?:npx\s+)?vite(?:\s|$)/,
    /^(?:npx\s+)?next\s+dev\b/,
    /^(?:npx\s+)?astro\s+dev\b/,
    /^(?:npx\s+)?remix\s+dev\b/,
    /^webpack\s+serve\b/,
    /^python\s+manage\.py\s+runserver\b/,
    /^rails\s+(?:s|server)\b/,
  ].some(pattern => pattern.test(normalized))
}

export function App(): React.ReactElement {
  const [state, setState] = useState<AppState>({
    projectRoot: null, task: null, executionState: null, settings: null,
    messages: [], executionEvents: [], streamingText: '', reasoning: EMPTY_REASONING,
    isThinking: false, showSettings: false, showDiff: false,
    activeModel: null, modelConnected: false, openFilePath: null, fileRefreshKey: 0,
    sessionId: null,
    sessionUsage: EMPTY_USAGE,
    queuedMessages: [],
    activeMode: 'patch',
    terminalSessions: [],
    pendingApproval: null,
    todos: [],
  })

  useEngineEvents(setState)

  // Terminal / PTY lifecycle events
  useEffect(() => {
    const unsubStart = window.kova.onTerminalStarted((id, command, cwd) => {
      setState(prev => ({
        ...prev,
        terminalSessions: [...prev.terminalSessions.filter(s => s.id !== id), { id, command, cwd }],
      }))
    })
    const unsubExit = window.kova.onTerminalExit((id, exitCode) => {
      setState(prev => ({
        ...prev,
        terminalSessions: prev.terminalSessions.map(s => s.id === id ? { ...s, exitCode } : s),
        executionEvents: appendServerExitEvent(prev.executionEvents, prev.task, prev.terminalSessions.find(s => s.id === id), exitCode),
      }))
    })
    const unsubApproval = window.kova.onInteractiveRequest((id, command, reason) => {
      setState(prev => ({ ...prev, pendingApproval: { id, command, reason } }))
    })
    return () => { unsubStart(); unsubExit(); unsubApproval() }
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

  useSessionPersistence({
    projectRoot: state.projectRoot,
    messages: state.messages,
    isThinking: state.isThinking,
    sessionId: state.sessionId,
    task: state.task,
    sessionUsage: state.sessionUsage,
    executionState: state.executionState,
    executionEvents: state.executionEvents,
    todos: state.todos,
    onSessionIdCreated: (id) => setState(prev => ({ ...prev, sessionId: id })),
  })

  // Command Pattern (race-free): once a UserCommand is created at submission time,
  // it carries the full intent (text + mode) atomically through the pipeline.
  // No downstream code reads `state.activeMode` to "guess" mode — eliminates the
  // entire class of stale-closure bugs that affected slash command dispatch.
  const buildTaskParams = useCallback((cmd: UserCommand): StartTaskParams => {
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
      objective: cmd.text,
      projectRoot: state.projectRoot!,
      provider: s.defaultProvider as never,
      apiKey: apiKeyMap[s.defaultProvider] || undefined,
      baseUrl: s.defaultProvider === 'ollama' ? s.ollamaUrl
             : (s.defaultProvider === 'lmstudio' || s.defaultProvider === 'openai-compatible') ? s.compatibleUrl
             : undefined,
      model: state.activeModel || s.model || undefined,
      autoApply: s.autoApply,
      maxIterations: s.maxIterations,
      mode: cmd.mode,                  // ← from atomic command, never stale
      permissionMode: s.permissionMode ?? 'auto-review',
      includeProjectContext: true,
      queuedCount: state.queuedMessages.length,
      openedFiles: state.openFilePath ? [state.openFilePath] : [],
    }
  }, [state.settings, state.projectRoot, state.activeModel, state.queuedMessages.length, state.openFilePath])

  const sendNow = useCallback(async (cmd: UserCommand) => {
    if (!state.settings || !state.projectRoot) return
    const taskOnly = cmd.mode === 'review' || cmd.mode === 'plan'
    const history = buildTokenBudgetedHistory(state.messages, { taskOnly })
    setState(prev => ({
      ...prev, isThinking: true, executionState: null, task: null,
      executionEvents: [], showDiff: false, streamingText: '', reasoning: EMPTY_REASONING,
      todos: [],
      messages: [...prev.messages, {
        id: createChatMessageId('user'), role: 'user', content: cmd.text, isTask: false,
        attachments: cmd.attachments,
      }],
    }))
    await window.kova.sendMessage(cmd.text, history, buildTaskParams(cmd), cmd.attachments)
  }, [state.settings, state.projectRoot, state.messages, buildTaskParams])

  const handleSend = useCallback(async (rawText: string, modeOverride?: ChatMode, attachments?: import('@kova/shared').Attachment[]) => {
    if (!state.settings || !state.projectRoot) return
    // Single source of truth for user intent — parsed once, frozen, propagated.
    const cmd = parseUserInput(rawText, modeOverride ?? state.activeMode, attachments)
    const isBusy = state.isThinking || (!!state.executionState && !['completed', 'failed', 'paused'].includes(state.executionState.status))
    if (isBusy) {
      const queued: QueuedMessage = {
        id: createChatMessageId('queue'),
        content: cmd.text,
        mode: cmd.mode,
        permissionMode: state.settings.permissionMode ?? 'auto-review',
        includeProjectContext: true,
      }
      setState(prev => ({ ...prev, queuedMessages: [...prev.queuedMessages, queued] }))
      return
    }
    await sendNow(cmd)
  }, [state.settings, state.projectRoot, state.isThinking, state.executionState, state.activeMode, sendNow])

  useEffect(() => {
    const isBusy = state.isThinking || (!!state.executionState && !['completed', 'failed', 'paused'].includes(state.executionState.status))
    if (isBusy || state.queuedMessages.length === 0 || !state.settings || !state.projectRoot) return
    const [next, ...rest] = state.queuedMessages
    setState(prev => ({ ...prev, queuedMessages: rest }))
    // Reconstruct an atomic UserCommand from the queued message — the queued mode
    // was captured at submission time, not now, so it's race-free by construction.
    void sendNow({ text: next.content, mode: next.mode, fromSlashCommand: false })
  }, [state.isThinking, state.executionState?.status, state.queuedMessages, state.settings, state.projectRoot, sendNow])

  const handleOpenFolder = useCallback(async () => {
    const folder = await window.kova.openFolder()
    if (folder) setState(prev => ({
      ...prev, projectRoot: folder, openFilePath: null,
      executionEvents: [], executionState: null, task: null,
      isThinking: false, streamingText: '', reasoning: EMPTY_REASONING, showDiff: false,
      messages: [], sessionId: null,
      sessionUsage: EMPTY_USAGE,
      queuedMessages: [],
      todos: [],
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
      isThinking: false, streamingText: '', reasoning: EMPTY_REASONING, showDiff: false, openFilePath: null,
      sessionUsage: normalizeSessionUsage(session.sessionUsage),
      todos: session.todos || [],
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
              reasoning={state.reasoning}
              events={state.executionEvents}
              projectRoot={state.projectRoot} onSend={handleSend} onOpenFolder={handleOpenFolder}
              queuedMessages={state.queuedMessages}
              activeMode={state.activeMode}
              sessionUsage={state.sessionUsage}
              activeModel={state.activeModel}
              supportsVision={state.activeModel ? detectVisionSupport(state.activeModel) : undefined}
              todos={state.todos}
              onModeChange={(activeMode) => setState(prev => ({ ...prev, activeMode }))}
              onClearQueue={() => setState(prev => ({ ...prev, queuedMessages: [] }))}
            />
          )}
          {hasChanges && state.showDiff && !state.openFilePath && (
            <FilesViewer
              changes={lastIteration!.changes}
              onClose={() => setState(prev => ({ ...prev, showDiff: false }))}
              onApplySelection={(selection) => window.kova.forceApply(selection)}
            />
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
            setState(prev => ({ ...prev, executionState: null, isThinking: false, executionEvents: [], streamingText: '', reasoning: EMPTY_REASONING, todos: [] }))
          }}
          onApply={() => window.kova.forceApply()}
          onRepair={() => {
            void handleSend('Validation failed. Investigate the cause, make the smallest possible fix, and run validation again. Do not change the architecture.')
          }}
        />
      </div>
      <React.Suspense fallback={null}>
        <TerminalPanel
          sessions={state.terminalSessions}
          pendingApproval={state.pendingApproval}
          onClose={(id) => setState(prev => ({ ...prev, terminalSessions: prev.terminalSessions.filter(s => s.id !== id) }))}
          onApprove={(id, approved) => {
            setState(prev => ({ ...prev, pendingApproval: null }))
            window.kova.terminalApprove(id, approved)
          }}
        />
      </React.Suspense>
      <StatusBar executionState={state.executionState} sessionUsage={state.sessionUsage} events={state.executionEvents} />
      {state.showSettings && state.settings && (
        <ProviderModal settings={state.settings} onSave={handleSaveSettings} onClose={() => setState(prev => ({ ...prev, showSettings: false }))} />
      )}
    </div>
  )
}
