"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  runBuildLayer: () => runBuildLayer,
  runLintLayer: () => runLintLayer,
  runPipeline: () => runPipeline,
  runRulesLayer: () => runRulesLayer,
  runSecurityLayer: () => runSecurityLayer,
  runTestsLayer: () => runTestsLayer,
  runTypecheckLayer: () => runTypecheckLayer
});
module.exports = __toCommonJS(index_exports);

// src/layers/build.ts
var import_node_child_process = require("child_process");
var import_node_util = require("util");

// src/layers/error-parsers.ts
function makeError(layer, msg, file = "", line, rule, sev = "high") {
  return { layer, type: layer === "lint" ? "style" : "syntax", severity: sev, fixable: false, message: msg.trim(), humanMessage: msg.trim(), file, line, rule };
}
function parseBuildErrors(output) {
  const errors = [];
  extract(
    errors,
    "build",
    output,
    /^(.+?)\((\d+),\d+\):\s*error\s+(TS\d+|CS\d+):\s*(.+)$/gm,
    (m) => makeError("build", m[4], m[1], +m[2], m[3])
  );
  if (!errors.length) {
    const lines = output.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const arrow = lines[i].match(/^\s+-->\s+(.+?):(\d+):\d+/);
      if (!arrow) continue;
      for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
        const err = lines[j].match(/^(?:error|warning)(?:\[(\w+)\])?:\s+(.+)$/);
        if (err) {
          errors.push(makeError("build", err[2], arrow[1], +arrow[2], err[1]));
          break;
        }
      }
    }
  }
  if (!errors.length)
    extract(
      errors,
      "build",
      output,
      /^(.+?):(\d+):\d+:\s+(?:error|fatal error):\s+(.+)$/gm,
      (m) => makeError("build", m[3], m[1], +m[2])
    );
  if (!errors.length)
    extract(
      errors,
      "build",
      output,
      /^(.+?\.py):(\d+):\d*:?\s+(?:E\d+\s+)?(.+)$/gm,
      (m) => makeError("build", m[3], m[1], +m[2])
    );
  if (!errors.length)
    extract(
      errors,
      "build",
      output,
      /^(?:\.\/)?(.+?\.go):(\d+):\d+:\s+(.+)$/gm,
      (m) => makeError("build", m[3], m[1], +m[2])
    );
  if (!errors.length)
    extract(
      errors,
      "build",
      output,
      /^(.+?\.java):(\d+):\s+error:\s+(.+)$/gm,
      (m) => makeError("build", m[3], m[1], +m[2])
    );
  if (!errors.length)
    extract(
      errors,
      "build",
      output,
      /^(.+?):(\d+)(?::\d+)?:\s*(?:error|ERROR|Error)[:\s]+(.+)$/gm,
      (m) => makeError("build", m[3], m[1], +m[2])
    );
  if (!errors.length && output.trim())
    errors.push(makeError("build", output.trim()));
  return errors;
}
function parseTestFailures(output) {
  const names = [];
  for (const line of output.split("\n")) {
    const t = line.trim();
    if (/^[✗×✕✘]\s+/.test(t) && !/\.test\.[tj]sx?/.test(t))
      names.push(t.replace(/^[✗×✕✘]\s+/, "").trim());
  }
  if (names.length) return names;
  for (const line of output.split("\n")) {
    const m = line.match(/^FAILED\s+(.+?)(?:\s+-\s+.+)?$/);
    if (m) names.push(m[1].trim());
  }
  if (names.length) return names;
  for (const line of output.split("\n")) {
    const m = line.match(/^--- FAIL:\s+(\S+)/);
    if (m) names.push(m[1]);
  }
  if (names.length) return names;
  const cargoBlock = output.match(/^failures:\n((?:[ \t]+\S+\n?)+)/m);
  if (cargoBlock) {
    for (const l of cargoBlock[1].split("\n"))
      if (l.trim()) names.push(l.trim());
  }
  if (names.length) return names;
  for (const line of output.split("\n")) {
    const m = line.match(/\b(?:FAILED|FAIL)\b[:\s]+(.+)/);
    if (m && m[1].trim() && !m[1].includes("\n")) names.push(m[1].trim());
  }
  return names;
}
function parseLintErrors(output) {
  const errors = [];
  extract(
    errors,
    "lint",
    output,
    /^(.+?):(\d+):(?:\d+):?\s+(?:error|warning)\s+(.+?)(?:\s+\[(.+?)\])?$/gm,
    (m) => makeError("lint", m[3], m[1], +m[2], m[4], "low")
  );
  if (!errors.length)
    extract(
      errors,
      "lint",
      output,
      /^(.+?\.py):(\d+):(?:\d+):\s+([A-Z]\d+)\s+(.+)$/gm,
      (m) => makeError("lint", m[4], m[1], +m[2], m[3], "low")
    );
  if (!errors.length)
    extract(
      errors,
      "lint",
      output,
      /^(.+?\.go):(\d+):(?:\d+):\s+(.+?)(?:\s+\((.+?)\))?$/gm,
      (m) => makeError("lint", m[3], m[1], +m[2], m[4], "low")
    );
  if (!errors.length) {
    const lines = output.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const arrow = lines[i].match(/^\s+-->\s+(.+?):(\d+):\d+/);
      if (!arrow) continue;
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const w = lines[j].match(/^(?:warning|error)(?:\[(\w+)\])?:\s+(.+)$/);
        if (w) {
          errors.push(makeError("lint", w[2], arrow[1], +arrow[2], w[1], "low"));
          break;
        }
      }
    }
  }
  if (!errors.length)
    extract(
      errors,
      "lint",
      output,
      /^(.+?):(\d+)(?::\d+)?:\s+(.+)$/gm,
      (m) => makeError("lint", m[3], m[1], +m[2], void 0, "low")
    );
  if (!errors.length && output.trim())
    errors.push(makeError("lint", output.trim(), "", void 0, void 0, "low"));
  return errors;
}
function extract(out, layer, text, pattern, mapper) {
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const err = mapper(m);
    if (err.file && err.file.length < 200) out.push(err);
  }
}

