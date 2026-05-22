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
          reason: layer.skippedReason ?? layer.warnings[0]?.message ?? 'Validation skipped by harness.',
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
        validationsNotRun.push({ kind: skipped, reason: 'Validation was not executed in this run.' })
      }
    }
    if (harness.validationConfidence === 'none') {
      residualRisk.push('No real validation executed; human review is required.')
    } else if (harness.validationConfidence === 'partial') {
      residualRisk.push('Only partial validation executed; do not claim complete safety.')
    }
    for (const layer of harness.layers.filter(l => !l.skipped && !l.passed)) {
      residualRisk.push(`${layer.name} failed with ${layer.errors.length} error(s).`)
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
  if (state.status === 'completed') return 'Changes applied after harness validation.'
  if (!harness) return 'Task ended without harness results.'
  if (!harness.passed) return 'Task ended with harness validation failing.'
  if (harness.validationConfidence !== 'full') return 'Task requires review — validation was partial or missing.'
  return 'Task validated by harness, awaiting decision/apply.'
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
  if (harness?.layers.some(l => !l.skipped && !l.passed)) return 'repair_needed'
  return 'reject'
}

function recommendNextStep(
  status: ExecutionState['status'],
  decision: NonNullable<ProofPack['finalUiDecision']>,
  harness?: HarnessResult,
): string {
  if (decision === 'repair_needed') return 'Fix the harness failures and run validation again.'
  if (decision === 'needs_review') return 'Review evidence, diff, and risks before applying.'
  if (harness?.validationConfidence === 'partial') return 'Run additional validation before auto-apply.'
  if (harness?.validationConfidence === 'none') return 'Configure real project validation before approving.'
  if (status === 'completed') return 'No required action.'
  return 'Review the Proof Pack and decide the next step.'
}
