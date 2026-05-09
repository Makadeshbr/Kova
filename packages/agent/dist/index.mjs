// src/tools.ts
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, readdirSync, statSync } from "fs";
import { join, dirname, relative } from "path";
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
var DEFAULT_PERMISSION_POLICY = {
  read: [
    { pattern: "*", action: "allow" },
    { pattern: ".env", action: "deny" },
    { pattern: ".env.*", action: "deny" },
    { pattern: "*.env", action: "deny" },
    { pattern: "*.env.*", action: "deny" },
    { pattern: ".env.example", action: "allow" }
  ],
  edit: "allow",
  list: "allow",
  bash: "allow"
};
var READ_ONLY_PERMISSION_POLICY = {
  read: DEFAULT_PERMISSION_POLICY.read,
  edit: "deny",
  list: "allow",
  bash: "deny"
};
var RUN_TIMEOUT_MS = 12e4;
var COMMAND_ALLOWLIST = [
  // Go
  "go ",
  "gofmt",
  "staticcheck",
  "golangci-lint",
  "air ",
  // Node / JS / TS
  "npm ",
  "npx ",
  "node ",
  "pnpm ",
  "yarn ",
  "bun ",
  "tsc ",
  "biome ",
  "eslint ",
  "prettier ",
  // Python
  "python ",
  "python3 ",
  "pip ",
  "pip3 ",
  "pytest",
  "ruff",
  "mypy",
  "uv ",
  "poetry ",
  // Rust
  "cargo ",
  "rustfmt",
  "rust-analyzer",
  // JVM
  "mvn ",
  "gradle ",
  "gradlew",
  "javac ",
  "kotlinc ",
  "kotlin ",
  // .NET
  "dotnet ",
  "dotnet-script ",
  // Ruby / PHP
  "ruby ",
  "bundle ",
  "rspec",
  "rubocop",
  "php ",
  "composer ",
  // Mobile
  "swift ",
  "swiftc ",
  "flutter ",
  "dart ",
  // C/C++ — 'make' without trailing space matches 'make', 'make build', etc.
  "gcc ",
  "g++ ",
  "clang ",
  "clang++ ",
  "make",
  "cmake ",
  // File inspection (read-only, useful for the model to understand the environment)
  "ls ",
  "dir ",
  "find ",
  "head ",
  "tail ",
  "cat ",
  "grep ",
  "which ",
  "where ",
  "echo ",
  "wc ",
  "sort ",
  "type ",
  "pwd",
  // Git read-only
  "git diff",
  "git status",
  "git log",
  "git branch",
  "git show",
  // Make executable
  "chmod +x"
];
var COMMAND_BLOCKLIST = [
  // Destructive file ops
  "rm -rf",
  "rm -r",
  "del /f",
  "rd /s",
  "rmdir /s",
  // Privilege escalation
  "sudo ",
  // Dangerous permission changes (chmod +x is allowed above, blocked patterns are the dangerous ones)
  "chmod -r",
  "chmod 777",
  "chmod 666",
  "chown ",
  // Arbitrary shell execution
  "curl |",
  "wget |",
  "bash -c",
  "sh -c",
  "eval ",
  "exec ",
  // Git destructive
  "git push",
  "git reset --hard",
  "git clean -f",
  "git force",
  // Network/remote
  "ssh ",
  "scp ",
  "nc ",
  "netcat",
  "ncat ",
  // Fork bomb
  ":(){",
  // Windows disk format (specific — not 'format ' which would break npm run format)
  "format c:",
  "format d:",
  "format e:",
  "format /q",
  // Publishing (no accidental deploys)
  "npm publish",
  "pnpm publish",
  "yarn publish",
  "cargo publish"
];
var AGENT_TOOLS = [
  {
    name: "write_file",
    description: "Create or overwrite a file. Always provide the complete file content \u2014 never partial.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path from project root (e.g. src/main.go)" },
        content: { type: "string", description: "Complete file content" }
      },
      required: ["path", "content"]
    }
  },
  {
    name: "read_file",
    description: "Read an existing file from the project.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path from project root" }
      },
      required: ["path"]
    }
  },
  {
    name: "delete_file",
    description: "Delete a file no longer needed.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path from project root" }
      },
      required: ["path"]
    }
  },
  {
    name: "list_files",
    description: "List files in a project directory.",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: 'Relative directory path. Defaults to "."' }
      },
      required: []
    }
  },
  {
    name: "run_command",
    description: "Run a shell command in the project root. Use for: installing dependencies (npm install, pip install, cargo build, go mod download), building (npm run build, go build), testing (npm test, go test), linting, formatting. Always run install/build before finishing a task that adds new dependencies.",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: 'Command to run (e.g. "go test ./...", "npm run build", "cargo test")' }
      },
      required: ["command"]
    }
  }
];
var READ_ONLY_TOOLS = AGENT_TOOLS.filter(
  (t) => t.name === "read_file" || t.name === "list_files"
);
var ToolExecutor = class {
  constructor(projectRoot, signal, permissionPolicy = DEFAULT_PERMISSION_POLICY) {
    this.projectRoot = projectRoot;
    this.signal = signal;
    this.permissionPolicy = permissionPolicy;
  }
  written = /* @__PURE__ */ new Map();
  // Tracks original content before any agent write — for diff display and detectExternalChange
  originals = /* @__PURE__ */ new Map();
  async execute(name, input) {
    switch (name) {
      case "write_file":
        return this.writeFile(String(input.path ?? ""), String(input.content ?? ""));
      case "read_file":
        return this.readFile(String(input.path ?? ""));
      case "delete_file":
        return this.deleteFile(String(input.path ?? ""));
      case "list_files":
        return this.listFiles(String(input.dir ?? "."));
      case "run_command":
        return this.runCommand(String(input.command ?? ""));
      default:
        return `Unknown tool: ${name}`;
    }
  }
  getChanges() {
    return [...this.written.values()];
  }
  writeFile(rawPath, content) {
    const path = this.sanitizePath(rawPath);
    if (!path) return `Blocked: "${rawPath.slice(0, 80)}" is outside the project root`;
    const permission = this.requirePermission("edit", path);
    if (permission) return permission;
    if (!content.trim()) return "Error: content cannot be empty";
    const fullPath = join(this.projectRoot, path);
    if (!this.originals.has(path)) {
      this.originals.set(path, existsSync(fullPath) ? readFileSync(fullPath, "utf-8") : void 0);
    }
    const original = this.originals.get(path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, "utf-8");
    this.written.set(path, { path, type: original === void 0 ? "create" : "modify", diff: content, before: original });
    return `OK: wrote ${path} (${content.split("\n").length} lines)`;
  }
  readFile(rawPath) {
    const path = this.sanitizePath(rawPath);
    if (!path) return `Blocked: "${rawPath.slice(0, 80)}" is outside the project root`;
    const permission = this.requirePermission("read", path);
    if (permission) return permission;
    const fullPath = join(this.projectRoot, path);
    if (!existsSync(fullPath)) return `Error: not found \u2014 ${path}`;
    try {
      const content = readFileSync(fullPath, "utf-8");
      return content.length > 8e3 ? `${content.slice(0, 8e3)}
...(truncated)` : content;
    } catch {
      return `Error: cannot read ${path}`;
    }
  }
  deleteFile(rawPath) {
    const path = this.sanitizePath(rawPath);
    if (!path) return `Blocked: "${rawPath.slice(0, 80)}" is outside the project root`;
    const permission = this.requirePermission("edit", path);
    if (permission) return permission;
    const fullPath = join(this.projectRoot, path);
    if (!existsSync(fullPath)) return `OK: ${path} does not exist`;
    try {
      unlinkSync(fullPath);
      this.written.set(path, { path, type: "delete", diff: "" });
      return `OK: deleted ${path}`;
    } catch {
      return `Error: cannot delete ${path}`;
    }
  }
  listFiles(rawDir) {
    const dir = this.sanitizePath(rawDir) ?? ".";
    const permission = this.requirePermission("list", dir);
    if (permission) return permission;
    const fullPath = join(this.projectRoot, dir);
    if (!existsSync(fullPath)) return `Error: directory not found \u2014 ${dir}`;
    try {
      const entries = readdirSync(fullPath).map(
        (f) => statSync(join(fullPath, f)).isDirectory() ? `${f}/` : f
      );
      return entries.length > 0 ? entries.join("\n") : "(empty)";
    } catch {
      return `Error: cannot list ${dir}`;
    }
  }
  async runCommand(command) {
    if (this.signal?.aborted) return "Aborted: session was cancelled before command could run";
    const permission = this.requirePermission("bash", command);
    if (permission) return permission;
    if (!isCommandAllowed(command)) {
      return `Blocked: "${command.slice(0, 80)}" is not an allowed command. Use build, test, lint, or format commands.`;
    }
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot,
        timeout: RUN_TIMEOUT_MS,
        signal: this.signal
      });
      const out = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
      return out || "OK: command completed with no output";
    } catch (err) {
      const e = err;
      if (e.code === "ABORT_ERR" || e.name === "AbortError") return "Aborted: command cancelled by session abort";
      if (e.killed) return `Timeout: exceeded ${RUN_TIMEOUT_MS / 1e3}s`;
      const out = [e.stdout?.trim(), e.stderr?.trim()].filter(Boolean).join("\n");
      return `Error:
${out || "command failed"}`;
    }
  }
  sanitizePath(raw) {
    if (!raw.trim()) return null;
    const p = raw.replace(/\\/g, "/").trim();
    if (!p.startsWith("/") && !/^[A-Za-z]:/.test(p)) {
      return p.startsWith("../") || p.includes("/../") ? null : p.replace(/^\.\//, "");
    }
    const rel = relative(this.projectRoot, raw).replace(/\\/g, "/");
    return rel.startsWith("..") ? null : rel;
  }
  requirePermission(key, target) {
    const action = resolvePermission(this.permissionPolicy[key], target);
    if (action === "deny") return `Blocked: ${key} denied for ${target}`;
    if (action === "ask") return `Approval required: ${key} ${target}`;
    return null;
  }
};
function resolvePermission(rule, target) {
  if (!rule) return "allow";
  if (typeof rule === "string") return rule;
  let action = "deny";
  for (const item of rule) {
    if (matchPermissionPattern(target, item.pattern)) action = item.action;
  }
  return action;
}
function matchPermissionPattern(target, pattern) {
  if (pattern === "*") return true;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`).test(target.replace(/\\/g, "/"));
}
function isCommandAllowed(command) {
  const cmd = command.trim().toLowerCase();
  if (COMMAND_ALLOWLIST.some((prefix) => cmd.startsWith(prefix))) {
    const safeByPrefix = ["chmod +x"].some((p) => cmd.startsWith(p));
    if (safeByPrefix) return true;
    return !COMMAND_BLOCKLIST.some((b) => cmd.includes(b));
  }
  return false;
}

// src/modes.ts
var MODE_PROMPTS = {
  plan: `You are Kova, a senior software engineer performing task analysis.

Your job: understand the codebase and propose a clear implementation plan.
Use read_file and list_files to inspect relevant files before planning.
Do NOT write or modify any files.

Respond with ONLY the following XML structure:
<plan_result>
  <objective>What the task requires and why</objective>
  <files>
    <file path="path/to/file.ext" reason="Why this file needs to change" />
  </files>
  <approach>Step-by-step implementation strategy</approach>
  <validations>
    <command>Validation commands to run later</command>
  </validations>
  <risk>low</risk> <!-- Must be: low, medium, or high -->
</plan_result>`,
  code: `You are Kova, a senior software engineer. You implement tasks completely and correctly.

RULES:
1. Use the LANGUAGE specified \u2014 never switch languages or create files in another language
2. For new projects: always create ALL required bootstrap files
3. Write COMPLETE file contents \u2014 no placeholders, no TODOs, no ellipsis
4. Max 40 lines per function, early returns, no deep nesting
5. ALWAYS create the files \u2014 do not just describe what you would do
6. DO NOT output long text summaries, lists of files, or diffs in your final message.

WORKFLOW (follow in order):
1. Use list_files / read_file to understand existing structure
2. Use write_file to create or modify EVERY needed file (tools preferred)
3. If write_file tool is unavailable: wrap EVERY file in XML \u2014 no exceptions.
4. Run build command with run_command
5. Fix errors, re-run until clean
6. Run tests

When finished, your final message must be EXACTLY ONE SHORT SENTENCE summarizing the changes.`,
  test: `You are Kova writing comprehensive tests for existing or newly implemented code.

RULES:
- Match the testing framework already used in the project (detect via read_file/list_files)
- Test names describe behavior: "should [action] when [condition]"
- Cover: success path, error paths, edge cases, boundary conditions
- Tests are fully isolated \u2014 each test manages its own state
- Use temp dirs for file I/O tests, never write to the real project in tests
- Prefer real implementations over mocks; mock only external I/O (network, OS, time)

WORKFLOW:
1. Read existing tests and source files to understand patterns
2. Write test files using write_file
3. Run the test command to verify tests pass (or fail for the right reason)
4. Fix any issues and re-run

When finished, your final message must be EXACTLY ONE SHORT SENTENCE summarizing the changes.`,
  fix: `You are Kova fixing code based on harness feedback.

You will receive specific error messages from build, lint, or test layers.

RULES:
- Fix exactly what the errors indicate \u2014 nothing more, nothing more
- Do NOT refactor unrelated code while fixing
- Do NOT change test assertions to force a pass \u2014 fix the implementation
- If an error reveals a design flaw, fix the design minimally

WORKFLOW:
1. Read the failing file(s) to understand context
2. Apply the fix using write_file
3. Run the failing command (build or test) to confirm the fix
4. If still failing: investigate further and fix again

When finished, your final message must be EXACTLY ONE SHORT SENTENCE summarizing the changes.`,
  review: `You are Kova performing a code quality review.

Use read_file and list_files to inspect the code. Do not modify any files.

Analyze and report:
1. **Bugs** \u2014 logic errors, null dereferences, race conditions
2. **Rule violations** \u2014 file/function size limits, naming conventions, no-any
3. **Security** \u2014 exposed secrets, injection risks, insecure patterns
4. **Quality** \u2014 missing edge cases, unclear logic, dead code

End with a verdict:
- APPROVED (score \u2265 90): ready to apply
- SUGGEST_CHANGES (score 70\u201389): apply with review
- REJECT (score < 70): must fix before applying`,
  unified: `You are Kova, a senior software engineer and AI pair programmer. You implement tasks, review code, or chat based on user needs.

RULES:
1. If the user asks a simple question, greeting, or concept: reply normally with text. Do NOT use tools.
2. If the user asks for a code review or to analyze something: use read_file/list_files to understand it, then reply with your analysis. Do NOT modify files.
3. If the user asks to implement, fix, or add code: use read_file to understand, then write_file to apply changes.
4. For implementation tasks, always write complete files. No placeholders.
5. Adapt seamlessly to what the user wants in the current turn.
6. When writing or modifying files, your final message must be EXACTLY ONE SHORT SENTENCE summarizing what was done. Do NOT output long diffs or lists.`
};

// src/agent.ts
var MAX_TURNS = 10;
var AGENT_TIMEOUT_MS = 8 * 60 * 1e3;
var WRITE_MODES = /* @__PURE__ */ new Set(["code", "test", "fix", "unified"]);
var STACK_LANGUAGE = {
  go: "Go",
  python: "Python",
  typescript: "TypeScript",
  javascript: "JavaScript",
  rust: "Rust",
  java: "Java",
  kotlin: "Kotlin",
  ruby: "Ruby",
  php: "PHP",
  swift: "Swift",
  dart: "Dart/Flutter",
  csharp: "C#",
  cpp: "C++",
  c: "C",
  generic: "the language specified in the task"
};
var Agent = class {
  constructor(provider, projectRoot) {
    this.provider = provider;
    this.projectRoot = projectRoot;
  }
  async execute(task, context, mode = "code", options) {
    const tools = WRITE_MODES.has(mode) ? AGENT_TOOLS : READ_ONLY_TOOLS;
    const executor = new ToolExecutor(
      this.projectRoot,
      options?.signal,
      WRITE_MODES.has(mode) ? void 0 : READ_ONLY_PERMISSION_POLICY
    );
    const caps = this.provider.capabilities();
    const system = buildSystemPrompt(mode, task, caps.supportsToolCalls);
    const userMessage = buildUserMessage(task, context);
    const msgs = [
      ...options?.history ?? [],
      { role: "user", content: userMessage }
    ];
    const timeoutController = new AbortController();
    const composedSignal = options?.signal ? AbortSignal.any([options.signal, timeoutController.signal]) : timeoutController.signal;
    const timeoutId = setTimeout(
      () => timeoutController.abort(new Error(`Agent timeout after ${AGENT_TIMEOUT_MS / 6e4} minutes \u2014 LLM may be overloaded`)),
      AGENT_TIMEOUT_MS
    );
    let result;
    try {
      result = await this.provider.runAgentLoop(msgs, {
        system,
        tools,
        executor,
        maxTurns: MAX_TURNS,
        signal: composedSignal,
        onToken: options?.onToken,
        onToolCall: options?.onToolCall,
        onToolResult: options?.onToolResult
      });
    } catch (err) {
      if (timeoutController.signal.aborted) {
        throw new Error(`Agent timeout after ${AGENT_TIMEOUT_MS / 6e4} minutes \u2014 LLM may be overloaded`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
    return { mode, thought: result.thought, changes: result.changes, tokensUsed: result.tokensUsed };
  }
};
function buildSystemPrompt(mode, task, supportsToolCalls) {
  const lang = STACK_LANGUAGE[task.stackAdapter] ?? task.stackAdapter;
  const langHint = mode !== "plan" && mode !== "review" ? `LANGUAGE: ${lang}. Every file you create must use ${lang}. Never switch to another language.` : "";
  const xmlReminder = !supportsToolCalls && WRITE_MODES.has(mode) ? `OUTPUT FORMAT (MANDATORY when write_file tool is unavailable):
Wrap EVERY file in XML \u2014 no exceptions:
<kova_file path="relative/path/file.ext">
complete file content
</kova_file>` : "";
  return [MODE_PROMPTS[mode], langHint, xmlReminder].filter(Boolean).join("\n\n");
}
function buildUserMessage(task, context) {
  const lang = STACK_LANGUAGE[task.stackAdapter] ?? task.stackAdapter;
  const pack = context.pack;
  const parts = [
    `## Task: ${task.objective}`,
    `Stack: ${lang} | Type: ${task.type} | Impact: ${task.impact}`
  ];
  if (task.constraints.length > 0) {
    parts.push(`
### Constraints
${task.constraints.map((c) => `- ${c}`).join("\n")}`);
  }
  if (task.validationCriteria.length > 0) {
    parts.push(`
### Acceptance criteria (must all pass)
${task.validationCriteria.map((c) => `- ${c}`).join("\n")}`);
  }
  if (context.learnings.length > 0) {
    parts.push("\n### Known patterns\n" + context.learnings.map((l) => `- ${l.description}`).join("\n"));
  }
  if (pack) {
    const fileEvidence = pack.files.map((file) => `- ${file.path}: ${file.reason} (score ${file.score}; source ${file.source})`).join("\n");
    const validationEvidence = pack.validations.slice(0, 6).map((item) => `- ${item.kind}: ${item.command ?? "configured"} (${item.scope}; confidence ${item.confidence})`).join("\n");
    const omitted = pack.omitted.sensitiveFiles.length > 0 ? `
Sensitive files omitted: ${pack.omitted.sensitiveFiles.join(", ")}` : "";
    parts.push([
      "\n### Context pack evidence",
      fileEvidence,
      validationEvidence ? `
Validation candidates:
${validationEvidence}` : "",
      omitted
    ].filter(Boolean).join("\n"));
  }
  if (context.files.length > 0) {
    parts.push("\n### Project context");
    for (const f of context.files) {
      parts.push(`
**${f.path}**
\`\`\`
${f.content}
\`\`\``);
    }
  }
  return parts.join("\n");
}

