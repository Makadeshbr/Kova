import type { ExecutionContract, FileChange, HarnessResult, ReviewFinding, ReviewGateResult } from '@kova/shared'

const GENERATED_PATHS = ['dist/**', 'out/**', 'node_modules/**']
const DEPENDENCY_FILES = ['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb']

export interface ReviewGateInput {
  changes: FileChange[]
  contract?: ExecutionContract
  harnessResult: HarnessResult
}

export function runReviewGate(input: ReviewGateInput): ReviewGateResult {
  const findings: ReviewFinding[] = []

  for (const change of input.changes) {
    if (matchesAny(change.path, GENERATED_PATHS)) {
      findings.push({
        category: 'generated',
        severity: 'high',
        blocking: true,
        file: change.path,
        message: `${change.path} parece arquivo gerado e nao deve ser editado manualmente`,
      })
    }

    // Dependency and safe-zone checks: only block MODIFICATIONS, not new file creation.
    // New projects legitimately need to create package.json, go.mod, etc.
    if (change.type !== 'create' && DEPENDENCY_FILES.includes(change.path)) {
      findings.push({
        category: 'dependency',
        severity: 'high',
        blocking: true,
        file: change.path,
        message: `${change.path} altera dependencias ou lockfile; exige aprovacao explicita`,
      })
    }

    if (input.contract && !matchesAny(change.path, input.contract.allowedPaths)) {
      findings.push({
        category: 'scope',
        severity: 'high',
        blocking: true,
        file: change.path,
        message: `${change.path} esta fora do escopo do contrato`,
      })
    }

    if (change.type !== 'create' && input.contract && matchesAny(change.path, input.contract.safeZones)) {
      findings.push({
        category: 'security',
        severity: 'high',
        blocking: true,
        file: change.path,
        message: `${change.path} e safe zone e precisa revisao humana`,
      })
    }
  }

  if (input.contract?.requiresTests && !hasTestChange(input.changes) && changesExecutableCode(input.changes)) {
    findings.push({
      category: 'tests',
      severity: 'medium',
      blocking: false,
      message: 'Contrato espera teste para mudanca de comportamento, mas nenhum arquivo de teste foi alterado',
      suggestion: 'Adicione teste ou registre justificativa tecnica.',
    })
  }

  for (const layer of input.harnessResult.layers) {
    for (const error of layer.errors) {
      if (error.severity === 'critical') {
        findings.push({
          category: error.type === 'security' ? 'security' : 'quality',
          severity: 'critical',
          blocking: true,
          file: error.file,
          message: error.humanMessage || error.message,
        })
      }
    }
  }

  const blocking = findings.some(f => f.blocking)
  return { passed: !blocking, findings }
}

function hasTestChange(changes: FileChange[]): boolean {
  return changes.some(c => /(^|\/)(__tests__|test|tests)\//.test(c.path) || /\.(test|spec)\.[tj]sx?$/.test(c.path))
}

function changesExecutableCode(changes: FileChange[]): boolean {
  return changes.some(c => /\.(ts|tsx|js|jsx|go|py|rs|java|cs)$/.test(c.path))
}

function matchesAny(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchGlob(path.replace(/\\/g, '/'), pattern))
}

function matchGlob(path: string, pattern: string): boolean {
  if (pattern === '**') return true
  if (path === pattern) return true
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]+')
    .replace(/\x00/g, '.*')
  return new RegExp(`^${escaped}$`).test(path)
}
