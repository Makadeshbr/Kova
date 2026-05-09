import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

export interface CheckpointMeta {
  id: string
  taskId: string
  timestamp: string
  harnessScore: number
  files: string[]
}

interface CreateCheckpointParams {
  taskId: string
  files: string[]
  projectRoot: string
  harnessScore?: number
}

export function createCheckpoint(params: CreateCheckpointParams): CheckpointMeta {
  const { taskId, files, projectRoot, harnessScore = 0 } = params
  const id = generateId()
  const checkpointDir = join(projectRoot, '.kova', 'checkpoints', id)
  mkdirSync(checkpointDir, { recursive: true })

  for (const relPath of files) {
    const srcPath = join(projectRoot, relPath)
    if (!existsSync(srcPath)) continue
    const destPath = join(checkpointDir, 'files', relPath)
    mkdirSync(dirname(destPath), { recursive: true })
    writeFileSync(destPath, readFileSync(srcPath))
  }

  const meta: CheckpointMeta = { id, taskId, timestamp: new Date().toISOString(), harnessScore, files }
  writeFileSync(join(checkpointDir, 'meta.json'), JSON.stringify(meta, null, 2))
  return meta
}

export function restoreCheckpoint(id: string, projectRoot: string): void {
  const checkpointDir = join(projectRoot, '.kova', 'checkpoints', id)
  const metaPath = join(checkpointDir, 'meta.json')

  if (!existsSync(metaPath)) {
    throw new Error(`Checkpoint ${id} não encontrado em ${projectRoot}`)
  }

  const meta: CheckpointMeta = JSON.parse(readFileSync(metaPath, 'utf-8'))

  for (const relPath of meta.files) {
    const srcPath = join(checkpointDir, 'files', relPath)
    if (!existsSync(srcPath)) continue
    const destPath = join(projectRoot, relPath)
    mkdirSync(dirname(destPath), { recursive: true })
    writeFileSync(destPath, readFileSync(srcPath))
  }
}

export function listCheckpoints(projectRoot: string): CheckpointMeta[] {
  const dir = join(projectRoot, '.kova', 'checkpoints')
  if (!existsSync(dir)) return []

  const results: CheckpointMeta[] = []
  for (const id of readdirSync(dir)) {
    const metaPath = join(dir, id, 'meta.json')
    if (!existsSync(metaPath)) continue
    try {
      results.push(JSON.parse(readFileSync(metaPath, 'utf-8')) as CheckpointMeta)
    } catch (error) {
      throw new Error(`meta.json corrompido no checkpoint ${id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export function deleteCheckpoint(id: string, projectRoot: string): void {
  const checkpointDir = join(projectRoot, '.kova', 'checkpoints', id)
  if (existsSync(checkpointDir)) rmSync(checkpointDir, { recursive: true })
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
