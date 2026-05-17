/**
 * Anti-drift guard: the renderer's `provider-config.ts` mirrors the model
 * catalog from `@kova/agent` because the renderer cannot import `@kova/agent`
 * at runtime (its barrel pulls Node-only modules — `node:fs`,
 * `node:child_process` — that Vite cannot bundle for the browser).
 *
 * This test runs in Node (vitest) where both modules import fine, and fails
 * if the two lists drift apart. Keeps DRY without coupling the renderer
 * bundle to Node-only code.
 */
import { describe, it, expect } from 'vitest'
import { MODEL_CATALOG, PROVIDER_DEFAULTS, type ProviderId } from '@kova/agent'
import {
  PROVIDERS,
  DEFAULT_MODELS,
  KNOWN_MODELS,
} from '../src/renderer/src/provider-config'

const CLOUD_PROVIDER_IDS: ProviderId[] = [
  'anthropic', 'openai', 'gemini', 'kimi', 'deepseek', 'xai', 'openrouter', 'nvidia',
]

describe('provider-config (renderer) ↔ @kova/agent catalog sync', () => {
  it('PROVIDERS lists every cloud provider declared in PROVIDER_DEFAULTS', () => {
    const rendererIds = new Set(PROVIDERS.map(p => p.value))
    for (const id of CLOUD_PROVIDER_IDS) {
      expect(rendererIds.has(id), `provider "${id}" missing from renderer PROVIDERS`).toBe(true)
    }
  })

  it('DEFAULT_MODELS matches PROVIDER_DEFAULTS[id].defaultModel for every cloud provider', () => {
    for (const id of CLOUD_PROVIDER_IDS) {
      expect(
        DEFAULT_MODELS[id],
        `renderer DEFAULT_MODELS[${id}] drifted from catalog`,
      ).toBe(PROVIDER_DEFAULTS[id].defaultModel)
    }
  })

  it('KNOWN_MODELS[id] matches MODEL_CATALOG[id].map(m => m.id) for every cloud provider', () => {
    for (const id of CLOUD_PROVIDER_IDS) {
      const fromCatalog = MODEL_CATALOG[id].map(m => m.id)
      expect(
        KNOWN_MODELS[id],
        `renderer KNOWN_MODELS[${id}] drifted from catalog`,
      ).toEqual(fromCatalog)
    }
  })

  it('every renderer DEFAULT_MODELS entry exists in its KNOWN_MODELS list', () => {
    for (const id of CLOUD_PROVIDER_IDS) {
      expect(KNOWN_MODELS[id]).toContain(DEFAULT_MODELS[id])
    }
  })
})
