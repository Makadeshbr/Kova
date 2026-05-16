/**
 * FIX-005: `/plan` should always produce a structured card.
 *
 * 3-tier parser:
 *   1. Strict XML (existing parsePlanResult)
 *   2. Markdown heuristic (headers: Objective, Files, Approach, Validations, Risk)
 *   3. Minimal fallback (full thought as approach, never returns null)
 *
 * Token streaming during plan mode is suppressed so raw XML never reaches the chat.
 */
import { describe, it, expect } from 'vitest'
import { parsePlanResultRobust, stripPlanXml } from '../src/main/session-prompts'

describe('parsePlanResultRobust — tier 1: strict XML', () => {
  it('parses well-formed XML the same as the strict parser', () => {
    const xml = `
<plan_result>
  <objective>Add login flow</objective>
  <files>
    <file path="src/auth.ts" reason="New module" />
  </files>
  <approach>Step 1. Step 2.</approach>
  <validations>
    <command>npm test</command>
  </validations>
  <risk>low</risk>
</plan_result>`
    const result = parsePlanResultRobust(xml, 'fallback objective')
    expect(result.kind).toBe('plan_result')
    expect(result.objective).toBe('Add login flow')
    expect(result.files).toHaveLength(1)
    expect(result.files[0].path).toBe('src/auth.ts')
    expect(result.approach).toBe('Step 1. Step 2.')
    expect(result.validations).toContain('npm test')
    expect(result.risk).toBe('low')
  })
})

describe('parsePlanResultRobust — tier 2: markdown headers', () => {
  it('extracts plan from markdown headers when XML is absent', () => {
    const md = `
**Objective:** Refactor user service

**Files:**
- src/user.ts — split into module
- src/index.ts — update imports

**Approach:**
First isolate the model layer, then move pure logic to a separate file.

**Validations:**
- pnpm test
- pnpm typecheck

**Risk:** medium
`
    const result = parsePlanResultRobust(md, 'fallback')
    expect(result.kind).toBe('plan_result')
    expect(result.objective).toContain('Refactor user service')
    expect(result.files.length).toBeGreaterThanOrEqual(2)
    expect(result.files.some(f => f.path === 'src/user.ts')).toBe(true)
    expect(result.approach).toContain('isolate the model layer')
    expect(result.validations).toContain('pnpm test')
    expect(result.risk).toBe('medium')
  })

  it('handles markdown with ### headers (alternative style)', () => {
    const md = `
### Objective
Add caching layer

### Files
- src/cache.ts: new module

### Approach
Use LRU pattern with TTL.

### Risk
high
`
    const result = parsePlanResultRobust(md, 'fallback')
    expect(result.objective).toContain('Add caching layer')
    expect(result.files[0].path).toBe('src/cache.ts')
    expect(result.risk).toBe('high')
  })

  it('defaults risk to medium when not specified', () => {
    const md = `**Objective:** Simple change
**Approach:** Do the thing.`
    const result = parsePlanResultRobust(md, 'fallback')
    expect(result.risk).toBe('medium')
  })
})

describe('parsePlanResultRobust — tier 3: minimal fallback', () => {
  it('builds a concrete static landing-page fallback instead of showing exploration notes', () => {
    const text = [
      'Let me explore the project structure first.',
      'The project directory is empty.',
      'The project is a blank slate.',
    ].join('\n')
    const result = parsePlanResultRobust(text, 'landing page para barbearia com hero, servicos e contato')

    expect(result.kind).toBe('plan_result')
    expect(result.files.map(f => f.path)).toEqual(['index.html', 'styles.css', 'script.js'])
    expect(result.approach).not.toContain('Let me explore')
    expect(result.approach).not.toContain('project directory is empty')
    expect(result.validations).toContain('python -m http.server 8080')
    expect(result.risk).toBe('low')
  })

  it('produces a card from free-form text when no structure exists', () => {
    const text = 'I would create a new module and wire it up.'
    const result = parsePlanResultRobust(text, 'create login')
    expect(result.kind).toBe('plan_result')
    expect(result.objective).toBe('create login')
    expect(result.approach).toContain('create a new module')
    expect(result.files).toEqual([])
    expect(result.validations).toEqual([])
    expect(result.risk).toBe('medium')
  })

  it('never returns null even with empty input', () => {
    const result = parsePlanResultRobust('', 'do something')
    expect(result.kind).toBe('plan_result')
    expect(result.objective).toBe('do something')
  })

  it('strips lingering XML fragments from approach in the minimal fallback', () => {
    const text = 'Some text <plan_result> <objective>partial</objective> with no close tag'
    const result = parsePlanResultRobust(text, 'fallback')
    expect(result.approach).not.toContain('<plan_result>')
    expect(result.approach).not.toContain('<objective>')
  })
})

describe('stripPlanXml — token suppression helper', () => {
  it('returns empty when input is fully inside <plan_result>', () => {
    expect(stripPlanXml('<plan_result><objective>x</objective></plan_result>')).toBe('')
  })

  it('preserves text BEFORE <plan_result>', () => {
    expect(stripPlanXml('Analyzing... <plan_result>internal</plan_result>')).toBe('Analyzing... ')
  })

  it('preserves text AFTER </plan_result>', () => {
    expect(stripPlanXml('<plan_result>internal</plan_result> done')).toBe(' done')
  })

  it('returns input unchanged when no XML present', () => {
    expect(stripPlanXml('plain markdown text')).toBe('plain markdown text')
  })

  it('handles partial open tag mid-stream (no close yet) by stripping from < onwards', () => {
    // During streaming we might see the opening tag but not the close yet.
    // We err on the side of suppressing the partial XML to avoid raw chunks in the UI.
    expect(stripPlanXml('preamble <plan_resu')).toBe('preamble ')
  })
})
