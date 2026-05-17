import type { FileChange, HarnessResult, TaskDefinition, ExecutionState } from '@kova/shared'
import { createExecutionContract, validateContractChanges, ExecutionEngine } from '@kova/execution'
import type { ExecutionDependencies, ExecutionEngineOptions } from '@kova/execution'
import { calculateScore } from '@kova/decision'
import { runReviewGate } from '@kova/decision'

export { MockAgentProvider } from './mock-provider'
export type { MockTurn } from './mock-provider'
export { ALL_LIVE_CASES, buildDeps, setupProjectForCase, mocksForCase } from './live-cases'
export { DOGFOOD_CASES, setupDogfoodProject } from './dogfood-cases'
export { GOLDEN_SCENARIOS } from './golden-scenarios'
export type { GoldenScenario, GoldenScenarioExpectation } from './golden-scenarios'
export { readDogfoodProviderConfig, runRealDogfood } from './real-dogfood'
export { validateDogfoodOutput } from './dogfood-validator'
export type { DogfoodExpectations, DogfoodViolation, DogfoodViolationRule, FileChangeRef } from './dogfood-validator'

export interface EvalCase {
  id: string
  description: string
  category: 'stack' | 'scope' | 'safe-zone' | 'security' | 'score' | 'review-gate'
  task: TaskDefinition
  changes: FileChange[]
  mustPass: boolean
  expectedRules: string[]
}

export interface EvalResult {
  id: string
  category: EvalCase['category']
  passed: boolean
  score: number
  failedRules: string[]
  notes: string[]
}

export function runStaticEval(testCase: EvalCase): EvalResult {
  const contract = createExecutionContract(testCase.task)
  const violations = validateContractChanges(testCase.changes, contract)
  const harnessResult = harnessFromViolations(violations)
  const review = runReviewGate({ changes: testCase.changes, contract, harnessResult })

  const failedRules = [
    ...violations.map(v => v.rule),
    ...review.findings.filter(f => f.blocking).map(f => f.category),
  ]
  const uniqueRules = [...new Set(failedRules)]

  const expectedHit = testCase.expectedRules.every(rule => uniqueRules.includes(rule))
  const behaviorPassed = testCase.mustPass ? uniqueRules.length === 0 : uniqueRules.length > 0

  return {
    id: testCase.id,
    category: testCase.category,
    passed: behaviorPassed && expectedHit,
    score: calculateScore(harnessResult),
    failedRules: uniqueRules,
    notes: review.findings.map(f => f.message),
  }
}

// ─── Eval cases ───────────────────────────────────────────────────────────────

