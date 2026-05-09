import chalk from 'chalk'
import { MemorySystem } from '@kova/memory'
import type { Learning } from '@kova/shared'
import type { CliContext } from '../index'
import { readOption } from '../args'

export async function memoryCommand(args: string[], context: CliContext): Promise<number> {
  const [action, id] = args
  const memory = new MemorySystem(context.cwd)

  if (action === 'list') {
    const scope = readOption(args, '--scope') as Learning['scope'] | undefined
    const status = readOption(args, '--status') as Learning['status'] | undefined
    const learnings = memory.list({ scope, status })
    for (const learning of learnings) {
      console.log(`${chalk.cyan(learning.id)} ${chalk.bold(learning.status)} ${learning.scope} ${learning.description}`)
    }
    if (learnings.length === 0) console.log(chalk.dim('No learnings.'))
    return 0
  }

  if (action === 'inspect' && id) {
    const learning = memory.inspect(id)
    if (!learning) {
      console.error(chalk.red(`Learning not found: ${id}`))
      return 1
    }
    console.log(JSON.stringify(learning, null, 2))
    return 0
  }

  if (action === 'prune') {
    memory.prune()
    console.log(chalk.green('Memory pruned.'))
    return 0
  }

  if (action === 'remove' && id) {
    memory.remove(id)
    console.log(chalk.green(`Removed ${id}.`))
    return 0
  }

  console.error(chalk.red('Usage: kova memory list|inspect <id>|prune|remove <id>'))
  return 2
}
