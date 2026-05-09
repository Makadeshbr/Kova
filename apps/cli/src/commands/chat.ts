import { createInterface } from 'node:readline/promises'
import chalk from 'chalk'
import type { CliContext } from '../index'
import { hasFlag, positional, readOption } from '../args'
import { stagedFiles } from '../git'
import { generateChatReply } from '../chat-provider'
import { resolveLlmSettings } from '../llm-settings'
import { runFullLoop } from '../runner'
import { appendSessionEvent, createSession, latestSession, readSession, sessionContext, type KovaSession } from '../session'
import { printFullLoopEvent, printFullLoopResult } from '../ui/harness-display'
import { printAssistantBlock, printBye, printHelpText, printStatusPanel, printTerminalHeader, printUserBlock, printWorking, promptLabel, type TerminalHeaderInfo } from '../ui/terminal'
import { initCommand } from './init'
import { memoryCommand } from './memory'
import { metricsCommand } from './metrics'
import { validateCommand } from './validate'
import { authCommand, currentAuthLabel, hasUsableAuthSession, loginCommand, logoutCommand } from './auth'
import { providersCommand, useCommand } from './providers'
import { sessionsCommand } from './sessions'
import { connectCommand, modelsCommand, withConnectPrompt } from './connect'

type SlashHandler = (args: string[], context: CliContext) => Promise<number>

const slashCommands: Record<string, SlashHandler> = {
  init: initCommand,
  memory: memoryCommand,
  metrics: metricsCommand,
  validate: validateCommand,
  auth: authCommand,
  login: loginCommand,
  logout: logoutCommand,
  providers: providersCommand,
  sessions: sessionsCommand,
  use: useCommand,
  connect: connectCommand,
  models: modelsCommand,
}

export async function chatCommand(args: string[], context: CliContext): Promise<number> {
  const session = resolveChatSession(args, context)
  if (!session) return 1
  const autoApply = !hasFlag(args, '--review') && !hasFlag(args, '--no-apply')

  const initialTask = positional(args).join(' ').trim()
  if (initialTask) {
    return runTask(initialTask, context, session, autoApply)
  }

  printBanner(context, session, autoApply)

  const terminal = Boolean(process.stdin.isTTY)
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal,
  })
  const ask = createLineReader(rl, terminal)

  while (true) {
    let rawLine = ''
    try {
      rawLine = await ask('kova> ')
    } catch {
      break
    }

    const line = rawLine.trim()
    if (!line) {
      continue
    }

    const shouldExit = await handleLine(line, context, session, autoApply, ask)
    if (shouldExit) break
  }

  rl.close()
  return 0
}

export async function resumeCommand(args: string[], context: CliContext): Promise<number> {
  const [id] = positional(args)
  if (!id) {
    console.log(chalk.red('Usage: kova resume <session-id>'))
    return 2
  }
  return chatCommand(['--session', id], context)
}

type AskFn = (label: string, fallback?: string) => Promise<string>

async function handleLine(line: string, context: CliContext, session: KovaSession, autoApply: boolean, ask: AskFn): Promise<boolean> {
  if (line === '/exit' || line === '/quit' || line === 'exit' || line === 'quit') {
    printBye()
    return true
  }

  if (line === '/help' || line === 'help') {
    printHelpText()
    return false
  }

  if (line === '/clear' || line === 'clear') {
    console.clear()
    return false
  }

  if (line === '/status' || line === 'status') {
    printStatus(context, session, autoApply)
    return false
  }

  if (line.startsWith('/')) {
    await runSlashCommand(line.slice(1), context, session, autoApply, ask)
    return false
  }

  if (isLocalStatusQuestion(line)) {
    printUserBlock(line)
    const reply = `Project: ${context.cwd}\nSession: ${session.id}\nUse /status for full local runtime state.`
    printAssistantBlock(reply)
    appendSessionEvent(session, { kind: 'user', content: line })
    appendSessionEvent(session, { kind: 'system', content: reply, status: 'local-status' })
    return false
  }

  if (isConversationalMessage(line)) {
    await handleConversationalMessage(line, context, session)
    return false
  }

  await runTask(line, context, session, autoApply)
  return false
}

