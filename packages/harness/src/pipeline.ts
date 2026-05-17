import type { EvidenceScoreBreakdown, FileChange, HarnessResult, LayerResult } from '@kova/shared'

export interface LayerDef {
  name: LayerResult['name']
  run: () => Promise<LayerResult>
  hardFail: boolean
  /** Human-readable command string for progress events (optional). */
  command?: string
}

export interface PipelineConfig {
  projectRoot: string
  iteration: number
  signal?: AbortSignal
  changes?: FileChange[]
  /** Called when a layer starts executing (before the subprocess is launched). */
  onLayerStart?: (layer: string, command: string) => void
  /** Called for each stdout/stderr line produced by a layer subprocess in real-time. */
  onLayerLine?: (layer: string, line: string, stream: 'stdout' | 'stderr') => void
}

const SCORE_WEIGHTS: Record<LayerResult['name'], number> = {
  build: 20,
  typecheck: 15,
  tests: 30,
  completion: 20,
  rules: 10,
  security: 15,
  lint: 10,
}

const VALIDATION_LAYERS = new Set<LayerResult['name']>(['build', 'typecheck', 'tests', 'lint'])
const COMPLETION_LAYERS = new Set<LayerResult['name']>(['completion'])

export async function runPipeline(
  layers: LayerDef[],
  config: PipelineConfig,
): Promise<HarnessResult> {
  const start = Date.now()
  const results: LayerResult[] = []

  for (const layer of layers) {
    throwIfAborted(config.signal)
    config.onLayerStart?.(layer.name, layer.command ?? '')
    const result = normalizeLayerResult(await layer.run())
    throwIfAborted(config.signal)
    results.push(result)

    const hasCritical = result.errors.some(e => e.severity === 'critical')
    if ((layer.hardFail && !result.passed) || hasCritical) break
  }

  const activeResults = results.filter(r => !r.skipped)
  const noValidation = activeResults.length === 0
  const skippedLayers = results.filter(r => r.skipped).map(r => r.name)
  const ranNames = new Set(activeResults.map(r => r.name))
  const hasCompilationCheck = ranNames.has('build') || ranNames.has('typecheck')
  const hasTestEvidence = ranNames.has('tests')
  const validationConfidence: 'none' | 'partial' | 'full' =
    activeResults.length === 0 ? 'none'
    : (hasCompilationCheck && hasTestEvidence) ? 'full'
    : 'partial'

  if (noValidation) {
    results.push(normalizeLayerResult({
      name: 'rules',
      passed: true,
      errors: [],
      warnings: [{
        layer: 'rules',
        message: 'No build, test or lint configured; Evidence Score does not reflect real code quality. Configure commands in the project for effective validation.',
        file: '',
      }],
      duration: 0,
      durationMs: 0,
      skipped: true,
      skippedReason: 'no_validation_layers_configured',
    }))
  }

  const evidenceScore = computeEvidenceScore(results, validationConfidence, config.changes ?? [])
  const passed = !noValidation && results.every(r => r.passed || r.skipped)

  return {
    passed,
    score: evidenceScore.score,
    evidenceScore,
    layers: results,
    duration: Date.now() - start,
    iteration: config.iteration,
    validationConfidence,
    skippedLayers: skippedLayers.length > 0 ? skippedLayers : undefined,
  }
}

function computeEvidenceScore(
  layers: LayerResult[],
  validationConfidence: EvidenceScoreBreakdown['validationConfidence'],
  changes: FileChange[],
): EvidenceScoreBreakdown {
  const active = layers.filter(layer => !layer.skipped)
  const executedLayers = active.map(layer => layer.name)
  const passedLayers = active.filter(layer => layer.passed).map(layer => layer.name)
  const failedLayers = active.filter(layer => !layer.passed).map(layer => layer.name)
  const skipped = layers.filter(layer => layer.skipped).map(layer => layer.name)
  const totalWeight = active.reduce((sum, layer) => sum + (SCORE_WEIGHTS[layer.name] ?? 0), 0)
  const passedWeight = active.reduce((sum, layer) => sum + (layer.passed ? SCORE_WEIGHTS[layer.name] ?? 0 : 0), 0)

  const validationScore = totalWeight === 0 ? 55 : Math.round((passedWeight / totalWeight) * 100)
  const completeness = computeCompleteness(active, validationConfidence)
  const risk = computeRisk(changes, active)
  const blockers = computeBlockers(active)

  let score = validationScore - completeness.penalty - risk.penalty
  if (validationConfidence === 'none') score = Math.min(score, 55)
  if (validationConfidence === 'partial') score = Math.min(score, 85)
  if (failedLayers.some(name => VALIDATION_LAYERS.has(name as LayerResult['name']) || COMPLETION_LAYERS.has(name as LayerResult['name']))) score = Math.min(score, 55)
  if (active.some(layer => layer.name === 'security' && layer.errors.some(error => error.severity === 'critical'))) score = 0
  if (active.some(layer => layer.name === 'build' && !layer.passed)) score = 0
  score = Math.max(0, Math.min(100, score))

  return {
    score,
    validationConfidence,
    validation: {
      executedLayers,
      passedLayers,
      failedLayers,
      skippedLayers: skipped,
      totalWeight,
      passedWeight,
    },
    risk,
    completeness,
    blockers,
    notes: buildScoreNotes(validationConfidence, risk, completeness, blockers),
  }
}

