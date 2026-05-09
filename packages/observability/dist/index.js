"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  getMetrics: () => getMetrics,
  queryTraces: () => queryTraces,
  recordTrace: () => recordTrace,
  updateMetrics: () => updateMetrics
});
module.exports = __toCommonJS(index_exports);

// src/tracer.ts
var import_node_fs = require("fs");
var import_node_path = require("path");
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
  const tracesDir = (0, import_node_path.join)(projectRoot, ".kova", "traces");
  (0, import_node_fs.mkdirSync)(tracesDir, { recursive: true });
  const filename = `${Date.now()}_${trace.id}.json`;
  (0, import_node_fs.writeFileSync)((0, import_node_path.join)(tracesDir, filename), JSON.stringify(trace, null, 2));
  return trace;
}
function queryTraces(projectRoot, filters = {}) {
  const tracesDir = (0, import_node_path.join)(projectRoot, ".kova", "traces");
  if (!(0, import_node_fs.existsSync)(tracesDir)) return [];
  const traces = [];
  for (const file of (0, import_node_fs.readdirSync)(tracesDir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const trace = JSON.parse((0, import_node_fs.readFileSync)((0, import_node_path.join)(tracesDir, file), "utf-8"));
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
var import_node_fs2 = require("fs");
var import_node_path2 = require("path");
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
  if (!(0, import_node_fs2.existsSync)(path)) {
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
    return JSON.parse((0, import_node_fs2.readFileSync)(path, "utf-8"));
  } catch (error) {
    throw new Error(`metrics.json corrompido: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function writeRaw(raw, projectRoot) {
  const path = metricsPath(projectRoot);
  (0, import_node_fs2.mkdirSync)((0, import_node_path2.dirname)(path), { recursive: true });
  (0, import_node_fs2.writeFileSync)(path, JSON.stringify(raw, null, 2));
}
function metricsPath(projectRoot) {
  return (0, import_node_path2.join)(projectRoot, ".kova", "metrics.json");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getMetrics,
  queryTraces,
  recordTrace,
  updateMetrics
});
