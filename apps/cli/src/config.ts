import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export type KovaProviderName =
  | 'anthropic'
  | 'openai'
  | 'deepseek'
  | 'kimi'
  | 'ollama'
  | 'openrouter'
  | 'openai-compatible'

export interface KovaCliConfig {
  llm?: {
    provider?: KovaProviderName
    model?: string
    baseUrl?: string
  }
}

export const PROVIDERS: KovaProviderName[] = ['anthropic', 'openai', 'deepseek', 'kimi', 'ollama', 'openrouter', 'openai-compatible']

export function configPath(): string {
  return process.env.KOVA_CLI_CONFIG_FILE
    ?? join(process.env.KOVA_HOME ?? join(homedir(), '.kova'), 'config.json')
}

export function readCliConfig(): KovaCliConfig {
  const file = configPath()
  if (!existsSync(file)) return {}

  try {
    const config = JSON.parse(readFileSync(file, 'utf-8')) as KovaCliConfig
    return config && typeof config === 'object' ? config : {}
  } catch {
    return {}
  }
}

export function writeCliConfig(config: KovaCliConfig): void {
  const file = configPath()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, 'utf-8')
}

export function updateLlmConfig(update: NonNullable<KovaCliConfig['llm']>): KovaCliConfig {
  const config = readCliConfig()
  const next = { ...config, llm: { ...config.llm, ...update } }
  writeCliConfig(next)
  return next
}

export function asProvider(value?: string): KovaProviderName | null {
  return PROVIDERS.includes(value as KovaProviderName) ? value as KovaProviderName : null
}

export function configuredLlm(): NonNullable<KovaCliConfig['llm']> {
  return readCliConfig().llm ?? {}
}
