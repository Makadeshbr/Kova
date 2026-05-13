import type { ExecutionContract, FileChange, HarnessResult, DecisionResult, IterationRecord } from '@kova/shared'
import { calculateScore, getHardFailReason } from './score'
import { buildFeedback } from './feedback'
import { runReviewGate } from './review-gate'

// Patterns that indicate the COMMAND itself is misconfigured, not the source code.
// When the harness keeps failing with these messages, rewriting code won't help —
// the build/test/lint command needs to change.
const CONFIG_ERROR_PATTERNS: RegExp[] = [
  /no inputs were found/i,
  /cannot find (?:a |the )?tsconfig/i,
  /tsconfig\.json (?:was )?not found/i,
  /enoent.*tsconfig/i,
  /command not found/i,
  /is not recognized as an internal or external command/i,
  /\/bin\/sh:.*not found/i,
  /\benoent\b.*spawn\b/i,
  /executable.*not found/i,
  /could not find a declaration file/i,
  /tsc.*--noemit.*tsconfig/i,
  /missing script:/i,
  /cannot find module '.*tsx?'/i,
]

type FailureClass = 'config_error' | 'code_error' | 'unknown'

function classifyLayerFailure(layer: HarnessResult['layers'][number]): FailureClass {
  if (layer.skipped || layer.passed) return 'unknown'
  const haystack = [
    layer.stderr ?? '',
    layer.stdout ?? '',
    ...layer.errors.map(e => `${e.message}\n${e.humanMessage}`),
  ].join('\n')
  if (CONFIG_ERROR_PATTERNS.some(rx => rx.test(haystack))) return 'config_error'
  if (layer.errors.length > 0 || layer.exitCode !== undefined) return 'code_error'
  return 'unknown'
}

export interface DecisionContext {
  changes?: FileChange[]
  contract?: ExecutionContract
}

export function decide(
  result: HarnessResult,
  history: IterationRecord[],
  context: DecisionContext = {},
): DecisionResult {
  // When the harness explicitly flags no validation ran, cap score to the 'suggest' zone (70-89).
  // This prevents auto_apply from firing when there are no build/test commands to validate with.
  // Note: validationConfidence is set by the harness pipeline — not present for the no-changes
  // case from ExecutionEngine (which intentionally uses score:100 to signal "nothing to review").
  const rawScore = result.validationConfidence === 'none' || hasNoRealValidation(result)
    ? 75
    : calculateScore(result)
  const score = result.validationConfidence === 'partial' && rawScore > 0
    ? Math.min(rawScore, 85)
    : rawScore
  const feedback = buildFeedback(result)

  // Contract violations for agent-fixable issues (stack mismatch, scope, max files)
  // must be checked BEFORE the review gate so they become 'reject' (agent retries)
  // rather than 'human_required' (agent stops). Safe zones and forbidden paths are
  // NOT in this set — those remain 'human_required' via the review gate below.
  const contractViolation = firstContractViolationLayer(result)
  if (contractViolation) {
    return {
      decision: 'reject',
      score: Math.min(score, 55),
      reason: `Contract violation: ${contractViolation.errors[0]?.humanMessage ?? contractViolation.name}; agent must retry with correct files`,
      feedback,
    }
  }

  const reviewGate = context.changes
    ? runReviewGate({ changes: context.changes, contract: context.contract, harnessResult: result })
    : undefined

  if (reviewGate && !reviewGate.passed) {
    const top = reviewGate.findings.find(f => f.blocking && f.severity === 'critical')
      ?? reviewGate.findings.find(f => f.blocking)
    return {
      decision: top?.severity === 'critical' ? 'reject' : 'human_required',
      score: Math.min(score, top?.severity === 'critical' ? 0 : 69),
      reason: `Review Gate blocked: ${top?.message ?? 'diff requires review'}`,
      feedback,
      reviewGate,
    }
  }

  if (hasRepeatedError(result, history)) {
    return {
      decision: 'human_required',
      score,
      reason: 'Same error repeated for 4 iterations; human intervention required',
      feedback,
      reviewGate,
    }
  }

  if (isScoreRegressing(result, history)) {
    return {
      decision: 'human_required',
      score,
      reason: 'Score regressed for 3 iterations without progress',
      feedback,
      reviewGate,
    }
  }

  const failedValidation = firstFailedValidationLayer(result)
  if (failedValidation) {
    const failureClass = classifyLayerFailure(failedValidation)
    // Config errors are NOT fixable by rewriting code — the harness command itself is broken.
    // After one repeat, escalate to human instead of feeding misleading errors to the agent.
    if (failureClass === 'config_error' && hasRepeatedConfigError(failedValidation, history)) {
      return {
        decision: 'human_required',
        score: Math.min(score, 40),
        reason: `${formatLayerName(failedValidation.name)} command "${failedValidation.command ?? '?'}" is misconfigured (not a code bug); update .kova/harness.json or remove the layer`,
        feedback,
        reviewGate,
      }
    }
    return {
      decision: 'reject',
      score: Math.min(score, 55),
      reason: `${formatLayerName(failedValidation.name)} failed; repair loop required`,
      feedback,
      reviewGate,
    }
  }

  if (score === 0) {
    return { decision: 'reject', score, reason: getHardFailReason(result), feedback, reviewGate }
  }

  if (score >= 90) {
    return { decision: 'auto_apply', score, reason: 'Senior-quality patch confirmed', feedback, reviewGate }
  }

  if (score >= 70) {
    return { decision: 'suggest', score, reason: 'Acceptable quality; review recommended', feedback, reviewGate }
  }

  return { decision: 'reject', score, reason: `Score ${score} below threshold 70`, feedback, reviewGate }
}

