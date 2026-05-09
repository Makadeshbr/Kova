import { configuredLlm, type KovaProviderName } from './config'
import { readAuthSession } from './auth/session'
import { readCredential } from './credentials'
import { catalogEntry } from './provider-catalog'

export interface ResolvedLlmSettings {
  provider?: KovaProviderName
  model?: string
  baseUrl?: string
  apiKey?: string
  source: 'config' | 'env' | 'onauth' | 'none'
}

export function resolveLlmSettings(): ResolvedLlmSettings {
  const configured = configuredLlm()
  if (configured.provider) {
    const credential = readCredential(configured.provider)
    const entry = catalogEntry(configured.provider)
    return {
      provider: runnerProvider(configured.provider),
      model: configured.model ?? entry?.defaultModel,
      baseUrl: configured.baseUrl ?? credential?.baseUrl ?? entry?.baseUrl,
      apiKey: credential?.apiKey,
      source: 'config',
    }
  }

  const session = readAuthSession()
  if (session && !isExpired(session.expiresAt)) {
    return {
      provider: 'openai-compatible',
      model: process.env.KOVA_LLM_MODEL ?? session.model ?? 'gpt-4.1',
      baseUrl: process.env.KOVA_ONAUTH_LLM_BASE_URL ?? session.baseUrl,
      apiKey: session.accessToken,
      source: 'onauth',
    }
  }

  if (process.env.ANTHROPIC_API_KEY) return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6', source: 'env' }
  if (process.env.OPENAI_API_KEY) return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4.1', baseUrl: 'https://api.openai.com/v1', source: 'env' }
  if (process.env.OPENROUTER_API_KEY) return { provider: 'openrouter', apiKey: process.env.OPENROUTER_API_KEY, model: 'anthropic/claude-sonnet-4.5', baseUrl: 'https://openrouter.ai/api/v1', source: 'env' }
  if (process.env.DEEPSEEK_API_KEY) return { provider: 'deepseek', apiKey: process.env.DEEPSEEK_API_KEY, model: 'deepseek-v4-flash', baseUrl: 'https://api.deepseek.com', source: 'env' }
  if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) return { provider: 'kimi', apiKey: process.env.KIMI_API_KEY ?? process.env.MOONSHOT_API_KEY, model: 'kimi-k2.5', baseUrl: 'https://api.moonshot.ai/v1', source: 'env' }
  if (process.env.OLLAMA_BASE_URL) return { provider: 'ollama', apiKey: process.env.OLLAMA_API_KEY ?? 'ollama', model: 'qwen2.5-coder:7b', baseUrl: process.env.OLLAMA_BASE_URL, source: 'env' }
  return { source: 'none' }
}

function runnerProvider(provider: KovaProviderName): KovaProviderName {
  return provider
}

function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false
  const time = Date.parse(expiresAt)
  return Number.isNaN(time) || time <= Date.now() + 30_000
}