// src/layers/build.ts
var execAsync = (0, import_node_util.promisify)(import_node_child_process.exec);
async function runBuildLayer(config) {
  if (!config.command.trim()) {
    return { name: "build", passed: true, errors: [], warnings: [], duration: 0, skipped: true };
  }
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const start = Date.now();
  const timeout = config.timeoutMs ?? 3e4;
  try {
    const result = await execAsync(config.command, { cwd: config.projectRoot, timeout });
    return {
      name: "build",
      passed: true,
      errors: [],
      warnings: [],
      duration: Date.now() - start,
      skipped: false,
      command: config.command,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: 0,
      startedAt
    };
  } catch (error) {
    const err = error;
    const stdout = err.stdout ?? "";
    const stderr = err.stderr ?? "";
    const exitCode = err.code ?? 1;
    if (err.killed) {
      return {
        name: "build",
        passed: false,
        errors: [makeTimeoutError(timeout)],
        warnings: [],
        duration: Date.now() - start,
        skipped: false,
        command: config.command,
        stdout,
        stderr,
        exitCode,
        startedAt
      };
    }
    const output = stderr.trim() ? stderr : stdout;
    const errors = parseBuildErrors(output);
    return {
      name: "build",
      passed: false,
      errors,
      warnings: [],
      duration: Date.now() - start,
      skipped: false,
      command: config.command,
      stdout,
      stderr,
      exitCode,
      startedAt
    };
  }
}
function makeTimeoutError(timeoutMs) {
  return {
    layer: "build",
    type: "syntax",
    severity: "critical",
    fixable: false,
    message: `Build timeout ap\xF3s ${timeoutMs}ms`,
    humanMessage: `Build demorou mais de ${timeoutMs}ms`,
    file: ""
  };
}

