/**
 * Renderer-side provider configuration.
 *
 * The model lists, default models, and base URLs come from the shared
 * @kova/agent catalog so the dropdown, capability detection, and provider
 * resolution all agree on the same 2026 IDs. UI-only concerns (labels,
 * placeholders, hints) live here.
 */
import type { KovaSettings } from './types'
import { MODEL_CATALOG, PROVIDER_DEFAULTS, type ProviderId } from '@kova/agent'

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
  anthropic:          `${PROVIDER_DEFAULTS.anthropic.apiKeyHint}. Selecione o modelo no dropdown.`,
  openai:             `${PROVIDER_DEFAULTS.openai.apiKeyHint}. GPT-5.x recomendado.`,
  deepseek:           `${PROVIDER_DEFAULTS.deepseek.apiKeyHint}. Modelos: deepseek-chat (V3.2) ou deepseek-reasoner (R1).`,
  gemini:             `${PROVIDER_DEFAULTS.gemini.apiKeyHint}. Usa o endpoint OpenAI-compatible do Google.`,
  openrouter:         `${PROVIDER_DEFAULTS.openrouter.apiKeyHint}. Suporta Claude, GPT, Gemini, Llama e outros modelos.`,
  kimi:               `${PROVIDER_DEFAULTS.kimi.apiKeyHint}.`,
  xai:                `${PROVIDER_DEFAULTS.xai.apiKeyHint}. Grok 4 e variantes fast/code.`,
  nvidia:             `${PROVIDER_DEFAULTS.nvidia.apiKeyHint}.`,
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

// Default model per provider, sourced from the @kova/agent catalog so the
// renderer stays in sync with provider-resolver.ts and the capability matcher.
export const DEFAULT_MODELS: Record<string, string> = {
  anthropic:  PROVIDER_DEFAULTS.anthropic.defaultModel,
  openai:     PROVIDER_DEFAULTS.openai.defaultModel,
  deepseek:   PROVIDER_DEFAULTS.deepseek.defaultModel,
  gemini:     PROVIDER_DEFAULTS.gemini.defaultModel,
  openrouter: PROVIDER_DEFAULTS.openrouter.defaultModel,
  kimi:       PROVIDER_DEFAULTS.kimi.defaultModel,
  xai:        PROVIDER_DEFAULTS.xai.defaultModel,
  nvidia:     PROVIDER_DEFAULTS.nvidia.defaultModel,
}

// Model IDs surfaced in the dropdown per provider — derived from the catalog.
// Users can still switch to "custom model" and paste any ID not listed here;
// the OpenAICompatibleProvider's capability detection covers brand-new releases
// via regex patterns in model-catalog.ts.
export const KNOWN_MODELS: Record<string, string[]> = Object.fromEntries(
  (Object.keys(MODEL_CATALOG) as ProviderId[])
    .filter(id => MODEL_CATALOG[id].length > 0)
    .map(id => [id, MODEL_CATALOG[id].map(m => m.id)])
)
