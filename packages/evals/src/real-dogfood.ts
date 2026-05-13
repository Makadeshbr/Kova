import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Agent, OpenAICompatibleProvider } from '@kova/agent'
import { CodeApplicationEngine } from '@kova/application'
import { detectStack } from '@kova/adapters'
import { ContextEngine } from '@kova/context'
import { ExecutionEngine } from '@kova/execution'
import { MemorySystem } from '@kova/memory'
import { HarnessOrchestrator } from '@kova/orchestrator'
import { DOGFOOD_CASES, setupDogfoodProject } from './dogfood-cases'

export interface DogfoodProviderConfig {
  kind: 'local' | 'cloud'
  provider: string
  baseUrl: string
  model: string
  apiKey?: string
}

export interface DogfoodReportRow {
  caseId: string
  provider: 'local' | 'cloud'
  status: string
  decision?: string
  validationConfidence?: string
  durationMs: number
}

export function readDogfoodProviderConfig(env: NodeJS.ProcessEnv = process.env): DogfoodProviderConfig[] {
  const localBaseUrl = env.KOVA_DOGFOOD_LOCAL_BASE_URL
  const localModel = env.KOVA_DOGFOOD_LOCAL_MODEL
  const cloudProvider = env.KOVA_DOGFOOD_CLOUD_PROVIDER
  const cloudApiKey = env.KOVA_DOGFOOD_CLOUD_API_KEY
  const cloudBaseUrl = env.KOVA_DOGFOOD_CLOUD_BASE_URL
  const cloudModel = env.KOVA_DOGFOOD_CLOUD_MODEL
  const missing = [
    ['KOVA_DOGFOOD_LOCAL_BASE_URL', localBaseUrl],
    ['KOVA_DOGFOOD_LOCAL_MODEL', localModel],
    ['KOVA_DOGFOOD_CLOUD_PROVIDER', cloudProvider],
    ['KOVA_DOGFOOD_CLOUD_API_KEY', cloudApiKey],
    ['KOVA_DOGFOOD_CLOUD_BASE_URL', cloudBaseUrl],
    ['KOVA_DOGFOOD_CLOUD_MODEL', cloudModel],
  ].filter(([, value]) => !value).map(([name]) => name)
  if (missing.length > 0) {
    throw new Error(`Dogfooding real exige provider local e cloud. Env vars ausentes: ${missing.join(', ')}`)
  }
  return [
    { kind: 'local', provider: 'local', baseUrl: localBaseUrl!, model: localModel!, apiKey: 'local' },
    { kind: 'cloud', provider: cloudProvider!, baseUrl: cloudBaseUrl!, model: cloudModel!, apiKey: cloudApiKey! },
  ]
}

export async function runRealDogfood(env: NodeJS.ProcessEnv = process.env): Promise<DogfoodReportRow[]> {
  const providers = readDogfoodProviderConfig(env)
  const rows: DogfoodReportRow[] = []
  for (const providerConfig of providers) {
    for (const testCase of DOGFOOD_CASES) {
      const root = mkdtempSync(join(tmpdir(), `kova-dogfood-${testCase.id}-`))
      const started = Date.now()
      try {
        const configuredCase = setupDogfoodProject(testCase.id, root)
        const provider = new OpenAICompatibleProvider({
          baseUrl: providerConfig.baseUrl,
          model: providerConfig.model,
          apiKey: providerConfig.apiKey,
        })
        const adapter = detectStack(root)
        const memory = new MemorySystem(root)
        const engine = new ExecutionEngine({
          agent: new Agent(provider, root),
          orchestrator: new HarnessOrchestrator(),
          contextEngine: new ContextEngine(memory, adapter),
          applicationEngine: new CodeApplicationEngine(root),
          memory,
        }, {
          projectRoot: root,
          maxIterations: 2,
          autoApply: false,
          skipPlan: true,
        })
        const state = await engine.run(configuredCase.task)
        const last = state.iterationHistory.at(-1)
        rows.push({
          caseId: configuredCase.id,
          provider: providerConfig.kind,
          status: state.status,
          decision: last?.decision.decision,
          validationConfidence: last?.harnessResult.validationConfidence,
          durationMs: Date.now() - started,
        })
      } finally {
        rmSync(root, { recursive: true, force: true })
      }
    }
  }
  return rows
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/real-dogfood.js')) {
  runRealDogfood()
    .then(rows => {
      const passed = rows.every(row => expectedDogfoodStatus(row))
      console.log(JSON.stringify({ passed, rows }, null, 2))
      if (!passed) process.exitCode = 1
    })
    .catch(err => {
      console.error(err instanceof Error ? err.message : String(err))
      process.exitCode = 1
    })
}

function expectedDogfoodStatus(row: DogfoodReportRow): boolean {
  if (row.caseId === 'safe-zone') return row.status === 'paused'
  return row.status === 'completed'
}
