import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { LayerResult, HarnessError, HarnessWarning } from '@kova/shared'
import { parseTestFailures } from './error-parsers'

const execAsync = promisify(exec)

export interface TestsLayerConfig {
  command: string
  projectRoot: string
  timeoutMs?: number
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
    return { name: 'tests', passed: true, errors: [], warnings: [], duration: 0, skipped: true }
  }

  const startedAt = new Date().toISOString()
  const start = Date.now()
  const timeout = config.timeoutMs ?? 60_000

  try {
    const result = await execAsync(config.command, { cwd: config.projectRoot, timeout })

    return {
      name: 'tests',
      passed: true,
      errors: [],
      warnings: [],
      duration: Date.now() - start,
      skipped: false,
      command: config.command,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: 0,
      startedAt,
    }
  } catch (error) {
    const err = error as { killed?: boolean; stdout?: string; stderr?: string; code?: number }
    const stdout = err.stdout ?? ''
    const stderr = err.stderr ?? ''
    const exitCode = err.code ?? 1

    if (err.killed) {
      return {
        name: 'tests',
        passed: false,
        errors: [makeTimeoutError(timeout)],
        warnings: [],
        duration: Date.now() - start,
        skipped: false,
        command: config.command,
        stdout,
        stderr,
        exitCode,
        startedAt,
      }
    }

    // vitest escreve output no stdout; outros runners podem usar stderr
    const output = (stdout.trim() ? stdout : stderr)
    const parsed = parseOutput(output)
    return {
      name: 'tests',
      passed: false,
      errors: buildErrors(parsed),
      warnings: buildWarnings(parsed),
      duration: Date.now() - start,
      skipped: false,
      command: config.command,
      stdout,
      stderr,
      exitCode,
      startedAt,
    }
  }
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
    message: `Tests timeout após ${timeoutMs}ms`,
    humanMessage: `Tests demoraram mais de ${timeoutMs}ms`,
    file: '',
  }
}
