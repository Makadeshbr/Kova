/**
 * Shared renderer state types.
 *
 * Kept in a separate file so hooks can import from here without creating
 * circular dependencies with App.tsx.
 */
import type { ExecutionEvent, ExecutionState, TaskDefinition } from './types'
import type { Attachment, StructuredAgentMessage, ContextPackFile, ContextBlockedFile, ContextRejectedFile, Todo } from '@kova/shared'
import type { KovaSettings } from '../../main/ipc-handlers'

// Terminal session types defined here (not imported from TerminalPanel)
// to avoid pulling xterm into the module graph of app-state.ts
export interface TerminalSessionInfo {
  id: string
  command: string
  cwd: string
  exitCode?: number
}

export interface PendingApproval {
  id: string
  command: string
  reason: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isTask: boolean
  structured?: StructuredAgentMessage
  /** Files/images attached by the user when sending this message. */
  attachments?: Attachment[]
}

export type ChatMode = 'chat' | 'plan' | 'patch' | 'review'
// PermissionMode kept for backward compat with components that import it from App.tsx
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
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  contextFiles: string[]
  selectedFiles: Array<Pick<ContextPackFile, 'path' | 'score' | 'confidence' | 'reason' | 'evidence' | 'source' | 'kind'>>
  blockedFiles: ContextBlockedFile[]
  rejectedFiles: ContextRejectedFile[]
  contextWarnings: string[]
  learningsCount: number
  maxContextTokens: number | null
}

export interface ReasoningState {
  active: boolean
  text: string
  startedAt: number | null
  endedAt: number | null
}

export interface PersistedSession {
  id: string
  title?: string
  updatedAt?: string
  scope?: string
  projectRoot?: string | null
  messages?: ChatMessage[]
  task?: TaskDefinition | null
  executionState?: ExecutionState | null
  events?: ExecutionEvent[]
  sessionUsage?: Partial<SessionUsage> | null
  todos?: Todo[]
  recoveredFromSnapshot?: boolean
  recoveryStatus?: 'running' | 'paused' | 'completed' | 'failed'
  recoveryNote?: string
}

export interface AppState {
  projectRoot: string | null
  task: TaskDefinition | null
  executionState: ExecutionState | null
  settings: KovaSettings | null
  messages: ChatMessage[]
  executionEvents: ExecutionEvent[]
  streamingText: string
  reasoning: ReasoningState
  isThinking: boolean
  showSettings: boolean
  activeModel: string | null
  modelConnected: boolean
  openFilePath: string | null
  fileRefreshKey: number
  sessionId: string | null
  sessionUsage: SessionUsage
  queuedMessages: QueuedMessage[]
  activeMode: ChatMode
  terminalSessions: TerminalSessionInfo[]
  pendingApproval: PendingApproval | null
  /**
   * FIX-018: multi-step todo list emitted by the agent via the todo_write tool.
   * Empty array means "no plan yet"; the renderer hides the card in that case.
   */
  todos: Todo[]
}
