import { describe, expect, it } from 'vitest'
import { shouldRenderPlanResultCard } from '../src/renderer/src/lib/plan-card-visibility'

describe('shouldRenderPlanResultCard', () => {
  it('shows the large plan card only in explicit plan mode', () => {
    expect(shouldRenderPlanResultCard('plan', 'patch')).toBe(true)
    expect(shouldRenderPlanResultCard('patch', 'plan')).toBe(false)
    expect(shouldRenderPlanResultCard('chat', 'plan')).toBe(false)
    expect(shouldRenderPlanResultCard('review', 'plan')).toBe(false)
  })

  it('keeps legacy active-mode fallback when old messages have no mode metadata', () => {
    expect(shouldRenderPlanResultCard(undefined, 'plan')).toBe(true)
    expect(shouldRenderPlanResultCard(undefined, 'patch')).toBe(false)
  })
})
