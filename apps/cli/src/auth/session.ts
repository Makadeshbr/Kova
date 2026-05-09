import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export interface KovaAuthSession {
  type: 'oauth'
  provider: 'onauth'
  accessToken: string
  refreshToken?: string
  tokenType?: string
  scope?: string
  expiresAt?: string
  account?: {
    id?: string
    email?: string
    name?: string
  }
  baseUrl?: string
  model?: string
  createdAt: string
  updatedAt: string
}

export function authSessionPath(): string {
  return process.env.KOVA_AUTH_FILE
    ?? join(process.env.KOVA_HOME ?? join(homedir(), '.kova'), 'auth.json')
}

export function readAuthSession(): KovaAuthSession | null {
  const file = authSessionPath()
  if (!existsSync(file)) return null

  try {
    const session = JSON.parse(readFileSync(file, 'utf-8')) as Partial<KovaAuthSession>
    if (session.type !== 'oauth' || session.provider !== 'onauth' || !session.accessToken) return null
    return session as KovaAuthSession
  } catch {
    return null
  }
}

export function writeAuthSession(session: KovaAuthSession): void {
  const file = authSessionPath()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(session, null, 2)}\n`, { encoding: 'utf-8', mode: 0o600 })
}

export function deleteAuthSession(): boolean {
  const file = authSessionPath()
  if (!existsSync(file)) return false
  rmSync(file, { force: true })
  return true
}

export function isAuthSessionExpired(session: KovaAuthSession): boolean {
  if (!session.expiresAt) return false
  const time = Date.parse(session.expiresAt)
  if (Number.isNaN(time)) return true
  return time <= Date.now() + 30_000
}
