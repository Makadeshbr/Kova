import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Learning } from '@kova/shared'

type Scope = 'project' | 'global'

export interface PendingLearning {
  candidateDescription: string
  type: Learning['type']
  scope: Learning['scope']
  tags: string[]
  stack?: string
  source: string
  reason: string
  classification: string
  queuedAt: string
}

function resolvePath(scope: Scope, projectRoot?: string): string {
  if (scope === 'global') return join(homedir(), '.kova', 'global', 'learnings.json')
  if (!projectRoot) throw new Error('projectRoot obrigatório para scope project')
  return join(projectRoot, '.kova', 'memory', 'learnings.json')
}

function resolvePendingPath(projectRoot: string): string {
  return join(projectRoot, '.kova', 'memory', 'pending.json')
}

function readJsonFile<T>(filePath: string): T[] {
  if (!existsSync(filePath)) return []
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as T[]
  } catch (error) {
    throw new Error(`Falha ao ler ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function writeJsonFile<T>(filePath: string, data: T[]): void {
  mkdirSync(filePath.replace(/[/\\][^/\\]+$/, ''), { recursive: true })
  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    throw new Error(`Falha ao escrever ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export function readLearnings(scope: Scope, projectRoot?: string): Learning[] {
  return readJsonFile<Learning>(resolvePath(scope, projectRoot))
}

export function writeLearnings(scope: Scope, data: Learning[], projectRoot?: string): void {
  writeJsonFile(resolvePath(scope, projectRoot), data)
}

export function readPendingLearnings(projectRoot: string): PendingLearning[] {
  return readJsonFile<PendingLearning>(resolvePendingPath(projectRoot))
}

export function appendPendingLearning(entry: PendingLearning, projectRoot: string): void {
  const existing = readPendingLearnings(projectRoot)
  // Deduplicate by candidateDescription to avoid flooding the queue
  const key = entry.candidateDescription.toLowerCase().trim().slice(0, 200)
  if (existing.some(e => e.candidateDescription.toLowerCase().trim().slice(0, 200) === key)) return
  writeJsonFile(resolvePendingPath(projectRoot), [...existing, entry])
}

export function clearPendingLearnings(projectRoot: string): void {
  writeJsonFile(resolvePendingPath(projectRoot), [])
}
