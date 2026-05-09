import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { FileChange, PatchRecord } from '@kova/shared'
import { createCheckpoint, restoreCheckpoint } from './checkpoint'
import { isSafeZone, type SafeZoneConfig } from './safe-zones'
import { GitHelper } from './git-helper'

export interface ApplyResult {
  applied: boolean
  patches: PatchRecord[]
  checkpointId: string
  reason?: string
}

export class CodeApplicationEngine {
  constructor(
    private readonly projectRoot: string,
    private readonly safeZoneConfig?: Partial<SafeZoneConfig>,
  ) {}

  preview(changes: FileChange[]): string {
    return changes.map(c => formatChangePreview(c)).join('\n\n---\n\n')
  }

  async apply(changes: FileChange[], taskId: string, harnessScore = 0): Promise<ApplyResult> {
    // Only block modifications to safe zones — creating new files is allowed
    const safeFile = changes.find(c => c.type !== 'create' && isSafeZone(c.path, this.safeZoneConfig))
    if (safeFile) {
      return {
        applied: false, patches: [], checkpointId: '',
        reason: `human_required: ${safeFile.path} é safe zone`,
      }
    }

    const externalChange = detectExternalChange(changes, this.projectRoot)
    if (externalChange) {
      return {
        applied: false, patches: [], checkpointId: '',
        reason: `human_required: ${externalChange} modificado externamente`,
      }
    }

    const meta = createCheckpoint({
      taskId, files: changes.map(c => c.path),
      projectRoot: this.projectRoot, harnessScore,
    })

    try {
      const patches = writeChanges(changes, this.projectRoot, taskId)
      
      // Tenta fazer o commit no git
      const git = new GitHelper(this.projectRoot)
      const gitHash = git.commit(changes.map(c => c.path), taskId, harnessScore)

      // Retorna o hash do git com prefixo se tiver sucesso, senao fallback pro checkpoint kova
      const checkpointId = gitHash ? `git:${gitHash}` : `kova:${meta.id}`
      return { applied: true, patches, checkpointId }
    } catch (error) {
      restoreCheckpoint(meta.id, this.projectRoot)
      throw new Error(`Apply falhou e foi revertido: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async rollback(checkpointId: string): Promise<void> {
    if (checkpointId.startsWith('git:')) {
      const hash = checkpointId.replace('git:', '')
      const git = new GitHelper(this.projectRoot)
      if (!git.revert(hash)) {
        throw new Error(`Falha ao reverter commit ${hash}`)
      }
    } else {
      const id = checkpointId.replace('kova:', '')
      restoreCheckpoint(id, this.projectRoot)
    }
  }
}

function detectExternalChange(changes: FileChange[], projectRoot: string): string | null {
  for (const change of changes) {
    if (change.type === 'create' || change.before === undefined) continue
    const fullPath = join(projectRoot, change.path)
    if (!existsSync(fullPath)) continue
    const current = readFileSync(fullPath, 'utf-8')
    // If current matches what the agent wrote OR the original before, no external change
    if (current === change.diff || current === change.before) continue
    return change.path
  }
  return null
}

function writeChanges(changes: FileChange[], projectRoot: string, taskId: string): PatchRecord[] {
  const patches: PatchRecord[] = []

  for (const change of changes) {
    const fullPath = join(projectRoot, change.path)

    if (change.type === 'delete') {
      if (existsSync(fullPath)) unlinkSync(fullPath)
    } else {
      mkdirSync(dirname(fullPath), { recursive: true })
      writeFileSync(fullPath, change.diff, 'utf-8')
    }

    patches.push({
      taskId,
      file: change.path,
      diff: change.diff,
      appliedAt: new Date().toISOString(),
      rolledBack: false,
    })
  }

  return patches
}

function formatChangePreview(change: FileChange): string {
  const header = `[${change.type.toUpperCase()}] ${change.path}`
  if (change.type === 'delete') return `${header}\n(arquivo será deletado)`
  if (!change.before) return `${header}\n${change.diff}`

  const diff = [
    `--- a/${change.path}`,
    `+++ b/${change.path}`,
    ...change.before.split('\n').map(l => `- ${l}`),
    ...change.diff.split('\n').map(l => `+ ${l}`),
  ]
  return `${header}\n${diff.join('\n')}`
}
