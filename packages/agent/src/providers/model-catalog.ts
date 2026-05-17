/**
 * Provider model catalog — single source of truth for every cloud + local
 * provider Kova supports, the models each one exposes, and how Kova should
 * treat unknown / new models when only the ID is available.
 *
 * Consumers:
 *  - `OpenAICompatibleProvider.capabilities()` calls `detectCapabilities()` to
 *    decide whether tool calls are safe and how big the context window is.
 *  - The renderer's `provider-config.ts` reads PROVIDER_DEFAULTS + MODEL_CATALOG
 *    to populate the ProviderModal dropdowns.
 *  - `apps/electron/src/main/provider-resolver.ts` reads PROVIDER_DEFAULTS for
 *    base URLs and default models when none was configured.
 *
 * Update policy: when a provider releases a new model family, add the IDs to
 * MODEL_CATALOG **and** extend the capability detection regexes in
 * `detectCapabilities`. The companion test file locks the public surface.
 */

export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'kimi'
  | 'deepseek'
  | 'xai'
  | 'openrouter'
  | 'nvidia'
  | 'ollama'
  | 'lmstudio'
  | 'openai-compatible'

export interface ModelInfo {
  /** Exact API model ID — passed to the provider unchanged. */
  id: string
  /** Human-friendly name shown in the UI dropdown. */
  label: string
  /** Maximum input tokens the model accepts. */
  contextTokens: number
  /** True when the model can call tools natively (no XML fallback needed). */
  supportsToolCalls: boolean
  /** True for reasoning-tuned variants (DeepSeek R1, Kimi K2.6-thinking, etc.). */
  supportsThinking?: boolean
  /** Short note rendered next to the label. */
  notes?: string
}

export interface ProviderDefaults {
  /** Display name. */
  label: string
  /** API base URL (OpenAI-compatible path when applicable). */
  baseUrl: string
  /** Default model used when nothing is configured. Must exist in MODEL_CATALOG[id]. */
  defaultModel: string
  /** Hint on how to obtain an API key. Surfaced in the ProviderModal. */
  apiKeyHint?: string
  /** True for endpoints the user runs locally; affects API key requirement. */
  local?: boolean
}

/**
 * Capability inference used by `OpenAICompatibleProvider.capabilities()` and
 * any caller that only has a model ID (e.g. user typed a custom model the
 * catalog doesn't list yet).
 */
export interface DetectedCapabilities {
  supportsToolCalls: boolean
  contextTokenLimit: number
  /**
   * True only for providers that surface an explicit caching contract Kova
   * understands (Anthropic ephemeral cache_control). Provider-side automatic
   * caching (DeepSeek, OpenAI 5.x) is not reported here — it's transparent.
   */
  supportsPromptCaching?: boolean
}

// ─── 2026 catalog — search-confirmed IDs ─────────────────────────────────────

