import type { KovaSettings } from './types'

export interface ProviderDef {
  value: string
  label: string
  local: boolean
}

export const PROVIDERS: ProviderDef[] = [
  { value: 'lmstudio',          label: '⬡  LM Studio (local)',      local: true  },
  { value: 'ollama',            label: '◈  Ollama (local)',           local: true  },
  { value: 'anthropic',         label: '◆  Anthropic (Claude)',       local: false },
  { value: 'openai',            label: '◆  OpenAI',                   local: false },
  { value: 'deepseek',          label: '◆  DeepSeek',                 local: false },
  { value: 'gemini',            label: '◆  Google Gemini',            local: false },
  { value: 'openrouter',        label: '◆  OpenRouter',               local: false },
  { value: 'kimi',              label: '◆  Kimi (Moonshot)',          local: false },
  { value: 'openai-compatible', label: '⚙  OpenAI Compatible',        local: false },
]

export const HINTS: Record<string, string> = {
  lmstudio:   'Abra LM Studio → aba "Local Server" → carregue um modelo → Start Server.',
  ollama:     'Instale Ollama (ollama.ai) → rode: ollama pull qwen2.5-coder:7b',
  anthropic:  'Acesse console.anthropic.com → API Keys. Selecione o modelo no dropdown.',
  openai:     'Acesse platform.openai.com → API Keys. Selecione o modelo no dropdown.',
  deepseek:   'Acesse platform.deepseek.com → API Keys. Modelos: deepseek-v4-flash (rápido) · deepseek-v4-pro (melhor).',
  gemini:     'Acesse aistudio.google.com → Get API Key. Usa endpoint OpenAI-compatible do Google.',
  openrouter: 'Acesse openrouter.ai — créditos gratuitos. Suporta Claude, GPT, Gemini, Llama e +200 modelos.',
  kimi:       'Acesse platform.moonshot.ai → API Keys.',
  'openai-compatible': 'Qualquer API compatível com OpenAI: Groq, Together, Fireworks, LM Studio remoto. Informe URL e modelo.',
}

export const API_KEY_CONFIG: Record<string, { label: string; placeholder: string; key: keyof KovaSettings }> = {
  anthropic:          { label: 'Anthropic API Key',   placeholder: 'sk-ant-api03-...',  key: 'anthropicKey'        },
  openai:             { label: 'OpenAI API Key',       placeholder: 'sk-proj-...',       key: 'openaiKey'           },
  deepseek:           { label: 'DeepSeek API Key',     placeholder: 'sk-...',            key: 'deepseekKey'         },
  gemini:             { label: 'Google Gemini API Key', placeholder: 'AIza...',          key: 'geminiKey'           },
  openrouter:         { label: 'OpenRouter API Key',   placeholder: 'sk-or-v1-...',      key: 'openrouterKey'       },
  kimi:               { label: 'Kimi / Moonshot Key',  placeholder: 'sk-...',            key: 'kimiKey'             },
  'openai-compatible':{ label: 'API Key (opcional)',   placeholder: 'deixe vazio se não precisar', key: 'openaiCompatibleKey' },
}

export const DEFAULT_MODELS: Record<string, string> = {
  anthropic:  'claude-sonnet-4-6',
  openai:     'gpt-4.1',
  deepseek:   'deepseek-v4-flash',
  gemini:     'gemini-2.5-flash',
  openrouter: 'anthropic/claude-sonnet-4.5',
  kimi:       'kimi-k2.5',
}

// ─────────────────────────────────────────────────────────────────────────────
// Model list — verified up to knowledge cutoff (Aug 2025).
// For NEW or unlisted models: use "Modelo personalizado" and type the exact
// API ID from the provider's documentation (e.g. platform.openai.com/docs/models).
// Wrong model IDs cause 400 errors — always copy from official docs.
// ─────────────────────────────────────────────────────────────────────────────
export const KNOWN_MODELS: Record<string, string[]> = {
  anthropic: [
    // Latest — Aug 2025 (source: console.anthropic.com)
    'claude-opus-4-7',
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
    // Previous generation
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  openai: [
    // Latest — Aug 2025 (source: platform.openai.com/docs/models)
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'gpt-4o',
    'gpt-4o-mini',
    // Reasoning models
    'o3',
    'o3-mini',
    'o4-mini',
    'o1',
    'o1-mini',
  ],
  deepseek: [
    // Source: api-docs.deepseek.com
    'deepseek-v4-flash',
    'deepseek-v4-pro',
    'deepseek-chat',
    'deepseek-coder',
    'deepseek-r1',
    'deepseek-r1-distill-qwen-32b',
  ],
  gemini: [
    // Latest — Aug 2025 (source: ai.google.dev/gemini-api/docs/models)
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite-preview-06-17',
    'gemini-2.0-flash',
    'gemini-2.0-flash-thinking-exp-01-21',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ],
  openrouter: [
    // Source: openrouter.ai/models (shows 200+ models — most popular listed)
    'anthropic/claude-opus-4',
    'anthropic/claude-sonnet-4.5',
    'openai/gpt-4.1',
    'openai/gpt-4o',
    'openai/o3-mini',
    'google/gemini-2.5-pro-preview',
    'google/gemini-2.5-flash-preview-05-20',
    'deepseek/deepseek-v4-flash',
    'deepseek/deepseek-r1',
    'meta-llama/llama-3.3-70b-instruct',
    'mistralai/mistral-large-2407',
    'qwen/qwen2.5-72b-instruct',
    'x-ai/grok-2',
  ],
  kimi: [
    'kimi-k2.5',
    'moonshot-v1-8k',
    'moonshot-v1-32k',
    'moonshot-v1-128k',
  ],
}
