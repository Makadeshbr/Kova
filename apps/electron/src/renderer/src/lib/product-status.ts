import type { ExecutionState, HarnessResult } from '../types'

export type ProductRunStatus =
  | 'running'
  | 'completed'
  | 'completed_with_warnings'
  | 'review_recommended'
  | 'action_required'
  | 'blocked'
  | 'failed'

export interface ProductStatusInput {
  executionState: ExecutionState | null
  isRunning?: boolean
  isThinking?: boolean
  reviewChangeCount?: number
}

export interface ProductStatusView {
  status: ProductRunStatus
  title: string
  summary: string
  tone: 'neutral' | 'success' | 'warning' | 'danger'
  hasWarnings: boolean
}

const ACTIVE_ENGINE_STATES = new Set([
  'structuring',
  'planning',
  'coding',
  'validating',
  'deciding',
  'applying',
  'repairing',
  'awaiting_approval',
  'server_starting',
])

export function deriveProductStatus(input: ProductStatusInput): ProductStatusView {
  const { executionState, isRunning = false, isThinking = false, reviewChangeCount = 0 } = input
  if (isRunning || isThinking || (executionState?.status && ACTIVE_ENGINE_STATES.has(executionState.status))) {
    return view('running', 'Executando', 'Kova esta trabalhando nesta tarefa.', 'neutral', false)
  }

  const changes = executionState?.iterationHistory.flatMap(iteration => iteration.changes) ?? []
  const harness = executionState?.iterationHistory.at(-1)?.harnessResult
  const hasUsefulChanges = changes.length > 0 || reviewChangeCount > 0
  const blocked = hasSecurityCritical(harness)
  if (blocked || executionState?.status === 'blocked') {
    return view('blocked', 'Bloqueado', 'A execucao parou por seguranca ou permissao.', 'danger', true)
  }

  const hasWarnings = hasProductWarnings(harness)
  if (executionState?.status === 'paused') {
    if (hasUsefulChanges) return view('review_recommended', 'Revisao disponivel', buildSummary(changes.length, hasWarnings, 'As alteracoes estao prontas para revisar antes de aplicar.'), 'warning', hasWarnings)
    return view('action_required', 'Acao necessaria', 'Kova precisa de uma decisao sua para continuar.', 'warning', hasWarnings)
  }

  if (executionState?.status === 'completed') {
    if (hasWarnings) return view('completed_with_warnings', 'Concluido com avisos', buildSummary(changes.length, true, 'Alteracoes concluidas com validacao parcial.'), 'warning', true)
    return view('completed', 'Concluido', buildSummary(changes.length, false, 'Alteracoes concluidas.'), 'success', false)
  }

  if (executionState?.status === 'failed') {
    if (hasUsefulChanges && hasWarnings) {
      return view('completed_with_warnings', 'Concluido com avisos', buildSummary(changes.length, true, 'Alteracoes uteis foram produzidas, mas a evidencia ficou incompleta.'), 'warning', true)
    }
    if (hasUsefulChanges) {
      return view('review_recommended', 'Revisao recomendada', buildSummary(changes.length, true, 'Alteracoes uteis foram produzidas; revise antes de aplicar.'), 'warning', true)
    }
    return view('failed', 'Falha real', 'A tarefa terminou sem alteracoes uteis.', 'danger', false)
  }

  return view('action_required', 'Pronto', 'Aguardando nova instrucao.', 'neutral', false)
}

export function layerStatusLabel(layer: HarnessResult['layers'][number]): string {
  if (layer.skipped) return skippedReasonLabel(layer.skippedReason)
  if (layer.passed) return 'Aprovado'
  if (layer.name === 'completion') return 'Evidencia incompleta'
  return 'Revisao recomendada'
}

export function skippedReasonLabel(reason: string | undefined): string {
  if (!reason) return 'Ignorado'
  if (reason === 'command_not_configured') return 'Nao configurado'
  if (reason === 'no_validation_layers_configured') return 'Validacao nao configurada'
  return reason.replace(/_/g, ' ')
}

export function productValidationSummary(harness: HarnessResult | undefined): string | null {
  if (!harness) return null
  if (harness.validationConfidence === 'none') return 'Validacao nao configurada neste projeto.'
  if (harness.validationConfidence === 'partial') return 'Validacao parcial.'
  return null
}

function view(
  status: ProductRunStatus,
  title: string,
  summary: string,
  tone: ProductStatusView['tone'],
  hasWarnings: boolean,
): ProductStatusView {
  return { status, title, summary, tone, hasWarnings }
}

function buildSummary(fileCount: number, hasWarnings: boolean, fallback: string): string {
  const fileText = fileCount > 0
    ? `${fileCount} arquivo${fileCount === 1 ? '' : 's'} modificado${fileCount === 1 ? '' : 's'}.`
    : ''
  const warningText = hasWarnings ? ' Validacao parcial ou nao configurada.' : ''
  return `${fileText}${warningText}`.trim() || fallback
}

function hasSecurityCritical(harness: HarnessResult | undefined): boolean {
  return Boolean(harness?.layers.some(layer =>
    layer.name === 'security'
    && !layer.skipped
    && layer.errors.some(error => error.severity === 'critical'),
  ))
}

function hasProductWarnings(harness: HarnessResult | undefined): boolean {
  if (!harness) return false
  if (harness.validationConfidence === 'none' || harness.validationConfidence === 'partial') return true
  return harness.layers.some(layer =>
    layer.skipped
    || (!layer.passed && layer.name === 'completion')
    || layer.warnings.length > 0,
  )
}
