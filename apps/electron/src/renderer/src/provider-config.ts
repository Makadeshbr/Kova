import type { KovaSettings } from './types'

export interface ProviderDef {
  value: string
  label: string
  description: string
  local: boolean
}

export const PROVIDERS: ProviderDef[] = [
  { value: 'lmstudio', label: 'LM Studio', description: 'Local OpenAI-compatible server', local: true },
  { value: 'ollama', label: 'Ollama', description: 'Local Ollama server', local: true },
  { value: 'anthropic', label: 'Anthropic Claude', description: 'Claude API models', local: false },
  { value: 'openai', label: 'OpenAI', description: 'OpenAI API models', local: false },
  { value: 'deepseek', label: 'DeepSeek', description: 'DeepSeek API models', local: false },
  { value: 'gemini', label: 'Google Gemini', description: 'Gemini OpenAI-compatible endpoint', local: false },
  { value: 'openrouter', label: 'OpenRouter', description: 'Router for Claude, GPT, Gemini and OSS models', local: false },
  { value: 'kimi', label: 'Kimi Moonshot', description: 'Moonshot Kimi models', local: false },
  { value: 'nvidia', label: 'NVIDIA Kimi K2.6', description: 'NVIDIA hosted Kimi endpoint', local: false },
  { value: 'openai-compatible', label: 'OpenAI Compatible', description: 'Custom compatible endpoint', local: false },
]

export const HINTS: Record<string, string> = {
  lmstudio: 'Abra LM Studio > Local Server > carregue um modelo > Start Server.',
  ollama: 'Instale Ollama (ollama.ai) e rode: ollama pull qwen2.5-coder:7b',
  anthropic: 'Acesse console.anthropic.com > API Keys. Selecione o modelo no dropdown.',
  openai: 'Acesse platform.openai.com > API Keys. Selecione o modelo no dropdown.',
  deepseek: 'Acesse platform.deepseek.com > API Keys. Modelos: deepseek-v4-flash ou deepseek-v4-pro.',
  gemini: 'Acesse aistudio.google.com > Get API Key. Usa endpoint OpenAI-compatible do Google.',
  openrouter: 'Acesse openrouter.ai. Suporta Claude, GPT, Gemini, Llama e outros modelos.',
  kimi: 'Acesse platform.moonshot.ai > API Keys.',
  nvidia: 'Acesse build.nvidia.com > Moonshot Kimi K2.6 > Get API Key.',
  'openai-compatible': 'Qualquer API compativel com OpenAI: Groq, Together, Fireworks, LM Studio remoto. Informe URL e modelo.',
}

export const API_KEY_CONFIG: Record<string, { label: string; placeholder: string; key: keyof KovaSettings }> = {
  anthropic: { label: 'Anthropic API Key', placeholder: 'sk-ant-api03-...', key: 'anthropicKey' },
  openai: { label: 'OpenAI API Key', placeholder: 'sk-proj-...', key: 'openaiKey' },
  deepseek: { label: 'DeepSeek API Key', placeholder: 'sk-...', key: 'deepseekKey' },
  gemini: { label: 'Google Gemini API Key', placeholder: 'AIza...', key: 'geminiKey' },
  openrouter: { label: 'OpenRouter API Key', placeholder: 'sk-or-v1-...', key: 'openrouterKey' },
  kimi: { label: 'Kimi / Moonshot Key', placeholder: 'sk-...', key: 'kimiKey' },
  nvidia: { label: 'NVIDIA API Key', placeholder: 'nvapi-...', key: 'nvidiaKey' },
  'openai-compatible': { label: 'API Key (opcional)', placeholder: 'deixe vazio se nao precisar', key: 'openaiCompatibleKey' },
}

export const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4.1',
  deepseek: 'deepseek-v4-flash',
  gemini: 'gemini-2.5-flash',
  openrouter: 'anthropic/claude-sonnet-4.5',
  kimi: 'kimi-k2.5',
  nvidia: 'moonshotai/kimi-k2.6',
}

// Model IDs from the current local provider snapshot. For unlisted models,
// switch to custom model and paste the exact API ID from the provider docs.
export const KNOWN_MODELS: Record<string, string[]> = {
  anthropic: [
    'claude-opus-4-7',
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  openai: [
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'gpt-4o',
    'gpt-4o-mini',
    'o3',
    'o3-mini',
    'o4-mini',
    'o1',
    'o1-mini',
  ],
  deepseek: [
    'deepseek-v4-flash',
    'deepseek-v4-pro',
    'deepseek-chat',
    'deepseek-coder',
    'deepseek-r1',
    'deepseek-r1-distill-qwen-32b',
  ],
  gemini: [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite-preview-06-17',
    'gemini-2.0-flash',
    'gemini-2.0-flash-thinking-exp-01-21',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ],
  openrouter: [
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
  nvidia: [
    'moonshotai/kimi-k2.6',
  ],
}
