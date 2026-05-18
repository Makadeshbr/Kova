"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("node:path");
const node_fs = require("node:fs");
const agent = require("@kova/agent");
const node_child_process = require("node:child_process");
const shared = require("@kova/shared");
const application = require("@kova/application");
const context = require("@kova/context");
const execution = require("@kova/execution");
const orchestrator = require("@kova/orchestrator");
const memory = require("@kova/memory");
const adapters = require("@kova/adapters");
const project = require("@kova/project");
let pty = null;
try {
  pty = require("@lydell/node-pty");
  console.log("[TerminalManager] node-pty loaded OK");
} catch (e) {
  console.warn("[TerminalManager] node-pty not available — terminal features disabled.", e instanceof Error ? e.message : e);
  console.warn("[TerminalManager] Run `npx @electron/rebuild` to rebuild node-pty for this Electron version.");
}
const INTERACTIVE_ALLOWLIST = /* @__PURE__ */ new Set([
  "gh",
  "git",
  "npm",
  "npx",
  "pnpm",
  "yarn",
  "bun",
  "npm.cmd",
  "npx.cmd",
  "pnpm.cmd",
  "yarn.cmd",
  "bun.cmd",
  "node",
  "python",
  "python3",
  "pip",
  "pip3",
  "uv",
  "node.exe",
  "python.exe",
  "python3.exe",
  "pip.exe",
  "pip3.exe",
  "uv.exe",
  "cargo",
  "rustup",
  "go",
  "mvn",
  "gradle",
  "cargo.exe",
  "rustup.exe",
  "go.exe",
  "mvn.cmd",
  "gradle.bat",
  "dotnet",
  "docker",
  "kubectl",
  "aws",
  "gcloud",
  "az",
  "dotnet.exe",
  "docker.exe",
  "kubectl.exe",
  "aws.exe",
  "gcloud.cmd",
  "az.cmd",
  "heroku",
  "vercel",
  "fly",
  "railway",
  "ssh",
  "sftp",
  "vite",
  "next",
  "astro",
  "remix",
  "webpack",
  "webpack-dev-server",
  "vite.cmd",
  "next.cmd",
  "astro.cmd",
  "remix.cmd",
  "webpack.cmd",
  "webpack-dev-server.cmd",
  "serve",
  "http-server",
  "rails",
  "flask",
  "uvicorn",
  "gunicorn",
  "nodemon",
  "serve.cmd",
  "http-server.cmd",
  "rails.bat",
  "flask.exe",
  "uvicorn.exe",
  "nodemon.cmd"
]);
const PERSISTENT_READY_PATTERNS = [
  /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])[:/]/i,
  /\blocal:\s*https?:\/\//i,
  /\bready\b/i,
  /\bcompiled\b/i,
  /\bserver (?:running|started|listening)\b/i,
  /\blistening on\b/i,
  /\bwebpack compiled\b/i,
  /\bvite\b.*\bready\b/i
];
const PERSISTENT_START_GRACE_MS = 1e4;
const WINDOWS_BATCH_TERMINATE_PROMPT = /(?:terminate batch job|finalizar o arquivo em lotes)\s*\([^)]*\)\?/i;
class TerminalManager {
  constructor(ptyImpl = pty, serverProbe = defaultServerProbe) {
    this.ptyImpl = ptyImpl;
    this.serverProbe = serverProbe;
  }
  sessions = /* @__PURE__ */ new Map();
  webContents = null;
  projectRoot = null;
  pendingApprovals = /* @__PURE__ */ new Map();
  setWebContents(wc) {
    this.webContents = wc;
  }
  /** Sets the workspace boundary. All cwd inputs are validated to stay within this root. */
  setProjectRoot(root) {
    this.projectRoot = root;
  }
  get isAvailable() {
    return this.ptyImpl !== null;
  }
  /**
   * Validates a cwd against the configured projectRoot.
   * Returns the absolute path when within the root, or null when outside / unsafe.
   * Empty cwd falls back to the project root itself.
   */
  resolveSafeCwd(cwd) {
    if (!this.projectRoot) return null;
    const trimmed = (cwd ?? "").trim();
    if (!trimmed) return this.projectRoot;
    const rootAbs = path.resolve(this.projectRoot);
    const abs = path.resolve(rootAbs, trimmed);
    const rel = path.relative(rootAbs, abs);
    if (rel.startsWith("..") || rel.startsWith("/") || /^[A-Za-z]:/.test(rel)) return null;
    return abs;
  }
  /** Called from agent tool — blocks until terminal exits */
  async runInteractive(command, cwd, reason) {
    if (!this.ptyImpl) {
      return {
        exitCode: 1,
        output: "Interactive terminal not available. The node-pty module is not compiled for this Electron version. Run: npx @electron/rebuild"
      };
    }
    const id = `term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const exe = command.trim().split(/\s+/)[0];
    if (!INTERACTIVE_ALLOWLIST.has(exe)) {
      return {
        exitCode: 1,
        output: `Command "${exe}" is not in the interactive command allowlist. Allowed commands: ${[...INTERACTIVE_ALLOWLIST].join(", ")}`
      };
    }
    const safeCwd = this.resolveSafeCwd(cwd);
    if (!safeCwd) {
      return {
        exitCode: 1,
        output: this.projectRoot ? `cwd "${cwd}" is outside project "${this.projectRoot}" — execution blocked.` : "No project open — terminal cannot run."
      };
    }
    const approved = await this.requestApproval(id, command, reason);
    if (!approved) {
      return { exitCode: 1, output: "User denied interactive command execution." };
    }
    return this.startSession(id, command, safeCwd, { persistent: shared.isLongRunningCommand(command) });
  }
  /** Open terminal directly from UI (no agent involvement) */
  openTerminal(id, command, cwd) {
    if (!this.ptyImpl) {
      this.webContents?.send("kova:terminal-exit", { id, exitCode: 1 });
      return;
    }
    const safeCwd = this.resolveSafeCwd(cwd);
    if (!safeCwd) {
      this.webContents?.send("kova:terminal-exit", { id, exitCode: 1 });
      return;
    }
    this.startSession(id, command, safeCwd).catch(() => {
    });
  }
  writeInput(id, data) {
    const session = this.sessions.get(id);
    if (!session) return;
    if (session.persistent && process.platform === "win32") {
      if (data === "") {
        this.stopSession(session, "interrupt");
        return;
      }
      if (WINDOWS_BATCH_TERMINATE_PROMPT.test(session.outputBuf) && /^[sSyY](?:\r|\n|\r\n)?$/.test(data)) {
        this.stopSession(session, "batch-confirm");
        return;
      }
    }
    session.pty.write(data);
  }
  resize(id, cols, rows) {
    const session = this.sessions.get(id);
    if (session) {
      try {
        session.pty.resize(cols, rows);
      } catch {
      }
    }
  }
  kill(id) {
    const session = this.sessions.get(id);
    if (session) {
      this.stopSession(session, "user");
    }
  }
  approveInteractive(id, approved) {
    const pending = this.pendingApprovals.get(id);
    if (pending) {
      this.pendingApprovals.delete(id);
      pending.resolve(approved);
    }
  }
  async requestApproval(id, command, reason) {
    if (!this.webContents) return false;
    return new Promise((resolve2, reject) => {
      this.pendingApprovals.set(id, { resolve: resolve2, reject });
      this.webContents.send("kova:interactive-request", { id, command, reason });
      setTimeout(() => {
        if (this.pendingApprovals.has(id)) {
          this.pendingApprovals.delete(id);
          resolve2(false);
        }
      }, 6e4);
    });
  }
  startSession(id, command, cwd, options = {}) {
    return new Promise((resolve2) => {
      if (!this.ptyImpl) {
        resolve2({ exitCode: 1, output: "node-pty not available" });
        return;
      }
      const shell = process.platform === "win32" ? "cmd.exe" : process.env.SHELL ?? "/bin/bash";
      const args = process.platform === "win32" ? ["/c", command] : ["-c", command];
      let outputBuf = "";
      let settled = false;
      let probing = false;
      let readyTimer = null;
      let retryTimer = null;
      const persistent = options.persistent === true;
      const settle = (result) => {
        if (settled) return;
        settled = true;
        if (readyTimer) clearTimeout(readyTimer);
        if (retryTimer) clearTimeout(retryTimer);
        resolve2(result);
      };
      const scheduleReadyRetry = () => {
        if (settled || retryTimer) return;
        retryTimer = setTimeout(() => {
          retryTimer = null;
          trySettlePersistentReady();
        }, 500);
        if (typeof retryTimer.unref === "function") retryTimer.unref();
      };
      const trySettlePersistentReady = () => {
        if (!persistent || probing || settled || !PERSISTENT_READY_PATTERNS.some((pattern) => pattern.test(outputBuf))) return;
        probing = true;
        const meta = analyzePersistentOutput(outputBuf);
        const probe = meta.url ? this.serverProbe(meta.url) : Promise.resolve(meta.ready);
        probe.then((isReachable) => {
          probing = false;
          if (!isReachable || settled) {
            if (!settled) scheduleReadyRetry();
            return;
          }
          settle({
            exitCode: 0,
            output: outputBuf,
            sessionId: id,
            persistent: true,
            ready: true,
            url: meta.url,
            port: meta.port,
            cwd,
            diagnostics: meta.diagnostics
          });
        }).catch(() => {
          probing = false;
          scheduleReadyRetry();
        });
      };
      const ptyProcess = this.ptyImpl.spawn(shell, args, {
        name: "xterm-color",
        cols: 120,
        rows: 30,
        // cwd is always pre-validated by callers via resolveSafeCwd — never falls back to
        // process.cwd() (which would be the Electron app dir, an escape from the workspace).
        cwd,
        env: process.env
      });
      const session = {
        id,
        command,
        cwd,
        pty: ptyProcess,
        outputBuf,
        exitCode: null,
        persistent,
        stopping: false
      };
      this.sessions.set(id, session);
      this.webContents?.send("kova:terminal-started", { id, command, cwd });
      if (persistent) {
        readyTimer = setTimeout(() => {
          const meta = analyzePersistentOutput(outputBuf);
          settle({
            exitCode: 0,
            output: outputBuf || `Persistent command started in Kova terminal: ${command}`,
            sessionId: id,
            persistent: true,
            ready: false,
            url: meta.url,
            port: meta.port,
            cwd,
            diagnostics: meta.url ? [...meta.diagnostics, "readiness_probe_failed"] : meta.diagnostics
          });
        }, PERSISTENT_START_GRACE_MS);
        if (typeof readyTimer.unref === "function") readyTimer.unref();
      }
      ptyProcess.onData((data) => {
        outputBuf += data;
        if (outputBuf.length > 1e5) outputBuf = outputBuf.slice(-1e5);
        session.outputBuf = outputBuf;
        this.webContents?.send("kova:terminal-data", { id, data });
        trySettlePersistentReady();
      });
      ptyProcess.onExit(({ exitCode }) => {
        session.exitCode = exitCode;
        this.webContents?.send("kova:terminal-exit", { id, exitCode });
        this.sessions.delete(id);
        const meta = analyzePersistentOutput(outputBuf);
        settle(persistent ? { exitCode, output: outputBuf, sessionId: id, persistent: true, ready: false, url: meta.url, port: meta.port, cwd, diagnostics: meta.diagnostics } : { exitCode, output: outputBuf });
      });
    });
  }
  killProcessTree(session) {
    const pid = typeof session.pty.pid === "number" ? session.pty.pid : null;
    if (process.platform === "win32" && pid) {
      try {
        node_child_process.execFile("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true }, () => {
        });
        try {
          session.pty.kill();
        } catch {
        }
      } catch {
        try {
          session.pty.kill();
        } catch {
        }
      }
      return;
    }
    try {
      session.pty.kill();
    } catch {
    }
  }
  stopSession(session, reason) {
    if (session.stopping) return;
    session.stopping = true;
    const label = reason === "interrupt" ? "interrupt received" : reason === "batch-confirm" ? "Windows batch termination confirmed" : "stop requested";
    this.webContents?.send("kova:terminal-data", {
      id: session.id,
      data: `\r
[Kova] ${label}; stopping process tree...\r
`
    });
    this.killProcessTree(session);
  }
}
const terminalManager = new TerminalManager();
async function defaultServerProbe(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  if (typeof timeout.unref === "function") timeout.unref();
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    });
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
function analyzePersistentOutput(output) {
  const url = output.match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?[^\s]*/i)?.[0];
  const portMatch = url?.match(/:(\d+)/) ?? output.match(/\b(?:port|porta)\s+(\d{2,5})\b/i);
  const diagnostics = [];
  if (/EADDRINUSE|address already in use|port .* already in use|porta .* em uso/i.test(output)) {
    diagnostics.push("port_in_use");
  }
  if (/requires Node\.js version|unsupported engine|EBADENGINE|node version/i.test(output)) {
    diagnostics.push("node_version_mismatch");
  }
  if (/missing script|script .* not found/i.test(output)) {
    diagnostics.push("missing_script");
  }
  if (/command not found|is not recognized as an internal or external command|ENOENT/i.test(output)) {
    diagnostics.push("command_not_found");
  }
  const ready = !!url || PERSISTENT_READY_PATTERNS.some((pattern) => pattern.test(output));
  return {
    sessionId: void 0,
    ready,
    url,
    port: portMatch?.[1] ? Number(portMatch[1]) : void 0,
    diagnostics
  };
}
const PREVIEW_ROOT = ".kova/preview";
const SKIP_DIRS$1 = /* @__PURE__ */ new Set([".git", "node_modules", "dist", "out", "build", ".next", ".turbo", "coverage"]);
const SKIP_KOVA = [".kova/sessions", ".kova/traces"];
function createPreviewWorkspace(projectRoot, changes, taskId = "task") {
  const previewId = `${sanitizeId(taskId)}-${Date.now()}`;
  const relativeRoot = `${PREVIEW_ROOT}/${previewId}`;
  const root = path.join(projectRoot, relativeRoot);
  node_fs.rmSync(root, { recursive: true, force: true });
  node_fs.mkdirSync(root, { recursive: true });
  if (node_fs.existsSync(projectRoot)) {
    for (const entry of node_fs.readdirSync(projectRoot)) {
      const source = path.join(projectRoot, entry);
      if (!shouldCopy(projectRoot, source)) continue;
      node_fs.cpSync(source, path.join(root, entry), {
        recursive: true,
        dereference: false,
        errorOnExist: false,
        filter: (src) => shouldCopy(projectRoot, src)
      });
    }
  }
  for (const change of changes) {
    const target = path.join(root, change.path);
    if (change.type === "delete") {
      try {
        node_fs.unlinkSync(target);
      } catch {
      }
      continue;
    }
    node_fs.mkdirSync(path.dirname(target), { recursive: true });
    node_fs.writeFileSync(target, change.diff, "utf-8");
  }
  return { root, relativeRoot };
}
function shouldCopy(projectRoot, src) {
  const rel = path.relative(projectRoot, src).replace(/\\/g, "/");
  if (!rel) return true;
  if (rel === PREVIEW_ROOT || rel.startsWith(`${PREVIEW_ROOT}/`)) return false;
  if (SKIP_KOVA.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`))) return false;
  const first = rel.split("/")[0];
  if (first === ".kova") return false;
  return !SKIP_DIRS$1.has(first);
}
function sanitizeId(value) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "task";
}
const SKIP_DIRS = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  "dist",
  "out",
  ".next",
  "__pycache__",
  ".cache",
  "vendor",
  "target",
  "build",
  "coverage"
]);
function isProtectedPath(path$1) {
  const name = path.basename(path$1.replace(/\\/g, "/")).toLowerCase();
  if (name === ".env.example") return false;
  return name === ".env" || name.startsWith(".env.") || name.endsWith(".env") || name.includes(".env.");
}
function findFileByName(root, filename, depth = 0) {
  if (depth > 6) return null;
  let entries;
  try {
    entries = node_fs.readdirSync(root);
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
    const full = path.join(root, entry);
    try {
      const st = node_fs.statSync(full);
      if (!st.isDirectory() && entry === filename) return full;
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
      if (isProtectedPath(rel)) {
        denied.push({ name: token, path: rel, reason: "Protected file: secrets are never attached to context." });
        continue;
      }
      refs.push({ name: token, path: rel, content: node_fs.readFileSync(fullPath, "utf-8").slice(0, 8e3) });
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
function shouldShortCircuitDeniedRefs(message, resolution) {
  if (resolution.denied.length === 0 || resolution.refs.length > 0) return false;
  const withoutRefs = message.replace(/@(?:"([^"]+)"|'([^']+)'|([^\s,;]+))/g, "").trim().toLowerCase();
  if (!withoutRefs) return true;
  return /^(leia|ler|read|explique|explain|mostre|show|abrir|open)\b/.test(withoutRefs);
}
function deniedRefsMessage(resolution) {
  const files = resolution.denied.map((r) => `@${r.path}`).join(", ");
  return `Cannot read ${files}. Environment files may contain secrets and are never attached to context. Use an example file like @.env.example if you want to share variable names without sensitive values.`;
}
function chatOnlyPrompt(stack) {
  return `You are a senior software engineer answering questions about this project.
Stack adapter: ${stack}.

Behavior:
- Answer directly. Never introduce yourself, list capabilities, or use emojis.
- Reply in the same language the user writes in. Keep replies concise.
- For greetings, reply naturally in one short sentence like a colleague would.
- Use provided file context when present. If a file reference was denied, say why briefly.
- If conversation history says files were changed/applied, treat that as the real workspace state.

Tools available in this mode (read-only — no file writes, no shell commands):
- read_file — inspect a file before answering when the answer depends on its contents.
- list_files — list a directory to orient the user.
- grep_codebase — locate a symbol, usage, or pattern. ALWAYS prefer this over describing where something "should" be.
- glob_files — list files matching a glob.

How to use tools:
- Use a tool when the user's question depends on actual code state. Don't guess.
- Don't call tools for greetings, definitions, or general "how does X work" questions.
- A short sentence before a tool call is fine. Avoid long monologues.

When the user asks you to BUILD, CREATE, MODIFY, or RUN something:
- You are in read-only mode and cannot do that here.
- Briefly say so in one sentence and suggest they rephrase as a direct request
  ("crie X", "adicione Y", "rode Z") — Kova will route that to the implementation engine.

Do not resume older tasks unless the user explicitly asks.`;
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
  return `You are Kova in Plan Mode, a read-only senior engineering planner. Output a concrete implementation plan.
Stack: ${stack}.

WORKFLOW:
1. Use read_file/list_files ONLY when the provided project context contains relevant files that must be inspected.
2. If the project context says "(no relevant code files found)", assume a blank project and produce a plan immediately. Do not call tools to confirm emptiness.
3. For self-contained creation requests, produce a concrete implementation plan from the request. Do not narrate exploration.
4. Never modify files, never run shell commands.
5. End with the XML <plan_result> block - no other final text.

OUTPUT CONTRACT (mandatory):
Your final message must contain EXACTLY ONE <plan_result>...</plan_result> block.
Do NOT include any preamble, exploration text, "let me check...", or commentary.
Start your final message directly with <plan_result> and end with </plan_result>.

EVERY <plan_result> MUST INCLUDE:
- <objective>: 1 sentence describing what will be built and why
- <files>: 1-N <file> entries, each with concrete path AND reason. NEVER empty.
- <approach>: numbered steps (1. 2. 3.) describing the implementation order. NEVER vague.
- <validations>: 1-N <command> entries the user can run to verify. Use stack-appropriate commands.
- <risk>: low | medium | high - based on scope and reversibility

EXAMPLE for "create landing page for barbershop":
<plan_result>
  <objective>Build a static landing page for a barbershop with hero, services, and contact sections.</objective>
  <files>
    <file path="index.html" reason="Semantic HTML structure with header, hero, services, contact, footer" />
    <file path="style.css" reason="Layout, typography, color palette, responsive grid" />
    <file path="script.js" reason="Smooth-scroll navigation and contact form validation" />
  </files>
  <approach>1. Scaffold semantic HTML5 layout in index.html with sectioned content. 2. Define design tokens (colors, fonts, spacing) and component styles in style.css using CSS Grid/Flex. 3. Wire smooth-scroll and form validation in script.js. 4. Verify locally by opening index.html in a browser.</approach>
  <validations>
    <command>npx http-server . -p 8080</command>
  </validations>
  <risk>low</risk>
</plan_result>

EXAMPLE for "add login flow to existing React app":
<plan_result>
  <objective>Add email/password login flow with session persistence to the existing React app.</objective>
  <files>
    <file path="src/auth/login-form.tsx" reason="New form component with controlled inputs and submit handler" />
    <file path="src/auth/session.ts" reason="LocalStorage session helpers (read, write, clear)" />
    <file path="src/App.tsx" reason="Add login route and protected-route wrapper" />
  </files>
  <approach>1. Create session.ts with typed helpers. 2. Build LoginForm component with controlled state. 3. Add /login route in App.tsx and gate other routes behind a session check. 4. Add unit tests for session helpers.</approach>
  <validations>
    <command>pnpm test src/auth</command>
    <command>pnpm typecheck</command>
  </validations>
  <risk>medium</risk>
</plan_result>

Now produce the plan for the user's request. Respond with ONLY the <plan_result> XML - no preamble, no exploration text.`;
}
function resolveRunMode(message, explicit) {
  const trimmed = message.trim();
  if (/^\/plan(\s|$)/i.test(trimmed)) return "plan";
  if (/^\/review(\s|$)/i.test(trimmed)) return "review";
  if (/^\/chat(\s|$)/i.test(trimmed)) return "chat";
  if (explicit === "plan" || explicit === "review" || explicit === "chat") return explicit;
  return "patch";
}
function parsePlanResult(text, originalObjective) {
  const xmlMatch = text.match(/<plan_result>([\s\S]*?)<\/plan_result>/i);
  if (!xmlMatch) return null;
  const xml = xmlMatch[1];
  const objective = xml.match(/<objective>([\s\S]*?)<\/objective>/i)?.[1]?.trim() ?? originalObjective;
  const approach = xml.match(/<approach>([\s\S]*?)<\/approach>/i)?.[1]?.trim() ?? "";
  const riskRaw = xml.match(/<risk>([\s\S]*?)<\/risk>/i)?.[1]?.trim().toLowerCase() ?? "medium";
  const risk = riskRaw === "low" || riskRaw === "high" ? riskRaw : "medium";
  const filesSection = xml.match(/<files>([\s\S]*?)<\/files>/i)?.[1] ?? "";
  const files = [];
  for (const match of filesSection.matchAll(/<file\s+path="([^"]+)"\s+reason="([^"]*)"/gi)) {
    files.push({ path: match[1], reason: match[2] });
  }
  const validationsSection = xml.match(/<validations>([\s\S]*?)<\/validations>/i)?.[1] ?? "";
  const validations = [];
  for (const match of validationsSection.matchAll(/<command>([\s\S]*?)<\/command>/gi)) {
    const cmd = match[1].trim();
    if (cmd) validations.push(cmd);
  }
  return { kind: "plan_result", objective, files, approach, validations, risk };
}
const SECTION_PATTERNS = {
  objective: /(?:^|\n)\s*(?:\*\*|#{1,4}\s*)?\s*objective\s*:?\s*\*?\*?\s*\n?([\s\S]*?)(?=(?:\n\s*(?:\*\*|#{1,4}\s*)?(?:files?|approach|validations?|risk|criteria)\s*:?)|$)/i,
  files: /(?:^|\n)\s*(?:\*\*|#{1,4}\s*)?\s*files?\s*:?\s*\*?\*?\s*\n?([\s\S]*?)(?=(?:\n\s*(?:\*\*|#{1,4}\s*)?(?:objective|approach|validations?|risk|criteria)\s*:?)|$)/i,
  approach: /(?:^|\n)\s*(?:\*\*|#{1,4}\s*)?\s*approach\s*:?\s*\*?\*?\s*\n?([\s\S]*?)(?=(?:\n\s*(?:\*\*|#{1,4}\s*)?(?:objective|files?|validations?|risk|criteria)\s*:?)|$)/i,
  validations: /(?:^|\n)\s*(?:\*\*|#{1,4}\s*)?\s*validations?\s*:?\s*\*?\*?\s*\n?([\s\S]*?)(?=(?:\n\s*(?:\*\*|#{1,4}\s*)?(?:objective|files?|approach|risk|criteria)\s*:?)|$)/i,
  risk: /(?:^|\n)\s*(?:\*\*|#{1,4}\s*)?\s*risk\s*:?\s*\*?\*?\s*([\s\S]*?)(?=(?:\n\s*(?:\*\*|#{1,4}\s*)?(?:objective|files?|approach|validations?|criteria)\s*:?)|$)/i
};
function parsePlanResultFromMarkdown(text, originalObjective) {
  const matches = {
    objective: text.match(SECTION_PATTERNS.objective)?.[1]?.trim() ?? "",
    files: text.match(SECTION_PATTERNS.files)?.[1]?.trim() ?? "",
    approach: text.match(SECTION_PATTERNS.approach)?.[1]?.trim() ?? "",
    validations: text.match(SECTION_PATTERNS.validations)?.[1]?.trim() ?? "",
    risk: text.match(SECTION_PATTERNS.risk)?.[1]?.trim() ?? ""
  };
  const sectionCount = Object.values(matches).filter(Boolean).length;
  if (sectionCount < 2) return null;
  const files = [];
  for (const rawLine of matches.files.split("\n")) {
    const line = rawLine.replace(/^[-*•]\s+/, "").trim();
    if (!line) continue;
    const sepMatch = line.match(/^([^\s:—–-]+(?:\.[a-z0-9]+)?)\s*[:—–-]\s*(.+)$/i);
    if (sepMatch) {
      files.push({ path: sepMatch[1].trim(), reason: sepMatch[2].trim() });
    } else if (/[/.\\]/.test(line)) {
      files.push({ path: line, reason: "" });
    }
  }
  const validations = [];
  for (const rawLine of matches.validations.split("\n")) {
    const line = rawLine.replace(/^[-*•]\s+/, "").trim();
    if (line) validations.push(line);
  }
  const riskRaw = matches.risk.toLowerCase();
  const risk = riskRaw.includes("low") ? "low" : riskRaw.includes("high") ? "high" : "medium";
  return {
    kind: "plan_result",
    objective: matches.objective || originalObjective,
    files,
    approach: matches.approach,
    validations,
    risk
  };
}
function stripXmlFragments(text) {
  return text.replace(/<plan_result>[\s\S]*?<\/plan_result>/gi, "").replace(/<\/?[a-z_]+(?:\s+[^>]*)?>/gi, "").trim();
}
function cleanPlanningNarration(text) {
  return stripXmlFragments(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean).filter((line) => !/^let me\b/i.test(line)).filter((line) => !/^i('| a)?ll\s+(check|explore|inspect)\b/i.test(line)).filter((line) => !/^the project (directory )?is empty\b/i.test(line)).filter((line) => !/^the project is a blank slate\b/i.test(line)).join("\n").trim();
}
function isStaticLandingRequest(objective) {
  const normalized = objective.toLowerCase();
  return /\b(landing|site|website|pagina|p[aá]gina|hero|servi[cç]os?|contato|contact|barbearia|barber)\b/.test(normalized);
}
function buildStaticLandingFallback(originalObjective) {
  const steps = [
    "Create the HTML structure with accessible landmarks and clear content sections.",
    "Style the page with a polished responsive layout, strong first viewport, service cards, and contact area.",
    "Add minimal JavaScript only for useful interactions that improve the landing page.",
    "Verify the static page in a browser and check mobile sizing."
  ];
  return {
    kind: "plan_result",
    objective: originalObjective,
    files: [
      { path: "index.html", reason: "Semantic page structure with header, hero, services, contact section, and footer." },
      { path: "styles.css", reason: "Responsive visual system: layout, typography, colors, spacing, and mobile behavior." },
      { path: "script.js", reason: "Small client-side interactions such as smooth scrolling and contact form feedback." }
    ],
    approach: steps.map((step, index) => `${index + 1}. ${step}`).join(" "),
    validations: ["python -m http.server 8080"],
    risk: "low"
  };
}
function parsePlanResultRobust(text, originalObjective) {
  const strict = parsePlanResult(text, originalObjective);
  if (strict) return strict;
  const markdown = parsePlanResultFromMarkdown(text, originalObjective);
  if (markdown) return markdown;
  if (isStaticLandingRequest(originalObjective)) {
    return buildStaticLandingFallback(originalObjective);
  }
  const cleaned = cleanPlanningNarration(text);
  return {
    kind: "plan_result",
    objective: originalObjective,
    files: [],
    approach: cleaned || "Prepare a concrete implementation plan from the request, then validate the affected behavior.",
    validations: [],
    risk: "medium"
  };
}
function stripPlanXml(buffer) {
  let out = buffer.replace(/<plan_result>[\s\S]*?<\/plan_result>/gi, "");
  const partialIdx = out.search(/<[a-z_]*$/i);
  if (partialIdx >= 0) out = out.slice(0, partialIdx);
  const unclosedIdx = out.search(/<plan_result\b/i);
  if (unclosedIdx >= 0) out = out.slice(0, unclosedIdx);
  return out;
}
function buildContextEngine(projectRoot, adapter, memory$1) {
  return new context.ContextEngine(memory$1 ?? new memory.MemorySystem(projectRoot), adapter);
}
function contextBudgetFor(provider) {
  const limit = provider.capabilities().contextTokenLimit;
  return Math.min(2e4, Math.max(2e3, Math.floor(limit * 0.35)));
}
function contextBuildOptions(projectRoot, maxTokens, explicitFiles = [], openedFiles = []) {
  return {
    maxTokens,
    explicitFiles: [...new Set(explicitFiles.filter(Boolean).map((f) => toRelative(projectRoot, f)))],
    openedFiles: [...new Set(openedFiles.filter(Boolean).map((f) => toRelative(projectRoot, f)))]
  };
}
function contextEventPayload(ctx, maxTokens) {
  return {
    files: ctx.files.map((f) => f.path),
    tokensUsed: ctx.tokensUsed,
    maxTokens,
    learningsCount: ctx.learnings.length,
    selectedFiles: ctx.pack?.selectedFiles.slice(0, 12).map((f) => ({
      path: f.path,
      score: f.score,
      confidence: f.confidence,
      reason: f.reason,
      evidence: f.evidence,
      source: f.source,
      kind: f.kind
    })),
    blockedFiles: ctx.pack?.blockedFiles,
    rejectedFiles: ctx.pack?.rejectedFiles.slice(0, 20),
    warnings: ctx.pack?.warnings
  };
}
function createReasoningEmitter(emit) {
  let active = false;
  return {
    start: () => {
      if (active) return;
      active = true;
      emit({ type: "reasoning_start", message: "Reasoning..." });
    },
    delta: (delta) => {
      if (!delta) return;
      if (!active) {
        active = true;
        emit({ type: "reasoning_start", message: "Reasoning..." });
      }
      emit({ type: "reasoning_delta", reasoning: delta });
    },
    end: () => {
      if (!active) return;
      active = false;
      emit({ type: "reasoning_end" });
    }
  };
}
function estimateMessagesTokens(messages) {
  return context.estimateTokens(messages.map((m) => `${m.role}: ${m.content}`).join("\n\n"));
}
function buildFallbackTask(objective, stackAdapter) {
  const trimmed = objective.trim();
  return {
    id: `task-${Date.now()}`,
    objective: trimmed,
    constraints: [],
    nonGoals: [],
    validationCriteria: [],
    type: "feature",
    impact: "low",
    affectedFiles: [],
    // Explicit language in the objective ("JavaScript puro", "em Go", "Python") wins
    // over the project-detected stack. Lets the contract enforce restrictions correctly
    // even when structureTask fails and we fall back to a minimal TaskDefinition.
    stackAdapter: execution.resolveTaskStack(trimmed, stackAdapter)
  };
}
function toRelative(root, filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const rootNorm = root.replace(/\\/g, "/");
  if (normalized.startsWith(rootNorm + "/")) return normalized.slice(rootNorm.length + 1);
  if (/^[A-Za-z]:\//.test(normalized) || normalized.startsWith("/")) {
    try {
      const rel = path.relative(root, path.resolve(filePath)).replace(/\\/g, "/");
      if (!rel.startsWith("..")) return rel;
    } catch {
    }
    return normalized.split("/").at(-1) ?? normalized;
  }
  return normalized;
}
const PRESET_URLS = {
  openai: agent.PROVIDER_DEFAULTS.openai.baseUrl,
  deepseek: agent.PROVIDER_DEFAULTS.deepseek.baseUrl,
  openrouter: agent.PROVIDER_DEFAULTS.openrouter.baseUrl,
  kimi: agent.PROVIDER_DEFAULTS.kimi.baseUrl,
  gemini: agent.PROVIDER_DEFAULTS.gemini.baseUrl,
  xai: agent.PROVIDER_DEFAULTS.xai.baseUrl,
  nvidia: process.env.NVIDIA_BASE_URL ?? agent.PROVIDER_DEFAULTS.nvidia.baseUrl,
  ollama: process.env.OLLAMA_BASE_URL ?? agent.PROVIDER_DEFAULTS.ollama.baseUrl,
  lmstudio: agent.PROVIDER_DEFAULTS.lmstudio.baseUrl
};
const LOCAL_PROVIDERS = /* @__PURE__ */ new Set(["ollama", "lmstudio", "openai-compatible"]);
const PRESET_MODELS = {
  openai: agent.PROVIDER_DEFAULTS.openai.defaultModel,
  deepseek: agent.PROVIDER_DEFAULTS.deepseek.defaultModel,
  kimi: agent.PROVIDER_DEFAULTS.kimi.defaultModel,
  gemini: agent.PROVIDER_DEFAULTS.gemini.defaultModel,
  xai: agent.PROVIDER_DEFAULTS.xai.defaultModel,
  openrouter: agent.PROVIDER_DEFAULTS.openrouter.defaultModel,
  nvidia: agent.PROVIDER_DEFAULTS.nvidia.defaultModel
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
  "xai",
  "XAI",
  "grok",
  "Grok",
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
  const providerName = params.provider ?? "anthropic";
  const requestedModel = params.model?.trim() || void 0;
  let apiKey = params.apiKey ?? "";
  let extraBody = void 0;
  if (providerName === "nvidia") {
    const settings = getSettingsInternal();
    apiKey = process.env.NVIDIA_API_KEY || settings.nvidiaKey || "";
    if (!apiKey) throw new Error("NVIDIA_API_KEY is missing. Configure it via .env or Settings.");
    if (settings.nvidiaEnableThinking !== false) {
      extraBody = { chat_template_kwargs: { thinking: true } };
    }
  }
  if (providerName === "anthropic") {
    if (!apiKey) return null;
    return {
      provider: new agent.AnthropicProvider({ apiKey, model: requestedModel }),
      resolvedProvider: "anthropic",
      resolvedModel: requestedModel,
      fallback: false
    };
  }
  const baseUrl = params.baseUrl ?? PRESET_URLS[providerName] ?? "";
  if (!baseUrl) return null;
  if (!apiKey && !LOCAL_PROVIDERS.has(providerName)) return null;
  const presetFallback = PRESET_MODELS[providerName] ?? "";
  const safeConfigured = requestedModel && !INVALID_MODEL_VALUES.has(requestedModel) ? requestedModel : void 0;
  const resolved = await autoResolveModel(baseUrl, safeConfigured, onModelDetected);
  const model = resolved || presetFallback;
  if (!model) return null;
  if (resolved && onModelDetected) onModelDetected(model);
  const usedFallback = !safeConfigured && !resolved && !!presetFallback;
  return {
    provider: new agent.OpenAICompatibleProvider({ apiKey: apiKey || void 0, baseUrl, model, extraBody }),
    resolvedProvider: providerName,
    resolvedModel: model,
    fallback: usedFallback || !!safeConfigured && resolved !== safeConfigured,
    fallbackReason: usedFallback ? `Model not detected at ${baseUrl}; using preset "${presetFallback}"` : safeConfigured && resolved !== safeConfigured ? `Model "${safeConfigured}" not found; using "${resolved}"` : void 0
  };
}
async function tryFallbackProvider(ctx) {
  let settings;
  try {
    settings = getSettingsInternal();
  } catch {
    return null;
  }
  const fallbackProvider = settings.fallbackProvider?.trim();
  if (!fallbackProvider || fallbackProvider === ctx.params.provider) return null;
  if (ctx.isAborted()) return null;
  if (!agent.isRecoverableProviderError(ctx.primaryError)) return null;
  const fallbackApiKey = resolveFallbackApiKey(fallbackProvider, settings);
  const fallbackParams = {
    ...ctx.params,
    provider: fallbackProvider,
    apiKey: fallbackApiKey || void 0,
    model: settings.fallbackModel?.trim() || void 0
  };
  try {
    const result = await ctx.factory(fallbackParams, ctx.onModelDetected);
    if (!result) return null;
    const reason = ctx.primaryError instanceof Error ? ctx.primaryError.message : String(ctx.primaryError);
    return {
      ...result,
      fallback: true,
      fallbackReason: `Primary provider "${ctx.params.provider ?? "anthropic"}" failed (${reason.slice(0, 80)}); switched to "${fallbackProvider}"`
    };
  } catch {
    return null;
  }
}
function resolveFallbackApiKey(fallbackProvider, settings) {
  return fallbackProvider === "anthropic" ? settings.anthropicKey : fallbackProvider === "openai" ? settings.openaiKey : fallbackProvider === "deepseek" ? settings.deepseekKey : fallbackProvider === "openrouter" ? settings.openrouterKey : fallbackProvider === "kimi" ? settings.kimiKey : fallbackProvider === "gemini" ? settings.geminiKey : fallbackProvider === "xai" ? settings.xaiKey : fallbackProvider === "openai-compatible" ? settings.openaiCompatibleKey : "";
}
const STRUCTURE_TIMEOUT_MS = 3e4;
async function buildPatchTask(objective, provider, projectRoot, adapter, options = {}) {
  const fallback = buildFallbackTask(objective.split("\n")[0].slice(0, 120), adapter.name);
  if (looksLikeScaffoldingRequest(objective)) return fallback;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), STRUCTURE_TIMEOUT_MS);
  const composedSignal = options.signal ? AbortSignal.any([options.signal, timeoutController.signal]) : timeoutController.signal;
  try {
    const structured = await execution.structureTask(objective, {
      root: projectRoot,
      stackAdapter: adapter.name,
      affectedFiles: [],
      llm: wrapWithSignal(provider, composedSignal)
    });
    if (structured.valid) return structured.task;
  } catch {
  } finally {
    clearTimeout(timeoutId);
  }
  return fallback;
}
function wrapWithSignal(provider, signal) {
  return {
    async generate(messages, opts) {
      if (signal.aborted) throw new Error("structuring aborted");
      return provider.generate(messages, opts);
    }
  };
}
function looksLikeScaffoldingRequest(objective) {
  const normalized = objective.toLowerCase().normalize("NFD").replace(new RegExp("\\p{Diacritic}", "gu"), "");
  const hasCreateVerb = /\b(?:cri[aeio]r?|gere|gerar?|scaffold|bootstrap|generate|build|create|make|setup|set up)\b/.test(normalized);
  if (!hasCreateVerb) return false;
  const hasDeliverable = /\b(?:landing|site|website|pagina|page|app|webapp|dockerfile|component|projeto|project|dashboard|admin)\b/.test(normalized);
  return hasDeliverable;
}
class LruCache {
  constructor(capacity) {
    this.capacity = capacity;
    if (capacity <= 0) throw new Error(`LruCache capacity must be > 0 (got ${capacity})`);
  }
  store = /* @__PURE__ */ new Map();
  get size() {
    return this.store.size;
  }
  has(key) {
    return this.store.has(key);
  }
  /**
   * Returns the value AND moves the key to the most-recent position so it's
   * protected from the next eviction.
   */
  get(key) {
    if (!this.store.has(key)) return void 0;
    const value = this.store.get(key);
    this.store.delete(key);
    this.store.set(key, value);
    return value;
  }
  /**
   * Inserts or updates a value. Always lands at the most-recent position. If the
   * cache is at capacity and the key is new, the least-recently-used entry is
   * evicted and returned so the caller can dispose its resources.
   */
  set(key, value) {
    let evicted;
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.capacity) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== void 0) {
        const oldestValue = this.store.get(oldestKey);
        this.store.delete(oldestKey);
        evicted = { key: oldestKey, value: oldestValue };
      }
    }
    this.store.set(key, value);
    return { evicted };
  }
  delete(key) {
    return this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}
const RESULT_COPY = {
  diffReviewMessage: (count) => `${count} file${count === 1 ? "" : "s"} awaiting review`,
  contextLoaded: (count) => `${count} file${count === 1 ? "" : "s"} in context`,
  titleCompleted: "Task complete",
  titlePaused: "Awaiting review",
  titleFailed: "Repair needed",
  summaryCompleted: "Changes applied successfully.",
  summaryPaused: "Review required before applying.",
  summaryMaxIterationsReached: "Maximum repair attempts reached.",
  summaryFailedLayers: (layers, attempts) => `${layers} failed after ${attempts} attempt${attempts === 1 ? "" : "s"}.`
};
const BLANK_PROJECT_IGNORED_ENTRIES = /* @__PURE__ */ new Set([
  ".git",
  ".kova",
  ".turbo",
  "node_modules",
  "dist",
  "out",
  "build",
  ".DS_Store",
  ".gitignore",
  ".gitattributes"
]);
function projectLooksBlank(projectRoot) {
  try {
    return node_fs.readdirSync(projectRoot, { withFileTypes: true }).filter((entry) => !BLANK_PROJECT_IGNORED_ENTRIES.has(entry.name)).length === 0;
  } catch {
    return false;
  }
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
  // FIX-002 + FIX-010: Cache MemorySystem + ContextEngine per projectRoot, bounded by
  // LruCache so opening many projects does not pin instances forever. Both caches share
  // the same key (projectRoot) and the same capacity — when a project is evicted from
  // one, the matching entry is dropped from the other so they stay in sync.
  static MAX_CACHED_PROJECTS = 3;
  memorySystemCache = new LruCache(EngineManager.MAX_CACHED_PROJECTS);
  contextEngineCache = new LruCache(EngineManager.MAX_CACHED_PROJECTS);
  getMemorySystem(projectRoot) {
    const cached = this.memorySystemCache.get(projectRoot);
    if (cached) return cached;
    const memory$1 = new memory.MemorySystem(projectRoot);
    const { evicted } = this.memorySystemCache.set(projectRoot, memory$1);
    if (evicted) this.contextEngineCache.delete(evicted.key);
    return memory$1;
  }
  getContextEngine(projectRoot, adapter) {
    const cached = this.contextEngineCache.get(projectRoot);
    if (cached?.adapterName === adapter.name) return cached.engine;
    const engine = buildContextEngine(projectRoot, adapter, this.getMemorySystem(projectRoot));
    const { evicted } = this.contextEngineCache.set(projectRoot, { adapterName: adapter.name, engine });
    if (evicted) this.memorySystemCache.delete(evicted.key);
    return engine;
  }
  /**
   * FIX-010: Explicit cache cleanup for a project. Called when the user closes or
   * switches projects — frees the in-memory ContextEngine + MemorySystem instances
   * for that root so they don't linger if they would otherwise survive eviction.
   */
  clearProjectCache(projectRoot) {
    this.contextEngineCache.delete(projectRoot);
    this.memorySystemCache.delete(projectRoot);
  }
  /** Thin wrapper that injects this instance's state into the pure tryFallbackProvider helper. */
  async resolveFallbackProvider(params, primaryError) {
    return tryFallbackProvider({
      params,
      primaryError,
      factory: this.providerFactory,
      isAborted: () => Boolean(this.sessionAbort?.signal.aborted),
      onModelDetected: this.onModelDetected ?? void 0
    });
  }
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
  async sendMessage(message, history, params, attachments) {
    return this.sendMessageWithMode(message, history, params, attachments);
  }
  async sendMessageWithMode(message, history, params, attachments) {
    this.sessionAbort?.abort();
    this.sessionAbort = new AbortController();
    if (this.engine) {
      await this.engine.abort().catch(() => null);
      this.engine = null;
    }
    const { projectRoot } = params;
    const profile = project.buildProjectProfile(projectRoot);
    const adapter = profile.confidence > 0 ? adapters.adapterFromProjectProfile(profile) : adapters.detectStack(projectRoot);
    const mode = resolveRunMode(message, params.mode);
    const rawContent = stripModeSlash(message, mode);
    const resolution = resolveAtRefs(rawContent, projectRoot);
    if (resolution.refs.length) this.emit({ type: "tool_result", message: `@ ${resolution.refs.map((r) => r.path).join(", ")}` });
    if (resolution.denied.length) {
      for (const ref of resolution.denied) this.emit({ type: "context_ref_denied", message: ref.reason, toolInput: { path: ref.path } });
    }
    if (resolution.missing.length) this.emit({ type: "tool_result", message: `@ not found: ${resolution.missing.join(", ")}` });
    if (shouldShortCircuitDeniedRefs(rawContent, resolution)) {
      this.onChatResponse?.(deniedRefsMessage(resolution));
      this.emit({ type: "stream_end" });
      return;
    }
    const deterministicReply = buildTestingFollowupReply(resolution.userContent, history);
    if (deterministicReply) {
      const tokens = estimateMessagesTokens([{ role: "assistant", content: deterministicReply }]);
      this.emit({ type: "token", token: deterministicReply });
      this.emit({ type: "token_usage", message: `${tokens} tokens`, tokensUsed: tokens });
      this.emit({ type: "stream_end" });
      return;
    }
    let resolution2;
    try {
      resolution2 = await this.providerFactory(params, this.onModelDetected ?? void 0);
    } catch (err) {
      const fallback = await this.resolveFallbackProvider(params, err);
      if (fallback) {
        resolution2 = fallback;
      } else {
        this.emitProviderError(err);
        if (!this.sessionAbort.signal.aborted) this.onChatResponse?.(formatProviderError(err));
        this.emit({ type: "stream_end" });
        return;
      }
    }
    if (!resolution2) {
      const fallback = await this.resolveFallbackProvider(params, new Error("Primary provider not configured"));
      if (fallback) {
        resolution2 = fallback;
      } else {
        this.onChatResponse?.("Provider not configured. Open Settings.");
        this.emit({ type: "stream_end" });
        return;
      }
    }
    const provider = resolution2.provider;
    this.emit({
      type: "provider_session_start",
      message: resolution2.fallback ? `Provider: ${resolution2.resolvedProvider} / model: ${resolution2.resolvedModel} (fallback — ${resolution2.fallbackReason ?? "configured model unavailable"})` : `Provider: ${resolution2.resolvedProvider} / model: ${resolution2.resolvedModel ?? "auto"}`,
      providerMeta: {
        requestedProvider: params.provider ?? "anthropic",
        requestedModel: params.model || void 0,
        resolvedProvider: resolution2.resolvedProvider,
        resolvedModel: resolution2.resolvedModel,
        fallback: resolution2.fallback,
        fallbackReason: resolution2.fallbackReason
      }
    });
    const explicitFiles = resolution.refs.map((ref) => ref.path);
    if (mode === "plan") {
      await this.runPlanSession(resolution.userContent || "Create an implementation plan for this project.", history, provider, projectRoot, adapter, params.includeProjectContext !== false, this.sessionAbort.signal, explicitFiles, params.openedFiles ?? [], attachments);
      return;
    }
    if (mode === "chat") {
      await this.runChatSession(resolution.userContent, history, provider, projectRoot, adapter, params, this.sessionAbort.signal, explicitFiles, attachments);
      return;
    }
    if (mode === "review") {
      await this.runReviewSession(resolution.userContent, history, provider, projectRoot, adapter, params, this.sessionAbort.signal, explicitFiles, attachments);
      return;
    }
    const task = await buildPatchTask(resolution.userContent, provider, projectRoot, adapter, {
      signal: this.sessionAbort.signal
    });
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
      this.sessionAbort.signal,
      explicitFiles,
      attachments
    );
  }
  async runChatSession(userContent, history, provider, projectRoot, adapter, params, signal, explicitFiles = [], attachments) {
    let streamEndEmitted = false;
    const reasoning = createReasoningEmitter((event) => this.emit(event));
    try {
      let content = userContent;
      if (params.includeProjectContext !== false && (history.length === 0 || !history.some((h) => h.role === "assistant"))) {
        const contextEngine = this.getContextEngine(projectRoot, adapter);
        const maxContextTokens = contextBudgetFor(provider);
        const task = buildFallbackTask(userContent.split("\n")[0].slice(0, 120), adapter.name);
        const ctx = await contextEngine.buildContext(task, projectRoot, contextBuildOptions(projectRoot, maxContextTokens, explicitFiles, params.openedFiles ?? []));
        this.emit({
          type: "context_loaded",
          message: RESULT_COPY.contextLoaded(ctx.files.length),
          context: contextEventPayload(ctx, maxContextTokens)
        });
        if (ctx.files.length > 0) {
          content += "\n\n---\nProject context:\n" + ctx.files.map((f) => `
### ${f.path}
\`\`\`
${f.content}
\`\`\``).join("\n");
        }
      }
      const messages = [...history, { role: "user", content, ...attachments ? { attachments } : {} }];
      reasoning.start();
      let usageReported = false;
      const output = await provider.runAgentLoop(messages, {
        system: chatOnlyPrompt(adapter.name),
        tools: agent.READ_ONLY_TOOLS,
        executor: new agent.ToolExecutor(projectRoot, signal, agent.READ_ONLY_PERMISSION_POLICY),
        maxTurns: 6,
        signal,
        onToken: (t) => {
          reasoning.end();
          this.emit({ type: "token", token: t });
        },
        onReasoningStart: () => reasoning.start(),
        onReasoningDelta: (delta) => reasoning.delta(delta),
        onReasoningEnd: () => reasoning.end(),
        onToolCall: (name, input) => {
          const preview = String(input.path ?? input.dir ?? input.pattern ?? name);
          this.emit({ type: "tool_call", toolName: name, toolInput: input, message: preview });
        },
        onToolResult: (name, result) => this.emit({
          type: "tool_result",
          toolName: name,
          message: result.slice(0, 2e3),
          toolOutput: result.slice(0, 2e4)
        }),
        onUsageReport: (report) => {
          usageReported = true;
          this.emit(usageEventFromReport(report));
        }
      });
      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: "assistant", content: output.thought }]);
      if (!usageReported) this.emit({ type: "token_usage", message: `${turnTokens} tokens`, tokensUsed: turnTokens });
    } catch (err) {
      if (!signal?.aborted) {
        this.emitProviderError(err);
        this.onChatResponse?.(formatProviderError(err));
      }
    } finally {
      reasoning.end();
      if (!streamEndEmitted) {
        this.emit({ type: "stream_end" });
        streamEndEmitted = true;
      }
    }
  }
  async runReviewSession(userContent, history, provider, projectRoot, adapter, params, signal, explicitFiles = [], attachments) {
    let streamEndEmitted = false;
    const reasoning = createReasoningEmitter((event) => this.emit(event));
    try {
      const contextEngine = this.getContextEngine(projectRoot, adapter);
      const maxContextTokens = contextBudgetFor(provider);
      const task = buildFallbackTask(userContent.split("\n")[0].slice(0, 120), adapter.name);
      const ctx = params.includeProjectContext === false ? { files: [], tokensUsed: 0, learnings: [] } : await contextEngine.buildContext(task, projectRoot, contextBuildOptions(projectRoot, maxContextTokens, explicitFiles, params.openedFiles ?? []));
      this.emit({
        type: "context_loaded",
        message: RESULT_COPY.contextLoaded(ctx.files.length),
        context: {
          ...contextEventPayload(ctx, maxContextTokens)
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
${contextText}`, ...attachments ? { attachments } : {} }
      ];
      const executor = new agent.ToolExecutor(projectRoot, signal, agent.READ_ONLY_PERMISSION_POLICY, void 0, void 0, todoEmitter((todos) => this.emit(todosEvent(todos))));
      reasoning.start();
      let usageReported = false;
      const output = await provider.runAgentLoop(messages, {
        system: reviewOnlyPrompt(adapter.name),
        tools: agent.READ_ONLY_TOOLS,
        executor,
        maxTurns: 20,
        // increased: real projects need more turns to read all relevant files
        signal,
        onToken: (t) => {
          reasoning.end();
          this.emit({ type: "token", token: t });
        },
        onReasoningStart: () => reasoning.start(),
        onReasoningDelta: (delta) => reasoning.delta(delta),
        onReasoningEnd: () => reasoning.end(),
        onToolCall: (name, input) => {
          const preview = String(input.path ?? input.dir ?? name);
          this.emit({ type: "tool_call", toolName: name, toolInput: input, message: preview });
        },
        onToolResult: (name, result) => this.emit({
          type: "tool_result",
          toolName: name,
          message: result.slice(0, 2e3),
          toolOutput: result.slice(0, 2e4)
        }),
        onUsageReport: (report) => {
          usageReported = true;
          this.emit(usageEventFromReport(report));
        }
      });
      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: "assistant", content: output.thought }]);
      if (!usageReported) this.emit({ type: "token_usage", message: `${turnTokens} tokens`, tokensUsed: turnTokens });
      if (output.thought.trim()) {
        this.emit({ type: "token", token: output.thought });
      }
    } catch (err) {
      if (!signal?.aborted) {
        this.emitProviderError(err);
        this.onChatResponse?.(formatProviderError(err));
      }
    } finally {
      reasoning.end();
      if (!streamEndEmitted) {
        this.emit({ type: "stream_end" });
        streamEndEmitted = true;
      }
    }
  }
  async runPlanSession(userContent, history, provider, projectRoot, adapter, includeProjectContext = true, signal, explicitFiles = [], openedFiles = [], attachments) {
    let streamEndEmitted = false;
    const reasoning = createReasoningEmitter((event) => this.emit(event));
    try {
      const contextEngine = this.getContextEngine(projectRoot, adapter);
      const maxContextTokens = contextBudgetFor(provider);
      const task = buildFallbackTask(userContent.split("\n")[0].slice(0, 120), adapter.name);
      const ctx = includeProjectContext ? await contextEngine.buildContext(task, projectRoot, contextBuildOptions(projectRoot, maxContextTokens, explicitFiles, openedFiles)) : { files: [], tokensUsed: 0, learnings: [] };
      this.emit({
        type: "context_loaded",
        message: RESULT_COPY.contextLoaded(ctx.files.length),
        context: {
          ...contextEventPayload(ctx, maxContextTokens)
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
          ].join("\n"),
          ...attachments ? { attachments } : {}
        }
      ];
      const planTools = ctx.files.length > 0 || explicitFiles.length > 0 || openedFiles.length > 0 || !projectLooksBlank(projectRoot) ? agent.READ_ONLY_TOOLS : [];
      const executor = new agent.ToolExecutor(projectRoot, signal, agent.READ_ONLY_PERMISSION_POLICY, void 0, void 0, todoEmitter((todos) => this.emit(todosEvent(todos))));
      reasoning.start();
      let usageReported = false;
      let streamBuffer = "";
      let lastVisibleLen = 0;
      const output = await provider.runAgentLoop(messages, {
        system: planOnlyPrompt(adapter.name),
        tools: planTools,
        executor,
        maxTurns: 8,
        signal,
        onToken: (t) => {
          reasoning.end();
          streamBuffer += t;
          const visible = stripPlanXml(streamBuffer);
          if (visible.length > lastVisibleLen) {
            this.emit({ type: "token", token: visible.slice(lastVisibleLen) });
            lastVisibleLen = visible.length;
          }
        },
        onReasoningStart: () => reasoning.start(),
        onReasoningDelta: (delta) => reasoning.delta(delta),
        onReasoningEnd: () => reasoning.end(),
        onToolCall: (name, input) => {
          const preview = String(input.path ?? input.dir ?? name);
          this.emit({ type: "tool_call", toolName: name, toolInput: input, message: preview });
        },
        onToolResult: (name, result) => this.emit({
          type: "tool_result",
          toolName: name,
          message: result.slice(0, 2e3),
          toolOutput: result.slice(0, 2e4)
        }),
        onUsageReport: (report) => {
          usageReported = true;
          this.emit(usageEventFromReport(report));
        }
      });
      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: "assistant", content: output.thought }]);
      if (!usageReported) this.emit({ type: "token_usage", message: `${turnTokens} tokens`, tokensUsed: turnTokens });
      const planMsg = parsePlanResultRobust(output.thought, userContent);
      this.emit({ type: "stream_end", structuredMessage: planMsg });
      streamEndEmitted = true;
    } catch (err) {
      if (!signal?.aborted) {
        this.emitProviderError(err);
        this.onChatResponse?.(formatProviderError(err));
      }
    } finally {
      reasoning.end();
      if (!streamEndEmitted) {
        this.emit({ type: "stream_end" });
        streamEndEmitted = true;
      }
    }
  }
  // Unified Session â€” One loop to rule them all
  async runUnifiedSession(objective, history, params, provider, projectRoot, adapter, task, skipPlan, signal, explicitFiles = [], attachments) {
    const appEngine = new application.CodeApplicationEngine(projectRoot);
    const memory2 = this.getMemorySystem(projectRoot);
    const effectiveHistory = attachments && attachments.length > 0 ? [...history, { role: "user", content: objective, attachments }] : history;
    this.engine = new execution.ExecutionEngine(
      {
        agent: new agent.Agent(provider, projectRoot),
        orchestrator: new orchestrator.HarnessOrchestrator(),
        contextEngine: this.getContextEngine(projectRoot, adapter),
        applicationEngine: appEngine,
        memory: memory2
      },
      {
        projectRoot,
        history: effectiveHistory,
        skipPlan,
        maxIterations: params.maxIterations ?? 5,
        autoApply: params.autoApply ?? false,
        permissionPolicy: permissionPolicyFor(params.permissionMode),
        explicitFiles,
        openedFiles: params.openedFiles ?? [],
        onStateChange: (state) => this.onUpdate?.(state),
        onEvent: (event) => this.onExecutionEvent?.(event),
        interactiveRunner: (command, cwd, reason, options) => {
          if (options?.previewChanges?.length) {
            const preview = createPreviewWorkspace(projectRoot, options.previewChanges, task.id);
            return terminalManager.runInteractive(command, preview.root, `${reason} (preview workspace)`);
          }
          return terminalManager.runInteractive(command, cwd, reason);
        },
        // FIX-003: surface live stdout/stderr from run_command to the UI as
        // command_output events. The UI groups lines by commandId under the
        // originating tool_call activity entry.
        onCommandOutput: (commandId, commandLine, commandStream) => this.emit({
          type: "command_output",
          commandId,
          commandLine,
          commandStream
        })
      }
    );
    let engineStreamEndObserved = false;
    let finalStreamEndEmitted = false;
    const origEventHandler = this.onExecutionEvent;
    const emitFinal = (event) => {
      finalStreamEndEmitted = true;
      origEventHandler?.({ taskId: "chat", timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...event });
    };
    this.onExecutionEvent = (event) => {
      if (event.type === "stream_end") {
        engineStreamEndObserved = true;
        return;
      }
      origEventHandler?.(event);
    };
    try {
      const state = await this.engine.run(task);
      const last = state.iterationHistory.at(-1);
      const files = last?.changes ?? [];
      const score = last?.decision.score ?? last?.harnessResult.score ?? 0;
      const proof = state.proofPack;
      if (files.length > 0) {
        origEventHandler?.({
          taskId: task.id,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          iteration: last?.iteration,
          type: "diff_review_ready",
          message: RESULT_COPY.diffReviewMessage(files.length),
          diffReview: application.createDiffReviewDecision(files)
        });
        const title = state.status === "completed" ? RESULT_COPY.titleCompleted : state.status === "paused" ? RESULT_COPY.titlePaused : RESULT_COPY.titleFailed;
        const failedLayers = last?.harnessResult.layers.filter((layer) => !layer.skipped && !layer.passed) ?? [];
        const failedSummary = failedLayers.length > 0 ? RESULT_COPY.summaryFailedLayers(
          failedLayers.map((layer) => layer.command || layer.name).join(", "),
          state.iterationHistory.length
        ) : RESULT_COPY.summaryMaxIterationsReached;
        const summary = state.status === "completed" ? RESULT_COPY.summaryCompleted : state.status === "paused" ? RESULT_COPY.summaryPaused : failedSummary;
        const structuredMsg = {
          kind: "agent_result",
          title,
          summary,
          filesChanged: files.map((c) => ({
            path: c.path,
            displayName: path.basename(c.path),
            status: c.type === "create" ? "created" : c.type === "delete" ? "deleted" : "modified"
          })),
          validations: last?.harnessResult.layers.map((l) => ({
            command: l.command || l.name,
            status: l.skipped ? "skipped" : l.passed ? "passed" : "failed",
            exitCode: l.exitCode,
            durationMs: l.durationMs ?? l.duration
          })) ?? [],
          risk: proof?.results?.evidenceScore?.risk.riskLevel ?? (score >= 90 ? "low" : score >= 70 ? "medium" : "high"),
          decision: proof?.finalUiDecision ?? mapResultDecision(state.status, last?.decision.decision),
          notes: [
            ...last?.decision.reason ? [last.decision.reason] : [],
            ...proof?.nextStepRecommended ? [proof.nextStepRecommended] : []
          ],
          proofPackRef: proof ? "executionState.proofPack" : void 0
        };
        emitFinal({ type: "stream_end", structuredMessage: structuredMsg });
        engineStreamEndObserved = true;
      } else {
        emitFinal({ type: "stream_end" });
      }
    } catch (err) {
      if (!signal?.aborted) this.emitProviderError(err);
      if (!finalStreamEndEmitted) {
        emitFinal({ type: "stream_end" });
      }
      if (!signal?.aborted) this.onChatResponse?.(formatProviderError(err));
    } finally {
      this.onExecutionEvent = origEventHandler;
      if (!finalStreamEndEmitted && !engineStreamEndObserved) emitFinal({ type: "stream_end" });
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
  emitProviderError(err) {
    const normalized = agent.normalizeProviderError(err);
    this.emit({
      type: "provider_error",
      providerError: normalized.code,
      providerStatus: normalized.status,
      provider: normalized.provider,
      model: normalized.model,
      message: normalized.safeMessage
    });
  }
  async forceApply(selection) {
    if (this.engine) {
      try {
        await this.engine.forceApply(selection);
      } catch (err) {
        this.onChatResponse?.(formatProviderError(err));
      }
      return;
    }
    this.onChatResponse?.("No pending changes to apply.");
  }
}
function usageEventFromReport(report) {
  return {
    type: "token_usage",
    message: `${report.inputTokens + report.outputTokens} tokens`,
    tokensUsed: report.inputTokens + report.outputTokens,
    usage: report,
    cacheReadInputTokens: report.cacheReadInputTokens,
    cacheCreationInputTokens: report.cacheCreationInputTokens,
    inputTokens: report.inputTokens,
    outputTokens: report.outputTokens
  };
}
function permissionPolicyFor(mode) {
  if (mode === "ask") return agent.ASK_PERMISSION_POLICY;
  return agent.DEFAULT_PERMISSION_POLICY;
}
function buildTestingFollowupReply(userContent, history) {
  if (!isTestingFollowup(userContent)) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i];
    if (message.role !== "assistant") continue;
    if (!/Changes applied successfully|Task complete/i.test(message.content)) continue;
    const files = parseFilesChanged(message.content);
    if (files.length === 0) continue;
    const fileList = files.slice(0, 8).join(", ");
    const validationHint = files.some((file) => /(^|\/)index\.html$/i.test(file)) ? "Abra o index.html no navegador ou rode um servidor estatico como `npx serve -s . -l 3000` na pasta do projeto." : "Rode a validacao indicada no cartao da tarefa, ou abra os arquivos alterados para revisar o resultado.";
    return `Sim, agora e a hora certa de testar. Os arquivos ja foram aplicados: ${fileList}. ${validationHint}`;
  }
  return null;
}
function isTestingFollowup(content) {
  const text = content.trim().toLowerCase().normalize("NFD").replace(new RegExp("\\p{Diacritic}", "gu"), "");
  return /\b(devo|posso|preciso|vamos|vou)\s+testar\b/.test(text) || /\btestar agora\b/.test(text) || /\bcomo\s+(eu\s+)?test(o|ar)\b/.test(text) || /\bshould i test\b/.test(text);
}
function parseFilesChanged(content) {
  const line = content.split(/\r?\n/).find((item) => /^Files changed:/i.test(item.trim()));
  if (!line) return [];
  const raw = line.replace(/^Files changed:\s*/i, "").trim();
  if (!raw || /^none$/i.test(raw)) return [];
  return raw.split(",").map((item) => item.replace(/\s*\([^)]*\)\s*$/, "").trim()).filter(Boolean);
}
function todoEmitter(onTodosUpdated) {
  return { onTodosUpdated };
}
function todosEvent(todos) {
  return { type: "todos_updated", todos, message: `${todos.length} todo(s)` };
}
function formatProviderError(err) {
  const normalized = agent.normalizeProviderError(err);
  if (normalized.name === "KovaProviderError") return normalized.safeMessage;
  const msg = err instanceof Error ? err.message : String(err);
  if (classifyProviderError(err) === "provider_rate_limited")
    return "Rate limit reached. Try again later or switch provider.";
  if (msg.includes("model") && (msg.includes("not found") || msg.includes("404")))
    return "Model not found. Check the model name in Settings.";
  if (msg.includes("400") && msg.includes("crash"))
    return "Local model crashed (out of memory). Restart the LLM server.";
  if (msg.includes("reasoning_content"))
    return "Model context error. Restart the conversation.";
  if (msg.includes("fetch") || msg.includes("ECONNREFUSED") || msg.includes("network"))
    return "LLM server not responding. Check if it is running.";
  if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("api key"))
    return "Invalid API key. Check Settings.";
  return msg;
}
function classifyProviderError(err) {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes("429") || msg.includes("too many requests") || msg.includes("rate limit")) return "provider_rate_limited";
  if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("api key")) return "provider_auth";
  if (msg.includes("404") && msg.includes("model")) return "provider_model_not_found";
  if (msg.includes("fetch") || msg.includes("econnrefused") || msg.includes("network")) return "provider_unavailable";
  return "provider_unknown";
}
function stripModeSlash(message, mode) {
  if (mode === "plan") return message.trim().replace(/^\/plan\s*/i, "").trim() || message.trim();
  if (mode === "review") return message.trim().replace(/^\/review\s*/i, "").trim() || message.trim();
  if (mode === "chat") return message.trim().replace(/^\/chat\s*/i, "").trim() || message.trim();
  return message;
}
function mapResultDecision(status, decision) {
  if (status === "completed") return "apply";
  if (status === "failed") return "repair_needed";
  if (decision === "suggest") return "suggest";
  if (decision === "human_required" || status === "paused") return "needs_review";
  if (decision === "reject") return "reject";
  return "reject";
}
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 50 * 1024 * 1024;
const MAX_ATTACHMENTS = 12;
const ALLOWED_MIME_PREFIXES = ["image/", "text/"];
const ALLOWED_EXACT_MIME = /* @__PURE__ */ new Set(["application/pdf", "application/json"]);
function isTrustedIpcSender(event, isDev2 = !electron.app.isPackaged) {
  const url = event.senderFrame?.url ?? "";
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "file:") return true;
    if (!isDev2) return false;
    return parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}
function assertTrustedIpcSender(event, isDev2 = !electron.app.isPackaged) {
  if (!isTrustedIpcSender(event, isDev2)) throw new Error("IPC origin blocked");
}
function sanitizeStartTaskParams(value) {
  if (!isRecord(value)) throw new Error("Invalid task params");
  const objective = stringField(value.objective, "objective", 2e4);
  const projectRoot = stringField(value.projectRoot, "projectRoot", 2e3);
  return {
    objective,
    projectRoot,
    provider: optionalString(value.provider, 80),
    apiKey: optionalString(value.apiKey, 4e3),
    model: optionalString(value.model, 300),
    baseUrl: optionalString(value.baseUrl, 2e3),
    autoApply: optionalBoolean(value.autoApply),
    maxIterations: optionalNumber(value.maxIterations, 1, 20),
    mode: oneOf(value.mode, ["chat", "plan", "patch", "review"]),
    permissionMode: oneOf(value.permissionMode, ["auto-review", "ask", "full-access"]),
    includeProjectContext: optionalBoolean(value.includeProjectContext),
    queuedCount: optionalNumber(value.queuedCount, 0, 1e3),
    openedFiles: optionalStringArray(value.openedFiles, 200, 2e3)
  };
}
function sanitizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-80).map((item) => {
    if (!isRecord(item)) throw new Error("Invalid history item");
    const role = oneOf(item.role, ["user", "assistant"]);
    return { role: role ?? "user", content: stringField(item.content, "content", 8e4) };
  });
}
function mergeSettingsForSave(incoming, existing) {
  if (!isRecord(incoming)) throw new Error("Invalid settings payload");
  const settings = incoming;
  const merged = {
    defaultProvider: optionalString(settings.defaultProvider, 80) ?? "lmstudio",
    anthropicKey: optionalString(settings.anthropicKey, 4e3) ?? "",
    openaiKey: optionalString(settings.openaiKey, 4e3) ?? "",
    deepseekKey: optionalString(settings.deepseekKey, 4e3) ?? "",
    openrouterKey: optionalString(settings.openrouterKey, 4e3) ?? "",
    kimiKey: optionalString(settings.kimiKey, 4e3) ?? "",
    geminiKey: optionalString(settings.geminiKey, 4e3) ?? "",
    xaiKey: optionalString(settings.xaiKey, 4e3) ?? "",
    openaiCompatibleKey: optionalString(settings.openaiCompatibleKey, 4e3) ?? "",
    ollamaUrl: optionalString(settings.ollamaUrl, 2e3) ?? "http://localhost:11434/v1",
    compatibleUrl: optionalString(settings.compatibleUrl, 2e3) ?? "http://localhost:1234/v1",
    model: optionalString(settings.model, 300) ?? "",
    autoApply: optionalBoolean(settings.autoApply) ?? true,
    permissionMode: oneOf(settings.permissionMode, ["auto-review", "ask", "full-access"]) ?? "auto-review",
    maxIterations: optionalNumber(settings.maxIterations, 1, 20) ?? 5,
    fallbackProvider: optionalString(settings.fallbackProvider, 80),
    fallbackModel: optionalString(settings.fallbackModel, 300),
    nvidiaKey: optionalString(settings.nvidiaKey, 4e3),
    nvidiaEnableThinking: optionalBoolean(settings.nvidiaEnableThinking)
  };
  if (!merged.nvidiaKey || merged.nvidiaKey.includes("****")) merged.nvidiaKey = existing.nvidiaKey;
  return merged;
}
function sanitizeAttachments(value) {
  if (value === void 0 || value === null) return void 0;
  if (!Array.isArray(value)) throw new Error("Invalid attachments payload");
  if (value.length === 0) return void 0;
  if (value.length > MAX_ATTACHMENTS) throw new Error(`Too many attachments — max ${MAX_ATTACHMENTS}`);
  let total = 0;
  const result = [];
  for (const item of value) {
    if (!isRecord(item)) throw new Error("Invalid attachment item");
    const kind = oneOf(item.kind, ["image", "document", "text"]);
    if (!kind) throw new Error("Invalid attachment kind");
    const mimeType = stringField(item.mimeType, "attachment.mimeType", 200);
    const allowedMime = ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p)) || ALLOWED_EXACT_MIME.has(mimeType);
    if (!allowedMime) throw new Error(`Unsupported attachment type: ${mimeType}`);
    const name = stringField(item.name, "attachment.name", 500);
    if (typeof item.sizeBytes !== "number" || !Number.isFinite(item.sizeBytes) || item.sizeBytes < 0) {
      throw new Error("Invalid attachment sizeBytes");
    }
    if (item.sizeBytes > MAX_ATTACHMENT_BYTES) throw new Error(`Attachment "${name}" exceeds 10 MB limit`);
    total += item.sizeBytes;
    if (total > MAX_TOTAL_ATTACHMENT_BYTES) throw new Error("Total attachment size exceeds 50 MB");
    const base64 = stringField(item.base64, "attachment.base64", MAX_ATTACHMENT_BYTES * 2);
    if (!/^[A-Za-z0-9+/=]*$/.test(base64)) throw new Error("Invalid base64 payload");
    result.push({ kind, name, mimeType, sizeBytes: item.sizeBytes, base64 });
  }
  return result;
}
function sanitizeDiffReviewSelection(value) {
  if (value === void 0 || value === null) return void 0;
  if (!isRecord(value) || !Array.isArray(value.files)) throw new Error("Invalid diff review selection");
  return {
    files: value.files.map((item) => {
      if (!isRecord(item)) throw new Error("Invalid diff review file decision");
      return {
        path: stringField(item.path, "path", 2e3),
        decision: oneOf(item.decision, ["approve", "reject", "partial"]) ?? "reject",
        approvedHunkIds: optionalStringArray(item.approvedHunkIds, 5e3, 2e3)
      };
    })
  };
}
function sanitizeSession(value) {
  if (!isRecord(value)) throw new Error("Invalid session");
  const id = stringField(value.id, "id", 200);
  return { ...value, id };
}
function stringField(value, name, maxLength) {
  if (typeof value !== "string" || value.length > maxLength) throw new Error(`Invalid ${name}`);
  return value;
}
function optionalString(value, maxLength) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (typeof value !== "string" || value.length > maxLength) throw new Error("Invalid string payload");
  return value;
}
function optionalBoolean(value) {
  if (value === void 0 || value === null) return void 0;
  if (typeof value !== "boolean") throw new Error("Invalid boolean payload");
  return value;
}
function optionalNumber(value, min, max) {
  if (value === void 0 || value === null) return void 0;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error("Invalid number payload");
  return Math.floor(value);
}
function optionalStringArray(value, maxItems, maxLength) {
  if (value === void 0 || value === null) return void 0;
  if (!Array.isArray(value) || value.length > maxItems) throw new Error("Invalid string array payload");
  return value.map((item) => stringField(item, "array item", maxLength));
}
function oneOf(value, allowed) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (typeof value !== "string" || !allowed.includes(value)) throw new Error("Invalid enum payload");
  return value;
}
function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
const DEFAULT_SETTINGS = {
  defaultProvider: "lmstudio",
  anthropicKey: "",
  openaiKey: "",
  deepseekKey: "",
  openrouterKey: "",
  kimiKey: "",
  geminiKey: "",
  xaiKey: "",
  openaiCompatibleKey: "",
  ollamaUrl: "http://localhost:11434/v1",
  compatibleUrl: "http://localhost:1234/v1",
  model: "",
  autoApply: true,
  permissionMode: "auto-review",
  maxIterations: 5,
  nvidiaEnableThinking: true
};
function settingsPath() {
  return path.join(electron.app.getPath("userData"), "kova-settings.json");
}
function getSettingsInternal() {
  const p = settingsPath();
  if (!node_fs.existsSync(p)) return DEFAULT_SETTINGS;
  try {
    const saved = { ...DEFAULT_SETTINGS, ...JSON.parse(node_fs.readFileSync(p, "utf-8")) };
    const PROVIDER_NAMES = /* @__PURE__ */ new Set(["deepseek", "DeepSeek", "openai", "OpenAI", "anthropic", "Anthropic", "kimi", "Kimi", "ollama", "openrouter", "OpenRouter", "nvidia", "NVIDIA"]);
    if (PROVIDER_NAMES.has(saved.model)) saved.model = "";
    return saved;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
function registerIpcHandlers(win, manager2) {
  let projectWatcher = null;
  let projectWatchTimer = null;
  const notifyFileTreeChanged = () => {
    if (projectWatchTimer) clearTimeout(projectWatchTimer);
    projectWatchTimer = setTimeout(() => {
      if (!win.isDestroyed()) win.webContents.send("kova:file-tree-changed");
    }, 150);
  };
  terminalManager.setWebContents(win.webContents);
  manager2.setHandlers(
    (state) => win.webContents.send("kova:state-update", state),
    (task) => win.webContents.send("kova:task-structured", task),
    (msg) => win.webContents.send("kova:error", msg),
    (model) => win.webContents.send("kova:model-detected", model),
    (msg) => win.webContents.send("kova:chat-response", msg),
    (event) => win.webContents.send("kova:execution-event", event)
  );
  electron.ipcMain.handle("kova:open-folder", async (event) => {
    assertTrustedIpcSender(event);
    const result = await electron.dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
      title: "Selecionar projeto"
    });
    const folder = result.canceled ? null : result.filePaths[0];
    if (folder) updateProjectScope(folder);
    return folder;
  });
  electron.ipcMain.handle("kova:send-message", async (event, message, history, params, attachments) => {
    assertTrustedIpcSender(event);
    const safeMessage = stringField(message, "message", 8e4);
    const safeHistory = sanitizeHistory(history);
    const safeParams = sanitizeStartTaskParams(params);
    const safeAttachments = sanitizeAttachments(attachments);
    if (safeParams.projectRoot) updateProjectScope(safeParams.projectRoot);
    await manager2.sendMessage(safeMessage, safeHistory, safeParams, safeAttachments);
  });
  electron.ipcMain.handle("kova:detect-model", async (event, url) => {
    assertTrustedIpcSender(event);
    return await autoResolveModel(stringField(url, "url", 2e3)) ?? null;
  });
  electron.ipcMain.handle("kova:pause", (event) => {
    assertTrustedIpcSender(event);
    manager2.pause();
  });
  electron.ipcMain.handle("kova:abort", async (event) => {
    assertTrustedIpcSender(event);
    return manager2.abort();
  });
  electron.ipcMain.handle("kova:force-apply", async (event, selection) => {
    assertTrustedIpcSender(event);
    return manager2.forceApply(sanitizeDiffReviewSelection(selection));
  });
  electron.ipcMain.handle("kova:get-state", (event) => {
    assertTrustedIpcSender(event);
    return manager2.getState();
  });
  electron.ipcMain.handle("kova:terminal-open", (event, id, command, cwd) => {
    assertTrustedIpcSender(event);
    terminalManager.openTerminal(stringField(id, "id", 200), stringField(command, "command", 2e3), stringField(cwd, "cwd", 2e3));
  });
  electron.ipcMain.handle("kova:terminal-input", (event, id, data) => {
    assertTrustedIpcSender(event);
    terminalManager.writeInput(stringField(id, "id", 200), stringField(data, "data", 2e4));
  });
  electron.ipcMain.handle("kova:terminal-resize", (event, id, cols, rows) => {
    assertTrustedIpcSender(event);
    terminalManager.resize(stringField(id, "id", 200), optionalNumber(cols, 10, 500) ?? 80, optionalNumber(rows, 5, 200) ?? 24);
  });
  electron.ipcMain.handle("kova:terminal-kill", (event, id) => {
    assertTrustedIpcSender(event);
    terminalManager.kill(stringField(id, "id", 200));
  });
  electron.ipcMain.handle("kova:terminal-approve", (event, id, approved) => {
    assertTrustedIpcSender(event);
    terminalManager.approveInteractive(stringField(id, "id", 200), Boolean(approved));
  });
  electron.ipcMain.handle("kova:get-pending-learnings", async (event, projectRoot) => {
    assertTrustedIpcSender(event);
    const trusted = trustedProjectRoot(projectRoot);
    if (!trusted) return [];
    try {
      const { MemorySystem } = await import("@kova/memory");
      return new MemorySystem(trusted).listPending();
    } catch {
      return [];
    }
  });
  electron.ipcMain.handle("kova:get-contradicted-learnings", async (event, projectRoot) => {
    assertTrustedIpcSender(event);
    const trusted = trustedProjectRoot(projectRoot);
    if (!trusted) return [];
    try {
      const { MemorySystem } = await import("@kova/memory");
      return new MemorySystem(trusted).list().filter((l) => l.contradictions > 0);
    } catch {
      return [];
    }
  });
  electron.ipcMain.handle("kova:get-invalidated-learnings", async (event, projectRoot) => {
    assertTrustedIpcSender(event);
    const trusted = trustedProjectRoot(projectRoot);
    if (!trusted) return [];
    try {
      const { MemorySystem } = await import("@kova/memory");
      return new MemorySystem(trusted).list({ status: "invalidated" });
    } catch {
      return [];
    }
  });
  electron.ipcMain.handle("kova:get-settings", (event) => {
    assertTrustedIpcSender(event);
    const saved = getSettingsInternal();
    if (saved.nvidiaKey) {
      saved.hasNvidiaKey = true;
      saved.nvidiaKeyPreview = `nvapi-${"*".repeat(16)}`;
      saved.nvidiaKey = "";
    } else {
      saved.hasNvidiaKey = false;
    }
    return saved;
  });
  electron.ipcMain.handle("kova:save-settings", (event, settings) => {
    assertTrustedIpcSender(event);
    const p = settingsPath();
    let existingSettings = {};
    if (node_fs.existsSync(p)) {
      try {
        existingSettings = JSON.parse(node_fs.readFileSync(p, "utf-8"));
      } catch {
      }
    }
    settings = mergeSettingsForSave(settings, existingSettings);
    delete settings.hasNvidiaKey;
    delete settings.nvidiaKeyPreview;
    node_fs.mkdirSync(path.dirname(p), { recursive: true });
    node_fs.writeFileSync(p, JSON.stringify(settings, null, 2), "utf-8");
  });
  electron.ipcMain.handle("kova:list-dir", async (event, dir) => {
    assertTrustedIpcSender(event);
    dir = stringField(dir, "dir", 2e3);
    if (currentProjectRoot && dir !== currentProjectRoot) {
      const safe = validateProjectPath(dir, currentProjectRoot);
      if (!safe) return [];
    }
    try {
      return listDir(dir, 0);
    } catch {
      return [];
    }
  });
  electron.ipcMain.handle("kova:watch-project", async (event, root) => {
    assertTrustedIpcSender(event);
    root = stringField(root, "root", 2e3);
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
  electron.ipcMain.handle("kova:unwatch-project", async (event) => {
    assertTrustedIpcSender(event);
    projectWatcher?.close();
    projectWatcher = null;
    return true;
  });
  electron.ipcMain.handle("kova:read-file", async (event, filePath) => {
    assertTrustedIpcSender(event);
    filePath = stringField(filePath, "filePath", 2e3);
    if (isProtectedFilePath(filePath)) return null;
    if (currentProjectRoot) {
      const safe = validateProjectPath(filePath, currentProjectRoot);
      if (!safe) return null;
    }
    try {
      return node_fs.readFileSync(filePath, "utf-8");
    } catch {
      return null;
    }
  });
  electron.ipcMain.handle("kova:write-file", async (event, filePath, content) => {
    assertTrustedIpcSender(event);
    filePath = stringField(filePath, "filePath", 2e3);
    content = stringField(content, "content", 2e6);
    if (isProtectedFilePath(filePath)) throw new Error("Protected file");
    if (currentProjectRoot) {
      const safe = validateProjectPath(filePath, currentProjectRoot);
      if (!safe) throw new Error("Path outside project — operation blocked");
    }
    node_fs.mkdirSync(path.dirname(filePath), { recursive: true });
    node_fs.writeFileSync(filePath, content, "utf-8");
  });
  electron.ipcMain.handle("kova:list-sessions", (event, root) => {
    assertTrustedIpcSender(event);
    root = stringField(root, "root", 2e3);
    try {
      const dir = path.join(root, ".kova", "sessions");
      if (!node_fs.existsSync(dir)) return [];
      return node_fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(node_fs.readFileSync(path.join(dir, f), "utf-8"))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch {
      return [];
    }
  });
  electron.ipcMain.handle("kova:save-session", (event, root, session) => {
    assertTrustedIpcSender(event);
    root = stringField(root, "root", 2e3);
    session = sanitizeSession(session);
    try {
      const dir = path.join(root, ".kova", "sessions");
      node_fs.mkdirSync(dir, { recursive: true });
      node_fs.writeFileSync(path.join(dir, `${session.id}.json`), JSON.stringify(session, null, 2));
    } catch (e) {
      console.error("Failed to save session", e);
    }
  });
  electron.ipcMain.handle("kova:delete-session", (event, root, id) => {
    assertTrustedIpcSender(event);
    root = stringField(root, "root", 2e3);
    id = stringField(id, "id", 200);
    try {
      const p = path.join(root, ".kova", "sessions", `${id}.json`);
      if (node_fs.existsSync(p)) node_fs.unlinkSync(p);
    } catch {
    }
  });
  electron.ipcMain.on("kova:window-minimize", (event) => {
    assertTrustedIpcSender(event);
    win.minimize();
  });
  electron.ipcMain.on("kova:window-maximize", (event) => {
    assertTrustedIpcSender(event);
    win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  electron.ipcMain.on("kova:window-close", (event) => {
    assertTrustedIpcSender(event);
    win.close();
  });
}
function validateProjectPath(filePath, allowedRoot) {
  if (!filePath?.trim() || !allowedRoot?.trim()) return null;
  const abs = path.resolve(allowedRoot, filePath);
  const rootAbs = path.resolve(allowedRoot);
  const rel = path.relative(rootAbs, abs);
  if (rel.startsWith("..") || rel.startsWith("/") || /^[A-Za-z]:/.test(rel)) return null;
  return abs;
}
let currentProjectRoot = null;
function updateProjectScope(root) {
  if (currentProjectRoot && currentProjectRoot !== root) {
    manager.clearProjectCache(currentProjectRoot);
  }
  currentProjectRoot = root;
  terminalManager.setProjectRoot(root);
}
function resolveTrustedProjectRoot(input, currentRoot) {
  if (!currentRoot) return null;
  if (typeof input !== "string" || input.length === 0 || input.length > 2e3) return null;
  return validateProjectPath(input, currentRoot) ? currentRoot : null;
}
function trustedProjectRoot(input) {
  return resolveTrustedProjectRoot(input, currentProjectRoot);
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
function buildContentSecurityPolicy(isDev2) {
  const scriptSrc = isDev2 ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self'";
  const styleSrc = isDev2 ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com" : "style-src 'self' 'unsafe-inline'";
  const fontSrc = isDev2 ? "font-src 'self' data: https://fonts.gstatic.com" : "font-src 'self' data:";
  return [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    "img-src 'self' data: blob:",
    fontSrc,
    "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*",
    "worker-src 'self' blob:"
  ].join("; ");
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
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [buildContentSecurityPolicy(isDev)]
      }
    });
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
