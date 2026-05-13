import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { AgentContext, AgentMode, AgentOutput, TaskDefinition } from '@kova/shared'
import type { LiveEvalCase, LiveEvalDependencies } from './index'
import { MockAgentProvider } from './mock-provider'
import { AGENT_TOOLS, ToolExecutor } from '@kova/agent'
import { HarnessOrchestrator } from '@kova/orchestrator'
import { CodeApplicationEngine } from '@kova/application'
import { ContextEngine } from '@kova/context'
import { MemorySystem } from '@kova/memory'
import { detectStack } from '@kova/adapters'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function task(overrides: Partial<TaskDefinition>): TaskDefinition {
  return {
    id: `eval-live-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    objective: 'eval task',
    constraints: [],
    nonGoals: [],
    validationCriteria: [],
    type: 'feature',
    impact: 'low',
    affectedFiles: [],
    stackAdapter: 'generic',
    ...overrides,
  }
}

/**
 * Build real ExecutionEngine deps with a MockAgentProvider.
 *
 * The agent wrapper creates a real ToolExecutor each iteration so file I/O
 * is real. Only the "model intelligence" (what to write) is controlled.
 */
export function buildDeps(projectRoot: string, provider: MockAgentProvider): LiveEvalDependencies {
  return {
    agent: {
      execute: async (
        t: TaskDefinition,
        _ctx: AgentContext,
        mode: AgentMode,
        opts?: {
          signal?: AbortSignal
          onToken?: (token: string) => void
          onToolCall?: (name: string, input: Record<string, unknown>) => void
          onToolResult?: (name: string, result: string) => void
          interactiveRunner?: (cmd: string, cwd: string, reason: string) => Promise<{ exitCode: number; output: string }>
        },
      ): Promise<AgentOutput> => {
        const executor = new ToolExecutor(projectRoot, opts?.signal, undefined, opts?.interactiveRunner)
        const result = await provider.runAgentLoop(
          [{ role: 'user', content: t.objective }],
          {
            system: '',
            tools: AGENT_TOOLS,
            executor,
            maxTurns: 10,
            signal: opts?.signal,
            onToken: opts?.onToken,
            onToolCall: opts?.onToolCall,
            onToolResult: opts?.onToolResult,
          },
        )
        return { mode, thought: result.thought, changes: result.changes, tokensUsed: result.tokensUsed }
      },
    },
    orchestrator: new HarnessOrchestrator(),
    contextEngine: new ContextEngine(new MemorySystem(projectRoot), detectStack(projectRoot)),
    applicationEngine: new CodeApplicationEngine(projectRoot),
    memory: new MemorySystem(projectRoot),
  }
}

// ─── Case definitions ─────────────────────────────────────────────────────────

/**
 * Case 1 — Stack mismatch: Go project, model writes TypeScript → contract rejects.
 */
export const EVAL_STACK_MISMATCH: LiveEvalCase = {
  id: 'live-stack-mismatch-go-ts',
  description: 'Go project: writing .ts file must be rejected by contract',
  task: task({
    objective: 'create a REST API handler',
    stackAdapter: 'go',
    affectedFiles: ['handler.go'],
    type: 'feature',
  }),
  projectRoot: '',
  maxIterations: 1,
  expectedStatus: 'paused',
  expectedDecision: 'reject',
  dryRun: true,
}

/**
 * Case 2 — Safe zone: model tries to modify .env → human_required (sensitive, needs human).
 * Safe zone violations go through the review gate (not the contract) and become
 * 'human_required' because humans must approve sensitive file modifications.
 */
export const EVAL_SAFE_ZONE: LiveEvalCase = {
  id: 'live-safe-zone-env',
  description: 'Modifying .env must trigger human_required (sensitive safe zone)',
  task: task({
    objective: 'add a config value',
    stackAdapter: 'generic',
    type: 'feature',
  }),
  projectRoot: '',
  maxIterations: 1,
  expectedStatus: 'paused',
  expectedDecision: 'human_required',
  dryRun: true,
}

/**
 * Case 3 — No validation: empty project, no build/test commands.
 * Score must be ≤ 75 → never auto_apply.
 */
export const EVAL_NO_VALIDATION_SUGGESTS: LiveEvalCase = {
  id: 'live-no-validation-suggests',
  description: 'Empty project: no validation configured → suggest, never auto_apply',
  task: task({
    objective: 'create a simple utility function',
    stackAdapter: 'generic',
    type: 'feature',
  }),
  projectRoot: '',
  maxIterations: 1,
  expectedStatus: 'paused',
  expectedDecision: 'suggest',
  dryRun: true,
}

/**
 * Case 4 — Max files exceeded: impact='low' allows 6 files, model changes 8.
 */
export const EVAL_MAX_FILES_EXCEEDED: LiveEvalCase = {
  id: 'live-max-files-exceeded',
  description: 'Low-impact task but model edits 8 files → contract rejects',
  task: task({
    objective: 'refactor utility functions',
    stackAdapter: 'generic',
    type: 'refactor',
    impact: 'low',
  }),
  projectRoot: '',
  maxIterations: 1,
  expectedStatus: 'paused',
  expectedDecision: 'reject',
  dryRun: true,
}

/**
 * Case 5 — Text-only response: model only emits text, no file writes.
 * Should complete immediately without harness.
 */
export const EVAL_TEXT_ONLY_RESPONSE: LiveEvalCase = {
  id: 'live-text-only-no-changes',
  description: 'Model responds with text only → completed immediately, no harness',
  task: task({
    objective: 'explain how authentication works',
    stackAdapter: 'generic',
    type: 'docs',
  }),
  projectRoot: '',
  maxIterations: 1,
  expectedStatus: 'completed',
  dryRun: true,
}

/**
 * Case 6 — Harness with configured build: model writes a file, echo build runs.
 */
export const EVAL_HARNESS_WITH_BUILD: LiveEvalCase = {
  id: 'live-harness-build-passes',
  description: 'Configured build command: model writes file, echo harness passes → suggest',
  task: task({
    objective: 'add a utility file',
    stackAdapter: 'generic',
    type: 'feature',
  }),
  projectRoot: '',
  maxIterations: 1,
  expectedStatus: 'paused',
  expectedDecision: 'suggest',
  dryRun: true,
}

/**
 * Case 7 - Multi-turn repair: first patch fails validation, second patch repairs it.
 */
export const EVAL_MULTI_TURN_REPAIR: LiveEvalCase = {
  id: 'live-multi-turn-repair-loop',
  description: 'Build failure on first iteration must feed repair loop and pass on second iteration',
  task: task({
    objective: 'create a valid JavaScript module',
    stackAdapter: 'generic',
    type: 'feature',
    affectedFiles: ['app.js'],
  }),
  projectRoot: '',
  maxIterations: 2,
  expectedStatus: 'paused',
  expectedDecision: 'auto_apply',
  dryRun: true,
}

export const ALL_LIVE_CASES = [
  EVAL_STACK_MISMATCH,
  EVAL_SAFE_ZONE,
  EVAL_NO_VALIDATION_SUGGESTS,
  EVAL_MAX_FILES_EXCEEDED,
  EVAL_TEXT_ONLY_RESPONSE,
  EVAL_HARNESS_WITH_BUILD,
  EVAL_MULTI_TURN_REPAIR,
]

// ─── Per-case project setup ────────────────────────────────────────────────────

export function setupProjectForCase(caseId: string, projectRoot: string): void {
  switch (caseId) {
    case 'live-harness-build-passes':
    case 'live-multi-turn-repair-loop':
      mkdirSync(join(projectRoot, '.kova'), { recursive: true })
      writeFileSync(
        join(projectRoot, '.kova', 'harness.json'),
        JSON.stringify({
          validation: {
            build: [caseId === 'live-multi-turn-repair-loop' ? 'node --check app.js' : 'node --version'],
            test: [caseId === 'live-multi-turn-repair-loop' ? 'node --version' : 'node --version'],
          },
        }),
      )
      break
    case 'live-safe-zone-env':
      writeFileSync(join(projectRoot, '.env'), 'SECRET=existing\n')
      break
    default:
      break
  }
}

export function mocksForCase(caseId: string, _projectRoot: string): import('./mock-provider').MockTurn[] {
  switch (caseId) {
    case 'live-stack-mismatch-go-ts':
      return [{ toolCalls: [{ name: 'write_file', input: { path: 'helpers.ts', content: 'export const x = 1\n' } }] }]

    case 'live-safe-zone-env':
      return [{ toolCalls: [{ name: 'write_file', input: { path: '.env', content: 'SECRET=hacked\n' } }] }]

    case 'live-no-validation-suggests':
      return [{ toolCalls: [{ name: 'write_file', input: { path: 'util.go', content: 'package main\n\nfunc Util() {}\n' } }] }]

    case 'live-max-files-exceeded':
      return [{ toolCalls: Array.from({ length: 8 }, (_, i) => ({ name: 'write_file', input: { path: `file${i}.go`, content: 'package main\n' } })) }]

    case 'live-text-only-no-changes':
      return [{ text: 'Authentication works by verifying a token on each request.' }]

    case 'live-harness-build-passes':
      return [{ toolCalls: [{ name: 'write_file', input: { path: 'util.go', content: 'package main\n\nfunc Util() {}\n' } }] }]

    case 'live-multi-turn-repair-loop':
      // Both iterations use the same module style (CommonJS) — review gate semantic adapter
      // should not flag this as API removal. Only the SYNTAX is fixed, public surface preserved.
      return [
        { toolCalls: [{ name: 'write_file', input: { path: 'app.js', content: 'function answer( {\n' } }] },
        { toolCalls: [{ name: 'write_file', input: { path: 'app.js', content: 'function answer() {\n  return 42\n}\nmodule.exports = { answer }\n' } }] },
      ]

    default:
      return [{ text: 'Done.' }]
  }
}
