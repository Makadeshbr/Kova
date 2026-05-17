import { resolve, relative } from 'node:path'
import type { AgentContext, AgentMessage, ExecutionEvent, TaskDefinition } from '@kova/shared'
import type { AgentProvider } from '@kova/agent'
import type { StackAdapter } from '@kova/shared'
import { ContextEngine, estimateTokens } from '@kova/context'
import { resolveTaskStack } from '@kova/execution'
import { MemorySystem } from '@kova/memory'

/**
 * Build a ContextEngine. The `memory` argument is optional — if omitted, a fresh
 * MemorySystem is created. Callers that need cross-session memory continuity
 * (EngineManager) pass a cached MemorySystem so learnings persist across turns.
 */
export function buildContextEngine(
  projectRoot: string,
  adapter: StackAdapter,
  memory?: MemorySystem,
): ContextEngine {
  return new ContextEngine(memory ?? new MemorySystem(projectRoot), adapter)
}

export function contextBudgetFor(provider: AgentProvider): number {
  const limit = provider.capabilities().contextTokenLimit
  return Math.min(20_000, Math.max(2_000, Math.floor(limit * 0.35)))
}

export function contextBuildOptions(
  projectRoot: string,
  maxTokens: number,
  explicitFiles: string[] = [],
  openedFiles: string[] = [],
): { maxTokens: number; explicitFiles: string[]; openedFiles: string[] } {
  return {
    maxTokens,
    explicitFiles: [...new Set(explicitFiles.filter(Boolean).map(f => toRelative(projectRoot, f)))],
    openedFiles: [...new Set(openedFiles.filter(Boolean).map(f => toRelative(projectRoot, f)))],
  }
}

export function contextEventPayload(
  ctx: AgentContext,
  maxTokens: number,
): NonNullable<ExecutionEvent['context']> {
  return {
    files: ctx.files.map(f => f.path),
    tokensUsed: ctx.tokensUsed,
    maxTokens,
    learningsCount: ctx.learnings.length,
    selectedFiles: ctx.pack?.selectedFiles.slice(0, 12).map(f => ({
      path: f.path, score: f.score, confidence: f.confidence,
      reason: f.reason, evidence: f.evidence, source: f.source, kind: f.kind,
    })),
    blockedFiles: ctx.pack?.blockedFiles,
    rejectedFiles: ctx.pack?.rejectedFiles.slice(0, 20),
    warnings: ctx.pack?.warnings,
  }
}

export function createReasoningEmitter(
  emit: (event: Omit<ExecutionEvent, 'taskId' | 'timestamp'> & { taskId?: string }) => void,
): { start: () => void; delta: (delta: string) => void; end: () => void } {
  let active = false
  return {
    start: () => {
      if (active) return
      active = true
      emit({ type: 'reasoning_start', message: 'Reasoning...' })
    },
    delta: (delta: string) => {
      if (!delta) return
      if (!active) { active = true; emit({ type: 'reasoning_start', message: 'Reasoning...' }) }
      emit({ type: 'reasoning_delta', reasoning: delta })
    },
    end: () => {
      if (!active) return
      active = false
      emit({ type: 'reasoning_end' })
    },
  }
}

export function estimateMessagesTokens(messages: AgentMessage[]): number {
  return estimateTokens(messages.map(m => `${m.role}: ${m.content}`).join('\n\n'))
}

export function buildFallbackTask(objective: string, stackAdapter: string): TaskDefinition {
  const trimmed = objective.trim()
  return {
    id: `task-${Date.now()}`, objective: trimmed,
    constraints: [], nonGoals: [], validationCriteria: [],
    type: 'feature', impact: 'low', affectedFiles: [],
    // Explicit language in the objective ("JavaScript puro", "em Go", "Python") wins
    // over the project-detected stack. Lets the contract enforce restrictions correctly
    // even when structureTask fails and we fall back to a minimal TaskDefinition.
    stackAdapter: resolveTaskStack(trimmed, stackAdapter),
  }
}

export function toRelative(root: string, filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const rootNorm = root.replace(/\\/g, '/')
  if (normalized.startsWith(rootNorm + '/')) return normalized.slice(rootNorm.length + 1)
  if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith('/')) {
    try {
      const rel = relative(root, resolve(filePath)).replace(/\\/g, '/')
      if (!rel.startsWith('..')) return rel
    } catch { /* ignore */ }
    return normalized.split('/').at(-1) ?? normalized
  }
  return normalized
}
