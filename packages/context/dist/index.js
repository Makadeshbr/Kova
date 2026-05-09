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
  ContextEngine: () => ContextEngine,
  DependencyGraph: () => DependencyGraph,
  allocateBudget: () => allocateBudget,
  estimateTokens: () => estimateTokens,
  extractKeywords: () => extractKeywords,
  grepForTask: () => grepForTask
});
module.exports = __toCommonJS(index_exports);

// src/context-engine.ts
var import_node_fs3 = require("fs");
var import_node_path3 = require("path");
var import_project = require("@kova/project");

// src/grep-search.ts
var import_fast_glob = __toESM(require("fast-glob"));
var import_node_fs = require("fs");
var import_node_path = require("path");
var SOURCE_GLOBS = ["**/*.{ts,tsx,js,jsx,py,go,rs,cpp,c,java,cs,rb}"];
var IGNORE = ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**", "**/.kova/**"];
var MAX_FILE_BYTES = 1e5;
async function grepForTask(task, projectRoot) {
  const keywords = extractKeywords(task);
  if (keywords.length === 0) return [];
  const files = await (0, import_fast_glob.default)(SOURCE_GLOBS, { cwd: projectRoot, ignore: IGNORE });
  const matches = [];
  for (const file of files) {
    const score = scoreFile(file, projectRoot, keywords);
    if (score > 0) matches.push({ file, score });
  }
  return matches.sort((a, b) => b.score - a.score);
}
function extractKeywords(text) {
  return [...new Set(
    text.toLowerCase().split(/\W+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  )];
}
function scoreFile(relPath, projectRoot, keywords) {
  const fullPath = (0, import_node_path.join)(projectRoot, relPath);
  if (!(0, import_node_fs.existsSync)(fullPath)) return 0;
  let score = 0;
  const name = (0, import_node_path.basename)(relPath).toLowerCase();
  for (const kw of keywords) {
    if (name.includes(kw)) score += 3;
  }
  try {
    if ((0, import_node_fs.statSync)(fullPath).size > MAX_FILE_BYTES) return score;
    const content = (0, import_node_fs.readFileSync)(fullPath, "utf-8").toLowerCase();
    for (const kw of keywords) {
      score += Math.min((content.match(new RegExp(kw, "g")) ?? []).length, 5);
    }
  } catch {
    return score;
  }
  return score;
}
var STOP_WORDS = /* @__PURE__ */ new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "this",
  "from",
  "are",
  "was",
  "para",
  "que",
  "com",
  "uma",
  "n\xE3o",
  "por",
  "mais",
  "como",
  "seu"
]);

// src/dependency-graph.ts
var import_node_fs2 = require("fs");
var import_node_path2 = require("path");
var import_fast_glob2 = __toESM(require("fast-glob"));
var SOURCE_GLOBS2 = ["**/*.{ts,tsx,js,jsx,py,go,rs}"];
var IGNORE2 = ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**", "**/.kova/**"];
var RESOLVE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs"];
var EXTERNAL_PREFIX = "external:";
var DependencyGraph = class {
  deps = /* @__PURE__ */ new Map();
  // file → o que importa
  rdeps = /* @__PURE__ */ new Map();
  // file → quem importa ele
  async build(projectRoot, adapter, options = {}) {
    const files = await (0, import_fast_glob2.default)(SOURCE_GLOBS2, { cwd: projectRoot, ignore: IGNORE2 });
    for (const relPath of files) {
      const fullPath = (0, import_node_path2.join)(projectRoot, relPath);
      let content;
      try {
        content = (0, import_node_fs2.readFileSync)(fullPath, "utf-8");
      } catch {
        continue;
      }
      const imports = adapter.parseImports(relPath, content);
      const resolved = imports.map((imp) => resolveImport(imp, relPath, projectRoot, options)).filter((p) => p !== null);
      this.deps.set(relPath, resolved);
      for (const dep of resolved) {
        const existing = this.rdeps.get(dep) ?? [];
        this.rdeps.set(dep, [...existing, relPath]);
      }
    }
  }
  directDependencies(file) {
    return this.deps.get(file) ?? [];
  }
  dependents(file) {
    return this.rdeps.get(file) ?? [];
  }
  fullGraph() {
    return new Map(this.deps);
  }
};
function resolveImport(importPath, fromFile, projectRoot, options) {
  if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
    return options.includeExternal ? `${EXTERNAL_PREFIX}${packageName(importPath)}` : null;
  }
  const fromDir = (0, import_node_path2.dirname)((0, import_node_path2.join)(projectRoot, fromFile));
  const base = (0, import_node_path2.resolve)(fromDir, importPath);
  if ((0, import_node_fs2.existsSync)(base) && (0, import_node_path2.extname)(base)) {
    return toRelative(base, projectRoot);
  }
  for (const ext of RESOLVE_EXTS) {
    if ((0, import_node_fs2.existsSync)(base + ext)) return toRelative(base + ext, projectRoot);
  }
  for (const ext of RESOLVE_EXTS) {
    const idx = (0, import_node_path2.join)(base, `index${ext}`);
    if ((0, import_node_fs2.existsSync)(idx)) return toRelative(idx, projectRoot);
  }
  return null;
}
function packageName(importPath) {
  if (importPath.startsWith("@")) {
    const [scope, name] = importPath.split("/");
    return name ? `${scope}/${name}` : importPath;
  }
  return importPath.split("/")[0];
}
function toRelative(absPath, projectRoot) {
  const abs = absPath.replace(/\\/g, "/");
  const root = projectRoot.replace(/\\/g, "/");
  return abs.startsWith(root + "/") ? abs.slice(root.length + 1) : abs;
}

