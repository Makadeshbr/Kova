import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import type { FileChange } from '@kova/shared'

const PREVIEW_ROOT = '.kova/preview'
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'out', 'build', '.next', '.turbo', 'coverage'])
const SKIP_KOVA = ['.kova/sessions', '.kova/traces']

export interface PreviewWorkspace {
  root: string
  relativeRoot: string
}

export function createPreviewWorkspace(projectRoot: string, changes: FileChange[], taskId = 'task'): PreviewWorkspace {
  const previewId = `${sanitizeId(taskId)}-${Date.now()}`
  const relativeRoot = `${PREVIEW_ROOT}/${previewId}`
  const root = join(projectRoot, relativeRoot)
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root, { recursive: true })

  if (existsSync(projectRoot)) {
    for (const entry of readdirSync(projectRoot)) {
      const source = join(projectRoot, entry)
      if (!shouldCopy(projectRoot, source)) continue
      cpSync(source, join(root, entry), {
        recursive: true,
        dereference: false,
        errorOnExist: false,
        filter: (src) => shouldCopy(projectRoot, src),
      })
    }
  }

  for (const change of changes) {
    const target = join(root, change.path)
    if (change.type === 'delete') {
      try { unlinkSync(target) } catch { /* already absent */ }
      continue
    }
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, change.diff, 'utf-8')
  }

  return { root, relativeRoot }
}

function shouldCopy(projectRoot: string, src: string): boolean {
  const rel = relative(projectRoot, src).replace(/\\/g, '/')
  if (!rel) return true
  if (rel === PREVIEW_ROOT || rel.startsWith(`${PREVIEW_ROOT}/`)) return false
  if (SKIP_KOVA.some(prefix => rel === prefix || rel.startsWith(`${prefix}/`))) return false
  const first = rel.split('/')[0]
  if (first === '.kova') return false
  return !SKIP_DIRS.has(first)
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'task'
}
