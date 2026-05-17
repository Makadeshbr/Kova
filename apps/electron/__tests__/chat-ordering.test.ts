import { describe, expect, it } from 'vitest'
import { shouldRenderFloatingResultCard } from '../src/renderer/src/lib/chat-ordering'

describe('chat ordering', () => {
  it('does not render a stale floating result card after the user sends the next message', () => {
    expect(shouldRenderFloatingResultCard({
      hasResult: true,
      showLive: false,
      hasStructuredTaskResult: false,
      lastMessageRole: 'user',
    })).toBe(false)
  })

  it('allows fallback result card only while it still belongs to the latest assistant turn', () => {
    expect(shouldRenderFloatingResultCard({
      hasResult: true,
      showLive: false,
      hasStructuredTaskResult: false,
      lastMessageRole: 'assistant',
    })).toBe(true)
  })
})
