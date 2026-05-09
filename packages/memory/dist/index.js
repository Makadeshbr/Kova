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
  MemorySystem: () => MemorySystem,
  classifyLearning: () => classifyLearning,
  promoteLearnings: () => promoteLearnings,
  pruneLearnings: () => pruneLearnings,
  readLearnings: () => readLearnings,
  writeLearnings: () => writeLearnings
});
module.exports = __toCommonJS(index_exports);

// src/storage.ts
var import_node_fs = require("fs");
var import_node_path = require("path");
var import_node_os = require("os");
function resolvePath(scope, projectRoot) {
  if (scope === "global") return (0, import_node_path.join)((0, import_node_os.homedir)(), ".kova", "global", "learnings.json");
  if (!projectRoot) throw new Error("projectRoot obrigat\xF3rio para scope project");
  return (0, import_node_path.join)(projectRoot, ".kova", "memory", "learnings.json");
}
function readLearnings(scope, projectRoot) {
  const filePath = resolvePath(scope, projectRoot);
  if (!(0, import_node_fs.existsSync)(filePath)) return [];
  try {
    return JSON.parse((0, import_node_fs.readFileSync)(filePath, "utf-8"));
  } catch (error) {
    throw new Error(`Falha ao ler learnings de ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function writeLearnings(scope, data, projectRoot) {
  const filePath = resolvePath(scope, projectRoot);
  const dir = filePath.replace(/[/\\][^/\\]+$/, "");
  (0, import_node_fs.mkdirSync)(dir, { recursive: true });
  try {
    (0, import_node_fs.writeFileSync)(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    throw new Error(`Falha ao escrever learnings em ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// src/promotion.ts
function promoteLearnings(learnings) {
  return learnings.map((l) => {
    if (l.status === "experimental" && l.confidence >= 3 && l.contradictions === 0) {
      return { ...l, status: "verified" };
    }
    if (l.status === "verified" && l.confidence >= 10) {
      return { ...l, status: "canonical" };
    }
    return l;
  });
}

// src/anti-drift.ts
var DAYS_90 = 90 * 24 * 60 * 60 * 1e3;
var DAYS_180 = 180 * 24 * 60 * 60 * 1e3;
function pruneLearnings(learnings, max = 200) {
  const now = Date.now();
  const pruned = learnings.map((l) => applyRules(l, now)).filter((l) => l !== null);
  return pruned.sort((a, b) => b.confidence - a.confidence).slice(0, max);
}
function applyRules(l, now) {
  if (l.contradictions >= 2) return null;
  const lastSeen = new Date(l.lastSeen).getTime();
  const age = now - lastSeen;
  if (l.status === "experimental") {
    if (l.contradictions >= 1) return null;
    if (age > DAYS_90) return null;
    return l;
  }
  if (l.status === "verified") {
    if (l.contradictions >= 1) return { ...l, status: "experimental" };
    if (age > DAYS_180) return { ...l, status: "experimental" };
    return l;
  }
  return l;
}

// src/memory-system.ts
var MAX_PROJECT = 200;
var MAX_GLOBAL = 500;
var MemorySystem = class {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }
  record(input) {
    const learnings = this.readAll();
    const existing = findDuplicate(learnings, input);
    if (existing) {
      const updated = {
        ...existing,
        confidence: existing.confidence + 1,
        evidence: [...existing.evidence, ...input.evidence],
        lastSeen: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.save(learnings.map((l) => l.id === existing.id ? updated : l));
      return updated;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const learning = { ...input, id: generateId(), createdAt: now, lastSeen: now };
    this.save([...learnings, learning]);
    return learning;
  }
  query(task, maxResults = 5) {
    const keywords = extractKeywords(task);
    if (keywords.length === 0) return [];
    return this.readAll().map((l) => ({ l, score: scoreMatch(l, keywords) })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, maxResults).map(({ l }) => l);
  }
  promote() {
    const learnings = this.readAll();
    this.save(promoteLearnings(learnings));
  }
  prune() {
    const project = readLearnings("project", this.projectRoot);
    const global = readLearnings("global");
    writeLearnings("project", pruneLearnings(project, MAX_PROJECT), this.projectRoot);
    writeLearnings("global", pruneLearnings(global, MAX_GLOBAL));
  }
  list(filters) {
    const learnings = this.readAll();
    if (!filters) return learnings;
    return learnings.filter(
      (l) => (!filters.status || l.status === filters.status) && (!filters.type || l.type === filters.type) && (!filters.scope || l.scope === filters.scope)
    );
  }
  inspect(id) {
    return this.readAll().find((l) => l.id === id) ?? null;
  }
  remove(id) {
    this.save(this.readAll().filter((l) => l.id !== id));
  }
  readAll() {
    const project = readLearnings("project", this.projectRoot);
    const global = readLearnings("global");
    return [...project, ...global];
  }
  save(learnings) {
    const project = learnings.filter((l) => l.scope !== "global");
    const global = learnings.filter((l) => l.scope === "global");
    if (project.length > 0 || readLearnings("project", this.projectRoot).length > 0) {
      writeLearnings("project", project, this.projectRoot);
    }
    if (global.length > 0) {
      writeLearnings("global", global);
    }
  }
};
function findDuplicate(learnings, input) {
  const normalized = input.description.toLowerCase().trim();
  return learnings.find((l) => l.description.toLowerCase().trim() === normalized) ?? null;
}
function extractKeywords(text) {
  return text.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
}
function scoreMatch(l, keywords) {
  const matches = l.tags.filter((tag) => keywords.some((kw) => tag.toLowerCase().includes(kw))).length;
  return matches * l.confidence;
}
function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// src/learning-gate.ts
var TEMPORARY_KEYWORDS = ["hack", "fixme", "todo", "temporary", "workaround", "provis\xF3rio"];
function classifyLearning(candidate, harnessResult) {
  if (!harnessResult.passed) {
    return {
      classification: "rejected_learning",
      reason: "Valida\xE7\xE3o do harness falhou. N\xE3o \xE9 poss\xEDvel registrar aprendizados n\xE3o validados.",
      approved: false
    };
  }
  if (candidate.evidence.length === 0) {
    return {
      classification: "rejected_learning",
      reason: "Candidato n\xE3o possui evid\xEAncias vinculadas da execu\xE7\xE3o atual.",
      approved: false
    };
  }
  const descLower = candidate.description.toLowerCase();
  if (TEMPORARY_KEYWORDS.some((kw) => descLower.includes(kw))) {
    return {
      classification: "temporary_workaround",
      reason: "Descri\xE7\xE3o indica que \xE9 uma solu\xE7\xE3o provis\xF3ria/hack.",
      approved: false
    };
  }
  const activeLayers = harnessResult.layers.filter((l) => !l.skipped);
  const ranTests = activeLayers.some((l) => l.name === "tests");
  if (!ranTests) {
    return {
      classification: "needs_review",
      reason: "Aprendizado gerado sem cobertura de testes. Requer aprova\xE7\xE3o humana.",
      approved: false
    };
  }
  if (candidate.scope === "global") {
    return {
      classification: "local_exception",
      reason: "Aprendizado rebaixado para escopo de projeto. Escopo global requer mais itera\xE7\xF5es.",
      approved: true,
      adjustedCandidate: { ...candidate, scope: "project" }
    };
  }
  return {
    classification: "safe_lesson",
    reason: "Aprendizado validado com sucesso atrav\xE9s de testes automatizados.",
    approved: true
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MemorySystem,
  classifyLearning,
  promoteLearnings,
  pruneLearnings,
  readLearnings,
  writeLearnings
});
