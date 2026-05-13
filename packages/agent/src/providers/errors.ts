export type ProviderErrorCode =
  | 'provider_rate_limited'
  | 'provider_unavailable'
  | 'provider_auth'
  | 'provider_model_not_found'
  | 'provider_unknown'

export interface NormalizedProviderError {
  code: ProviderErrorCode
  status?: number
  provider?: string
  model?: string
  safeMessage: string
  recoverable: boolean
}

export class KovaProviderError extends Error {
  readonly code: ProviderErrorCode
  readonly status?: number
  readonly provider?: string
  readonly model?: string
  readonly safeMessage: string
  readonly recoverable: boolean

  constructor(input: NormalizedProviderError & { cause?: unknown }) {
    super(input.safeMessage)
    this.name = 'KovaProviderError'
    this.code = input.code
    this.status = input.status
    this.provider = input.provider
    this.model = input.model
    this.safeMessage = input.safeMessage
    this.recoverable = input.recoverable
    if (input.cause) (this as Error & { cause?: unknown }).cause = input.cause
  }
}

export function normalizeProviderError(
  err: unknown,
  meta: { provider?: string; model?: string; status?: number } = {},
): KovaProviderError {
  if (err instanceof KovaProviderError) return err
  const raw = err instanceof Error ? err.message : String(err)
  const msg = raw.toLowerCase()
  const sdkStatus = err !== null && typeof err === 'object' && typeof (err as Record<string, unknown>).status === 'number'
    ? (err as Record<string, unknown>).status as number
    : undefined
  const status = meta.status ?? sdkStatus ?? statusFromMessage(msg)
  const isAbort = err instanceof Error && (err.name === 'AbortError' || msg.includes('aborted'))

  if (isAbort) {
    return build('provider_unknown', 'Operacao cancelada.', false, status, meta, err)
  }
  if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('api key')) {
    return build('provider_auth', 'API key invalida. Verifique nas configuracoes.', false, status, meta, err)
  }
  if (status === 429 || msg.includes('too many requests') || msg.includes('rate limit')) {
    return build('provider_rate_limited', 'Limite do provider atingido. Tente novamente depois ou troque de provider.', true, status, meta, err)
  }
  if (status === 404 && msg.includes('model')) {
    return build('provider_model_not_found', 'Modelo nao encontrado. Verifique o nome do modelo nas configuracoes.', true, status, meta, err)
  }
  if ((status && status >= 500) || msg.includes('fetch') || msg.includes('econnrefused') || msg.includes('network') || msg.includes('timeout')) {
    return build('provider_unavailable', 'Servidor LLM nao responde. Verifique se esta rodando.', true, status, meta, err)
  }
  return build('provider_unknown', raw, false, status, meta, err)
}

export function isRecoverableProviderError(err: unknown): boolean {
  return normalizeProviderError(err).recoverable
}

function build(
  code: ProviderErrorCode,
  safeMessage: string,
  recoverable: boolean,
  status: number | undefined,
  meta: { provider?: string; model?: string },
  cause: unknown,
): KovaProviderError {
  return new KovaProviderError({ code, status, provider: meta.provider, model: meta.model, safeMessage, recoverable, cause })
}

function statusFromMessage(msg: string): number | undefined {
  const match = /\b(4\d\d|5\d\d)\b/.exec(msg)
  return match ? Number(match[1]) : undefined
}
