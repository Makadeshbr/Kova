#!/usr/bin/env node
"use strict";

// src/index.ts
var import_node_fs3 = require("fs");
var import_node_path4 = require("path");
var import_adapters3 = require("@kova/adapters");
var import_orchestrator2 = require("@kova/orchestrator");
var import_decision = require("@kova/decision");

// src/graph-output.ts
var import_node_fs = require("fs");
var import_node_path = require("path");
var import_adapters = require("@kova/adapters");
var import_context = require("@kova/context");
var EXTERNAL_PREFIX = "external:";
async function buildGraphOutput(projectRoot) {
  const graph = new import_context.DependencyGraph();
  await graph.build(projectRoot, (0, import_adapters.detectStack)(projectRoot), { includeExternal: true });
  const modules = /* @__PURE__ */ new Map();
  const linkKeys = /* @__PURE__ */ new Set();
  const links = [];
  for (const [file, deps] of graph.fullGraph()) {
    const source = ensureModule(modules, file, projectRoot);
    for (const dep of deps) {
      const target = dep.startsWith(EXTERNAL_PREFIX) ? ensureExternal(modules, dep) : ensureModule(modules, dep, projectRoot);
      addLink(links, linkKeys, source.id, target.id);
    }
  }
  return { nodes: [...modules.values()], links };
}
function ensureModule(modules, filePath, projectRoot) {
  const id = moduleId(filePath);
  const existing = modules.get(id);
  if (existing) {
    existing.loc += countLoc(projectRoot, filePath);
    return existing;
  }
  const node = {
    id,
    name: id.split("/").pop() ?? id,
    path: filePath,
    type: "module",
    loc: countLoc(projectRoot, filePath)
  };
  modules.set(id, node);
  return node;
}
function ensureExternal(modules, dep) {
  const name = dep.slice(EXTERNAL_PREFIX.length);
  const id = `${EXTERNAL_PREFIX}${name}`;
  const existing = modules.get(id);
  if (existing) return existing;
  const node = { id, name, path: name, type: "external", loc: 50 };
  modules.set(id, node);
  return node;
}
function addLink(links, seen, source, target) {
  if (source === target) return;
  const key = `${source}->${target}`;
  if (seen.has(key)) return;
  seen.add(key);
  links.push({ source, target });
}
function moduleId(filePath) {
  const parts = filePath.replace(/\\/g, "/").split("/");
  if (parts[0] === "src" && parts[1]) return `src/${parts[1]}`;
  if (parts.length > 1) return parts[0];
  return parts[0];
}
function countLoc(projectRoot, filePath) {
  try {
    return (0, import_node_fs.readFileSync)((0, import_node_path.join)(projectRoot, filePath), "utf-8").split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  } catch {
    return 1;
  }
}

// src/full-loop.ts
var import_node_path3 = require("path");
var import_agent2 = require("@kova/agent");
var import_application = require("@kova/application");
var import_adapters2 = require("@kova/adapters");
var import_project = require("@kova/project");
var import_context2 = require("@kova/context");
var import_execution = require("@kova/execution");
var import_memory = require("@kova/memory");
var import_orchestrator = require("@kova/orchestrator");

// src/llm-provider.ts
var import_agent = require("@kova/agent");

// src/auth-session.ts
var import_node_fs2 = require("fs");
var import_node_os = require("os");
var import_node_path2 = require("path");
function readKovaAuthSession() {
  const file = authSessionPath();
  if (!(0, import_node_fs2.existsSync)(file)) return null;
  try {
    const session = JSON.parse((0, import_node_fs2.readFileSync)(file, "utf-8"));
    if (session.type !== "oauth" || session.provider !== "onauth" || !session.accessToken) return null;
    if (isExpired(session.expiresAt)) return null;
    return session;
  } catch {
    return null;
  }
}
function authSessionPath() {
  return process.env.KOVA_AUTH_FILE ?? (0, import_node_path2.join)(process.env.KOVA_HOME ?? (0, import_node_path2.join)((0, import_node_os.homedir)(), ".kova"), "auth.json");
}
function isExpired(expiresAt) {
  if (!expiresAt) return false;
  const time = Date.parse(expiresAt);
  if (Number.isNaN(time)) return true;
  return time <= Date.now() + 3e4;
}

