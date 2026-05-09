#!/usr/bin/env node

// src/index.ts
import chalk13 from "chalk";

// src/commands/run.ts
import chalk3 from "chalk";

// src/args.ts
function hasFlag(args, flag) {
  return args.includes(flag);
}
function readOption(args, name, fallback) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1] ?? fallback;
  return fallback;
}
function positional(args) {
  const result = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      if (!arg.includes("=") && args[i + 1] && !args[i + 1].startsWith("--")) i++;
      continue;
    }
    result.push(arg);
  }
  return result;
}

// src/git.ts
import { execFileSync } from "child_process";
function stagedFiles(cwd) {
  try {
    const output = execFileSync("git", ["diff", "--name-only", "--cached"], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// src/config.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
var PROVIDERS = ["anthropic", "openai", "deepseek", "kimi", "ollama", "openrouter", "openai-compatible"];
function configPath() {
  return process.env.KOVA_CLI_CONFIG_FILE ?? join(process.env.KOVA_HOME ?? join(homedir(), ".kova"), "config.json");
}
function readCliConfig() {
  const file = configPath();
  if (!existsSync(file)) return {};
  try {
    const config = JSON.parse(readFileSync(file, "utf-8"));
    return config && typeof config === "object" ? config : {};
  } catch {
    return {};
  }
}
function writeCliConfig(config) {
  const file = configPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(config, null, 2)}
`, "utf-8");
}
function updateLlmConfig(update) {
  const config = readCliConfig();
  const next = { ...config, llm: { ...config.llm, ...update } };
  writeCliConfig(next);
  return next;
}
function asProvider(value) {
  return PROVIDERS.includes(value) ? value : null;
}
function configuredLlm() {
  return readCliConfig().llm ?? {};
}

// src/auth/session.ts
import { existsSync as existsSync2, mkdirSync as mkdirSync2, readFileSync as readFileSync2, rmSync, writeFileSync as writeFileSync2 } from "fs";
import { homedir as homedir2 } from "os";
import { dirname as dirname2, join as join2 } from "path";
function authSessionPath() {
  return process.env.KOVA_AUTH_FILE ?? join2(process.env.KOVA_HOME ?? join2(homedir2(), ".kova"), "auth.json");
}
function readAuthSession() {
  const file = authSessionPath();
  if (!existsSync2(file)) return null;
  try {
    const session = JSON.parse(readFileSync2(file, "utf-8"));
    if (session.type !== "oauth" || session.provider !== "onauth" || !session.accessToken) return null;
    return session;
  } catch {
    return null;
  }
}
function writeAuthSession(session) {
  const file = authSessionPath();
  mkdirSync2(dirname2(file), { recursive: true });
  writeFileSync2(file, `${JSON.stringify(session, null, 2)}
`, { encoding: "utf-8", mode: 384 });
}
function deleteAuthSession() {
  const file = authSessionPath();
  if (!existsSync2(file)) return false;
  rmSync(file, { force: true });
  return true;
}
function isAuthSessionExpired(session) {
  if (!session.expiresAt) return false;
  const time = Date.parse(session.expiresAt);
  if (Number.isNaN(time)) return true;
  return time <= Date.now() + 3e4;
}

// src/credentials.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync3, readFileSync as readFileSync3, writeFileSync as writeFileSync3 } from "fs";
import { homedir as homedir3 } from "os";
import { dirname as dirname3, join as join3 } from "path";
function credentialsPath() {
  return process.env.KOVA_CREDENTIALS_FILE ?? join3(process.env.KOVA_HOME ?? join3(homedir3(), ".kova"), "credentials.json");
}
function readCredentials() {
  const file = credentialsPath();
  if (!existsSync3(file)) return { providers: {} };
  try {
    const parsed = JSON.parse(readFileSync3(file, "utf-8"));
    return parsed?.providers ? parsed : { providers: {} };
  } catch {
    return { providers: {} };
  }
}
function readCredential(provider) {
  return readCredentials().providers[provider];
}
function writeCredential(credential) {
  const file = credentialsPath();
  const credentials = readCredentials();
  credentials.providers[credential.provider] = { ...credential, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  mkdirSync3(dirname3(file), { recursive: true });
  writeFileSync3(file, `${JSON.stringify(credentials, null, 2)}
`, { encoding: "utf-8", mode: 384 });
}
function credentialProviders() {
  return Object.keys(readCredentials().providers);
}

// src/provider-catalog.ts
var PROVIDER_CATALOG = [
  {
    id: "onauth",
    label: "OnAuth / Kova Gateway",
    kind: "oauth",
    defaultModel: "gpt-4.1",
    models: ["gpt-4.1", "gpt-4.1-mini"]
  },
  {
    id: "ollama",
    label: "Ollama local",
    kind: "local",
    defaultModel: "qwen2.5-coder:7b",
    baseUrl: "http://localhost:11434/v1",
    models: ["qwen2.5-coder:7b", "llama3.1:8b", "codellama:7b"]
  },
  {
    id: "openai",
    label: "OpenAI",
    kind: "api-key",
    defaultModel: "gpt-4.1",
    baseUrl: "https://api.openai.com/v1",
    envKey: "OPENAI_API_KEY",
    models: ["gpt-4.1", "gpt-4.1-mini", "gpt-4o"]
  },
  {
    id: "anthropic",
    label: "Anthropic",
    kind: "api-key",
    defaultModel: "claude-sonnet-4-6",
    envKey: "ANTHROPIC_API_KEY",
    models: ["claude-sonnet-4-6", "claude-haiku-4-5"]
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "api-key",
    defaultModel: "anthropic/claude-sonnet-4.5",
    baseUrl: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    models: ["anthropic/claude-sonnet-4.5", "openai/gpt-4.1", "deepseek/deepseek-chat-v3.1"]
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "api-key",
    defaultModel: "deepseek-v4-flash",
    baseUrl: "https://api.deepseek.com",
    envKey: "DEEPSEEK_API_KEY",
    models: ["deepseek-v4-flash", "deepseek-chat"]
  },
  {
    id: "kimi",
    label: "Kimi / Moonshot",
    kind: "api-key",
    defaultModel: "kimi-k2.5",
    baseUrl: "https://api.moonshot.ai/v1",
    envKey: "KIMI_API_KEY",
    models: ["kimi-k2.5"]
  },
  {
    id: "openai-compatible",
    label: "Other OpenAI-compatible",
    kind: "api-key",
    defaultModel: "gpt-4.1",
    models: ["gpt-4.1"]
  }
];
function catalogEntry(id) {
  return PROVIDER_CATALOG.find((entry) => entry.id === id);
}

// src/llm-settings.ts
function resolveLlmSettings() {
  const configured = configuredLlm();
  if (configured.provider) {
    const credential = readCredential(configured.provider);
    const entry = catalogEntry(configured.provider);
    return {
      provider: runnerProvider(configured.provider),
      model: configured.model ?? entry?.defaultModel,
      baseUrl: configured.baseUrl ?? credential?.baseUrl ?? entry?.baseUrl,
      apiKey: credential?.apiKey,
      source: "config"
    };
  }
  const session = readAuthSession();
  if (session && !isExpired(session.expiresAt)) {
    return {
      provider: "openai-compatible",
      model: process.env.KOVA_LLM_MODEL ?? session.model ?? "gpt-4.1",
      baseUrl: process.env.KOVA_ONAUTH_LLM_BASE_URL ?? session.baseUrl,
      apiKey: session.accessToken,
      source: "onauth"
    };
  }
  if (process.env.ANTHROPIC_API_KEY) return { provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY, model: "claude-sonnet-4-6", source: "env" };
  if (process.env.OPENAI_API_KEY) return { provider: "openai", apiKey: process.env.OPENAI_API_KEY, model: "gpt-4.1", baseUrl: "https://api.openai.com/v1", source: "env" };
  if (process.env.OPENROUTER_API_KEY) return { provider: "openrouter", apiKey: process.env.OPENROUTER_API_KEY, model: "anthropic/claude-sonnet-4.5", baseUrl: "https://openrouter.ai/api/v1", source: "env" };
  if (process.env.DEEPSEEK_API_KEY) return { provider: "deepseek", apiKey: process.env.DEEPSEEK_API_KEY, model: "deepseek-v4-flash", baseUrl: "https://api.deepseek.com", source: "env" };
  if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) return { provider: "kimi", apiKey: process.env.KIMI_API_KEY ?? process.env.MOONSHOT_API_KEY, model: "kimi-k2.5", baseUrl: "https://api.moonshot.ai/v1", source: "env" };
  if (process.env.OLLAMA_BASE_URL) return { provider: "ollama", apiKey: process.env.OLLAMA_API_KEY ?? "ollama", model: "qwen2.5-coder:7b", baseUrl: process.env.OLLAMA_BASE_URL, source: "env" };
  return { source: "none" };
}
function runnerProvider(provider) {
  return provider;
}
function isExpired(expiresAt) {
  if (!expiresAt) return false;
  const time = Date.parse(expiresAt);
  return Number.isNaN(time) || time <= Date.now() + 3e4;
}

// src/runner.ts
import { spawn } from "child_process";
import { existsSync as existsSync4, mkdtempSync, writeFileSync as writeFileSync4, rmSync as rmSync2 } from "fs";
import { tmpdir } from "os";
import { dirname as dirname4, join as join4 } from "path";
import { fileURLToPath } from "url";
var HARNESS_MARKER = "__KOVA_HARNESS_RESULT_V1__:";
var FULL_LOOP_MARKER = "__KOVA_FULL_LOOP_RESULT_V1__:";
var FULL_LOOP_EVENT_MARKER = "__KOVA_FULL_LOOP_EVENT_V1__:";
async function runValidation(projectRoot) {
  const result = await runNode([resolveRunnerEntry(), `--project-root=${projectRoot}`], projectRoot);
  return parseMarkedJson(result.stdout, HARNESS_MARKER);
}
async function runFullLoop(projectRoot, task, affectedFiles = [], options = {}) {
  const dir = mkdtempSync(join4(tmpdir(), "kova-cli-"));
  const taskFile = join4(dir, "task.json");
  writeFileSync4(taskFile, JSON.stringify({
    objective: task,
    affectedFiles,
    maxIterations: 5,
    provider: options.provider,
    apiKey: options.apiKey,
    model: options.model,
    baseUrl: options.baseUrl,
    sessionContext: options.sessionContext,
    autoApply: options.autoApply
  }), "utf-8");
  try {
    const result = await runNode(
      [resolveRunnerEntry(), "--mode=full-loop", `--project-root=${projectRoot}`, `--task-file=${taskFile}`],
      projectRoot,
      (line) => {
        if (!line.startsWith(FULL_LOOP_EVENT_MARKER)) return;
        options.onEvent?.(JSON.parse(line.slice(FULL_LOOP_EVENT_MARKER.length)));
      }
    );
    return parseMarkedJson(result.stdout, FULL_LOOP_MARKER);
  } finally {
    rmSync2(dir, { recursive: true, force: true });
  }
}
async function runNode(args, cwd, onStdoutLine) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, env: process.env, shell: false });
    let stdout = "";
    let stderr = "";
    let pending = "";
    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      stdout += text;
      pending += text;
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() ?? "";
      for (const line of lines) onStdoutLine?.(line);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (pending) onStdoutLine?.(pending);
      resolve({ stdout, stderr, code: code ?? 0 });
    });
  });
}
function parseMarkedJson(stdout, marker) {
  const line = stdout.split(/\r?\n/).find((item) => item.trimStart().startsWith(marker));
  if (!line) {
    throw new Error(`Runner output missing marker ${marker}`);
  }
  return JSON.parse(line.slice(line.indexOf(marker) + marker.length));
}
function resolveRunnerEntry() {
  try {
    const packageEntry = fileURLToPath(import.meta.resolve("@kova/kova-runner"));
    return packageEntry.endsWith("dist/index.js") ? packageEntry : join4(dirname4(packageEntry), "index.js");
  } catch {
    const local = findLocalRunner(dirname4(fileURLToPath(import.meta.url)));
    if (local) return local;
    throw new Error("Unable to resolve @kova/kova-runner. Build packages/kova-runner or install CLI dependencies.");
  }
}
function findLocalRunner(start) {
  let current = start;
  for (let i = 0; i < 8; i++) {
    const candidate = join4(current, "packages", "kova-runner", "dist", "index.js");
    if (existsSync4(candidate)) return candidate;
    const parent = dirname4(current);
    if (parent === current) return null;
    current = parent;
  }
  return null;
}

// src/session.ts
import { existsSync as existsSync5, mkdirSync as mkdirSync4, readFileSync as readFileSync4, readdirSync, writeFileSync as writeFileSync5 } from "fs";
import { basename, join as join5 } from "path";
function sessionDir(projectRoot) {
  return join5(projectRoot, ".kova", "sessions");
}
function createSession(projectRoot, title = "Kova session") {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const session = {
    id: makeSessionId(),
    title,
    projectRoot,
    createdAt: now,
    updatedAt: now,
    events: []
  };
  saveSession(session);
  return session;
}
function readSession(projectRoot, id) {
  const file = sessionPath(projectRoot, id);
  if (!existsSync5(file)) return null;
  try {
    const session = JSON.parse(readFileSync4(file, "utf-8"));
    return session && session.id ? session : null;
  } catch {
    return null;
  }
}
function saveSession(session) {
  session.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  mkdirSync4(sessionDir(session.projectRoot), { recursive: true });
  writeFileSync5(sessionPath(session.projectRoot, session.id), `${JSON.stringify(session, null, 2)}
`, "utf-8");
}
function appendSessionEvent(session, event) {
  session.events.push({ ...event, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  saveSession(session);
  return session;
}
function listSessions(projectRoot) {
  const dir = sessionDir(projectRoot);
  if (!existsSync5(dir)) return [];
  return readdirSync(dir).filter((file) => file.endsWith(".json")).map((file) => readSession(projectRoot, basename(file, ".json"))).filter((session) => Boolean(session)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
function latestSession(projectRoot) {
  return listSessions(projectRoot)[0] ?? null;
}
function sessionContext(session, maxEvents = 12) {
  if (!session || session.events.length === 0) return "";
  const events = session.events.slice(-maxEvents);
  return [
    `Kova terminal session ${session.id}: ${session.title}`,
    ...events.map((event) => {
      const status = event.status ? ` [${event.status}]` : "";
      return `${event.kind}${status}: ${event.content}`;
    })
  ].join("\n");
}
function sessionSummary(session) {
  const last = session.events.at(-1);
  const lastText = last ? last.content.replace(/\s+/g, " ").slice(0, 80) : "empty";
  return `${session.id}  ${session.updatedAt}  ${session.title}  ${lastText}`;
}
function sessionPath(projectRoot, id) {
  return join5(sessionDir(projectRoot), `${id}.json`);
}
function makeSessionId() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// src/ui/harness-display.ts
import chalk2 from "chalk";
import ora from "ora";

// src/ui/terminal.ts
import { homedir as homedir4 } from "os";
import chalk from "chalk";
function printTerminalHeader(info) {
  const width = terminalWidth();
  const title = " Kova ADE ";
  const subtitle = "agentic development environment";
  const model = modelPlain(info.provider, info.model);
  const project = shortPath(info.cwd);
  const mode = info.autoApply ? "auto apply: harness score >= 90" : "review mode: no file writes";
  console.log("");
  console.log(chalk.cyanBright(`\u256D${"\u2500".repeat(width - 2)}\u256E`));
  console.log(chalk.cyanBright("\u2502") + center(chalk.bold(title), width - 2) + chalk.cyanBright("\u2502"));
  console.log(chalk.cyanBright("\u2502") + center(chalk.dim(subtitle), width - 2) + chalk.cyanBright("\u2502"));
  console.log(chalk.cyanBright(`\u251C${"\u2500".repeat(width - 2)}\u2524`));
  console.log(row("Model", info.provider ? chalk.green(model) : chalk.yellow("not configured"), width));
  console.log(row("Project", project, width));
  console.log(row("Session", `${info.sessionId ?? "new"}${info.sessionTitle ? ` ${chalk.dim(info.sessionTitle)}` : ""}`, width));
  console.log(row("Harness", mode, width));
  console.log(row("Staged", info.stagedCount > 0 ? `${info.stagedCount} files` : "none", width));
  if (info.auth) console.log(row("Auth", chalk.green(info.auth), width));
  console.log(chalk.cyanBright(`\u2570${"\u2500".repeat(width - 2)}\u256F`));
  if (!info.provider) printEmptyProviderCallout(true);
  console.log(chalk.dim(info.provider ? "Ask anything, or use /models, /review, /status, /help." : "Start with /connect, or paste an API key through the provider menu."));
  console.log("");
}
function printStatusPanel(info) {
  const width = terminalWidth();
  console.log("");
  console.log(chalk.dim(`\u256D\u2500 Status ${"\u2500".repeat(Math.max(0, width - 11))}\u256E`));
  console.log(row("Provider", info.provider ? chalk.green(info.provider) : chalk.yellow("not configured"), width));
  if (info.model) console.log(row("Model", info.model, width));
  if (info.auth) console.log(row("Auth", chalk.green(info.auth), width));
  if (info.sessionId) console.log(row("Session", `${info.sessionId}${info.sessionTitle ? ` ${chalk.dim(info.sessionTitle)}` : ""}`, width));
  console.log(row("Harness", info.autoApply ? "auto-apply after score >= 90" : "review only, no file writes", width));
  console.log(row("Staged", info.stagedCount > 0 ? `${info.stagedCount} files` : "none", width));
  console.log(chalk.dim(`\u2570${"\u2500".repeat(width - 2)}\u256F`));
}
function printUserBlock(text) {
  const width = terminalWidth();
  console.log("");
  console.log(chalk.whiteBright(`\u256D\u2500 You ${"\u2500".repeat(Math.max(0, width - 8))}\u256E`));
  for (const line of wrap(text, width - 4)) {
    console.log(`${chalk.whiteBright("\u2502")} ${line.padEnd(width - 4)} ${chalk.whiteBright("\u2502")}`);
  }
  console.log(chalk.whiteBright(`\u2570${"\u2500".repeat(width - 2)}\u256F`));
}
function printAssistantBlock(text) {
  const width = terminalWidth();
  console.log("");
  console.log(chalk.cyanBright(`\u256D\u2500 Kova ${"\u2500".repeat(Math.max(0, width - 9))}\u256E`));
  for (const paragraph of text.split("\n")) {
    for (const line of wrap(paragraph, width - 4)) {
      console.log(`${chalk.cyanBright("\u2502")} ${line.padEnd(width - 4)} ${chalk.cyanBright("\u2502")}`);
    }
  }
  console.log(chalk.cyanBright(`\u2570${"\u2500".repeat(width - 2)}\u256F`));
}
function printWorking(autoApply) {
  const mode = autoApply ? "auto-apply enabled after harness approval" : "review mode, no file writes";
  console.log(chalk.dim(`
\u2022 Running Kova loop (${mode})`));
  console.log(chalk.dim("\u2022 Harness is the gate before any apply"));
}
function promptLabel() {
  return `${chalk.cyanBright("\u203A")} `;
}
function printBye() {
  console.log(chalk.dim("Session closed."));
}
function printHelpText() {
  console.log(`
${chalk.bold("Session commands")}
  /run <task>        Run the autonomous Kova loop for a task
  /review <task>     Run harness and show diff without applying
  /validate          Run harness validation
  /memory list       List project memory
  /metrics           Show local run metrics
  /init              Create .kova config
  /sessions          List terminal sessions
  /connect           Configure a provider with an arrow-key menu
  /models            Pick a model with an arrow-key menu
  /providers         List model providers
  /use <provider>    Persist provider/model for future runs
  /login             Sign in with OnAuth/OAuth
  /auth status       Show OnAuth session
  /logout            Remove OnAuth session
  /status            Show provider and staged files
  /clear             Clear the terminal
  /exit              Leave the session

Plain text is treated as a task, for example:
  add cursor pagination to the farms endpoint
`);
}
function printResultHeader(status, score, iterations, applied, handled) {
  const color = applied ? chalk.green : handled ? chalk.yellow : chalk.gray;
  console.log("");
  console.log(color(`\u256D\u2500 Kova ${status.toUpperCase()} \xB7 score ${score} \xB7 ${iterations} iter`));
}
function modelPlain(provider, model) {
  if (!provider) return "not configured";
  return model ? `${provider} / ${model}` : provider;
}
function shortPath(value) {
  const home = homedir4();
  return value.startsWith(home) ? `~${value.slice(home.length)}` : value;
}
function terminalWidth() {
  return Math.max(58, Math.min(process.stdout.columns ?? 88, 100));
}
function row(label, value, width) {
  const raw = `${chalk.dim(label.padEnd(9))} ${value}`;
  const padding = Math.max(0, width - 4 - visibleLength(raw));
  return `${chalk.cyanBright("\u2502")} ${raw}${" ".repeat(padding)} ${chalk.cyanBright("\u2502")}`;
}
function center(value, width) {
  const length = visibleLength(value);
  const left = Math.max(0, Math.floor((width - length) / 2));
  const right = Math.max(0, width - length - left);
  return `${" ".repeat(left)}${value}${" ".repeat(right)}`;
}
function printEmptyProviderCallout(primary = false) {
  const width = terminalWidth();
  console.log("");
  console.log(chalk.yellow(`\u256D\u2500 Setup ${"\u2500".repeat(Math.max(0, width - 10))}\u256E`));
  const line1 = primary ? "No model connected yet. Next: /connect" : "No model connected yet.";
  console.log(`${chalk.yellow("\u2502")} ${line1.padEnd(width - 4)} ${chalk.yellow("\u2502")}`);
  console.log(`${chalk.yellow("\u2502")} ${"Use arrow keys to choose Ollama, OnAuth, OpenRouter, OpenAI, and more.".padEnd(width - 4)} ${chalk.yellow("\u2502")}`);
  console.log(chalk.yellow(`\u2570${"\u2500".repeat(width - 2)}\u256F`));
}
function wrap(text, width) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (current.length + word.length + 1 > width) {
      lines.push(current);
      current = word;
      continue;
    }
    current += ` ${word}`;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
function visibleLength(value) {
  return value.replace(/\x1B\[[0-9;]*m/g, "").length;
}

// src/ui/harness-display.ts
var spin = null;
var iterationCount = 0;
function stopSpin() {
  spin?.stop();
  spin = null;
}
function startSpin(text, style = "dots") {
  stopSpin();
  spin = ora({ text, spinner: style, color: "cyan" }).start();
}
function printHarnessResult(result) {
  const color = result.passed ? chalk2.green : chalk2.red;
  console.log(color(`Harness ${result.passed ? "passed" : "failed"} \u2014 score ${result.score} \u2014 ${result.decision}`));
  console.log(chalk2.dim(result.reason));
  if (result.errors.length > 0) {
    console.log(chalk2.bold("\nErrors"));
    for (const error of result.errors) {
      const file = error.file ? chalk2.dim(` ${error.file}`) : "";
      console.log(`  ${chalk2.red(error.layer)} ${error.message}${file}`);
    }
  }
}
function printFullLoopEvent(event) {
  switch (event.type) {
    case "contract_created": {
      iterationCount = 0;
      startSpin(chalk2.dim("Contract created \u2014 starting agent..."));
      break;
    }
    case "state_changed": {
      const labels = {
        structuring: "Building context...",
        planning: chalk2.cyan("Planning \u2014 reading project..."),
        coding: iterationCount === 0 ? chalk2.cyan("Generating code...") : chalk2.yellow(`Fix attempt ${iterationCount + 1}...`),
        validating: chalk2.yellow("Running harness (build \xB7 tests \xB7 rules)..."),
        deciding: chalk2.dim("Deciding..."),
        applying: chalk2.green("Applying changes...")
      };
      if (event.state && labels[event.state]) startSpin(labels[event.state]);
      break;
    }
    case "agent_completed": {
      const changes = event.changes ?? [];
      if (changes.length === 0) {
        stopSpin();
        break;
      }
      stopSpin();
      const modeLabel = event.mode === "fix" ? chalk2.yellow("Fix") : chalk2.cyan("Code");
      console.log(`${modeLabel} ${chalk2.dim(`\u2014 ${changes.length} file(s)`)}`);
      for (const c of changes.slice(0, 6)) {
        const icon = c.type === "create" ? chalk2.green("+") : c.type === "delete" ? chalk2.red("\u2212") : chalk2.yellow("~");
        console.log(`  ${icon} ${chalk2.dim(c.path)}`);
      }
      if (changes.length > 6) {
        console.log(chalk2.dim(`  ... and ${changes.length - 6} more`));
      }
      break;
    }
    case "validation_completed": {
      stopSpin();
      const score = event.harnessResult?.score ?? 0;
      const scoreColor = score >= 90 ? chalk2.green : score >= 70 ? chalk2.yellow : chalk2.red;
      const passed = event.harnessResult?.passed ? chalk2.green("\u2713") : chalk2.red("\u2717");
      console.log(`${passed} Harness ${scoreColor(`score ${score}`)}`);
      break;
    }
    case "decision_made": {
      const dec = event.decision?.decision;
      if (dec === "auto_apply") console.log(chalk2.green("\u2713 auto-apply"));
      else if (dec === "suggest") console.log(chalk2.yellow("\u25CE suggest review"));
      else if (dec === "reject") {
        iterationCount++;
        console.log(chalk2.red(`\u2717 reject \u2014 retrying (${iterationCount})`));
      } else if (dec === "human_required") console.log(chalk2.yellow("\u26A0 human required"));
      break;
    }
    case "apply_completed": {
      spin?.succeed(chalk2.green("Applied"));
      spin = null;
      break;
    }
    case "iteration_recorded":
      break;
    default:
      break;
  }
}
function printFullLoopResult(result) {
  stopSpin();
  printResultHeader(result.status, result.score, result.iterations, result.applied, result.handled);
  console.log(chalk2.dim(result.reason));
  if (result.decision) console.log(chalk2.dim(`Decision: ${result.decision}`));
  if (result.changedFiles?.length) {
    console.log(chalk2.bold("\nChanged files"));
    for (const file of result.changedFiles) console.log(`  ${chalk2.cyan(file)}`);
  }
  if (result.preview) {
    console.log(chalk2.bold("\nPreview"));
    console.log(result.preview.slice(0, 2e3));
  }
  console.log(chalk2.dim("\u2570" + "\u2500".repeat(40)));
}
function resultToJson(result) {
  return JSON.stringify(result, null, 2);
}

// src/commands/run.ts
async function runCommand(args, context) {
  const task = positional(args).join(" ").trim();
  if (!task) {
    console.error(chalk3.red('Usage: kova run "task"'));
    return 2;
  }
  const existing = readOption(args, "--session");
  const session = existing && !hasFlag(args, "--new-session") ? readSession(context.cwd, existing) : createSession(context.cwd, titleFromTask(task));
  if (existing && !session) {
    console.error(chalk3.red(`Session not found: ${existing}`));
    return 1;
  }
  appendSessionEvent(session, { kind: "user", content: task });
  const llm = resolveLlmSettings();
  const result = await runFullLoop(context.cwd, task, stagedFiles(context.cwd), {
    provider: llm.provider,
    apiKey: llm.apiKey,
    model: llm.model,
    baseUrl: llm.baseUrl,
    sessionContext: sessionContext(session),
    autoApply: !hasFlag(args, "--review") && !hasFlag(args, "--no-apply"),
    onEvent: printFullLoopEvent
  });
  appendSessionEvent(session, {
    kind: "assistant",
    content: result.reason,
    status: result.status,
    score: result.score,
    iterations: result.iterations
  });
  printFullLoopResult(result);
  console.log(chalk3.dim(`Session: ${session.id}`));
  return result.applied ? 0 : 1;
}
function titleFromTask(task) {
  return task.replace(/\s+/g, " ").slice(0, 60);
}

// src/commands/validate.ts
async function validateCommand(args, context) {
  const mode = readOption(args, "--mode", "standard");
  const staged = hasFlag(args, "--staged");
  if (staged) {
    const files = stagedFiles(context.cwd);
    console.log(files.length > 0 ? `Staged files: ${files.join(", ")}` : "No staged files detected.");
  }
  const result = await runValidation(context.cwd);
  console.log(`Mode: ${mode}`);
  printHarnessResult(result);
  return result.passed ? 0 : 1;
}

// src/commands/memory.ts
import chalk4 from "chalk";
import { MemorySystem } from "@kova/memory";
async function memoryCommand(args, context) {
  const [action, id] = args;
  const memory = new MemorySystem(context.cwd);
  if (action === "list") {
    const scope = readOption(args, "--scope");
    const status = readOption(args, "--status");
    const learnings = memory.list({ scope, status });
    for (const learning of learnings) {
      console.log(`${chalk4.cyan(learning.id)} ${chalk4.bold(learning.status)} ${learning.scope} ${learning.description}`);
    }
    if (learnings.length === 0) console.log(chalk4.dim("No learnings."));
    return 0;
  }
  if (action === "inspect" && id) {
    const learning = memory.inspect(id);
    if (!learning) {
      console.error(chalk4.red(`Learning not found: ${id}`));
      return 1;
    }
    console.log(JSON.stringify(learning, null, 2));
    return 0;
  }
  if (action === "prune") {
    memory.prune();
    console.log(chalk4.green("Memory pruned."));
    return 0;
  }
  if (action === "remove" && id) {
    memory.remove(id);
    console.log(chalk4.green(`Removed ${id}.`));
    return 0;
  }
  console.error(chalk4.red("Usage: kova memory list|inspect <id>|prune|remove <id>"));
  return 2;
}

// src/commands/init.ts
import { existsSync as existsSync6, mkdirSync as mkdirSync5, writeFileSync as writeFileSync6 } from "fs";
import { join as join6 } from "path";
import chalk5 from "chalk";
async function initCommand(args, context) {
  const stack = readOption(args, "--stack", "typescript");
  const kovaDir = join6(context.cwd, ".kova");
  mkdirSync5(join6(kovaDir, "memory"), { recursive: true });
  mkdirSync5(join6(kovaDir, "tmp"), { recursive: true });
  mkdirSync5(join6(kovaDir, "preview"), { recursive: true });
  const configPath2 = join6(kovaDir, "config.json");
  if (!existsSync6(configPath2)) {
    writeFileSync6(configPath2, JSON.stringify(defaultConfig(stack ?? "typescript"), null, 2), "utf-8");
  }
  console.log(chalk5.green(`Initialized ${kovaDir}`));
  return 0;
}
function defaultConfig(stack) {
  return {
    project: { name: "kova-project", stack },
    harness: { max_iterations: 5, default_mode: "standard", layers: {} },
    decision: { auto_apply_threshold: 90, suggest_threshold: 70, max_repeated_errors: 2 },
    agent: { provider: "anthropic", model: "claude-sonnet-4-6", temperature: 0.2, fallback_provider: "ollama", fallback_model: "qwen2.5-coder" },
    context: { strategy: "graph", max_tokens: 8e3, include_rules: true, include_errors: true, include_learnings: true, max_files: 12 },
    memory: {
      max_project_learnings: 200,
      max_global_learnings: 500,
      promotion_threshold: 3,
      canonical_threshold: 8,
      contradiction_limit: 2,
      decay_experimental_days: 30,
      decay_verified_days: 120
    },
    safe_zones: [],
    observability: { trace_retention_days: 14, log_level: "info" }
  };
}

// src/commands/metrics.ts
import chalk6 from "chalk";
import { getMetrics } from "@kova/observability";
async function metricsCommand(args, context) {
  const metrics = getMetrics(context.cwd);
  if (hasFlag(args, "--json")) {
    console.log(JSON.stringify(metrics, null, 2));
    return 0;
  }
  console.log(chalk6.bold("Kova metrics"));
  console.log(`Runs: ${metrics.totalRuns}`);
  console.log(`First-pass rate: ${metrics.firstPassRate}%`);
  console.log(`Avg iterations: ${metrics.avgIterations}`);
  console.log(`Avg duration: ${metrics.avgDurationMs}ms`);
  console.log(`Avg tokens: ${metrics.avgTokens}`);
  if (metrics.topRejectionReasons.length > 0) {
    console.log(chalk6.bold("\nTop rejection reasons"));
    for (const item of metrics.topRejectionReasons) {
      console.log(`  ${item.count}x ${item.reason}`);
    }
  }
  return 0;
}

// src/commands/ci.ts
import { readFileSync as readFileSync5 } from "fs";
import { join as join7 } from "path";
async function ciCommand(args, context) {
  const threshold = Number(readOption(args, "--threshold", String(readThreshold(context.cwd))));
  const result = await runValidation(context.cwd);
  const ok = result.score >= threshold;
  console.log(resultToJson({ ...result, threshold, ciPassed: ok }));
  return ok ? 0 : 1;
}
function readThreshold(projectRoot) {
  try {
    const config = JSON.parse(readFileSync5(join7(projectRoot, ".kova", "config.json"), "utf-8"));
    return config.decision?.suggest_threshold ?? 70;
  } catch {
    return 70;
  }
}

// src/commands/chat.ts
import { createInterface as createInterface2 } from "readline/promises";
import chalk12 from "chalk";

// src/chat-provider.ts
import { readdirSync as readdirSync2, statSync } from "fs";
import { join as join8 } from "path";
async function generateChatReply(message, context) {
  const settings = resolveLlmSettings();
  if (!settings.provider) {
    return { ok: false, text: "", reason: "No provider configured. Run /connect or /login first." };
  }
  if (settings.provider === "ollama" && !settings.baseUrl) {
    return { ok: false, text: "", reason: "Ollama is configured, but no base URL is set." };
  }
  if (settings.provider !== "ollama" && !settings.apiKey) {
    return { ok: false, text: "", reason: `${settings.provider} is configured, but no credential is available.` };
  }
  try {
    if (settings.provider === "anthropic") return await anthropicReply(message, context, settings.apiKey, settings.model);
    return await openAICompatibleReply(message, context, {
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl ?? defaultBaseUrl(settings.provider),
      model: settings.model ?? defaultModel(settings.provider)
    });
  } catch (error) {
    return {
      ok: false,
      text: "",
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}
async function openAICompatibleReply(message, context, settings) {
  if (!settings.baseUrl || !settings.model) {
    return { ok: false, text: "", reason: "Provider base URL or model is missing." };
  }
  const response = await fetch(`${settings.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: "system", content: systemPrompt(context) },
        { role: "user", content: message }
      ],
      max_tokens: 2e3
    })
  });
  if (!response.ok) throw new Error(`Model request failed: ${response.status} ${await response.text()}`);
  const json = await response.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  return text ? { ok: true, text } : { ok: false, text: "", reason: "Model returned an empty response." };
}
async function anthropicReply(message, context, apiKey, model = "claude-sonnet-4-6") {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 2e3,
      system: systemPrompt(context),
      messages: [{ role: "user", content: message }]
    })
  });
  if (!response.ok) throw new Error(`Model request failed: ${response.status} ${await response.text()}`);
  const json = await response.json();
  const text = json.content?.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n").trim();
  return text ? { ok: true, text } : { ok: false, text: "", reason: "Model returned an empty response." };
}
function systemPrompt(context) {
  const projectFiles = listProjectFiles(context.cwd);
  return [
    "You are Kova, a senior coding assistant inside a terminal environment.",
    "You have full awareness of the project structure listed below.",
    "Answer questions about the code, architecture, and project with precision.",
    "If the user asks you to edit, create, or modify files, tell them to type their request as a task directly \u2014 the agent loop will handle it with real tools.",
    "Do not claim to have run commands or modified files unless explicitly shown.",
    "",
    `Project directory: ${context.cwd}`,
    projectFiles ? `
Project structure:
${projectFiles}` : "",
    context.sessionContext ? `
Recent session context:
${context.sessionContext}` : ""
  ].filter(Boolean).join("\n");
}
function listProjectFiles(cwd) {
  const SKIP = /* @__PURE__ */ new Set(["node_modules", "dist", "out", ".git", ".next", "__pycache__", "target", "build", ".kova"]);
  const MAX_ENTRIES = 80;
  const lines = [];
  function walk(dir, prefix, depth) {
    if (depth > 2 || lines.length >= MAX_ENTRIES) return;
    let entries;
    try {
      entries = readdirSync2(dir);
    } catch {
      return;
    }
    const filtered = entries.filter((e) => !SKIP.has(e) && !e.startsWith("."));
    for (const entry of filtered) {
      if (lines.length >= MAX_ENTRIES) {
        lines.push(`${prefix}...`);
        return;
      }
      const full = join8(dir, entry);
      try {
        if (statSync(full).isDirectory()) {
          lines.push(`${prefix}${entry}/`);
          walk(full, `${prefix}  `, depth + 1);
        } else {
          lines.push(`${prefix}${entry}`);
        }
      } catch {
      }
    }
  }
  walk(cwd, "  ", 0);
  return lines.join("\n");
}
function defaultBaseUrl(provider) {
  if (provider === "openai") return "https://api.openai.com/v1";
  if (provider === "deepseek") return "https://api.deepseek.com";
  if (provider === "kimi") return "https://api.moonshot.ai/v1";
  if (provider === "openrouter") return "https://openrouter.ai/api/v1";
  if (provider === "ollama") return "http://localhost:11434/v1";
  return void 0;
}
function defaultModel(provider) {
  if (provider === "openai") return "gpt-4.1";
  if (provider === "deepseek") return "deepseek-v4-flash";
  if (provider === "kimi") return "kimi-k2.5";
  if (provider === "openrouter") return "anthropic/claude-sonnet-4.5";
  if (provider === "ollama") return "qwen2.5-coder:7b";
  return void 0;
}

