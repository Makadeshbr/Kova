// src/tracer.ts
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
function recordTrace(state, projectRoot) {
  const last = state.iterationHistory.at(-1);
  const trace = {
    id: generateId(),
    taskId: state.taskId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    status: state.status,
    totalIterations: state.currentIteration,
    totalDurationMs: Date.now() - new Date(state.startedAt).getTime(),
    totalTokens: state.totalTokens,
    finalScore: last ? last.harnessResult.score : 0,
    finalDecision: last ? last.decision.decision : "reject",
    errorFingerprint: computeFingerprint(last?.harnessResult.layers.flatMap((l) => l.errors) ?? []),
    iterations: state.iterationHistory
  };
  const tracesDir = join(projectRoot, ".kova", "traces");
  mkdirSync(tracesDir, { recursive: true });
  const filename = `${Date.now()}_${trace.id}.json`;
  writeFileSync(join(tracesDir, filename), JSON.stringify(trace, null, 2));
  return trace;
}
function queryTraces(projectRoot, filters = {}) {
  const tracesDir = join(projectRoot, ".kova", "traces");
  if (!existsSync(tracesDir)) return [];
  const traces = [];
  for (const file of readdirSync(tracesDir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const trace = JSON.parse(readFileSync(join(tracesDir, file), "utf-8"));
      if (matchesFilters(trace, filters)) traces.push(trace);
    } catch (error) {
      throw new Error(`Trace corrompido em ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return traces.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
function matchesFilters(trace, filters) {
  if (filters.status && trace.status !== filters.status) return false;
  if (filters.finalDecision && trace.finalDecision !== filters.finalDecision) return false;
  if (filters.taskId && trace.taskId !== filters.taskId) return false;
  if (filters.since && trace.timestamp < filters.since) return false;
  return true;
}
function computeFingerprint(errors) {
  if (errors.length === 0) return "clean";
  const keys = errors.map((e) => `${e.layer}:${e.file}:${e.rule ?? e.type}:${e.line ?? 0}`).sort().join("|");
  return djb2(keys).toString(36);
}
function djb2(s) {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) + hash ^ s.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash;
}
function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// src/metrics.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2, writeFileSync as writeFileSync2, readFileSync as readFileSync2 } from "fs";
import { join as join2, dirname } from "path";
var TOP_REASONS_LIMIT = 5;
function getMetrics(projectRoot) {
  const raw = readRaw(projectRoot);
  return computeMetrics(raw);
}
function updateMetrics(trace, projectRoot) {
  const raw = readRaw(projectRoot);
  raw.totalRuns += 1;
  if (trace.totalIterations === 1 && isPositiveDecision(trace.finalDecision)) {
    raw.firstPassCount += 1;
  }
  raw.iterationsSum += trace.totalIterations;
  raw.durationSum += trace.totalDurationMs;
  raw.tokensSum += trace.totalTokens;
  for (const iter of trace.iterations) {
    if (iter.decision.decision === "reject" || iter.decision.decision === "human_required") {
      const reason = iter.decision.reason;
      raw.rejectionReasons[reason] = (raw.rejectionReasons[reason] ?? 0) + 1;
    }
  }
  raw.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  writeRaw(raw, projectRoot);
}
function computeMetrics(raw) {
  const n = raw.totalRuns;
  const topReasons = Object.entries(raw.rejectionReasons).sort((a, b) => b[1] - a[1]).slice(0, TOP_REASONS_LIMIT).map(([reason, count]) => ({ reason, count }));
  return {
    totalRuns: n,
    firstPassRate: n === 0 ? 0 : Math.round(raw.firstPassCount / n * 100 * 10) / 10,
    avgIterations: n === 0 ? 0 : Math.round(raw.iterationsSum / n * 10) / 10,
    avgDurationMs: n === 0 ? 0 : Math.round(raw.durationSum / n),
    avgTokens: n === 0 ? 0 : Math.round(raw.tokensSum / n),
    topRejectionReasons: topReasons,
    lastUpdated: raw.lastUpdated
  };
}
function isPositiveDecision(decision) {
  return decision === "auto_apply" || decision === "suggest";
}
function readRaw(projectRoot) {
  const path = metricsPath(projectRoot);
  if (!existsSync2(path)) {
    return {
      totalRuns: 0,
      firstPassCount: 0,
      iterationsSum: 0,
      durationSum: 0,
      tokensSum: 0,
      rejectionReasons: {},
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  try {
    return JSON.parse(readFileSync2(path, "utf-8"));
  } catch (error) {
    throw new Error(`metrics.json corrompido: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function writeRaw(raw, projectRoot) {
  const path = metricsPath(projectRoot);
  mkdirSync2(dirname(path), { recursive: true });
  writeFileSync2(path, JSON.stringify(raw, null, 2));
}
function metricsPath(projectRoot) {
  return join2(projectRoot, ".kova", "metrics.json");
}
export {
  getMetrics,
  queryTraces,
  recordTrace,
  updateMetrics
};
