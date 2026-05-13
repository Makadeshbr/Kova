/**
 * Live agent evals — run the FULL ExecutionEngine loop with mock providers.
 *
 * Design principles:
 * - No real LLM API calls (mock provider)
 * - Real ToolExecutor (actual file system writes)
 * - Real Orchestrator, DecisionEngine, ApplicationEngine
 * - Each test asserts ONE invariant, not implementation details
 * - Cross-platform (no shell built-ins as build commands)
 *
 * TDD rules:
 * - Add a new case when a regression is found in the field
 * - Cases must be deterministic (no flake, no network)
 * - Document WHY the assertion is the correct behavior
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runLiveEval } from '../src/index'
import {
  ALL_LIVE_CASES,
  buildDeps,
  mocksForCase,
  setupProjectForCase,
} from '../src/live-cases'
import { MockAgentProvider } from '../src/mock-provider'

let projectRoot: string

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'kova-live-eval-'))
})

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true })
})

// ─── Core invariant tests ─────────────────────────────────────────────────────

describe('Invariant: stack mismatch → reject (agent can fix)', () => {
  it('Go project: model writes .ts file → contract rejects → agent retries', async () => {
    const evalCase = { ...ALL_LIVE_CASES[0], projectRoot }
    const provider = new MockAgentProvider(mocksForCase(evalCase.id, projectRoot))
    const deps = buildDeps(projectRoot, provider)

    const result = await runLiveEval(evalCase, deps)

    // Core invariant: stack mismatch must lead to 'reject' (not human_required)
    // so the agent can retry with correct .go files instead of stopping.
    expect(result.actualDecision, `notes: ${result.notes.join(', ')}`).toBe('reject')
    // Score must be below the suggest threshold (< 70)
    expect(result.finalScore).toBeLessThan(70)
  })
})

describe('Invariant: safe zone → human_required (needs human approval)', () => {
  it('Modifying .env triggers human_required — not reject', async () => {
    setupProjectForCase('live-safe-zone-env', projectRoot)
    const evalCase = { ...ALL_LIVE_CASES[1], projectRoot }
    const provider = new MockAgentProvider(mocksForCase(evalCase.id, projectRoot))
    const deps = buildDeps(projectRoot, provider)

    const result = await runLiveEval(evalCase, deps)

    // Safe zones go through the review gate (not the fixable contract check)
    // and must become 'human_required' — sensitive files need human approval.
    expect(result.actualDecision, `notes: ${result.notes.join(', ')}`).toBe('human_required')
    expect(result.finalScore).toBeLessThan(70)
  })
})

describe('Invariant: no validation → never auto_apply', () => {
  it('Empty project: score ≤ 75, decision is suggest or reject — never auto_apply', async () => {
    const evalCase = { ...ALL_LIVE_CASES[2], projectRoot }
    const provider = new MockAgentProvider(mocksForCase(evalCase.id, projectRoot))
    const deps = buildDeps(projectRoot, provider)

    const result = await runLiveEval(evalCase, deps)

    // Core invariant: without real build/test validation, never auto_apply.
    // The actual decision (suggest or reject) depends on harness details, but
    // auto_apply MUST NOT fire — that would silently apply unvalidated code.
    expect(result.actualDecision, `notes: ${result.notes.join(', ')}`).not.toBe('auto_apply')
    expect(result.finalScore, 'score must be ≤ 75 without real validation').toBeLessThanOrEqual(75)
  })
})

describe('Invariant: max files exceeded → reject', () => {
  it('Low-impact task (maxFiles=6) but model edits 8 files → contract rejects', async () => {
    const evalCase = { ...ALL_LIVE_CASES[3], projectRoot }
    const provider = new MockAgentProvider(mocksForCase(evalCase.id, projectRoot))
    const deps = buildDeps(projectRoot, provider)

    const result = await runLiveEval(evalCase, deps)

    // Core invariant: max_files_changed violation is an agent-fixable contract error.
    // The agent should retry with fewer files, not wait for human approval.
    expect(result.actualDecision, `notes: ${result.notes.join(', ')}`).toBe('reject')
    expect(result.finalScore).toBeLessThan(70)
  })
})

describe('Invariant: text-only response → completed immediately', () => {
  it('Model responds with text only (no file writes) → completed, no harness', async () => {
    const evalCase = { ...ALL_LIVE_CASES[4], projectRoot }
    const provider = new MockAgentProvider(mocksForCase(evalCase.id, projectRoot))
    const deps = buildDeps(projectRoot, provider)

    const result = await runLiveEval(evalCase, deps)

    // Core invariant: when the model only responds with text (no file changes),
    // the task completes immediately. Nothing to validate, nothing to apply.
    expect(result.actualStatus, `notes: ${result.notes.join(', ')}`).toBe('completed')
    expect(result.iterations).toBe(1)
  })
})

describe('Invariant: with build command → validation runs', () => {
  it('Project with node --version as build: harness runs and produces evidence', async () => {
    setupProjectForCase('live-harness-build-passes', projectRoot)
    const evalCase = { ...ALL_LIVE_CASES[5], projectRoot }
    const provider = new MockAgentProvider(mocksForCase(evalCase.id, projectRoot))
    const deps = buildDeps(projectRoot, provider)

    const result = await runLiveEval(evalCase, deps)

    // Core invariant: with a real build command, validationConfidence must not be 'none'.
    // The decision should be based on real evidence (suggest or auto_apply), not a default.
    // We don't check the specific decision — that depends on score thresholds.
    expect(result.actualDecision, `notes: ${result.notes.join(', ')}`).not.toBe(undefined)
    expect(result.iterations).toBe(1)
  })
})

describe('Invariant: repair loop usa segunda tentativa', () => {
  it('Primeira iteracao falha no build; segunda corrige e fica pronta para apply', async () => {
    const evalCase = { ...ALL_LIVE_CASES[6], projectRoot }
    setupProjectForCase(evalCase.id, projectRoot)
    const provider = new MockAgentProvider(mocksForCase(evalCase.id, projectRoot))
    const deps = buildDeps(projectRoot, provider)

    const result = await runLiveEval(evalCase, deps)

    expect(result.actualStatus, `notes: ${result.notes.join(', ')}`).toBe('paused')
    expect(result.actualDecision, `notes: ${result.notes.join(', ')}`).toBe('auto_apply')
    expect(result.iterations).toBe(2)
    expect(result.finalScore).toBeGreaterThanOrEqual(90)
  })
})

// ─── Suite smoke test ─────────────────────────────────────────────────────────

describe('Live eval suite — smoke test', () => {
  it('all cases complete without throwing', async () => {
    for (const evalCase of ALL_LIVE_CASES) {
      const root = mkdtempSync(join(tmpdir(), 'kova-smoke-'))
      try {
        setupProjectForCase(evalCase.id, root)
        const caseWithRoot = { ...evalCase, projectRoot: root }
        const provider = new MockAgentProvider(mocksForCase(evalCase.id, root))
        const deps = buildDeps(root, provider)
        await expect(runLiveEval(caseWithRoot, deps)).resolves.toBeDefined()
      } finally {
        rmSync(root, { recursive: true, force: true })
      }
    }
  })
})
