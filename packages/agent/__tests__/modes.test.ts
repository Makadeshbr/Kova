import { describe, it, expect } from 'vitest'
import type { AgentMode } from '@kova/shared'
import { MODE_PROMPTS } from '../src/modes'

const ALL_MODES: AgentMode[] = ['plan', 'code', 'test', 'fix', 'review']
const WRITE_MODES: AgentMode[] = ['code', 'test', 'fix', 'unified']
const ALL_INCLUDING_UNIFIED: AgentMode[] = [...ALL_MODES, 'unified']

const lineCount = (s: string): number => s.split('\n').length

describe('MODE_PROMPTS', () => {
  it('has a prompt for each mode', () => {
    for (const mode of ALL_MODES) {
      expect(MODE_PROMPTS[mode]).toBeTruthy()
      expect(typeof MODE_PROMPTS[mode]).toBe('string')
    }
  })

  it('every prompt is distinct', () => {
    const prompts = ALL_MODES.map(m => MODE_PROMPTS[m])
    const unique = new Set(prompts)
    expect(unique.size).toBe(ALL_MODES.length)
  })

  it('plan does not mention write_file', () => {
    expect(MODE_PROMPTS.plan).not.toContain('write_file')
  })

  it('review does not mention write_file', () => {
    expect(MODE_PROMPTS.review).not.toContain('write_file')
  })

  it('code mentions write_file', () => {
    expect(MODE_PROMPTS.code).toContain('write_file')
  })

  it('test mentions write_file', () => {
    expect(MODE_PROMPTS.test).toContain('write_file')
  })

  it('fix mentions write_file', () => {
    expect(MODE_PROMPTS.fix).toContain('write_file')
  })

  it('prompts have reasonable minimum size (>100 chars)', () => {
    for (const mode of ALL_MODES) {
      expect(MODE_PROMPTS[mode].length).toBeGreaterThan(100)
    }
  })
})

// FIX-017 — Prompt rewrite invariants. The old prompts were adversarial
// ("DO NOT narrate", "EXACTLY ONE SHORT SENTENCE", "Never switch languages")
// and Anthropic research shows affirmative prompts outperform prohibitions.
// These tests lock the new contract so a regression to the old style fails CI.
describe('MODE_PROMPTS — FIX-017 invariants', () => {
  describe('no adversarial narration ban', () => {
    for (const mode of ALL_INCLUDING_UNIFIED) {
      it(`${mode}: does not contain "DO NOT narrate"`, () => {
        expect(MODE_PROMPTS[mode]).not.toMatch(/DO NOT narrate/i)
      })

      it(`${mode}: does not forbid "Let me check" / "I'll now"`, () => {
        expect(MODE_PROMPTS[mode]).not.toMatch(/Never output ["']Let me check/i)
        expect(MODE_PROMPTS[mode]).not.toMatch(/Never output ["']I['']ll now/i)
      })
    }
  })

  describe('no forced one-sentence summary', () => {
    for (const mode of WRITE_MODES) {
      it(`${mode}: does not require "EXACTLY ONE SHORT SENTENCE"`, () => {
        expect(MODE_PROMPTS[mode]).not.toMatch(/EXACTLY ONE SHORT SENTENCE/i)
        expect(MODE_PROMPTS[mode]).not.toMatch(/EXACTLY ONE SENTENCE/i)
      })
    }
  })

  describe('preserves no-self-introduction rule (product preference)', () => {
    it('unified: forbids self-introduction', () => {
      expect(MODE_PROMPTS.unified).toMatch(/never introduce yourself/i)
    })

    it('unified: forbids emoji', () => {
      expect(MODE_PROMPTS.unified.toLowerCase()).toContain('no emoji')
    })
  })

  describe('tool guidance is present (TOOL CHOICE)', () => {
    for (const mode of ['code', 'fix', 'unified'] as AgentMode[]) {
      it(`${mode}: teaches grep_codebase over run_command grep/rg`, () => {
        const text = MODE_PROMPTS[mode]
        expect(text).toMatch(/grep_codebase/i)
        expect(text).toMatch(/prefer.*grep_codebase|grep_codebase.*prefer|grep_codebase.*ALWAYS|ALWAYS.*grep_codebase/i)
      })

      it(`${mode}: teaches edit_file for surgical changes`, () => {
        expect(MODE_PROMPTS[mode]).toMatch(/edit_file/)
      })
    }
  })

  describe('prompts are concise (cache-friendly, more likely to be read)', () => {
    // Plan keeps an XML output contract that legitimately needs ~10 lines,
    // so we allow it a bit more headroom. All other modes must be <= 25 lines.
    const limits: Record<AgentMode, number> = {
      plan: 30,
      code: 25,
      test: 22,
      fix: 22,
      review: 22,
      unified: 25,
    }

    for (const mode of ALL_INCLUDING_UNIFIED) {
      it(`${mode}: line count is within budget`, () => {
        expect(lineCount(MODE_PROMPTS[mode])).toBeLessThanOrEqual(limits[mode])
      })
    }
  })

  describe('language directive is affirmative (not adversarial)', () => {
    for (const mode of ALL_INCLUDING_UNIFIED) {
      it(`${mode}: instructs to follow the user's language without prohibition`, () => {
        // Spirit: "Respond in the user's language" is fine.
        // What we forbid is "Never switch", "must use ${X}", "Always ${X}" applied to language.
        expect(MODE_PROMPTS[mode]).not.toMatch(/never switch (languages|to another language)/i)
      })
    }
  })

  describe('plan mode still produces an XML <plan_result> contract', () => {
    it('plan: mentions <plan_result> output structure', () => {
      expect(MODE_PROMPTS.plan).toContain('<plan_result>')
      expect(MODE_PROMPTS.plan).toContain('</plan_result>')
      expect(MODE_PROMPTS.plan).toContain('<objective>')
      expect(MODE_PROMPTS.plan).toContain('<files>')
      expect(MODE_PROMPTS.plan).toContain('<approach>')
      expect(MODE_PROMPTS.plan).toContain('<validations>')
      expect(MODE_PROMPTS.plan).toContain('<risk>')
    })
  })

  describe('review mode still produces a verdict', () => {
    it('review: mentions APPROVED / SUGGEST_CHANGES / REJECT', () => {
      expect(MODE_PROMPTS.review).toContain('APPROVED')
      expect(MODE_PROMPTS.review).toContain('SUGGEST_CHANGES')
      expect(MODE_PROMPTS.review).toContain('REJECT')
    })
  })
})