// src/commands/auth.ts
import { spawn as spawn2 } from "child_process";
import { createHash, randomBytes } from "crypto";
import { createServer } from "http";
import chalk7 from "chalk";
async function loginCommand(args, _context) {
  const config = loginConfig(args);
  if (config.authUrl && config.tokenUrl && !config.deviceOnly) {
    return browserLogin(config);
  }
  if (!config.deviceUrl || !config.tokenUrl) {
    console.log(chalk7.red("OnAuth/OAuth endpoint not configured."));
    console.log(chalk7.dim("Set KOVA_ONAUTH_ISSUER_URL, or set authorization/token endpoints."));
    console.log(chalk7.dim("Browser login: KOVA_ONAUTH_AUTHORIZATION_URL + KOVA_ONAUTH_TOKEN_URL."));
    console.log(chalk7.dim("Device login: KOVA_ONAUTH_DEVICE_CODE_URL + KOVA_ONAUTH_TOKEN_URL."));
    console.log(chalk7.dim("Optional: set KOVA_ONAUTH_LLM_BASE_URL or pass --base-url for the LLM gateway."));
    return 2;
  }
  return deviceLogin(config);
}
async function browserLogin(config) {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  const state = base64Url(randomBytes(24));
  const callback = await waitForBrowserCallback(config.redirectPort);
  const redirectUri = callback.redirectUri;
  const url = new URL(config.authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (config.audience) url.searchParams.set("audience", config.audience);
  console.log(chalk7.bold("Kova OnAuth login"));
  console.log(`${chalk7.dim("Open")} ${url.toString()}`);
  if (!config.noOpen) openBrowser(url.toString());
  const result = await callback.result;
  callback.close();
  if (result.error) throw new Error(result.error);
  if (result.state !== state) throw new Error("OnAuth state mismatch. Login was rejected for safety.");
  if (!result.code) throw new Error("OnAuth callback did not include an authorization code.");
  const token = await exchangeAuthorizationCode(config, result.code, redirectUri, verifier);
  saveTokenSession(config, token);
  return 0;
}
async function deviceLogin(config) {
  const device = await requestDeviceCode(config);
  const verificationUrl = device.verification_uri_complete ?? device.verification_uri ?? device.verification_url;
  if (!verificationUrl) throw new Error("OnAuth device response did not include a verification URL.");
  console.log(chalk7.bold("Kova OnAuth login"));
  console.log(`${chalk7.dim("Open")} ${verificationUrl}`);
  console.log(`${chalk7.dim("Code")} ${chalk7.bold(device.user_code)}`);
  console.log(chalk7.dim(`Waiting for authorization, expires in ${device.expires_in ?? 600}s...`));
  if (!config.noOpen) openBrowser(verificationUrl);
  const token = await pollForToken(config, device);
  saveTokenSession(config, token);
  return 0;
}
function saveTokenSession(config, token) {
  if (!token.access_token) throw new Error("OnAuth token response did not include access_token.");
  const now = /* @__PURE__ */ new Date();
  const account = decodeJwtAccount(token.access_token);
  const session = {
    type: "oauth",
    provider: "onauth",
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    tokenType: token.token_type,
    scope: token.scope,
    expiresAt: token.expires_in ? new Date(now.getTime() + token.expires_in * 1e3).toISOString() : void 0,
    account,
    baseUrl: config.baseUrl ?? token.llm_base_url ?? token.api_base_url ?? token.base_url,
    model: config.model ?? token.model,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
  writeAuthSession(session);
  console.log(chalk7.green(`Logged in${account?.email ? ` as ${account.email}` : ""}.`));
  console.log(chalk7.dim(`Session saved to ${authSessionPath()}`));
  if (!session.baseUrl) {
    console.log(chalk7.yellow("No LLM gateway base URL was saved. Set KOVA_ONAUTH_LLM_BASE_URL or OPENAI_COMPATIBLE_BASE_URL before running tasks."));
  }
}
async function logoutCommand(_args, _context) {
  const removed = deleteAuthSession();
  console.log(removed ? chalk7.green("Logged out.") : chalk7.dim("No OnAuth session found."));
  return 0;
}
async function authCommand(args, context) {
  const [subcommand = "status", ...rest] = args;
  if (subcommand === "login") return loginCommand(rest, context);
  if (subcommand === "logout") return logoutCommand(rest, context);
  if (subcommand === "status") {
    printAuthStatus();
    return 0;
  }
  console.log(chalk7.red(`Unknown auth command: ${subcommand}`));
  console.log(chalk7.dim("Usage: kova auth status | kova auth login | kova auth logout"));
  return 2;
}
function currentAuthLabel() {
  const session = readAuthSession();
  if (!session) return null;
  const status = isAuthSessionExpired(session) ? "expired" : "active";
  return session.account?.email ? `onauth:${session.account.email} (${status})` : `onauth (${status})`;
}
function hasUsableAuthSession() {
  const session = readAuthSession();
  return Boolean(session && !isAuthSessionExpired(session));
}
function printAuthStatus() {
  const session = readAuthSession();
  if (!session) {
    console.log(chalk7.yellow("Not logged in via OnAuth."));
    console.log(chalk7.dim(`Session path: ${authSessionPath()}`));
    return;
  }
  console.log(`${chalk7.dim("Provider")} OnAuth`);
  console.log(`${chalk7.dim("Account")} ${session.account?.email ?? session.account?.name ?? session.account?.id ?? "unknown"}`);
  console.log(`${chalk7.dim("Status")} ${isAuthSessionExpired(session) ? chalk7.red("expired") : chalk7.green("active")}`);
  console.log(`${chalk7.dim("Expires")} ${session.expiresAt ?? "unknown"}`);
  console.log(`${chalk7.dim("Gateway")} ${session.baseUrl ?? process.env.KOVA_ONAUTH_LLM_BASE_URL ?? process.env.OPENAI_COMPATIBLE_BASE_URL ?? "not configured"}`);
  console.log(`${chalk7.dim("Model")} ${process.env.KOVA_LLM_MODEL ?? session.model ?? "default"}`);
  console.log(`${chalk7.dim("Session")} ${authSessionPath()}`);
}
function loginConfig(args) {
  const issuer = trimSlash(readOption(args, "--issuer") ?? process.env.KOVA_ONAUTH_ISSUER_URL ?? process.env.KOVA_AUTH_ISSUER_URL);
  return {
    authUrl: readOption(args, "--auth-url") ?? process.env.KOVA_ONAUTH_AUTHORIZATION_URL ?? process.env.KOVA_AUTH_AUTHORIZATION_URL ?? (issuer ? `${issuer}/oauth/authorize` : void 0),
    deviceUrl: readOption(args, "--device-url") ?? process.env.KOVA_ONAUTH_DEVICE_CODE_URL ?? process.env.KOVA_AUTH_DEVICE_CODE_URL ?? (issuer ? `${issuer}/oauth/device/code` : void 0),
    tokenUrl: readOption(args, "--token-url") ?? process.env.KOVA_ONAUTH_TOKEN_URL ?? process.env.KOVA_AUTH_TOKEN_URL ?? (issuer ? `${issuer}/oauth/token` : void 0),
    clientId: readOption(args, "--client-id") ?? process.env.KOVA_ONAUTH_CLIENT_ID ?? process.env.KOVA_AUTH_CLIENT_ID ?? "kova-cli",
    scope: readOption(args, "--scope") ?? process.env.KOVA_ONAUTH_SCOPE ?? process.env.KOVA_AUTH_SCOPE ?? "openid profile email offline_access",
    audience: readOption(args, "--audience") ?? process.env.KOVA_ONAUTH_AUDIENCE ?? process.env.KOVA_AUTH_AUDIENCE,
    baseUrl: readOption(args, "--base-url") ?? process.env.KOVA_ONAUTH_LLM_BASE_URL,
    model: readOption(args, "--model") ?? process.env.KOVA_LLM_MODEL,
    noOpen: hasFlag(args, "--no-open"),
    deviceOnly: hasFlag(args, "--device-code"),
    redirectPort: numberOption(readOption(args, "--redirect-port") ?? process.env.KOVA_ONAUTH_REDIRECT_PORT)
  };
}
async function requestDeviceCode(config) {
  const response = await postForm(config.deviceUrl, {
    client_id: config.clientId,
    scope: config.scope,
    audience: config.audience
  });
  if (!response.ok) throw new Error(`OnAuth device request failed: ${response.status} ${await response.text()}`);
  return await response.json();
}
async function pollForToken(config, device) {
  const started = Date.now();
  const expiresMs = (device.expires_in ?? 600) * 1e3;
  let intervalMs = Math.max(device.interval ?? 5, 1) * 1e3;
  while (Date.now() - started < expiresMs) {
    await delay(intervalMs);
    const response = await postForm(config.tokenUrl, {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: device.device_code,
      client_id: config.clientId
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.access_token) return body;
    if (body.error === "authorization_pending") continue;
    if (body.error === "slow_down") {
      intervalMs += 5e3;
      continue;
    }
    if (body.error === "expired_token") throw new Error("OnAuth login expired before authorization completed.");
    if (body.error === "access_denied") throw new Error("OnAuth login was denied.");
    throw new Error(body.error_description ?? body.error ?? `OnAuth token request failed: ${response.status}`);
  }
  throw new Error("OnAuth login expired before authorization completed.");
}
async function exchangeAuthorizationCode(config, code, redirectUri, verifier) {
  const response = await postForm(config.tokenUrl, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    code_verifier: verifier
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error_description ?? body.error ?? `OnAuth token request failed: ${response.status}`);
  return body;
}
async function postForm(url, values) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) body.set(key, value);
  }
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body
  });
}
function waitForBrowserCallback(port) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const server = createServer((req, res) => {
      const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host}`);
      if (requestUrl.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const code = requestUrl.searchParams.get("code") ?? void 0;
      const state = requestUrl.searchParams.get("state") ?? void 0;
      const error = requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error") ?? void 0;
      res.writeHead(error ? 400 : 200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(error ? "<h1>Kova login failed</h1><p>You can close this tab.</p>" : "<h1>Kova login complete</h1><p>You can close this tab and return to the terminal.</p>");
      callbackResolve({ code, state, error });
    });
    let callbackResolve;
    const result = new Promise((resolveResult) => {
      callbackResolve = resolveResult;
    });
    server.on("error", (error) => {
      if (!settled) reject(error);
    });
    server.listen(port ?? 0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not start local OnAuth callback server."));
        return;
      }
      settled = true;
      resolve({
        redirectUri: `http://127.0.0.1:${address.port}/callback`,
        result,
        close: () => server.close()
      });
    });
  });
}
function openBrowser(url) {
  const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", '""', url] : [url];
  const child = spawn2(command, args, { detached: true, stdio: "ignore", shell: false });
  child.unref();
}
function decodeJwtAccount(accessToken) {
  const [, payload] = accessToken.split(".");
  if (!payload) return void 0;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(Buffer.from(normalized, "base64").toString("utf-8"));
    return {
      id: stringField(json.sub),
      email: stringField(json.email) ?? stringField(json.preferred_username),
      name: stringField(json.name)
    };
  } catch {
    return void 0;
  }
}
function base64Url(value) {
  return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function stringField(value) {
  return typeof value === "string" && value ? value : void 0;
}
function trimSlash(value) {
  return value?.replace(/\/+$/, "");
}
function numberOption(value) {
  if (!value) return void 0;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : void 0;
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// src/commands/providers.ts
import chalk8 from "chalk";
async function providersCommand(_args, _context) {
  const current = configuredLlm();
  const authed = new Set(credentialProviders());
  console.log(chalk8.bold("Kova providers"));
  for (const provider of PROVIDERS) {
    const marker = current.provider === provider ? chalk8.green("*") : " ";
    const credential = authed.has(provider) ? chalk8.green("connected") : chalk8.dim("not connected");
    console.log(`${marker} ${provider} ${credential}`);
  }
  console.log(chalk8.dim(`Config: ${configPath()}`));
  if (current.provider) {
    console.log(`${chalk8.dim("Current")} ${current.provider}${current.model ? `:${current.model}` : ""}`);
  }
  return 0;
}
async function useCommand(args, _context) {
  const [providerArg] = positional(args);
  const provider = asProvider(providerArg);
  if (!provider) {
    console.log(chalk8.red("Usage: kova use <provider> [--model <model>] [--base-url <url>]"));
    console.log(chalk8.dim(`Providers: ${PROVIDERS.join(", ")}`));
    return 2;
  }
  const config = updateLlmConfig({
    provider,
    model: readOption(args, "--model") ?? catalogEntry(provider)?.defaultModel,
    baseUrl: readOption(args, "--base-url") ?? catalogEntry(provider)?.baseUrl
  });
  console.log(chalk8.green(`Using ${config.llm?.provider}${config.llm?.model ? `:${config.llm.model}` : ""}`));
  console.log(chalk8.dim(`Saved to ${configPath()}`));
  return 0;
}

// src/commands/sessions.ts
import chalk9 from "chalk";
async function sessionsCommand(args, context) {
  const [subcommand = "list", id] = positional(args);
  if (subcommand === "list") return list(context);
  if (subcommand === "show") return show(context, id);
  console.log(chalk9.red(`Unknown sessions command: ${subcommand}`));
  console.log(chalk9.dim("Usage: kova sessions [list] | kova sessions show <id>"));
  return 2;
}
function list(context) {
  const sessions = listSessions(context.cwd);
  if (sessions.length === 0) {
    console.log(chalk9.dim('No sessions yet. Run kova or kova run "task" to create one.'));
    return 0;
  }
  console.log(chalk9.bold("Kova sessions"));
  for (const session of sessions) {
    console.log(sessionSummary(session));
  }
  return 0;
}
function show(context, id) {
  if (!id) {
    console.log(chalk9.red("Usage: kova sessions show <id>"));
    return 2;
  }
  const session = readSession(context.cwd, id);
  if (!session) {
    console.log(chalk9.red(`Session not found: ${id}`));
    return 1;
  }
  console.log(chalk9.bold(`${session.id} ${session.title}`));
  console.log(chalk9.dim(`Created ${session.createdAt}  Updated ${session.updatedAt}`));
  for (const event of session.events) {
    const status = event.status ? ` ${chalk9.dim(`[${event.status}]`)}` : "";
    console.log(`
${chalk9.cyan(event.kind)} ${chalk9.dim(event.timestamp)}${status}`);
    console.log(event.content);
  }
  return 0;
}

// src/commands/connect.ts
import { createInterface } from "readline/promises";
import chalk11 from "chalk";

// src/ui/select.ts
import { emitKeypressEvents } from "readline";
import chalk10 from "chalk";
async function selectOption(config) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return null;
  if (config.options.length === 0) {
    console.log(chalk10.dim(config.emptyMessage ?? "No options available."));
    return null;
  }
  const previousRaw = process.stdin.isRaw;
  let index = Math.max(0, config.options.findIndex((option) => option.value === config.initialValue));
  if (index < 0) index = 0;
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdout.write("\x1B[?25l");
  let renderedLines = 0;
  const render = () => {
    clear(renderedLines);
    const lines = buildLines(config, index);
    renderedLines = lines.length;
    process.stdout.write(`${lines.join("\n")}
`);
  };
  return await new Promise((resolve) => {
    const finish = (value) => {
      process.stdin.off("keypress", onKey);
      process.stdin.setRawMode(Boolean(previousRaw));
      process.stdout.write("\x1B[?25h");
      clear(renderedLines);
      resolve(value);
    };
    const onKey = (_chunk, key) => {
      if (key.ctrl && key.name === "c") return finish(null);
      if (key.name === "escape" || key.name === "q") return finish(null);
      if (key.name === "up" || key.name === "k") {
        index = (index - 1 + config.options.length) % config.options.length;
        render();
        return;
      }
      if (key.name === "down" || key.name === "j") {
        index = (index + 1) % config.options.length;
        render();
        return;
      }
      if (key.name === "return") return finish(config.options[index].value);
      const digit = Number(key.sequence);
      if (Number.isInteger(digit) && digit >= 1 && digit <= Math.min(9, config.options.length)) {
        index = digit - 1;
        render();
      }
    };
    process.stdin.on("keypress", onKey);
    render();
  });
}
function buildLines(config, index) {
  const width = Math.max(48, Math.min(process.stdout.columns ?? 80, 96));
  const title = ` ${config.title} `;
  const top = `${chalk10.dim("+")}${chalk10.dim(title.padEnd(width - 2, "-"))}${chalk10.dim("+")}`;
  const bottom = `${chalk10.dim("+")}${chalk10.dim("up/down move - enter select - esc cancel".padEnd(width - 2, "-"))}${chalk10.dim("+")}`;
  const rows = config.options.map((option, itemIndex) => {
    const selected = itemIndex === index;
    const prefix = selected ? chalk10.black.bgWhite(" > ") : "   ";
    const number = chalk10.dim(`${itemIndex + 1}. `);
    const detail = option.detail ? chalk10.dim(`  ${option.detail}`) : "";
    const raw = `${number}${option.label}${detail}`;
    const content = trim(raw, width - 6);
    const padded = content + " ".repeat(Math.max(0, width - 5 - visibleLength2(content)));
    return `${chalk10.dim("|")}${prefix}${selected ? chalk10.black.bgWhite(padded) : padded}${chalk10.dim("|")}`;
  });
  return [top, ...rows, bottom];
}
function clear(lines) {
  if (lines <= 0) return;
  process.stdout.write(`\x1B[${lines}A`);
  for (let i = 0; i < lines; i++) {
    process.stdout.write("\x1B[2K");
    if (i < lines - 1) process.stdout.write("\x1B[1B");
  }
  process.stdout.write(`\x1B[${Math.max(0, lines - 1)}A`);
}
function trim(value, width) {
  return visibleLength2(value) > width ? `${stripAnsi(value).slice(0, Math.max(0, width - 1))}.` : value;
}
function visibleLength2(value) {
  return stripAnsi(value).length;
}
function stripAnsi(value) {
  return value.replace(/\x1B\[[0-9;]*m/g, "");
}

// src/commands/connect.ts
var activePrompt = null;
async function withConnectPrompt(promptFn, fn) {
  const previous = activePrompt;
  activePrompt = promptFn;
  try {
    return await fn();
  } finally {
    activePrompt = previous;
  }
}
async function connectCommand(args, context) {
  const [providerArg] = positional(args);
  const selected = providerArg ?? await chooseProvider();
  if (!selected) return 1;
  if (selected === "onauth") {
    return loginCommand(args, context);
  }
  const provider = asProvider(selected);
  if (!provider) {
    console.log(chalk11.red(`Unknown provider: ${selected}`));
    return 2;
  }
  const entry = catalogEntry(provider);
  if (!entry) {
    console.log(chalk11.red(`Unknown provider: ${provider}`));
    return 2;
  }
  const model = readOption(args, "--model") ?? await prompt(`Model`, entry.defaultModel);
  const baseUrl = readOption(args, "--base-url") ?? await promptBaseUrl(provider, entry.baseUrl);
  if (entry.kind === "local") {
    updateLlmConfig({ provider, model, baseUrl });
    console.log(chalk11.green(`Connected ${entry.label} (${model}).`));
    console.log(chalk11.dim(`Config: ${configPath()}`));
    return 0;
  }
  const apiKey = readOption(args, "--api-key") ?? await promptApiKey(entry.envKey);
  if (!apiKey) {
    console.log(chalk11.red("API key is required for this provider."));
    return 2;
  }
  writeCredential({ provider, apiKey, baseUrl });
  updateLlmConfig({ provider, model, baseUrl });
  console.log(chalk11.green(`Connected ${entry.label} (${model}).`));
  console.log(chalk11.dim(`Credentials: ${credentialsPath()}`));
  console.log(chalk11.dim(`Config: ${configPath()}`));
  return 0;
}
async function modelsCommand(args, _context) {
  const [providerArg] = positional(args);
  const settings = resolveLlmSettings();
  const provider = asProvider(providerArg) ?? settings.provider;
  if (!provider) {
    console.log(chalk11.yellow("No provider configured. Run kova connect first."));
    return 1;
  }
  const entry = catalogEntry(provider);
  const dynamic = await fetchModels(provider, settings.baseUrl, settings.apiKey);
  const models = dynamic.length > 0 ? dynamic : entry?.models ?? [];
  if (models.length === 0) {
    console.log(chalk11.bold(`${entry?.label ?? provider} models`));
    console.log(chalk11.dim("No model list available for this provider."));
    return 0;
  }
  if (!args.includes("--list")) {
    const selected = await selectOption({
      title: `${entry?.label ?? provider} models`,
      initialValue: settings.model,
      options: models.map((model) => ({
        value: model,
        label: `${provider}/${model}`,
        detail: model === settings.model ? "current" : void 0
      }))
    });
    if (selected) {
      updateLlmConfig({ provider, model: selected, baseUrl: settings.baseUrl });
      console.log(chalk11.green(`Using ${provider}/${selected}`));
      return 0;
    }
  }
  console.log(chalk11.bold(`${entry?.label ?? provider} models`));
  for (const model of models) {
    const marker = settings.model === model ? chalk11.green("*") : " ";
    console.log(`${marker} ${provider}/${model}`);
  }
  return 0;
}
async function chooseProvider() {
  const selected = await selectOption({
    title: "Connect provider",
    options: PROVIDER_CATALOG.map((entry) => ({
      value: entry.id,
      label: entry.label,
      detail: entry.kind === "oauth" ? "browser login" : entry.kind === "local" ? "local model" : "API key"
    }))
  });
  if (selected) return selected;
  console.log(chalk11.bold("Connect provider"));
  PROVIDER_CATALOG.forEach((entry, index2) => {
    console.log(`  ${index2 + 1}. ${entry.label}`);
  });
  const answer = await prompt("Select provider number or id");
  const index = Number(answer);
  if (Number.isInteger(index) && index >= 1 && index <= PROVIDER_CATALOG.length) {
    return PROVIDER_CATALOG[index - 1].id;
  }
  return answer || null;
}
async function promptBaseUrl(provider, fallback) {
  if (provider !== "openai-compatible") return fallback;
  return await prompt("Base URL", fallback);
}
async function promptApiKey(envKey) {
  const hint = envKey && process.env[envKey] ? `${envKey} env detected` : "paste key";
  if (envKey && process.env[envKey]) return process.env[envKey] ?? "";
  return await prompt(`API key (${hint})`);
}
async function prompt(label, fallback) {
  if (activePrompt) return activePrompt(label, fallback);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const suffix = fallback ? ` [${fallback}]` : "";
    const answer = await rl.question(`${label}${suffix}: `);
    return answer.trim() || fallback || "";
  } finally {
    rl.close();
  }
}
async function fetchModels(provider, baseUrl, apiKey) {
  if (!baseUrl) return [];
  if (provider === "anthropic") return [];
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : void 0
    });
    if (!response.ok) return [];
    const json = await response.json();
    return json.data?.map((item) => item.id).filter((id) => Boolean(id)) ?? [];
  } catch {
    return [];
  }
}

