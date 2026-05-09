import type { HarnessResult, LayerResult } from '@kova/shared'

export interface LayerDef {
  name: 'build' | 'tests' | 'lint' | 'rules' | 'security' | 'typecheck'
  run: () => Promise<LayerResult>
  hardFail: boolean
}

export interface PipelineConfig {
  projectRoot: string
  iteration: number
}

const SCORE_WEIGHTS: Record<string, number> = {
  build: 25, typecheck: 10, tests: 30, rules: 25, security: 10, lint: 10,
}

function computeScore(layers: LayerResult[]): number {
  // Build failure é o único hard fail que zera o score
  const buildFailed = layers.some(l => l.name === 'build' && !l.passed && !l.skipped)
  if (buildFailed) return 0

  let passed = 0, total = 0
  for (const layer of layers) {
    if (layer.skipped) continue
    const weight = SCORE_WEIGHTS[layer.name] ?? 0
    total += weight
    if (layer.passed) passed += weight
  }
  // No active layers = no real validation. Return 75 to trigger 'suggest'
  // (human review) — safe middle ground between auto_apply(90) and reject(70).
  return total === 0 ? 75 : Math.round((passed / total) * 100)
}

export async function runPipeline(
  layers: LayerDef[],
  config: PipelineConfig,
): Promise<HarnessResult> {
  const start = Date.now()
  const results: LayerResult[] = []

  for (const layer of layers) {
    const result = await layer.run()
    results.push(result)

    const hasCritical = result.errors.some(e => e.severity === 'critical')
    if ((layer.hardFail && !result.passed) || hasCritical) break
  }

  // Detect if no real validation happened (all layers skipped or none provided).
  // Compute metadata BEFORE synthetic injection to avoid polluting skippedLayers.
  const activeResults = results.filter(r => !r.skipped)
  const noValidation = activeResults.length === 0
  const skippedLayers = results.filter(r => r.skipped).map(r => r.name)
  const ranNames = new Set(activeResults.map(r => r.name))

  // 'full' requires compilation evidence (build or typecheck) AND test evidence
  const hasCompilationCheck = ranNames.has('build') || ranNames.has('typecheck')
  const validationConfidence: 'none' | 'partial' | 'full' =
    activeResults.length === 0 ? 'none'
    : (hasCompilationCheck && ranNames.has('tests')) ? 'full'
    : 'partial'

  if (noValidation) {
    // Inject a synthetic warning layer so the UI can display a human-readable message.
    // Marked skipped: true so it does NOT contribute to the score (total stays 0 → 75).
    // This prevents the synthetic layer from raising the score to 100 and triggering auto_apply.
    results.push({
      name: 'rules',
      passed: true,
      errors: [],
      warnings: [{
        layer: 'rules',
        message: 'Nenhum build, test ou lint configurado — score não reflete qualidade real do código. Configure comandos no projeto para validação efetiva.',
        file: '',
      }],
      duration: 0,
      skipped: true,
    })
  }

  const passed = !noValidation && results.every(r => r.passed || r.skipped)
  const score = computeScore(results)

  return {
    passed,
    score,
    layers: results,
    duration: Date.now() - start,
    iteration: config.iteration,
    validationConfidence,
    skippedLayers: skippedLayers.length > 0 ? skippedLayers : undefined,
  }
}
