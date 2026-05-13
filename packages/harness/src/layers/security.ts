import type { LayerResult, HarnessError, HarnessWarning, FileChange } from '@kova/shared'
import { runCommandInvocation } from '@kova/shared'

export interface SecurityLayerConfig {
  changes: FileChange[]
  projectRoot: string
  signal?: AbortSignal
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

  const available = await isSemgrepAvailable(config.projectRoot, config.signal)
  if (!available) {
    const warn: HarnessWarning = {
      layer: 'security',
      message: 'Semgrep não encontrado — análise SAST pulada',
      file: '',
    }
    return { name: 'security', passed: true, errors: [], warnings: [warn], duration: 0, skipped: false }
  }

  return runSemgrep(config.projectRoot, config.signal)
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

async function isSemgrepAvailable(projectRoot: string, signal?: AbortSignal): Promise<boolean> {
  const result = await runCommandInvocation({
    command: 'semgrep --version',
    workspaceRoot: projectRoot,
    kind: 'security',
    timeoutMs: 5_000,
    signal,
  })
  if (signal?.aborted) throwAbort()
  return result.exitCode === 0
}

async function runSemgrep(projectRoot: string, signal?: AbortSignal): Promise<LayerResult> {
  const start = Date.now()
  const execResult = await runCommandInvocation({
    command: 'semgrep --config=auto --json',
    workspaceRoot: projectRoot,
    kind: 'security',
    timeoutMs: 120_000,
    signal,
  })
  if (signal?.aborted) throwAbort()
  try {
    const stdout = execResult.stdout ?? ''
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
    return { ...secResult(errors, [], Date.now() - start), command: execResult.command, cwd: execResult.cwd, kind: execResult.kind, stdout: execResult.stdout, stderr: execResult.stderr, exitCode: execResult.exitCode, startedAt: execResult.startedAt }
  } catch (error) {
    throw new Error(`Semgrep falhou: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function secResult(errors: HarnessError[], warnings: HarnessWarning[], duration: number): LayerResult {
  return { name: 'security', passed: errors.length === 0, errors, warnings, duration, skipped: false }
}

function throwAbort(): never {
  const err = new Error('Aborted')
  err.name = 'AbortError'
  throw err
}
