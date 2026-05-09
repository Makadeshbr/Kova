import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { ExecutionState, IterationRecord, HarnessError } from '@kova/shared'

export interface ExecutionTrace {
  id: string
  taskId: string
  timestamp: string
  status: string
  totalIterations: number
  totalDurationMs: number
  totalTokens: number
  finalScore: number
  finalDecision: string
  errorFingerprint: string
  iterations: IterationRecord[]
}

export interface TraceFilters {
  status?: string
  finalDecision?: string
  taskId?: string
  since?: string  // ISO date string
}

export function recordTrace(state: ExecutionState, projectRoot: string): ExecutionTrace {
  const last = state.iterationHistory.at(-1)
  const trace: ExecutionTrace = {
    id: generateId(),
    taskId: state.taskId,
    timestamp: new Date().toISOString(),
    status: state.status,
    totalIterations: state.currentIteration,
    totalDurationMs: Date.now() - new Date(state.startedAt).getTime(),
    totalTokens: state.totalTokens,
    finalScore: last ? last.harnessResult.score : 0,
    finalDecision: last ? last.decision.decision : 'reject',
    errorFingerprint: computeFingerprint(last?.harnessResult.layers.flatMap(l => l.errors) ?? []),
    iterations: state.iterationHistory,
  }

  const tracesDir = join(projectRoot, '.kova', 'traces')
  mkdirSync(tracesDir, { recursive: true })

  // trace.id já tem componente aleatório — evita colisão de filename em testes rápidos
  const filename = `${Date.now()}_${trace.id}.json`
  writeFileSync(join(tracesDir, filename), JSON.stringify(trace, null, 2))

  return trace
}

export function queryTraces(projectRoot: string, filters: TraceFilters = {}): ExecutionTrace[] {
  const tracesDir = join(projectRoot, '.kova', 'traces')
  if (!existsSync(tracesDir)) return []

  const traces: ExecutionTrace[] = []

  for (const file of readdirSync(tracesDir)) {
    if (!file.endsWith('.json')) continue
    try {
      const trace = JSON.parse(readFileSync(join(tracesDir, file), 'utf-8')) as ExecutionTrace
      if (matchesFilters(trace, filters)) traces.push(trace)
    } catch (error) {
      throw new Error(`Trace corrompido em ${file}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return traces.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

function matchesFilters(trace: ExecutionTrace, filters: TraceFilters): boolean {
  if (filters.status && trace.status !== filters.status) return false
  if (filters.finalDecision && trace.finalDecision !== filters.finalDecision) return false
  if (filters.taskId && trace.taskId !== filters.taskId) return false
  if (filters.since && trace.timestamp < filters.since) return false
  return true
}

// Fingerprint determinístico: hash djb2 dos identificadores únicos de erro
// Permite detectar quando o mesmo conjunto de erros persiste entre runs
function computeFingerprint(errors: HarnessError[]): string {
  if (errors.length === 0) return 'clean'
  const keys = errors
    .map(e => `${e.layer}:${e.file}:${e.rule ?? e.type}:${e.line ?? 0}`)
    .sort()
    .join('|')
  return djb2(keys).toString(36)
}

function djb2(s: string): number {
  let hash = 5381
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i)
    hash = hash >>> 0  // unsigned 32-bit
  }
  return hash
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40)
}
