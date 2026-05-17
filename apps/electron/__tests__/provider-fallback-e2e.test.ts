/**
 * Provider fallback E2E tests — full flow:
 *   primary provider fails (rate_limit / unavailable) → tryFallbackProvider selects backup
 *   → EngineManager uses fallback → task runs → provider_session_start has fallback:true
 *
 * vi.mock intercepts ipc-handlers before electron is imported so getSettingsInternal
 * returns controlled settings without requiring an Electron app instance.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('../src/main/ipc-handlers', () => ({
  getSettingsInternal: vi.fn(),
}))

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { tryFallbackProvider } from '../src/main/provider-resolver'
import { getSettingsInternal } from '../src/main/ipc-handlers'
import { KovaProviderError } from '@kova/agent'
import type { AgentProvider, AgentLoopOptions, LLMResponse } from '@kova/agent'
import type { AgentMessage, ExecutionEvent } from '@kova/shared'
import { EngineManager } from '../src/main/engine-manager'
import type { StartTaskParams, ProviderResolution } from '../src/main/engine-manager'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

type TestSettings = ReturnType<typeof getSettingsInternal>

const BASE_SETTINGS: TestSettings = {
  defaultProvider: 'anthropic',
  anthropicKey: '',
  openaiKey: '',
  deepseekKey: '',
  openrouterKey: '',
  kimiKey: '',
  geminiKey: '',
  xaiKey: '',
  openaiCompatibleKey: '',
  ollamaUrl: 'http://localhost:11434/v1',
  compatibleUrl: 'http://localhost:1234/v1',
  model: '',
  autoApply: false,
  maxIterations: 5,
}

function withSettings(overrides: Partial<TestSettings>): TestSettings {
  return { ...BASE_SETTINGS, ...overrides }
}

function makeProvider(tokens: string[] = ['ok']): AgentProvider {
  return {
    capabilities: () => ({ supportsToolCalls: true, contextTokenLimit: 8_000 }),
    generate: vi.fn().mockResolvedValue({ thought: '', changes: [], tokensUsed: 0 } as LLMResponse),
    runAgentLoop: vi.fn().mockImplementation(async (_msgs: AgentMessage[], opts: AgentLoopOptions) => {
      for (const tok of tokens) opts.onToken?.(tok)
      return { thought: tokens.join(''), changes: [], tokensUsed: 1 } as LLMResponse
    }),
  }
}

function resolution(provider: AgentProvider, resolvedProvider = 'openai', model = 'gpt-4.1'): ProviderResolution {
  return { provider, resolvedProvider, resolvedModel: model, fallback: false }
}

const RATE_LIMIT = new KovaProviderError({
  code: 'provider_rate_limited', recoverable: true,
  safeMessage: '429 Too Many Requests', status: 429, provider: 'anthropic',
})

const UNAVAILABLE = new KovaProviderError({
  code: 'provider_unavailable', recoverable: true,
  safeMessage: 'LLM server not responding', provider: 'anthropic',
})

const AUTH_FAIL = new KovaProviderError({
  code: 'provider_auth', recoverable: false,
  safeMessage: 'Invalid API key', status: 401, provider: 'anthropic',
})

// ─── tryFallbackProvider — unit tests with injected settings ──────────────────

describe('tryFallbackProvider — success path', () => {
  beforeEach(() => {
    vi.mocked(getSettingsInternal).mockReturnValue(
      withSettings({ fallbackProvider: 'openai', openaiKey: 'sk-test' }),
    )
  })

  afterEach(() => vi.resetAllMocks())

  it('returns resolution with fallback:true when primary fails with rate_limit', async () => {
    const fallbackProv = makeProvider(['from fallback'])
    const factory = vi.fn().mockResolvedValue(resolution(fallbackProv))

    const result = await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: RATE_LIMIT,
      factory,
      isAborted: () => false,
    })

    expect(result).not.toBeNull()
    expect(result?.fallback).toBe(true)
    expect(result?.resolvedProvider).toBe('openai')
  })

  it('fallbackReason names both the failed provider and the replacement', async () => {
    const factory = vi.fn().mockResolvedValue(resolution(makeProvider()))
    const result = await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: RATE_LIMIT,
      factory,
      isAborted: () => false,
    })
    expect(result?.fallbackReason).toContain('anthropic')
    expect(result?.fallbackReason).toContain('openai')
  })

  it('fallbackReason includes the original error message', async () => {
    const factory = vi.fn().mockResolvedValue(resolution(makeProvider()))
    const result = await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: RATE_LIMIT,
      factory,
      isAborted: () => false,
    })
    expect(result?.fallbackReason).toContain('429 Too Many Requests')
  })

  it('calls factory with fallback provider name and api key from settings', async () => {
    const factory = vi.fn().mockResolvedValue(resolution(makeProvider()))
    await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: RATE_LIMIT,
      factory,
      isAborted: () => false,
    })
    expect(factory).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'openai', apiKey: 'sk-test' }),
      undefined,
    )
  })

  it('forwards fallbackModel from settings to the factory call', async () => {
    vi.mocked(getSettingsInternal).mockReturnValue(
      withSettings({ fallbackProvider: 'openai', openaiKey: 'sk-test', fallbackModel: 'gpt-4o' }),
    )
    const factory = vi.fn().mockResolvedValue(resolution(makeProvider()))
    await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: RATE_LIMIT,
      factory,
      isAborted: () => false,
    })
    expect(factory).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' }),
      undefined,
    )
  })

  it('triggers fallback for provider_unavailable (also recoverable)', async () => {
    const factory = vi.fn().mockResolvedValue(resolution(makeProvider()))
    const result = await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: UNAVAILABLE,
      factory,
      isAborted: () => false,
    })
    expect(result?.fallback).toBe(true)
    expect(factory).toHaveBeenCalledTimes(1)
  })
})

describe('tryFallbackProvider — guard conditions', () => {
  afterEach(() => vi.resetAllMocks())

  it('returns null when fallbackProvider is same as primary (circular guard)', async () => {
    vi.mocked(getSettingsInternal).mockReturnValue(
      withSettings({ fallbackProvider: 'anthropic', anthropicKey: 'key' }),
    )
    const factory = vi.fn()
    const result = await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: RATE_LIMIT,
      factory,
      isAborted: () => false,
    })
    expect(result).toBeNull()
    expect(factory).not.toHaveBeenCalled()
  })

  it('returns null and skips factory for non-recoverable auth error', async () => {
    vi.mocked(getSettingsInternal).mockReturnValue(
      withSettings({ fallbackProvider: 'openai', openaiKey: 'sk-test' }),
    )
    const factory = vi.fn()
    const result = await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: AUTH_FAIL,
      factory,
      isAborted: () => false,
    })
    expect(result).toBeNull()
    expect(factory).not.toHaveBeenCalled()
  })

  it('returns null when session was aborted before fallback resolves', async () => {
    vi.mocked(getSettingsInternal).mockReturnValue(
      withSettings({ fallbackProvider: 'openai', openaiKey: 'sk-test' }),
    )
    const factory = vi.fn()
    const result = await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: RATE_LIMIT,
      factory,
      isAborted: () => true,
    })
    expect(result).toBeNull()
    expect(factory).not.toHaveBeenCalled()
  })

  it('returns null gracefully when fallback factory itself throws', async () => {
    vi.mocked(getSettingsInternal).mockReturnValue(
      withSettings({ fallbackProvider: 'openai', openaiKey: 'sk-test' }),
    )
    const factory = vi.fn().mockRejectedValue(new Error('fallback network error'))
    const result = await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: RATE_LIMIT,
      factory,
      isAborted: () => false,
    })
    expect(result).toBeNull()
  })

  it('returns null when fallback factory returns null (unconfigured fallback)', async () => {
    vi.mocked(getSettingsInternal).mockReturnValue(
      withSettings({ fallbackProvider: 'openai', openaiKey: '' }),
    )
    const factory = vi.fn().mockResolvedValue(null)
    const result = await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: RATE_LIMIT,
      factory,
      isAborted: () => false,
    })
    expect(result).toBeNull()
  })

  it('returns null when no fallbackProvider is configured in settings', async () => {
    vi.mocked(getSettingsInternal).mockReturnValue(withSettings({})) // no fallbackProvider
    const factory = vi.fn()
    const result = await tryFallbackProvider({
      params: { objective: 't', projectRoot: '/p', provider: 'anthropic' },
      primaryError: RATE_LIMIT,
      factory,
      isAborted: () => false,
    })
    expect(result).toBeNull()
    expect(factory).not.toHaveBeenCalled()
  })
})

// ─── EngineManager — full E2E fallback flow ───────────────────────────────────

describe('EngineManager — provider fallback E2E', () => {
  let projectRoot: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'kova-fb-test-'))
    vi.mocked(getSettingsInternal).mockReturnValue(
      withSettings({ fallbackProvider: 'openai', openaiKey: 'sk-test' }),
    )
  })

  afterEach(() => {
    vi.resetAllMocks()
    rmSync(projectRoot, { recursive: true, force: true })
  })

  function params(): StartTaskParams {
    return {
      objective: 'test task', projectRoot,
      provider: 'anthropic', apiKey: 'bad-key',
      maxIterations: 1, autoApply: false, mode: 'chat',
    }
  }

  function makeManager(factory: (p: StartTaskParams) => Promise<ProviderResolution | null>) {
    const events: ExecutionEvent[] = []
    const chatMessages: string[] = []
    const manager = new EngineManager(factory)
    manager.setHandlers(vi.fn(), vi.fn(), vi.fn(), vi.fn(), m => chatMessages.push(m), e => events.push(e))
    return { manager, events, chatMessages }
  }

  it('rate_limit → fallback → provider_session_start has fallback:true and names both providers', async () => {
    const fallbackProv = makeProvider(['response from fallback'])
    let call = 0
    const { manager, events } = makeManager(async (p) => {
      call++
      if (call === 1) throw RATE_LIMIT
      if (p.provider === 'openai') return resolution(fallbackProv, 'openai', 'gpt-4.1')
      return null
    })

    await manager.sendMessage('Hello', [], params())

    const sessionStart = events.find(e => e.type === 'provider_session_start')
    expect(sessionStart).toBeTruthy()
    expect(sessionStart?.providerMeta?.fallback).toBe(true)
    expect(sessionStart?.providerMeta?.resolvedProvider).toBe('openai')
    expect(sessionStart?.providerMeta?.requestedProvider).toBe('anthropic')
    expect(sessionStart?.providerMeta?.fallbackReason).toContain('anthropic')
    expect(sessionStart?.providerMeta?.fallbackReason).toContain('openai')
  })

  it('rate_limit → fallback → task completes (stream_end emitted exactly once)', async () => {
    const fallbackProv = makeProvider(['done'])
    let call = 0
    const { manager, events } = makeManager(async (p) => {
      call++
      if (call === 1) throw RATE_LIMIT
      if (p.provider === 'openai') return resolution(fallbackProv)
      return null
    })

    await manager.sendMessage('Hello', [], params())

    expect(events.filter(e => e.type === 'stream_end')).toHaveLength(1)
    expect(events.some(e => e.type === 'provider_error')).toBe(false)
  })

  it('unavailable → fallback → provider_session_start has fallback:true', async () => {
    const fallbackProv = makeProvider(['ok'])
    let call = 0
    const { manager, events } = makeManager(async (p) => {
      call++
      if (call === 1) throw UNAVAILABLE
      if (p.provider === 'openai') return resolution(fallbackProv)
      return null
    })

    await manager.sendMessage('Hello', [], params())

    expect(events.find(e => e.type === 'provider_session_start')?.providerMeta?.fallback).toBe(true)
    expect(events.filter(e => e.type === 'stream_end')).toHaveLength(1)
  })

  it('non-recoverable auth error → NO fallback attempted → provider_error emitted', async () => {
    const { manager, events, chatMessages } = makeManager(async () => { throw AUTH_FAIL })

    await manager.sendMessage('Hello', [], params())

    expect(events.find(e => e.type === 'provider_error')?.providerError).toBe('provider_auth')
    expect(events.find(e => e.type === 'provider_session_start')).toBeUndefined()
    expect(events.filter(e => e.type === 'stream_end')).toHaveLength(1)
    expect(chatMessages.join('\n')).toMatch(/invalida|key|api/i)
  })

  it('rate_limit → fallback also fails → primary error reported, stream_end emitted', async () => {
    let call = 0
    const { manager, events } = makeManager(async () => {
      call++
      if (call === 1) throw RATE_LIMIT
      throw new Error('fallback network failure')
    })

    await manager.sendMessage('Hello', [], params())

    expect(events.find(e => e.type === 'provider_error')).toBeTruthy()
    expect(events.filter(e => e.type === 'stream_end')).toHaveLength(1)
  })

  it('fallback resolution includes providerMeta with requestedModel when model was set', async () => {
    const fallbackProv = makeProvider(['ok'])
    let call = 0
    const { manager, events } = makeManager(async (p) => {
      call++
      if (call === 1) throw RATE_LIMIT
      if (p.provider === 'openai') return resolution(fallbackProv)
      return null
    })
    const paramsWithModel = { ...params(), model: 'claude-sonnet-4-6' }

    await manager.sendMessage('Hello', [], paramsWithModel)

    const sessionStart = events.find(e => e.type === 'provider_session_start')
    expect(sessionStart?.providerMeta?.requestedModel).toBe('claude-sonnet-4-6')
    expect(sessionStart?.providerMeta?.fallback).toBe(true)
  })

  it('second consecutive request after fallback uses primary provider again (no sticky fallback)', async () => {
    // Each new message resolves providers fresh — no stickiness between sessions
    const primaryProv = makeProvider(['primary ok'])
    const { manager, events } = makeManager(async () => resolution(primaryProv, 'anthropic', 'claude-sonnet'))

    await manager.sendMessage('Hello', [], params())
    await manager.sendMessage('Hello again', [], params())

    const sessions = events.filter(e => e.type === 'provider_session_start')
    expect(sessions).toHaveLength(2)
    expect(sessions[0]?.providerMeta?.fallback).toBe(false)
    expect(sessions[1]?.providerMeta?.fallback).toBe(false)
  })
})
