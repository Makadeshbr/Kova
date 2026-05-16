/**
 * FIX-017 — buildSystemPrompt contract.
 *
 * The old contract was "LANGUAGE: ${X}. Every file you create must use ${X}.
 * Never switch to another language." which **traps** the agent if `structureTask`
 * mis-detects the stack (e.g. labels a Python project as TypeScript).
 *
 * The new contract is affirmative: "Detected stack: ${X}. Prefer this language
 * unless the task explicitly requires another." — guidance, not a cage.
 *
 * These tests lock the new contract so a regression fails CI.
 */
import { describe, it, expect } from 'vitest'
import type { TaskDefinition } from '@kova/shared'
import { buildSystemPrompt, STACK_LANGUAGE } from '../src/agent'

const taskFor = (stack: string): TaskDefinition => ({
  objective: 'do something',
  type: 'feature',
  stackAdapter: stack,
  filesScope: [],
  constraints: [],
  validationCriteria: [],
  impact: 'low',
})

describe('buildSystemPrompt — FIX-017 langHint contract', () => {
  describe('write modes get a stack hint', () => {
    for (const mode of ['code', 'test', 'fix', 'unified'] as const) {
      it(`${mode}: includes the detected stack`, () => {
        const prompt = buildSystemPrompt(mode, taskFor('go'), true)
        expect(prompt).toMatch(/go/i)
      })

      it(`${mode}: phrases the stack as a preference (affirmative)`, () => {
        const prompt = buildSystemPrompt(mode, taskFor('python'), true)
        // affirmative: "Detected stack: …" or "Prefer …"
        expect(prompt).toMatch(/Detected stack:|Prefer\b/)
      })

      it(`${mode}: does NOT forbid switching languages`, () => {
        const prompt = buildSystemPrompt(mode, taskFor('typescript'), true)
        expect(prompt).not.toMatch(/Never switch (to another language|languages)/i)
        expect(prompt).not.toMatch(/Every file you create must use/i)
        expect(prompt).not.toMatch(/^LANGUAGE: /m)
      })

      it(`${mode}: leaves room for the task to override the stack`, () => {
        // "unless the task explicitly requires another" is the escape hatch.
        const prompt = buildSystemPrompt(mode, taskFor('go'), true)
        expect(prompt).toMatch(/unless|explicitly requires/i)
      })
    }
  })

  describe('read-only modes do NOT receive a stack hint', () => {
    for (const mode of ['plan', 'review'] as const) {
      it(`${mode}: no Detected stack / Prefer line`, () => {
        const prompt = buildSystemPrompt(mode, taskFor('typescript'), true)
        expect(prompt).not.toMatch(/Detected stack:/)
        // "Prefer the project's existing stack" inside MODE_PROMPTS.plan is OK,
        // because it's part of the mode template — not the langHint append.
        // What we check here is that the per-task ${lang} interpolation isn't appended.
        expect(prompt).not.toMatch(/Prefer TypeScript/)
      })
    }
  })

  describe('stack-to-language mapping is preserved', () => {
    it('maps known stacks to readable names', () => {
      expect(STACK_LANGUAGE.go).toBe('Go')
      expect(STACK_LANGUAGE.python).toBe('Python')
      expect(STACK_LANGUAGE.typescript).toBe('TypeScript')
      expect(STACK_LANGUAGE.csharp).toBe('C#')
      expect(STACK_LANGUAGE.generic).toMatch(/language/i)
    })

    it('unknown stack falls back to raw stackAdapter value', () => {
      const prompt = buildSystemPrompt('code', taskFor('exotic-lang'), true)
      // The raw value flows through when the map has no entry.
      expect(prompt).toContain('exotic-lang')
    })
  })

  describe('XML reminder is appended when the provider lacks tool calls (write modes)', () => {
    it('write mode + no tool calls: includes <kova_file> reminder', () => {
      const prompt = buildSystemPrompt('code', taskFor('go'), false)
      expect(prompt).toContain('<kova_file')
      expect(prompt).toMatch(/OUTPUT FORMAT/i)
    })

    it('write mode + supports tool calls: no XML reminder', () => {
      const prompt = buildSystemPrompt('code', taskFor('go'), true)
      expect(prompt).not.toContain('<kova_file')
    })

    it('plan mode + no tool calls: no XML reminder (plan is read-only)', () => {
      const prompt = buildSystemPrompt('plan', taskFor('go'), false)
      expect(prompt).not.toContain('<kova_file')
    })
  })

  describe('prompt composition is clean', () => {
    it('does not produce blank double newlines from empty fragments', () => {
      const prompt = buildSystemPrompt('plan', taskFor('go'), true)
      // Plan has no langHint AND no XML reminder → only MODE_PROMPTS.plan.
      // Should not start or end with whitespace.
      expect(prompt).toBe(prompt.trim())
    })

    it('separates fragments with a blank line (canonical Anthropic style)', () => {
      const prompt = buildSystemPrompt('code', taskFor('go'), false)
      // 3 fragments → 2 blank-line separators.
      expect(prompt.split('\n\n').length).toBeGreaterThanOrEqual(3)
    })
  })
})