export const MODEL_CATALOG: Record<ProviderId, ModelInfo[]> = {
  anthropic: [
    { id: 'claude-opus-4-7',             label: 'Claude Opus 4.7',         contextTokens: 200_000, supportsToolCalls: true },
    { id: 'claude-sonnet-4-6',           label: 'Claude Sonnet 4.6',       contextTokens: 200_000, supportsToolCalls: true },
    { id: 'claude-haiku-4-5-20251001',   label: 'Claude Haiku 4.5',        contextTokens: 200_000, supportsToolCalls: true },
    { id: 'claude-3-5-sonnet-20241022',  label: 'Claude 3.5 Sonnet (legacy)', contextTokens: 200_000, supportsToolCalls: true, notes: 'legacy' },
    { id: 'claude-3-5-haiku-20241022',   label: 'Claude 3.5 Haiku (legacy)',  contextTokens: 200_000, supportsToolCalls: true, notes: 'legacy' },
  ],
  openai: [
    { id: 'gpt-5.5',           label: 'GPT-5.5',           contextTokens: 256_000, supportsToolCalls: true },
    { id: 'gpt-5.5-pro',       label: 'GPT-5.5 Pro',       contextTokens: 256_000, supportsToolCalls: true },
    { id: 'gpt-5.4',           label: 'GPT-5.4',           contextTokens: 256_000, supportsToolCalls: true },
    { id: 'gpt-5.4-mini',      label: 'GPT-5.4 Mini',      contextTokens: 128_000, supportsToolCalls: true },
    { id: 'gpt-5.4-nano',      label: 'GPT-5.4 Nano',      contextTokens: 128_000, supportsToolCalls: true },
    { id: 'gpt-5.2-codex',     label: 'GPT-5.2 Codex',     contextTokens: 256_000, supportsToolCalls: true, notes: 'coding-tuned' },
    { id: 'gpt-4.1',           label: 'GPT-4.1 (legacy)',  contextTokens: 1_000_000, supportsToolCalls: true, notes: 'legacy' },
    { id: 'gpt-4o',            label: 'GPT-4o (legacy)',   contextTokens: 128_000, supportsToolCalls: true, notes: 'legacy' },
  ],
  gemini: [
    { id: 'gemini-3.1-pro-preview',   label: 'Gemini 3.1 Pro',          contextTokens: 1_000_000, supportsToolCalls: true },
    { id: 'gemini-3-flash-preview',   label: 'Gemini 3 Flash',          contextTokens: 1_000_000, supportsToolCalls: true },
    { id: 'gemini-3.1-flash-lite',    label: 'Gemini 3.1 Flash-Lite',   contextTokens: 1_000_000, supportsToolCalls: true },
    { id: 'gemini-2.5-pro',           label: 'Gemini 2.5 Pro (legacy)', contextTokens: 2_000_000, supportsToolCalls: true, notes: 'legacy' },
    { id: 'gemini-2.5-flash',         label: 'Gemini 2.5 Flash (legacy)', contextTokens: 1_000_000, supportsToolCalls: true, notes: 'legacy' },
  ],
  kimi: [
    { id: 'kimi-k2.6',           label: 'Kimi K2.6',           contextTokens: 256_000, supportsToolCalls: true },
    { id: 'kimi-k2.6-thinking',  label: 'Kimi K2.6 Thinking',  contextTokens: 256_000, supportsToolCalls: true, supportsThinking: true },
    { id: 'kimi-k2.5',           label: 'Kimi K2.5',           contextTokens: 256_000, supportsToolCalls: true },
    { id: 'kimi-k2',             label: 'Kimi K2',             contextTokens: 128_000, supportsToolCalls: true, notes: 'open-source base' },
  ],
  deepseek: [
    { id: 'deepseek-chat',      label: 'DeepSeek Chat (V3.2)',  contextTokens: 128_000, supportsToolCalls: true },
    { id: 'deepseek-reasoner',  label: 'DeepSeek Reasoner (R1)', contextTokens: 128_000, supportsToolCalls: true, supportsThinking: true },
  ],
  xai: [
    { id: 'grok-4',                     label: 'Grok 4',                     contextTokens: 256_000, supportsToolCalls: true },
    { id: 'grok-4.1',                   label: 'Grok 4.1',                   contextTokens: 256_000, supportsToolCalls: true },
    { id: 'grok-4-fast-reasoning',      label: 'Grok 4 Fast Reasoning',      contextTokens: 256_000, supportsToolCalls: true, supportsThinking: true },
    { id: 'grok-4-fast-non-reasoning',  label: 'Grok 4 Fast',                contextTokens: 256_000, supportsToolCalls: true },
    { id: 'grok-code-fast-1',           label: 'Grok Code Fast',             contextTokens: 256_000, supportsToolCalls: true, notes: 'coding-tuned' },
  ],
  openrouter: [
    { id: 'anthropic/claude-opus-4-7',          label: 'Claude Opus 4.7 (OR)',     contextTokens: 200_000, supportsToolCalls: true },
    { id: 'anthropic/claude-sonnet-4-6',        label: 'Claude Sonnet 4.6 (OR)',   contextTokens: 200_000, supportsToolCalls: true },
    { id: 'openai/gpt-5.5',                     label: 'GPT-5.5 (OR)',             contextTokens: 256_000, supportsToolCalls: true },
    { id: 'google/gemini-3.1-pro-preview',      label: 'Gemini 3.1 Pro (OR)',      contextTokens: 1_000_000, supportsToolCalls: true },
    { id: 'google/gemini-3-flash-preview',      label: 'Gemini 3 Flash (OR)',      contextTokens: 1_000_000, supportsToolCalls: true },
    { id: 'deepseek/deepseek-chat',             label: 'DeepSeek Chat (OR)',       contextTokens: 128_000, supportsToolCalls: true },
    { id: 'deepseek/deepseek-reasoner',         label: 'DeepSeek Reasoner (OR)',   contextTokens: 128_000, supportsToolCalls: true, supportsThinking: true },
    { id: 'moonshotai/kimi-k2.6',               label: 'Kimi K2.6 (OR)',           contextTokens: 256_000, supportsToolCalls: true },
    { id: 'x-ai/grok-4',                        label: 'Grok 4 (OR)',              contextTokens: 256_000, supportsToolCalls: true },
    { id: 'meta-llama/llama-3.3-70b-instruct',  label: 'Llama 3.3 70B (OR)',       contextTokens: 128_000, supportsToolCalls: true },
    { id: 'qwen/qwen2.5-72b-instruct',          label: 'Qwen 2.5 72B (OR)',        contextTokens: 128_000, supportsToolCalls: true },
  ],
  nvidia: [
    { id: 'moonshotai/kimi-k2.6',  label: 'Kimi K2.6 (NVIDIA)',  contextTokens: 256_000, supportsToolCalls: true },
  ],
  ollama: [],
  lmstudio: [],
  'openai-compatible': [],
}

