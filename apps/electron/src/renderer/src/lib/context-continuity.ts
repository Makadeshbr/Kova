import type { ExecutionEvent } from '../types'
import type { SessionUsage } from '../app-state'

export interface ContextContinuityFile {
  path: string
  reason: string
  source: string
  confidence: number
}

export interface ContextContinuitySummary {
  visible: boolean
  reused: boolean
  fileCount: number
  headline: string
  tokenLabel: string
  memoryLabel: string | null
  safetyLabel: string | null
  selectedFiles: ContextContinuityFile[]
  warnings: string[]
}

export function buildContextContinuitySummary(
  usage: SessionUsage,
  events: ExecutionEvent[],
): ContextContinuitySummary {
  const latestContext = [...events].reverse().find(event => event.type === 'context_loaded' && event.context)?.context
  const selected = usage.selectedFiles.length > 0
    ? usage.selectedFiles
    : latestContext?.selectedFiles ?? []
  const fileCount = usage.contextFiles.length || latestContext?.files.length || selected.length
  const tokens = usage.contextTokens || latestContext?.tokensUsed || 0
  const learnings = usage.learningsCount || latestContext?.learningsCount || 0
  const blockedCount = usage.blockedFiles.length || latestContext?.blockedFiles?.length || 0
  const rejectedCount = usage.rejectedFiles.length || latestContext?.rejectedFiles?.length || 0
  const warnings = unique([
    ...usage.contextWarnings,
    ...(latestContext?.warnings ?? []),
  ]).slice(0, 3)

  return {
    visible: Boolean(latestContext) || fileCount > 0 || learnings > 0 || blockedCount > 0 || rejectedCount > 0 || warnings.length > 0,
    reused: Boolean(latestContext?.reused),
    fileCount,
    headline: fileCount > 0
      ? `${fileCount} arquivo${fileCount === 1 ? '' : 's'} usado${fileCount === 1 ? '' : 's'} como contexto`
      : 'Projeto vazio detectado',
    tokenLabel: formatTokens(tokens),
    memoryLabel: learnings > 0 ? `${learnings} memor${learnings === 1 ? 'y' : 'ies'}` : null,
    safetyLabel: blockedCount > 0 || rejectedCount > 0
      ? `${blockedCount} blocked / ${rejectedCount} skipped`
      : null,
    selectedFiles: selected.slice(0, 5).map(file => ({
      path: file.path,
      reason: file.reason,
      source: sourceLabel(file.source),
      confidence: file.confidence,
    })),
    warnings,
  }
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k ctx`
  return `${tokens} ctx`
}

function sourceLabel(source: string | undefined): string {
  if (source === 'explicit') return 'referenced'
  if (source === 'opened_file') return 'open file'
  if (source === 'diff') return 'current diff'
  if (source === 'error') return 'validation'
  if (source === 'dependency') return 'dependency'
  if (source === 'related_test') return 'related test'
  if (source === 'grep') return 'search'
  if (source === 'instruction') return 'instruction'
  return source ?? 'context'
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))]
}
