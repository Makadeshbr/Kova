import { useEffect, useRef } from 'react'
import type { ExecutionEvent, ExecutionState, TaskDefinition } from '../types'
import type { ChatMessage, SessionUsage } from '../app-state'

/**
 * Autosaves the current session to disk whenever the message list or
 * execution state changes and the agent is not actively thinking.
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
  onSessionIdCreated: (id: string) => void
}): void {
  const {
    projectRoot, messages, isThinking, sessionId,
    task, sessionUsage, executionState, executionEvents, onSessionIdCreated,
  } = opts

  // Keep a stable ref to the callback to avoid re-running the effect
  const onCreatedRef = useRef(onSessionIdCreated)
  onCreatedRef.current = onSessionIdCreated

  useEffect(() => {
    if (!projectRoot || messages.length === 0 || isThinking) return
    const id = sessionId || Date.now().toString()
    if (!sessionId) onCreatedRef.current(id)

    const title = messages.find(m => m.role === 'user')?.content.slice(0, 30) || 'Nova Sessão'
    const session = {
      id, title, updatedAt: new Date().toISOString(),
      messages, task, sessionUsage, executionState, events: executionEvents,
    }
    window.kova.saveSession(projectRoot, session).catch(console.error)
  }, [messages, isThinking, executionState, sessionUsage, projectRoot, sessionId, task, executionEvents])
}