export const BASE_EVALS: EvalCase[] = [
  // STACK — agent must not MODIFY existing files in the wrong language.
  // Scaffolding (pure-create) bypasses stack_mismatch by design: the agent
  // materializes a new project and picks the stack as it goes. See live-cases
  // EVAL_NO_VALIDATION_SUGGESTS for the Claude Code parity expectation.
  {
    id: 'go-api-does-not-create-typescript',
    description: 'Go API task — modifying helpers.ts in an existing Go project is a violation.',
    category: 'stack',
    task: task({ objective: 'extend a REST API in Go', affectedFiles: ['main.go'], stackAdapter: 'go' }),
    changes: [{ path: 'helpers.ts', type: 'modify', diff: 'export const helper = 1', before: '// old' }],
    mustPass: false,
    expectedRules: ['stack_mismatch'],
  },
  {
    id: 'go-api-allows-go-files',
    description: 'Go API task — creating .go files is allowed.',
    category: 'stack',
    task: task({ objective: 'create a REST API in Go', affectedFiles: [], stackAdapter: 'go' }),
    changes: [
      { path: 'main.go', type: 'create', diff: 'package main' },
      { path: 'go.mod', type: 'create', diff: 'module myapi\n\ngo 1.21' },
    ],
    mustPass: true,
    expectedRules: [],
  },
  {
    id: 'typescript-project-no-python',
    description: 'TypeScript project — modifying a .py file is a violation.',
    category: 'stack',
    task: task({ objective: 'extend the existing project', affectedFiles: ['src/index.ts'], stackAdapter: 'typescript' }),
    changes: [{ path: 'scripts/migrate.py', type: 'modify', diff: 'print("hello")', before: '# old' }],
    mustPass: false,
    expectedRules: ['stack_mismatch'],
  },

  // SCOPE — agent must not touch files outside the contract scope.
  // Pure-create scaffolding bypasses allowed_paths (no existing scope to respect).
  {
    id: 'react-component-stays-in-frontend',
    description: 'Frontend task — modifying backend server files is a scope violation.',
    category: 'scope',
    task: task({ objective: 'change a login component', affectedFiles: ['src/components/Login.tsx'], stackAdapter: 'typescript' }),
    changes: [{ path: 'server/index.ts', type: 'modify', diff: 'export const api = 1', before: '// old' }],
    mustPass: false,
    expectedRules: ['allowed_paths'],
  },
  {
    id: 'api-task-stays-in-api-scope',
    description: 'API task — changing frontend files is out of scope.',
    category: 'scope',
    task: task({ objective: 'add endpoint to API', affectedFiles: ['src/api/handler.go'], stackAdapter: 'go' }),
    changes: [{ path: 'web/index.html', type: 'modify', diff: '<html>', before: '<html old>' }],
    mustPass: false,
    expectedRules: ['stack_mismatch', 'allowed_paths'],
  },

  // SAFE ZONE — existing sensitive files must not be silently modified
  {
    id: 'package-json-modify-needs-review',
    description: 'Modifying package.json requires review (dependency change).',
    category: 'safe-zone',
    task: task({ objective: 'add a button component', affectedFiles: [], stackAdapter: 'typescript' }),
    changes: [{ path: 'package.json', type: 'modify', diff: '{"name":"app","version":"2.0"}', before: '{"name":"app","version":"1.0"}' }],
    mustPass: false,
    expectedRules: ['safe_zone'],
  },
  {
    id: 'package-json-create-allowed',
    description: 'Creating package.json for a new project is allowed.',
    category: 'safe-zone',
    task: task({ objective: 'bootstrap a new Node project', affectedFiles: [], stackAdapter: 'typescript' }),
    changes: [{ path: 'package.json', type: 'create', diff: '{"name":"new-project"}' }],
    mustPass: true,
    expectedRules: [],
  },
  {
    id: 'env-file-modify-blocked',
    description: 'Modifying .env is a security-sensitive safe zone.',
    category: 'safe-zone',
    task: task({ objective: 'update config', affectedFiles: [], stackAdapter: 'generic' }),
    changes: [{ path: '.env', type: 'modify', diff: 'SECRET=bad', before: 'SECRET=ok' }],
    mustPass: false,
    expectedRules: ['safe_zone'],
  },

  // SECURITY — generated and dist files must not be edited
  {
    id: 'no-edit-dist-files',
    description: 'Editing dist/** files is forbidden — they are generated.',
    category: 'security',
    task: task({ objective: 'fix a bug', affectedFiles: [], stackAdapter: 'typescript' }),
    changes: [{ path: 'dist/index.js', type: 'modify', diff: 'const x=1', before: 'const x=0' }],
    mustPass: false,
    expectedRules: ['forbidden_path'],
  },
  {
    id: 'no-edit-node-modules',
    description: 'Editing node_modules is forbidden — always.',
    category: 'security',
    task: task({ objective: 'fix a bug', affectedFiles: [], stackAdapter: 'typescript' }),
    changes: [{ path: 'node_modules/lodash/index.js', type: 'modify', diff: 'evil', before: 'good' }],
    mustPass: false,
    expectedRules: ['forbidden_path'],
  },

  // SCORE — score adapts to what layers are present
  {
    id: 'score-redistributes-when-no-tests-layer',
    description: 'When tests layer is skipped, score still reaches 100% on passing build+rules.',
    category: 'score',
    task: task({ objective: 'add a util', affectedFiles: [], stackAdapter: 'generic' }),
    changes: [{ path: 'util.ts', type: 'create', diff: 'export const x = 1' }],
    mustPass: true,
    expectedRules: [],
  },

  // REVIEW GATE — diff reviewer catches issues harness misses
  {
    id: 'review-gate-catches-lockfile-change',
    description: 'Review gate blocks pnpm-lock.yaml modification.',
    category: 'review-gate',
    task: task({ objective: 'update packages', affectedFiles: [], stackAdapter: 'typescript' }),
    changes: [{ path: 'pnpm-lock.yaml', type: 'modify', diff: 'lockfileVersion: 9', before: 'lockfileVersion: 8' }],
    mustPass: false,
    expectedRules: ['dependency'],
  },
]

