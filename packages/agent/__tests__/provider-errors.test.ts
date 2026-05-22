import { describe, expect, it, vi, afterEach } from 'vitest'
import { OpenAICompatibleProvider, normalizeProviderError } from '../src'
import { ToolExecutor } from '../src/tools'

const fetchMock = vi.fn()

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function mockHttp(status: number, body: string): void {
  fetchMock.mockResolvedValueOnce({ ok: false, status, text: async () => body } as Response)
  vi.stubGlobal('fetch', fetchMock)
}

describe('provider error normalization', () => {
  it('normaliza 401/403 como auth nao recuperavel', () => {
    const err = normalizeProviderError(new Error('401 unauthorized'))
    expect(err.code).toBe('provider_auth')
    expect(err.recoverable).toBe(false)
  })

  it('normaliza 429 como rate limit recuperavel', () => {
    const err = normalizeProviderError(new Error('429 Too Many Requests'))
    expect(err.code).toBe('provider_rate_limited')
    expect(err.recoverable).toBe(true)
  })

  it('normaliza model not found', () => {
    const err = normalizeProviderError(new Error('404 model not found'))
    expect(err.code).toBe('provider_model_not_found')
    expect(err.recoverable).toBe(true)
  })

  it('normaliza 5xx como unavailable', () => {
    const err = normalizeProviderError(new Error('503 upstream unavailable'))
    expect(err.code).toBe('provider_unavailable')
    expect(err.recoverable).toBe(true)
  })

  it('normaliza timeout/abort sem marcar abort como recuperavel', () => {
    const abort = new Error('aborted')
    abort.name = 'AbortError'
    expect(normalizeProviderError(abort).recoverable).toBe(false)
    expect(normalizeProviderError(new Error('fetch timeout')).code).toBe('provider_unavailable')
  })

  it('OpenAI-compatible joga erro normalizado em HTTP failure', async () => {
    mockHttp(429, 'Too Many Requests')
    const provider = new OpenAICompatibleProvider({ baseUrl: 'http://local/v1', model: 'm', retryPolicy: { maxAttempts: 1 } })
    await expect(provider.generate([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      code: 'provider_rate_limited',
      status: 429,
      recoverable: true,
    })
  })

  it('SSE interrompido por status HTTP retorna erro normalizado', async () => {
    mockHttp(404, 'model not found')
    const provider = new OpenAICompatibleProvider({ baseUrl: 'http://local/v1', model: 'missing', retryPolicy: { maxAttempts: 1 } })
    await expect(provider.runAgentLoop([{ role: 'user', content: 'hi' }], {
      system: 'sys',
      tools: [],
      executor: new ToolExecutor(process.cwd()),
      onToken: () => null,
    })).rejects.toMatchObject({ code: 'provider_model_not_found', status: 404 })
  })
})
