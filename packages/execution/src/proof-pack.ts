import type {
  DecisionResult, ExecutionContract, ExecutionState,
  FileChange, HarnessResult, ProofPack, ProofPackValidation,
} from '@kova/shared'
import { consolidateIterationChanges } from './changes'

export function generateProofPack(state: ExecutionState, contract: ExecutionContract): ProofPack {
  const lastIter = state.iterationHistory.at(-1)
  const harness = lastIter?.harnessResult
  const decision = lastIter?.decision
  const consolidatedChanges = consolidateIterationChanges(state.iterationHistory)
  const changes = consolidatedChanges.map(c => ({
    path: c.path, type: c.type, reason: summarizeChangeReason(c),
  }))

  const validationsRun: ProofPackValidation[] = []
  const validationsNotRun: Array<{ kind: string; reason: string }> = []
  const residualRisk: string[] = []
  const notes: string[] = []

  if (harness) {
    const skippedKinds = new Set<string>()
    for (const layer of harness.layers) {
      if (layer.skipped) {
        skippedKinds.add(layer.name)
        validationsNotRun.push({
          kind: layer.name,
          reason: normalizeValidationSkipReason(layer.skippedReason ?? layer.warnings[0]?.message),
        })
      } else if (layer.name !== 'completion') {
        validationsRun.push({
          kind: layer.name as ProofPackValidation['kind'],
          layer: layer.name,
          command: layer.command,
          scope: layer.scope,
          status: layer.status ?? (layer.passed ? 'passed' : 'failed'),
          passed: layer.passed,
          skipped: false,
          exitCode: layer.exitCode,
          durationMs: layer.durationMs ?? layer.duration,
          stdoutSnippet: limitOutput(layer.stdout),
          stderrSnippet: limitOutput(layer.stderr),
          findings: layer.findings,
          source: 'harness',
          note: summarizeLayer(layer),
        })
      }
    }
    for (const skipped of harness.skippedLayers ?? []) {
      if (!skippedKinds.has(skipped)) {
        validationsNotRun.push({ kind: skipped, reason: 'Nao configurado.' })
      }
    }
    if (harness.validationConfidence === 'none') {
      residualRisk.push('Validacao nao configurada neste projeto.')
    } else if (harness.validationConfidence === 'partial') {
      residualRisk.push('Validacao parcial; revise antes de tratar como totalmente verificado.')
    }
    for (const layer of harness.layers.filter(l => !l.skipped && !l.passed)) {
      residualRisk.push(layer.name === 'completion'
        ? 'Evidencia de conclusao incompleta.'
        : `${layer.name} precisa de revisao (${layer.errors.length} erro(s)).`)
    }
    for (const reason of harness.evidenceScore?.risk.reasons ?? []) residualRisk.push(reason)
    for (const reason of harness.evidenceScore?.completeness.reasons ?? []) notes.push(reason)
    for (const blocker of harness.evidenceScore?.blockers ?? []) notes.push(blocker)
    if (harness.evidenceScore) {
      notes.push(`Evidence Score ${harness.evidenceScore.score}; confidence ${harness.evidenceScore.validationConfidence}.`)
    }
  }

  const contextFileMap = new Map<string, { path: string; reason: string; source?: string; score?: number }>()
  for (const iter of state.iterationHistory) {
    for (const f of iter.contextFiles ?? []) {
      if (!contextFileMap.has(f.path)) {
        contextFileMap.set(f.path, { path: f.path, reason: `In context during iteration ${iter.iteration}`, source: 'context_pack' })
      }
    }
  }
  const analyzedFiles = Array.from(contextFileMap.values())
  const diffSummary = buildDiffSummary(changes, harness)
  const finalDecision = decision?.decision ?? 'suggest'
  const finalUiDecision = mapProofPackDecision(state.status, finalDecision, harness)

  return {
    sourceOfTruth: 'harness',
    understoodRequest: contract.objective,
    objective: contract.objective,
    summary: buildProofSummary(state, harness),
    iterations: state.iterationHistory.length,
    totalTokens: state.totalTokens,
    changes,
    diffSummary,
    analyzedFiles,
    contextUsed: { files: analyzedFiles, instructions: [], memories: [] },
    validationsRun,
    validationsNotRun,
    results: harness ? {
      passed: harness.passed,
      validationConfidence: harness.validationConfidence,
      evidenceScore: harness.evidenceScore,
    } : undefined,
    completionProof: harness?.completionProof,
    residualRisk: [...new Set(residualRisk)],
    notes: [...new Set(notes)],
    finalDecision,
    finalUiDecision,
    finalScore: decision?.score ?? harness?.score ?? 0,
    nextStepRecommended: recommendNextStep(state.status, finalUiDecision, harness),
    completedAt: new Date().toISOString(),
  }
}

