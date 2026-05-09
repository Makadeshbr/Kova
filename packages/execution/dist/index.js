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
  ExecutionEngine: () => ExecutionEngine,
  contractViolationsToHarnessResult: () => contractViolationsToHarnessResult,
  createExecutionContract: () => createExecutionContract,
  createInitialState: () => createInitialState,
  shouldStop: () => shouldStop,
  structureTask: () => structureTask,
  validateContractChanges: () => validateContractChanges,
  withIteration: () => withIteration,
  withStatus: () => withStatus
});
module.exports = __toCommonJS(index_exports);

// src/execution-engine.ts
var import_orchestrator = require("@kova/orchestrator");
var import_decision = require("@kova/decision");

// src/state.ts
function createInitialState(task, maxIterations = 5) {
  return {
    taskId: task.id,
    status: "structuring",
    currentIteration: 0,
    maxIterations,
    iterationHistory: [],
    startedAt: (/* @__PURE__ */ new Date()).toISOString(),
    totalTokens: 0
  };
}
function withStatus(state, status) {
  return { ...state, status };
}
function withIteration(state, record) {
  return {
    ...state,
    currentIteration: state.currentIteration + 1,
    iterationHistory: [...state.iterationHistory, record],
    totalTokens: state.totalTokens + record.tokensUsed
  };
}

// src/stop-conditions.ts
var DEFAULT_TIMEOUT_MS = 12e4;
function shouldStop(state, lastDecision, options = {}) {
  if (state.status === "completed") return "success";
  if (state.status === "failed") return "aborted";
  const elapsed = Date.now() - new Date(state.startedAt).getTime();
  if (elapsed >= (options.timeoutMs ?? DEFAULT_TIMEOUT_MS)) return "timeout";
  if (!lastDecision) return null;
  if (lastDecision.decision === "auto_apply") return "success";
  if (lastDecision.decision === "suggest") return "success";
  if (lastDecision.decision === "human_required") return "human_required";
  const max = options.maxIterations ?? state.maxIterations;
  if (state.currentIteration >= max) return "max_iterations";
  return null;
}

