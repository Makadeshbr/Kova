import { AnthropicProvider, OpenAICompatibleProvider } from '@kova/agent'
import type { LLMProvider, AgentProvider } from '@kova/agent'
import { readKovaAuthSession } from './auth-session'

export type KovaLLMProviderName =
  | 'anthropic'
  | 'openai'
  | 'deepseek'
  | 'kimi'
  | 'ollama'
  | 'openrouter'
  | 'openai-compatible'

export interface ProviderConfig {
  provider?: KovaLLMProviderName
  model?: string
  baseUrl?: string
  apiKey?: string
}

export interface ProviderPair {
  taskProvider: LLMProvider
  codeProvider: AgentProvider
  description: string
}

const PROVIDERS: KovaLLMProviderName[] = ['anthropic', 'openai', 'deepseek', 'kimi', 'ollama', 'openrouter', 'openai-compatible']

export function createProviderPair(request: ProviderConfig = {}): ProviderPair | null {
  const config = resolveProviderConfig(request)
  if (!config) return null
  if (config.provider === 'anthropic') {
    return {
      taskProvider: new AnthropicProvider({ apiKey: config.apiKey, model: config.model }),
      codeProvider: new AnthropicProvider({ apiKey: config.apiKey, model: config.model }),
      description: `anthropic:${config.model ?? 'default'}`,
    }
  }
  return createCompatiblePair(config)
}

export function missingProviderReason(): string {
  return [
    'No LLM provider configured.',
    'Rode kova connect para configurar um provider, kova login para OnAuth/OAuth, ou configure uma API key.',
    'Defina KOVA_LLM_PROVIDER com anthropic, openai, deepseek, kimi, openai-compatible ou ollama.',
    'Para modo gratuito local use KOVA_LLM_PROVIDER=ollama e Ollama em http://localhost:11434/v1.',
  ].join(' ')
}

function createCompatiblePair(config: Required<ProviderConfig>): ProviderPair {
  return {
    taskProvider: new OpenAICompatibleProvider(config),
    codeProvider: new OpenAICompatibleProvider(config),
    description: `${config.provider}:${config.model}`,
  }
}

function resolveProviderConfig(request: ProviderConfig): Required<ProviderConfig> | null {
  const provider = pickProvider(request.provider)
  if (!provider) return null
  const preset = presetFor(provider)
  const apiKey = request.apiKey ?? process.env.KOVA_LLM_API_KEY ?? preset.apiKey
  if (!apiKey && provider !== 'ollama') return null
  const baseUrl = request.baseUrl ?? process.env.KOVA_LLM_BASE_URL ?? preset.baseUrl
  if (!baseUrl && provider !== 'anthropic') return null
  return {
    provider,
    apiKey: apiKey ?? 'ollama',
    model: request.model ?? process.env.KOVA_LLM_MODEL ?? preset.model,
    baseUrl,
  }
}

function pickProvider(requested?: KovaLLMProviderName): KovaLLMProviderName | null {
  const envProvider = asProvider(process.env.KOVA_LLM_PROVIDER)
  if (requested && PROVIDERS.includes(requested)) return requested
  if (envProvider) return envProvider
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek'
  if (process.env.OPENROUTER_API_KEY) return 'openrouter'
  if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) return 'kimi'
  if (process.env.OLLAMA_BASE_URL) return 'ollama'
  if (readKovaAuthSession()) return 'openai-compatible'
  return null
}

function asProvider(value?: string): KovaLLMProviderName | null {
  return PROVIDERS.includes(value as KovaLLMProviderName) ? value as KovaLLMProviderName : null
}

function presetFor(provider: KovaLLMProviderName): Required<Omit<ProviderConfig, 'provider'>> {
  const session = readKovaAuthSession()
  if (provider === 'anthropic') return envPreset('ANTHROPIC_API_KEY', '', 'claude-sonnet-4-6')
  if (provider === 'openai') return envPreset('OPENAI_API_KEY', 'https://api.openai.com/v1', 'gpt-4.1')
  if (provider === 'deepseek') return envPreset('DEEPSEEK_API_KEY', 'https://api.deepseek.com', 'deepseek-v4-flash')
  if (provider === 'openrouter') return envPreset('OPENROUTER_API_KEY', 'https://openrouter.ai/api/v1', 'anthropic/claude-sonnet-4.5')
  if (provider === 'kimi') return kimiPreset()
  if (provider === 'ollama') return envPreset('OLLAMA_API_KEY', process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1', 'qwen2.5-coder:7b')
  if (session && !process.env.OPENAI_COMPATIBLE_API_KEY) {
    return {
      apiKey: session.accessToken,
      baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL ?? process.env.KOVA_ONAUTH_LLM_BASE_URL ?? session.baseUrl ?? '',
      model: process.env.KOVA_LLM_MODEL ?? session.model ?? 'gpt-4.1',
    }
  }
  return envPreset('OPENAI_COMPATIBLE_API_KEY', process.env.OPENAI_COMPATIBLE_BASE_URL ?? '', 'gpt-4.1')
}

function kimiPreset(): Required<Omit<ProviderConfig, 'provider'>> {
  return {
    apiKey: process.env.KIMI_API_KEY ?? process.env.MOONSHOT_API_KEY ?? '',
    baseUrl: 'https://api.moonshot.ai/v1',
    model: 'kimi-k2.5',
  }
}

function envPreset(apiKeyName: string, baseUrl: string, model: string): Required<Omit<ProviderConfig, 'provider'>> {
  return { apiKey: process.env[apiKeyName] ?? '', baseUrl, model }
}
