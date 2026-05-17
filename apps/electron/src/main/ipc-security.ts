import { app } from 'electron'
import type { Attachment, DiffReviewSelection } from '@kova/shared'
import type { StartTaskParams } from './engine-manager'
import type { KovaSettings } from './ipc-handlers'

// Mirror of the renderer's per-attachment / per-message caps. Enforced
// server-side so a malicious renderer cannot bypass the limit by faking the IPC.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_ATTACHMENT_BYTES = 50 * 1024 * 1024
const MAX_ATTACHMENTS = 12
const ALLOWED_MIME_PREFIXES = ['image/', 'text/']
const ALLOWED_EXACT_MIME = new Set(['application/pdf', 'application/json'])

type EventLike = { senderFrame?: { url?: string } | null }

export function isTrustedIpcSender(event: EventLike, isDev = !app.isPackaged): boolean {
  const url = event.senderFrame?.url ?? ''
  if (!url) return false
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'file:') return true
    if (!isDev) return false
    return parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

export function assertTrustedIpcSender(event: EventLike, isDev = !app.isPackaged): void {
  if (!isTrustedIpcSender(event, isDev)) throw new Error('IPC origin blocked')
}

export function sanitizeStartTaskParams(value: unknown): StartTaskParams {
  if (!isRecord(value)) throw new Error('Invalid task params')
  const objective = stringField(value.objective, 'objective', 20_000)
  const projectRoot = stringField(value.projectRoot, 'projectRoot', 2_000)
  return {
    objective,
    projectRoot,
    provider: optionalString(value.provider, 80),
    apiKey: optionalString(value.apiKey, 4_000),
    model: optionalString(value.model, 300),
    baseUrl: optionalString(value.baseUrl, 2_000),
    autoApply: optionalBoolean(value.autoApply),
    maxIterations: optionalNumber(value.maxIterations, 1, 20),
    mode: oneOf(value.mode, ['chat', 'plan', 'patch', 'review']),
    permissionMode: oneOf(value.permissionMode, ['auto-review', 'ask', 'full-access']),
    includeProjectContext: optionalBoolean(value.includeProjectContext),
    queuedCount: optionalNumber(value.queuedCount, 0, 1_000),
    openedFiles: optionalStringArray(value.openedFiles, 200, 2_000),
  }
}

export function sanitizeHistory(value: unknown): Array<{ role: string; content: string }> {
  if (!Array.isArray(value)) return []
  return value.slice(-80).map(item => {
    if (!isRecord(item)) throw new Error('Invalid history item')
    const role = oneOf(item.role, ['user', 'assistant'])
    return { role: role ?? 'user', content: stringField(item.content, 'content', 80_000) }
  })
}

export function mergeSettingsForSave(incoming: unknown, existing: Partial<KovaSettings>): KovaSettings {
  if (!isRecord(incoming)) throw new Error('Invalid settings payload')
  const settings = incoming as Partial<KovaSettings>
  const merged: KovaSettings = {
    defaultProvider: optionalString(settings.defaultProvider, 80) ?? 'lmstudio',
    anthropicKey: optionalString(settings.anthropicKey, 4_000) ?? '',
    openaiKey: optionalString(settings.openaiKey, 4_000) ?? '',
    deepseekKey: optionalString(settings.deepseekKey, 4_000) ?? '',
    openrouterKey: optionalString(settings.openrouterKey, 4_000) ?? '',
    kimiKey: optionalString(settings.kimiKey, 4_000) ?? '',
    geminiKey: optionalString(settings.geminiKey, 4_000) ?? '',
    xaiKey: optionalString(settings.xaiKey, 4_000) ?? '',
    openaiCompatibleKey: optionalString(settings.openaiCompatibleKey, 4_000) ?? '',
    ollamaUrl: optionalString(settings.ollamaUrl, 2_000) ?? 'http://localhost:11434/v1',
    compatibleUrl: optionalString(settings.compatibleUrl, 2_000) ?? 'http://localhost:1234/v1',
    model: optionalString(settings.model, 300) ?? '',
    autoApply: optionalBoolean(settings.autoApply) ?? true,
    permissionMode: oneOf(settings.permissionMode, ['auto-review', 'ask', 'full-access']) ?? 'auto-review',
    maxIterations: optionalNumber(settings.maxIterations, 1, 20) ?? 5,
    fallbackProvider: optionalString(settings.fallbackProvider, 80),
    fallbackModel: optionalString(settings.fallbackModel, 300),
    nvidiaKey: optionalString(settings.nvidiaKey, 4_000),
    nvidiaEnableThinking: optionalBoolean(settings.nvidiaEnableThinking),
  }
  if (!merged.nvidiaKey || merged.nvidiaKey.includes('****')) merged.nvidiaKey = existing.nvidiaKey
  return merged
}