function hasNoRealValidation(result: HarnessResult): boolean {
  const evidenceLayers = result.layers.filter(layer => ['build', 'typecheck', 'tests', 'lint'].includes(layer.name))
  if (evidenceLayers.length === 0) return true
  return evidenceLayers.every(layer => layer.skipped)
}

// Agent-fixable contract violations → 'reject' so agent retries with correct files.
// safe_zone and forbidden_path are intentionally excluded: they need human review.
const FIXABLE_CONTRACT_RULES = new Set(['stack_mismatch', 'allowed_paths', 'max_files_changed'])

function firstContractViolationLayer(result: HarnessResult): HarnessResult['layers'][number] | null {
  return result.layers.find(layer =>
    layer.name === 'rules'
    && !layer.skipped
    && !layer.passed
    && layer.errors.some(e => FIXABLE_CONTRACT_RULES.has(e.rule ?? ''))
  ) ?? null
}

function firstFailedValidationLayer(result: HarnessResult): HarnessResult['layers'][number] | null {
  return result.layers.find(layer =>
    ['build', 'typecheck', 'tests', 'lint'].includes(layer.name)
    && !layer.skipped
    && !layer.passed
  ) ?? null
}

// Config errors should never enter a long repair loop — once they show up twice in a row
// on the same layer with the same command, the agent is clearly stuck.
function hasRepeatedConfigError(
  currentLayer: HarnessResult['layers'][number],
  history: IterationRecord[],
): boolean {
  for (let i = history.length - 1; i >= 0; i--) {
    const prev = history[i].harnessResult.layers.find(l => l.name === currentLayer.name)
    if (!prev) return false
    if (prev.passed || prev.skipped) return false
    if (classifyLayerFailure(prev) !== 'config_error') return false
    if ((prev.command ?? '') === (currentLayer.command ?? '')) return true
    return false
  }
  return false
}

function formatLayerName(name: string): string {
  if (name === 'typecheck') return 'Typecheck'
  if (name === 'tests') return 'Tests'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function hasRepeatedError(result: HarnessResult, history: IterationRecord[]): boolean {
  const current = buildFingerprints(result)
  if (current.size === 0) return false

  let consecutive = 0
  for (let i = history.length - 1; i >= 0; i--) {
    const prev = buildFingerprints(history[i].harnessResult)
    const overlap = [...current].some(fp => prev.has(fp))
    if (overlap) consecutive++
    else break
  }

  return consecutive >= 4
}

function buildFingerprints(result: HarnessResult): Set<string> {
  const fps = new Set<string>()
  for (const layer of result.layers) {
    for (const error of layer.errors) {
      fps.add(`${error.layer}:${error.file}:${error.rule ?? error.type}:${error.line ?? 0}`)
    }
  }
  return fps
}

function isScoreRegressing(result: HarnessResult, history: IterationRecord[]): boolean {
  if (history.length < 3) return false
  const current = calculateScore(result)
  if (current === 0) return false
  const prev1 = calculateScore(history[history.length - 1].harnessResult)
  const prev2 = calculateScore(history[history.length - 2].harnessResult)
  return current < prev1 && prev1 < prev2
}