async function runSlashCommand(input: string, context: CliContext, session: KovaSession, autoApply: boolean, ask: AskFn): Promise<void> {
  const [command, ...args] = tokenize(input)
  if (!command) return

  if (command === 'review') {
    const task = args.join(' ').trim()
    if (!task) {
      console.log(chalk.red('Usage: /review describe the task'))
      return
    }
    await runTask(task, context, session, false)
    return
  }

  if (command === 'run') {
    const review = args.includes('--review') || args.includes('--no-apply')
    const task = args.filter(arg => arg !== '--review' && arg !== '--no-apply').join(' ').trim()
    if (!task) {
      console.log(chalk.red('Usage: /run [--review] describe the task'))
      return
    }
    await runTask(task, context, session, review ? false : autoApply)
    return
  }

  const handler = slashCommands[command]
  if (!handler) {
    console.log(chalk.red(`Unknown slash command: /${command}`))
    printHelpText()
    return
  }

  if (command === 'connect') {
    await withConnectPrompt(ask, () => handler(args, context))
    return
  }

  await handler(args, context)
}

async function runTask(task: string, context: CliContext, session: KovaSession, autoApply: boolean): Promise<number> {
  printUserBlock(task)
  printWorking(autoApply)
  appendSessionEvent(session, { kind: 'user', content: task })
  const llm = resolveLlmSettings()
  const result = await runFullLoop(context.cwd, task, stagedFiles(context.cwd), {
    provider: llm.provider,
    apiKey: llm.apiKey,
    model: llm.model,
    baseUrl: llm.baseUrl,
    sessionContext: sessionContext(session),
    autoApply,
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
  console.log('')
  return result.applied ? 0 : 1
}

async function handleConversationalMessage(line: string, context: CliContext, session: KovaSession): Promise<void> {
  printUserBlock(line)
  appendSessionEvent(session, { kind: 'user', content: line })
  const reply = await generateChatReply(line, { cwd: context.cwd, sessionContext: sessionContext(session) })
  if (!reply.ok) {
    const message = [
      'No model response was generated.',
      reply.reason ? `Reason: ${reply.reason}` : '',
      '',
      'Start a reachable provider with /connect, or use /status to inspect the current configuration.',
    ].filter(Boolean).join('\n')
    printAssistantBlock(message)
    appendSessionEvent(session, { kind: 'system', content: message, status: 'model-unavailable' })
    return
  }
  printAssistantBlock(reply.text)
  appendSessionEvent(session, { kind: 'assistant', content: reply.text, status: 'chat' })
}

function isConversationalMessage(line: string): boolean {
  const normalized = normalizeText(line)
  // Only exact greetings are pure chat — everything else goes to the agent loop
  const greetings = new Set(['oi', 'ola', 'hello', 'hi', 'hey', 'bom dia', 'boa tarde', 'boa noite', 'obrigado', 'obrigada', 'thanks', 'valeu'])
  if (greetings.has(normalized)) return true
  // Very short messages that don't look like engineering tasks — keep threshold tight
  // so anything actionable flows to the agent loop
  if (looksLikeEngineeringTask(normalized)) return false
  return normalized.length < 8
}

function isLocalStatusQuestion(line: string): boolean {
  const normalized = normalizeText(line)
  return normalized === 'que projeto?' || normalized === 'qual projeto?' || normalized === 'onde estou?' || normalized === 'que projeto'
}

function looksLikeEngineeringTask(text: string): boolean {
  // Comprehensive detection — covers PT-BR and EN verbs, file references, and common task patterns
  return /(adicione|corrija|implemente|crie|altere|refatore|teste|valide|remova|delete|mova|renomeie|atualize|otimize|resolva|analise|verifique|configure|instale|execute|rode|builde|faca|faz|melhore|ajuste|arrume|mostre|liste|leia|escreva|gere|extraia|converta|migre|depure|debugue|fix|add|create|update|implement|refactor|remove|move|rename|optimize|resolve|analyze|verify|configure|install|run|build|generate|extract|convert|migrate|debug|deploy|test|write|read|show|list|edit|change|modify|check|review|apply|revert|rollback|merge|split|set|bug|erro|error|feature|endpoint|funcao|function|metodo|method|classe|class|modulo|module|arquivo|file|api|rota|route|pagina|page|componente|component|servico|service|banco|database|tabela|table|campo|field|coluna|column|indice|index|query|schema|model|controller|handler|middleware|hook|provider|adapter|factory|repository|entity|dto|interface|type|enum|const|var|import|export|package|depend|config|env|docker|ci|cd|pipeline|deploy|src\/|apps\/|packages\/|tests\/|spec\/|lib\/|cmd\/|internal\/|\.\w{1,5}$)/.test(text)
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function printBanner(context: CliContext, session: KovaSession, autoApply: boolean): void {
  printTerminalHeader(buildHeaderInfo(context, session, autoApply))
}

function printStatus(context: CliContext, session?: KovaSession, autoApply = true): void {
  printStatusPanel(buildHeaderInfo(context, session, autoApply))
}

function buildHeaderInfo(context: CliContext, session: KovaSession | undefined, autoApply: boolean): TerminalHeaderInfo {
  const provider = configuredProvider()
  const auth = currentAuthLabel()
  const llm = resolveLlmSettings()
  const staged = stagedFiles(context.cwd)
  return {
    cwd: context.cwd,
    provider,
    model: llm.model,
    auth,
    sessionId: session?.id,
    sessionTitle: session?.title,
    autoApply,
    stagedCount: staged.length,
  }
}

function configuredProvider(): string | null {
  const llm = resolveLlmSettings()
  if (llm.provider) return llm.provider
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek'
  if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) return 'kimi'
  if (process.env.OLLAMA_BASE_URL) return 'ollama'
  if (process.env.OPENAI_COMPATIBLE_API_KEY && process.env.OPENAI_COMPATIBLE_BASE_URL) return 'openai-compatible'
  if (process.env.KOVA_LLM_API_KEY) return 'kova-default'
  if (hasUsableAuthSession()) return 'openai-compatible:onAuth'
  return null
}

function resolveChatSession(args: string[], context: CliContext): KovaSession | null {
  const requested = readOption(args, '--session')
  if (requested && !hasFlag(args, '--new-session')) {
    const session = readSession(context.cwd, requested)
    if (!session) {
      console.error(chalk.red(`Session not found: ${requested}`))
      return null
    }
    return session
  }

  if (hasFlag(args, '--new-session')) {
    return createSession(context.cwd, readOption(args, '--title') ?? 'Kova session')
  }

  return latestSession(context.cwd) ?? createSession(context.cwd, readOption(args, '--title') ?? 'Kova session')
}

function createLineReader(rl: ReturnType<typeof createInterface>, terminal: boolean): AskFn {
  const queue: string[] = []
  const waiters: Array<(line: string) => void> = []
  let closed = false

  rl.on('line', line => {
    const waiter = waiters.shift()
    if (waiter) waiter(line)
    else queue.push(line)
  })
  rl.on('close', () => {
    closed = true
    while (waiters.length) waiters.shift()?.('')
  })

  return async (label: string, fallback?: string) => {
    const suffix = fallback ? ` [${fallback}]` : ''
    if (terminal) process.stdout.write(label === 'kova> ' ? promptLabel() : `${label}${suffix}: `)

    const line = queue.length > 0
      ? queue.shift() ?? ''
      : await new Promise<string>((resolve, reject) => {
        if (closed) {
          reject(new Error('input closed'))
          return
        }
        waiters.push(resolve)
      })

    return line.trim() || fallback || ''
  }
}

function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null

  for (const char of input) {
    if ((char === '"' || char === "'") && !quote) {
      quote = char
      continue
    }
    if (char === quote) {
      quote = null
      continue
    }
    if (/\s/.test(char) && !quote) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }
    current += char
  }

  if (current) tokens.push(current)
  return tokens
}
