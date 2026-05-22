import { describe, expect, it, vi } from 'vitest'
import {
  AGENT_TOOLS,
  computeProviderRetryDelay,
  KovaProviderError,
  parseRetryAfterMs,
  ToolExecutor,
  withProviderRetry,
} from '../src'
import { OpenAICompatibleProvider } from '../src/providers/openai-compatible'

describe('provider retry policy', () => {
  it('retries recoverable provider errors and returns the eventual result', async () => {
    const sleeps: number[] = []
    let calls = 0

    const result = await withProviderRetry(
      async () => {
        calls += 1
        if (calls < 3) throw new Error('503 upstream unavailable')
        return 'ok'
      },
      { sleep: async ms => { sleeps.push(ms) } },
      { jitterRatio: 0 },
    )

    expect(result).toBe('ok')
    expect(calls).toBe(3)
    expect(sleeps).toEqual([500, 1000])
  })

  it('does not retry non-recoverable auth errors', async () => {
    const sleep = vi.fn(async () => undefined)
    let calls = 0

    await expect(
      withProviderRetry(
        async () => {
          calls += 1
          throw new Error('401 Unauthorized')
        },
        { sleep },
      ),
    ).rejects.toMatchObject({ code: 'provider_auth', recoverable: false })

    expect(calls).toBe(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('stops at maxAttempts and throws the normalized final error', async () => {
    let calls = 0

    await expect(
      withProviderRetry(
        async () => {
          calls += 1
          throw new Error('502 Bad Gateway')
        },
        { sleep: async () => undefined, provider: 'openai-compatible', model: 'm' },
        { maxAttempts: 2 },
      ),
    ).rejects.toMatchObject({
      code: 'provider_unavailable',
      provider: 'openai-compatible',
      model: 'm',
      recoverable: true,
    })

    expect(calls).toBe(2)
  })

  it('honors Retry-After seconds before exponential backoff', () => {
    const error = Object.assign(new Error('429 Too Many Requests'), {
      status: 429,
      headers: { get: (name: string) => name.toLowerCase() === 'retry-after' ? '2' : null },
    })

    expect(computeProviderRetryDelay(error, 1, {
      maxAttempts: 3,
      baseDelayMs: 500,
      maxDelayMs: 8_000,
      jitterRatio: 0,
    })).toBe(2_000)
  })

  it('adds bounded jitter to exponential backoff when enabled', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(1)
    try {
      expect(computeProviderRetryDelay(new Error('503 unavailable'), 1, {
        maxAttempts: 3,
        baseDelayMs: 1_000,
        maxDelayMs: 2_000,
        jitterRatio: 0.25,
      })).toBe(1_250)
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('parses Retry-After HTTP-date values', () => {
    const now = Date.parse('Wed, 20 May 2026 12:00:00 GMT')
    const retryAt = 'Wed, 20 May 2026 12:00:05 GMT'

    expect(parseRetryAfterMs(retryAt, now)).toBe(5_000)
  })

  it('aborts before scheduling the next retry attempt', async () => {
    const controller = new AbortController()
    let calls = 0

    await expect(
      withProviderRetry(
        async () => {
          calls += 1
          throw new Error('503 unavailable')
        },
        {
          signal: controller.signal,
          sleep: async (_ms, signal) => {
            controller.abort()
            if (signal?.aborted) {
              const error = new Error('aborted')
              error.name = 'AbortError'
              throw error
            }
          },
        },
      ),
    ).rejects.toMatchObject({ code: 'provider_unknown', recoverable: false })

    expect(calls).toBe(1)
  })

  it('emits safe retry events without raw provider payloads', async () => {
    const events: Array<{ code: string; delayMs: number; safeMessage: string }> = []
    let calls = 0

    await withProviderRetry(
      async () => {
        calls += 1
        if (calls === 1) throw new Error('429 Too Many Requests: account x-secret')
        return 'ok'
      },
      {
        sleep: async () => undefined,
        onRetry: event => events.push({
          code: event.code,
          delayMs: event.delayMs,
          safeMessage: event.safeMessage,
        }),
      },
      { jitterRatio: 0 },
    )

    expect(events).toEqual([{
      code: 'provider_rate_limited',
      delayMs: 500,
      safeMessage: 'Rate limit reached. Try again later or switch provider.',
    }])
  })
})

describe('OpenAICompatibleProvider retry integration', () => {
  it('retries recoverable HTTP failures before returning a successful response', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'upstream unavailable',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'done' }, finish_reason: 'stop' }],
          usage: { total_tokens: 9 },
        }),
      } as Response)

    vi.stubGlobal('fetch', fetchMock)
    const provider = new OpenAICompatibleProvider({
      baseUrl: 'http://local/v1',
      model: 'm',
      retryPolicy: { baseDelayMs: 0, maxDelayMs: 0 },
    })

    try {
      const response = await provider.generate([{ role: 'user', content: 'hi' }])

      expect(response.thought).toBe('done')
      expect(response.tokensUsed).toBe(9)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('does not retry fatal HTTP failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    } as Response)

    vi.stubGlobal('fetch', fetchMock)
    const provider = new OpenAICompatibleProvider({
      baseUrl: 'http://local/v1',
      model: 'm',
      retryPolicy: { baseDelayMs: 0, maxDelayMs: 0 },
    })

    try {
      await expect(provider.generate([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(KovaProviderError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('emits provider retry callbacks from the agent loop', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Too Many Requests',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'done' }, finish_reason: 'stop' }],
          usage: { total_tokens: 4 },
        }),
      } as Response)

    vi.stubGlobal('fetch', fetchMock)
    const retryEvents: Array<{ code: string; nextAttempt: number; delayMs: number }> = []
    const provider = new OpenAICompatibleProvider({
      baseUrl: 'http://local/v1',
      model: 'm',
      retryPolicy: { baseDelayMs: 0, maxDelayMs: 0 },
    })

    try {
      const result = await provider.runAgentLoop([{ role: 'user', content: 'hi' }], {
        system: 'sys',
        tools: AGENT_TOOLS,
        executor: new ToolExecutor(process.cwd()),
        onProviderRetry: event => retryEvents.push({
          code: event.code,
          nextAttempt: event.nextAttempt,
          delayMs: event.delayMs,
        }),
      })

      expect(result.thought).toBe('done')
      expect(retryEvents).toEqual([{ code: 'provider_rate_limited', nextAttempt: 2, delayMs: 0 }])
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
