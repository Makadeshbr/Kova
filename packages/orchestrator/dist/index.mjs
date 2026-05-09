// src/orchestrator.ts
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import {
  runBuildLayer,
  runTestsLayer,
  runRulesLayer,
  runSecurityLayer,
  runLintLayer,
  runTypecheckLayer,
  runPipeline
} from "@kova/harness";
import { adapterFromProjectProfile, detectStack, detectStackFromChanges, resolveCommands } from "@kova/adapters";
import { buildProjectProfile, loadHarnessProjectConfig } from "@kova/project";

// src/context-detector.ts
import { basename } from "path";
var LOGIC = {
  fileType: "logic",
  functionSizeLimit: 40,
  fileSizeLimit: 200,
  nestingLimit: 2,
  cyclomaticLimit: 10,
  enforceNaming: true
};
var UI = {
  fileType: "ui",
  functionSizeLimit: 80,
  fileSizeLimit: 400,
  nestingLimit: 4,
  cyclomaticLimit: 15,
  enforceNaming: false
};
var TEST = {
  fileType: "test",
  functionSizeLimit: 60,
  fileSizeLimit: 300,
  nestingLimit: 3,
  cyclomaticLimit: 8,
  enforceNaming: false
};
var CONFIG = {
  fileType: "config",
  functionSizeLimit: 100,
  fileSizeLimit: 500,
  nestingLimit: 5,
  cyclomaticLimit: 20,
  enforceNaming: false
};
function detectContext(filePath) {
  if (isTestFile(filePath)) return TEST;
  if (isConfigFile(filePath)) return CONFIG;
  if (isUIFile(filePath)) return UI;
  return LOGIC;
}
function isTestFile(path) {
  return /\.(test|spec)\.[tj]sx?$/.test(path) || /__tests__[/\\]/.test(path);
}
function isConfigFile(path) {
  const base = basename(path);
  return /\.(config)\.[cm]?[tj]sx?$/.test(path) || /^\.env/.test(base) || base === "package.json" || base === "tsconfig.json";
}
function isUIFile(path) {
  return /\.(tsx|jsx|vue|css|scss|less|html)$/.test(path);
}

// src/orchestrator.ts
function writeChangesToDisk(changes, projectRoot) {
  for (const change of changes) {
    if (change.type === "delete") {
      try {
        unlinkSync(join(projectRoot, change.path));
      } catch {
      }
      continue;
    }
    if (!change.diff) continue;
    const fullPath = join(projectRoot, change.path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, change.diff, "utf-8");
  }
}
var HarnessOrchestrator = class {
  scoreHistory = [];
  async run(changes, config, explicitMode) {
    const mode = this.determineMode(changes, explicitMode);
    const layers = this.buildLayers(changes, config, mode);
    const pipelineConfig = {
      projectRoot: config.projectRoot,
      iteration: config.iteration
    };
    writeChangesToDisk(changes, config.projectRoot);
    const harnessResult = await runPipeline(layers, pipelineConfig);
    this.scoreHistory.push(harnessResult.score);
    return {
      harnessResult,
      scratchpadFallback: this.isScratchpadNeeded(),
      mode
    };
  }
  reset() {
    this.scoreHistory = [];
  }
  determineMode(changes, explicit) {
    if (explicit) return explicit;
    if (changes.length > 5) return "full";
    const allNonCore = changes.every((c) => {
      const profile = detectContext(c.path);
      return profile.fileType === "test" || profile.fileType === "config";
    });
    return allNonCore ? "fast" : "standard";
  }
  isScratchpadNeeded() {
    if (this.scoreHistory.length < 3) return false;
    const [a, b, c] = this.scoreHistory.slice(-3);
    return c <= b && b <= a;
  }
  buildLayers(changes, config, mode) {
    const { projectRoot, adapter, buildCommand, testCommand, lintCommand, typecheckCommand } = config;
    const build = {
      name: "build",
      hardFail: true,
      run: () => runBuildLayer({ command: buildCommand, projectRoot })
    };
    const typecheck = {
      name: "typecheck",
      hardFail: false,
      run: () => runTypecheckLayer({ command: typecheckCommand, projectRoot })
    };
    const tests = {
      name: "tests",
      hardFail: false,
      run: () => runTestsLayer({ command: testCommand, projectRoot })
    };
    const rules = {
      name: "rules",
      hardFail: false,
      run: () => runRulesLayer({ changes, projectRoot, adapter }, "")
    };
    const security = {
      name: "security",
      hardFail: false,
      run: () => runSecurityLayer({ changes, projectRoot })
    };
    const lint = {
      name: "lint",
      hardFail: false,
      run: () => runLintLayer({ command: lintCommand, projectRoot })
    };
    switch (mode) {
      case "fast":
        return [rules, lint];
      case "standard":
        return [build, typecheck, tests, rules];
      case "full":
        return [build, typecheck, tests, rules, security, lint];
    }
  }
};
function createOrchestratorConfig(projectRoot, iteration = 1, generatedPaths = []) {
  const profile = buildProjectProfile(projectRoot);
  let adapter = profile.confidence > 0 ? adapterFromProjectProfile(profile) : detectStack(projectRoot);
  if (adapter.name === "generic" && generatedPaths.length > 0) {
    const fromGenerated = detectStackFromChanges(generatedPaths);
    if (fromGenerated) adapter = fromGenerated;
  }
  const commands = resolveCommands(adapter, projectRoot);
  const harnessConfig = loadHarnessProjectConfig(projectRoot);
  const resolved = resolveConfiguredCommands(commands, profile, harnessConfig);
  return {
    projectRoot,
    adapter: adapter.name,
    buildCommand: resolved.build,
    testCommand: resolved.test,
    lintCommand: resolved.lint,
    typecheckCommand: resolved.typecheck,
    iteration,
    profileConfidence: profile.confidence
  };
}
function resolveConfiguredCommands(fallback, profile, config) {
  return {
    build: pickCommand(config?.validation?.build, profile.buildCommands, fallback.build),
    test: pickCommand(config?.validation?.test, profile.testCommands, fallback.test),
    lint: pickCommand(config?.validation?.lint, profile.lintCommands, fallback.lint),
    format: fallback.format,
    typecheck: pickCommand(void 0, profile.typecheckCommands, "")
  };
}
function pickCommand(configured, candidates, fallback) {
  if (Array.isArray(configured)) return configured.find((command) => command.trim()) ?? "";
  const candidate = candidates.find((item) => item.safeToRun);
  return candidate?.command ?? fallback;
}
export {
  HarnessOrchestrator,
  createOrchestratorConfig,
  detectContext
};
