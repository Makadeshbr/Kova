import type { ExecutionState, DecisionResult } from '@kova/shared'

export type StopReason = 'success' | 'max_iterations' | 'human_required' | 'timeout' | 'aborted'

export interface StopOptions {
  maxIterations?: number
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 10 * 60_000

export function shouldStop(
  state: ExecutionState,
  lastDecision?: DecisionResult,
  options: StopOptions = {},
): StopReason | null {
  // Estados terminais imediatos
  if (state.status === 'completed') return 'success'
  if (state.status === 'failed') return 'aborted'

  const max = options.maxIterations ?? state.maxIterations

  // Timeout global. A rejected iteration with repair attempts left gets one
  // more loop even if the first pass was slow; otherwise a real fixable error
  // can be stranded by setup/install/model latency before Kova tries the fix.
  const elapsed = Date.now() - new Date(state.startedAt).getTime()
  if (elapsed >= (options.timeoutMs ?? DEFAULT_TIMEOUT_MS)) {
    const repairStillAvailable = lastDecision?.decision === 'reject' && state.currentIteration < max
    if (!repairStillAvailable) return 'timeout'
  }

  // Sem decisão ainda — primeira iteração, continua
  if (!lastDecision) return null

  // Sucesso: agente aplicou ou sugeriu (espera humano — loop para)
  if (lastDecision.decision === 'auto_apply') return 'success'
  if (lastDecision.decision === 'suggest') return 'success'

  // Intervenção humana: erro repetido ou score estagnado
  if (lastDecision.decision === 'human_required') return 'human_required'

  // Max iterations após reject
  if (state.currentIteration >= max) return 'max_iterations'

  return null
}
