import type { LayerResult, HarnessError, HarnessWarning } from '@kova/shared'
import { parseTestFailures } from './error-parsers'
import { makePolicyError, runLayerCommand } from './command-result'

export interface TestsLayerConfig {
  command: string
  projectRoot: string
  cwd?: string
  timeoutMs?: number
  signal?: AbortSignal
  onLine?: (line: string, stream: 'stdout' | 'stderr') => void
}

interface TestParseResult {
  total: number
  passed: number
  failed: number
  skipped: number
  failedTests: string[]
}

export async function runTestsLayer(config: TestsLayerConfig): Promise<LayerResult> {
  if (!config.command.trim()) {
    return { name: 'tests', passed: true, errors: [], warnings: [], duration: 0, durationMs: 0, skipped: true, skippedReason: 'command_not_configured' }
  }

  const timeout = config.timeoutMs ?? 60_000
  const { base, passed, timedOut } = await runLayerCommand(config, 'tests', 'test', timeout)
  if (config.signal?.aborted) throwAbort()

  if (passed) {
    return { name: 'tests', passed: true, errors: [], warnings: [], skipped: false, ...base }
  }

  if (timedOut) {
    return { name: 'tests', passed: false, errors: [makeTimeoutError(timeout)], warnings: [], skipped: false, ...base }
  }

  const output = (base.stdout?.trim() ? base.stdout : base.stderr) ?? ''
  if (isPolicyOutput(output)) {
    return { name: 'tests', passed: false, errors: [makePolicyError('tests', output)], warnings: [], skipped: false, ...base }
  }
  const parsed = parseOutput(output)
  return {
    name: 'tests',
    passed: false,
    errors: buildErrors(parsed),
    warnings: buildWarnings(parsed),
    skipped: false,
    ...base,
  }
}

function throwAbort(): never {
  const err = new Error('Aborted')
  err.name = 'AbortError'
  throw err
}

function isPolicyOutput(output: string): boolean {
  return /bloquead|blocked|policy|manifest/i.test(output)
}

function parseOutput(output: string): TestParseResult {
  const failed = Number(output.match(/(\d+)\s+failed/)?.[1] ?? '0')
  const passed = Number(output.match(/(\d+)\s+passed/)?.[1] ?? '0')
  const skipped = Number(output.match(/(\d+)\s+skipped/)?.[1] ?? '0')
  const total = passed + failed + skipped || Number(output.match(/\((\d+)\)/)?.[1] ?? '0')
  return { total, passed, failed, skipped, failedTests: parseTestFailures(output) }
}

function buildErrors(parsed: TestParseResult): HarnessError[] {
  if (parsed.failedTests.length > 0) {
    return parsed.failedTests.map(name => ({
      layer: 'tests',
      type: 'logic' as const,
      severity: 'high' as const,
      fixable: false,
      message: `Test falhou: ${name}`,
      humanMessage: `Test falhou: ${name}`,
      file: '',
    }))
  }

  return [{
    layer: 'tests',
    type: 'logic',
    severity: 'high',
    fixable: false,
    message: parsed.failed > 0 ? `${parsed.failed} test(s) falharam` : 'Test runner falhou',
    humanMessage: parsed.failed > 0 ? `${parsed.failed} test(s) falharam` : 'Test runner falhou',
    file: '',
  }]
}

function buildWarnings(parsed: TestParseResult): HarnessWarning[] {
  if (parsed.skipped === 0) return []
  return [{ layer: 'tests', message: `${parsed.skipped} test(s) pulados`, file: '' }]
}

function makeTimeoutError(timeoutMs: number): HarnessError {
  return {
    layer: 'tests',
    type: 'logic',
    severity: 'critical',
    fixable: false,
    message: `Tests timeout apos ${timeoutMs}ms`,
    humanMessage: `Tests demoraram mais de ${timeoutMs}ms`,
    file: '',
  }
}
