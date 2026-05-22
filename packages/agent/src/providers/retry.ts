import { KovaProviderError, normalizeProviderError, type ProviderErrorCode } from './errors'

export interface ProviderRetryPolicy {
  /**
   * Includes the first attempt. A value of 3 means initial call + 2 retries.
   */
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  jitterRatio: number
}

export type ProviderRetryPolicyInput = Partial<ProviderRetryPolicy>

export interface ProviderRetryEvent {
  attempt: number
  nextAttempt: number
  maxAttempts: number
  delayMs: number
  code: ProviderErrorCode
  status?: number
  provider?: string
  model?: string
  safeMessage: string
}

export interface ProviderRetryContext {
  provider?: string
  model?: string
  signal?: AbortSignal
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>
  onRetry?: (event: ProviderRetryEvent) => void
}

const DEFAULT_PROVIDER_RETRY_POLICY: ProviderRetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  jitterRatio: 0.15,
}

export async function withProviderRetry<T>(
  operation: () => Promise<T>,
  context: ProviderRetryContext = {},
  inputPolicy: ProviderRetryPolicyInput = {},
): Promise<T> {
  const policy = resolveProviderRetryPolicy(inputPolicy)
  const sleep = context.sleep ?? sleepWithAbort
  let attempt = 1

  while (true) {
    throwIfAborted(context.signal)

    try {
      return await operation()
    } catch (err) {
      const normalized = normalizeProviderError(err, {
        provider: context.provider,
        model: context.model,
      })

      if (!normalized.recoverable || attempt >= policy.maxAttempts) {
        throw normalized
      }

      const delayMs = computeProviderRetryDelay(err, attempt, policy)
      context.onRetry?.({
        attempt,
        nextAttempt: attempt + 1,
        maxAttempts: policy.maxAttempts,
        delayMs,
        code: normalized.code,
        status: normalized.status,
        provider: normalized.provider,
        model: normalized.model,
        safeMessage: normalized.safeMessage,
      })

      try {
        await sleep(delayMs, context.signal)
      } catch (sleepErr) {
        throw normalizeProviderError(sleepErr, {
          provider: context.provider,
          model: context.model,
        })
      }
      attempt += 1
    }
  }
}

export function computeProviderRetryDelay(
  err: unknown,
  attempt: number,
  policy: ProviderRetryPolicy = DEFAULT_PROVIDER_RETRY_POLICY,
): number {
  const retryAfterMs = extractRetryAfterMs(err)
  if (retryAfterMs !== null) return Math.min(retryAfterMs, policy.maxDelayMs)

  const exponentialMs = policy.baseDelayMs * 2 ** Math.max(0, attempt - 1)
  const cappedMs = Math.min(exponentialMs, policy.maxDelayMs)
  if (policy.jitterRatio <= 0 || cappedMs <= 0) return cappedMs

  const jitterMs = cappedMs * policy.jitterRatio * Math.random()
  return Math.min(policy.maxDelayMs, Math.round(cappedMs + jitterMs))
}

export function parseRetryAfterMs(value: unknown, nowMs = Date.now()): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value * 1000))
  }
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const seconds = Number(trimmed)
  if (Number.isFinite(seconds)) return Math.max(0, Math.round(seconds * 1000))

  const dateMs = Date.parse(trimmed)
  if (Number.isNaN(dateMs)) return null
  return Math.max(0, dateMs - nowMs)
}

export function resolveProviderRetryPolicy(input: ProviderRetryPolicyInput = {}): ProviderRetryPolicy {
  const maxAttempts = input.maxAttempts ?? DEFAULT_PROVIDER_RETRY_POLICY.maxAttempts
  const baseDelayMs = input.baseDelayMs ?? DEFAULT_PROVIDER_RETRY_POLICY.baseDelayMs
  const maxDelayMs = input.maxDelayMs ?? DEFAULT_PROVIDER_RETRY_POLICY.maxDelayMs
  const jitterRatio = input.jitterRatio ?? DEFAULT_PROVIDER_RETRY_POLICY.jitterRatio
  return {
    maxAttempts: Math.max(1, Math.floor(maxAttempts)),
    baseDelayMs: Math.max(0, Math.floor(baseDelayMs)),
    maxDelayMs: Math.max(0, Math.floor(maxDelayMs)),
    jitterRatio: Math.max(0, jitterRatio),
  }
}

export function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    throwIfAborted(signal)
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener('abort', abort)
    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, ms)
    const abort = () => {
      clearTimeout(timer)
      cleanup()
      reject(toAbortError(signal?.reason))
    }

    if (signal?.aborted) {
      abort()
      return
    }
    signal?.addEventListener('abort', abort, { once: true })
  })
}

export function makeNonRetryableProviderError(
  err: unknown,
  safeMessage?: string,
  meta: { provider?: string; model?: string } = {},
): KovaProviderError {
  const normalized = normalizeProviderError(err, meta)
  return new KovaProviderError({
    code: normalized.code,
    status: normalized.status,
    provider: normalized.provider,
    model: normalized.model,
    safeMessage: safeMessage ?? normalized.safeMessage,
    recoverable: false,
    cause: err,
  })
}

function extractRetryAfterMs(err: unknown): number | null {
  const record = asRecord(err)
  if (!record) return null

  const directMs = readNumber(record.retryAfterMs)
  if (directMs !== null) return Math.max(0, Math.round(directMs))

  const directHeader = parseRetryAfterMs(record.retryAfter)
  if (directHeader !== null) return directHeader

  const headersValue = readHeader(record.headers, 'retry-after')
  const headersDelay = parseRetryAfterMs(headersValue)
  if (headersDelay !== null) return headersDelay

  const responseRecord = asRecord(record.response)
  const responseHeadersValue = readHeader(responseRecord?.headers, 'retry-after')
  return parseRetryAfterMs(responseHeadersValue)
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null
}

function readHeader(headers: unknown, name: string): unknown {
  const record = asRecord(headers)
  if (!record) return null

  const get = record.get
  if (typeof get === 'function') {
    return (get as (headerName: string) => unknown).call(headers, name)
  }

  return record[name] ?? record[name.toLowerCase()] ?? record[name.toUpperCase()]
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  throw toAbortError(signal.reason)
}

function toAbortError(reason: unknown): Error {
  if (reason instanceof Error) return reason
  const error = new Error('Operation cancelled.')
  error.name = 'AbortError'
  return error
}