function summarizeChangeReason(change: FileChange): string {
  if (change.type === 'create') return 'File created by iteration.'
  if (change.type === 'delete') return 'File removed by iteration.'
  return 'File modified by iteration.'
}

function summarizeLayer(layer: HarnessResult['layers'][number]): string | undefined {
  if (layer.passed) return 'Passed in harness.'
  const first = layer.errors[0]?.humanMessage || layer.errors[0]?.message
  return first ? `${layer.errors.length} error(s): ${first}` : `${layer.errors.length} error(s).`
}

function limitOutput(output?: string): string | undefined {
  if (!output) return undefined
  const trimmed = output.trim()
  return trimmed ? trimmed.slice(0, 2_000) : undefined
}

function buildDiffSummary(
  changes: Array<{ path: string; type: FileChange['type'] }>,
  harness?: HarnessResult,
): NonNullable<ProofPack['diffSummary']> {
  const risk = harness?.evidenceScore?.risk
  return {
    filesChanged: changes.length,
    additions: risk?.changedLines ?? 0,
    deletions: 0,
    patchSize: risk?.patchSize ?? 'none',
  }
}

function buildProofSummary(state: ExecutionState, harness?: HarnessResult): string {
  if (state.status === 'completed') {
    if (harness?.validationConfidence === 'none') return 'Alteracoes concluidas; validacao nao configurada neste projeto.'
    if (harness?.validationConfidence === 'partial') return 'Alteracoes concluidas com validacao parcial.'
    return 'Alteracoes concluidas.'
  }
  if (!harness) return 'Tarefa encerrada sem resultado de validacao.'
  if (!harness.passed && harness.validationConfidence === 'full') return 'Validacao encontrou falha real.'
  if (harness.validationConfidence !== 'full') return 'Alteracoes prontas com validacao parcial ou ausente.'
  return 'Alteracoes prontas para revisao/aplicacao.'
}

function mapProofPackDecision(
  status: ExecutionState['status'],
  decision: DecisionResult['decision'],
  harness?: HarnessResult,
): NonNullable<ProofPack['finalUiDecision']> {
  if (status === 'completed') return 'apply'
  if (decision === 'human_required' || status === 'paused') return 'needs_review'
  if (decision === 'suggest') return 'suggest'
  if (decision === 'auto_apply') return 'apply'
  if (harness?.layers.some(l => l.name === 'security' && !l.skipped && !l.passed && l.errors.some(error => error.severity === 'critical'))) return 'repair_needed'
  if (harness?.layers.some(l => !l.skipped && !l.passed)) return 'suggest'
  return 'reject'
}

function recommendNextStep(
  status: ExecutionState['status'],
  decision: NonNullable<ProofPack['finalUiDecision']>,
  harness?: HarnessResult,
): string {
  if (decision === 'repair_needed') return 'Revise os avisos do harness e rode validacao novamente quando existir.'
  if (decision === 'needs_review') return 'Revise o diff e a evidencia antes de aplicar.'
  if (harness?.validationConfidence === 'partial') return 'Valide manualmente o fluxo afetado se precisar de maior confianca.'
  if (harness?.validationConfidence === 'none') return 'Sem validacao configurada; revise manualmente o resultado.'
  if (status === 'completed') return 'Nenhuma acao obrigatoria.'
  return 'Revise o Proof Pack e decida o proximo passo.'
}

function normalizeValidationSkipReason(reason: string | undefined): string {
  if (!reason) return 'Nao configurado.'
  if (reason === 'command_not_configured') return 'Nao configurado.'
  if (reason === 'no_validation_layers_configured') return 'Validacao nao configurada.'
  return reason.replace(/_/g, ' ')
}
