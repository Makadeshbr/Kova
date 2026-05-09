import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { KovaProviderName } from './config'

export interface ProviderCredential {
  provider: KovaProviderName
  apiKey?: string
  baseUrl?: string
  updatedAt: string
}

export interface CredentialsFile {
  providers: Record<string, ProviderCredential>
}

export function credentialsPath(): string {
  return process.env.KOVA_CREDENTIALS_FILE
    ?? join(process.env.KOVA_HOME ?? join(homedir(), '.kova'), 'credentials.json')
}

export function readCredentials(): CredentialsFile {
  const file = credentialsPath()
  if (!existsSync(file)) return { providers: {} }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as CredentialsFile
    return parsed?.providers ? parsed : { providers: {} }
  } catch {
    return { providers: {} }
  }
}

export function readCredential(provider: KovaProviderName): ProviderCredential | undefined {
  return readCredentials().providers[provider]
}

export function writeCredential(credential: Omit<ProviderCredential, 'updatedAt'>): void {
  const file = credentialsPath()
  const credentials = readCredentials()
  credentials.providers[credential.provider] = { ...credential, updatedAt: new Date().toISOString() }
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(credentials, null, 2)}\n`, { encoding: 'utf-8', mode: 0o600 })
}

export function credentialProviders(): KovaProviderName[] {
  return Object.keys(readCredentials().providers) as KovaProviderName[]
}
