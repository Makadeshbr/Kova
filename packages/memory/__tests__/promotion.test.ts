import { describe, it, expect } from 'vitest'
import type { Learning } from '@kova/shared'
import { promoteLearnings } from '../src/promotion'

function makeLearning(overrides: Partial<Learning> = {}): Learning {
  return {
    id: 'l1', type: 'pattern', scope: 'project',
    status: 'experimental', confidence: 1, contradictions: 0,
    description: 'test learning', evidence: [], tags: [],
    createdAt: '2025-01-01T00:00:00Z', lastSeen: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('promoteLearnings', () => {
  it('deve promover experimental → verified com confidence >= 3 e sem contradições', () => {
    const input = [makeLearning({ confidence: 3, contradictions: 0 })]
    const result = promoteLearnings(input)
    expect(result[0].status).toBe('verified')
  })

  it('não deve promover experimental com contradições', () => {
    const input = [makeLearning({ confidence: 3, contradictions: 1 })]
    const result = promoteLearnings(input)
    expect(result[0].status).toBe('experimental')
  })

  it('não deve promover experimental com confidence < 3', () => {
    const input = [makeLearning({ confidence: 2, contradictions: 0 })]
    const result = promoteLearnings(input)
    expect(result[0].status).toBe('experimental')
  })

  it('deve promover verified → canonical com confidence >= 10', () => {
    const input = [makeLearning({ status: 'verified', confidence: 10 })]
    const result = promoteLearnings(input)
    expect(result[0].status).toBe('canonical')
  })

  it('não deve promover verified → canonical com confidence < 10', () => {
    const input = [makeLearning({ status: 'verified', confidence: 9 })]
    const result = promoteLearnings(input)
    expect(result[0].status).toBe('verified')
  })

  it('não deve alterar canonical', () => {
    const input = [makeLearning({ status: 'canonical', confidence: 20 })]
    const result = promoteLearnings(input)
    expect(result[0].status).toBe('canonical')
  })

  it('deve processar lista com múltiplos learnings de status diferentes', () => {
    const input = [
      makeLearning({ id: 'a', status: 'experimental', confidence: 3 }),
      makeLearning({ id: 'b', status: 'verified', confidence: 10 }),
      makeLearning({ id: 'c', status: 'experimental', confidence: 1 }),
    ]
    const result = promoteLearnings(input)
    expect(result[0].status).toBe('verified')
    expect(result[1].status).toBe('canonical')
    expect(result[2].status).toBe('experimental')
  })
})
