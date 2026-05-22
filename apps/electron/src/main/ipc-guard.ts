export interface IpcGuardPolicy {
  capacity: number
  refillPerSecond: number
  timeoutMs: number
}

export interface IpcGuardLogEvent {
  channel: string
  reason: 'rate_limit' | 'timeout'
  timeoutMs?: number
}

export interface IpcGuardLogger {
  warn(event: IpcGuardLogEvent): void
}

export interface IpcGuardOptions {
  now?: () => number
  logger?: IpcGuardLogger
}

export interface IpcGuardRunOptions {
  timeoutMs?: number
  onTimeout?: () => void
}

interface RateBucket {
  tokens: number
  updatedAt: number
}

export const DEFAULT_IPC_GUARD_POLICIES = {
  'kova:open-folder': { capacity: 4, refillPerSecond: 0.2, timeoutMs: 0 },
  'kova:send-message': { capacity: 4, refillPerSecond: 0.25, timeoutMs: 30 * 60_000 },
  'kova:detect-model': { capacity: 12, refillPerSecond: 1, timeoutMs: 8_000 },
  'kova:pause': { capacity: 60, refillPerSecond: 10, timeoutMs: 1_000 },
  'kova:abort': { capacity: 30, refillPerSecond: 5, timeoutMs: 5_000 },
  'kova:force-apply': { capacity: 6, refillPerSecond: 0.5, timeoutMs: 30_000 },
  'kova:get-state': { capacity: 120, refillPerSecond: 30, timeoutMs: 1_000 },
  'kova:get-settings': { capacity: 30, refillPerSecond: 5, timeoutMs: 3_000 },
  'kova:save-settings': { capacity: 12, refillPerSecond: 1, timeoutMs: 3_000 },
  'kova:read-file': { capacity: 60, refillPerSecond: 10, timeoutMs: 5_000 },
  'kova:write-file': { capacity: 20, refillPerSecond: 2, timeoutMs: 10_000 },
  'kova:list-dir': { capacity: 80, refillPerSecond: 12, timeoutMs: 5_000 },
  'kova:watch-project': { capacity: 12, refillPerSecond: 1, timeoutMs: 5_000 },
  'kova:unwatch-project': { capacity: 30, refillPerSecond: 5, timeoutMs: 3_000 },
  'kova:terminal-open': { capacity: 8, refillPerSecond: 0.5, timeoutMs: 5_000 },
  'kova:terminal-input': { capacity: 120, refillPerSecond: 30, timeoutMs: 5_000 },
  'kova:terminal-resize': { capacity: 60, refillPerSecond: 10, timeoutMs: 5_000 },
  'kova:terminal-kill': { capacity: 30, refillPerSecond: 5, timeoutMs: 3_000 },
  'kova:terminal-approve': { capacity: 30, refillPerSecond: 5, timeoutMs: 3_000 },
  'kova:list-sessions': { capacity: 60, refillPerSecond: 10, timeoutMs: 3_000 },
  'kova:save-session': { capacity: 20, refillPerSecond: 2, timeoutMs: 3_000 },
  'kova:delete-session': { capacity: 20, refillPerSecond: 2, timeoutMs: 3_000 },
  'kova:get-pending-learnings': { capacity: 20, refillPerSecond: 2, timeoutMs: 5_000 },
  'kova:get-contradicted-learnings': { capacity: 20, refillPerSecond: 2, timeoutMs: 5_000 },
  'kova:get-invalidated-learnings': { capacity: 20, refillPerSecond: 2, timeoutMs: 5_000 },
} as const satisfies Record<string, IpcGuardPolicy>

export type GuardedIpcChannel = keyof typeof DEFAULT_IPC_GUARD_POLICIES

export class IpcGuard {
  private readonly buckets = new Map<string, RateBucket>()
  private readonly now: () => number
  private readonly logger?: IpcGuardLogger

  constructor(
    private readonly policies: Record<string, IpcGuardPolicy>,
    options: IpcGuardOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now())
    this.logger = options.logger
  }

  async run<T>(
    channel: string,
    operation: () => Promise<T> | T,
    options: IpcGuardRunOptions = {},
  ): Promise<T> {
    const policy = this.policies[channel]
    if (!policy) throw new Error(`Missing IPC guard policy for ${channel}`)

    this.consumeToken(channel, policy)
    const timeoutMs = options.timeoutMs ?? policy.timeoutMs
    if (timeoutMs <= 0) return operation()

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        this.logger?.warn({ channel, reason: 'timeout', timeoutMs })
        options.onTimeout?.()
        reject(new Error(`IPC handler timed out for ${channel} after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    try {
      return await Promise.race([Promise.resolve().then(operation), timeoutPromise])
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  private consumeToken(channel: string, policy: IpcGuardPolicy): void {
    const now = this.now()
    const bucket = this.buckets.get(channel) ?? { tokens: policy.capacity, updatedAt: now }
    const elapsed = Math.max(0, now - bucket.updatedAt) / 1000
    bucket.tokens = Math.min(policy.capacity, bucket.tokens + elapsed * policy.refillPerSecond)
    bucket.updatedAt = now

    if (bucket.tokens < 1) {
      this.buckets.set(channel, bucket)
      this.logger?.warn({ channel, reason: 'rate_limit' })
      throw new Error(`Rate limit exceeded for ${channel}`)
    }

    bucket.tokens -= 1
    this.buckets.set(channel, bucket)
  }
}

export function createDefaultIpcGuard(options?: IpcGuardOptions): IpcGuard {
  return new IpcGuard(DEFAULT_IPC_GUARD_POLICIES, options)
}
