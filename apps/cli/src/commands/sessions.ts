import chalk from 'chalk'
import type { CliContext } from '../index'
import { positional } from '../args'
import { listSessions, readSession, sessionSummary } from '../session'

export async function sessionsCommand(args: string[], context: CliContext): Promise<number> {
  const [subcommand = 'list', id] = positional(args)
  if (subcommand === 'list') return list(context)
  if (subcommand === 'show') return show(context, id)

  console.log(chalk.red(`Unknown sessions command: ${subcommand}`))
  console.log(chalk.dim('Usage: kova sessions [list] | kova sessions show <id>'))
  return 2
}

function list(context: CliContext): number {
  const sessions = listSessions(context.cwd)
  if (sessions.length === 0) {
    console.log(chalk.dim('No sessions yet. Run kova or kova run "task" to create one.'))
    return 0
  }

  console.log(chalk.bold('Kova sessions'))
  for (const session of sessions) {
    console.log(sessionSummary(session))
  }
  return 0
}

function show(context: CliContext, id?: string): number {
  if (!id) {
    console.log(chalk.red('Usage: kova sessions show <id>'))
    return 2
  }

  const session = readSession(context.cwd, id)
  if (!session) {
    console.log(chalk.red(`Session not found: ${id}`))
    return 1
  }

  console.log(chalk.bold(`${session.id} ${session.title}`))
  console.log(chalk.dim(`Created ${session.createdAt}  Updated ${session.updatedAt}`))
  for (const event of session.events) {
    const status = event.status ? ` ${chalk.dim(`[${event.status}]`)}` : ''
    console.log(`\n${chalk.cyan(event.kind)} ${chalk.dim(event.timestamp)}${status}`)
    console.log(event.content)
  }
  return 0
}
