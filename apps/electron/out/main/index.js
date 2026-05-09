"use strict";
const electron = require("electron");
const path = require("node:path");
const node_fs = require("node:fs");
const agent = require("@kova/agent");
const application = require("@kova/application");
const context = require("@kova/context");
const execution = require("@kova/execution");
const orchestrator = require("@kova/orchestrator");
const memory = require("@kova/memory");
const adapters = require("@kova/adapters");
const project = require("@kova/project");
const PRESET_URLS = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com",
  openrouter: "https://openrouter.ai/api/v1",
  kimi: "https://api.moonshot.ai/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  ollama: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
  lmstudio: "http://localhost:1234/v1"
};
const LOCAL_PROVIDERS = /* @__PURE__ */ new Set(["ollama", "lmstudio", "openai-compatible"]);
const PRESET_MODELS = {
  openai: "gpt-4.1",
  deepseek: "deepseek-v4-flash",
  kimi: "kimi-k2.5",
  gemini: "gemini-2.5-flash",
  openrouter: "anthropic/claude-sonnet-4.5"
};
const INVALID_MODEL_VALUES = /* @__PURE__ */ new Set([
  "deepseek",
  "DeepSeek",
  "openai",
  "OpenAI",
  "anthropic",
  "Anthropic",
  "gemini",
  "Gemini",
  "kimi",
  "Kimi",
  "ollama",
  "Ollama",
  "openrouter",
  "OpenRouter",
  "default",
  "modelo",
  "model",
  ""
]);
async function autoResolveModel(baseUrl, configured, onDetected) {
  if (configured) return configured;
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, { signal: AbortSignal.timeout(4e3) });
    if (!res.ok) return void 0;
    const data = await res.json();
    const first = data.data?.[0]?.id;
    if (first) onDetected?.(first);
    return first;
  } catch {
    return void 0;
  }
}
async function buildProvider(params, onModelDetected) {
  const provider = params.provider ?? "anthropic";
  const apiKey = params.apiKey ?? "";
  if (provider === "anthropic") {
    if (!apiKey) return null;
    return new agent.AnthropicProvider({ apiKey, model: params.model });
  }
  const baseUrl = params.baseUrl ?? PRESET_URLS[provider] ?? "";
  if (!baseUrl) return null;
  if (!apiKey && !LOCAL_PROVIDERS.has(provider)) return null;
  const fallback = PRESET_MODELS[provider] ?? "";
  const rawModel = params.model?.trim() ?? "";
  const safeConfigured = INVALID_MODEL_VALUES.has(rawModel) ? void 0 : rawModel || void 0;
  const resolved = await autoResolveModel(baseUrl, safeConfigured, onModelDetected);
  const model = resolved || fallback;
  if (!model) return null;
  if (resolved && onModelDetected) onModelDetected(model);
  return new agent.OpenAICompatibleProvider({ apiKey: apiKey || provider, baseUrl, model });
}
const SKIP_DIRS = /* @__PURE__ */ new Set(["node_modules", ".git", "dist", "out", ".next", "__pycache__", ".cache", "vendor", "target", "build", "coverage"]);
function isProtectedContextPath(path$1) {
  const name = path.basename(path$1.replace(/\\/g, "/")).toLowerCase();
  if (name === ".env.example") return false;
  return name === ".env" || name.startsWith(".env.") || name.endsWith(".env") || name.includes(".env.");
}
function findFileByName(projectRoot, filename, depth = 0) {
  if (depth > 6) return null;
  let entries;
  try {
    entries = node_fs.readdirSync(projectRoot);
  } catch {
    return null;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name) || name.startsWith(".")) continue;
    const full = path.join(projectRoot, name);
    try {
      const st = node_fs.statSync(full);
      if (!st.isDirectory() && name === filename) return full;
      if (st.isDirectory()) {
        const found = findFileByName(full, filename, depth + 1);
        if (found) return found;
      }
    } catch {
    }
  }
  return null;
}
function extractAtTokens(message) {
  const tokens = [];
  for (const match of message.matchAll(/@(?:"([^"]+)"|'([^']+)'|([^\s,;]+))/g)) {
    const raw = match[1] ?? match[2] ?? match[3] ?? "";
    const token = raw.replace(/[)\].!?]+$/g, "").trim();
    if (token && !tokens.includes(token)) tokens.push(token);
  }
  return tokens;
}
function resolveAtRefs(message, projectRoot) {
  const refs = [];
  const denied = [];
  const missing = [];
  const seen = /* @__PURE__ */ new Set();
  for (const token of extractAtTokens(message)) {
    if (seen.has(token)) continue;
    seen.add(token);
    let fullPath = path.join(projectRoot, token);
    if (!node_fs.existsSync(fullPath)) {
      fullPath = findFileByName(projectRoot, path.basename(token)) ?? "";
    }
    if (!fullPath || !node_fs.existsSync(fullPath)) {
      missing.push(token);
      continue;
    }
    try {
      const rel = path.relative(projectRoot, fullPath).replace(/\\/g, "/");
      if (isProtectedContextPath(rel)) {
        denied.push({ name: token, path: rel, reason: "Arquivo protegido: segredos nao sao anexados ao contexto." });
        continue;
      }
      const content = node_fs.readFileSync(fullPath, "utf-8").slice(0, 8e3);
      refs.push({ name: token, path: rel, content });
    } catch {
    }
  }
  const attachment = refs.length > 0 ? "\n\nReferenced files:\n" + refs.map((r) => `\`\`\`
// @${r.path}
${r.content}
\`\`\``).join("\n\n") : "";
  const deniedText = denied.length > 0 ? "\n\nDenied references:\n" + denied.map((r) => `- @${r.path}: ${r.reason}`).join("\n") : "";
  return { userContent: message + attachment + deniedText, refs, denied, missing };
}
function chatOnlyPrompt(stack) {
  return `You are Kova, a senior software engineering assistant.
Stack adapter: ${stack}.

This is Chat Mode:
- Reply in text only.
- Do not call tools.
- Use provided referenced files and project context if present.
- If a referenced file was denied, explain the security reason briefly.
- Do not carry out older tasks unless the user explicitly asks for them again.

Respond in the language the user writes in.`;
}
function reviewOnlyPrompt(stack) {
  return `You are Kova in Review Mode, a read-only senior code reviewer.
Stack adapter: ${stack}.

Allowed behavior:
- You may inspect files with read_file and list_files.
- You must not edit, create, delete, apply patches, or run shell commands.
- Focus on concrete findings, risks, missing validation, and next steps.
- Do not carry out older tasks unless the user explicitly asks for them again.

Respond in the user's language.`;
}
function planOnlyPrompt(stack) {
  return `You are Kova in Plan Mode, a read-only senior engineering planner.
Stack adapter: ${stack}.

Allowed behavior:
- You may inspect files with read_file and list_files.
- You must not edit, create, delete, apply patches, or run shell commands.
- Use existing project structure, instructions, and local conventions as the source of truth.
- Prefer a small, safe implementation plan over broad refactors.

Respond in the user's language with:
1. Goal
2. Relevant files and why
3. Proposed steps
4. Validation commands to run later
5. Risks or questions`;
}
function inferRunMode(message, explicit) {
  if (explicit) return explicit;
  const text = message.trim().toLowerCase();
  if (/^\/plan(\s|$)/i.test(message.trim())) return "plan";
  if (/\b(review|revise|analise|audit|audite|explique|explain)\b/.test(text)) return "review";
  if (/\b(crie|criar|implemente|implementar|altere|alterar|corrija|fix|refatore|refactor|adicione|add|remova|delete)\b/.test(text)) return "patch";
  return "chat";
}
function shouldShortCircuitDeniedRefs(message, resolution) {
  if (resolution.denied.length === 0 || resolution.refs.length > 0) return false;
  const withoutRefs = message.replace(/@(?:"([^"]+)"|'([^']+)'|([^\s,;]+))/g, "").trim().toLowerCase();
  if (!withoutRefs) return true;
  return /^(leia|ler|read|explique|explain|mostre|show|abrir|open)\b/.test(withoutRefs);
}
function deniedRefsMessage(resolution) {
  const files = resolution.denied.map((ref) => `@${ref.path}`).join(", ");
  return `Nao posso ler ${files}. Arquivos de ambiente podem conter segredos e nao sao anexados ao contexto. Use um arquivo exemplo, como @.env.example, se quiser compartilhar variaveis sem valores sensiveis.`;
}
function contextBudgetFor(provider) {
  const limit = provider.capabilities().contextTokenLimit;
  return Math.min(2e4, Math.max(2e3, Math.floor(limit * 0.35)));
}
function estimateMessagesTokens(messages) {
  return context.estimateTokens(messages.map((m) => `${m.role}: ${m.content}`).join("\n\n"));
}
class EngineManager {
  constructor(providerFactory = buildProvider) {
    this.providerFactory = providerFactory;
  }
  engine = null;
  sessionAbort = null;
  onUpdate = null;
  onStructured = null;
  onError = null;
  onModelDetected = null;
  onChatResponse = null;
  onExecutionEvent = null;
  setHandlers(onUpdate, onStructured, onError, onModelDetected, onChatResponse, onExecutionEvent) {
    this.onUpdate = onUpdate;
    this.onStructured = onStructured;
    this.onError = onError;
    this.onModelDetected = onModelDetected;
    this.onChatResponse = onChatResponse;
    this.onExecutionEvent = onExecutionEvent;
  }
  emit(e) {
    this.onExecutionEvent?.({ taskId: "chat", timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...e });
  }
  async sendMessage(message, history, params) {
    return this.sendMessageWithMode(message, history, params);
  }
  async sendMessageWithMode(message, history, params) {
    this.sessionAbort?.abort();
    this.sessionAbort = new AbortController();
    if (this.engine) {
      await this.engine.abort().catch(() => null);
      this.engine = null;
    }
    const { projectRoot } = params;
    const profile = project.buildProjectProfile(projectRoot);
    const adapter = profile.confidence > 0 ? adapters.adapterFromProjectProfile(profile) : adapters.detectStack(projectRoot);
    const mode = inferRunMode(message, params.mode);
    const rawContent = mode === "plan" ? message.trim().replace(/^\/plan\s*/i, "").trim() : message;
    const resolution = resolveAtRefs(rawContent, projectRoot);
    if (resolution.refs.length) this.emit({ type: "tool_result", message: `@ ${resolution.refs.map((r) => r.path).join(", ")}` });
    if (resolution.denied.length) {
      for (const ref of resolution.denied) this.emit({ type: "context_ref_denied", message: ref.reason, toolInput: { path: ref.path } });
    }
    if (resolution.missing.length) this.emit({ type: "tool_result", message: `@ nao encontrado: ${resolution.missing.join(", ")}` });
    if (shouldShortCircuitDeniedRefs(rawContent, resolution)) {
      this.onChatResponse?.(deniedRefsMessage(resolution));
      this.emit({ type: "stream_end" });
      return;
    }
    const provider = await this.providerFactory(params, this.onModelDetected ?? void 0);
    if (!provider) {
      this.onChatResponse?.("Provider nao configurado. Abra Configuracoes.");
      this.emit({ type: "stream_end" });
      return;
    }
    if (mode === "plan") {
      await this.runPlanSession(resolution.userContent || "Create an implementation plan for this project.", history, provider, projectRoot, adapter, params.includeProjectContext !== false, this.sessionAbort.signal);
      return;
    }
    if (mode === "chat") {
      await this.runChatSession(resolution.userContent, history, provider, projectRoot, adapter, params, this.sessionAbort.signal);
      return;
    }
    if (mode === "review") {
      await this.runReviewSession(resolution.userContent, history, provider, projectRoot, adapter, params, this.sessionAbort.signal);
      return;
    }
    const task = await this.buildPatchTask(resolution.userContent, provider, projectRoot, adapter);
    this.onStructured?.(task);
    await this.runUnifiedSession(
      resolution.userContent,
      history,
      params,
      provider,
      projectRoot,
      adapter,
      task,
      true,
      this.sessionAbort.signal
    );
  }
  async buildPatchTask(objective, provider, projectRoot, adapter) {
    try {
      const structured = await execution.structureTask(objective, {
        root: projectRoot,
        stackAdapter: adapter.name,
        affectedFiles: [],
        llm: provider
      });
      if (structured.valid) return structured.task;
    } catch {
    }
    return buildFallbackTask(objective.split("\n")[0].slice(0, 120), adapter.name);
  }
  async runChatSession(userContent, history, provider, projectRoot, adapter, params, signal) {
    let streamEndEmitted = false;
    try {
      let content = userContent;
      if (params.includeProjectContext !== false && (history.length === 0 || !history.some((h) => h.role === "assistant"))) {
        const contextEngine = new context.ContextEngine(new memory.MemorySystem(projectRoot), adapter);
        const maxContextTokens = contextBudgetFor(provider);
        const task = buildFallbackTask(userContent.split("\n")[0].slice(0, 120), adapter.name);
        const ctx = await contextEngine.buildContext(task, projectRoot, { maxTokens: maxContextTokens });
        this.emit({
          type: "context_loaded",
          message: `${ctx.files.length} arquivo${ctx.files.length === 1 ? "" : "s"} no contexto`,
          context: {
            files: ctx.files.map((f) => f.path),
            tokensUsed: ctx.tokensUsed,
            maxTokens: maxContextTokens,
            learningsCount: ctx.learnings.length
          }
        });
        if (ctx.files.length > 0) {
          content += "\n\n---\nProject context:\n" + ctx.files.map((f) => `
### ${f.path}
\`\`\`
${f.content}
\`\`\``).join("\n");
        }
      }
      const messages = [...history, { role: "user", content }];
      const output = await provider.runAgentLoop(messages, {
        system: chatOnlyPrompt(adapter.name),
        tools: [],
        executor: new agent.ToolExecutor(projectRoot, signal, agent.READ_ONLY_PERMISSION_POLICY),
        maxTurns: 1,
        signal,
        onToken: (t) => this.emit({ type: "token", token: t })
      });
      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: "assistant", content: output.thought }]);
      this.emit({ type: "token_usage", message: `${turnTokens} tokens`, tokensUsed: turnTokens });
    } catch (err) {
      if (!signal?.aborted) this.onChatResponse?.(formatProviderError(err));
    } finally {
      if (!streamEndEmitted) {
        this.emit({ type: "stream_end" });
        streamEndEmitted = true;
      }
    }
  }
  async runReviewSession(userContent, history, provider, projectRoot, adapter, params, signal) {
    let streamEndEmitted = false;
    try {
      const contextEngine = new context.ContextEngine(new memory.MemorySystem(projectRoot), adapter);
      const maxContextTokens = contextBudgetFor(provider);
      const task = buildFallbackTask(userContent.split("\n")[0].slice(0, 120), adapter.name);
      const ctx = params.includeProjectContext === false ? { files: [], tokensUsed: 0, learnings: [] } : await contextEngine.buildContext(task, projectRoot, { maxTokens: maxContextTokens });
      this.emit({
        type: "context_loaded",
        message: `${ctx.files.length} arquivo${ctx.files.length === 1 ? "" : "s"} no contexto`,
        context: {
          files: ctx.files.map((f) => f.path),
          tokensUsed: ctx.tokensUsed,
          maxTokens: maxContextTokens,
          learningsCount: ctx.learnings.length
        }
      });
      const contextText = ctx.files.length > 0 ? ctx.files.map((f) => `
### ${f.path}
\`\`\`
${f.content}
\`\`\``).join("\n") : "(no project context attached)";
      const messages = [
        ...history,
        { role: "user", content: `${userContent}

---
Project root: ${projectRoot}
Project context:
${contextText}` }
      ];
      const executor = new agent.ToolExecutor(projectRoot, signal, agent.READ_ONLY_PERMISSION_POLICY);
      const output = await provider.runAgentLoop(messages, {
        system: reviewOnlyPrompt(adapter.name),
        tools: agent.READ_ONLY_TOOLS,
        executor,
        maxTurns: 8,
        signal,
        onToken: (t) => this.emit({ type: "token", token: t }),
        onToolCall: (name, input) => {
          const preview = String(input.path ?? input.dir ?? name);
          this.emit({ type: "tool_call", toolName: name, toolInput: input, message: preview });
        },
        onToolResult: (name, result) => this.emit({
          type: "tool_result",
          toolName: name,
          message: result.slice(0, 2e3),
          toolOutput: result.slice(0, 2e4)
        })
      });
      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: "assistant", content: output.thought }]);
      this.emit({ type: "token_usage", message: `${turnTokens} tokens`, tokensUsed: turnTokens });
    } catch (err) {
      if (!signal?.aborted) this.onChatResponse?.(formatProviderError(err));
    } finally {
      if (!streamEndEmitted) {
        this.emit({ type: "stream_end" });
        streamEndEmitted = true;
      }
    }
  }
  async runPlanSession(userContent, history, provider, projectRoot, adapter, includeProjectContext = true, signal) {
    let streamEndEmitted = false;
    try {
      const contextEngine = new context.ContextEngine(new memory.MemorySystem(projectRoot), adapter);
      const maxContextTokens = contextBudgetFor(provider);
      const task = buildFallbackTask(userContent.split("\n")[0].slice(0, 120), adapter.name);
      const ctx = includeProjectContext ? await contextEngine.buildContext(task, projectRoot, { maxTokens: maxContextTokens }) : { files: [], tokensUsed: 0, learnings: [] };
      this.emit({
        type: "context_loaded",
        message: `${ctx.files.length} arquivo${ctx.files.length === 1 ? "" : "s"} no contexto`,
        context: {
          files: ctx.files.map((f) => f.path),
          tokensUsed: ctx.tokensUsed,
          maxTokens: maxContextTokens,
          learningsCount: ctx.learnings.length
        }
      });
      const contextText = ctx.files.length > 0 ? ctx.files.map((f) => `
### ${f.path}
\`\`\`
${f.content}
\`\`\``).join("\n") : "(no relevant code files found)";
      const messages = [
        ...history,
        {
          role: "user",
          content: [
            userContent,
            "",
            "---",
            `Project root: ${projectRoot}`,
            `Stack adapter: ${adapter.name}`,
            "",
            "Project context:",
            contextText
          ].join("\n")
        }
      ];
      const executor = new agent.ToolExecutor(projectRoot, signal, agent.READ_ONLY_PERMISSION_POLICY);
      const output = await provider.runAgentLoop(messages, {
        system: planOnlyPrompt(adapter.name),
        tools: agent.READ_ONLY_TOOLS,
        executor,
        maxTurns: 8,
        signal,
        onToken: (t) => this.emit({ type: "token", token: t }),
        onToolCall: (name, input) => {
          const preview = String(input.path ?? input.dir ?? name);
          this.emit({ type: "tool_call", toolName: name, toolInput: input, message: preview });
        },
        onToolResult: (name, result) => this.emit({
          type: "tool_result",
          toolName: name,
          message: result.slice(0, 2e3),
          toolOutput: result.slice(0, 2e4)
        })
      });
      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: "assistant", content: output.thought }]);
      this.emit({ type: "token_usage", message: `${turnTokens} tokens`, tokensUsed: turnTokens });
    } catch (err) {
      if (!signal?.aborted) this.onChatResponse?.(formatProviderError(err));
    } finally {
      if (!streamEndEmitted) {
        this.emit({ type: "stream_end" });
        streamEndEmitted = true;
      }
    }
  }
  // Unified Session â€” One loop to rule them all
  async runUnifiedSession(objective, history, params, provider, projectRoot, adapter, task, skipPlan, signal) {
    const appEngine = new application.CodeApplicationEngine(projectRoot);
    this.engine = new execution.ExecutionEngine(
      {
        agent: new agent.Agent(provider, projectRoot),
        orchestrator: new orchestrator.HarnessOrchestrator(),
        contextEngine: new context.ContextEngine(new memory.MemorySystem(projectRoot), adapter),
        applicationEngine: appEngine
      },
      {
        projectRoot,
        history,
        skipPlan,
        maxIterations: params.maxIterations ?? 5,
        autoApply: params.autoApply ?? false,
        onStateChange: (state) => this.onUpdate?.(state),
        onEvent: (event) => this.onExecutionEvent?.(event)
      }
    );
    let engineStreamEndObserved = false;
    const origEventHandler = this.onExecutionEvent;
    this.onExecutionEvent = (event) => {
      if (event.type === "stream_end") engineStreamEndObserved = true;
      origEventHandler?.(event);
    };
    try {
      const state = await this.engine.run(task);
      const last = state.iterationHistory.at(-1);
      const files = last?.changes ?? [];
      const fileList = files.map((c) => `${c.type === "create" ? "+" : "~"} ${c.path}`).join("\n");
      const score = last?.harnessResult.score ?? 0;
      if (files.length > 0) {
        if (state.status === "completed") {
          this.onChatResponse?.(`OK: Modificacoes aplicadas - score ${score}

${fileList}`);
        } else if (state.status === "paused") {
          this.onChatResponse?.(`Aguardando revisao - score ${score}

${fileList}`);
        } else {
          const reason = last?.decision.reason ?? "Maximo de tentativas atingido";
          this.onChatResponse?.(`Falhou: ${reason}

Arquivos no disco:
${fileList}`);
        }
      } else {
        if (state.status === "failed" && !signal?.aborted) {
          this.onChatResponse?.("Execucao falhou ou foi abortada.");
        }
      }
    } catch (err) {
      if (!engineStreamEndObserved) {
        this.emit({ type: "stream_end" });
        engineStreamEndObserved = true;
      }
      if (!signal?.aborted) this.onChatResponse?.(formatProviderError(err));
    } finally {
      this.onExecutionEvent = origEventHandler;
      if (!engineStreamEndObserved) this.emit({ type: "stream_end" });
      if (this.engine?.getState()?.status !== "paused") this.engine = null;
    }
  }
  pause() {
    this.engine?.pause();
  }
  async abort() {
    this.sessionAbort?.abort();
    this.sessionAbort = null;
    await this.engine?.abort().catch(() => null);
    this.engine = null;
  }
  getState() {
    return this.engine?.getState() ?? null;
  }
  async forceApply() {
    if (this.engine) {
      try {
        await this.engine.forceApply();
      } catch (err) {
        this.onChatResponse?.(formatProviderError(err));
      }
      return;
    }
    this.onChatResponse?.("Nenhuma mudanca pendente para aplicar.");
  }
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
function formatProviderError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("model") && (msg.includes("not found") || msg.includes("404")))
    return "Modelo nao encontrado. Verifique o nome do modelo nas configuracoes.";
  if (msg.includes("400") && msg.includes("crash"))
    return "O modelo local crashou (falta de memoria). Reinicie o servidor LLM.";
  if (msg.includes("reasoning_content"))
    return "Erro no contexto do modelo. Reinicie a conversa.";
  if (msg.includes("fetch") || msg.includes("ECONNREFUSED") || msg.includes("network"))
    return "Servidor LLM nao responde. Verifique se esta rodando.";
  if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("api key"))
    return "API key invalida. Verifique nas configuracoes.";
  return msg;
}
const DEFAULT_SETTINGS = {
  defaultProvider: "lmstudio",
  anthropicKey: "",
  openaiKey: "",
  deepseekKey: "",
  openrouterKey: "",
  kimiKey: "",
  geminiKey: "",
  openaiCompatibleKey: "",
  ollamaUrl: "http://localhost:11434/v1",
  compatibleUrl: "http://localhost:1234/v1",
  model: "",
  autoApply: true,
  maxIterations: 5
};
function settingsPath() {
  return path.join(electron.app.getPath("userData"), "kova-settings.json");
}
function registerIpcHandlers(win, manager) {
  let projectWatcher = null;
  let projectWatchTimer = null;
  const notifyFileTreeChanged = () => {
    if (projectWatchTimer) clearTimeout(projectWatchTimer);
    projectWatchTimer = setTimeout(() => {
      if (!win.isDestroyed()) win.webContents.send("kova:file-tree-changed");
    }, 150);
  };
  manager.setHandlers(
    (state) => win.webContents.send("kova:state-update", state),
    (task) => win.webContents.send("kova:task-structured", task),
    (msg) => win.webContents.send("kova:error", msg),
    (model) => win.webContents.send("kova:model-detected", model),
    (msg) => win.webContents.send("kova:chat-response", msg),
    (event) => win.webContents.send("kova:execution-event", event)
  );
  electron.ipcMain.handle("kova:open-folder", async () => {
    const result = await electron.dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
      title: "Selecionar projeto"
    });
    return result.canceled ? null : result.filePaths[0];
  });
  electron.ipcMain.handle("kova:send-message", async (_, message, history, params) => {
    await manager.sendMessage(message, history, params);
  });
  electron.ipcMain.handle("kova:detect-model", async (_, url) => {
    return await autoResolveModel(url) ?? null;
  });
  electron.ipcMain.handle("kova:pause", () => manager.pause());
  electron.ipcMain.handle("kova:abort", async () => manager.abort());
  electron.ipcMain.handle("kova:force-apply", async () => manager.forceApply());
  electron.ipcMain.handle("kova:get-state", () => manager.getState());
  electron.ipcMain.handle("kova:get-settings", () => {
    const p = settingsPath();
    if (!node_fs.existsSync(p)) return DEFAULT_SETTINGS;
    try {
      const saved = { ...DEFAULT_SETTINGS, ...JSON.parse(node_fs.readFileSync(p, "utf-8")) };
      const PROVIDER_NAMES = /* @__PURE__ */ new Set(["deepseek", "DeepSeek", "openai", "OpenAI", "anthropic", "Anthropic", "kimi", "Kimi", "ollama", "openrouter", "OpenRouter"]);
      if (PROVIDER_NAMES.has(saved.model)) saved.model = "";
      return saved;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  electron.ipcMain.handle("kova:save-settings", (_, settings) => {
    const p = settingsPath();
    node_fs.mkdirSync(path.dirname(p), { recursive: true });
    node_fs.writeFileSync(p, JSON.stringify(settings, null, 2), "utf-8");
  });
  electron.ipcMain.handle("kova:list-dir", async (_, dir) => {
    try {
      return listDir(dir, 0);
    } catch {
      return [];
    }
  });
  electron.ipcMain.handle("kova:watch-project", async (_, root) => {
    projectWatcher?.close();
    projectWatcher = null;
    if (!root || !node_fs.existsSync(root)) return false;
    try {
      projectWatcher = node_fs.watch(root, { recursive: true }, (_event, filename) => {
        if (!filename) return notifyFileTreeChanged();
        const first = String(filename).replace(/\\/g, "/").split("/")[0];
        if (SKIP.has(first)) return;
        notifyFileTreeChanged();
      });
      projectWatcher.on("error", () => {
        projectWatcher?.close();
        projectWatcher = null;
      });
      return true;
    } catch {
      return false;
    }
  });
  electron.ipcMain.handle("kova:unwatch-project", async () => {
    projectWatcher?.close();
    projectWatcher = null;
    return true;
  });
  electron.ipcMain.handle("kova:read-file", async (_, filePath) => {
    if (isProtectedFilePath(filePath)) return null;
    try {
      return node_fs.readFileSync(filePath, "utf-8");
    } catch {
      return null;
    }
  });
  electron.ipcMain.handle("kova:write-file", async (_, filePath, content) => {
    if (isProtectedFilePath(filePath)) throw new Error("Arquivo protegido");
    node_fs.mkdirSync(path.dirname(filePath), { recursive: true });
    node_fs.writeFileSync(filePath, content, "utf-8");
  });
  electron.ipcMain.handle("kova:list-sessions", (_, root) => {
    try {
      const dir = path.join(root, ".kova", "sessions");
      if (!node_fs.existsSync(dir)) return [];
      return node_fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(node_fs.readFileSync(path.join(dir, f), "utf-8"))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch {
      return [];
    }
  });
  electron.ipcMain.handle("kova:save-session", (_, root, session) => {
    try {
      const dir = path.join(root, ".kova", "sessions");
      node_fs.mkdirSync(dir, { recursive: true });
      node_fs.writeFileSync(path.join(dir, `${session.id}.json`), JSON.stringify(session, null, 2));
    } catch (e) {
      console.error("Failed to save session", e);
    }
  });
  electron.ipcMain.handle("kova:delete-session", (_, root, id) => {
    try {
      const p = path.join(root, ".kova", "sessions", `${id}.json`);
      if (node_fs.existsSync(p)) node_fs.unlinkSync(p);
    } catch {
    }
  });
  electron.ipcMain.on("kova:window-minimize", () => win.minimize());
  electron.ipcMain.on("kova:window-maximize", () => win.isMaximized() ? win.unmaximize() : win.maximize());
  electron.ipcMain.on("kova:window-close", () => win.close());
}
const SKIP = /* @__PURE__ */ new Set(["node_modules", ".git", ".kova", "dist", "out", ".next", "__pycache__", ".cache", "vendor"]);
const VISIBLE_DOTFILES = /* @__PURE__ */ new Set([".env", ".env.example", ".gitignore", ".npmrc", ".nvmrc", ".editorconfig", ".prettierrc", ".eslintrc", ".kovarules"]);
function isProtectedFilePath(path$1) {
  const name = path.basename(path$1).toLowerCase();
  if (name === ".env.example") return false;
  return name === ".env" || name.startsWith(".env.") || name.endsWith(".env") || name.includes(".env.");
}
function shouldShowEntry(name) {
  if (SKIP.has(name)) return false;
  if (!name.startsWith(".")) return true;
  if (VISIBLE_DOTFILES.has(name)) return true;
  return name.startsWith(".env.");
}
function listDir(dir, depth) {
  if (depth > 5) return [];
  let entries;
  try {
    entries = node_fs.readdirSync(dir);
  } catch {
    return [];
  }
  const nodes = [];
  for (const name of entries) {
    if (!shouldShowEntry(name)) continue;
    const full = path.join(dir, name);
    try {
      const isDir = node_fs.statSync(full).isDirectory();
      nodes.push({ name, path: full, isDir, protected: !isDir && isProtectedFilePath(full), children: isDir ? listDir(full, depth + 1) : void 0 });
    } catch {
    }
  }
  return nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
const isDev = !electron.app.isPackaged;
let mainWindow = null;
const engineManager = new EngineManager();
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    backgroundColor: "#0D0F14",
    show: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (isDev) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"] ?? "http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  registerIpcHandlers(mainWindow, engineManager);
}
electron.app.whenReady().then(createWindow);
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
});
