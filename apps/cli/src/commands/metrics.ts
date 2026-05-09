import chalk from 'chalk'
import { getMetrics } from '@kova/observability'
import type { CliContext } from '../index'
import { hasFlag } from '../args'

export async function metricsCommand(args: string[], context: CliContext): Promise<number> {
  const metrics = getMetrics(context.cwd)
  if (hasFlag(args, '--json')) {
    console.log(JSON.stringify(metrics, null, 2))
    return 0
  }

  console.log(chalk.bold('Kova metrics'))
  console.log(`Runs: ${metrics.totalRuns}`)
  console.log(`First-pass rate: ${metrics.firstPassRate}%`)
  console.log(`Avg iterations: ${metrics.avgIterations}`)
  console.log(`Avg duration: ${metrics.avgDurationMs}ms`)
  console.log(`Avg tokens: ${metrics.avgTokens}`)
  if (metrics.topRejectionReasons.length > 0) {
    console.log(chalk.bold('\nTop rejection reasons'))
    for (const item of metrics.topRejectionReasons) {
      console.log(`  ${item.count}x ${item.reason}`)
    }
  }
  return 0
}
