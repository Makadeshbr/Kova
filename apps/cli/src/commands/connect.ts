import { createInterface } from 'node:readline/promises'
import chalk from 'chalk'
import type { CliContext } from '../index'
import { positional, readOption } from '../args'
import { asProvider, configPath, updateLlmConfig, type KovaProviderName } from '../config'
import { credentialsPath, writeCredential } from '../credentials'
import { PROVIDER_CATALOG, catalogEntry } from '../provider-catalog'
import { resolveLlmSettings } from '../llm-settings'
import { selectOption } from '../ui/select'
import { loginCommand } from './auth'

type PromptFn = (label: string, fallback?: string) => Promise<string>
let activePrompt: PromptFn | null = null

export async function withConnectPrompt<T>(promptFn: PromptFn, fn: () => Promise<T>): Promise<T> {
  const previous = activePrompt
  activePrompt = promptFn
  try {
    return await fn()
  } finally {
    activePrompt = previous
  }
}

export async function connectCommand(args: string[], context: CliContext): Promise<number> {
  const [providerArg] = positional(args)
  const selected = providerArg ?? await chooseProvider()
  if (!selected) return 1

  if (selected === 'onauth') {
    return loginCommand(args, context)
  }

  const provider = asProvider(selected)
  if (!provider) {
    console.log(chalk.red(`Unknown provider: ${selected}`))
    return 2
  }

  const entry = catalogEntry(provider)
  if (!entry) {
    console.log(chalk.red(`Unknown provider: ${provider}`))
    return 2
  }

  const model = readOption(args, '--model') ?? await prompt(`Model`, entry.defaultModel)
  const baseUrl = readOption(args, '--base-url') ?? await promptBaseUrl(provider, entry.baseUrl)

  if (entry.kind === 'local') {
    updateLlmConfig({ provider, model, baseUrl })
    console.log(chalk.green(`Connected ${entry.label} (${model}).`))
    console.log(chalk.dim(`Config: ${configPath()}`))
    return 0
  }

  const apiKey = readOption(args, '--api-key') ?? await promptApiKey(entry.envKey)
  if (!apiKey) {
    console.log(chalk.red('API key is required for this provider.'))
    return 2
  }

  writeCredential({ provider, apiKey, baseUrl })
  updateLlmConfig({ provider, model, baseUrl })
  console.log(chalk.green(`Connected ${entry.label} (${model}).`))
  console.log(chalk.dim(`Credentials: ${credentialsPath()}`))
  console.log(chalk.dim(`Config: ${configPath()}`))
  return 0
}

export async function modelsCommand(args: string[], _context: CliContext): Promise<number> {
  const [providerArg] = positional(args)
  const settings = resolveLlmSettings()
  const provider = asProvider(providerArg) ?? settings.provider
  if (!provider) {
    console.log(chalk.yellow('No provider configured. Run kova connect first.'))
    return 1
  }

  const entry = catalogEntry(provider)
  const dynamic = await fetchModels(provider, settings.baseUrl, settings.apiKey)
  const models = dynamic.length > 0 ? dynamic : entry?.models ?? []
  if (models.length === 0) {
    console.log(chalk.bold(`${entry?.label ?? provider} models`))
    console.log(chalk.dim('No model list available for this provider.'))
    return 0
  }

  if (!args.includes('--list')) {
    const selected = await selectOption({
      title: `${entry?.label ?? provider} models`,
      initialValue: settings.model,
      options: models.map(model => ({
        value: model,
        label: `${provider}/${model}`,
        detail: model === settings.model ? 'current' : undefined,
      })),
    })
    if (selected) {
      updateLlmConfig({ provider, model: selected, baseUrl: settings.baseUrl })
      console.log(chalk.green(`Using ${provider}/${selected}`))
      return 0
    }
  }

  console.log(chalk.bold(`${entry?.label ?? provider} models`))
  for (const model of models) {
    const marker = settings.model === model ? chalk.green('*') : ' '
    console.log(`${marker} ${provider}/${model}`)
  }
  return 0
}

async function chooseProvider(): Promise<string | null> {
  const selected = await selectOption({
    title: 'Connect provider',
    options: PROVIDER_CATALOG.map(entry => ({
      value: entry.id,
      label: entry.label,
      detail: entry.kind === 'oauth' ? 'browser login' : entry.kind === 'local' ? 'local model' : 'API key',
    })),
  })
  if (selected) return selected

  console.log(chalk.bold('Connect provider'))
  PROVIDER_CATALOG.forEach((entry, index) => {
    console.log(`  ${index + 1}. ${entry.label}`)
  })
  const answer = await prompt('Select provider number or id')
  const index = Number(answer)
  if (Number.isInteger(index) && index >= 1 && index <= PROVIDER_CATALOG.length) {
    return PROVIDER_CATALOG[index - 1].id
  }
  return answer || null
}

async function promptBaseUrl(provider: KovaProviderName, fallback?: string): Promise<string | undefined> {
  if (provider !== 'openai-compatible') return fallback
  return await prompt('Base URL', fallback)
}

async function promptApiKey(envKey?: string): Promise<string> {
  const hint = envKey && process.env[envKey] ? `${envKey} env detected` : 'paste key'
  if (envKey && process.env[envKey]) return process.env[envKey] ?? ''
  return await prompt(`API key (${hint})`)
}

async function prompt(label: string, fallback?: string): Promise<string> {
  if (activePrompt) return activePrompt(label, fallback)

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const suffix = fallback ? ` [${fallback}]` : ''
    const answer = await rl.question(`${label}${suffix}: `)
    return answer.trim() || fallback || ''
  } finally {
    rl.close()
  }
}

async function fetchModels(provider: KovaProviderName, baseUrl?: string, apiKey?: string): Promise<string[]> {
  if (!baseUrl) return []
  if (provider === 'anthropic') return []
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    })
    if (!response.ok) return []
    const json = await response.json() as { data?: Array<{ id?: string }> }
    return json.data?.map(item => item.id).filter((id): id is string => Boolean(id)) ?? []
  } catch {
    return []
  }
}