// src/commands/chat.ts
var slashCommands = {
  init: initCommand,
  memory: memoryCommand,
  metrics: metricsCommand,
  validate: validateCommand,
  auth: authCommand,
  login: loginCommand,
  logout: logoutCommand,
  providers: providersCommand,
  sessions: sessionsCommand,
  use: useCommand,
  connect: connectCommand,
  models: modelsCommand
};
async function chatCommand(args, context) {
  const session = resolveChatSession(args, context);
  if (!session) return 1;
  const autoApply = !hasFlag(args, "--review") && !hasFlag(args, "--no-apply");
  const initialTask = positional(args).join(" ").trim();
  if (initialTask) {
    return runTask(initialTask, context, session, autoApply);
  }
  printBanner(context, session, autoApply);
  const terminal = Boolean(process.stdin.isTTY);
  const rl = createInterface2({
    input: process.stdin,
    output: process.stdout,
    terminal
  });
  const ask = createLineReader(rl, terminal);
  while (true) {
    let rawLine = "";
    try {
      rawLine = await ask("kova> ");
    } catch {
      break;
    }
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const shouldExit = await handleLine(line, context, session, autoApply, ask);
    if (shouldExit) break;
  }
  rl.close();
  return 0;
}
async function resumeCommand(args, context) {
  const [id] = positional(args);
  if (!id) {
    console.log(chalk12.red("Usage: kova resume <session-id>"));
    return 2;
  }
  return chatCommand(["--session", id], context);
}
async function handleLine(line, context, session, autoApply, ask) {
  if (line === "/exit" || line === "/quit" || line === "exit" || line === "quit") {
    printBye();
    return true;
  }
  if (line === "/help" || line === "help") {
    printHelpText();
    return false;
  }
  if (line === "/clear" || line === "clear") {
    console.clear();
    return false;
  }
  if (line === "/status" || line === "status") {
    printStatus(context, session, autoApply);
    return false;
  }
  if (line.startsWith("/")) {
    await runSlashCommand(line.slice(1), context, session, autoApply, ask);
    return false;
  }
  if (isLocalStatusQuestion(line)) {
    printUserBlock(line);
    const reply = `Project: ${context.cwd}
Session: ${session.id}
Use /status for full local runtime state.`;
    printAssistantBlock(reply);
    appendSessionEvent(session, { kind: "user", content: line });
    appendSessionEvent(session, { kind: "system", content: reply, status: "local-status" });
    return false;
  }
  if (isConversationalMessage(line)) {
    await handleConversationalMessage(line, context, session);
    return false;
  }
  await runTask(line, context, session, autoApply);
  return false;
}
async function runSlashCommand(input, context, session, autoApply, ask) {
  const [command, ...args] = tokenize(input);
  if (!command) return;
  if (command === "review") {
    const task = args.join(" ").trim();
    if (!task) {
      console.log(chalk12.red("Usage: /review describe the task"));
      return;
    }
    await runTask(task, context, session, false);
    return;
  }
  if (command === "run") {
    const review = args.includes("--review") || args.includes("--no-apply");
    const task = args.filter((arg) => arg !== "--review" && arg !== "--no-apply").join(" ").trim();
    if (!task) {
      console.log(chalk12.red("Usage: /run [--review] describe the task"));
      return;
    }
    await runTask(task, context, session, review ? false : autoApply);
    return;
  }
  const handler = slashCommands[command];
  if (!handler) {
    console.log(chalk12.red(`Unknown slash command: /${command}`));
    printHelpText();
    return;
  }
  if (command === "connect") {
    await withConnectPrompt(ask, () => handler(args, context));
    return;
  }
  await handler(args, context);
}
async function runTask(task, context, session, autoApply) {
  printUserBlock(task);
  printWorking(autoApply);
  appendSessionEvent(session, { kind: "user", content: task });
  const llm = resolveLlmSettings();
  const result = await runFullLoop(context.cwd, task, stagedFiles(context.cwd), {
    provider: llm.provider,
    apiKey: llm.apiKey,
    model: llm.model,
    baseUrl: llm.baseUrl,
    sessionContext: sessionContext(session),
    autoApply,
    onEvent: printFullLoopEvent
  });
  appendSessionEvent(session, {
    kind: "assistant",
    content: result.reason,
    status: result.status,
    score: result.score,
    iterations: result.iterations
  });
  printFullLoopResult(result);
  console.log(chalk12.dim(`Session: ${session.id}`));
  console.log("");
  return result.applied ? 0 : 1;
}
async function handleConversationalMessage(line, context, session) {
  printUserBlock(line);
  appendSessionEvent(session, { kind: "user", content: line });
  const reply = await generateChatReply(line, { cwd: context.cwd, sessionContext: sessionContext(session) });
  if (!reply.ok) {
    const message = [
      "No model response was generated.",
      reply.reason ? `Reason: ${reply.reason}` : "",
      "",
      "Start a reachable provider with /connect, or use /status to inspect the current configuration."
    ].filter(Boolean).join("\n");
    printAssistantBlock(message);
    appendSessionEvent(session, { kind: "system", content: message, status: "model-unavailable" });
    return;
  }
  printAssistantBlock(reply.text);
  appendSessionEvent(session, { kind: "assistant", content: reply.text, status: "chat" });
}
function isConversationalMessage(line) {
  const normalized = normalizeText(line);
  const greetings = /* @__PURE__ */ new Set(["oi", "ola", "hello", "hi", "hey", "bom dia", "boa tarde", "boa noite", "obrigado", "obrigada", "thanks", "valeu"]);
  if (greetings.has(normalized)) return true;
  if (looksLikeEngineeringTask(normalized)) return false;
  return normalized.length < 8;
}
function isLocalStatusQuestion(line) {
  const normalized = normalizeText(line);
  return normalized === "que projeto?" || normalized === "qual projeto?" || normalized === "onde estou?" || normalized === "que projeto";
}
function looksLikeEngineeringTask(text) {
  return /(adicione|corrija|implemente|crie|altere|refatore|teste|valide|remova|delete|mova|renomeie|atualize|otimize|resolva|analise|verifique|configure|instale|execute|rode|builde|faca|faz|melhore|ajuste|arrume|mostre|liste|leia|escreva|gere|extraia|converta|migre|depure|debugue|fix|add|create|update|implement|refactor|remove|move|rename|optimize|resolve|analyze|verify|configure|install|run|build|generate|extract|convert|migrate|debug|deploy|test|write|read|show|list|edit|change|modify|check|review|apply|revert|rollback|merge|split|set|bug|erro|error|feature|endpoint|funcao|function|metodo|method|classe|class|modulo|module|arquivo|file|api|rota|route|pagina|page|componente|component|servico|service|banco|database|tabela|table|campo|field|coluna|column|indice|index|query|schema|model|controller|handler|middleware|hook|provider|adapter|factory|repository|entity|dto|interface|type|enum|const|var|import|export|package|depend|config|env|docker|ci|cd|pipeline|deploy|src\/|apps\/|packages\/|tests\/|spec\/|lib\/|cmd\/|internal\/|\.\w{1,5}$)/.test(text);
}
function normalizeText(text) {
  return text.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function printBanner(context, session, autoApply) {
  printTerminalHeader(buildHeaderInfo(context, session, autoApply));
}
function printStatus(context, session, autoApply = true) {
  printStatusPanel(buildHeaderInfo(context, session, autoApply));
}
function buildHeaderInfo(context, session, autoApply) {
  const provider = configuredProvider();
  const auth = currentAuthLabel();
  const llm = resolveLlmSettings();
  const staged = stagedFiles(context.cwd);
  return {
    cwd: context.cwd,
    provider,
    model: llm.model,
    auth,
    sessionId: session?.id,
    sessionTitle: session?.title,
    autoApply,
    stagedCount: staged.length
  };
}
function configuredProvider() {
  const llm = resolveLlmSettings();
  if (llm.provider) return llm.provider;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY) return "kimi";
  if (process.env.OLLAMA_BASE_URL) return "ollama";
  if (process.env.OPENAI_COMPATIBLE_API_KEY && process.env.OPENAI_COMPATIBLE_BASE_URL) return "openai-compatible";
  if (process.env.KOVA_LLM_API_KEY) return "kova-default";
  if (hasUsableAuthSession()) return "openai-compatible:onAuth";
  return null;
}
function resolveChatSession(args, context) {
  const requested = readOption(args, "--session");
  if (requested && !hasFlag(args, "--new-session")) {
    const session = readSession(context.cwd, requested);
    if (!session) {
      console.error(chalk12.red(`Session not found: ${requested}`));
      return null;
    }
    return session;
  }
  if (hasFlag(args, "--new-session")) {
    return createSession(context.cwd, readOption(args, "--title") ?? "Kova session");
  }
  return latestSession(context.cwd) ?? createSession(context.cwd, readOption(args, "--title") ?? "Kova session");
}
function createLineReader(rl, terminal) {
  const queue = [];
  const waiters = [];
  let closed = false;
  rl.on("line", (line) => {
    const waiter = waiters.shift();
    if (waiter) waiter(line);
    else queue.push(line);
  });
  rl.on("close", () => {
    closed = true;
    while (waiters.length) waiters.shift()?.("");
  });
  return async (label, fallback) => {
    const suffix = fallback ? ` [${fallback}]` : "";
    if (terminal) process.stdout.write(label === "kova> " ? promptLabel() : `${label}${suffix}: `);
    const line = queue.length > 0 ? queue.shift() ?? "" : await new Promise((resolve, reject) => {
      if (closed) {
        reject(new Error("input closed"));
        return;
      }
      waiters.push(resolve);
    });
    return line.trim() || fallback || "";
  };
}
function tokenize(input) {
  const tokens = [];
  let current = "";
  let quote = null;
  for (const char of input) {
    if ((char === '"' || char === "'") && !quote) {
      quote = char;
      continue;
    }
    if (char === quote) {
      quote = null;
      continue;
    }
    if (/\s/.test(char) && !quote) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current) tokens.push(current);
  return tokens;
}

