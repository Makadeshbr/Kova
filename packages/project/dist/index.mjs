// src/project-scanner.ts
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { basename, dirname, join, resolve } from "path";
var ROOT_MARKERS = [
  ".git",
  ".hg",
  ".sl",
  "KOVA.md",
  "AGENTS.md",
  "CLAUDE.md",
  "package.json",
  "go.mod",
  "pyproject.toml",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "global.json",
  "composer.json",
  "Gemfile",
  "pnpm-workspace.yaml"
];
var SKIP_DIRS = /* @__PURE__ */ new Set([
  ".git",
  "node_modules",
  "dist",
  "out",
  "build",
  ".next",
  ".cache",
  "coverage",
  "vendor",
  "target",
  "__pycache__",
  ".kova/tmp"
]);
var MANIFESTS = {
  "package.json": { language: "javascript", confidence: 0.85 },
  "tsconfig.json": { language: "typescript", confidence: 0.9 },
  "go.mod": { language: "go", confidence: 0.98 },
  "pyproject.toml": { language: "python", confidence: 0.95 },
  "requirements.txt": { language: "python", confidence: 0.8 },
  "Cargo.toml": { language: "rust", confidence: 0.98 },
  "pom.xml": { language: "java", confidence: 0.95 },
  "build.gradle": { language: "java", confidence: 0.85 },
  "build.gradle.kts": { language: "kotlin", confidence: 0.9 },
  "composer.json": { language: "php", confidence: 0.95 },
  "Gemfile": { language: "ruby", confidence: 0.95 },
  "Package.swift": { language: "swift", confidence: 0.95 },
  "pubspec.yaml": { language: "dart", confidence: 0.95 },
  "CMakeLists.txt": { language: "cpp", confidence: 0.8 }
};
var LOCKFILES = {
  "pnpm-lock.yaml": "pnpm",
  "package-lock.json": "npm",
  "yarn.lock": "yarn",
  "bun.lockb": "bun",
  "uv.lock": "uv",
  "poetry.lock": "poetry",
  "Cargo.lock": "cargo",
  "go.sum": "go",
  "composer.lock": "composer",
  "Gemfile.lock": "bundler"
};
var EXT_LANG = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".go": "go",
  ".py": "python",
  ".rs": "rust",
  ".java": "java",
  ".kt": "kotlin",
  ".cs": "csharp",
  ".php": "php",
  ".rb": "ruby",
  ".swift": "swift",
  ".dart": "dart",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".c": "c"
};
var CI_FILES = [
  ".gitlab-ci.yml",
  "azure-pipelines.yml",
  "Jenkinsfile",
  ".circleci/config.yml"
];
var CONTAINER_FILES = [
  "Dockerfile",
  "Containerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "compose.yml",
  "compose.yaml"
];
var TASK_RUNNER_FILES = [
  "Makefile",
  "Taskfile.yml",
  "Taskfile.yaml",
  "justfile"
];
function findProjectRoot(startDir) {
  let current = resolve(startDir);
  while (true) {
    if (ROOT_MARKERS.some((marker) => existsSync(join(current, marker)))) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(startDir);
    current = parent;
  }
}
function buildProjectProfile(projectRoot) {
  const root = resolve(projectRoot);
  const files = listProjectFiles(root);
  const signals = collectSignals(root, files);
  const languages = rankDetectedItems(signals.filter((s) => s.stackHint !== "container"), "language");
  const packageManagers = detectPackageManagers(files);
  const frameworks = detectFrameworks(root, files);
  const rootCommands = detectCommands(root, files);
  const workspaces = detectWorkspaces(root, files);
  const commands = mergeWorkspaceCommands(rootCommands, workspaces);
  const ci = detectFileReferences(files, "ci");
  const containers = detectFileReferences(files, "container");
  const taskRunners = detectFileReferences(files, "task_runner");
  const instructionFiles = detectFileReferences(files, "instruction");
  const sensitiveFiles = detectFileReferences(files, "sensitive");
  const validations = detectValidations(commands, workspaces);
  return {
    root,
    languages,
    frameworks,
    packageManagers,
    workspaces,
    buildCommands: commands.build,
    testCommands: commands.test,
    lintCommands: commands.lint,
    typecheckCommands: commands.typecheck,
    validations,
    ci,
    containers,
    taskRunners,
    instructionFiles,
    sensitiveFiles,
    risks: detectRisks(files, languages, commands, validations, sensitiveFiles),
    entrypoints: detectEntrypoints(files),
    architectureHints: detectArchitectureHints(files),
    signals,
    confidence: calculateConfidence(signals, commands)
  };
}
function loadProjectInstructions(projectRoot) {
  const root = resolve(projectRoot);
  const files = [];
  const add = (path, priority) => {
    const fullPath = join(root, path);
    if (!existsSync(fullPath)) return;
    try {
      files.push({ path, priority, content: readFileSync(fullPath, "utf-8") });
    } catch {
    }
  };
  add("KOVA.md", 100);
  add("AGENTS.md", 90);
  add("CLAUDE.md", 80);
  add("RULES.md", 70);
  const rulesDir = join(root, ".kova", "rules");
  if (existsSync(rulesDir)) {
    for (const file of listMarkdownFiles(rulesDir)) {
      const rel = `.kova/rules/${file}`;
      add(rel, 60);
    }
  }
  return files.sort((a, b) => b.priority - a.priority);
}
function loadHarnessProjectConfig(projectRoot) {
  const filePath = join(projectRoot, ".kova", "harness.json");
  if (!existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf-8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function listProjectFiles(root) {
  const out = [];
  walk(root, "", out, 0);
  return out;
}
function walk(root, relDir, out, depth) {
  if (depth > 6) return;
  const dir = join(root, relDir);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const rel = relDir ? `${relDir}/${entry}` : entry;
    if (SKIP_DIRS.has(entry) || SKIP_DIRS.has(rel)) continue;
    const full = join(root, rel);
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) walk(root, rel, out, depth + 1);
      else out.push(rel.replace(/\\/g, "/"));
    } catch {
    }
  }
}
function collectSignals(root, files) {
  const signals = [];
  for (const file of files) {
    const base = basename(file);
    const manifest = MANIFESTS[base];
    if (manifest) {
      signals.push({ kind: "manifest", path: file, stackHint: manifest.language, confidence: manifest.confidence });
    }
    if (base.endsWith(".csproj") || base.endsWith(".sln")) {
      signals.push({ kind: "manifest", path: file, stackHint: "csharp", confidence: 0.92 });
    }
    const lock = LOCKFILES[base];
    if (lock) {
      signals.push({ kind: "lockfile", path: file, stackHint: lock, confidence: 0.85 });
    }
    if (base === "Dockerfile" || base === "docker-compose.yml" || base === "docker-compose.yaml") {
      signals.push({ kind: "config", path: file, stackHint: "container", confidence: 0.75 });
    }
    if (base === "Makefile" || base === "Taskfile.yml" || base === "justfile") {
      signals.push({ kind: "task_runner", path: file, stackHint: base.toLowerCase(), confidence: 0.8 });
    }
    const ext = extensionOf(file);
    const lang = EXT_LANG[ext];
    if (lang && isSourceCandidate(root, file)) {
      signals.push({ kind: "source_file", path: file, stackHint: lang, confidence: 0.45 });
    }
  }
  return signals;
}
function rankDetectedItems(signals, sourcePrefix) {
  const scores = /* @__PURE__ */ new Map();
  for (const signal of signals) {
    const existing = scores.get(signal.stackHint) ?? { score: 0, source: signal.path };
    existing.score += signal.confidence;
    if (signal.kind === "manifest") existing.source = signal.path;
    scores.set(signal.stackHint, existing);
  }
  return [...scores.entries()].map(([name, item]) => ({
    name,
    source: `${sourcePrefix}:${item.source}`,
    confidence: Math.min(0.99, Number((item.score / 2).toFixed(2)))
  })).filter((item) => item.confidence >= 0.2).sort((a, b) => b.confidence - a.confidence);
}
function detectPackageManagers(files) {
  const items = [];
  for (const [file, name] of Object.entries(LOCKFILES)) {
    if (files.includes(file)) items.push({ name, confidence: 0.95, source: file });
  }
  if (files.includes("package.json") && !items.some((i) => ["npm", "pnpm", "yarn", "bun"].includes(i.name))) {
    items.push({ name: "npm", confidence: 0.55, source: "package.json" });
  }
  return items.sort((a, b) => b.confidence - a.confidence);
}
function detectFrameworks(root, files) {
  const pkg = readPackageJson(root);
  const deps = { ...pkg?.dependencies ?? {}, ...pkg?.devDependencies ?? {} };
  const known = {
    react: "react",
    next: "next",
    vue: "vue",
    svelte: "svelte",
    express: "express",
    fastify: "fastify",
    "@nestjs/core": "nestjs",
    django: "django",
    flask: "flask",
    laravel: "laravel",
    rails: "rails"
  };
  const items = [];
  for (const [dep, name] of Object.entries(known)) {
    if (dep in deps) items.push({ name, confidence: 0.9, source: "package.json" });
  }
  if (files.includes("manage.py")) items.push({ name: "django", confidence: 0.85, source: "manage.py" });
  if (files.includes("artisan")) items.push({ name: "laravel", confidence: 0.85, source: "artisan" });
  if (files.includes("config/routes.rb")) items.push({ name: "rails", confidence: 0.85, source: "config/routes.rb" });
  return dedupeDetected(items);
}
function detectWorkspaces(root, files) {
  const rootPkg = readPackageJson(root);
  const rootDeclaresWorkspaces = Boolean(rootPkg?.workspaces) || files.includes("pnpm-workspace.yaml");
  const manifests = files.filter((file) => {
    const base = basename(file);
    return dirname(file) !== "." && (base in MANIFESTS || base.endsWith(".csproj") || base.endsWith(".sln"));
  });
  const byPath = /* @__PURE__ */ new Map();
  for (const manifest of manifests) {
    const dir = dirname(manifest).replace(/\\/g, "/");
    const list = byPath.get(dir) ?? [];
    list.push(manifest);
    byPath.set(dir, list);
  }
  return [...byPath.entries()].map(([path]) => {
    const scopedFiles = files.filter((file) => file.startsWith(`${path}/`)).map((file) => file.slice(path.length + 1));
    const scopedSignals = collectSignals(join(root, path), scopedFiles);
    const pkg = readPackageJson(root, path);
    const commands = detectCommands(root, files, path);
    return {
      name: pkg?.name ?? path,
      path,
      kind: rootDeclaresWorkspaces ? "workspace" : "module",
      languages: rankDetectedItems(scopedSignals.filter((s) => s.stackHint !== "container"), "language"),
      frameworks: detectFrameworks(join(root, path), scopedFiles),
      packageManagers: detectPackageManagers(scopedFiles).length > 0 ? detectPackageManagers(scopedFiles) : detectPackageManagers(files),
      buildCommands: commands.build,
      testCommands: commands.test,
      lintCommands: commands.lint,
      typecheckCommands: commands.typecheck,
      confidence: calculateConfidence(scopedSignals, commands)
    };
  }).filter((workspace) => workspace.confidence >= 0.2 || workspace.buildCommands.length + workspace.testCommands.length > 0).sort((a, b) => b.confidence - a.confidence);
}
function mergeWorkspaceCommands(rootCommands, workspaces) {
  const merged = {
    build: [...rootCommands.build],
    test: [...rootCommands.test],
    lint: [...rootCommands.lint],
    typecheck: [...rootCommands.typecheck]
  };
  for (const workspace of workspaces) {
    merged.build.push(...workspace.buildCommands);
    merged.test.push(...workspace.testCommands);
    merged.lint.push(...workspace.lintCommands);
    merged.typecheck.push(...workspace.typecheckCommands);
  }
  return {
    build: dedupeCommands(merged.build),
    test: dedupeCommands(merged.test),
    lint: dedupeCommands(merged.lint),
    typecheck: dedupeCommands(merged.typecheck)
  };
}
function detectCommands(root, files, scope = "") {
  const build = [];
  const test = [];
  const lint = [];
  const typecheck = [];
  const scopedFiles = scope ? files.filter((file) => file.startsWith(`${scope}/`)).map((file) => file.slice(scope.length + 1)) : files;
  const add = (bucket, command, source, confidence) => {
    if (!bucket.some((item) => item.command === command && item.scope === (scope || void 0))) {
      bucket.push({ command, source, confidence, safeToRun: isSafeCommand(command), ...scope ? { scope } : {} });
    }
  };
  const pkg = readPackageJson(root, scope);
  if (pkg?.scripts) {
    const runner = detectNodeRunner(files, scope);
    const source = scope ? "workspace_manifest" : "manifest";
    if (pkg.scripts.build) add(build, nodeRunCommand(runner, "build", scope), source, 0.95);
    if (pkg.scripts.test) add(test, nodeRunCommand(runner, "test", scope), source, 0.95);
    if (pkg.scripts.lint) add(lint, nodeRunCommand(runner, "lint", scope), source, 0.95);
    if (pkg.scripts.typecheck) add(typecheck, nodeRunCommand(runner, "typecheck", scope), source, 0.95);
    if (pkg.scripts.check) add(typecheck, nodeRunCommand(runner, "check", scope), source, 0.8);
  }
  if (scopedFiles.includes("go.mod")) {
    add(build, "go build ./...", "adapter_default", 0.82);
    add(test, "go test ./...", "adapter_default", 0.85);
    add(lint, "go vet ./...", "adapter_default", 0.7);
  }
  if (scopedFiles.includes("Cargo.toml")) {
    add(build, "cargo build", "adapter_default", 0.82);
    add(test, "cargo test", "adapter_default", 0.85);
    add(typecheck, "cargo check", "adapter_default", 0.8);
    add(lint, "cargo clippy -- -D warnings", "adapter_default", 0.65);
  }
  if (scopedFiles.includes("pyproject.toml") || scopedFiles.includes("requirements.txt")) {
    add(test, "pytest", "adapter_default", 0.75);
    add(lint, "ruff check .", "adapter_default", 0.65);
  }
  if (scopedFiles.includes("pom.xml")) {
    add(build, "mvn compile -q", "adapter_default", 0.8);
    add(test, "mvn test -q", "adapter_default", 0.82);
  }
  if (scopedFiles.includes("build.gradle") || scopedFiles.includes("build.gradle.kts")) {
    add(build, "./gradlew build", "adapter_default", 0.8);
    add(test, "./gradlew test", "adapter_default", 0.82);
  }
  if (scopedFiles.some((file) => file.endsWith(".csproj"))) {
    add(build, "dotnet build", "adapter_default", 0.8);
    add(test, "dotnet test", "adapter_default", 0.82);
  }
  if (scopedFiles.includes("Makefile")) {
    add(build, "make build", "makefile", 0.75);
    add(test, "make test", "makefile", 0.75);
    add(lint, "make lint", "makefile", 0.65);
  }
  return { build, test, lint, typecheck };
}
function detectFileReferences(files, kind) {
  return files.filter((file) => {
    const base = basename(file);
    if (kind === "ci") return CI_FILES.includes(file) || /^\.github\/workflows\/.+\.ya?ml$/.test(file);
    if (kind === "container") return CONTAINER_FILES.includes(base) || CONTAINER_FILES.includes(file);
    if (kind === "task_runner") return TASK_RUNNER_FILES.includes(base);
    if (kind === "instruction") return isInstructionFile(file);
    return isSensitiveProjectFile(file);
  }).sort().map((path) => ({ path, kind, confidence: kind === "sensitive" ? 0.95 : 0.85 }));
}
function detectValidations(commands, workspaces) {
  const validations = [];
  const add = (kind, command) => {
    validations.push({
      kind,
      command: command.command,
      source: command.source,
      confidence: command.confidence,
      safeToRun: command.safeToRun,
      scope: command.scope ?? "root",
      available: true
    });
  };
  for (const command of commands.build) add("build", command);
  for (const command of commands.test) add("test", command);
  for (const command of commands.lint) add("lint", command);
  for (const command of commands.typecheck) add("typecheck", command);
  if (workspaces.length > 0 && validations.length === 0) {
    validations.push({
      kind: "architecture",
      source: "config",
      confidence: 0.4,
      safeToRun: true,
      scope: "root",
      available: false
    });
  }
  return validations;
}
function detectRisks(files, languages, commands, validations, sensitiveFiles) {
  const risks = [];
  if (sensitiveFiles.length > 0) {
    risks.push({
      kind: "sensitive_files",
      severity: "high",
      message: "Sensitive-looking files exist and must not be attached to model context or edited automatically.",
      evidence: sensitiveFiles.map((file) => file.path)
    });
  }
  if (validations.filter((item) => item.available).length === 0) {
    risks.push({
      kind: "no_validation",
      severity: "medium",
      message: "No deterministic build, test, lint, or typecheck command was detected.",
      evidence: []
    });
  } else if (commands.test.length === 0 || commands.build.length === 0) {
    risks.push({
      kind: "partial_validation",
      severity: "medium",
      message: "Only partial validation commands were detected; auto-apply should require review.",
      evidence: validations.map((item) => item.command).filter((command) => Boolean(command))
    });
  }
  const unsafe = [...commands.build, ...commands.test, ...commands.lint, ...commands.typecheck].filter((command) => !command.safeToRun);
  if (unsafe.length > 0) {
    risks.push({
      kind: "unsafe_command",
      severity: "high",
      message: "Some detected commands require approval before running.",
      evidence: unsafe.map((command) => command.command)
    });
  }
  if (languages.length > 1) {
    risks.push({
      kind: "multi_stack",
      severity: "low",
      message: "Multiple languages were detected; validation and context should stay scoped to the affected area.",
      evidence: languages.map((item) => `${item.name}:${item.source}`)
    });
  }
  if (files.length > 1e3) {
    risks.push({
      kind: "large_project",
      severity: "medium",
      message: "Large project detected; avoid broad context loading and validate by module first.",
      evidence: [`${files.length} scanned files`]
    });
  }
  return risks;
}
function detectEntrypoints(files) {
  return files.filter((file) => [
    "src/main.ts",
    "src/index.ts",
    "index.ts",
    "main.py",
    "app.py",
    "cmd/api/main.go",
    "cmd/server/main.go",
    "src/main.rs",
    "Program.cs"
  ].includes(file) || /(^|\/)main\.(go|rs|java|kt|swift|dart)$/.test(file)).slice(0, 12);
}
function detectArchitectureHints(files) {
  const hints = [];
  for (const dir of ["apps", "packages", "src", "internal", "pkg", "cmd", "tests", "docs"]) {
    if (files.some((file) => file.startsWith(`${dir}/`))) hints.push(`${dir}/*`);
  }
  return hints;
}
function calculateConfidence(signals, commands) {
  const manifestStrength = Math.min(0.7, signals.filter((s) => s.kind === "manifest").reduce((sum, s) => sum + s.confidence, 0) / 4);
  const commandStrength = [commands.build, commands.test, commands.lint].filter((items) => items.length > 0).length * 0.08;
  const sourceStrength = signals.some((s) => s.kind === "source_file") ? 0.1 : 0;
  return Math.min(0.99, Number((manifestStrength + commandStrength + sourceStrength).toFixed(2)));
}
function readPackageJson(root, scope = "") {
  const path = join(root, scope, "package.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}
function detectNodeRunner(files, scope = "") {
  const scoped = (file) => scope ? `${scope}/${file}` : file;
  if (files.includes(scoped("pnpm-lock.yaml")) || files.includes("pnpm-lock.yaml")) return "pnpm";
  if (files.includes(scoped("yarn.lock")) || files.includes("yarn.lock")) return "yarn";
  if (files.includes(scoped("bun.lockb")) || files.includes("bun.lockb")) return "bun";
  return "npm";
}
function nodeRunCommand(runner, script, scope = "") {
  if (!scope) return `${runner} run ${script}`;
  if (runner === "npm") return `npm --prefix ${scope} run ${script}`;
  if (runner === "yarn") return `yarn --cwd ${scope} run ${script}`;
  return `${runner} --dir ${scope} run ${script}`;
}
function dedupeCommands(commands) {
  const map = /* @__PURE__ */ new Map();
  for (const command of commands) {
    const key = `${command.scope ?? "root"}:${command.command}`;
    const existing = map.get(key);
    if (!existing || command.confidence > existing.confidence) map.set(key, command);
  }
  return [...map.values()].sort((a, b) => b.confidence - a.confidence);
}
function isInstructionFile(file) {
  const base = basename(file);
  return ["KOVA.md", "AGENTS.md", "CLAUDE.md", "RULES.md"].includes(base) || /^\.kova\/rules\/.+\.md$/.test(file);
}
function isSensitiveProjectFile(file) {
  const base = basename(file).toLowerCase();
  if (base === ".env.example") return false;
  return base === ".env" || base.startsWith(".env.") || base.endsWith(".env") || base.includes(".env.") || base.endsWith(".pem") || base.endsWith(".key") || base.endsWith(".p12") || base === "id_rsa" || base === "id_dsa" || base.includes("secret") || base.includes("kubeconfig");
}
function listMarkdownFiles(dir) {
  try {
    return readdirSync(dir).filter((file) => file.endsWith(".md")).sort();
  } catch {
    return [];
  }
}
function isSourceCandidate(root, file) {
  try {
    return statSync(join(root, file)).size <= 2e5;
  } catch {
    return false;
  }
}
function extensionOf(file) {
  const name = basename(file);
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(index) : "";
}
function dedupeDetected(items) {
  const map = /* @__PURE__ */ new Map();
  for (const item of items) {
    const existing = map.get(item.name);
    if (!existing || item.confidence > existing.confidence) map.set(item.name, item);
  }
  return [...map.values()].sort((a, b) => b.confidence - a.confidence);
}
function isSafeCommand(command) {
  const text = command.toLowerCase();
  return ![
    "rm -rf",
    "sudo ",
    "git push",
    "git reset --hard",
    "git clean -f",
    "curl |",
    "wget |",
    "npm publish",
    "pnpm publish",
    "docker system prune"
  ].some((blocked) => text.includes(blocked));
}
export {
  buildProjectProfile,
  findProjectRoot,
  loadHarnessProjectConfig,
  loadProjectInstructions
};