// src/layers/tests.ts
var import_node_child_process2 = require("child_process");
var import_node_util2 = require("util");
var execAsync2 = (0, import_node_util2.promisify)(import_node_child_process2.exec);
async function runTestsLayer(config) {
  if (!config.command.trim()) {
    return { name: "tests", passed: true, errors: [], warnings: [], duration: 0, skipped: true };
  }
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const start = Date.now();
  const timeout = config.timeoutMs ?? 6e4;
  try {
    const result = await execAsync2(config.command, { cwd: config.projectRoot, timeout });
    return {
      name: "tests",
      passed: true,
      errors: [],
      warnings: [],
      duration: Date.now() - start,
      skipped: false,
      command: config.command,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: 0,
      startedAt
    };
  } catch (error) {
    const err = error;
    const stdout = err.stdout ?? "";
    const stderr = err.stderr ?? "";
    const exitCode = err.code ?? 1;
    if (err.killed) {
      return {
        name: "tests",
        passed: false,
        errors: [makeTimeoutError2(timeout)],
        warnings: [],
        duration: Date.now() - start,
        skipped: false,
        command: config.command,
        stdout,
        stderr,
        exitCode,
        startedAt
      };
    }
    const output = stdout.trim() ? stdout : stderr;
    const parsed = parseOutput(output);
    return {
      name: "tests",
      passed: false,
      errors: buildErrors(parsed),
      warnings: buildWarnings(parsed),
      duration: Date.now() - start,
      skipped: false,
      command: config.command,
      stdout,
      stderr,
      exitCode,
      startedAt
    };
  }
}
function parseOutput(output) {
  const failed = Number(output.match(/(\d+)\s+failed/)?.[1] ?? "0");
  const passed = Number(output.match(/(\d+)\s+passed/)?.[1] ?? "0");
  const skipped = Number(output.match(/(\d+)\s+skipped/)?.[1] ?? "0");
  const total = passed + failed + skipped || Number(output.match(/\((\d+)\)/)?.[1] ?? "0");
  return { total, passed, failed, skipped, failedTests: parseTestFailures(output) };
}
function buildErrors(parsed) {
  if (parsed.failedTests.length > 0) {
    return parsed.failedTests.map((name) => ({
      layer: "tests",
      type: "logic",
      severity: "high",
      fixable: false,
      message: `Test falhou: ${name}`,
      humanMessage: `Test falhou: ${name}`,
      file: ""
    }));
  }
  return [{
    layer: "tests",
    type: "logic",
    severity: "high",
    fixable: false,
    message: parsed.failed > 0 ? `${parsed.failed} test(s) falharam` : "Test runner falhou",
    humanMessage: parsed.failed > 0 ? `${parsed.failed} test(s) falharam` : "Test runner falhou",
    file: ""
  }];
}
function buildWarnings(parsed) {
  if (parsed.skipped === 0) return [];
  return [{ layer: "tests", message: `${parsed.skipped} test(s) pulados`, file: "" }];
}
function makeTimeoutError2(timeoutMs) {
  return {
    layer: "tests",
    type: "logic",
    severity: "critical",
    fixable: false,
    message: `Tests timeout ap\xF3s ${timeoutMs}ms`,
    humanMessage: `Tests demoraram mais de ${timeoutMs}ms`,
    file: ""
  };
}

// src/layers/rules.ts
var import_node_path = require("path");

// src/layers/ast-utils.ts
var ts = __toESM(require("typescript"));
var import_node_fs = require("fs");
function parseTsFile(filePath) {
  try {
    const content = (0, import_node_fs.readFileSync)(filePath, "utf-8");
    return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  } catch {
    return null;
  }
}
function getFunctionViolations(sourceFile, relPath, profile) {
  const errors = [];
  const visit = (node) => {
    if (isFunctionLike(node) && hasFunctionBody(node)) {
      const body = node.body;
      const name = getFnName(node, sourceFile);
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      const complexity = calcComplexity(node);
      const nesting = calcNesting(body, 0);
      if (complexity > profile.cyclomaticLimit) {
        errors.push(makeError2(
          relPath,
          line,
          `Complexidade ciclom\xE1tica ${complexity} excede ${profile.cyclomaticLimit} na fun\xE7\xE3o '${name}'`,
          "high"
        ));
      }
      if (nesting > profile.nestingLimit) {
        errors.push(makeError2(
          relPath,
          line,
          `Nesting ${nesting} excede ${profile.nestingLimit} na fun\xE7\xE3o '${name}' (Object Calisthenics)`,
          "medium"
        ));
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return errors;
}
function isFunctionLike(node) {
  return ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node);
}
function hasFunctionBody(node) {
  const body = node.body;
  return !!body && ts.isBlock(body);
}
function getFnName(node, sf) {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    return node.name?.getText(sf) ?? "anonymous";
  }
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent)) return parent.name.getText(sf);
  return "anonymous";
}
function calcComplexity(node) {
  let count = 1;
  const DECISION = /* @__PURE__ */ new Set([
    ts.SyntaxKind.IfStatement,
    ts.SyntaxKind.ConditionalExpression,
    ts.SyntaxKind.WhileStatement,
    ts.SyntaxKind.DoStatement,
    ts.SyntaxKind.ForStatement,
    ts.SyntaxKind.ForInStatement,
    ts.SyntaxKind.ForOfStatement,
    ts.SyntaxKind.CaseClause,
    ts.SyntaxKind.CatchClause
  ]);
  const visit = (n) => {
    if (DECISION.has(n.kind)) count++;
    if (ts.isBinaryExpression(n)) {
      const op = n.operatorToken.kind;
      if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) count++;
    }
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(node, visit);
  return count;
}
function calcNesting(node, depth) {
  const NESTING = /* @__PURE__ */ new Set([
    ts.SyntaxKind.IfStatement,
    ts.SyntaxKind.ForStatement,
    ts.SyntaxKind.ForInStatement,
    ts.SyntaxKind.ForOfStatement,
    ts.SyntaxKind.WhileStatement,
    ts.SyntaxKind.DoStatement,
    ts.SyntaxKind.TryStatement,
    ts.SyntaxKind.SwitchStatement
  ]);
  const next = NESTING.has(node.kind) ? depth + 1 : depth;
  let max = next;
  ts.forEachChild(node, (child) => {
    max = Math.max(max, calcNesting(child, next));
  });
  return max;
}
function makeError2(file, line, message, severity) {
  return { layer: "rules", type: "architecture", severity, fixable: false, message, humanMessage: message, file, line };
}

