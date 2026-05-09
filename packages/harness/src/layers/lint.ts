import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { LayerResult, HarnessError } from '@kova/shared'
import { parseLintErrors } from './error-parsers'

const execAsync = promisify(exec)

export interface LintLayerConfig {
  command: string
  projectRoot: string
  timeoutMs?: number
}

export async function runLintLayer(config: LintLayerConfig): Promise<LayerResult> {
  if (!config.command.trim()) {
    return { name: 'lint', passed: true, errors: [], warnings: [], duration: 0, skipped: true }
  }

  const startedAt = new Date().toISOString()
  const start = Date.now()
  const timeout = config.timeoutMs ?? 60_000

  try {
    const result = await execAsync(config.command, { cwd: config.projectRoot, timeout })
    return {
      name: 'lint',
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
        name: 'lint',
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

    const output = (stdout.trim() ? stdout : stderr)
    return {
      name: 'lint',
      passed: false,
      errors: parseLintErrors(output),
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
}

function makeTimeoutError(timeoutMs: number): HarnessError {
  return {
    layer: 'lint',
    type: 'style',
    severity: 'high',
    fixable: false,
    message: `Lint timeout após ${timeoutMs}ms`,
    humanMessage: `Lint demorou mais de ${timeoutMs}ms`,
    file: '',
  }
}