export function sanitizeAttachments(value: unknown): Attachment[] | undefined {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value)) throw new Error('Invalid attachments payload')
  if (value.length === 0) return undefined
  if (value.length > MAX_ATTACHMENTS) throw new Error(`Too many attachments — max ${MAX_ATTACHMENTS}`)
  let total = 0
  const result: Attachment[] = []
  for (const item of value) {
    if (!isRecord(item)) throw new Error('Invalid attachment item')
    const kind = oneOf(item.kind, ['image', 'document', 'text']) as Attachment['kind'] | undefined
    if (!kind) throw new Error('Invalid attachment kind')
    const mimeType = stringField(item.mimeType, 'attachment.mimeType', 200)
    const allowedMime = ALLOWED_MIME_PREFIXES.some(p => mimeType.startsWith(p)) || ALLOWED_EXACT_MIME.has(mimeType)
    if (!allowedMime) throw new Error(`Unsupported attachment type: ${mimeType}`)
    const name = stringField(item.name, 'attachment.name', 500)
    if (typeof item.sizeBytes !== 'number' || !Number.isFinite(item.sizeBytes) || item.sizeBytes < 0) {
      throw new Error('Invalid attachment sizeBytes')
    }
    if (item.sizeBytes > MAX_ATTACHMENT_BYTES) throw new Error(`Attachment "${name}" exceeds 10 MB limit`)
    total += item.sizeBytes
    if (total > MAX_TOTAL_ATTACHMENT_BYTES) throw new Error('Total attachment size exceeds 50 MB')
    const base64 = stringField(item.base64, 'attachment.base64', MAX_ATTACHMENT_BYTES * 2)
    if (!/^[A-Za-z0-9+/=]*$/.test(base64)) throw new Error('Invalid base64 payload')
    result.push({ kind, name, mimeType, sizeBytes: item.sizeBytes, base64 })
  }
  return result
}

export function sanitizeDiffReviewSelection(value: unknown): DiffReviewSelection | undefined {
  if (value === undefined || value === null) return undefined
  if (!isRecord(value) || !Array.isArray(value.files)) throw new Error('Invalid diff review selection')
  return {
    files: value.files.map(item => {
      if (!isRecord(item)) throw new Error('Invalid diff review file decision')
      return {
        path: stringField(item.path, 'path', 2_000),
        decision: oneOf(item.decision, ['approve', 'reject', 'partial']) ?? 'reject',
        approvedHunkIds: optionalStringArray(item.approvedHunkIds, 5_000, 2_000),
      }
    }),
  }
}

export function sanitizeSession(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('Invalid session')
  const id = stringField(value.id, 'id', 200)
  return { ...value, id }
}

export function stringField(value: unknown, name: string, maxLength: number): string {
  if (typeof value !== 'string' || value.length > maxLength) throw new Error(`Invalid ${name}`)
  return value
}

export function optionalString(value: unknown, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || value.length > maxLength) throw new Error('Invalid string payload')
  return value
}

export function optionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'boolean') throw new Error('Invalid boolean payload')
  return value
}

export function optionalNumber(value: unknown, min: number, max: number): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error('Invalid number payload')
  return Math.floor(value)
}

function optionalStringArray(value: unknown, maxItems: number, maxLength: number): string[] | undefined {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || value.length > maxItems) throw new Error('Invalid string array payload')
  return value.map(item => stringField(item, 'array item', maxLength))
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new Error('Invalid enum payload')
  return value as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
