import { describe, expect, it } from 'vitest'
import type { PlanResultMessage } from '@kova/shared'
import { detectPlanLocale, normalizePlanResult } from '../src/main/plan-normalizer'

function placeholderPlan(): PlanResultMessage {
  return {
    kind: 'plan_result',
    objective: 'Prepare a concrete implementation plan from the request',
    files: [{ path: 'No specific files identified', reason: 'unknown' }],
    approach: 'Prepare a concrete implementation plan from the request, then validate the affected behavior.',
    validations: ['validate the affected behavior'],
    risk: 'medium',
  }
}

describe('normalizePlanResult', () => {
  it('removes generic placeholders from parsed plan', () => {
    const objective = 'Crie uma landing page para barbearia'
    const normalized = normalizePlanResult(placeholderPlan(), {
      objective,
      locale: 'pt-BR',
    })

    expect(normalized.objective).toBe(objective)
    expect(normalized.approach.toLowerCase()).not.toContain('prepare a concrete implementation plan')
    expect(normalized.approach.toLowerCase()).not.toContain('validate the affected behavior')
    expect(normalized.files.some(f => f.path.toLowerCase().includes('no specific files'))).toBe(false)
    expect(normalized.validations.some(v => v.toLowerCase().includes('validate the affected behavior'))).toBe(false)
  })

  it('uses PT-BR fallback files for static landing objective', () => {
    const normalized = normalizePlanResult(placeholderPlan(), {
      objective: 'Crie uma landing page para barbearia com hero e FAQ',
      locale: 'pt-BR',
    })

    expect(normalized.files.map(f => f.path)).toEqual(['index.html', 'styles.css', 'script.js'])
    expect(normalized.validations[0]).toMatch(/index\.html/i)
    expect(normalized.approach).toMatch(/HTML semântica/i)
  })

  it('uses real context files when model omits file list', () => {
    const normalized = normalizePlanResult(placeholderPlan(), {
      objective: 'Adicionar endpoint de health check',
      contextFilePaths: ['src/server.ts', 'src/routes/health.ts'],
      locale: 'en',
    })

    expect(normalized.files.map(f => f.path)).toEqual(['src/server.ts', 'src/routes/health.ts'])
  })
})

describe('detectPlanLocale', () => {
  it('detects PT-BR from accented text', () => {
    expect(detectPlanLocale('Implemente a seção de contato')).toBe('pt-BR')
  })

  it('defaults to en for english prompts', () => {
    expect(detectPlanLocale('Add a health check endpoint')).toBe('en')
  })
})
