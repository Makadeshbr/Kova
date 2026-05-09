import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Learning } from '@kova/shared'

type Scope = 'project' | 'global'

function resolvePath(scope: Scope, projectRoot?: string): string {
  if (scope === 'global') return join(homedir(), '.kova', 'global', 'learnings.json')
  if (!projectRoot) throw new Error('projectRoot obrigatório para scope project')
  return join(projectRoot, '.kova', 'memory', 'learnings.json')
}

export function readLearnings(scope: Scope, projectRoot?: string): Learning[] {
  const filePath = resolvePath(scope, projectRoot)
  if (!existsSync(filePath)) return []

  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as Learning[]
  } catch (error) {
    throw new Error(`Falha ao ler learnings de ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export function writeLearnings(scope: Scope, data: Learning[], projectRoot?: string): void {
  const filePath = resolvePath(scope, projectRoot)
  const dir = filePath.replace(/[/\\][^/\\]+$/, '')
  mkdirSync(dir, { recursive: true })

  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    throw new Error(`Falha ao escrever learnings em ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
