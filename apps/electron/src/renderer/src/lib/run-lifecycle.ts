import type { ExecutionEvent, ExecutionState, HarnessResult } from '../types'
import type { ProductRunStatus } from './product-status'

export type ActivityTone = 'neutral' | 'success' | 'warning' | 'danger'

export interface ValidationLifecycleView {
  label: string
  detail: string | null
  status: 'pending' | 'success' | 'error'
  tone: ActivityTone
}

const TERMINAL_STATUSES = new Set<ExecutionState['status']>([
  'completed',
  'paused',
  'failed',
  'server_ready',
  'blocked',
])

const AUTO_COLLAPSE_PRODUCT_STATUSES = new Set<ProductRunStatus>([
  'completed',
  'completed_with_warnings',
])

export function isTerminalExecutionStatus(status: ExecutionState['status'] | null | undefined): boolean {
  return status ? TERMINAL_STATUSES.has(status) : false
}

export function shouldAutoCollapseRunPanel(input: {
  executionStatus: ExecutionState['status'] | null | undefined
  productStatus: ProductRunStatus
  isRunning: boolean
  isThinking: boolean
}): boolean {
  if (input.isRunning || input.isThinking) return false
  if (!isTerminalExecutionStatus(input.executionStatus)) return false
  return AUTO_COLLAPSE_PRODUCT_STATUSES.has(input.productStatus)
}

export function shouldExpandRunPanelForActiveRun(input: {
  executionStatus: ExecutionState['status'] | null | undefined
  isRunning: boolean
  isThinking: boolean
}): boolean {
  if (input.isRunning || input.isThinking) return true
  return Boolean(input.executionStatus && !isTerminalExecutionStatus(input.executionStatus))
}

export function validationLifecycleView(input: {
  executionStatus: ExecutionState['status'] | null | undefined
  harness: HarnessResult | undefined
  isValidationStarted: boolean
}): ValidationLifecycleView {
  if (!input.isValidationStarted) {
    return { label: 'Validacao aguardando', detail: null, status: 'pending', tone: 'neutral' }
  }

  if (!isTerminalExecutionStatus(input.executionStatus) && !input.harness) {
    return { label: 'Validando projeto', detail: null, status: 'pending', tone: 'neutral' }
  }

  if (hasSecurityCritical(input.harness)) {
    return { label: 'Validacao bloqueada', detail: 'Bloqueio critico de seguranca.', status: 'error', tone: 'danger' }
  }

  if (hasCompletionEvidenceFailure(input.harness)) {
    return { label: 'Evidencia incompleta', detail: 'A conclusao tem evidencia parcial.', status: 'success', tone: 'warning' }
  }

  if (hasValidationWarning(input.harness)) {
    return { label: 'Validacao concluida com avisos', detail: 'Validacao parcial ou nao configurada.', status: 'success', tone: 'warning' }
  }

  return { label: 'Validacao concluida', detail: null, status: 'success', tone: 'success' }
}

export function reviewActivityLabel(events: ExecutionEvent[]): string {
  const tool = [...events].reverse().find(event => event.type === 'tool_call')
  if (!tool || tool.type !== 'tool_call') return 'Analisando arquivos e preparando revisao...'

  const rawPath = typeof tool.toolInput?.path === 'string' ? tool.toolInput.path : ''
  const name = basename(rawPath)
  if (tool.toolName === 'read_file' && name) return `Lendo ${name}`
  if (tool.toolName === 'list_files') return name ? `Listando ${name}` : 'Mapeando arquivos do projeto'
  if (tool.toolName === 'glob_files') return 'Mapeando arquivos do projeto'
  if (tool.toolName === 'grep_codebase') return 'Buscando padroes no codigo'
  return 'Analisando arquivos e preparando revisao...'
}

export function shouldShowActivityArchive(input: {
  hasResult: boolean
  showLive: boolean
  eventsLength: number
  executionStatus: ExecutionState['status'] | null | undefined
}): boolean {
  if (input.showLive || input.eventsLength === 0) return false
  if (input.hasResult && isTerminalExecutionStatus(input.executionStatus)) return false
  return true
}

function basename(path: string): string {
  return path.split(/[/\\]/).filter(Boolean).pop() ?? path
}

function hasSecurityCritical(harness: HarnessResult | undefined): boolean {
  return Boolean(harness?.layers.some(layer =>
    layer.name === 'security'
    && !layer.skipped
    && !layer.passed
    && layer.errors.some(error => error.severity === 'critical'),
  ))
}

function hasCompletionEvidenceFailure(harness: HarnessResult | undefined): boolean {
  return Boolean(harness?.layers.some(layer => layer.name === 'completion' && !layer.skipped && !layer.passed))
}

function hasValidationWarning(harness: HarnessResult | undefined): boolean {
  if (!harness) return true
  if (harness.validationConfidence === 'none' || harness.validationConfidence === 'partial') return true
  return harness.layers.some(layer => layer.skipped || layer.warnings.length > 0)
}