// src/providers/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";
var DEFAULT_MODEL = "claude-sonnet-4-6";
var DEFAULT_MAX_TOKENS = 8192;
var AnthropicProvider = class {
  client;
  defaultModel;
  constructor(options = {}) {
    this.client = new Anthropic({ apiKey: options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "" });
    this.defaultModel = options.model ?? DEFAULT_MODEL;
  }
  capabilities() {
    return { supportsToolCalls: true, contextTokenLimit: 18e4 };
  }
  // Single-turn — used for task structuring (no tools)
  async generate(messages, options = {}) {
    const response = await this.client.messages.create({
      model: options.model ?? this.defaultModel,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: options.system,
      messages: messages.map((m) => ({ role: m.role, content: m.content }))
    });
    const thought = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    return { thought, changes: [], tokensUsed: response.usage.input_tokens + response.usage.output_tokens };
  }
  // Multi-turn agentic loop — streams text tokens when onToken is provided
  async runAgentLoop(messages, options) {
    const { system, tools, executor, maxTurns = 10, onToken, onToolCall, onToolResult, signal } = options;
    if (!tools.length) {
      if (!onToken) return this.generate(messages, { system, model: options.model, maxTokens: options.maxTokens });
      const stream = this.client.messages.stream({
        model: options.model ?? this.defaultModel,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content }))
      }, { signal });
      let thought2 = "";
      stream.on("text", (text) => {
        thought2 += text;
        onToken(text);
      });
      const response = await stream.finalMessage();
      return { thought: thought2, changes: [], tokensUsed: response.usage.input_tokens + response.usage.output_tokens };
    }
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const anthropicTools = tools.map(toAnthropicTool);
    let thought = "";
    let tokensUsed = 0;
    for (let turn = 0; turn < maxTurns; turn++) {
      if (signal?.aborted) break;
      const params = {
        model: options.model ?? this.defaultModel,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        system,
        tools: anthropicTools,
        messages: history
      };
      let response;
      let turnText = "";
      if (onToken) {
        const stream = this.client.messages.stream(params, { signal });
        const contentBlocks = [];
        stream.on("text", (text) => {
          turnText += text;
          onToken(text);
        });
        stream.on("contentBlock", (block) => {
          contentBlocks.push(block);
        });
        response = await stream.finalMessage();
      } else {
        response = await this.client.messages.create(params);
        turnText = response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      }
      tokensUsed += response.usage.input_tokens + response.usage.output_tokens;
      if (turnText.trim()) thought += (thought ? "\n" : "") + turnText.trim();
      history.push({ role: "assistant", content: response.content });
      if (response.stop_reason !== "tool_use") break;
      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const input = block.input;
        onToolCall?.(block.name, input);
        const result = await executor.execute(block.name, input);
        onToolResult?.(block.name, result);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
      history.push({ role: "user", content: toolResults });
    }
    return { thought, changes: executor.getChanges(), tokensUsed };
  }
};
function toAnthropicTool(tool) {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema
  };
}

