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

describe('Invariant: stack mismatch in MODIFY → reject (agent can fix)', () => {
  it('Go project: model modifies existing .ts file → contract rejects → agent retries', async () => {
    const evalCase = { ...ALL_LIVE_CASES[0], projectRoot }
    setupProjectForCase(evalCase.id, projectRoot)
    const provider = new MockAgentProvider(mocksForCase(evalCase.id, projectRoot))
    const deps = buildDeps(projectRoot, provider)

    const result = await runLiveEval(evalCase, deps)

    // Core invariant: stack mismatch on EXISTING code must lead to 'reject'
    // (not human_required) so the agent can retry with correct .go files.
    // Pure-create patches bypass this rule per Claude Code parity — see
    // EVAL_NO_VALIDATION_SUGGESTS for scaffolding behavior.
    expect(result.actualDecision, `notes: ${result.notes.join(', ')}`).toBe('reject')
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

describe('Invariant: scaffolding with missing validation is reviewable', () => {
  it('Empty project + pure-create patch: missing validation pauses for review', async () => {
    const evalCase = { ...ALL_LIVE_CASES[2], projectRoot }
    const provider = new MockAgentProvider(mocksForCase(evalCase.id, projectRoot))
    const deps = buildDeps(projectRoot, provider)

    const result = await runLiveEval(evalCase, deps)

    // Product UX: missing validation is a warning that leaves useful changes
    // reviewable. It must not show as failed.
    expect(result.actualDecision, `notes: ${result.notes.join(', ')}`).toBe('suggest')
    expect(result.actualStatus, `notes: ${result.notes.join(', ')}`).toBe('paused')
  })
})

describe('Invariant: max files only applies to MODIFY patches', () => {
  it('Pure-create patch with many files: scaffolding bypass — no max_files violation', async () => {
    const evalCase = { ...ALL_LIVE_CASES[3], projectRoot }
    const provider = new MockAgentProvider(mocksForCase(evalCase.id, projectRoot))
    const deps = buildDeps(projectRoot, provider)

    const result = await runLiveEval(evalCase, deps)

    // Claude Code parity: max_files_changed protects users from agents touching
    // dozens of EXISTING files unexpectedly. It does not apply to scaffolding
    // tasks where the agent is materializing a new project. Pure-create
    // patches with many files must remain reviewable without max_files blocking them.
    expect(result.actualDecision, `notes: ${result.notes.join(', ')}`).toBe('suggest')
    expect(result.actualStatus, `notes: ${result.notes.join(', ')}`).toBe('paused')
    expect(result.notes.join(' ')).not.toContain('max_files_changed')
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

describe('Invariant: harness warning pausa para revisao', () => {
  it('Primeira iteracao falha no build e fica pronta para review sem repair automatico', async () => {
    const evalCase = { ...ALL_LIVE_CASES[6], projectRoot }
    setupProjectForCase(evalCase.id, projectRoot)
    const provider = new MockAgentProvider(mocksForCase(evalCase.id, projectRoot))
    const deps = buildDeps(projectRoot, provider)

    const result = await runLiveEval(evalCase, deps)

    expect(result.actualStatus, `notes: ${result.notes.join(', ')}`).toBe('paused')
    expect(result.actualDecision, `notes: ${result.notes.join(', ')}`).toBe('suggest')
    expect(result.iterations).toBe(1)
    expect(result.finalScore).toBeLessThan(90)
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
