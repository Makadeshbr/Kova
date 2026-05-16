/**
 * FIX-008: Returns the explanatory copy for the validation confidence banner
 * shown inside TaskResultCard. The harness scorer caps the score at 75 when
 * confidence is not 'full' — the user must understand WHY before deciding
 * whether to apply the change or fix project configuration first.
 *
 * Pure function. Easy to test, easy to extend (e.g. localisation, alt tones).
 */

export type ValidationConfidence = 'none' | 'partial' | 'full'

export interface ValidationConfidenceCopy {
  show: boolean
  tone: 'info' | 'warning'
  text: string
}

const HIDDEN: ValidationConfidenceCopy = { show: false, tone: 'info', text: '' }

export function getValidationConfidenceCopy(confidence: ValidationConfidence | undefined): ValidationConfidenceCopy {
  if (confidence === undefined || confidence === 'full') return HIDDEN

  if (confidence === 'none') {
    return {
      show: true,
      tone: 'warning',
      text: 'Score capped at 75 — no build/test commands detected for this project. Add them in your stack config to unlock full auto-apply.',
    }
  }

  // 'partial'
  return {
    show: true,
    tone: 'info',
    text: 'Score capped — only partial validation ran (some layers were skipped). Configure missing build/test/lint commands to unlock full auto-apply.',
  }
}
