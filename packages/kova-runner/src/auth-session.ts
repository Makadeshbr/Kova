import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

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

export function readKovaAuthSession(): KovaAuthSession | null {
  const file = authSessionPath()
  if (!existsSync(file)) return null

  try {
    const session = JSON.parse(readFileSync(file, 'utf-8')) as Partial<KovaAuthSession>
    if (session.type !== 'oauth' || session.provider !== 'onauth' || !session.accessToken) return null
    if (isExpired(session.expiresAt)) return null
    return session as KovaAuthSession
  } catch {
    return null
  }
}

export function authSessionPath(): string {
  return process.env.KOVA_AUTH_FILE
    ?? join(process.env.KOVA_HOME ?? join(homedir(), '.kova'), 'auth.json')
}

function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false
  const time = Date.parse(expiresAt)
  if (Number.isNaN(time)) return true
  return time <= Date.now() + 30_000
}
