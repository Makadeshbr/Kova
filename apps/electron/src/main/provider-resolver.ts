/**
 * Provider resolution — converts user-facing settings (provider name, API key, base URL,
 * model) into a ready-to-use AgentProvider. Handles auto-detection of local models and
 * fallback to a secondary provider when the primary fails with a recoverable error.
 *
 * Extracted from engine-manager.ts so provider concerns can be tested and changed in
 * isolation from session orchestration.
 */
import { AnthropicProvider, OpenAICompatibleProvider, isRecoverableProviderError } from '@kova/agent'
import type { AgentProvider } from '@kova/agent'
import type { StartTaskParams } from './engine-manager'
import { getSettingsInternal } from './ipc-handlers'

export const PRESET_URLS: Record<string, string> = {
  openai:     'https://api.openai.com/v1',
  deepseek:   'https://api.deepseek.com',
  openrouter: 'https://openrouter.ai/api/v1',
  kimi:       'https://api.moonshot.ai/v1',
  gemini:     'https://generativelanguage.googleapis.com/v1beta/openai',
  nvidia:     process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1',
  ollama:     process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
  lmstudio:   'http://localhost:1234/v1',
}

export const LOCAL_PROVIDERS = new Set(['ollama', 'lmstudio', 'openai-compatible'])

export const PRESET_MODELS: Record<string, string> = {
  openai: 'gpt-4.1', deepseek: 'deepseek-v4-flash',
  kimi: 'kimi-k2.5', gemini: 'gemini-2.5-flash',
  openrouter: 'anthropic/claude-sonnet-4.5',
  nvidia: 'moonshotai/kimi-k2.6',
}

export const INVALID_MODEL_VALUES = new Set([
  'deepseek', 'DeepSeek', 'openai', 'OpenAI', 'anthropic', 'Anthropic',
  'gemini', 'Gemini', 'kimi', 'Kimi', 'ollama', 'Ollama',
  'openrouter', 'OpenRouter', 'default', 'modelo', 'model', '',
])

export interface ProviderResolution {
  provider: AgentProvider
  resolvedProvider: string
  resolvedModel?: string
  fallback: boolean
  fallbackReason?: string
}

export type ProviderFactory = (
  params: StartTaskParams,
  onModelDetected?: (model: string) => void,
) => Promise<ProviderResolution | null>

export async function autoResolveModel(
  baseUrl: string, configured?: string, onDetected?: (model: string) => void,
): Promise<string | undefined> {
  if (configured) return configured
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return undefined
    const data = await res.json() as { data?: Array<{ id: string }> }
    const first = data.data?.[0]?.id
    if (first) onDetected?.(first)
    return first
  } catch { return undefined }
}

export async function buildProvider(
  params: StartTaskParams, onModelDetected?: (model: string) => void,
): Promise<ProviderResolution | null> {
  const providerName = params.provider ?? 'anthropic'
  const requestedModel = params.model?.trim() || undefined
  let apiKey = params.apiKey ?? ''
  let extraBody: Record<string, unknown> | undefined = undefined

  if (providerName === 'nvidia') {
    const settings = getSettingsInternal()
    apiKey = process.env.NVIDIA_API_KEY || settings.nvidiaKey || ''
    if (!apiKey) throw new Error('NVIDIA_API_KEY ausente. Configure via .env ou nas configurações.')
    if (settings.nvidiaEnableThinking !== false) {
      extraBody = { chat_template_kwargs: { thinking: true } }
    }
  }

  if (providerName === 'anthropic') {
    if (!apiKey) return null
    return {
      provider: new AnthropicProvider({ apiKey, model: requestedModel }),
      resolvedProvider: 'anthropic',
      resolvedModel: requestedModel,
      fallback: false,
    }
  }

  const baseUrl = params.baseUrl ?? PRESET_URLS[providerName] ?? ''
  if (!baseUrl) return null
  if (!apiKey && !LOCAL_PROVIDERS.has(providerName)) return null

  const presetFallback = PRESET_MODELS[providerName] ?? ''
  const safeConfigured = requestedModel && !INVALID_MODEL_VALUES.has(requestedModel) ? requestedModel : undefined
  const resolved = await autoResolveModel(baseUrl, safeConfigured, onModelDetected)
  const model = resolved || presetFallback
  if (!model) return null
  if (resolved && onModelDetected) onModelDetected(model)

  const usedFallback = !safeConfigured && !resolved && !!presetFallback
  return {
    provider: new OpenAICompatibleProvider({ apiKey: apiKey || providerName, baseUrl, model, extraBody }),
    resolvedProvider: providerName,
    resolvedModel: model,
    fallback: usedFallback || (!!safeConfigured && resolved !== safeConfigured),
    fallbackReason: usedFallback
      ? `Modelo nao detectado em ${baseUrl}; usando preset "${presetFallback}"`
      : (safeConfigured && resolved !== safeConfigured)
        ? `Modelo "${safeConfigured}" nao encontrado; usando "${resolved}"`
        : undefined,
  }
}