function computeCompleteness(
  active: LayerResult[],
  validationConfidence: EvidenceScoreBreakdown['validationConfidence'],
): EvidenceScoreBreakdown['completeness'] {
  const names = new Set(active.map(layer => layer.name))
  const hasCompilationCheck = names.has('build') || names.has('typecheck')
  const hasTestEvidence = names.has('tests')
  const hasCompletionEvidence = names.has('completion')
  const hasSecurityEvidence = names.has('security')
  const reasons: string[] = []
  let penalty = 0

  const onlyCompletionProof = hasCompletionEvidence && active.length === 1
  if (onlyCompletionProof) {
    return {
      hasCompilationCheck,
      hasTestEvidence,
      hasSecurityEvidence,
      partial: true,
      penalty: 20,
      reasons: ['somente prova de conclusao; sem build/test executado'],
    }
  }

  if (!hasCompilationCheck) {
    penalty += 12
    reasons.push('sem build/typecheck executado')
  }
  if (!hasTestEvidence) {
    penalty += 18
    reasons.push('sem teste executado')
  }
  if (!hasSecurityEvidence && active.length > 0) {
    penalty += 3
    reasons.push('sem camada security executada')
  }
  if (validationConfidence === 'none') {
    penalty += 25
    reasons.push('nenhuma validacao real')
  } else if (validationConfidence === 'partial') {
    penalty += 8
    reasons.push('validacao parcial')
  }

  return {
    hasCompilationCheck,
    hasTestEvidence,
    hasSecurityEvidence,
    partial: validationConfidence !== 'full',
    penalty,
    reasons,
  }
}

function computeRisk(changes: FileChange[], active: LayerResult[]): EvidenceScoreBreakdown['risk'] {
  const filesChanged = changes.length
  const changedLines = changes.reduce((sum, change) => {
    if (!change.diff) return sum
    return sum + change.diff.split('\n').filter(line => line.startsWith('+') || line.startsWith('-')).length
  }, 0)
  const reasons: string[] = []
  let penalty = 0

  if (filesChanged > 8) {
    penalty += 12
    reasons.push('muitos arquivos alterados')
  } else if (filesChanged > 3) {
    penalty += 5
    reasons.push('patch atravessa varios arquivos')
  }

  if (changedLines > 1000) {
    penalty += 15
    reasons.push('patch grande')
  } else if (changedLines > 300) {
    penalty += 8
    reasons.push('patch medio/grande')
  }

  if (changes.some(change => isSensitivePath(change.path))) {
    penalty += 15
    reasons.push('area sensivel alterada')
  }
  if (changes.some(change => isPublicContractPath(change.path))) {
    penalty += 10
    reasons.push('contrato publico/configuracao alterado')
  }
  if (changes.some(change => isSourcePath(change.path)) && !active.some(layer => layer.name === 'tests' && !layer.skipped)) {
    penalty += 10
    reasons.push('codigo fonte alterado sem teste executado')
  }

  const patchSize: EvidenceScoreBreakdown['risk']['patchSize'] =
    changedLines === 0 ? 'none' : changedLines <= 120 ? 'small' : changedLines <= 500 ? 'medium' : 'large'
  const riskLevel: EvidenceScoreBreakdown['risk']['riskLevel'] =
    penalty >= 20 ? 'high' : penalty >= 8 ? 'medium' : 'low'

  return { filesChanged, changedLines, patchSize, riskLevel, penalty, reasons }
}

function computeBlockers(active: LayerResult[]): string[] {
  const blockers: string[] = []
  for (const layer of active) {
    if (layer.passed) continue
    blockers.push(`${layer.name} failed`)
    for (const error of layer.errors) {
      if (error.severity === 'critical') blockers.push(`${layer.name}: critical ${error.type}`)
    }
  }
  return [...new Set(blockers)]
}

function buildScoreNotes(
  validationConfidence: EvidenceScoreBreakdown['validationConfidence'],
  risk: EvidenceScoreBreakdown['risk'],
  completeness: EvidenceScoreBreakdown['completeness'],
  blockers: string[],
): string[] {
  const notes: string[] = []
  notes.push(`validationConfidence=${validationConfidence}`)
  if (risk.reasons.length) notes.push(...risk.reasons)
  if (completeness.reasons.length) notes.push(...completeness.reasons)
  if (blockers.length) notes.push(...blockers)
  return notes
}

function normalizeLayerResult(layer: LayerResult): LayerResult {
  const status: LayerResult['status'] = layer.skipped ? 'skipped' : layer.passed ? 'passed' : 'failed'
  const durationMs = layer.durationMs ?? layer.duration
  return {
    ...layer,
    layer: layer.layer ?? layer.name,
    status,
    durationMs,
    duration: layer.duration ?? durationMs,
    findings: layer.findings ?? [
      ...layer.errors.map(error => ({
        severity: error.severity,
        message: error.humanMessage || error.message,
        file: error.file || undefined,
        line: error.line,
        rule: error.rule,
      })),
      ...layer.warnings.map(warning => ({
        severity: 'info' as const,
        message: warning.message,
        file: warning.file || undefined,
        line: warning.line,
      })),
    ],
  }
}

function isSensitivePath(path: string): boolean {
  return /(^|\/)(auth|security|permission|billing|payment|migration|migrations|secrets?|\.env)/i.test(path)
}

function isPublicContractPath(path: string): boolean {
  return /(^|\/)(package\.json|openapi|swagger|schema|proto|api-contract|contracts?|routes?|public-api)/i.test(path)
}

function isSourcePath(path: string): boolean {
  return /\.(ts|tsx|js|jsx|py|go|rs|java|kt|cs|rb|php|swift|dart|c|cc|cpp|h|hpp)$/i.test(path)
    && !/(^|\/)(test|tests|__tests__|spec)(\/|$)|\.(test|spec)\./i.test(path)
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  const err = new Error('Aborted')
  err.name = 'AbortError'
  throw err
}
