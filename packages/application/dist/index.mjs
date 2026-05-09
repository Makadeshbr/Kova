// src/application-engine.ts
import { existsSync as existsSync2, readFileSync as readFileSync2, writeFileSync as writeFileSync2, mkdirSync as mkdirSync2, unlinkSync } from "fs";
import { join as join2, dirname as dirname2 } from "path";

// src/checkpoint.ts
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from "fs";
import { join, dirname } from "path";
function createCheckpoint(params) {
  const { taskId, files, projectRoot, harnessScore = 0 } = params;
  const id = generateId();
  const checkpointDir = join(projectRoot, ".kova", "checkpoints", id);
  mkdirSync(checkpointDir, { recursive: true });
  for (const relPath of files) {
    const srcPath = join(projectRoot, relPath);
    if (!existsSync(srcPath)) continue;
    const destPath = join(checkpointDir, "files", relPath);
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, readFileSync(srcPath));
  }
  const meta = { id, taskId, timestamp: (/* @__PURE__ */ new Date()).toISOString(), harnessScore, files };
  writeFileSync(join(checkpointDir, "meta.json"), JSON.stringify(meta, null, 2));
  return meta;
}
function restoreCheckpoint(id, projectRoot) {
  const checkpointDir = join(projectRoot, ".kova", "checkpoints", id);
  const metaPath = join(checkpointDir, "meta.json");
  if (!existsSync(metaPath)) {
    throw new Error(`Checkpoint ${id} n\xE3o encontrado em ${projectRoot}`);
  }
  const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
  for (const relPath of meta.files) {
    const srcPath = join(checkpointDir, "files", relPath);
    if (!existsSync(srcPath)) continue;
    const destPath = join(projectRoot, relPath);
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, readFileSync(srcPath));
  }
}
function listCheckpoints(projectRoot) {
  const dir = join(projectRoot, ".kova", "checkpoints");
  if (!existsSync(dir)) return [];
  const results = [];
  for (const id of readdirSync(dir)) {
    const metaPath = join(dir, id, "meta.json");
    if (!existsSync(metaPath)) continue;
    try {
      results.push(JSON.parse(readFileSync(metaPath, "utf-8")));
    } catch (error) {
      throw new Error(`meta.json corrompido no checkpoint ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
function deleteCheckpoint(id, projectRoot) {
  const checkpointDir = join(projectRoot, ".kova", "checkpoints", id);
  if (existsSync(checkpointDir)) rmSync(checkpointDir, { recursive: true });
}
function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// src/safe-zones.ts
var DEFAULT_PATTERNS = [
  // Secrets — never touch
  ".env",
  ".env.*",
  "*.pem",
  "*.key",
  "*.cert",
  "*.p12",
  "*.pfx",
  // Lock files — managed by package managers, not by hand
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "Cargo.lock",
  "poetry.lock",
  "Gemfile.lock",
  "composer.lock",
  "go.sum",
  // CI/CD pipelines — high-risk changes
  ".github/**"
];
function isSafeZone(filePath, config) {
  const patterns = config?.patterns ?? DEFAULT_PATTERNS;
  const normalized = filePath.replace(/\\/g, "/");
  return patterns.some((pattern) => matchGlob(normalized, pattern));
}
function matchGlob(filePath, pattern) {
  if (filePath === pattern) return true;
  const regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\0").replace(/\*/g, "[^/]+").replace(/\x00/g, ".+");
  try {
    return new RegExp(`^${regexStr}$`).test(filePath);
  } catch {
    return false;
  }
}

// src/git-helper.ts
import { execSync } from "child_process";
var GitHelper = class {
  constructor(cwd) {
    this.cwd = cwd;
  }
  isGitRepo() {
    try {
      execSync("git rev-parse --is-inside-work-tree", { cwd: this.cwd, stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
  commit(files, taskId, score) {
    if (!this.isGitRepo()) return null;
    try {
      for (const file of files) {
        execSync(`git add "${file}"`, { cwd: this.cwd, stdio: "ignore" });
      }
      const msg = `Kova: Task ${taskId}

Harness score: ${score}`;
      execSync(`git commit -m "${msg}"`, { cwd: this.cwd, stdio: "ignore" });
      return execSync("git rev-parse HEAD", { cwd: this.cwd }).toString().trim();
    } catch (error) {
      console.warn("[GitHelper] Falha ao fazer commit:", error);
      return null;
    }
  }
  revert(hash) {
    if (!this.isGitRepo()) return false;
    try {
      execSync(`git revert --no-edit ${hash}`, { cwd: this.cwd, stdio: "ignore" });
      return true;
    } catch (error) {
      console.warn(`[GitHelper] Falha ao reverter commit ${hash}:`, error);
      return false;
    }
  }
};

// src/application-engine.ts
var CodeApplicationEngine = class {
  constructor(projectRoot, safeZoneConfig) {
    this.projectRoot = projectRoot;
    this.safeZoneConfig = safeZoneConfig;
  }
  preview(changes) {
    return changes.map((c) => formatChangePreview(c)).join("\n\n---\n\n");
  }
  async apply(changes, taskId, harnessScore = 0) {
    const safeFile = changes.find((c) => c.type !== "create" && isSafeZone(c.path, this.safeZoneConfig));
    if (safeFile) {
      return {
        applied: false,
        patches: [],
        checkpointId: "",
        reason: `human_required: ${safeFile.path} \xE9 safe zone`
      };
    }
    const externalChange = detectExternalChange(changes, this.projectRoot);
    if (externalChange) {
      return {
        applied: false,
        patches: [],
        checkpointId: "",
        reason: `human_required: ${externalChange} modificado externamente`
      };
    }
    const meta = createCheckpoint({
      taskId,
      files: changes.map((c) => c.path),
      projectRoot: this.projectRoot,
      harnessScore
    });
    try {
      const patches = writeChanges(changes, this.projectRoot, taskId);
      const git = new GitHelper(this.projectRoot);
      const gitHash = git.commit(changes.map((c) => c.path), taskId, harnessScore);
      const checkpointId = gitHash ? `git:${gitHash}` : `kova:${meta.id}`;
      return { applied: true, patches, checkpointId };
    } catch (error) {
      restoreCheckpoint(meta.id, this.projectRoot);
      throw new Error(`Apply falhou e foi revertido: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async rollback(checkpointId) {
    if (checkpointId.startsWith("git:")) {
      const hash = checkpointId.replace("git:", "");
      const git = new GitHelper(this.projectRoot);
      if (!git.revert(hash)) {
        throw new Error(`Falha ao reverter commit ${hash}`);
      }
    } else {
      const id = checkpointId.replace("kova:", "");
      restoreCheckpoint(id, this.projectRoot);
    }
  }
};
function detectExternalChange(changes, projectRoot) {
  for (const change of changes) {
    if (change.type === "create" || change.before === void 0) continue;
    const fullPath = join2(projectRoot, change.path);
    if (!existsSync2(fullPath)) continue;
    const current = readFileSync2(fullPath, "utf-8");
    if (current === change.diff || current === change.before) continue;
    return change.path;
  }
  return null;
}
function writeChanges(changes, projectRoot, taskId) {
  const patches = [];
  for (const change of changes) {
    const fullPath = join2(projectRoot, change.path);
    if (change.type === "delete") {
      if (existsSync2(fullPath)) unlinkSync(fullPath);
    } else {
      mkdirSync2(dirname2(fullPath), { recursive: true });
      writeFileSync2(fullPath, change.diff, "utf-8");
    }
    patches.push({
      taskId,
      file: change.path,
      diff: change.diff,
      appliedAt: (/* @__PURE__ */ new Date()).toISOString(),
      rolledBack: false
    });
  }
  return patches;
}
function formatChangePreview(change) {
  const header = `[${change.type.toUpperCase()}] ${change.path}`;
  if (change.type === "delete") return `${header}
(arquivo ser\xE1 deletado)`;
  if (!change.before) return `${header}
${change.diff}`;
  const diff = [
    `--- a/${change.path}`,
    `+++ b/${change.path}`,
    ...change.before.split("\n").map((l) => `- ${l}`),
    ...change.diff.split("\n").map((l) => `+ ${l}`)
  ];
  return `${header}
${diff.join("\n")}`;
}
export {
  CodeApplicationEngine,
  createCheckpoint,
  deleteCheckpoint,
  isSafeZone,
  listCheckpoints,
  restoreCheckpoint
};