export interface FallbackContext {
  /** The original task params used by the primary provider. */
  params: StartTaskParams
  /** The error thrown by the primary provider (or a synthetic one when primary returned null). */
  primaryError: unknown
  /** Factory used to instantiate the fallback provider — typically the injected providerFactory. */
  factory: ProviderFactory
  /** Returns true if the current session has been aborted (skip fallback in that case). */
  isAborted: () => boolean
  /** Forwarded to the fallback provider for live model-detection callbacks. */
  onModelDetected?: (model: string) => void
}

/**
 * Attempts to resolve a secondary provider when the primary fails or is missing.
 * Only fires when settings have fallbackProvider configured AND the primary failure is recoverable.
 * Returns null when no fallback is configured, the fallback itself fails, or the session was aborted.
 */
export async function tryFallbackProvider(ctx: FallbackContext): Promise<ProviderResolution | null> {
  let settings: ReturnType<typeof getSettingsInternal>
  try {
    settings = getSettingsInternal()
  } catch {
    // Settings unavailable (e.g., in tests without Electron app initialized)
    return null
  }
  const fallbackProvider = settings.fallbackProvider?.trim()
  if (!fallbackProvider || fallbackProvider === ctx.params.provider) return null
  if (ctx.isAborted()) return null
  if (!isRecoverableProviderError(ctx.primaryError)) return null

  const fallbackApiKey = resolveFallbackApiKey(fallbackProvider, settings)

  const fallbackParams: StartTaskParams = {
    ...ctx.params,
    provider: fallbackProvider,
    apiKey: fallbackApiKey || undefined,
    model: settings.fallbackModel?.trim() || undefined,
  }

  try {
    const result = await ctx.factory(fallbackParams, ctx.onModelDetected)
    if (!result) return null
    const reason = ctx.primaryError instanceof Error ? ctx.primaryError.message : String(ctx.primaryError)
    return {
      ...result,
      fallback: true,
      fallbackReason: `Primary provider "${ctx.params.provider ?? 'anthropic'}" failed (${reason.slice(0, 80)}); switched to "${fallbackProvider}"`,
    }
  } catch {
    return null
  }
}

function resolveFallbackApiKey(
  fallbackProvider: string,
  settings: ReturnType<typeof getSettingsInternal>,
): string {
  return fallbackProvider === 'anthropic' ? settings.anthropicKey
    : fallbackProvider === 'openai' ? settings.openaiKey
    : fallbackProvider === 'deepseek' ? settings.deepseekKey
    : fallbackProvider === 'openrouter' ? settings.openrouterKey
    : fallbackProvider === 'kimi' ? settings.kimiKey
    : fallbackProvider === 'gemini' ? settings.geminiKey
    : fallbackProvider === 'openai-compatible' ? settings.openaiCompatibleKey
    : ''
}
