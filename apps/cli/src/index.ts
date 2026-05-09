#!/usr/bin/env node
import chalk from 'chalk'
import { runCommand } from './commands/run'
import { validateCommand } from './commands/validate'
import { memoryCommand } from './commands/memory'
import { initCommand } from './commands/init'
import { metricsCommand } from './commands/metrics'
import { ciCommand } from './commands/ci'
import { chatCommand, resumeCommand } from './commands/chat'
import { authCommand, loginCommand, logoutCommand } from './commands/auth'
import { providersCommand, useCommand } from './commands/providers'
import { sessionsCommand } from './commands/sessions'
import { connectCommand, modelsCommand } from './commands/connect'
import { loadProjectEnv } from './env'

export interface CliContext {
  cwd: string
}

type CommandHandler = (args: string[], context: CliContext) => Promise<number>

const commands: Record<string, CommandHandler> = {
  chat: chatCommand,
  run: runCommand,
  validate: validateCommand,
  memory: memoryCommand,
  init: initCommand,
  metrics: metricsCommand,
  ci: ciCommand,
  auth: authCommand,
  login: loginCommand,
  logout: logoutCommand,
  providers: providersCommand,
  connect: connectCommand,
  models: modelsCommand,
  use: useCommand,
  sessions: sessionsCommand,
  resume: resumeCommand,
}

async function main(argv: string[]): Promise<number> {
  loadProjectEnv(process.cwd())
  const [command, ...args] = argv
  if (!command) {
    return chatCommand([], { cwd: process.cwd() })
  }

  if (command === '--help' || command === '-h') {
    printHelp()
    return 0
  }

  const handler = commands[command]
  if (!handler) {
    console.error(chalk.red(`Unknown command: ${command}`))
    printHelp()
    return 2
  }

  return handler(args, { cwd: process.cwd() })
}

function printHelp(): void {
  console.log(`${chalk.bold('kova')} ${chalk.dim('standalone CLI')}

${chalk.bold('Usage')}
  kova
  kova chat
  kova run "task" [--review]
  kova resume <session-id>
  kova sessions [list]
  kova validate --staged [--mode full]
  kova memory list [--scope global] [--status verified]
  kova memory inspect <id>
  kova memory prune
  kova memory remove <id>
  kova init [--stack typescript]
  kova metrics [--json]
  kova ci
  kova login
  kova auth status
  kova logout
  kova providers
  kova connect [provider]
  kova models [provider] [--list]
  kova use <provider> [--model <model>] [--base-url <url>]

${chalk.dim('Running kova with no command opens an interactive session.')}
${chalk.dim('Use --review/--no-apply to run the harness and inspect changes without writing files.')}
`)
}

main(process.argv.slice(2))
  .then(code => {
    process.exitCode = code
  })
  .catch(error => {
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exitCode = 1
  })
