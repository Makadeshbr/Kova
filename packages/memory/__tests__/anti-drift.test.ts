import { describe, it, expect } from 'vitest'
import type { Learning } from '@kova/shared'
import { pruneLearnings } from '../src/anti-drift'

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function makeLearning(overrides: Partial<Learning> = {}): Learning {
  return {
    id: Math.random().toString(36).slice(2), type: 'pattern', scope: 'project',
    status: 'experimental', confidence: 5, contradictions: 0,
    description: 'test', evidence: [], tags: [],
    createdAt: daysAgo(10), lastSeen: daysAgo(1),
    ...overrides,
  }
}

describe('pruneLearnings', () => {
  it('deve remover learning com 2+ contradições', () => {
    const input = [makeLearning({ contradictions: 2 })]
    expect(pruneLearnings(input)).toHaveLength(0)
  })

  it('deve remover learning com 3+ contradições', () => {
    const input = [makeLearning({ contradictions: 3 })]
    expect(pruneLearnings(input)).toHaveLength(0)
  })

  it('deve remover experimental com 1 contradição', () => {
    const input = [makeLearning({ status: 'experimental', contradictions: 1 })]
    expect(pruneLearnings(input)).toHaveLength(0)
  })

  it('deve remover experimental > 90 dias sem ver', () => {
    const input = [makeLearning({ status: 'experimental', lastSeen: daysAgo(91) })]
    expect(pruneLearnings(input)).toHaveLength(0)
  })

  it('não deve remover experimental com < 90 dias', () => {
    const input = [makeLearning({ status: 'experimental', lastSeen: daysAgo(89) })]
    expect(pruneLearnings(input)).toHaveLength(1)
  })

  it('deve demover verified com 1 contradição para experimental', () => {
    const input = [makeLearning({ status: 'verified', contradictions: 1 })]
    const result = pruneLearnings(input)
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('experimental')
  })

  it('deve demover verified > 180 dias para experimental', () => {
    const input = [makeLearning({ status: 'verified', lastSeen: daysAgo(181) })]
    const result = pruneLearnings(input)
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('experimental')
  })

  it('não deve remover canonical mesmo com 2 contradições', () => {
    const input = [makeLearning({ status: 'canonical', contradictions: 2 })]
    expect(pruneLearnings(input)).toHaveLength(0) // canonical ainda está sujeito à regra 2 contradições
  })

  it('deve respeitar o limite máximo e manter os mais confiantes', () => {
    const input = Array.from({ length: 5 }, (_, i) =>
      makeLearning({ id: `l${i}`, confidence: i + 1 }),
    )
    const result = pruneLearnings(input, 3)
    expect(result).toHaveLength(3)
    expect(result[0].confidence).toBe(5) // mais confiante primeiro
    expect(result[1].confidence).toBe(4)
    expect(result[2].confidence).toBe(3)
  })

  it('deve manter learnings saudáveis', () => {
    const input = [
      makeLearning({ id: 'a', status: 'experimental', contradictions: 0, lastSeen: daysAgo(1) }),
      makeLearning({ id: 'b', status: 'verified', contradictions: 0, lastSeen: daysAgo(10) }),
    ]
    expect(pruneLearnings(input)).toHaveLength(2)
  })
})
