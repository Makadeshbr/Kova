import { describe, expect, it, vi, afterEach } from 'vitest'
import { IpcGuard, type IpcGuardLogEvent } from '../src/main/ipc-guard'

const policies = {
  channel: { capacity: 2, refillPerSecond: 1, timeoutMs: 50 },
}

describe('IpcGuard', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests up to capacity and blocks the next one', async () => {
    const events: IpcGuardLogEvent[] = []
    const guard = new IpcGuard(policies, { logger: { warn: event => events.push(event) } })

    await expect(guard.run('channel', () => 'one')).resolves.toBe('one')
    await expect(guard.run('channel', () => 'two')).resolves.toBe('two')
    await expect(guard.run('channel', () => 'three')).rejects.toThrow('Rate limit exceeded')

    expect(events).toEqual([{ channel: 'channel', reason: 'rate_limit' }])
  })

  it('refills tokens according to elapsed time', async () => {
    let now = 0
    const guard = new IpcGuard(policies, { now: () => now })

    await guard.run('channel', () => 'one')
    await guard.run('channel', () => 'two')
    now = 1_000

    await expect(guard.run('channel', () => 'three')).resolves.toBe('three')
  })

  it('times out slow handlers and runs the timeout hook', async () => {
    vi.useFakeTimers()
    const events: IpcGuardLogEvent[] = []
    const onTimeout = vi.fn()
    const guard = new IpcGuard(policies, { logger: { warn: event => events.push(event) } })

    const result = guard.run('channel', () => new Promise<string>(() => undefined), { onTimeout })
    const expectation = expect(result).rejects.toThrow('IPC handler timed out')
    await vi.advanceTimersByTimeAsync(50)

    await expectation
    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(events).toEqual([{ channel: 'channel', reason: 'timeout', timeoutMs: 50 }])
  })
})
