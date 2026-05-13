import type { HarnessError, LayerResult, ValidationCommandKind } from '@kova/shared'
import { runCommandInvocation } from '@kova/shared'
import { relative } from 'node:path'

export interface CommandLayerConfig {
  command: string
  projectRoot: string
  cwd?: string
  timeoutMs?: number
  signal?: AbortSignal
  onLine?: (line: string, stream: 'stdout' | 'stderr') => void
}

export async function runLayerCommand(
  config: CommandLayerConfig,
  layer: LayerResult['name'],
  kind: ValidationCommandKind,
  defaultTimeoutMs: number,
): Promise<{
  base: Pick<LayerResult, 'command' | 'cwd' | 'kind' | 'stdout' | 'stderr' | 'exitCode' | 'startedAt' | 'duration' | 'durationMs' | 'scope'>
  passed: boolean
  timedOut: boolean
}> {
  const result = await runCommandInvocation({
    command: config.command,
    workspaceRoot: config.projectRoot,
    cwd: config.cwd,
    kind,
    timeoutMs: config.timeoutMs ?? defaultTimeoutMs,
    signal: config.signal,
    onLine: config.onLine,
  })
  return {
    base: {
      command: result.command,
      cwd: result.cwd,
      kind: result.kind,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      startedAt: result.startedAt,
      duration: result.durationMs,
      durationMs: result.durationMs,
      scope: relative(config.projectRoot, result.cwd).replace(/\\/g, '/') || 'root',
    },
    passed: result.exitCode === 0,
    timedOut: result.timedOut,
  }
}

export function makePolicyError(layer: LayerResult['name'], message: string): HarnessError {
  return {
    layer,
    type: layer === 'lint' ? 'style' : 'syntax',
    severity: 'high',
    fixable: false,
    message,
    humanMessage: message,
    file: '',
  }
}
