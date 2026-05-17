/**
 * Provider model catalog — single source of truth for:
 *  - which providers Kova supports
 *  - which models each provider exposes
 *  - capability detection (tool calling, context window, prompt caching)
 *
 * Tests lock the 2026 IDs we promise to the UI/users, plus the model-family
 * regex patterns that the OpenAI-compatible provider uses to decide whether
 * tool calls and big context windows are safe.
 */
import { describe, it, expect } from 'vitest'
import {
  MODEL_CATALOG,
  PROVIDER_DEFAULTS,
  detectCapabilities,
  findModel,
  findProvider,
  listProviderIds,
  type ProviderId,
} from '../src/providers/model-catalog'

const ALL_PROVIDER_IDS: ProviderId[] = [
  'anthropic', 'openai', 'gemini', 'kimi', 'deepseek',
  'xai', 'openrouter', 'nvidia', 'ollama', 'lmstudio', 'openai-compatible',
]

describe('MODEL_CATALOG — completeness', () => {
  it('exposes every supported provider', () => {
    expect(listProviderIds().sort()).toEqual([...ALL_PROVIDER_IDS].sort())
  })

  for (const id of ALL_PROVIDER_IDS) {
    if (id === 'openai-compatible' || id === 'lmstudio' || id === 'ollama') continue
    it(`${id}: has at least 1 model in catalog`, () => {
      expect(MODEL_CATALOG[id].length).toBeGreaterThan(0)
    })
  }

  it('every catalog entry has id, label, contextTokens, supportsToolCalls', () => {
    for (const id of ALL_PROVIDER_IDS) {
      for (const model of MODEL_CATALOG[id]) {
        expect(model.id).toBeTruthy()
        expect(model.label).toBeTruthy()
        expect(model.contextTokens).toBeGreaterThan(0)
        expect(typeof model.supportsToolCalls).toBe('boolean')
      }
    }
  })

  it('every provider has a defaults block (baseUrl + defaultModel where applicable)', () => {
    for (const id of ALL_PROVIDER_IDS) {
      const def = PROVIDER_DEFAULTS[id]
      expect(def).toBeDefined()
      expect(def.label).toBeTruthy()
    }
  })

  it('the default model for each cloud provider is present in its catalog', () => {
    for (const id of ['anthropic', 'openai', 'gemini', 'kimi', 'deepseek', 'xai'] as ProviderId[]) {
      const def = PROVIDER_DEFAULTS[id]
      const found = MODEL_CATALOG[id].some(m => m.id === def.defaultModel)
      expect(found, `default model "${def.defaultModel}" must exist in MODEL_CATALOG[${id}]`).toBe(true)
    }
  })
})

describe('MODEL_CATALOG — 2026 IDs (search-confirmed)', () => {
  it('lists current Gemini 3.x models', () => {
    const ids = MODEL_CATALOG.gemini.map(m => m.id)
    expect(ids).toContain('gemini-3.1-pro-preview')
    expect(ids).toContain('gemini-3-flash-preview')
    expect(ids).toContain('gemini-3.1-flash-lite')
  })

  it('lists current Kimi K2.x models', () => {
    const ids = MODEL_CATALOG.kimi.map(m => m.id)
    expect(ids).toContain('kimi-k2.6')
    expect(ids).toContain('kimi-k2.6-thinking')
  })

  it('lists current DeepSeek API IDs (chat + reasoner backed by V3.2 family)', () => {
    const ids = MODEL_CATALOG.deepseek.map(m => m.id)
    expect(ids).toContain('deepseek-chat')
    expect(ids).toContain('deepseek-reasoner')
  })

  it('lists Grok 4 family (xAI)', () => {
    const ids = MODEL_CATALOG.xai.map(m => m.id)
    expect(ids).toContain('grok-4')
    expect(ids).toContain('grok-4-fast-reasoning')
    expect(ids).toContain('grok-code-fast-1')
  })

  it('keeps the Claude 4.x family', () => {
    const ids = MODEL_CATALOG.anthropic.map(m => m.id)
    expect(ids).toContain('claude-opus-4-7')
    expect(ids).toContain('claude-sonnet-4-6')
  })

  it('lists GPT-5 family on OpenAI', () => {
    const ids = MODEL_CATALOG.openai.map(m => m.id)
    // gpt-5 family is search-confirmed for 2026
    expect(ids.some(id => id.startsWith('gpt-5'))).toBe(true)
  })

  it('xAI provider has the correct base URL', () => {
    expect(PROVIDER_DEFAULTS.xai.baseUrl).toBe('https://api.x.ai/v1')
  })

  it('Gemini uses the OpenAI-compatible endpoint', () => {
    expect(PROVIDER_DEFAULTS.gemini.baseUrl).toContain('generativelanguage.googleapis.com')
    expect(PROVIDER_DEFAULTS.gemini.baseUrl).toContain('/openai')
  })

  it('Kimi uses platform.moonshot.ai', () => {
    expect(PROVIDER_DEFAULTS.kimi.baseUrl).toBe('https://api.moonshot.ai/v1')
  })
})

