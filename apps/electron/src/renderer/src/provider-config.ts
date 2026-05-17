/**
 * Renderer-side provider configuration.
 *
 * Self-contained on purpose: the Electron renderer cannot import the full
 * `@kova/agent` package because its barrel pulls `tools.ts` → `node:fs` /
 * `node:child_process`, which Vite cannot bundle for the browser.
 *
 * Source of truth for these IDs lives in
 * `packages/agent/src/providers/model-catalog.ts`. A sync test
 * (`apps/electron/__tests__/provider-config-sync.test.ts`) runs in Node and
 * fails CI if the two drift apart, so DRY is enforced without coupling the
 * renderer bundle to Node-only code.
 */
import type { KovaSettings } from './types'

export interface ProviderDef {
  value: string
  label: string
  description: string
  local: boolean
}

export const PROVIDERS: ProviderDef[] = [
  { value: 'lmstudio',          label: 'LM Studio',         description: 'Local OpenAI-compatible server', local: true },
  { value: 'ollama',            label: 'Ollama',            description: 'Local Ollama server',             local: true },
  { value: 'anthropic',         label: 'Anthropic Claude',  description: 'Claude API models',               local: false },
  { value: 'openai',            label: 'OpenAI',            description: 'OpenAI API models',               local: false },
  { value: 'gemini',            label: 'Google Gemini',     description: 'Gemini OpenAI-compatible endpoint', local: false },
  { value: 'deepseek',          label: 'DeepSeek',          description: 'DeepSeek API models',             local: false },
  { value: 'kimi',              label: 'Kimi (Moonshot)',   description: 'Moonshot Kimi K2.x models',       local: false },
  { value: 'xai',               label: 'xAI (Grok)',        description: 'Grok 4 family',                   local: false },
  { value: 'openrouter',        label: 'OpenRouter',        description: 'Router for Claude, GPT, Gemini and OSS models', local: false },
  { value: 'nvidia',            label: 'NVIDIA Kimi K2.6',  description: 'NVIDIA hosted Kimi endpoint',     local: false },
  { value: 'openai-compatible', label: 'OpenAI Compatible', description: 'Custom compatible endpoint',      local: false },
]

export const HINTS: Record<string, string> = {
  lmstudio:           'Abra LM Studio > Local Server > carregue um modelo > Start Server.',
  ollama:             'Instale Ollama (ollama.ai) e rode: ollama pull qwen2.5-coder:7b',
  anthropic:          'console.anthropic.com → API Keys. Selecione o modelo no dropdown.',
  openai:             'platform.openai.com → API Keys. GPT-5.x recomendado.',
  deepseek:           'platform.deepseek.com → API Keys. Modelos: deepseek-chat (V3.2) ou deepseek-reasoner (R1).',
  gemini:             'aistudio.google.com → Get API Key. Usa o endpoint OpenAI-compatible do Google.',
  openrouter:         'openrouter.ai → Keys. Suporta Claude, GPT, Gemini, Llama e outros modelos.',
  kimi:               'platform.moonshot.ai → API Keys.',
  xai:                'console.x.ai → API Keys. Grok 4 e variantes fast/code.',
  nvidia:             'build.nvidia.com → Kimi K2.6 → Get API Key.',
  'openai-compatible':'Qualquer API compativel com OpenAI: Groq, Together, Fireworks, LM Studio remoto. Informe URL e modelo.',
}

export const API_KEY_CONFIG: Record<string, { label: string; placeholder: string; key: keyof KovaSettings }> = {
  anthropic:          { label: 'Anthropic API Key',     placeholder: 'sk-ant-api03-...', key: 'anthropicKey' },
  openai:             { label: 'OpenAI API Key',        placeholder: 'sk-proj-...',      key: 'openaiKey' },
  deepseek:           { label: 'DeepSeek API Key',      placeholder: 'sk-...',           key: 'deepseekKey' },
  gemini:             { label: 'Google Gemini API Key', placeholder: 'AIza...',          key: 'geminiKey' },
  openrouter:         { label: 'OpenRouter API Key',    placeholder: 'sk-or-v1-...',     key: 'openrouterKey' },
  kimi:               { label: 'Kimi / Moonshot Key',   placeholder: 'sk-...',           key: 'kimiKey' },
  xai:                { label: 'xAI API Key',           placeholder: 'xai-...',          key: 'xaiKey' },
  nvidia:             { label: 'NVIDIA API Key',        placeholder: 'nvapi-...',        key: 'nvidiaKey' },
  'openai-compatible':{ label: 'API Key (optional)',    placeholder: 'leave empty when not required', key: 'openaiCompatibleKey' },
}

// Default model per provider — mirrors `PROVIDER_DEFAULTS[id].defaultModel`
// from `@kova/agent/src/providers/model-catalog.ts`. Drift is caught by the
// sync test.
export const DEFAULT_MODELS: Record<string, string> = {
  anthropic:  'claude-sonnet-4-6',
  openai:     'gpt-5.5',
  deepseek:   'deepseek-chat',
  gemini:     'gemini-3-flash-preview',
  openrouter: 'anthropic/claude-sonnet-4-6',
  kimi:       'kimi-k2.6',
  xai:        'grok-4',
  nvidia:     'moonshotai/kimi-k2.6',
}

// Model IDs surfaced in the dropdown per provider — mirrors
// `MODEL_CATALOG[id].map(m => m.id)` from `@kova/agent`. Sync test enforces
// equality so users can't switch to a model the agent doesn't know how to
// instantiate.
export const KNOWN_MODELS: Record<string, string[]> = {
  anthropic: [
    'claude-opus-4-7',
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
  ],
  openai: [
    'gpt-5.5',
    'gpt-5.5-pro',
    'gpt-5.4',
    'gpt-5.4-mini',
    'gpt-5.4-nano',
    'gpt-5.2-codex',
    'gpt-4.1',
    'gpt-4o',
  ],
  gemini: [
    'gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
  ],
  kimi: [
    'kimi-k2.6',
    'kimi-k2.6-thinking',
    'kimi-k2.5',
    'kimi-k2',
  ],
  deepseek: [
    'deepseek-chat',
    'deepseek-reasoner',
  ],
  xai: [
    'grok-4',
    'grok-4.1',
    'grok-4-fast-reasoning',
    'grok-4-fast-non-reasoning',
    'grok-code-fast-1',
  ],
  openrouter: [
    'anthropic/claude-opus-4-7',
    'anthropic/claude-sonnet-4-6',
    'openai/gpt-5.5',
    'google/gemini-3.1-pro-preview',
    'google/gemini-3-flash-preview',
    'deepseek/deepseek-chat',
    'deepseek/deepseek-reasoner',
    'moonshotai/kimi-k2.6',
    'x-ai/grok-4',
    'meta-llama/llama-3.3-70b-instruct',
    'qwen/qwen2.5-72b-instruct',
  ],
  nvidia: [
    'moonshotai/kimi-k2.6',
  ],
}
