import React from 'react'
import type { ExecutionEvent, ExecutionState } from '../types'
import type { SessionUsage } from '../App'
import { contextualStatusLabel } from '../lib/status-context'

interface Props {
  executionState: ExecutionState | null
  sessionUsage: SessionUsage
  /** Live event stream — used to build the contextual status label. Optional so
   * existing call sites that don't pass it fall back to plain status text. */
  events?: ExecutionEvent[]
}

const STATUS_COLOR: Record<string, string> = {
  structuring: 'var(--amber)', planning: 'var(--amber)', coding: 'var(--amber)',
  validating: 'var(--yellow)', deciding: 'var(--yellow)',
  applying: 'var(--teal)', completed: 'var(--teal)',
  repairing: 'var(--amber)',
  awaiting_approval: 'var(--yellow)',
  server_starting: 'var(--cyan)',
  server_ready: 'var(--teal)',
  blocked: 'var(--red)',
  failed: 'var(--red)', paused: 'var(--text-3)',
}

export function StatusBar({ executionState, sessionUsage, events }: Props): React.ReactElement {
  const status = executionState?.status ?? null
  const last = executionState?.iterationHistory?.at(-1) ?? null
  const pendingChanges = status === 'paused' ? (last?.changes.length ?? 0) : 0
  const isActive = !!status && !['completed', 'failed', 'paused'].includes(status)
  const liveLabel = isActive && events && events.length > 0
    ? contextualStatusLabel(status, events)
    : null
  const server = events ? [...events].reverse().find(event => event.serverSession)?.serverSession : null
  const tokens = Math.max(executionState?.totalTokens ?? 0, sessionUsage.contextTokens + sessionUsage.completionTokens)
  const contextPercent = sessionUsage.maxContextTokens
    ? Math.min(100, Math.round((sessionUsage.contextTokens / sessionUsage.maxContextTokens) * 100))
    : null
  const cacheTokens = sessionUsage.cacheReadInputTokens

  const tokenLabel = tokens >= 1_000_000
    ? `${(tokens / 1_000_000).toFixed(1)}M tokens`
    : tokens > 0
      ? `${(tokens / 1_000).toFixed(1)}k tokens`
      : null

  return (
    <div style={{ height: 28, background: 'var(--bg-3)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 16, flexShrink: 0 }}>
      {status && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[status] ?? 'var(--text-3)', animation: isActive ? 'pulse-amber 1.5s infinite' : 'none' }} />
          <span style={{ fontSize: 11, color: STATUS_COLOR[status] ?? 'var(--text-3)' }}>{status}</span>
        </div>
      )}

      {liveLabel && (
        <span
          style={{
            fontSize: 11, color: 'var(--text-2)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 360,
          }}
          title={liveLabel}
        >
          {liveLabel}
        </span>
      )}

      {pendingChanges > 0 && (
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--yellow)',
          padding: '2px 8px',
          background: 'var(--yellow-dim)',
          borderRadius: 10,
          animation: 'pulse-amber 2s infinite',
        }}>
          {pendingChanges} awaiting apply
        </span>
      )}

      {server?.ready && (
        <span style={{ fontSize: 11, color: 'var(--cyan)' }}>
          server {server.url ?? server.port ?? 'ready'}
        </span>
      )}

      {tokenLabel && (
        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>{tokenLabel}</span>
      )}

      {cacheTokens > 0 && (
        <span style={{ fontSize: 11, color: 'var(--teal)' }}>
          cache {(cacheTokens / 1000).toFixed(1)}k
        </span>
      )}

      {contextPercent !== null && (
        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: tokenLabel ? 0 : 'auto' }}>
          context {contextPercent}%
        </span>
      )}

      <span style={{ fontSize: 10, color: 'var(--text-ghost)', marginLeft: tokenLabel || contextPercent !== null ? 0 : 'auto' }}>
        KOVA v{__KOVA_VERSION__}
      </span>
    </div>
  )
}
