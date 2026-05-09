import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { LayerResult, HarnessError, HarnessWarning, FileChange } from '@kova/shared'

const execAsync = promisify(exec)

export interface SecurityLayerConfig {
  changes: FileChange[]
  projectRoot: string
}

const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bsk-[a-zA-Z0-9]{20,}/, label: 'OpenAI API key' },
  { pattern: /\bpk_[a-zA-Z0-9]{20,}/, label: 'Stripe key' },
  { pattern: /\bAKIA[A-Z0-9]{16}/, label: 'AWS access key' },
  { pattern: /\bghp_[a-zA-Z0-9]{36,}/, label: 'GitHub token' },
  { pattern: /password\s*=\s*["'][^"']{3,}["']/, label: 'Hardcoded password' },
]

export async function runSecurityLayer(config: SecurityLayerConfig): Promise<LayerResult> {
  const secretErrors = checkSecrets(config.changes)
  if (secretErrors.length > 0) {
    return secResult(secretErrors, [], 0)
  }

  const available = await isSemgrepAvailable(config.projectRoot)
  if (!available) {
    const warn: HarnessWarning = {
      layer: 'security',
      message: 'Semgrep não encontrado — análise SAST pulada',
      file: '',
    }
    return { name: 'security', passed: true, errors: [], warnings: [warn], duration: 0, skipped: false }
  }

  return runSemgrep(config.projectRoot)
}

function checkSecrets(changes: FileChange[]): HarnessError[] {
  const errors: HarnessError[] = []
  for (const change of changes) {
    if (change.type === 'delete') continue
    const added = change.diff
      .split('\n')
      .filter(l => l.startsWith('+') && !l.startsWith('+++'))
      .map(l => l.slice(1))

    for (const [idx, line] of added.entries()) {
      for (const { pattern, label } of SECRET_PATTERNS) {
        if (pattern.test(line)) {
          errors.push({
            layer: 'security',
            type: 'security',
            severity: 'critical',
            fixable: false,
            message: `${label} detectado em ${change.path}`,
            humanMessage: `Possível ${label} hardcoded — use variáveis de ambiente`,
            file: change.path,
            line: idx + 1,
          })
        }
      }
    }
  }
  return errors
}

async function isSemgrepAvailable(projectRoot: string): Promise<boolean> {
  try {
    await execAsync('semgrep --version', { cwd: projectRoot, timeout: 5_000 })
    return true
  } catch {
    return false
  }
}

async function runSemgrep(projectRoot: string): Promise<LayerResult> {
  try {
    const execResult = await execAsync('semgrep --config=auto --json', {
      cwd: projectRoot,
      timeout: 120_000,
    })
    const stdout = (execResult as unknown as { stdout: string }).stdout ?? ''
    const data = JSON.parse(stdout) as {
      results: Array<{
        path: string
        start: { line: number }
        extra: { message: string; severity: string }
      }>
    }
    const errors: HarnessError[] = data.results.map(r => ({
      layer: 'security',
      type: 'security' as const,
      severity: r.extra.severity === 'ERROR' ? ('high' as const) : ('medium' as const),
      fixable: false,
      message: r.extra.message,
      humanMessage: r.extra.message,
      file: r.path,
      line: r.start.line,
    }))
    return secResult(errors, [], 0)
  } catch (error) {
    throw new Error(`Semgrep falhou: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function secResult(errors: HarnessError[], warnings: HarnessWarning[], duration: number): LayerResult {
  return { name: 'security', passed: errors.length === 0, errors, warnings, duration, skipped: false }
}
