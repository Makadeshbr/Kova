import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join } from 'node:path'
import type { ExecutionEvent, ExecutionState, StructuredAgentMessage, TaskDefinition, Todo } from '@kova/shared'
import { structuredMessageToHistoryText } from './history-utils'

export interface RecoveryChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isTask: boolean
  structured?: StructuredAgentMessage
}

export interface PersistedRunSnapshot {
  version: 1
  sessionId: string
  projectRoot: string
  title: string
  objective: string
  mode?: string
  updatedAt: string
  completedAt?: string
  recoveryStatus: 'running' | 'paused' | 'completed' | 'failed'
  task: TaskDefinition | null
  executionState: ExecutionState | null
  events: ExecutionEvent[]
  todos: Todo[]
  streamedText: string
  finalMessage?: RecoveryChatMessage
}

export interface RecoveredSession {
  id: string
  title: string
  updatedAt: string
  scope: 'project'
  projectRoot: string
  messages: RecoveryChatMessage[]
  task: TaskDefinition | null
  executionState: ExecutionState | null
  events: ExecutionEvent[]
  todos: Todo[]
  recoveredFromSnapshot: true
  recoveryStatus: PersistedRunSnapshot['recoveryStatus']
  recoveryNote: string
}

const SNAPSHOT_VERSION = 1
const CURRENT_SNAPSHOT = 'current.json'
const FINAL_SESSION = 'session.json'

export function createRunSnapshot(input: {
  sessionId: string
  projectRoot: string
  objective: string
  mode?: string
  task?: TaskDefinition | null
}): PersistedRunSnapshot {
  const updatedAt = new Date().toISOString()
  return {
    version: SNAPSHOT_VERSION,
    sessionId: safeSessionId(input.sessionId),
    projectRoot: input.projectRoot,
    title: input.objective.slice(0, 80) || 'Recovered run',
    objective: input.objective,
    mode: input.mode,
    updatedAt,
    recoveryStatus: 'running',
    task: input.task ?? null,
    executionState: null,
    events: [],
    todos: [],
    streamedText: '',
  }
}

export function recordSnapshotEvent(snapshot: PersistedRunSnapshot, event: ExecutionEvent): PersistedRunSnapshot {
  const events = shouldKeepEvent(event)
    ? [...snapshot.events, event].slice(-200)
    : snapshot.events
  const streamedText = event.type === 'token' && event.token
    ? `${snapshot.streamedText}${event.token}`.slice(-80_000)
    : snapshot.streamedText
  const todos = event.type === 'todos_updated'
    ? event.todos ?? []
    : snapshot.todos
  const finalMessage = event.type === 'stream_end'
    ? buildAssistantMessage(snapshot.streamedText, event.structuredMessage)
    : snapshot.finalMessage
  return {
    ...snapshot,
    events,
    streamedText: event.type === 'stream_end' ? '' : streamedText,
    todos,
    finalMessage: finalMessage ?? snapshot.finalMessage,
    updatedAt: event.timestamp,
  }
}

export function recordSnapshotState(snapshot: PersistedRunSnapshot, state: ExecutionState): PersistedRunSnapshot {
  return {
    ...snapshot,
    executionState: state,
    recoveryStatus: statusForState(state.status),
    updatedAt: new Date().toISOString(),
  }
}

export function writeRunSnapshot(projectRoot: string, snapshot: PersistedRunSnapshot): void {
  const dir = runSnapshotDir(projectRoot, snapshot.sessionId)
  mkdirSync(dir, { recursive: true })
  atomicWriteJson(join(dir, CURRENT_SNAPSHOT), snapshot)
  if ((snapshot.executionState?.currentIteration ?? 0) > 0) {
    atomicWriteJson(join(dir, `state-iter-${snapshot.executionState?.currentIteration ?? 0}.json`), snapshot)
  }
}