export const PROVIDER_DEFAULTS: Record<ProviderId, ProviderDefaults> = {
  anthropic: {
    label: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-6',
    apiKeyHint: 'console.anthropic.com → API Keys',
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5.5',
    apiKeyHint: 'platform.openai.com → API Keys',
  },
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-3-flash-preview',
    apiKeyHint: 'aistudio.google.com → Get API Key',
  },
  kimi: {
    label: 'Kimi (Moonshot)',
    baseUrl: 'https://api.moonshot.ai/v1',
    defaultModel: 'kimi-k2.6',
    apiKeyHint: 'platform.moonshot.ai → API Keys',
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    apiKeyHint: 'platform.deepseek.com → API Keys',
  },
  xai: {
    label: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-4',
    apiKeyHint: 'console.x.ai → API Keys',
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-sonnet-4-6',
    apiKeyHint: 'openrouter.ai → Keys',
  },
  nvidia: {
    label: 'NVIDIA Kimi K2.6',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'moonshotai/kimi-k2.6',
    apiKeyHint: 'build.nvidia.com → Kimi K2.6 → Get API Key',
  },
  ollama: {
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: '',
    local: true,
  },
  lmstudio: {
    label: 'LM Studio (local)',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: '',
    local: true,
  },
  'openai-compatible': {
    label: 'OpenAI-Compatible',
    baseUrl: '',
    defaultModel: '',
    local: true,
  },
}

// ─── capability detection by model ID ────────────────────────────────────────

/**
 * Patterns are tested top-to-bottom. The first match wins.
 *
 * Why regex over catalog lookup: users can paste any model ID (OpenRouter style
 * `vendor/model`, custom fine-tunes, brand-new releases). The catalog is the
 * curated dropdown source; this matcher is the safety net for everything else.
 */
