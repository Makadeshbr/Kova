import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { LayerResult, HarnessError } from '@kova/shared'
import { parseBuildErrors } from './error-parsers'

const execAsync = promisify(exec)

export interface BuildLayerConfig {
  command: string
  projectRoot: string
  timeoutMs?: number
}

export async function runBuildLayer(config: BuildLayerConfig): Promise<LayerResult> {
  if (!config.command.trim()) {
    return { name: 'build', passed: true, errors: [], warnings: [], duration: 0, skipped: true }
  }

  const startedAt = new Date().toISOString()
  const start = Date.now()
  const timeout = config.timeoutMs ?? 30_000

  try {
    const result = await execAsync(config.command, { cwd: config.projectRoot, timeout })

    return {
      name: 'build',
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
    const err = error as { killed?: boolean; stderr?: string; stdout?: string; code?: number }
    const stdout = err.stdout ?? ''
    const stderr = err.stderr ?? ''
    const exitCode = err.code ?? 1

    if (err.killed) {
      return {
        name: 'build',
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

    // tsc escreve diagnósticos no stdout; outros compiladores usam stderr
    const output = (stderr.trim() ? stderr : stdout)
    const errors = parseBuildErrors(output)
    return {
      name: 'build',
      passed: false,
      errors,
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
    layer: 'build',
    type: 'syntax',
    severity: 'critical',
    fixable: false,
    message: `Build timeout após ${timeoutMs}ms`,
    humanMessage: `Build demorou mais de ${timeoutMs}ms`,
    file: '',
  }
}
