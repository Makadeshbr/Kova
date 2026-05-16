/**
 * FIX-008: TaskResultCard must explain WHY a score is low/capped.
 *
 * When validationConfidence is 'none' or 'partial', the harness scorer caps the
 * score at 75 (no full auto-apply) — but the user has no idea why. The pure
 * helper `getValidationConfidenceCopy` returns the explanatory text and tone
 * the card should render.
 */
import { describe, it, expect } from 'vitest'
import { getValidationConfidenceCopy } from '../src/renderer/src/lib/validation-confidence-copy'

describe('getValidationConfidenceCopy', () => {
  it('hides the banner when confidence is full', () => {
    const copy = getValidationConfidenceCopy('full')
    expect(copy.show).toBe(false)
  })

  it('shows a clear message when confidence is none (no validations configured)', () => {
    const copy = getValidationConfidenceCopy('none')
    expect(copy.show).toBe(true)
    expect(copy.tone).toBe('warning')
    expect(copy.text.toLowerCase()).toContain('no build')
    expect(copy.text.toLowerCase()).toMatch(/score.*cap|cap.*score|cap.*75/i)
  })

  it('shows a different message when only partial validations ran', () => {
    const copy = getValidationConfidenceCopy('partial')
    expect(copy.show).toBe(true)
    expect(copy.tone).toBe('info')
    expect(copy.text.toLowerCase()).toContain('partial')
  })

  it('defaults to hiding when confidence is undefined', () => {
    const copy = getValidationConfidenceCopy(undefined)
    expect(copy.show).toBe(false)
  })

  it('returns a stable shape (show, tone, text)', () => {
    const copy = getValidationConfidenceCopy('none')
    expect(Object.keys(copy).sort()).toEqual(['show', 'text', 'tone'])
  })
})