// src/execution-contract.ts
var DEFAULT_FORBIDDEN_PATHS = [
  "node_modules/**",
  "dist/**",
  "out/**",
  ".git/**"
];
var DEFAULT_SAFE_ZONES = [
  ".env",
  ".env.*",
  ".github/**",
  "docker-compose*",
  "package.json",
  "*-lock.yaml",
  "*-lock.json",
  "*.lock"
];
var STACK_EXTENSIONS = {
  go: [".go", ".mod", ".sum", ".md", ".yaml", ".yml", ".sh", ".txt", ""],
  python: [".py", ".toml", ".txt", ".md", ".yaml", ".yml", ".sh", ".cfg", ".ini", ".pyi", ""],
  typescript: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".css", ".scss", ".less", ".html", ".yaml", ".yml", ".sh", ".env", ""],
  javascript: [".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".css", ".html", ".yaml", ".yml", ".sh", ""],
  rust: [".rs", ".toml", ".lock", ".md", ".yaml", ".yml", ".sh", ""],
  java: [".java", ".xml", ".gradle", ".kts", ".properties", ".md", ".yaml", ".yml", ".sh", ""],
  kotlin: [".kt", ".kts", ".xml", ".gradle", ".properties", ".md", ".yaml", ".yml", ""],
  csharp: [".cs", ".csproj", ".sln", ".xml", ".config", ".json", ".md", ".yaml", ""],
  ruby: [".rb", ".rake", ".gemspec", ".ru", ".md", ".yml", ".yaml", ""],
  php: [".php", ".json", ".xml", ".yaml", ".yml", ".md", ".env", ""],
  swift: [".swift", ".xcconfig", ".plist", ".md", ""],
  dart: [".dart", ".yaml", ".md", ""],
  cpp: [".cpp", ".cc", ".cxx", ".c", ".h", ".hpp", ".cmake", ".txt", ".md", ""],
  c: [".c", ".h", ".md", ".mk", ""],
  generic: []
};
function createExecutionContract(task) {
  return {
    id: `contract-${task.id}`,
    taskId: task.id,
    objective: task.objective,
    stackAdapter: task.stackAdapter,
    allowedPaths: inferAllowedPaths(task),
    forbiddenPaths: DEFAULT_FORBIDDEN_PATHS,
    safeZones: DEFAULT_SAFE_ZONES,
    allowedCommands: [],
    forbiddenCommands: ["rm -rf", "git reset --hard", "git clean -f", "git push", "sudo ", "curl |", "wget |"],
    validationCriteria: task.validationCriteria,
    requiresTests: task.type === "feature" || task.type === "bugfix" || task.type === "refactor",
    maxFilesChanged: task.impact === "high" ? 20 : task.impact === "medium" ? 12 : 6,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function validateContractChanges(changes, contract) {
  const violations = [];
  if (changes.length > contract.maxFilesChanged) {
    violations.push({
      severity: "medium",
      message: `Patch altera ${changes.length} arquivos; contrato permite ${contract.maxFilesChanged}`,
      file: "",
      rule: "max_files_changed"
    });
  }
  for (const change of changes) {
    if (matchesAny(change.path, contract.forbiddenPaths)) {
      violations.push({
        severity: "critical",
        message: `${change.path} est\xE1 em path proibido`,
        file: change.path,
        rule: "forbidden_path"
      });
      continue;
    }
    if (change.type !== "create" && matchesAny(change.path, contract.safeZones)) {
      violations.push({
        severity: "high",
        message: `${change.path} \xE9 safe zone \u2014 modifica\xE7\xE3o exige revis\xE3o humana`,
        file: change.path,
        rule: "safe_zone"
      });
    }
    if (!isStackCompatible(change.path, contract.stackAdapter)) {
      violations.push({
        severity: "high",
        message: `${change.path} n\xE3o \xE9 compat\xEDvel com stack ${contract.stackAdapter}`,
        file: change.path,
        rule: "stack_mismatch"
      });
    }
    if (!matchesAny(change.path, contract.allowedPaths)) {
      violations.push({
        severity: "high",
        message: `${change.path} est\xE1 fora do escopo permitido`,
        file: change.path,
        rule: "allowed_paths"
      });
    }
  }
  return violations;
}
function contractViolationsToHarnessResult(violations, iteration) {
  const errors = violations.map((v) => ({
    layer: "rules",
    type: v.rule === "safe_zone" ? "security" : "architecture",
    severity: v.severity,
    fixable: v.rule !== "safe_zone" && v.rule !== "forbidden_path",
    message: v.message,
    humanMessage: v.message,
    file: v.file,
    rule: v.rule
  }));
  const hasCritical = violations.some((v) => v.severity === "critical");
  const hasHigh = violations.some((v) => v.severity === "high");
  const score = hasCritical ? 0 : hasHigh ? 45 : 70;
  return {
    passed: !hasCritical && !hasHigh,
    score,
    duration: 0,
    iteration,
    layers: [{
      name: "rules",
      passed: errors.length === 0,
      errors,
      warnings: [],
      duration: 0,
      skipped: false
    }]
  };
}
function inferAllowedPaths(task) {
  if (task.affectedFiles.length === 0) return ["**"];
  const dirs = task.affectedFiles.map((p) => p.replace(/\\/g, "/")).map((p) => p.includes("/") ? `${p.slice(0, p.lastIndexOf("/"))}/**` : p);
  return [.../* @__PURE__ */ new Set([...task.affectedFiles, ...dirs])];
}
function isStackCompatible(path, stack) {
  const allowed = STACK_EXTENSIONS[stack] ?? STACK_EXTENSIONS.generic;
  if (allowed.length === 0) return true;
  if (path === "Dockerfile" || path.endsWith("/Dockerfile")) return true;
  if (path === "Makefile" || path.endsWith("/Makefile")) return true;
  const ext = extensionOf(path);
  return allowed.includes(ext);
}
function extensionOf(path) {
  const name = path.split("/").pop() ?? path;
  const idx = name.lastIndexOf(".");
  if (idx <= 0) return "";
  return name.slice(idx);
}
function matchesAny(path, patterns) {
  return patterns.some((pattern) => matchGlob(path.replace(/\\/g, "/"), pattern));
}
function matchGlob(path, pattern) {
  if (pattern === "**") return true;
  if (path === pattern) return true;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\0").replace(/\*/g, "[^/]+").replace(/\x00/g, ".*");
  return new RegExp(`^${escaped}$`).test(path);
}

// src/execution-engine.ts
var ExecutionEngine = class {
  constructor(deps, options) {
    this.deps = deps;
    this.options = options;
  }
  state = null;
  task = null;
  contract = null;
  paused = false;
  aborted = false;
  lastCheckpointId = "";
  abortController = null;
  async run(task) {
    this.task = task;
    this.contract = this.options.contract ?? createExecutionContract(task);
    this.paused = false;
    this.aborted = false;
    this.state = createInitialState(task, this.options.maxIterations);
    this.event({ type: "contract_created", contract: this.contract, message: "Execution contract created" });
    this.emit();
    return this.loop();
  }
  pause() {
    this.paused = true;
  }
  async resume() {
    if (!this.task || !this.state || this.state.status !== "paused") {
      throw new Error("Engine n\xE3o est\xE1 pausada");
    }
    this.paused = false;
    return this.loop();
  }
  async abort() {
    this.aborted = true;
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.lastCheckpointId) {
      await this.deps.applicationEngine.rollback(this.lastCheckpointId);
    }
    if (this.state) {
      this.state = withStatus(this.state, "failed");
      this.emit();
    }
  }
  async forceApply() {
    const last = this.state?.iterationHistory.at(-1);
    if (!last || !this.task) throw new Error("Sem changes para aplicar");
    const score = last.harnessResult.score;
    const result = await this.deps.applicationEngine.apply(last.changes, this.task.id, score);
    if (result.applied) {
      this.lastCheckpointId = result.checkpointId;
      this.state = withStatus(this.state, "completed");
      this.emit();
      return;
    }
    this.state = withStatus(this.state, "paused");
    this.emit();
  }
  getState() {
    return this.state;
  }
  emit() {
    if (!this.state) return;
    this.options.onStateChange?.(this.state);
    this.event({ type: "state_changed", state: this.state.status });
  }
  event(event) {
    this.options.onEvent?.({
      taskId: this.task?.id ?? this.state?.taskId ?? "unknown",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      iteration: event.iteration ?? this.state?.currentIteration,
      ...event
    });
  }
  async loop() {
    let lastDecision;
    while (!this.paused && !this.aborted) {
      const stopReason = shouldStop(this.state, lastDecision, this.options);
      if (stopReason) {
        if (stopReason === "max_iterations" || stopReason === "timeout") {
          this.state = withStatus(this.state, "failed");
          this.emit();
        } else if (stopReason === "human_required") {
          this.state = withStatus(this.state, "paused");
          this.emit();
        } else if (stopReason === "success" && lastDecision?.decision === "suggest") {
          this.state = withStatus(this.state, "paused");
          this.emit();
        }
        break;
      }
      try {
        lastDecision = await this.runIteration();
      } catch (e) {
        const isAbort = this.aborted || e instanceof Error && e.name === "AbortError";
        if (isAbort) break;
        throw e;
      }
    }
    const status = this.state.status;
    if (this.aborted) {
      this.state = withStatus(this.state, "failed");
      this.emit();
    } else if (this.paused && status !== "completed" && status !== "failed" && status !== "paused") {
      this.state = withStatus(this.state, "paused");
      this.emit();
    }
    if (this.state.status === "completed" || this.state.status === "failed" || this.state.status === "paused") {
      const proofPack = generateProofPack(this.state, this.contract ?? createExecutionContract(this.task));
      this.state = { ...this.state, proofPack };
      this.event({ type: "proof_pack", proofPack, message: "Proof Pack gerado" });
    }
    return this.state;
  }
  async runIteration() {
    this.abortController = new AbortController();
    if (this.aborted) {
      this.abortController.abort();
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }
    const task = this.task;
    const isFirst = this.state.currentIteration === 0;
    const iterStart = Date.now();
    const previousErrors = this.previousHarnessErrors();
    this.state = withStatus(this.state, "structuring");
    this.emit();
    const context = await this.deps.contextEngine.buildContext(task, this.options.projectRoot, { harnessErrors: previousErrors });
    this.event({
      type: "context_loaded",
      message: `${context.files.length} context files`,
      context: {
        files: context.files.map((file) => file.path),
        tokensUsed: context.tokensUsed,
        learningsCount: context.learnings.length
      }
    });
    if (this.aborted || this.abortController.signal.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }
    const agentOptions = {
      history: this.options.history,
      signal: this.abortController.signal,
      onToken: (token) => this.event({ type: "token", token }),
      onToolCall: (name, input) => {
        const preview = name === "write_file" ? String(input.path ?? "") : name === "run_command" ? String(input.command ?? "") : "";
        this.event({ type: "tool_call", toolName: name, toolInput: input, message: preview ? `${name}: ${preview}` : name });
      },
      onToolResult: (name, result) => {
        this.event({
          type: "tool_result",
          toolName: name,
          message: result.slice(0, 2e3),
          toolOutput: result.slice(0, 2e4)
        });
      }
    };
    if (isFirst && !this.options.skipPlan) {
      this.state = withStatus(this.state, "planning");
      this.emit();
      this.event({ type: "agent_started", mode: "plan", message: "Planning started" });
      await this.deps.agent.execute(task, context, "plan", agentOptions);
      this.event({ type: "stream_end", message: "" });
      this.event({ type: "agent_completed", mode: "plan", message: "Planning completed" });
    }
    this.state = withStatus(this.state, "coding");
    this.emit();
    const mode = isFirst ? this.options.skipPlan ? "unified" : "code" : "fix";
    this.event({ type: "agent_started", mode, message: `${mode} started` });
    const codeOutput = await this.deps.agent.execute(task, context, mode, agentOptions);
    this.event({ type: "stream_end", message: "" });
    this.event({ type: "agent_completed", mode, changes: codeOutput.changes, message: `${mode} completed` });
    this.state = withStatus(this.state, "validating");
    this.emit();
    this.event({ type: "validation_started", changes: codeOutput.changes, message: "Validation started" });
    const harnessResult = await this.validateOutput(codeOutput);
    this.event({ type: "validation_completed", harnessResult, message: "Validation completed" });
    this.state = withStatus(this.state, "deciding");
    this.emit();
    const decision = (0, import_decision.decide)(harnessResult, this.state.iterationHistory, {
      changes: codeOutput.changes,
      contract: this.contract ?? void 0
    });
    this.event({ type: "decision_made", decision, message: decision.reason });
    this.state = withIteration(this.state, buildRecord(this.state.currentIteration, codeOutput, harnessResult, decision, context, iterStart));
    this.emit();
    this.event({ type: "iteration_recorded", decision, harnessResult, changes: codeOutput.changes });
    if (decision.decision === "auto_apply") {
      if (codeOutput.changes.length === 0) {
        this.state = withStatus(this.state, "completed");
        this.emit();
        return decision;
      }
      if (this.options.autoApply === false) {
        this.state = withStatus(this.state, "paused");
        this.emit();
        return decision;
      }
      this.state = withStatus(this.state, "applying");
      this.emit();
      this.event({ type: "apply_started", changes: codeOutput.changes, message: "Apply started" });
      const applyResult = await this.deps.applicationEngine.apply(codeOutput.changes, task.id, harnessResult.score);
      if (applyResult.applied) {
        this.lastCheckpointId = applyResult.checkpointId;
        this.state = withStatus(this.state, "completed");
        this.emit();
        this.event({ type: "apply_completed", changes: codeOutput.changes, message: "Apply completed" });
      } else {
        this.state = withStatus(this.state, "paused");
        this.emit();
      }
    }
    return decision;
  }
  async validateOutput(output) {
    const iteration = this.state.currentIteration + 1;
    if (output.changes.length === 0) {
      return { score: 100, layers: [], passed: true, duration: 0, iteration };
    }
    const contract = this.contract ?? createExecutionContract(this.task);
    const violations = validateContractChanges(output.changes, contract);
    if (violations.length > 0) {
      return contractViolationsToHarnessResult(violations, iteration);
    }
    const config = (0, import_orchestrator.createOrchestratorConfig)(
      this.options.projectRoot,
      iteration,
      output.changes.map((c) => c.path)
    );
    const orchResult = await this.deps.orchestrator.run(output.changes, config);
    return orchResult.harnessResult;
  }
  previousHarnessErrors() {
    const last = this.state?.iterationHistory.at(-1);
    return last?.harnessResult.layers.flatMap((layer) => layer.errors) ?? [];
  }
};
function buildRecord(iteration, output, harnessResult, decision, context, startMs) {
  return {
    iteration,
    agentMode: output.mode,
    agentThought: output.thought,
    changes: output.changes,
    harnessResult,
    decision,
    duration: Date.now() - startMs,
    tokensUsed: output.tokensUsed + context.tokensUsed
  };
}
function generateProofPack(state, contract) {
  const lastIter = state.iterationHistory.at(-1);
  const changes = lastIter?.changes.map((c) => ({
    path: c.path,
    type: c.type,
    reason: "Modificado durante itera\xE7\xE3o"
  })) ?? [];
  const validationsRun = [];
  const validationsNotRun = [];
  const residualRisk = [];
  if (lastIter?.harnessResult) {
    for (const layer of lastIter.harnessResult.layers) {
      if (layer.skipped) {
        validationsNotRun.push({ kind: layer.name, reason: layer.warnings[0]?.message ?? "Skipped" });
      } else {
        validationsRun.push({
          kind: layer.name,
          command: layer.command,
          passed: layer.passed,
          skipped: false,
          note: layer.passed ? void 0 : `${layer.errors.length} erro(s)`
        });
      }
    }
  }
  return {
    objective: contract.objective,
    iterations: state.currentIteration,
    totalTokens: state.totalTokens,
    changes,
    analyzedFiles: [],
    // Será preenchido pelo ContextEngine se tivéssemos acesso aqui
    validationsRun,
    validationsNotRun,
    residualRisk,
    finalDecision: lastIter?.decision.decision ?? "suggest",
    finalScore: lastIter?.decision.score ?? 0,
    completedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// src/tsl.ts
var VALID_TYPES = ["feature", "bugfix", "refactor", "test", "docs"];
var VALID_IMPACTS = ["low", "medium", "high"];
async function structureTask(input, project) {
  if (isVagueInput(input)) {
    return invalid("input_vago", vagueSuggestions(project));
  }
  const first = await requestJson(project.llm, buildMessages(input, project));
  const parsed = parseTaskJson(first.thought);
  const task = parsed ? buildTask(parsed, input, project) : null;
  if (task) return validateTask(task);
  const retry = await requestJson(project.llm, repairMessages(input, first.thought));
  const repaired = parseTaskJson(retry.thought);
  const repairedTask = repaired ? buildTask(repaired, input, project) : null;
  if (repairedTask) return validateTask(repairedTask);
  return invalid("JSON malformado: failed_to_structure", []);
}
function buildMessages(input, project) {
  return [{
    role: "user",
    content: [
      `User input: ${input}`,
      `Project root: ${project.root}`,
      `Stack: ${project.stackAdapter}`,
      `Affected files: ${project.affectedFiles.join(", ") || "unknown"}`,
      project.context ? `Context:
${project.context}` : "",
      "Return only JSON."
    ].filter(Boolean).join("\n")
  }];
}
function repairMessages(input, previous) {
  return [{
    role: "user",
    content: [
      "The previous response was not valid task JSON.",
      `User input: ${input}`,
      `Previous response:
${previous}`,
      "Return only valid JSON with objective, constraints, nonGoals, validationCriteria, type and impact."
    ].join("\n")
  }];
}
async function requestJson(llm, messages) {
  return llm.generate(messages, { system: systemPrompt(), maxTokens: 1200 });
}
function systemPrompt() {
  return [
    "You are Kova Task Structuring Layer.",
    "Convert the user request into a JSON object for an autonomous coding agent.",
    'Schema: {"objective": string, "constraints": string[], "nonGoals": string[], "validationCriteria": string[], "type": "feature"|"bugfix"|"refactor"|"test"|"docs", "impact": "low"|"medium"|"high"}',
    "Respond ONLY with the JSON object. No markdown, no explanation.",
    "If uncertain about any field, use sensible defaults."
  ].join(" ");
}
function parseTaskJson(raw) {
  const json = extractJson(raw);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function extractJson(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match?.[1]?.trim()) return match[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : null;
}
function buildTask(parsed, input, project) {
  if (typeof parsed.objective !== "string") return null;
  if (!isStringArray(parsed.validationCriteria)) return null;
  return {
    id: project.id ?? `task-${Date.now()}`,
    objective: parsed.objective.trim(),
    constraints: toStringArray(parsed.constraints),
    nonGoals: toStringArray(parsed.nonGoals),
    validationCriteria: parsed.validationCriteria.map((v) => v.trim()).filter(Boolean),
    type: pickType(parsed.type),
    impact: inferImpact(input, parsed, project),
    affectedFiles: project.affectedFiles,
    stackAdapter: project.stackAdapter
  };
}
function validateTask(task) {
  if (!task.objective || task.objective.length < 10) {
    return invalid("Objetivo insuficiente", ["Inclua o resultado esperado da mudan\xE7a."]);
  }
  if (task.validationCriteria.length === 0) {
    return invalid("Crit\xE9rios ausentes", ["Inclua pelo menos um crit\xE9rio verific\xE1vel de valida\xE7\xE3o."]);
  }
  return { valid: true, task };
}
function inferImpact(input, parsed, project) {
  const text = `${input} ${parsed.objective} ${project.affectedFiles.join(" ")}`.toLowerCase();
  if (isDocsTask(text, parsed)) return "low";
  if (/(auth|login|senha|password|token|secret|security|seguran)/.test(text)) return "high";
  return VALID_IMPACTS.includes(parsed.impact) ? parsed.impact : "medium";
}
function isDocsTask(text, parsed) {
  return parsed.type === "docs" || /(docs|documenta|readme|coment[aá]rio|markdown)/.test(text);
}
function isVagueInput(input) {
  const words = input.trim().split(/\s+/).filter(Boolean);
  if (words.length < 3) return true;
  return /^(melhore|ajuste|arrume|fa[cç]a|resolver|fix|improve)$/i.test(input.trim());
}
function vagueSuggestions(project) {
  const file = project.affectedFiles[0] ? ` em ${project.affectedFiles[0]}` : "";
  return [`Descreva o objetivo concreto${file} e como validar o resultado.`];
}
function invalid(reason, suggestions) {
  return { valid: false, reason, suggestions };
}
function isStringArray(value) {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}
function toStringArray(value) {
  return isStringArray(value) ? value.map((v) => v.trim()).filter(Boolean) : [];
}
function pickType(value) {
  return VALID_TYPES.includes(value) ? value : "feature";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ExecutionEngine,
  contractViolationsToHarnessResult,
  createExecutionContract,
  createInitialState,
  shouldStop,
  structureTask,
  validateContractChanges,
  withIteration,
  withStatus
});
