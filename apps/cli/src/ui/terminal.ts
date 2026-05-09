import { homedir } from 'node:os'
import chalk from 'chalk'

export interface TerminalHeaderInfo {
  cwd: string
  provider: string | null
  model?: string
  sessionId?: string
  sessionTitle?: string
  auth?: string | null
  autoApply: boolean
  stagedCount: number
}

export function printTerminalHeader(info: TerminalHeaderInfo): void {
  const width = terminalWidth()
  const title = ' Kova ADE '
  const subtitle = 'agentic development environment'
  const model = modelPlain(info.provider, info.model)
  const project = shortPath(info.cwd)
  const mode = info.autoApply ? 'auto apply: harness score >= 90' : 'review mode: no file writes'

  console.log('')
  console.log(chalk.cyanBright(`╭${'─'.repeat(width - 2)}╮`))
  console.log(chalk.cyanBright('│') + center(chalk.bold(title), width - 2) + chalk.cyanBright('│'))
  console.log(chalk.cyanBright('│') + center(chalk.dim(subtitle), width - 2) + chalk.cyanBright('│'))
  console.log(chalk.cyanBright(`├${'─'.repeat(width - 2)}┤`))
  console.log(row('Model', info.provider ? chalk.green(model) : chalk.yellow('not configured'), width))
  console.log(row('Project', project, width))
  console.log(row('Session', `${info.sessionId ?? 'new'}${info.sessionTitle ? ` ${chalk.dim(info.sessionTitle)}` : ''}`, width))
  console.log(row('Harness', mode, width))
  console.log(row('Staged', info.stagedCount > 0 ? `${info.stagedCount} files` : 'none', width))
  if (info.auth) console.log(row('Auth', chalk.green(info.auth), width))
  console.log(chalk.cyanBright(`╰${'─'.repeat(width - 2)}╯`))
  if (!info.provider) printEmptyProviderCallout(true)
  console.log(chalk.dim(info.provider
    ? 'Ask anything, or use /models, /review, /status, /help.'
    : 'Start with /connect, or paste an API key through the provider menu.'))
  console.log('')
}

export function printStatusPanel(info: TerminalHeaderInfo): void {
  const width = terminalWidth()
  console.log('')
  console.log(chalk.dim(`╭─ Status ${'─'.repeat(Math.max(0, width - 11))}╮`))
  console.log(row('Provider', info.provider ? chalk.green(info.provider) : chalk.yellow('not configured'), width))
  if (info.model) console.log(row('Model', info.model, width))
  if (info.auth) console.log(row('Auth', chalk.green(info.auth), width))
  if (info.sessionId) console.log(row('Session', `${info.sessionId}${info.sessionTitle ? ` ${chalk.dim(info.sessionTitle)}` : ''}`, width))
  console.log(row('Harness', info.autoApply ? 'auto-apply after score >= 90' : 'review only, no file writes', width))
  console.log(row('Staged', info.stagedCount > 0 ? `${info.stagedCount} files` : 'none', width))
  console.log(chalk.dim(`╰${'─'.repeat(width - 2)}╯`))
}

export function printUserBlock(text: string): void {
  const width = terminalWidth()
  console.log('')
  console.log(chalk.whiteBright(`╭─ You ${'─'.repeat(Math.max(0, width - 8))}╮`))
  for (const line of wrap(text, width - 4)) {
    console.log(`${chalk.whiteBright('│')} ${line.padEnd(width - 4)} ${chalk.whiteBright('│')}`)
  }
  console.log(chalk.whiteBright(`╰${'─'.repeat(width - 2)}╯`))
}

export function printAssistantBlock(text: string): void {
  const width = terminalWidth()
  console.log('')
  console.log(chalk.cyanBright(`╭─ Kova ${'─'.repeat(Math.max(0, width - 9))}╮`))
  for (const paragraph of text.split('\n')) {
    for (const line of wrap(paragraph, width - 4)) {
      console.log(`${chalk.cyanBright('│')} ${line.padEnd(width - 4)} ${chalk.cyanBright('│')}`)
    }
  }
  console.log(chalk.cyanBright(`╰${'─'.repeat(width - 2)}╯`))
}

