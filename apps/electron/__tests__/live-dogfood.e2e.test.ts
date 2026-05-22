import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { EngineManager } from '../src/main/engine-manager'
import type { StartTaskParams } from '../src/main/engine-manager'
import type { ExecutionEvent, ExecutionState, TaskDefinition } from '@kova/shared'

type LiveSettings = {
  defaultProvider?: string
  anthropicKey?: string
  openaiKey?: string
  deepseekKey?: string
  openrouterKey?: string
  kimiKey?: string
  geminiKey?: string
  xaiKey?: string
  openaiCompatibleKey?: string
  ollamaUrl?: string
  compatibleUrl?: string
  model?: string
  permissionMode?: StartTaskParams['permissionMode']
}

function liveSettingsPath(): string | null {
  const appData = process.env.APPDATA
  if (!appData) return null
  return join(appData, '@kova', 'electron', 'kova-settings.json')
}

function readLiveSettings(): LiveSettings | null {
  const path = liveSettingsPath()
  if (!path || !existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8')) as LiveSettings
}

function apiKeyFor(settings: LiveSettings): string | undefined {
  const provider = settings.defaultProvider
  if (provider === 'anthropic') return settings.anthropicKey
  if (provider === 'openai') return settings.openaiKey
  if (provider === 'deepseek') return settings.deepseekKey
  if (provider === 'openrouter') return settings.openrouterKey
  if (provider === 'kimi') return settings.kimiKey
  if (provider === 'gemini') return settings.geminiKey
  if (provider === 'xai') return settings.xaiKey
  if (provider === 'openai-compatible') return settings.openaiCompatibleKey
  return undefined
}

function makeParams(projectRoot: string, settings: LiveSettings): StartTaskParams {
  return {
    objective: 'Crie uma landing page completa e production-ready em HTML, CSS e JS puro para um restaurante japones premium chamado Koji. Gere arquivos reais index.html, styles.css e script.js com hero, menu, chef, reserva, localizacao, responsividade e CTA.',
    projectRoot,
    provider: settings.defaultProvider,
    apiKey: apiKeyFor(settings),
    baseUrl: settings.defaultProvider === 'ollama' ? settings.ollamaUrl
      : (settings.defaultProvider === 'lmstudio' || settings.defaultProvider === 'openai-compatible') ? settings.compatibleUrl
      : undefined,
    model: settings.model,
    mode: 'patch',
    maxIterations: 2,
    autoApply: false,
    permissionMode: settings.permissionMode ?? 'auto-review',
  }
}

function withLiveOverrides(settings: LiveSettings): LiveSettings {
  const provider = process.env.KOVA_LIVE_PROVIDER || settings.defaultProvider
  const model = process.env.KOVA_LIVE_MODEL || (provider === settings.defaultProvider ? settings.model : undefined)
  return { ...settings, defaultProvider: provider, model }
}

async function runWithTimeout(
  manager: EngineManager,
  promise: Promise<void>,
  ms: number,
  diagnostics: () => string,
): Promise<void> {
  let timer: NodeJS.Timeout | null = null
  try {
    await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(async () => {
          await manager.abort().catch(() => null)
          reject(new Error(`Live dogfood timed out after ${ms}ms.\n${diagnostics()}`))
        }, ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const runLive = process.env.KOVA_LIVE_DOGFOOD === '1'
const liveIt = runLive ? it : it.skip

describe('Kova live provider dogfood e2e', () => {
  let projectRoot: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'kova-live-dogfood-'))
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  liveIt('asks the configured provider to generate a real landing page in a temp project', async () => {
    const settings = readLiveSettings()
    expect(settings?.defaultProvider, 'Kova settings with a provider are required').toBeTruthy()
    const effectiveSettings = withLiveOverrides(settings!)

    const events: ExecutionEvent[] = []
    const states: ExecutionState[] = []
    const tasks: TaskDefinition[] = []
    const chatMessages: string[] = []
    const manager = new EngineManager()
    manager.setHandlers(
      state => states.push(state),
      task => tasks.push(task),
      message => chatMessages.push(message),
      () => undefined,
      message => chatMessages.push(message),
      event => events.push(event),
    )

    const params = makeParams(projectRoot, effectiveSettings)
    expect(apiKeyFor(effectiveSettings) || effectiveSettings.defaultProvider === 'ollama' || effectiveSettings.defaultProvider === 'lmstudio')
      .toBeTruthy()

    await runWithTimeout(
      manager,
      manager.sendMessage(params.objective, [], params),
      90_000,
      () => [
        `provider=${effectiveSettings.defaultProvider}`,
        `model=${effectiveSettings.model ?? 'auto'}`,
        `tasks=${tasks.length}`,
        `states=${states.map(state => state.status).join(' -> ') || 'none'}`,
        `events=${events.map(event => `${event.type}:${event.message ?? event.toolName ?? ''}`).slice(-30).join(' | ') || 'none'}`,
        `messages=${chatMessages.join(' | ') || 'none'}`,
      ].join('\n'),
    )

    const changedFiles = states.flatMap(state => state.iterationHistory.flatMap(iter => iter.changes.map(change => change.path)))
    const transcript = chatMessages.join('\n')
    if (!events.some(event => event.type === 'tool_call')) {
      console.info('live dogfood diagnostics', [
        `provider=${effectiveSettings.defaultProvider}`,
        `model=${effectiveSettings.model ?? 'auto'}`,
        `tasks=${tasks.length}`,
        `states=${states.map(state => state.status).join(' -> ') || 'none'}`,
        `events=${events.map(event => `${event.type}:${event.message ?? event.toolName ?? ''}`).join(' | ') || 'none'}`,
        `messages=${transcript || 'none'}`,
      ].join('\n'))
    }
    expect(tasks[0]?.objective).toContain('landing page')
    expect(transcript).not.toContain('Provider not configured')
    expect(events.some(event => event.type === 'tool_call')).toBe(true)
    expect(events.some(event => event.type === 'stream_end')).toBe(true)
    expect(changedFiles.length).toBeGreaterThan(0)
    expect(changedFiles.some(path => /index\.(html|tsx|jsx|ts|js)$/i.test(path))).toBe(true)
    expect(states.at(-1)?.status).not.toBe('failed')
  }, 180_000)
})
