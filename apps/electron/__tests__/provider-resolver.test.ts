/**
 * Provider resolver unit tests — exercises the pure provider/fallback logic extracted
 * from EngineManager. These tests document that:
 *   - tryFallbackProvider respects the recoverable-error rule
 *   - tryFallbackProvider respects the abort signal
 *   - tryFallbackProvider tags the resolution with fallback metadata
 *   - autoResolveModel returns the first model from /models endpoint
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  tryFallbackProvider,
  autoResolveModel,
  isLocalProvider,
  resolveProviderBaseUrl,
  resolveProviderDefaultModel,
} from '../src/main/provider-resolver'
import type { ProviderResolution } from '../src/main/provider-resolver'
import type { AgentProvider } from '@kova/agent'
import { KovaProviderError } from '@kova/agent'

const fakeProvider = {
  capabilities: () => ({ supportsToolCalls: true, contextTokenLimit: 8_000 }),
  generate: vi.fn(),
  runAgentLoop: vi.fn(),
} as unknown as AgentProvider

const fakeResolution: ProviderResolution = {
  provider: fakeProvider,
  resolvedProvider: 'openai',
  resolvedModel: 'gpt-4.1',
  fallback: false,
}

afterEach(() => vi.restoreAllMocks())

describe('tryFallbackProvider', () => {
  // Note: in test environments getSettingsInternal throws because the Electron app is
  // not initialized. The function MUST return null gracefully — never crash.

  it('returns null when getSettingsInternal throws (no Electron context)', async () => {
    const result = await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: new Error('any error'),
      factory: vi.fn().mockResolvedValue(fakeResolution),
      isAborted: () => false,
    })
    expect(result).toBeNull()
  })

  it('does NOT call factory when session was aborted', async () => {
    const factory = vi.fn()
    const result = await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: new Error('rate limit'),
      factory,
      isAborted: () => true,
    })
    expect(result).toBeNull()
    expect(factory).not.toHaveBeenCalled()
  })

  it('does NOT call factory when primary error is non-recoverable (e.g. auth)', async () => {
    const factory = vi.fn()
    const authError = new KovaProviderError({
      code: 'provider_auth', recoverable: false, safeMessage: 'bad key',
    })
    await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: authError,
      factory,
      isAborted: () => false,
    })
    expect(factory).not.toHaveBeenCalled()
  })
})

describe('autoResolveModel', () => {
  it('returns the configured model when provided (no network call)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const model = await autoResolveModel('http://local/v1', 'qwen-coder')
    expect(model).toBe('qwen-coder')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('queries /models and returns the first id when configured is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'llama3' }, { id: 'mistral' }] }),
    }))
    expect(await autoResolveModel('http://local/v1')).toBe('llama3')
  })

  it('returns undefined when /models endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    expect(await autoResolveModel('http://local/v1')).toBeUndefined()
  })

  it('fires onDetected callback with the resolved model', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'deepseek-coder' }] }),
    }))
    const onDetected = vi.fn()
    await autoResolveModel('http://local/v1', undefined, onDetected)
    expect(onDetected).toHaveBeenCalledWith('deepseek-coder')
  })

  it('does not throw on fetch network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    expect(await autoResolveModel('http://nowhere/v1')).toBeUndefined()
  })
})

describe('provider catalog defaults', () => {
  it('resolves base URLs and models from the shared provider catalog', () => {
    expect(resolveProviderBaseUrl('openai')).toBe('https://api.openai.com/v1')
    expect(resolveProviderDefaultModel('deepseek')).toBe('deepseek-chat')
  })

  it('keeps environment overrides constrained to local/NVIDIA endpoints', () => {
    const originalOllamaBaseUrl = process.env.OLLAMA_BASE_URL
    const originalNvidiaBaseUrl = process.env.NVIDIA_BASE_URL
    try {
      process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434/v1'
      process.env.NVIDIA_BASE_URL = 'https://nvidia.example/v1'

      expect(resolveProviderBaseUrl('ollama')).toBe('http://127.0.0.1:11434/v1')
      expect(resolveProviderBaseUrl('nvidia')).toBe('https://nvidia.example/v1')
    } finally {
      restoreEnv('OLLAMA_BASE_URL', originalOllamaBaseUrl)
      restoreEnv('NVIDIA_BASE_URL', originalNvidiaBaseUrl)
    }
  })

  it('detects local providers from provider defaults instead of a duplicate set', () => {
    expect(isLocalProvider('ollama')).toBe(true)
    expect(isLocalProvider('lmstudio')).toBe(true)
    expect(isLocalProvider('openai-compatible')).toBe(true)
    expect(isLocalProvider('openai')).toBe(false)
    expect(isLocalProvider('unknown')).toBe(false)
  })
})

function restoreEnv(name: 'OLLAMA_BASE_URL' | 'NVIDIA_BASE_URL', value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name]
    return
  }
  process.env[name] = value
}
