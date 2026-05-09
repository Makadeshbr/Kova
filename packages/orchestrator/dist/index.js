"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  HarnessOrchestrator: () => HarnessOrchestrator,
  createOrchestratorConfig: () => createOrchestratorConfig,
  detectContext: () => detectContext
});
module.exports = __toCommonJS(index_exports);

// src/orchestrator.ts
var import_node_fs = require("fs");
var import_node_path2 = require("path");
var import_harness = require("@kova/harness");
var import_adapters = require("@kova/adapters");
var import_project = require("@kova/project");

// src/context-detector.ts
var import_node_path = require("path");
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
  const base = (0, import_node_path.basename)(path);
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
        (0, import_node_fs.unlinkSync)((0, import_node_path2.join)(projectRoot, change.path));
      } catch {
      }
      continue;
    }
    if (!change.diff) continue;
    const fullPath = (0, import_node_path2.join)(projectRoot, change.path);
    (0, import_node_fs.mkdirSync)((0, import_node_path2.dirname)(fullPath), { recursive: true });
    (0, import_node_fs.writeFileSync)(fullPath, change.diff, "utf-8");
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
    const harnessResult = await (0, import_harness.runPipeline)(layers, pipelineConfig);
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
      run: () => (0, import_harness.runBuildLayer)({ command: buildCommand, projectRoot })
    };
    const typecheck = {
      name: "typecheck",
      hardFail: false,
      run: () => (0, import_harness.runTypecheckLayer)({ command: typecheckCommand, projectRoot })
    };
    const tests = {
      name: "tests",
      hardFail: false,
      run: () => (0, import_harness.runTestsLayer)({ command: testCommand, projectRoot })
    };
    const rules = {
      name: "rules",
      hardFail: false,
      run: () => (0, import_harness.runRulesLayer)({ changes, projectRoot, adapter }, "")
    };
    const security = {
      name: "security",
      hardFail: false,
      run: () => (0, import_harness.runSecurityLayer)({ changes, projectRoot })
    };
    const lint = {
      name: "lint",
      hardFail: false,
      run: () => (0, import_harness.runLintLayer)({ command: lintCommand, projectRoot })
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
  const profile = (0, import_project.buildProjectProfile)(projectRoot);
  let adapter = profile.confidence > 0 ? (0, import_adapters.adapterFromProjectProfile)(profile) : (0, import_adapters.detectStack)(projectRoot);
  if (adapter.name === "generic" && generatedPaths.length > 0) {
    const fromGenerated = (0, import_adapters.detectStackFromChanges)(generatedPaths);
    if (fromGenerated) adapter = fromGenerated;
  }
  const commands = (0, import_adapters.resolveCommands)(adapter, projectRoot);
  const harnessConfig = (0, import_project.loadHarnessProjectConfig)(projectRoot);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HarnessOrchestrator,
  createOrchestratorConfig,
  detectContext
});
