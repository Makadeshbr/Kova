import type { ExecutionContract, FileChange, HarnessResult, DecisionResult, IterationRecord } from '@kova/shared'
import { calculateScore, getHardFailReason } from './score'
import { buildFeedback } from './feedback'
import { runReviewGate } from './review-gate'

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
  const evidenceLayers = result.layers.filter(layer => ['build', 'tests', 'lint'].includes(layer.name))
  if (evidenceLayers.length === 0) return true
  return evidenceLayers.every(layer => layer.skipped)
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