// src/token-budget.ts
var PRIORITY = {
  rules: 0,
  target: 1,
  error: 2,
  direct_dep: 3,
  learning: 4,
  indirect_dep: 5
};
function allocateBudget(files, maxTokens) {
  const sorted = [...files].sort((a, b) => {
    const byPriority = PRIORITY[a.relevance] - PRIORITY[b.relevance];
    if (byPriority !== 0) return byPriority;
    return (b.score ?? 0) - (a.score ?? 0);
  });
  const included = [];
  let tokensUsed = 0;
  for (const file of sorted) {
    const tokens = estimateTokens(file.content);
    if (tokensUsed + tokens <= maxTokens) {
      included.push({ ...file, tokens });
      tokensUsed += tokens;
    }
  }
  if (included.length === 0 && sorted.length > 0) {
    const first = sorted[0];
    const truncated = first.content.slice(0, maxTokens * 4);
    const tokens = estimateTokens(truncated);
    included.push({ ...first, content: truncated, tokens });
    tokensUsed = tokens;
  }
  return { files: included, tokensUsed };
}
function estimateTokens(content) {
  return Math.ceil(content.length / 4);
}

// src/context-engine.ts
var MAX_LEARNINGS = 5;
var DEFAULT_MAX_TOKENS = 4e4;
var ContextEngine = class {
  constructor(memory, adapter) {
    this.memory = memory;
    this.adapter = adapter;
  }
  async buildContext(task, projectRoot, options = {}) {
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    const errors = options.harnessErrors ?? [];
    const profile = (0, import_project.buildProjectProfile)(projectRoot);
    const omittedSensitive = /* @__PURE__ */ new Set();
    const [grepMatches, graph] = await Promise.all([
      grepForTask(task.objective, projectRoot),
      buildGraph(projectRoot, this.adapter)
    ]);
    const files = [];
    const seen = /* @__PURE__ */ new Set();
    addInstructionFiles(files, seen, projectRoot);
    addTargetFiles(files, seen, projectRoot, task.affectedFiles, graph, omittedSensitive);
    addErrorFiles(files, seen, projectRoot, errors, omittedSensitive);
    addGrepFiles(files, seen, projectRoot, grepMatches, 15, omittedSensitive);
    const learnings = this.memory.query(task.objective, MAX_LEARNINGS);
    const budget = allocateBudget(files, maxTokens);
    const pack = buildContextPack({
      task,
      profile,
      files: budget.files,
      allFiles: files,
      learnings,
      errors,
      diff: options.diff,
      maxTokens,
      tokensUsed: budget.tokensUsed,
      omittedSensitive: [...omittedSensitive]
    });
    return { files: budget.files, tokensUsed: budget.tokensUsed, learnings, pack };
  }
};
function addInstructionFiles(files, seen, projectRoot) {
  for (const instruction of (0, import_project.loadProjectInstructions)(projectRoot)) {
    if (seen.has(instruction.path)) continue;
    files.push(enrichFile({
      path: instruction.path,
      content: instruction.content,
      relevance: "rules",
      source: "instruction",
      score: 95,
      reason: "Project instruction file applies to agent behavior.",
      evidence: [`instruction:${instruction.priority}`]
    }));
    seen.add(instruction.path);
  }
}
async function buildGraph(projectRoot, adapter) {
  const graph = new DependencyGraph();
  await graph.build(projectRoot, adapter);
  return graph;
}
function addFile(files, seen, projectRoot, relPath, relevance, source, reason, evidence, score, omittedSensitive) {
  if (seen.has(relPath)) return;
  if (isSensitiveContextPath(relPath)) {
    omittedSensitive?.add(relPath);
    return;
  }
  const fullPath = (0, import_node_path3.join)(projectRoot, relPath);
  if (!(0, import_node_fs3.existsSync)(fullPath)) return;
  try {
    files.push(enrichFile({
      path: relPath,
      content: (0, import_node_fs3.readFileSync)(fullPath, "utf-8"),
      relevance,
      source,
      score,
      reason,
      evidence
    }));
    seen.add(relPath);
  } catch {
  }
}
function addTargetFiles(files, seen, projectRoot, affectedFiles, graph, omittedSensitive) {
  for (const f of affectedFiles) {
    addFile(files, seen, projectRoot, f, "target", "explicit", "Explicitly affected by the task.", ["task.affectedFiles"], 100, omittedSensitive);
    for (const dep of graph.directDependencies(f)) {
      addFile(files, seen, projectRoot, dep, "direct_dep", "dependency", `Imported by ${f}.`, [`dependency:${f}`], 78, omittedSensitive);
    }
  }
}
function addErrorFiles(files, seen, projectRoot, errors, omittedSensitive) {
  const errorPaths = [...new Set(errors.map((e) => e.file).filter(Boolean))];
  for (const f of errorPaths) {
    const related = errors.filter((error) => error.file === f).map((error) => `${error.layer}:${error.message}`).slice(0, 3);
    addFile(files, seen, projectRoot, f, "error", "error", "Referenced by recent validation errors.", related, 90, omittedSensitive);
  }
}
function addGrepFiles(files, seen, projectRoot, matches, limit, omittedSensitive) {
  for (const [index, { file }] of matches.slice(0, limit).entries()) {
    addFile(files, seen, projectRoot, file, "indirect_dep", "grep", "Text search matched the task objective.", [`grep_rank:${index + 1}`], Math.max(45, 70 - index), omittedSensitive);
  }
}
function enrichFile(file) {
  return {
    evidence: [],
    score: 50,
    reason: "Relevant project context.",
    source: "grep",
    ...file
  };
}
function buildContextPack(input) {
  const included = new Set(input.files.map((file) => file.path));
  const overBudgetFiles = input.allFiles.filter((file) => !included.has(file.path) && !input.omittedSensitive.includes(file.path)).map((file) => file.path);
  return {
    request: input.task.objective,
    profile: {
      root: input.profile.root,
      languages: input.profile.languages.slice(0, 6),
      frameworks: input.profile.frameworks.slice(0, 6),
      workspaces: input.profile.workspaces.slice(0, 8).map(({ name, path, kind, confidence }) => ({ name, path, kind, confidence })),
      risks: input.profile.risks.slice(0, 8)
    },
    files: input.files.map((file) => ({
      path: file.path,
      relevance: file.relevance,
      source: file.source ?? "grep",
      score: file.score ?? 50,
      reason: file.reason ?? "Relevant project context.",
      evidence: file.evidence ?? [],
      tokens: file.tokens
    })),
    validations: input.profile.validations.filter((item) => item.available).slice(0, 12),
    instructions: input.profile.instructionFiles.map((file) => file.path),
    errors: input.errors.slice(0, 12),
    ...input.diff ? { diff: input.diff.slice(0, 12e3) } : {},
    memories: input.learnings.filter((learning) => learning.status === "verified" || learning.status === "canonical").map(({ id, description, scope, status, confidence, tags }) => ({ id, description, scope, status, confidence, tags })),
    omitted: {
      sensitiveFiles: input.omittedSensitive,
      overBudgetFiles
    },
    budget: {
      maxTokens: input.maxTokens,
      tokensUsed: input.tokensUsed,
      fileCount: input.files.length
    }
  };
}
function isSensitiveContextPath(path) {
  const name = (0, import_node_path3.basename)(path.replace(/\\/g, "/")).toLowerCase();
  if (name === ".env.example") return false;
  return name === ".env" || name.startsWith(".env.") || name.endsWith(".env") || name.includes(".env.") || name.endsWith(".pem") || name.endsWith(".key") || name.endsWith(".p12") || name === "id_rsa" || name === "id_dsa" || name.includes("secret");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ContextEngine,
  DependencyGraph,
  allocateBudget,
  estimateTokens,
  extractKeywords,
  grepForTask
});