// src/layers/rules.ts
var FORBIDDEN = [
  { pattern: /:\s*any\b/, message: "Uso de 'any' viola tipagem estrita", severity: "high", adapters: ["typescript"] },
  { pattern: /^export default\b/, message: "Default export proibido \u2014 use named exports", severity: "medium", adapters: ["typescript"] },
  { pattern: /catch\s*\(\w*\)\s*\{\s*\}/, message: "Catch silencioso proibido", severity: "high", adapters: ["typescript", "javascript"] }
];
var UI_EXTS = /* @__PURE__ */ new Set([".tsx", ".jsx", ".vue", ".css", ".scss"]);
function buildProfile(filePath, override) {
  const isUI = UI_EXTS.has((0, import_node_path.extname)(filePath));
  return {
    fileType: isUI ? "ui" : "logic",
    functionSizeLimit: isUI ? 80 : 40,
    fileSizeLimit: isUI ? 400 : 200,
    nestingLimit: isUI ? 4 : 2,
    cyclomaticLimit: isUI ? 15 : 10,
    enforceNaming: !isUI,
    ...override
  };
}
async function runRulesLayer(config, _rulesContent) {
  const errors = [];
  const warnings = [];
  for (const change of config.changes) {
    if (change.type === "delete") continue;
    const added = extractAddedLines(change.diff);
    errors.push(...checkForbidden(added, change.path, config.adapter));
    if (isTsFile(change.path)) {
      const profile = buildProfile(change.path, config.profile);
      const sf = parseTsFile((0, import_node_path.join)(config.projectRoot, change.path));
      if (sf) {
        errors.push(...getFunctionViolations(sf, change.path, profile));
      }
    }
  }
  return { name: "rules", passed: errors.length === 0, errors, warnings, duration: 0, skipped: false };
}
function isTsFile(path) {
  return [".ts", ".tsx"].includes((0, import_node_path.extname)(path));
}
function extractAddedLines(diff) {
  return diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1));
}
function checkForbidden(lines, file, adapter) {
  const errors = [];
  const active = FORBIDDEN.filter((r) => !r.adapters || !adapter || r.adapters.includes(adapter));
  for (const [idx, line] of lines.entries()) {
    for (const rule of active) {
      if (rule.pattern.test(line)) {
        errors.push({
          layer: "rules",
          type: "architecture",
          severity: rule.severity,
          fixable: false,
          message: rule.message,
          humanMessage: rule.message,
          file,
          line: idx + 1
        });
      }
    }
  }
  return errors;
}

