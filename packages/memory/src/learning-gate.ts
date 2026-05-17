import type { LearningCandidate, LearningGateResult, HarnessResult } from '@kova/shared'

const TEMPORARY_KEYWORDS = ['hack', 'fixme', 'todo', 'temporary', 'workaround', 'provisorio', 'gambiarra']
const INVALIDATION_TRIGGERS = ['until', 'when', 'as long as', 'enquanto', 'ate que', 'quando mudar', 'if version']

export function classifyLearning(
  candidate: LearningCandidate,
  harnessResult: HarnessResult,
): LearningGateResult {
  // Rule 1: reject if there is no evidence or if the harness failed.
  if (!harnessResult.passed) {
    return {
      classification: 'rejected_learning',
      reason: 'Harness validation failed. Cannot record unvalidated learnings.',
      approved: false,
    }
  }

  if (candidate.evidence.length === 0) {
    return {
      classification: 'rejected_learning',
      reason: 'Candidate has no linked evidence from the current execution.',
      approved: false,
    }
  }

  const descLower = candidate.description.toLowerCase()

  // Rule 2: temporary workarounds should not become automatic learnings.
  if (TEMPORARY_KEYWORDS.some(kw => descLower.includes(kw))) {
    return {
      classification: 'temporary_workaround',
      reason: 'Description indicates a temporary workaround or hack. Do not record it as automatic learning.',
      approved: false,
    }
  }

  // Rule 3: temporal conditions are allowed, but they need an invalidation rule.
  const hasInvalidationTrigger = INVALIDATION_TRIGGERS.some(kw => descLower.includes(kw))

  const activeLayers = harnessResult.layers.filter(l => !l.skipped)
  const ranTests = activeLayers.some(l => l.name === 'tests')

  // Rule 4: learnings without test coverage require human review.
  if (!ranTests) {
    return {
      classification: 'needs_review',
      reason: 'Learning generated without test coverage. Human approval is required before recording it.',
      approved: false,
    }
  }

  // Rule 5: global scope requires evidence across multiple projects.
  if (candidate.scope === 'global') {
    return {
      classification: 'local_exception',
      reason: 'Downgraded to project scope. Global scope requires evidence across multiple projects.',
      approved: true,
      adjustedCandidate: { ...candidate, scope: 'project' },
    }
  }

  // Rule 6: approved, with invalidation when temporal triggers are present.
  return {
    classification: 'safe_lesson',
    reason: 'Learning validated with harness and real tests.',
    approved: true,
    invalidationRule: hasInvalidationTrigger
      ? 'Revalidate when the context described in the condition changes.'
      : undefined,
  }
}

/** Derives a short, normalized description key for deduplication. */
export function descriptionKey(description: string): string {
  return description.toLowerCase().replace(/\W+/g, ' ').trim().slice(0, 200)
}