// src/providers/openai-text-parser.ts
var LANG_DEFAULT_FILE = {
  html: "index.html",
  css: "styles.css",
  javascript: "script.js",
  js: "script.js",
  typescript: "app.ts",
  ts: "app.ts",
  python: "main.py",
  py: "main.py",
  go: "main.go",
  rust: "main.rs",
  java: "Main.java",
  kotlin: "Main.kt",
  ruby: "main.rb",
  php: "index.php",
  swift: "main.swift",
  dart: "main.dart",
  cpp: "main.cpp",
  c: "main.c",
  csharp: "Program.cs",
  cs: "Program.cs",
  sh: "run.sh",
  bash: "run.sh",
  sql: "schema.sql",
  json: "data.json",
  yaml: "config.yaml",
  toml: "config.toml",
  markdown: "README.md",
  md: "README.md"
};
function extractChangesFromTools(calls) {
  const changes = [];
  for (const call of calls) {
    const name = call.function?.name;
    const input = parseArgs(call.function?.arguments);
    if (!name || !input) continue;
    if (name === "delete_file" && typeof input.path === "string") {
      changes.push({ path: input.path, type: "delete", diff: "" });
      continue;
    }
    if (name !== "write_file" || typeof input.path !== "string" || typeof input.content !== "string") continue;
    changes.push({ path: input.path, type: "create", diff: input.content });
  }
  return changes;
}
function extractChangesFromXml(text) {
  const changes = [];
  const pattern = /<kova_file\s+path="([^"]+)">([\s\S]*?)<\/kova_file>/g;
  for (const m of text.matchAll(pattern)) {
    const path = m[1].trim();
    const content = m[2].replace(/^\n/, "").replace(/\n$/, "");
    if (path && content) changes.push({ path, type: "create", diff: content });
  }
  return changes;
}
function extractChangesFromText(text) {
  const byPath = /* @__PURE__ */ new Map();
  for (const m of text.matchAll(/\[FILE:\s*([^\]\n]+)\]\s*```[^\n]*\n([\s\S]*?)```/g)) {
    const p = normalizePath(m[1].trim());
    if (p && m[2].trim()) byPath.set(p, m[2].trim());
  }
  for (const m of text.matchAll(/\[FILE:\s*([^\]\n]+)\]\s*(?:```[^\n]*\n)?([\s\S]*?)\[\/FILE\]/g)) {
    const p = normalizePath(m[1].trim());
    const c = m[2].replace(/```[\w]*\n?/g, "").replace(/```\s*$/g, "").trim();
    if (p && c) byPath.set(p, c);
  }
  if (byPath.size > 0) return toFileChanges(byPath);
  for (const m of text.matchAll(/```(?:\w+)?\n(?:\/\/|#)\s*([\w./\\-]+\.\w+)\n([\s\S]*?)```/g)) {
    const p = normalizePath(m[1].trim());
    if (p && m[2].trim()) byPath.set(p, m[2].trim());
  }
  if (byPath.size > 0) return toFileChanges(byPath);
  for (const m of text.matchAll(/(?:\*\*`?([^`\n*]{2,80}\.\w+)`?\*\*[:\s]*\n|^([^*`\n]{2,80}\.\w+):\s*\n)```[\w]*\n([\s\S]*?)```/gm)) {
    const p = normalizePath((m[1] ?? m[2]).trim());
    if (p && m[3].trim()) byPath.set(p, m[3].trim());
  }
  if (byPath.size > 0) return toFileChanges(byPath);
  for (const m of text.matchAll(/^#{1,3}\s+([\w./\\-]+\.\w+)\s*\n```[\w]*\n([\s\S]*?)```/gm)) {
    const p = normalizePath(m[1].trim());
    if (p && m[2].trim()) byPath.set(p, m[2].trim());
  }
  if (byPath.size > 0) return toFileChanges(byPath);
  for (const m of text.matchAll(/(?:^|\n)(?:File(?:name)?|Create|Path):\s*([\w./\\-]+\.\w+)\s*\n```[\w]*\n([\s\S]*?)```/gi)) {
    const p = normalizePath(m[1].trim());
    if (p && m[2].trim()) byPath.set(p, m[2].trim());
  }
  if (byPath.size > 0) return toFileChanges(byPath);
  const bareBlocks = [...text.matchAll(/```(\w+)\n([\s\S]{20,}?)```/g)];
  if (bareBlocks.length > 0 && bareBlocks.length <= 4) {
    const usedNames = /* @__PURE__ */ new Set();
    for (const m of bareBlocks) {
      const lang = m[1].toLowerCase();
      const content = m[2].trim();
      if (!content) continue;
      let defaultName = LANG_DEFAULT_FILE[lang];
      if (!defaultName) continue;
      if (usedNames.has(defaultName)) {
        const ext = defaultName.split(".").at(-1) ?? "";
        const base = defaultName.slice(0, defaultName.lastIndexOf("."));
        defaultName = `${base}${usedNames.size}.${ext}`;
      }
      usedNames.add(defaultName);
      byPath.set(defaultName, content);
    }
  }
  return toFileChanges(byPath);
}
function normalizePath(raw) {
  let p = raw.replace(/\\/g, "/");
  const absMatch = p.match(/^(?:[A-Za-z]:\/|\/)[^/].*?\/(.+)$/);
  if (absMatch) p = absMatch[1];
  return p.replace(/[`'"]/g, "").trim();
}
function toFileChanges(map) {
  return [...map.entries()].filter(([path, content]) => path.length > 0 && content.length > 0).map(([path, content]) => ({ path, type: "create", diff: content }));
}
function parseArgs(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

// src/providers/openai-compatible.ts
var OpenAICompatibleProvider = class {
  constructor(options) {
    this.options = options;
  }
  // Local/compatible models vary widely — conservative defaults
  capabilities() {
    const model = this.options.model.toLowerCase();
    const likelySupportsTools = /gpt-4|claude|gemini|qwen2\.5|mistral-large|llama-3\.[12]/.test(model);
    const contextLimit = /128k|200k|1m/.test(model) ? 1e5 : 8e3;
    return { supportsToolCalls: likelySupportsTools, contextTokenLimit: contextLimit };
  }
  // Single-turn — used for task structuring
  async generate(messages, options = {}) {
    const chatMessages = options.system ? [{ role: "system", content: options.system }, ...messages] : messages;
    const response = await this.callApi(chatMessages, [], options);
    const message = response.choices?.[0]?.message;
    const text = message?.content ?? "";
    const toolChanges = extractChangesFromTools(message?.tool_calls ?? []);
    if (toolChanges.length > 0) return { thought: text.trim(), changes: toolChanges, tokensUsed: tokenCount(response) };
    const xmlChanges = extractChangesFromXml(text);
    if (xmlChanges.length > 0) return { thought: text.trim(), changes: xmlChanges, tokensUsed: tokenCount(response) };
    return { thought: text.trim(), changes: extractChangesFromText(text), tokensUsed: tokenCount(response) };
  }
  // Multi-turn agentic loop with SSE streaming for text turns
  async runAgentLoop(messages, options) {
    const { system, tools, executor, maxTurns = 10, onToken, onToolCall, onToolResult, signal } = options;
    const history = [
      { role: "system", content: system },
      ...messages.map((m) => ({ role: m.role, content: m.content }))
    ];
    const openaiTools = tools.map(toOpenAITool);
    let thought = "";
    let tokensUsed = 0;
    for (let turn = 0; turn < maxTurns; turn++) {
      if (signal?.aborted) break;
      const { text: textContent, toolCalls, finishReason, tokens, reasoningContent } = await this.streamingTurn(
        history,
        openaiTools,
        options,
        onToken,
        signal
      );
      tokensUsed += tokens;
      if (textContent.trim()) thought += (thought ? "\n" : "") + textContent.trim();
      const assistantMsg = {
        role: "assistant",
        content: textContent || null,
        tool_calls: toolCalls.length > 0 ? toolCalls : void 0,
        // Preserve reasoning_content — required by DeepSeek thinking mode in subsequent turns
        ...reasoningContent ? { reasoning_content: reasoningContent } : {}
      };
      history.push(assistantMsg);
      if (finishReason !== "tool_calls" || !toolCalls.length) {
        if (executor.getChanges().length === 0 && textContent) {
          const xmlChanges = extractChangesFromXml(textContent);
          const changes = xmlChanges.length > 0 ? xmlChanges : extractChangesFromText(textContent);
          for (const c of changes) {
            if (c.type !== "delete") await executor.execute("write_file", { path: c.path, content: c.diff });
          }
        }
        break;
      }
      for (const tc of toolCalls) {
        const name = tc.function?.name ?? "";
        const input = parseArgs2(tc.function?.arguments);
        onToolCall?.(name, input ?? {});
        const result = input ? await executor.execute(name, input) : "Error: invalid arguments";
        onToolResult?.(name, result);
        history.push({ role: "tool", tool_call_id: tc.id ?? "", content: result });
      }
    }
    return { thought, changes: executor.getChanges(), tokensUsed };
  }
  // Streaming turn — uses SSE when onToken is provided, falls back to regular JSON otherwise
  async streamingTurn(messages, tools, options, onToken, signal) {
    if (!onToken) {
      const response2 = await this.callApi(messages, tools, options);
      const choice = response2.choices?.[0];
      const text2 = choice?.message?.content ?? "";
      const toolCalls2 = choice?.message?.tool_calls ?? [];
      const reasoningContent2 = choice?.message?.reasoning_content || void 0;
      return { text: text2, toolCalls: toolCalls2, finishReason: choice?.finish_reason ?? "stop", tokens: tokenCount(response2), reasoningContent: reasoningContent2 };
    }
    const body = {
      model: (options.model ?? this.options.model) || void 0,
      messages,
      max_tokens: options.maxTokens,
      stream: true
    };
    if (tools.length > 0) body.tools = tools;
    const headers = { "Content-Type": "application/json" };
    if (this.options.apiKey) headers["Authorization"] = `Bearer ${this.options.apiKey}`;
    const response = await fetch(`${trimSlash(this.options.baseUrl)}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal
    });
    if (!response.ok) throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "", text = "", reasoningContent = "", finishReason = "stop", tokens = 0;
    const toolAcc = {};
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.usage) tokens += tokenCount({ usage: data.usage });
          const choice = data.choices?.[0];
          if (!choice) continue;
          if (choice.finish_reason) finishReason = choice.finish_reason;
          const delta = choice.delta;
          if (!delta) continue;
          if (delta.reasoning_content) reasoningContent += delta.reasoning_content;
          if (delta.content) {
            text += delta.content;
            onToken?.(delta.content);
          }
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (!toolAcc[tc.index]) toolAcc[tc.index] = { id: "", name: "", args: "" };
              if (tc.id) toolAcc[tc.index].id = tc.id;
              if (tc.function?.name) toolAcc[tc.index].name = tc.function.name;
              if (tc.function?.arguments) toolAcc[tc.index].args += tc.function.arguments;
            }
          }
        } catch {
        }
      }
    }
    const toolCalls = Object.values(toolAcc).map((tc) => ({
      id: tc.id,
      type: "function",
      function: { name: tc.name, arguments: tc.args }
    }));
    return {
      text,
      toolCalls,
      finishReason,
      tokens: tokens || estimateTokenCount([...messages.map((m) => m.content ?? ""), text].join("\n\n")),
      reasoningContent: reasoningContent || void 0
    };
  }
  async callApi(messages, tools, options) {
    const body = {
      model: (options.model ?? this.options.model) || void 0,
      messages,
      max_tokens: options.maxTokens
    };
    if (tools.length > 0) body.tools = tools;
    const headers = { "Content-Type": "application/json" };
    if (this.options.apiKey) headers["Authorization"] = `Bearer ${this.options.apiKey}`;
    const response = await fetch(`${trimSlash(this.options.baseUrl)}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
    return response.json();
  }
};
function toOpenAITool(tool) {
  return {
    type: "function",
    function: { name: tool.name, description: tool.description, parameters: tool.inputSchema }
  };
}
function parseArgs2(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function tokenCount(response) {
  const u = response.usage;
  if (!u) return 0;
  return u.total_tokens ?? (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0);
}
function estimateTokenCount(text) {
  return Math.ceil(text.length / 4);
}
function trimSlash(value) {
  return value.replace(/\/+$/, "");
}
export {
  AGENT_TOOLS,
  Agent,
  AnthropicProvider,
  DEFAULT_PERMISSION_POLICY,
  MODE_PROMPTS,
  OpenAICompatibleProvider,
  READ_ONLY_PERMISSION_POLICY,
  READ_ONLY_TOOLS,
  ToolExecutor
};