const CAPABILITY_RULES: Array<{
  pattern: RegExp
  caps: DetectedCapabilities
}> = [
  // Anthropic — caching surface is unique to this family
  { pattern: /\bclaude-(opus|sonnet|haiku)-[34]/i, caps: { supportsToolCalls: true, contextTokenLimit: 200_000, supportsPromptCaching: true } },
  { pattern: /\bclaude-/i,                          caps: { supportsToolCalls: true, contextTokenLimit: 200_000, supportsPromptCaching: true } },

  // Google Gemini 3.x — 1M context, native tool calling
  { pattern: /\bgemini-3(\.\d+)?-(pro|flash)/i,     caps: { supportsToolCalls: true, contextTokenLimit: 1_000_000 } },
  { pattern: /\bgemini-3/i,                         caps: { supportsToolCalls: true, contextTokenLimit: 1_000_000 } },
  { pattern: /\bgemini-2\.5/i,                      caps: { supportsToolCalls: true, contextTokenLimit: 1_000_000 } },
  { pattern: /\bgemini-/i,                          caps: { supportsToolCalls: true, contextTokenLimit: 1_000_000 } },

  // Moonshot Kimi K2.x — 256k context, agentic tool use
  { pattern: /\bkimi-k2(\.\d+)?(-thinking)?/i,      caps: { supportsToolCalls: true, contextTokenLimit: 256_000 } },
  { pattern: /\bmoonshotai\/kimi/i,                 caps: { supportsToolCalls: true, contextTokenLimit: 256_000 } },
  { pattern: /\bmoonshot-v1/i,                      caps: { supportsToolCalls: true, contextTokenLimit: 128_000 } },

  // DeepSeek — chat (V3.2) + reasoner (R1)
  { pattern: /\bdeepseek-(chat|reasoner|v3|v4|r1)/i, caps: { supportsToolCalls: true, contextTokenLimit: 128_000 } },
  { pattern: /\bdeepseek/i,                          caps: { supportsToolCalls: true, contextTokenLimit: 128_000 } },

  // xAI Grok — 256k context across the 4.x line
  { pattern: /\bgrok-(4|3|code-fast)/i,             caps: { supportsToolCalls: true, contextTokenLimit: 256_000 } },
  { pattern: /\bgrok-/i,                             caps: { supportsToolCalls: true, contextTokenLimit: 131_000 } },
  { pattern: /\bx-ai\/grok/i,                        caps: { supportsToolCalls: true, contextTokenLimit: 256_000 } },

  // OpenAI GPT-5.x family — 256k context, native tools
  { pattern: /\bgpt-5(\.\d+)?/i,                    caps: { supportsToolCalls: true, contextTokenLimit: 256_000 } },
  // OpenAI GPT-4.1 — 1M context
  { pattern: /\bgpt-4\.1/i,                          caps: { supportsToolCalls: true, contextTokenLimit: 1_000_000 } },
  // OpenAI GPT-4o / o-series
  { pattern: /\bgpt-4(o|\b)/i,                       caps: { supportsToolCalls: true, contextTokenLimit: 128_000 } },
  { pattern: /\bo[1-9](-mini|-pro)?/i,               caps: { supportsToolCalls: true, contextTokenLimit: 200_000 } },

  // Open-source ecosystem — Llama 3.x, Qwen 2.5, Mistral large
  { pattern: /\bllama-3\.[1-9]/i,                    caps: { supportsToolCalls: true, contextTokenLimit: 128_000 } },
  { pattern: /\bqwen2\.5/i,                          caps: { supportsToolCalls: true, contextTokenLimit: 128_000 } },
  { pattern: /\bmistral-large/i,                     caps: { supportsToolCalls: true, contextTokenLimit: 128_000 } },
]

/**
 * Returns the safe defaults for a given model ID. Unknown models get the most
 * conservative defaults (no tool calls, 8k context) so the agent doesn't
 * silently truncate prompts or call tools the model can't handle.
 */
export function detectCapabilities(modelId: string): DetectedCapabilities {
  for (const rule of CAPABILITY_RULES) {
    if (rule.pattern.test(modelId)) return { ...rule.caps }
  }
  return { supportsToolCalls: false, contextTokenLimit: 8_000 }
}

// ─── lookup helpers ──────────────────────────────────────────────────────────

export function listProviderIds(): ProviderId[] {
  return Object.keys(PROVIDER_DEFAULTS) as ProviderId[]
}

export function findProvider(id: ProviderId): ProviderDefaults | undefined {
  return PROVIDER_DEFAULTS[id]
}

export function findModel(providerId: ProviderId, modelId: string): ModelInfo | undefined {
  const list = MODEL_CATALOG[providerId]
  if (!list) return undefined
  return list.find(m => m.id === modelId)
}