describe('detectCapabilities — tool calls', () => {
  it('Claude 4.x family supports tool calls', () => {
    expect(detectCapabilities('claude-opus-4-7').supportsToolCalls).toBe(true)
    expect(detectCapabilities('claude-sonnet-4-6').supportsToolCalls).toBe(true)
    expect(detectCapabilities('claude-haiku-4-5-20251001').supportsToolCalls).toBe(true)
  })

  it('Gemini 3.x family supports tool calls', () => {
    expect(detectCapabilities('gemini-3.1-pro-preview').supportsToolCalls).toBe(true)
    expect(detectCapabilities('gemini-3-flash-preview').supportsToolCalls).toBe(true)
  })

  it('Kimi K2.x family supports tool calls', () => {
    expect(detectCapabilities('kimi-k2.6').supportsToolCalls).toBe(true)
    expect(detectCapabilities('kimi-k2.6-thinking').supportsToolCalls).toBe(true)
  })

  it('DeepSeek chat + reasoner support tool calls', () => {
    expect(detectCapabilities('deepseek-chat').supportsToolCalls).toBe(true)
    expect(detectCapabilities('deepseek-reasoner').supportsToolCalls).toBe(true)
  })

  it('Grok 4 family supports tool calls', () => {
    expect(detectCapabilities('grok-4').supportsToolCalls).toBe(true)
    expect(detectCapabilities('grok-4-fast-reasoning').supportsToolCalls).toBe(true)
    expect(detectCapabilities('grok-code-fast-1').supportsToolCalls).toBe(true)
  })

  it('GPT-5 family supports tool calls', () => {
    expect(detectCapabilities('gpt-5.5').supportsToolCalls).toBe(true)
    expect(detectCapabilities('gpt-5.4-mini').supportsToolCalls).toBe(true)
  })

  it('GPT-4 family supports tool calls', () => {
    expect(detectCapabilities('gpt-4.1').supportsToolCalls).toBe(true)
    expect(detectCapabilities('gpt-4o').supportsToolCalls).toBe(true)
  })

  it('Llama 3.x and Mistral large support tool calls', () => {
    expect(detectCapabilities('meta-llama/llama-3.3-70b-instruct').supportsToolCalls).toBe(true)
    expect(detectCapabilities('mistralai/mistral-large-2407').supportsToolCalls).toBe(true)
  })

  it('Qwen 2.5 supports tool calls', () => {
    expect(detectCapabilities('qwen/qwen2.5-72b-instruct').supportsToolCalls).toBe(true)
  })

  it('unknown / tiny local model: conservative no-tool-calls default', () => {
    expect(detectCapabilities('unknown-tiny-model-7b').supportsToolCalls).toBe(false)
  })
})

describe('detectCapabilities — context windows', () => {
  it('Gemini 3.x reports 1M context', () => {
    expect(detectCapabilities('gemini-3.1-pro-preview').contextTokenLimit).toBeGreaterThanOrEqual(1_000_000)
  })

  it('Kimi K2 reports 200k+ context', () => {
    expect(detectCapabilities('kimi-k2.6').contextTokenLimit).toBeGreaterThanOrEqual(200_000)
  })

  it('Claude Sonnet 4.6 reports 200k context', () => {
    expect(detectCapabilities('claude-sonnet-4-6').contextTokenLimit).toBeGreaterThanOrEqual(180_000)
  })

  it('DeepSeek chat/reasoner reports 128k+', () => {
    expect(detectCapabilities('deepseek-chat').contextTokenLimit).toBeGreaterThanOrEqual(128_000)
  })

  it('Grok 4 reports 256k+', () => {
    expect(detectCapabilities('grok-4').contextTokenLimit).toBeGreaterThanOrEqual(128_000)
  })

  it('unknown model falls back to a safe 8k', () => {
    expect(detectCapabilities('unknown-tiny-model-7b').contextTokenLimit).toBe(8_000)
  })
})

describe('detectCapabilities — prompt caching', () => {
  it('Claude family advertises prompt caching', () => {
    expect(detectCapabilities('claude-opus-4-7').supportsPromptCaching).toBe(true)
  })

  it('Gemini/Kimi/DeepSeek/Grok/OpenAI: no explicit caching surface here (provider-side automatic only)', () => {
    expect(detectCapabilities('gemini-3.1-pro-preview').supportsPromptCaching).toBeFalsy()
    expect(detectCapabilities('kimi-k2.6').supportsPromptCaching).toBeFalsy()
    expect(detectCapabilities('deepseek-chat').supportsPromptCaching).toBeFalsy()
    expect(detectCapabilities('grok-4').supportsPromptCaching).toBeFalsy()
    expect(detectCapabilities('gpt-5.5').supportsPromptCaching).toBeFalsy()
  })
})

describe('lookup helpers', () => {
  it('findModel returns ModelInfo by exact id', () => {
    const info = findModel('gemini', 'gemini-3.1-pro-preview')
    expect(info?.label).toBeTruthy()
    expect(info?.contextTokens).toBeGreaterThanOrEqual(1_000_000)
  })

  it('findModel returns undefined for unknown id under known provider', () => {
    expect(findModel('gemini', 'gemini-7-superdupermega')).toBeUndefined()
  })

  it('findProvider returns the defaults block by id', () => {
    expect(findProvider('xai')?.baseUrl).toBe('https://api.x.ai/v1')
  })

  it('findProvider returns undefined for unknown provider id', () => {
    expect(findProvider('not-a-provider' as ProviderId)).toBeUndefined()
  })
})
