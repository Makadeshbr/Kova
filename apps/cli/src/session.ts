import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

export type SessionEventKind = 'user' | 'assistant' | 'command' | 'system'

export interface SessionEvent {
  kind: SessionEventKind
  content: string
  timestamp: string
  status?: string
  score?: number
  iterations?: number
}

export interface KovaSession {
  id: string
  title: string
  projectRoot: string
  createdAt: string
  updatedAt: string
  events: SessionEvent[]
}

export function sessionDir(projectRoot: string): string {
  return join(projectRoot, '.kova', 'sessions')
}

export function createSession(projectRoot: string, title = 'Kova session'): KovaSession {
  const now = new Date().toISOString()
  const session: KovaSession = {
    id: makeSessionId(),
    title,
    projectRoot,
    createdAt: now,
    updatedAt: now,
    events: [],
  }
  saveSession(session)
  return session
}

export function readSession(projectRoot: string, id: string): KovaSession | null {
  const file = sessionPath(projectRoot, id)
  if (!existsSync(file)) return null
  try {
    const session = JSON.parse(readFileSync(file, 'utf-8')) as KovaSession
    return session && session.id ? session : null
  } catch {
    return null
  }
}

export function saveSession(session: KovaSession): void {
  session.updatedAt = new Date().toISOString()
  mkdirSync(sessionDir(session.projectRoot), { recursive: true })
  writeFileSync(sessionPath(session.projectRoot, session.id), `${JSON.stringify(session, null, 2)}\n`, 'utf-8')
}

export function appendSessionEvent(session: KovaSession, event: Omit<SessionEvent, 'timestamp'>): KovaSession {
  session.events.push({ ...event, timestamp: new Date().toISOString() })
  saveSession(session)
  return session
}

export function listSessions(projectRoot: string): KovaSession[] {
  const dir = sessionDir(projectRoot)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .map(file => readSession(projectRoot, basename(file, '.json')))
    .filter((session): session is KovaSession => Boolean(session))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function latestSession(projectRoot: string): KovaSession | null {
  return listSessions(projectRoot)[0] ?? null
}

export function sessionContext(session: KovaSession | null, maxEvents = 12): string {
  if (!session || session.events.length === 0) return ''
  const events = session.events.slice(-maxEvents)
  return [
    `Kova terminal session ${session.id}: ${session.title}`,
    ...events.map(event => {
      const status = event.status ? ` [${event.status}]` : ''
      return `${event.kind}${status}: ${event.content}`
    }),
  ].join('\n')
}

export function sessionSummary(session: KovaSession): string {
  const last = session.events.at(-1)
  const lastText = last ? last.content.replace(/\s+/g, ' ').slice(0, 80) : 'empty'
  return `${session.id}  ${session.updatedAt}  ${session.title}  ${lastText}`
}

function sessionPath(projectRoot: string, id: string): string {
  return join(sessionDir(projectRoot), `${id}.json`)
}

function makeSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
