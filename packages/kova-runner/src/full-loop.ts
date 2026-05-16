import { relative } from 'node:path'
import type { ExecutionEvent, TaskDefinition } from '@kova/shared'
import { Agent } from '@kova/agent'
import { CodeApplicationEngine } from '@kova/application'
import { adapterFromProjectProfile, detectStack } from '@kova/adapters'
import { buildProjectProfile } from '@kova/project'
import { ContextEngine } from '@kova/context'
import { ExecutionEngine, structureTask } from '@kova/execution'
import { MemorySystem } from '@kova/memory'
import { HarnessOrchestrator } from '@kova/orchestrator'
import { createProviderPair, missingProviderReason, type KovaLLMProviderName } from './llm-provider'

export interface FullLoopRequest {
  objective: string
  affectedFiles: string[]
  proposedContent?: string
  provider?: KovaLLMProviderName
  apiKey?: string
  baseUrl?: string
  model?: string
  sessionContext?: string
  autoApply?: boolean
  maxIterations?: number
}

export interface FullLoopOutput {
  handled: boolean
  applied: boolean
  status: string
  reason: string
  score: number
  iterations: number
  checkpointId?: string
  decision?: string
  preview?: string
  changedFiles?: string[]
}

export async function runFullLoop(
  projectRoot: string,
  request: FullLoopRequest,
  onEvent?: (event: ExecutionEvent) => void,
): Promise<FullLoopOutput> {
  const providers = createProviderPair(request)
  if (!providers) return skipped(missingProviderReason())

  const profile = buildProjectProfile(projectRoot)
  const adapter = profile.confidence > 0 ? adapterFromProjectProfile(profile) : detectStack(projectRoot)
  const affectedFiles = request.affectedFiles.map(f => toRelative(projectRoot, f)).filter(Boolean)

  let task: TaskDefinition
  try {
    const structured = await structureTask(request.objective, {
      root: projectRoot,
      stackAdapter: adapter.name,
      affectedFiles,
      context: buildTaskContext(request),
      llm: providers.taskProvider,
    })
    // If TSL fails (local models often can't generate valid JSON), use a minimal task
    // instead of blocking — the agent loop should always run
    task = structured.valid ? structured.task : buildFallbackTask(request.objective, adapter.name)
  } catch {
    task = buildFallbackTask(request.objective, adapter.name)
  }

  const agent = new Agent(providers.codeProvider, projectRoot)
  const memory = new MemorySystem(projectRoot)
  const applicationEngine = new CodeApplicationEngine(projectRoot)
  const engine = new ExecutionEngine({
    agent,
    orchestrator: new HarnessOrchestrator(),
    contextEngine: new ContextEngine(memory, adapter),
    applicationEngine,
    memory,
  }, { projectRoot, maxIterations: request.maxIterations ?? 5, autoApply: request.autoApply, onEvent })

  const state = await engine.run(task)
  const last = state.iterationHistory.at(-1)
  const applied = state.status === 'completed'

  return {
    handled: true,
    applied,
    status: state.status === 'paused' && last?.decision.decision === 'auto_apply' ? 'review_required' : state.status,
    reason: last?.decision.reason ?? `${providers.description}: status ${state.status}`,
    score: last?.harnessResult.score ?? 0,
    iterations: state.currentIteration,
    decision: last?.decision.decision,
    preview: !applied && last?.changes.length ? applicationEngine.preview(last.changes).slice(0, 40_000) : undefined,
    changedFiles: last?.changes.map(c => c.path),
  }
}

function toRelative(projectRoot: string, file: string): string {
  const rel = relative(projectRoot, file)
  const p = rel && !rel.startsWith('..') ? rel : file
  return p.replace(/\\/g, '/')
}

function buildTaskContext(request: FullLoopRequest): string {
  return [
    request.sessionContext
      ? `Relevant terminal session context:\n\n${request.sessionContext.slice(0, 12_000)}`
      : '',
    request.proposedContent
      ? `Proposed content (treat as a draft, not trusted output):\n\n${request.proposedContent.slice(0, 20_000)}`
      : '',
  ].filter(Boolean).join('\n\n')
}

function buildFallbackTask(objective: string, stackAdapter: string): TaskDefinition {
  return {
    id: `task-${Date.now()}`,
    objective: objective.trim(),
    constraints: [],
    nonGoals: [],
    validationCriteria: [],
    type: 'feature',
    impact: 'low',
    affectedFiles: [],
    stackAdapter,
  }
}

function skipped(reason: string): FullLoopOutput {
  return { handled: false, applied: false, status: 'skipped', reason, score: 0, iterations: 0 }
}
