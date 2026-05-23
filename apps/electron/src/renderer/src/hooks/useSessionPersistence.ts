import { useEffect, useRef } from 'react'
import type { ExecutionEvent, ExecutionState, TaskDefinition } from '../types'
import type { ChatMessage, SessionUsage } from '../app-state'
import type { Todo } from '@kova/shared'

const AUTOSAVE_DEBOUNCE_MS = 800

function buildSessionFingerprint(parts: {
  sessionId: string | null
  messagesLength: number
  executionStatus: string | null | undefined
  currentIteration: number | undefined
  taskId: string | null | undefined
  todosLength: number
  contextTokens: number
}): string {
  return JSON.stringify({
    id: parts.sessionId,
    messages: parts.messagesLength,
    status: parts.executionStatus ?? null,
    iteration: parts.currentIteration ?? null,
    taskId: parts.taskId ?? null,
    todos: parts.todosLength,
    ctx: parts.contextTokens,
  })
}

/**
 * Autosaves the current session to disk when messages or execution state change.
 * Debounced and deduped to avoid flooding kova:save-session (IPC rate limit).
 */
export function useSessionPersistence(opts: {
  projectRoot: string | null
  messages: ChatMessage[]
  isThinking: boolean
  sessionId: string | null
  task: TaskDefinition | null
  sessionUsage: SessionUsage
  executionState: ExecutionState | null
  executionEvents: ExecutionEvent[]
  todos: Todo[]
  onSessionIdCreated: (id: string) => void
}): void {
  const {
    projectRoot, messages, isThinking, sessionId,
    task, sessionUsage, executionState, executionEvents, todos, onSessionIdCreated,
  } = opts

  const onCreatedRef = useRef(onSessionIdCreated)
  onCreatedRef.current = onSessionIdCreated

  const latestExecutionEventsRef = useRef(executionEvents)
  useEffect(() => {
    latestExecutionEventsRef.current = executionEvents
  }, [executionEvents])

  const lastSavedRef = useRef<string | null>(null)

  useEffect(() => {
    if (messages.length === 0 || isThinking) return

    const timeoutId = window.setTimeout(() => {
      const id = sessionId || Date.now().toString()
      const fingerprint = buildSessionFingerprint({
        sessionId: id,
        messagesLength: messages.length,
        executionStatus: executionState?.status,
        currentIteration: executionState?.currentIteration,
        taskId: task?.id ?? null,
        todosLength: todos.length,
        contextTokens: sessionUsage.contextTokens,
      })

      if (lastSavedRef.current === fingerprint) return
      lastSavedRef.current = fingerprint

      if (!sessionId) onCreatedRef.current(id)

      const title = messages.find(m => m.role === 'user')?.content.slice(0, 30) || 'New Session'
      const session = {
        id,
        title,
        updatedAt: new Date().toISOString(),
        scope: 'global',
        projectRoot,
        messages,
        task,
        sessionUsage,
        executionState,
        events: latestExecutionEventsRef.current,
        todos,
      }
      window.kova.saveSession(projectRoot, session).catch(console.error)
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [
    messages,
    isThinking,
    executionState,
    sessionUsage,
    projectRoot,
    sessionId,
    task,
    todos,
  ])
}
