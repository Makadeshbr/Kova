import type { LayerResult, HarnessError } from '@kova/shared'
import { parseBuildErrors } from './error-parsers'
import { makePolicyError, runLayerCommand } from './command-result'

export interface TypecheckLayerConfig {
  command: string
  projectRoot: string
  cwd?: string
  timeoutMs?: number
  signal?: AbortSignal
  onLine?: (line: string, stream: 'stdout' | 'stderr') => void
}

export async function runTypecheckLayer(config: TypecheckLayerConfig): Promise<LayerResult> {
  if (!config.command.trim()) {
    return { name: 'typecheck', passed: true, errors: [], warnings: [], duration: 0, durationMs: 0, skipped: true, skippedReason: 'command_not_configured' }
  }

  const timeout = config.timeoutMs ?? 30_000
  const { base, passed, timedOut } = await runLayerCommand(config, 'typecheck', 'typecheck', timeout)
  if (config.signal?.aborted) throwAbort()

  if (passed) {
    return { name: 'typecheck', passed: true, errors: [], warnings: [], skipped: false, ...base }
  }

  if (timedOut) {
    return { name: 'typecheck', passed: false, errors: [makeTimeoutError(timeout)], warnings: [], skipped: false, ...base }
  }

  const output = (base.stderr?.trim() ? base.stderr : base.stdout) ?? ''
  const errors = isPolicyOutput(output)
    ? [makePolicyError('typecheck', output)]
    : parseBuildErrors(output).map(e => ({ ...e, layer: 'typecheck' }))
  return { name: 'typecheck', passed: false, errors, warnings: [], skipped: false, ...base }
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
    layer: 'typecheck',
    type: 'syntax',
    severity: 'high',
    fixable: false,
    message: `Typecheck timeout apos ${timeoutMs}ms`,
    humanMessage: `Typecheck demorou mais de ${timeoutMs}ms`,
    file: '',
  }
}