export function finalizeRunSnapshot(projectRoot: string, snapshot: PersistedRunSnapshot): void {
  const finalSnapshot: PersistedRunSnapshot = {
    ...snapshot,
    recoveryStatus: snapshot.executionState ? statusForState(snapshot.executionState.status) : snapshot.recoveryStatus,
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const dir = runSnapshotDir(projectRoot, finalSnapshot.sessionId)
  mkdirSync(dir, { recursive: true })
  atomicWriteJson(join(dir, FINAL_SESSION), finalSnapshot)
  removeIfExists(join(dir, CURRENT_SNAPSHOT))
  for (const entry of readdirSync(dir)) {
    if (/^state-iter-\d+\.json$/.test(entry)) removeIfExists(join(dir, entry))
  }
}

export function listRunSnapshotSessions(projectRoot: string): RecoveredSession[] {
  const root = sessionsRoot(projectRoot)
  if (!existsSync(root)) return []
  const sessions: RecoveredSession[] = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const dir = join(root, entry.name)
    const snapshot = readSnapshotFile(join(dir, FINAL_SESSION)) ?? readSnapshotFile(join(dir, CURRENT_SNAPSHOT))
    if (!snapshot) continue
    sessions.push(snapshotToSession(snapshot))
  }
  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function readRunSnapshotSession(projectRoot: string, sessionId: string): RecoveredSession | null {
  const dir = runSnapshotDir(projectRoot, sessionId)
  const snapshot = readSnapshotFile(join(dir, FINAL_SESSION)) ?? readSnapshotFile(join(dir, CURRENT_SNAPSHOT))
  return snapshot ? snapshotToSession(snapshot) : null
}

export function deleteRunSnapshotSession(projectRoot: string, sessionId: string): void {
  rmSync(runSnapshotDir(projectRoot, sessionId), { recursive: true, force: true })
}

export function snapshotToSession(snapshot: PersistedRunSnapshot): RecoveredSession {
  const state = snapshot.executionState ? recoverInterruptedState(snapshot.executionState) : null
  const messages: RecoveryChatMessage[] = [
    {
      id: `recovered-user-${snapshot.sessionId}`,
      role: 'user',
      content: snapshot.objective,
      isTask: false,
    },
  ]
  if (snapshot.finalMessage) messages.push(snapshot.finalMessage)
  return {
    id: snapshot.sessionId,
    title: snapshot.title,
    updatedAt: snapshot.updatedAt,
    scope: 'project',
    projectRoot: snapshot.projectRoot,
    messages,
    task: snapshot.task,
    executionState: state,
    events: snapshot.events,
    todos: snapshot.todos,
    recoveredFromSnapshot: true,
    recoveryStatus: snapshot.recoveryStatus,
    recoveryNote: recoveryNote(snapshot.recoveryStatus),
  }
}

export function safeSessionId(id: string): string {
  const base = basename(id).replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120)
  return base || `run-${Date.now()}`
}

function buildAssistantMessage(streamedText: string, structured?: StructuredAgentMessage): RecoveryChatMessage | undefined {
  const content = structured ? structuredMessageToHistoryText(structured) : streamedText.trim()
  if (!content && !structured) return undefined
  return {
    id: `recovered-assistant-${Date.now()}`,
    role: 'assistant',
    content,
    isTask: Boolean(structured),
    structured,
  }
}

function shouldKeepEvent(event: ExecutionEvent): boolean {
  return event.type !== 'token' && event.type !== 'reasoning_delta'
}

function recoverInterruptedState(state: ExecutionState): ExecutionState {
  if (state.status === 'completed' || state.status === 'failed') return state
  return {
    ...state,
    status: 'failed',
  }
}

function statusForState(status: ExecutionState['status']): PersistedRunSnapshot['recoveryStatus'] {
  if (status === 'completed') return 'completed'
  if (status === 'paused') return 'paused'
  if (status === 'failed') return 'failed'
  return 'running'
}

function recoveryNote(status: PersistedRunSnapshot['recoveryStatus']): string {
  if (status === 'running') return 'Recovered after an interrupted run. Review the generated files and rerun the request if more work is needed.'
  if (status === 'paused') return 'Recovered pending review evidence. The in-memory apply engine cannot be trusted after restart, so rerun or apply manually after review.'
  if (status === 'completed') return 'Recovered completed run with final receipt and execution evidence.'
  return 'Recovered failed run with execution evidence preserved.'
}

function readSnapshotFile(path: string): PersistedRunSnapshot | null {
  if (!existsSync(path)) return null
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<PersistedRunSnapshot>
    if (parsed.version !== SNAPSHOT_VERSION || typeof parsed.sessionId !== 'string') return null
    return parsed as PersistedRunSnapshot
  } catch {
    return null
  }
}

function atomicWriteJson(path: string, value: PersistedRunSnapshot): void {
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(temp, JSON.stringify(value, null, 2), 'utf-8')
  renameSync(temp, path)
}

function removeIfExists(path: string): void {
  try {
    if (existsSync(path)) unlinkSync(path)
  } catch {
    // Best effort cleanup; never let cleanup hide the completed session snapshot.
  }
}

function sessionsRoot(projectRoot: string): string {
  return join(projectRoot, '.kova', 'sessions')
}

function runSnapshotDir(projectRoot: string, sessionId: string): string {
  return join(sessionsRoot(projectRoot), safeSessionId(sessionId))
}
