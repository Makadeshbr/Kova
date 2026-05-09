import chalk from 'chalk'
import type { CliContext } from '../index'
import { positional, readOption } from '../args'
import { asProvider, configPath, configuredLlm, PROVIDERS, updateLlmConfig } from '../config'
import { credentialProviders } from '../credentials'
import { catalogEntry } from '../provider-catalog'

export async function providersCommand(_args: string[], _context: CliContext): Promise<number> {
  const current = configuredLlm()
  const authed = new Set(credentialProviders())
  console.log(chalk.bold('Kova providers'))
  for (const provider of PROVIDERS) {
    const marker = current.provider === provider ? chalk.green('*') : ' '
    const credential = authed.has(provider) ? chalk.green('connected') : chalk.dim('not connected')
    console.log(`${marker} ${provider} ${credential}`)
  }
  console.log(chalk.dim(`Config: ${configPath()}`))
  if (current.provider) {
    console.log(`${chalk.dim('Current')} ${current.provider}${current.model ? `:${current.model}` : ''}`)
  }
  return 0
}

export async function useCommand(args: string[], _context: CliContext): Promise<number> {
  const [providerArg] = positional(args)
  const provider = asProvider(providerArg)
  if (!provider) {
    console.log(chalk.red('Usage: kova use <provider> [--model <model>] [--base-url <url>]'))
    console.log(chalk.dim(`Providers: ${PROVIDERS.join(', ')}`))
    return 2
  }

  const config = updateLlmConfig({
    provider,
    model: readOption(args, '--model') ?? catalogEntry(provider)?.defaultModel,
    baseUrl: readOption(args, '--base-url') ?? catalogEntry(provider)?.baseUrl,
  })

  console.log(chalk.green(`Using ${config.llm?.provider}${config.llm?.model ? `:${config.llm.model}` : ''}`))
  console.log(chalk.dim(`Saved to ${configPath()}`))
  return 0
}