// ─── Live Eval ────────────────────────────────────────────────────────────────
// Runs the full ExecutionEngine loop with real dependencies injected externally.
// Use this for integration evals where you want to verify the whole pipeline.

export type LiveEvalDependencies = ExecutionDependencies

export interface LiveEvalCase {
  id: string
  description: string
  task: TaskDefinition
  projectRoot: string
  /** Maximum iterations allowed (default 3) */
  maxIterations?: number
  /** Expected terminal status */
  expectedStatus: ExecutionState['status']
  /** Expected decision at last iteration */
  expectedDecision?: 'auto_apply' | 'suggest' | 'reject' | 'human_required'
  /** If true, skip applying changes after decision */
  dryRun?: boolean
}

export interface LiveEvalResult {
  id: string
  passed: boolean
  actualStatus: ExecutionState['status']
  actualDecision?: string
  iterations: number
  totalTokens: number
  finalScore: number
  notes: string[]
}

export async function runLiveEval(
  testCase: LiveEvalCase,
  deps: LiveEvalDependencies,
  options?: Partial<Pick<ExecutionEngineOptions, 'onEvent' | 'onStateChange'>>,
): Promise<LiveEvalResult> {
  const engine = new ExecutionEngine(deps, {
    projectRoot: testCase.projectRoot,
    maxIterations: testCase.maxIterations ?? 3,
    autoApply: !testCase.dryRun,
    skipPlan: true,
    onStateChange: options?.onStateChange,
    onEvent: options?.onEvent,
  })

  const state = await engine.run(testCase.task)
  const last = state.iterationHistory.at(-1)
  const actualDecision = last?.decision.decision
  const finalScore = last?.decision.score ?? last?.harnessResult.score ?? 0

  const statusOk = state.status === testCase.expectedStatus
  const decisionOk = !testCase.expectedDecision || actualDecision === testCase.expectedDecision
  const passed = statusOk && decisionOk

  const notes: string[] = []
  if (!statusOk) notes.push(`Expected status '${testCase.expectedStatus}', got '${state.status}'`)
  if (!decisionOk) notes.push(`Expected decision '${testCase.expectedDecision}', got '${actualDecision}'`)
  if (last?.decision.reason) notes.push(`Decision reason: ${last.decision.reason}`)

  return {
    id: testCase.id,
    passed,
    actualStatus: state.status,
    actualDecision,
    iterations: state.iterationHistory.length,
    totalTokens: state.totalTokens,
    finalScore,
    notes,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function task(overrides: Partial<TaskDefinition>): TaskDefinition {
  return {
    id: 'eval-task',
    objective: 'eval task',
    constraints: [],
    nonGoals: [],
    validationCriteria: [],
    type: 'feature',
    impact: 'medium',
    affectedFiles: [],
    stackAdapter: 'generic',
    ...overrides,
  }
}

function harnessFromViolations(violations: Array<{ severity: 'low' | 'medium' | 'high' | 'critical'; message: string; file: string; rule: string }>): HarnessResult {
  return {
    passed: violations.length === 0,
    score: violations.length === 0 ? 100 : 0,
    duration: 0,
    iteration: 1,
    layers: [{
      name: 'rules',
      passed: violations.length === 0,
      warnings: [],
      duration: 0,
      skipped: false,
      errors: violations.map(v => ({
        layer: 'rules',
        type: 'architecture' as const,
        severity: v.severity,
        fixable: v.rule !== 'forbidden_path',
        message: v.message,
        humanMessage: v.message,
        file: v.file,
        rule: v.rule,
      })),
    }],
  }
}
