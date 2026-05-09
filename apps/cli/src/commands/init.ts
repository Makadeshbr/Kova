import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import chalk from 'chalk'
import type { CliContext } from '../index'
import { readOption } from '../args'

export async function initCommand(args: string[], context: CliContext): Promise<number> {
  const stack = readOption(args, '--stack', 'typescript')
  const kovaDir = join(context.cwd, '.kova')
  mkdirSync(join(kovaDir, 'memory'), { recursive: true })
  mkdirSync(join(kovaDir, 'tmp'), { recursive: true })
  mkdirSync(join(kovaDir, 'preview'), { recursive: true })

  const configPath = join(kovaDir, 'config.json')
  if (!existsSync(configPath)) {
    writeFileSync(configPath, JSON.stringify(defaultConfig(stack ?? 'typescript'), null, 2), 'utf-8')
  }

  console.log(chalk.green(`Initialized ${kovaDir}`))
  return 0
}

function defaultConfig(stack: string): unknown {
  return {
    project: { name: 'kova-project', stack },
    harness: { max_iterations: 5, default_mode: 'standard', layers: {} },
    decision: { auto_apply_threshold: 90, suggest_threshold: 70, max_repeated_errors: 2 },
    agent: { provider: 'anthropic', model: 'claude-sonnet-4-6', temperature: 0.2, fallback_provider: 'ollama', fallback_model: 'qwen2.5-coder' },
    context: { strategy: 'graph', max_tokens: 8000, include_rules: true, include_errors: true, include_learnings: true, max_files: 12 },
    memory: {
      max_project_learnings: 200,
      max_global_learnings: 500,
      promotion_threshold: 3,
      canonical_threshold: 8,
      contradiction_limit: 2,
      decay_experimental_days: 30,
      decay_verified_days: 120,
    },
    safe_zones: [],
    observability: { trace_retention_days: 14, log_level: 'info' },
  }
}
