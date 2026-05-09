import type { KovaProviderName } from './config'

export interface ProviderCatalogEntry {
  id: KovaProviderName | 'onauth'
  label: string
  kind: 'oauth' | 'api-key' | 'local'
  defaultModel?: string
  baseUrl?: string
  envKey?: string
  models: string[]
}

export const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    id: 'onauth',
    label: 'OnAuth / Kova Gateway',
    kind: 'oauth',
    defaultModel: 'gpt-4.1',
    models: ['gpt-4.1', 'gpt-4.1-mini'],
  },
  {
    id: 'ollama',
    label: 'Ollama local',
    kind: 'local',
    defaultModel: 'qwen2.5-coder:7b',
    baseUrl: 'http://localhost:11434/v1',
    models: ['qwen2.5-coder:7b', 'llama3.1:8b', 'codellama:7b'],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    kind: 'api-key',
    defaultModel: 'gpt-4.1',
    baseUrl: 'https://api.openai.com/v1',
    envKey: 'OPENAI_API_KEY',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o'],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    kind: 'api-key',
    defaultModel: 'claude-sonnet-4-6',
    envKey: 'ANTHROPIC_API_KEY',
    models: ['claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    kind: 'api-key',
    defaultModel: 'anthropic/claude-sonnet-4.5',
    baseUrl: 'https://openrouter.ai/api/v1',
    envKey: 'OPENROUTER_API_KEY',
    models: ['anthropic/claude-sonnet-4.5', 'openai/gpt-4.1', 'deepseek/deepseek-chat-v3.1'],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    kind: 'api-key',
    defaultModel: 'deepseek-v4-flash',
    baseUrl: 'https://api.deepseek.com',
    envKey: 'DEEPSEEK_API_KEY',
    models: ['deepseek-v4-flash', 'deepseek-chat'],
  },
  {
    id: 'kimi',
    label: 'Kimi / Moonshot',
    kind: 'api-key',
    defaultModel: 'kimi-k2.5',
    baseUrl: 'https://api.moonshot.ai/v1',
    envKey: 'KIMI_API_KEY',
    models: ['kimi-k2.5'],
  },
  {
    id: 'openai-compatible',
    label: 'Other OpenAI-compatible',
    kind: 'api-key',
    defaultModel: 'gpt-4.1',
    models: ['gpt-4.1'],
  },
]

export function catalogEntry(id: string): ProviderCatalogEntry | undefined {
  return PROVIDER_CATALOG.find(entry => entry.id === id)
}
