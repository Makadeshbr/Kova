import { describe, it, expect } from 'vitest'
import type { AgentMode } from '@kova/shared'
import { MODE_PROMPTS } from '../src/modes'

const ALL_MODES: AgentMode[] = ['plan', 'code', 'test', 'fix', 'review']

describe('MODE_PROMPTS', () => {
  it('deve ter um prompt para cada modo', () => {
    for (const mode of ALL_MODES) {
      expect(MODE_PROMPTS[mode]).toBeTruthy()
      expect(typeof MODE_PROMPTS[mode]).toBe('string')
    }
  })

  it('cada prompt deve ser distinto', () => {
    const prompts = ALL_MODES.map(m => MODE_PROMPTS[m])
    const unique = new Set(prompts)
    expect(unique.size).toBe(ALL_MODES.length)
  })

  it('plan não deve mencionar write_file', () => {
    expect(MODE_PROMPTS.plan).not.toContain('write_file')
  })

  it('review não deve mencionar write_file', () => {
    expect(MODE_PROMPTS.review).not.toContain('write_file')
  })

  it('code deve mencionar write_file', () => {
    expect(MODE_PROMPTS.code).toContain('write_file')
  })

  it('test deve mencionar write_file', () => {
    expect(MODE_PROMPTS.test).toContain('write_file')
  })

  it('fix deve mencionar write_file', () => {
    expect(MODE_PROMPTS.fix).toContain('write_file')
  })

  it('prompts devem ter tamanho mínimo razoável (>100 chars)', () => {
    for (const mode of ALL_MODES) {
      expect(MODE_PROMPTS[mode].length).toBeGreaterThan(100)
    }
  })
})
