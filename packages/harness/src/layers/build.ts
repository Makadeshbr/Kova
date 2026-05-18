import type { LayerResult, HarnessError } from '@kova/shared'
import { parseBuildErrors } from './error-parsers'
import { makePolicyError, runLayerCommand } from './command-result'
import { classifyEnvironmentFailure } from './environment-error'

export interface BuildLayerConfig {
  command: string
  projectRoot: string
  cwd?: string
  timeoutMs?: number
  signal?: AbortSignal
  onLine?: (line: string, stream: 'stdout' | 'stderr') => void
}

export async function runBuildLayer(config: BuildLayerConfig): Promise<LayerResult> {
  if (!config.command.trim()) {
    return { name: 'build', passed: true, errors: [], warnings: [], duration: 0, durationMs: 0, skipped: true, skippedReason: 'command_not_configured' }
  }

  const timeout = config.timeoutMs ?? 30_000
  const { base, passed, timedOut } = await runLayerCommand(config, 'build', 'build', timeout)
  if (config.signal?.aborted) throwAbort()

  if (passed) {
    return { name: 'build', passed: true, errors: [], warnings: [], skipped: false, ...base }
  }

  if (timedOut) {
    return { name: 'build', passed: false, errors: [makeTimeoutError(timeout)], warnings: [], skipped: false, ...base }
  }

  const output = (base.stderr?.trim() ? base.stderr : base.stdout) ?? ''
  // Environment failures (missing binary, MODULE_NOT_FOUND) are not fixable by
  // editing source. Surface them as a typed error so the execution engine can
  // exit the repair loop instead of looping uselessly.
  const envError = classifyEnvironmentFailure('build', output, base.command)
  if (envError) {
    return { name: 'build', passed: false, errors: [envError], warnings: [], skipped: false, ...base }
  }
  const errors = isPolicyOutput(output) ? [makePolicyError('build', output)] : parseBuildErrors(output)
  return { name: 'build', passed: false, errors, warnings: [], skipped: false, ...base }
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
    layer: 'build',
    type: 'syntax',
    severity: 'critical',
    fixable: false,
    message: `Build timeout apos ${timeoutMs}ms`,
    humanMessage: `Build demorou mais de ${timeoutMs}ms`,
    file: '',
  }
}
