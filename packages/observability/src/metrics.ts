import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { ExecutionTrace } from './tracer'

export interface KovaMetrics {
  totalRuns: number
  firstPassRate: number                                     // percentual: 0-100
  avgIterations: number
  avgDurationMs: number
  avgTokens: number
  topRejectionReasons: Array<{ reason: string; count: number }>
  lastUpdated: string
}

// Formato de armazenamento em disco (somas acumuladas para média incremental)
interface RawMetrics {
  totalRuns: number
  firstPassCount: number
  iterationsSum: number
  durationSum: number
  tokensSum: number
  rejectionReasons: Record<string, number>
  lastUpdated: string
}

const TOP_REASONS_LIMIT = 5

export function getMetrics(projectRoot: string): KovaMetrics {
  const raw = readRaw(projectRoot)
  return computeMetrics(raw)
}

export function updateMetrics(trace: ExecutionTrace, projectRoot: string): void {
  const raw = readRaw(projectRoot)

  raw.totalRuns += 1

  // first-pass: completou na primeira iteração com decisão positiva
  if (trace.totalIterations === 1 && isPositiveDecision(trace.finalDecision)) {
    raw.firstPassCount += 1
  }

  raw.iterationsSum += trace.totalIterations
  raw.durationSum += trace.totalDurationMs
  raw.tokensSum += trace.totalTokens

  // Acumula razões de rejeição de todas as iterações
  for (const iter of trace.iterations) {
    if (iter.decision.decision === 'reject' || iter.decision.decision === 'human_required') {
      const reason = iter.decision.reason
      raw.rejectionReasons[reason] = (raw.rejectionReasons[reason] ?? 0) + 1
    }
  }

  raw.lastUpdated = new Date().toISOString()
  writeRaw(raw, projectRoot)
}

function computeMetrics(raw: RawMetrics): KovaMetrics {
  const n = raw.totalRuns
  const topReasons = Object.entries(raw.rejectionReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_REASONS_LIMIT)
    .map(([reason, count]) => ({ reason, count }))

  return {
    totalRuns: n,
    firstPassRate: n === 0 ? 0 : Math.round((raw.firstPassCount / n) * 100 * 10) / 10,
    avgIterations: n === 0 ? 0 : Math.round((raw.iterationsSum / n) * 10) / 10,
    avgDurationMs: n === 0 ? 0 : Math.round(raw.durationSum / n),
    avgTokens: n === 0 ? 0 : Math.round(raw.tokensSum / n),
    topRejectionReasons: topReasons,
    lastUpdated: raw.lastUpdated,
  }
}

function isPositiveDecision(decision: string): boolean {
  return decision === 'auto_apply' || decision === 'suggest'
}

function readRaw(projectRoot: string): RawMetrics {
  const path = metricsPath(projectRoot)
  if (!existsSync(path)) {
    return {
      totalRuns: 0, firstPassCount: 0, iterationsSum: 0,
      durationSum: 0, tokensSum: 0, rejectionReasons: {},
      lastUpdated: new Date().toISOString(),
    }
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as RawMetrics
  } catch (error) {
    throw new Error(`metrics.json corrompido: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function writeRaw(raw: RawMetrics, projectRoot: string): void {
  const path = metricsPath(projectRoot)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(raw, null, 2))
}

function metricsPath(projectRoot: string): string {
  return join(projectRoot, '.kova', 'metrics.json')
}
