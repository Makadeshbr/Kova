import type { LayerResult, HarnessError } from '@kova/shared'
import { parseLintErrors } from './error-parsers'
import { makePolicyError, runLayerCommand } from './command-result'

export interface LintLayerConfig {
  command: string
  projectRoot: string
  cwd?: string
  timeoutMs?: number
  signal?: AbortSignal
  onLine?: (line: string, stream: 'stdout' | 'stderr') => void
}

export async function runLintLayer(config: LintLayerConfig): Promise<LayerResult> {
  if (!config.command.trim()) {
    return { name: 'lint', passed: true, errors: [], warnings: [], duration: 0, durationMs: 0, skipped: true, skippedReason: 'command_not_configured' }
  }

  const timeout = config.timeoutMs ?? 60_000
  const { base, passed, timedOut } = await runLayerCommand(config, 'lint', 'lint', timeout)
  if (config.signal?.aborted) throwAbort()

  if (passed) {
    return { name: 'lint', passed: true, errors: [], warnings: [], skipped: false, ...base }
  }

  if (timedOut) {
    return { name: 'lint', passed: false, errors: [makeTimeoutError(timeout)], warnings: [], skipped: false, ...base }
  }

  const output = (base.stdout?.trim() ? base.stdout : base.stderr) ?? ''
  const errors = isPolicyOutput(output) ? [makePolicyError('lint', output)] : parseLintErrors(output)
  return { name: 'lint', passed: false, errors, warnings: [], skipped: false, ...base }
}

function throwAbort(): never {
  const err = new Error('Aborted')
  err.name = 'AbortError'
  throw err
}

function isPolicyOutput(output: string): boolean {
  return /bloquead|blocked|policy|manifest/i.test(output)
}

function makeTimeoutError(timeoutMs: number): HarnessError {
  return {
    layer: 'lint',
    type: 'style',
    severity: 'high',
    fixable: false,
    message: `Lint timeout apos ${timeoutMs}ms`,
    humanMessage: `Lint demorou mais de ${timeoutMs}ms`,
    file: '',
  }
}