// src/env.ts
import { existsSync as existsSync7, readFileSync as readFileSync6 } from "fs";
import { join as join9 } from "path";
function loadProjectEnv(projectRoot) {
  for (const file of [".env", ".env.local"]) {
    loadEnvFile(join9(projectRoot, file));
  }
}
function loadEnvFile(file) {
  if (!existsSync7(file)) return;
  const lines = readFileSync6(file, "utf-8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== void 0) continue;
    process.env[key] = unquote(rawValue.trim());
  }
}
function unquote(value) {
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}

// src/index.ts
var commands = {
  chat: chatCommand,
  run: runCommand,
  validate: validateCommand,
  memory: memoryCommand,
  init: initCommand,
  metrics: metricsCommand,
  ci: ciCommand,
  auth: authCommand,
  login: loginCommand,
  logout: logoutCommand,
  providers: providersCommand,
  connect: connectCommand,
  models: modelsCommand,
  use: useCommand,
  sessions: sessionsCommand,
  resume: resumeCommand
};
async function main(argv) {
  loadProjectEnv(process.cwd());
  const [command, ...args] = argv;
  if (!command) {
    return chatCommand([], { cwd: process.cwd() });
  }
  if (command === "--help" || command === "-h") {
    printHelp();
    return 0;
  }
  const handler = commands[command];
  if (!handler) {
    console.error(chalk13.red(`Unknown command: ${command}`));
    printHelp();
    return 2;
  }
  return handler(args, { cwd: process.cwd() });
}
function printHelp() {
  console.log(`${chalk13.bold("kova")} ${chalk13.dim("standalone CLI")}

${chalk13.bold("Usage")}
  kova
  kova chat
  kova run "task" [--review]
  kova resume <session-id>
  kova sessions [list]
  kova validate --staged [--mode full]
  kova memory list [--scope global] [--status verified]
  kova memory inspect <id>
  kova memory prune
  kova memory remove <id>
  kova init [--stack typescript]
  kova metrics [--json]
  kova ci
  kova login
  kova auth status
  kova logout
  kova providers
  kova connect [provider]
  kova models [provider] [--list]
  kova use <provider> [--model <model>] [--base-url <url>]

${chalk13.dim("Running kova with no command opens an interactive session.")}
${chalk13.dim("Use --review/--no-apply to run the harness and inspect changes without writing files.")}
`);
}
main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error(chalk13.red(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