// src/layers/security.ts
var import_node_child_process3 = require("child_process");
var import_node_util3 = require("util");
var execAsync3 = (0, import_node_util3.promisify)(import_node_child_process3.exec);
var SECRET_PATTERNS = [
  { pattern: /\bsk-[a-zA-Z0-9]{20,}/, label: "OpenAI API key" },
  { pattern: /\bpk_[a-zA-Z0-9]{20,}/, label: "Stripe key" },
  { pattern: /\bAKIA[A-Z0-9]{16}/, label: "AWS access key" },
  { pattern: /\bghp_[a-zA-Z0-9]{36,}/, label: "GitHub token" },
  { pattern: /password\s*=\s*["'][^"']{3,}["']/, label: "Hardcoded password" }
];
async function runSecurityLayer(config) {
  const secretErrors = checkSecrets(config.changes);
  if (secretErrors.length > 0) {
    return secResult(secretErrors, [], 0);
  }
  const available = await isSemgrepAvailable(config.projectRoot);
  if (!available) {
    const warn = {
      layer: "security",
      message: "Semgrep n\xE3o encontrado \u2014 an\xE1lise SAST pulada",
      file: ""
    };
    return { name: "security", passed: true, errors: [], warnings: [warn], duration: 0, skipped: false };
  }
  return runSemgrep(config.projectRoot);
}
function checkSecrets(changes) {
  const errors = [];
  for (const change of changes) {
    if (change.type === "delete") continue;
    const added = change.diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1));
    for (const [idx, line] of added.entries()) {
      for (const { pattern, label } of SECRET_PATTERNS) {
        if (pattern.test(line)) {
          errors.push({
            layer: "security",
            type: "security",
            severity: "critical",
            fixable: false,
            message: `${label} detectado em ${change.path}`,
            humanMessage: `Poss\xEDvel ${label} hardcoded \u2014 use vari\xE1veis de ambiente`,
            file: change.path,
            line: idx + 1
          });
        }
      }
    }
  }
  return errors;
}
async function isSemgrepAvailable(projectRoot) {
  try {
    await execAsync3("semgrep --version", { cwd: projectRoot, timeout: 5e3 });
    return true;
  } catch {
    return false;
  }
}
async function runSemgrep(projectRoot) {
  try {
    const execResult = await execAsync3("semgrep --config=auto --json", {
      cwd: projectRoot,
      timeout: 12e4
    });
    const stdout = execResult.stdout ?? "";
    const data = JSON.parse(stdout);
    const errors = data.results.map((r) => ({
      layer: "security",
      type: "security",
      severity: r.extra.severity === "ERROR" ? "high" : "medium",
      fixable: false,
      message: r.extra.message,
      humanMessage: r.extra.message,
      file: r.path,
      line: r.start.line
    }));
    return secResult(errors, [], 0);
  } catch (error) {
    throw new Error(`Semgrep falhou: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function secResult(errors, warnings, duration) {
  return { name: "security", passed: errors.length === 0, errors, warnings, duration, skipped: false };
}

// src/layers/lint.ts
var import_node_child_process4 = require("child_process");
var import_node_util4 = require("util");
var execAsync4 = (0, import_node_util4.promisify)(import_node_child_process4.exec);
async function runLintLayer(config) {
  if (!config.command.trim()) {
    return { name: "lint", passed: true, errors: [], warnings: [], duration: 0, skipped: true };
  }
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const start = Date.now();
  const timeout = config.timeoutMs ?? 6e4;
  try {
    const result = await execAsync4(config.command, { cwd: config.projectRoot, timeout });
    return {
      name: "lint",
      passed: true,
      errors: [],
      warnings: [],
      duration: Date.now() - start,
      skipped: false,
      command: config.command,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: 0,
      startedAt
    };
  } catch (error) {
    const err = error;
    const stdout = err.stdout ?? "";
    const stderr = err.stderr ?? "";
    const exitCode = err.code ?? 1;
    if (err.killed) {
      return {
        name: "lint",
        passed: false,
        errors: [makeTimeoutError3(timeout)],
        warnings: [],
        duration: Date.now() - start,
        skipped: false,
        command: config.command,
        stdout,
        stderr,
        exitCode,
        startedAt
      };
    }
    const output = stdout.trim() ? stdout : stderr;
    return {
      name: "lint",
      passed: false,
      errors: parseLintErrors(output),
      warnings: [],
      duration: Date.now() - start,
      skipped: false,
      command: config.command,
      stdout,
      stderr,
      exitCode,
      startedAt
    };
  }
}
function makeTimeoutError3(timeoutMs) {
  return {
    layer: "lint",
    type: "style",
    severity: "high",
    fixable: false,
    message: `Lint timeout ap\xF3s ${timeoutMs}ms`,
    humanMessage: `Lint demorou mais de ${timeoutMs}ms`,
    file: ""
  };
}

// src/layers/typecheck.ts
var import_node_child_process5 = require("child_process");
var import_node_util5 = require("util");
var execAsync5 = (0, import_node_util5.promisify)(import_node_child_process5.exec);
async function runTypecheckLayer(config) {
  if (!config.command.trim()) {
    return { name: "typecheck", passed: true, errors: [], warnings: [], duration: 0, skipped: true };
  }
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const start = Date.now();
  const timeout = config.timeoutMs ?? 3e4;
  try {
    const result = await execAsync5(config.command, { cwd: config.projectRoot, timeout });
    return {
      name: "typecheck",
      passed: true,
      errors: [],
      warnings: [],
      duration: Date.now() - start,
      skipped: false,
      command: config.command,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: 0,
      startedAt
    };
  } catch (error) {
    const err = error;
    const stdout = err.stdout ?? "";
    const stderr = err.stderr ?? "";
    const exitCode = err.code ?? 1;
    if (err.killed) {
      return {
        name: "typecheck",
        passed: false,
        errors: [makeTimeoutError4(timeout)],
        warnings: [],
        duration: Date.now() - start,
        skipped: false,
        command: config.command,
        stdout,
        stderr,
        exitCode,
        startedAt
      };
    }
    const output = stderr.trim() ? stderr : stdout;
    const errors = parseBuildErrors(output).map((e) => ({ ...e, layer: "typecheck" }));
    return {
      name: "typecheck",
      passed: false,
      errors,
      warnings: [],
      duration: Date.now() - start,
      skipped: false,
      command: config.command,
      stdout,
      stderr,
      exitCode,
      startedAt
    };
  }
}
function makeTimeoutError4(timeoutMs) {
  return {
    layer: "typecheck",
    type: "syntax",
    severity: "high",
    fixable: false,
    message: `Typecheck timeout ap\xF3s ${timeoutMs}ms`,
    humanMessage: `Typecheck demorou mais de ${timeoutMs}ms`,
    file: ""
  };
}

// src/pipeline.ts
var SCORE_WEIGHTS = {
  build: 25,
  typecheck: 10,
  tests: 30,
  rules: 25,
  security: 10,
  lint: 10
};
function computeScore(layers) {
  const buildFailed = layers.some((l) => l.name === "build" && !l.passed && !l.skipped);
  if (buildFailed) return 0;
  let passed = 0, total = 0;
  for (const layer of layers) {
    if (layer.skipped) continue;
    const weight = SCORE_WEIGHTS[layer.name] ?? 0;
    total += weight;
    if (layer.passed) passed += weight;
  }
  return total === 0 ? 75 : Math.round(passed / total * 100);
}
async function runPipeline(layers, config) {
  const start = Date.now();
  const results = [];
  for (const layer of layers) {
    const result = await layer.run();
    results.push(result);
    const hasCritical = result.errors.some((e) => e.severity === "critical");
    if (layer.hardFail && !result.passed || hasCritical) break;
  }
  const activeResults = results.filter((r) => !r.skipped);
  const noValidation = activeResults.length === 0;
  const skippedLayers = results.filter((r) => r.skipped).map((r) => r.name);
  const ranNames = new Set(activeResults.map((r) => r.name));
  const hasCompilationCheck = ranNames.has("build") || ranNames.has("typecheck");
  const validationConfidence = activeResults.length === 0 ? "none" : hasCompilationCheck && ranNames.has("tests") ? "full" : "partial";
  if (noValidation) {
    results.push({
      name: "rules",
      passed: true,
      errors: [],
      warnings: [{
        layer: "rules",
        message: "Nenhum build, test ou lint configurado \u2014 score n\xE3o reflete qualidade real do c\xF3digo. Configure comandos no projeto para valida\xE7\xE3o efetiva.",
        file: ""
      }],
      duration: 0,
      skipped: true
    });
  }
  const passed = !noValidation && results.every((r) => r.passed || r.skipped);
  const score = computeScore(results);
  return {
    passed,
    score,
    layers: results,
    duration: Date.now() - start,
    iteration: config.iteration,
    validationConfidence,
    skippedLayers: skippedLayers.length > 0 ? skippedLayers : void 0
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runBuildLayer,
  runLintLayer,
  runPipeline,
  runRulesLayer,
  runSecurityLayer,
  runTestsLayer,
  runTypecheckLayer
});
