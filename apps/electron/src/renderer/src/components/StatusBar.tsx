import React from 'react'
import type { ExecutionState } from '../types'
import type { SessionUsage } from '../App'

interface Props {
  executionState: ExecutionState | null
  sessionUsage: SessionUsage
}

const STATUS_COLOR: Record<string, string> = {
  structuring: 'var(--amber)', planning: 'var(--amber)', coding: 'var(--amber)',
  validating: 'var(--yellow)', deciding: 'var(--yellow)',
  applying: 'var(--teal)', completed: 'var(--teal)',
  failed: 'var(--red)', paused: 'var(--text-3)',
}

export function StatusBar({ executionState, sessionUsage }: Props): React.ReactElement {
  const status = executionState?.status ?? null
  const last = executionState?.iterationHistory?.at(-1) ?? null
  const tokens = Math.max(executionState?.totalTokens ?? 0, sessionUsage.contextTokens + sessionUsage.completionTokens)
  const contextPercent = sessionUsage.maxContextTokens
    ? Math.min(100, Math.round((sessionUsage.contextTokens / sessionUsage.maxContextTokens) * 100))
    : null
  const isActive = status && !['completed', 'failed'].includes(status)

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

      {executionState && (
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          iter {executionState.currentIteration + 1}/{executionState.maxIterations}
        </span>
      )}

      {last?.harnessResult && (
        <span style={{ fontSize: 11, color: last.harnessResult.score >= 90 ? 'var(--teal)' : last.harnessResult.score >= 70 ? 'var(--yellow)' : 'var(--text-3)' }}>
          score {last.harnessResult.score}
        </span>
      )}

      {tokenLabel && (
        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>{tokenLabel}</span>
      )}

      {contextPercent !== null && (
        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: tokenLabel ? 0 : 'auto' }}>
          contexto {contextPercent}%
        </span>
      )}

      <span style={{ fontSize: 10, color: 'var(--text-ghost)', marginLeft: tokenLabel || contextPercent !== null ? 0 : 'auto' }}>
        KOVA v{__KOVA_VERSION__}
      </span>
    </div>
  )
}
