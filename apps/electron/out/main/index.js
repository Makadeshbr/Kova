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
  "node",
  "python",
  "python3",
  "pip",
  "pip3",
  "uv",
  "cargo",
  "rustup",
  "go",
  "mvn",
  "gradle",
  "dotnet",
  "docker",
  "kubectl",
  "aws",
  "gcloud",
  "az",
  "heroku",
  "vercel",
  "fly",
  "railway",
  "ssh",
  "sftp"
]);
class TerminalManager {
  constructor(ptyImpl = pty) {
    this.ptyImpl = ptyImpl;
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
    return this.startSession(id, command, safeCwd);
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
    this.sessions.get(id)?.pty.write(data);
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
      try {
        session.pty.kill();
      } catch {
      }
      this.sessions.delete(id);
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
  startSession(id, command, cwd) {
    return new Promise((resolve2) => {
      if (!this.ptyImpl) {
        resolve2({ exitCode: 1, output: "node-pty not available" });
        return;
      }
      const shell = process.platform === "win32" ? "cmd.exe" : process.env.SHELL ?? "/bin/bash";
      const args = process.platform === "win32" ? ["/c", command] : ["-c", command];
      let outputBuf = "";
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
        exitCode: null
      };
      this.sessions.set(id, session);
      this.webContents?.send("kova:terminal-started", { id, command, cwd });
      ptyProcess.onData((data) => {
        outputBuf += data;
        session.outputBuf = outputBuf;
        this.webContents?.send("kova:terminal-data", { id, data });
      });
      ptyProcess.onExit(({ exitCode }) => {
        session.exitCode = exitCode;
        this.webContents?.send("kova:terminal-exit", { id, exitCode });
        this.sessions.delete(id);
        resolve2({ exitCode, output: outputBuf });
      });
    });
  }
}
const terminalManager = new TerminalManager();
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
  return `You are a senior software engineer helping with this project.
Stack: ${stack}.

Rules:
- Answer directly. Never introduce yourself, never list your capabilities, never say your name.
- No emojis. No bullet-point capability lists. No "OBS:" disclaimers. No marketing phrases.
- If the user says "oi", "hi", or similar — just reply naturally in one short sentence, like a colleague would.
- If asked what you can do, answer briefly and concretely based on the project context.
- Use provided file context when present. If a file reference was denied, say why briefly.
- Do not resume older tasks unless the user explicitly asks.
- Respond in the same language the user writes in.`;
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
function inferRunMode(message, explicit) {
  if (explicit && explicit !== "patch") return explicit;
  if (/^\/plan(\s|$)/i.test(message.trim())) return "plan";
  if (/^\/review(\s|$)/i.test(message.trim())) return "review";
  if (isConversationalMessage(message)) return "chat";
  return "patch";
}
function isConversationalMessage(message) {
  const normalized = normalizeText(message);
  const exact = /* @__PURE__ */ new Set([
    "oi",
    "ola",
    "opa",
    "hello",
    "hi",
    "hey",
    "bom dia",
    "boa tarde",
    "boa noite",
    "obrigado",
    "obrigada",
    "thanks",
    "valeu",
    "entendi",
    "ok",
    "sim",
    "nao",
    "certo",
    "perfeito",
    "legal",
    "nao entendi",
    "pode repetir"
  ]);
  if (exact.has(normalized)) return true;
  if (/^(como|o que|oque|pra que|para que|por que|porque|quando|onde|quem|qual|quais|me diz|me fala|me explica|what|how|why|when|where|who|which)\b/.test(normalized)) return true;
  if (/^(explique|explica|explain|explica|descreva|describe|resuma|resume|me conte|conta|summarize)\b/.test(normalized)) return true;
  if (/^(responde|responda|me responde|fala|fale|me fala|escreve|escreva|answer|respond|reply|speak|write|talk)\s+(em|in|usando|using|com|de forma|de modo)\b/.test(normalized)) return true;
  if (/\b(em portugues|em ingles|em espanhol|in english|in portuguese|in spanish|in french|em frances)\b/.test(normalized)) return true;
  if (/^(seja|seja mais|aja como|se comporte|be more|be a|act as|use (formal|informal|simple|technical))\b/.test(normalized)) return true;
  if (/^(muda (o idioma|para|de idioma)|switch (language|to)|change (language|to))\b/.test(normalized)) return true;
  if (normalized.endsWith("?")) {
    const imperativeStart = /^(crie|adicione|corrija|implemente|altere|refatore|remova|delete|mova|atualize|configure|instale|execute|rode|gere|escreva|migre|cria|adiciona|corrige|implementa|fix|add|create|update|implement|remove|optimize|install|run|build|generate|write|migrate)\b/;
    if (!imperativeStart.test(normalized)) return true;
  }
  if (looksLikeEngineeringTask(normalized)) return false;
  if (/^(oi|ola|opa|hello|hi|hey|bom dia|boa tarde|boa noite)([\s,!.?]|$)/.test(normalized)) return true;
  return normalized.length > 0 && normalized.length < 12;
}
function normalizeText(text) {
  return text.trim().toLowerCase().normalize("NFD").replace(new RegExp("\\p{Diacritic}", "gu"), "");
}
function looksLikeEngineeringTask(text) {
  return /(adicione|corrija|implemente|crie|altere|refatore|teste|valide|remova|delete|mova|renomeie|atualize|otimize|resolva|analise|verifique|configure|instale|execute|rode|builde|faca|faz|melhore|ajuste|arrume|mostre|liste|leia|escreva|gere|extraia|converta|migre|depure|debugue|fix|add|create|update|implement|refactor|remove|move|rename|optimize|resolve|analyze|verify|configure|install|run|build|generate|extract|convert|migrate|debug|deploy|test|write|read|show|list|edit|change|modify|check|review|apply|revert|rollback|merge|split|set|bug|erro|error|feature|endpoint|funcao|function|metodo|method|classe|class|modulo|module|arquivo|file|api|rota|route|pagina|page|componente|component|servico|service|banco|database|tabela|table|campo|field|coluna|indice|index|query|schema|model|controller|handler|middleware|hook|provider|adapter|factory|repository|entity|dto|interface|type|enum|const|var|import|export|package|depend|config|env|docker|ci|cd|pipeline|deploy|src\/|apps\/|packages\/|tests\/|spec\/|lib\/|cmd\/|internal\/|\.\w{1,5}$)/.test(text);
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
      emit({ type: "reasoning_start", message: "Raciocinando..." });
    },
    delta: (delta) => {
      if (!delta) return;
      if (!active) {
        active = true;
        emit({ type: "reasoning_start", message: "Raciocinando..." });
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
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com",
  openrouter: "https://openrouter.ai/api/v1",
  kimi: "https://api.moonshot.ai/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  nvidia: process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
  ollama: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
  lmstudio: "http://localhost:1234/v1"
};
const LOCAL_PROVIDERS = /* @__PURE__ */ new Set(["ollama", "lmstudio", "openai-compatible"]);
const PRESET_MODELS = {
  openai: "gpt-4.1",
  deepseek: "deepseek-v4-flash",
  kimi: "kimi-k2.5",
  gemini: "gemini-2.5-flash",
  openrouter: "anthropic/claude-sonnet-4.5",
  nvidia: "moonshotai/kimi-k2.6"
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
    provider: new agent.OpenAICompatibleProvider({ apiKey: apiKey || providerName, baseUrl, model, extraBody }),
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
  return fallbackProvider === "anthropic" ? settings.anthropicKey : fallbackProvider === "openai" ? settings.openaiKey : fallbackProvider === "deepseek" ? settings.deepseekKey : fallbackProvider === "openrouter" ? settings.openrouterKey : fallbackProvider === "kimi" ? settings.kimiKey : fallbackProvider === "gemini" ? settings.geminiKey : fallbackProvider === "openai-compatible" ? settings.openaiCompatibleKey : "";
}
async function buildPatchTask(objective, provider, projectRoot, adapter) {
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
    if (resolution.missing.length) this.emit({ type: "tool_result", message: `@ not found: ${resolution.missing.join(", ")}` });
    if (shouldShortCircuitDeniedRefs(rawContent, resolution)) {
      this.onChatResponse?.(deniedRefsMessage(resolution));
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
      await this.runPlanSession(resolution.userContent || "Create an implementation plan for this project.", history, provider, projectRoot, adapter, params.includeProjectContext !== false, this.sessionAbort.signal, explicitFiles, params.openedFiles ?? []);
      return;
    }
    if (mode === "chat") {
      await this.runChatSession(resolution.userContent, history, provider, projectRoot, adapter, params, this.sessionAbort.signal, explicitFiles);
      return;
    }
    if (mode === "review") {
      await this.runReviewSession(resolution.userContent, history, provider, projectRoot, adapter, params, this.sessionAbort.signal, explicitFiles);
      return;
    }
    const task = await buildPatchTask(resolution.userContent, provider, projectRoot, adapter);
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
      explicitFiles
    );
  }
  async runChatSession(userContent, history, provider, projectRoot, adapter, params, signal, explicitFiles = []) {
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
      const messages = [...history, { role: "user", content }];
      reasoning.start();
      const output = await provider.runAgentLoop(messages, {
        system: chatOnlyPrompt(adapter.name),
        tools: [],
        executor: new agent.ToolExecutor(projectRoot, signal, agent.READ_ONLY_PERMISSION_POLICY),
        maxTurns: 1,
        signal,
        onToken: (t) => {
          reasoning.end();
          this.emit({ type: "token", token: t });
        },
        onReasoningStart: () => reasoning.start(),
        onReasoningDelta: (delta) => reasoning.delta(delta),
        onReasoningEnd: () => reasoning.end()
      });
      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: "assistant", content: output.thought }]);
      this.emit({ type: "token_usage", message: `${turnTokens} tokens`, tokensUsed: turnTokens });
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
  async runReviewSession(userContent, history, provider, projectRoot, adapter, params, signal, explicitFiles = []) {
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
${contextText}` }
      ];
      const executor = new agent.ToolExecutor(projectRoot, signal, agent.READ_ONLY_PERMISSION_POLICY);
      reasoning.start();
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
        })
      });
      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: "assistant", content: output.thought }]);
      this.emit({ type: "token_usage", message: `${turnTokens} tokens`, tokensUsed: turnTokens });
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
  async runPlanSession(userContent, history, provider, projectRoot, adapter, includeProjectContext = true, signal, explicitFiles = [], openedFiles = []) {
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
          ].join("\n")
        }
      ];
      const planTools = ctx.files.length > 0 || explicitFiles.length > 0 || openedFiles.length > 0 || !projectLooksBlank(projectRoot) ? agent.READ_ONLY_TOOLS : [];
      const executor = new agent.ToolExecutor(projectRoot, signal, agent.READ_ONLY_PERMISSION_POLICY);
      reasoning.start();
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
        })
      });
      const turnTokens = output.tokensUsed || estimateMessagesTokens([...messages, { role: "assistant", content: output.thought }]);
      this.emit({ type: "token_usage", message: `${turnTokens} tokens`, tokensUsed: turnTokens });
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
  async runUnifiedSession(objective, history, params, provider, projectRoot, adapter, task, skipPlan, signal, explicitFiles = []) {
    const appEngine = new application.CodeApplicationEngine(projectRoot);
    const memory2 = this.getMemorySystem(projectRoot);
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
        history,
        skipPlan,
        maxIterations: params.maxIterations ?? 5,
        autoApply: params.autoApply ?? false,
        explicitFiles,
        openedFiles: params.openedFiles ?? [],
        onStateChange: (state) => this.onUpdate?.(state),
        onEvent: (event) => this.onExecutionEvent?.(event),
        interactiveRunner: (command, cwd, reason) => terminalManager.runInteractive(command, cwd, reason),
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
    this.onChatResponse?.("Nenhuma mudanca pendente para aplicar.");
  }
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
function mapResultDecision(status, decision) {
  if (status === "completed") return "apply";
  if (status === "failed") return "repair_needed";
  if (decision === "suggest") return "suggest";
  if (decision === "human_required" || status === "paused") return "needs_review";
  if (decision === "reject") return "reject";
  return "reject";
}
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
    openaiCompatibleKey: optionalString(settings.openaiCompatibleKey, 4e3) ?? "",
    ollamaUrl: optionalString(settings.ollamaUrl, 2e3) ?? "http://localhost:11434/v1",
    compatibleUrl: optionalString(settings.compatibleUrl, 2e3) ?? "http://localhost:1234/v1",
    model: optionalString(settings.model, 300) ?? "",
    autoApply: optionalBoolean(settings.autoApply) ?? true,
    maxIterations: optionalNumber(settings.maxIterations, 1, 20) ?? 5,
    fallbackProvider: optionalString(settings.fallbackProvider, 80),
    fallbackModel: optionalString(settings.fallbackModel, 300),
    nvidiaKey: optionalString(settings.nvidiaKey, 4e3),
    nvidiaEnableThinking: optionalBoolean(settings.nvidiaEnableThinking)
  };
  if (!merged.nvidiaKey || merged.nvidiaKey.includes("****")) merged.nvidiaKey = existing.nvidiaKey;
  return merged;
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
  openaiCompatibleKey: "",
  ollamaUrl: "http://localhost:11434/v1",
  compatibleUrl: "http://localhost:1234/v1",
  model: "",
  autoApply: true,
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
  electron.ipcMain.handle("kova:send-message", async (event, message, history, params) => {
    assertTrustedIpcSender(event);
    const safeMessage = stringField(message, "message", 8e4);
    const safeHistory = sanitizeHistory(history);
    const safeParams = sanitizeStartTaskParams(params);
    if (safeParams.projectRoot) updateProjectScope(safeParams.projectRoot);
    await manager2.sendMessage(safeMessage, safeHistory, safeParams);
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
