import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CliContext } from '../index'
import { readOption } from '../args'
import { runValidation } from '../runner'
import { resultToJson } from '../ui/harness-display'

export async function ciCommand(args: string[], context: CliContext): Promise<number> {
  const threshold = Number(readOption(args, '--threshold', String(readThreshold(context.cwd))))
  const result = await runValidation(context.cwd)
  const ok = result.score >= threshold
  console.log(resultToJson({ ...result, threshold, ciPassed: ok }))
  return ok ? 0 : 1
}

function readThreshold(projectRoot: string): number {
  try {
    const config = JSON.parse(readFileSync(join(projectRoot, '.kova', 'config.json'), 'utf-8')) as { decision?: { suggest_threshold?: number } }
    return config.decision?.suggest_threshold ?? 70
  } catch {
    return 70
  }
}
