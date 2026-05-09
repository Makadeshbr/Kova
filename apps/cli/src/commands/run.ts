import chalk from 'chalk'
import type { CliContext } from '../index'
import { hasFlag, positional, readOption } from '../args'
import { stagedFiles } from '../git'
import { resolveLlmSettings } from '../llm-settings'
import { runFullLoop } from '../runner'
import { appendSessionEvent, createSession, readSession, sessionContext } from '../session'
import { printFullLoopEvent, printFullLoopResult } from '../ui/harness-display'

export async function runCommand(args: string[], context: CliContext): Promise<number> {
  const task = positional(args).join(' ').trim()
  if (!task) {
    console.error(chalk.red('Usage: kova run "task"'))
    return 2
  }

  const existing = readOption(args, '--session')
  const session = existing && !hasFlag(args, '--new-session')
    ? readSession(context.cwd, existing)
    : createSession(context.cwd, titleFromTask(task))
  if (existing && !session) {
    console.error(chalk.red(`Session not found: ${existing}`))
    return 1
  }

  appendSessionEvent(session, { kind: 'user', content: task })
  const llm = resolveLlmSettings()
  const result = await runFullLoop(context.cwd, task, stagedFiles(context.cwd), {
    provider: llm.provider,
    apiKey: llm.apiKey,
    model: llm.model,
    baseUrl: llm.baseUrl,
    sessionContext: sessionContext(session),
    autoApply: !hasFlag(args, '--review') && !hasFlag(args, '--no-apply'),
    onEvent: printFullLoopEvent,
  })
  appendSessionEvent(session, {
    kind: 'assistant',
    content: result.reason,
    status: result.status,
    score: result.score,
    iterations: result.iterations,
  })
  printFullLoopResult(result)
  console.log(chalk.dim(`Session: ${session.id}`))
  return result.applied ? 0 : 1
}

function titleFromTask(task: string): string {
  return task.replace(/\s+/g, ' ').slice(0, 60)
}
