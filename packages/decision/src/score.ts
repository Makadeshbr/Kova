import type { HarnessResult, LayerResult } from '@kova/shared'

const BASE_WEIGHTS: Record<string, number> = {
  build: 25,
  typecheck: 0,
  completion: 20,
  tests: 30,
  rules: 25,
  security: 10,
  lint: 10,
}

export function calculateScore(result: HarnessResult): number {
  if (result.evidenceScore) return result.evidenceScore.score
  if (hasHardFail(result)) return 0

  const weights = adaptWeights(result)
  let passed = 0
  let total = 0

  for (const layer of result.layers) {
    if (layer.skipped) continue
    const weight = weights[layer.name] ?? 0
    total += weight
    if (layer.passed) passed += weight
  }

  if (total === 0) return 100 // No layers to validate — trust the HarnessResult.score from the caller
  return Math.round((passed / total) * 100)
}

// Redistributes weights based on what layers are actually present and active.
// A project without tests should not be penalized for a missing tests layer.
function adaptWeights(result: HarnessResult): Record<string, number> {
  const weights = { ...BASE_WEIGHTS }

  // Typecheck: only contributes weight when actively ran.
  // Takes weight from build to keep combined compilation verification at ~25.
  const typecheckLayer = result.layers.find(l => l.name === 'typecheck')
  if (typecheckLayer && !typecheckLayer.skipped) {
    weights.typecheck = 10
    weights.build = Math.max(weights.build - 10, 0)
  }

  const testsLayer = result.layers.find(l => l.name === 'tests')
  if (!testsLayer || testsLayer.skipped) {
    // No test runner configured — redistribute tests weight to rules + build
    const w = weights.tests
    weights.tests = 0
    weights.rules += Math.round(w * 0.6)
    weights.build += Math.round(w * 0.4)
  }

  const lintLayer = result.layers.find(l => l.name === 'lint')
  if (!lintLayer || lintLayer.skipped) {
    // No linter configured — redistribute to rules
    weights.rules += weights.lint
    weights.lint = 0
  }

  // If security layer has critical errors, it overrides the fixed score regardless of weights
  const securityLayer = result.layers.find(l => l.name === 'security')
  if (securityLayer && !securityLayer.passed && securityLayer.errors.some(e => e.severity === 'critical')) {
    return weights // hard fail will return 0 anyway
  }

  return weights
}

function hasHardFail(result: HarnessResult): boolean {
  for (const layer of result.layers) {
    if (layer.passed || layer.skipped) continue
    if (layer.name === 'build') return true
    if (layer.name === 'completion' && hasCriticalError(layer)) return true
    if (layer.name === 'security' && hasCriticalError(layer)) return true
  }
  return false
}

function hasCriticalError(layer: LayerResult): boolean {
  return layer.errors.some(e => e.severity === 'critical')
}

export function getHardFailReason(result: HarnessResult): string {
  for (const layer of result.layers) {
    if (layer.passed) continue
    if (layer.name === 'build') return 'Build failed — code does not compile'
    if (layer.name === 'completion') return 'Completion proof failed'
    if (layer.name === 'security' && hasCriticalError(layer)) {
      const n = layer.errors.filter(e => e.severity === 'critical').length
      return `${n} secret(s) exposed`
    }
    if (layer.name === 'rules' && hasCriticalError(layer)) {
      return 'Critical architecture violation detected'
    }
  }
  return 'Hard fail detectado'
}