export function printWorking(autoApply: boolean): void {
  const mode = autoApply ? 'auto-apply enabled after harness approval' : 'review mode, no file writes'
  console.log(chalk.dim(`\n• Running Kova loop (${mode})`))
  console.log(chalk.dim('• Harness is the gate before any apply'))
}

export function promptLabel(): string {
  return `${chalk.cyanBright('›')} `
}

export function printBye(): void {
  console.log(chalk.dim('Session closed.'))
}

export function printHelpText(): void {
  console.log(`
${chalk.bold('Session commands')}
  /run <task>        Run the autonomous Kova loop for a task
  /review <task>     Run harness and show diff without applying
  /validate          Run harness validation
  /memory list       List project memory
  /metrics           Show local run metrics
  /init              Create .kova config
  /sessions          List terminal sessions
  /connect           Configure a provider with an arrow-key menu
  /models            Pick a model with an arrow-key menu
  /providers         List model providers
  /use <provider>    Persist provider/model for future runs
  /login             Sign in with OnAuth/OAuth
  /auth status       Show OnAuth session
  /logout            Remove OnAuth session
  /status            Show provider and staged files
  /clear             Clear the terminal
  /exit              Leave the session

Plain text is treated as a task, for example:
  add cursor pagination to the farms endpoint
`)
}

export function printResultHeader(status: string, score: number, iterations: number, applied: boolean, handled: boolean): void {
  const color = applied ? chalk.green : handled ? chalk.yellow : chalk.gray
  console.log('')
  console.log(color(`╭─ Kova ${status.toUpperCase()} · score ${score} · ${iterations} iter`))
}

function modelLabel(provider: string | null, model?: string): string {
  if (!provider) return chalk.yellow('not configured')
  return chalk.green(model ? `${provider} / ${model}` : provider)
}

function modelPlain(provider: string | null, model?: string): string {
  if (!provider) return 'not configured'
  return model ? `${provider} / ${model}` : provider
}

function shortPath(value: string): string {
  const home = homedir()
  return value.startsWith(home) ? `~${value.slice(home.length)}` : value
}

function terminalWidth(): number {
  return Math.max(58, Math.min(process.stdout.columns ?? 88, 100))
}

function row(label: string, value: string, width: number): string {
  const raw = `${chalk.dim(label.padEnd(9))} ${value}`
  const padding = Math.max(0, width - 4 - visibleLength(raw))
  return `${chalk.cyanBright('│')} ${raw}${' '.repeat(padding)} ${chalk.cyanBright('│')}`
}

function center(value: string, width: number): string {
  const length = visibleLength(value)
  const left = Math.max(0, Math.floor((width - length) / 2))
  const right = Math.max(0, width - length - left)
  return `${' '.repeat(left)}${value}${' '.repeat(right)}`
}

function printEmptyProviderCallout(primary = false): void {
  const width = terminalWidth()
  console.log('')
  console.log(chalk.yellow(`╭─ Setup ${'─'.repeat(Math.max(0, width - 10))}╮`))
  const line1 = primary ? 'No model connected yet. Next: /connect' : 'No model connected yet.'
  console.log(`${chalk.yellow('│')} ${line1.padEnd(width - 4)} ${chalk.yellow('│')}`)
  console.log(`${chalk.yellow('│')} ${'Use arrow keys to choose Ollama, OnAuth, OpenRouter, OpenAI, and more.'.padEnd(width - 4)} ${chalk.yellow('│')}`)
  console.log(chalk.yellow(`╰${'─'.repeat(width - 2)}╯`))
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (!current) {
      current = word
      continue
    }
    if (current.length + word.length + 1 > width) {
      lines.push(current)
      current = word
      continue
    }
    current += ` ${word}`
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function visibleLength(value: string): number {
  return value.replace(/\x1B\[[0-9;]*m/g, '').length
}