// src/llm-provider.ts
var PROVIDERS = ["anthropic", "openai", "deepseek", "kimi", "ollama", "openrouter", "openai-compatible"];
function createProviderPair(request = {}) {
  const config = resolveProviderConfig(request);
  if (!config) return null;
  if (config.provider === "anthropic") {
    return {
      taskProvider: new import_agent.AnthropicProvider({ apiKey: config.apiKey, model: config.model }),
      codeProvider: new import_agent.AnthropicProvider({ apiKey: config.apiKey, model: config.model }),
      description: `anthropic:${config.model ?? "default"}`
    };
  }
  return createCompatiblePair(config);
}
function missingProviderReason() {
  return [
    "Nenhum provider LLM configurado.",
    "Rode kova connect para configurar um provider, kova login para OnAuth/OAuth, ou configure uma API key.",
    "Defina KOVA_LLM_PROVIDER com anthropic, openai, deepseek, kimi, openai-compatible ou ollama.",
    "Para modo gratuito local use KOVA_LLM_PROVIDER=ollama e Ollama em http://localhost:11434/v1."
  ].join(" ");
}
function createCompatiblePair(config) {
  return {
    taskProvider: new import_agent.OpenAICompatibleProvider(config),
    codeProvider: new import_agent.OpenAICompatibleProvider(config),
    description: `${config.provider}:${config.model}`
  };
}
function resolveProviderConfig(request) {
  const provider = pickProvider(request.provider);
  if (!provider) return null;
  const preset = presetFor(provider);
  const apiKey = request.apiKey ?? process.env.KOVA_LLM_API_KEY ?? preset.apiKey;
  if (!apiKey && provider !== "ollama") return null;
  const baseUrl = request.baseUrl ?? process.env.KOVA_LLM_BASE_URL ?? preset.baseUrl;
  if (!baseUrl && provider !== "anthropic") return null;
  return {
    provider,
    apiKey: apiKey ?? "ollama",
    model: request.model ?? process.env.KOVA_LLM_MODEL ?? preset.model,
    baseUrl
  };
}
function pickProvider(requested) {
  const envProvider = asProvider(process.env.KOVA_LLM_PROVIDER);
  if (requested && PROVIDERS.includes(requested)) return requested;
  if (envProvider) return envProvider;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) return "kimi";
  if (process.env.OLLAMA_BASE_URL) return "ollama";
  if (readKovaAuthSession()) return "openai-compatible";
  return null;
}
function asProvider(value) {
  return PROVIDERS.includes(value) ? value : null;
}
function presetFor(provider) {
  const session = readKovaAuthSession();
  if (provider === "anthropic") return envPreset("ANTHROPIC_API_KEY", "", "claude-sonnet-4-6");
  if (provider === "openai") return envPreset("OPENAI_API_KEY", "https://api.openai.com/v1", "gpt-4.1");
  if (provider === "deepseek") return envPreset("DEEPSEEK_API_KEY", "https://api.deepseek.com", "deepseek-v4-flash");
  if (provider === "openrouter") return envPreset("OPENROUTER_API_KEY", "https://openrouter.ai/api/v1", "anthropic/claude-sonnet-4.5");
  if (provider === "kimi") return kimiPreset();
  if (provider === "ollama") return envPreset("OLLAMA_API_KEY", process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1", "qwen2.5-coder:7b");
  if (session && !process.env.OPENAI_COMPATIBLE_API_KEY) {
    return {
      apiKey: session.accessToken,
      baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL ?? process.env.KOVA_ONAUTH_LLM_BASE_URL ?? session.baseUrl ?? "",
      model: process.env.KOVA_LLM_MODEL ?? session.model ?? "gpt-4.1"
    };
  }
  return envPreset("OPENAI_COMPATIBLE_API_KEY", process.env.OPENAI_COMPATIBLE_BASE_URL ?? "", "gpt-4.1");
}
function kimiPreset() {
  return {
    apiKey: process.env.KIMI_API_KEY ?? process.env.MOONSHOT_API_KEY ?? "",
    baseUrl: "https://api.moonshot.ai/v1",
    model: "kimi-k2.5"
  };
}
function envPreset(apiKeyName, baseUrl, model) {
  return { apiKey: process.env[apiKeyName] ?? "", baseUrl, model };
}

// src/full-loop.ts
async function runFullLoop(projectRoot, request, onEvent) {
  const providers = createProviderPair(request);
  if (!providers) return skipped(missingProviderReason());
  const profile = (0, import_project.buildProjectProfile)(projectRoot);
  const adapter = profile.confidence > 0 ? (0, import_adapters2.adapterFromProjectProfile)(profile) : (0, import_adapters2.detectStack)(projectRoot);
  const affectedFiles = request.affectedFiles.map((f) => toRelative(projectRoot, f)).filter(Boolean);
  let task;
  try {
    const structured = await (0, import_execution.structureTask)(request.objective, {
      root: projectRoot,
      stackAdapter: adapter.name,
      affectedFiles,
      context: buildTaskContext(request),
      llm: providers.taskProvider
    });
    task = structured.valid ? structured.task : buildFallbackTask(request.objective, adapter.name);
  } catch {
    task = buildFallbackTask(request.objective, adapter.name);
  }
  const agent = new import_agent2.Agent(providers.codeProvider, projectRoot);
  const applicationEngine = new import_application.CodeApplicationEngine(projectRoot);
  const engine = new import_execution.ExecutionEngine({
    agent,
    orchestrator: new import_orchestrator.HarnessOrchestrator(),
    contextEngine: new import_context2.ContextEngine(new import_memory.MemorySystem(projectRoot), adapter),
    applicationEngine
  }, { projectRoot, maxIterations: request.maxIterations ?? 5, autoApply: request.autoApply, onEvent });
  const state = await engine.run(task);
  const last = state.iterationHistory.at(-1);
  const applied = state.status === "completed";
  return {
    handled: true,
    applied,
    status: state.status === "paused" && last?.decision.decision === "auto_apply" ? "review_required" : state.status,
    reason: last?.decision.reason ?? `${providers.description}: status ${state.status}`,
    score: last?.harnessResult.score ?? 0,
    iterations: state.currentIteration,
    decision: last?.decision.decision,
    preview: !applied && last?.changes.length ? applicationEngine.preview(last.changes).slice(0, 4e4) : void 0,
    changedFiles: last?.changes.map((c) => c.path)
  };
}
function toRelative(projectRoot, file) {
  const rel = (0, import_node_path3.relative)(projectRoot, file);
  const p = rel && !rel.startsWith("..") ? rel : file;
  return p.replace(/\\/g, "/");
}
function buildTaskContext(request) {
  return [
    request.sessionContext ? `Relevant terminal session context:

${request.sessionContext.slice(0, 12e3)}` : "",
    request.proposedContent ? `Proposed content (treat as a draft, not trusted output):

${request.proposedContent.slice(0, 2e4)}` : ""
  ].filter(Boolean).join("\n\n");
}
function buildFallbackTask(objective, stackAdapter) {
  return {
    id: `task-${Date.now()}`,
    objective: objective.trim(),
    constraints: [],
    nonGoals: [],
    validationCriteria: [],
    type: "feature",
    impact: "low",
    affectedFiles: [],
    stackAdapter
  };
}
function skipped(reason) {
  return { handled: false, applied: false, status: "skipped", reason, score: 0, iterations: 0 };
}

// src/index.ts
var RESULT_MARKER = "__KOVA_HARNESS_RESULT_V1__:";
var GRAPH_RESULT_MARKER = "__KOVA_GRAPH_RESULT_V1__:";
var FULL_LOOP_RESULT_MARKER = "__KOVA_FULL_LOOP_RESULT_V1__:";
var FULL_LOOP_EVENT_MARKER = "__KOVA_FULL_LOOP_EVENT_V1__:";
function parseArgs() {
  const get = (flag) => process.argv.find((a) => a.startsWith(`${flag}=`))?.replace(`${flag}=`, "");
  const projectRoot = get("--project-root");
  if (!projectRoot) {
    process.stderr.write("kova-runner: --project-root obrigat\xF3rio\n");
    process.exit(2);
  }
  const modeArg = get("--mode");
  const mode = modeArg === "graph" || modeArg === "full-loop" ? modeArg : "validate";
  return { projectRoot, targetFile: get("--target-file"), proposedFile: get("--proposed-file"), taskFile: get("--task-file"), mode };
}
function applySpeculative(targetFile, proposedFile) {
  if (!(0, import_node_fs3.existsSync)(proposedFile) || !(0, import_node_fs3.existsSync)(targetFile)) return null;
  const originalContent = (0, import_node_fs3.readFileSync)(targetFile, "utf-8");
  const proposedContent = (0, import_node_fs3.readFileSync)(proposedFile, "utf-8");
  (0, import_node_fs3.mkdirSync)((0, import_node_path4.dirname)(targetFile), { recursive: true });
  (0, import_node_fs3.writeFileSync)(targetFile, proposedContent, "utf-8");
  return { originalContent, proposedContent };
}
function restoreSpeculative(targetFile, original) {
  (0, import_node_fs3.writeFileSync)(targetFile, original, "utf-8");
}
function cleanupProposed(proposedFile) {
  if (proposedFile && (0, import_node_fs3.existsSync)(proposedFile)) {
    try {
      (0, import_node_fs3.unlinkSync)(proposedFile);
    } catch {
    }
  }
}
function buildChanges(targetFile, state) {
  if (!targetFile || !state) return [];
  return [{
    path: targetFile,
    type: "modify",
    diff: state.proposedContent,
    before: state.originalContent
  }];
}
async function run() {
  const { projectRoot, targetFile, proposedFile, taskFile, mode } = parseArgs();
  if (mode === "graph") {
    const graph = await buildGraphOutput(projectRoot);
    process.stdout.write(`${GRAPH_RESULT_MARKER}${JSON.stringify(graph)}
`);
    process.exit(0);
  }
  if (mode === "full-loop") {
    const output = await runFullLoop(projectRoot, readFullLoopRequest(taskFile), (event) => {
      process.stdout.write(`${FULL_LOOP_EVENT_MARKER}${JSON.stringify(event)}
`);
    });
    process.stdout.write(`${FULL_LOOP_RESULT_MARKER}${JSON.stringify(output)}
`);
    process.exit(output.applied ? 0 : 1);
  }
  const commands = (0, import_adapters3.resolveCommands)((0, import_adapters3.detectStack)(projectRoot), projectRoot);
  const config = (0, import_orchestrator2.createOrchestratorConfig)(projectRoot, 1);
  const isSpeculative = Boolean(targetFile && proposedFile);
  let specState = null;
  if (isSpeculative && targetFile && proposedFile) {
    specState = applySpeculative(targetFile, proposedFile);
  }
  const changes = buildChanges(targetFile, specState);
  let exitCode = 0;
  try {
    const orchResult = await new import_orchestrator2.HarnessOrchestrator().run(changes, config, "standard");
    const harnessResult = orchResult.harnessResult;
    const decision = (0, import_decision.decide)(harnessResult, []);
    const score = (0, import_decision.calculateScore)(harnessResult);
    const output = {
      passed: decision.decision === "auto_apply" || decision.decision === "suggest",
      score,
      decision: decision.decision,
      reason: decision.reason,
      errors: harnessResult.layers.flatMap((l) => l.errors),
      buildCommand: commands.build,
      lintCommand: commands.lint,
      speculative: isSpeculative && specState !== null
    };
    process.stdout.write(`${RESULT_MARKER}${JSON.stringify(output)}
`);
    exitCode = output.passed ? 0 : 1;
  } finally {
    if (specState !== null && targetFile) {
      restoreSpeculative(targetFile, specState.originalContent);
    }
    cleanupProposed(proposedFile);
  }
  process.exit(exitCode);
}
function readFullLoopRequest(taskFile) {
  if (!taskFile || !(0, import_node_fs3.existsSync)(taskFile)) {
    throw new Error("kova-runner: --task-file obrigat\xC3\xB3rio para --mode=full-loop");
  }
  return JSON.parse((0, import_node_fs3.readFileSync)(taskFile, "utf-8"));
}
run().catch((err) => {
  if (process.argv.some((a) => a === "--mode=full-loop")) {
    const fallback2 = {
      handled: false,
      applied: false,
      status: "failed",
      reason: `kova-runner erro interno: ${err instanceof Error ? err.message : String(err)}`,
      score: 0,
      iterations: 0
    };
    process.stdout.write(`${FULL_LOOP_RESULT_MARKER}${JSON.stringify(fallback2)}
`);
    process.exit(0);
  }
  const fallback = {
    passed: true,
    score: 0,
    decision: "suggest",
    reason: `kova-runner erro interno: ${err instanceof Error ? err.message : String(err)}`,
    errors: [],
    buildCommand: "",
    lintCommand: "",
    speculative: false
  };
  process.stdout.write(`${RESULT_MARKER}${JSON.stringify(fallback)}
`);
  process.exit(0);
});
