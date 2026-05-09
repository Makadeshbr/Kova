import chalk from 'chalk'
import ora, { type Ora } from 'ora'
import type { ExecutionEvent } from '@kova/shared'
import type { RunnerFullLoopOutput, RunnerHarnessOutput } from '../runner'
import { printResultHeader } from './terminal'

// Module-level spinner — persists across streaming event calls
let spin: Ora | null = null
let iterationCount = 0

function stopSpin(): void {
  spin?.stop()
  spin = null
}

function startSpin(text: string, style: 'dots' | 'bouncingBar' | 'line' = 'dots'): void {
  stopSpin()
  spin = ora({ text, spinner: style, color: 'cyan' }).start()
}

export function printHarnessResult(result: RunnerHarnessOutput): void {
  const color = result.passed ? chalk.green : chalk.red
  console.log(color(`Harness ${result.passed ? 'passed' : 'failed'} — score ${result.score} — ${result.decision}`))
  console.log(chalk.dim(result.reason))

  if (result.errors.length > 0) {
    console.log(chalk.bold('\nErrors'))
    for (const error of result.errors) {
      const file = error.file ? chalk.dim(` ${error.file}`) : ''
      console.log(`  ${chalk.red(error.layer)} ${error.message}${file}`)
    }
  }
}

export function printFullLoopEvent(event: ExecutionEvent): void {
  switch (event.type) {
    case 'contract_created': {
      iterationCount = 0
      startSpin(chalk.dim('Contract created — starting agent...'))
      break
    }

    case 'state_changed': {
      const labels: Record<string, string> = {
        structuring: 'Building context...',
        planning: chalk.cyan('Planning — reading project...'),
        coding: iterationCount === 0 ? chalk.cyan('Generating code...') : chalk.yellow(`Fix attempt ${iterationCount + 1}...`),
        validating: chalk.yellow('Running harness (build · tests · rules)...'),
        deciding: chalk.dim('Deciding...'),
        applying: chalk.green('Applying changes...'),
      }
      if (event.state && labels[event.state]) startSpin(labels[event.state])
      break
    }

    case 'agent_completed': {
      const changes = event.changes ?? []
      if (changes.length === 0) { stopSpin(); break }
      stopSpin()
      const modeLabel = event.mode === 'fix' ? chalk.yellow('Fix') : chalk.cyan('Code')
      console.log(`${modeLabel} ${chalk.dim(`— ${changes.length} file(s)`)}`)
      for (const c of changes.slice(0, 6)) {
        const icon = c.type === 'create' ? chalk.green('+') : c.type === 'delete' ? chalk.red('−') : chalk.yellow('~')
        console.log(`  ${icon} ${chalk.dim(c.path)}`)
      }
      if (changes.length > 6) {
        console.log(chalk.dim(`  ... and ${changes.length - 6} more`))
      }
      break
    }

    case 'validation_completed': {
      stopSpin()
      const score = event.harnessResult?.score ?? 0
      const scoreColor = score >= 90 ? chalk.green : score >= 70 ? chalk.yellow : chalk.red
      const passed = event.harnessResult?.passed ? chalk.green('✓') : chalk.red('✗')
      console.log(`${passed} Harness ${scoreColor(`score ${score}`)}`)
      break
    }

    case 'decision_made': {
      const dec = event.decision?.decision
      if (dec === 'auto_apply')     console.log(chalk.green('✓ auto-apply'))
      else if (dec === 'suggest')   console.log(chalk.yellow('◎ suggest review'))
      else if (dec === 'reject')    { iterationCount++; console.log(chalk.red(`✗ reject — retrying (${iterationCount})`)) }
      else if (dec === 'human_required') console.log(chalk.yellow('⚠ human required'))
      break
    }

    case 'apply_completed': {
      spin?.succeed(chalk.green('Applied'))
      spin = null
      break
    }

    case 'iteration_recorded':
      break

    default:
      break
  }
}

export function printFullLoopResult(result: RunnerFullLoopOutput): void {
  stopSpin()
  printResultHeader(result.status, result.score, result.iterations, result.applied, result.handled)
  console.log(chalk.dim(result.reason))
  if (result.decision) console.log(chalk.dim(`Decision: ${result.decision}`))
  if (result.changedFiles?.length) {
    console.log(chalk.bold('\nChanged files'))
    for (const file of result.changedFiles) console.log(`  ${chalk.cyan(file)}`)
  }
  if (result.preview) {
    console.log(chalk.bold('\nPreview'))
    console.log(result.preview.slice(0, 2000))
  }
  console.log(chalk.dim('╰' + '─'.repeat(40)))
}

export function resultToJson(result: unknown): string {
  return JSON.stringify(result, null, 2)
}
