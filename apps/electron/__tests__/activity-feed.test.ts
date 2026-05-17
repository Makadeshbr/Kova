import { describe, expect, it } from 'vitest'
import type { ExecutionEvent } from '../src/renderer/src/types'
import { eventIsBlocking, serverActivityLabel } from '../src/renderer/src/lib/task-activity'

describe('activity feed helpers', () => {
  it('labels persistent server lifecycle events with concrete URL when available', () => {
    const event = {
      type: 'server_ready',
      toolInput: { command: 'npm run dev' },
      serverSession: {
        sessionId: 'term-1',
        command: 'npm run dev',
        cwd: '/project',
        persistent: true,
        ready: true,
        url: 'http://localhost:5173',
        port: 5173,
      },
    } as ExecutionEvent

    expect(serverActivityLabel(event)).toBe('Server ready at http://localhost:5173')
  })

  it('marks blocked and failed server events as blocking activity', () => {
    expect(eventIsBlocking({ type: 'server_failed' } as ExecutionEvent)).toBe(true)
    expect(eventIsBlocking({ type: 'blocked' } as ExecutionEvent)).toBe(true)
    expect(eventIsBlocking({ type: 'tool_result', message: 'Blocked: command denied' } as ExecutionEvent)).toBe(true)
  })
})
