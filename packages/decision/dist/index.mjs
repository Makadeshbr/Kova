// src/score.ts
var BASE_WEIGHTS = {
  build: 25,
  typecheck: 0,
  tests: 30,
  rules: 25,
  security: 10,
  lint: 10
};
function calculateScore(result) {
  if (hasHardFail(result)) return 0;
  const weights = adaptWeights(result);
  let passed = 0;
  let total = 0;
  for (const layer of result.layers) {
    if (layer.skipped) continue;
    const weight = weights[layer.name] ?? 0;
    total += weight;
    if (layer.passed) passed += weight;
  }
  if (total === 0) return 100;
  return Math.round(passed / total * 100);
}
function adaptWeights(result) {
  const weights = { ...BASE_WEIGHTS };
  const typecheckLayer = result.layers.find((l) => l.name === "typecheck");
  if (typecheckLayer && !typecheckLayer.skipped) {
    weights.typecheck = 10;
    weights.build = Math.max(weights.build - 10, 0);
  }
  const testsLayer = result.layers.find((l) => l.name === "tests");
  if (!testsLayer || testsLayer.skipped) {
    const w = weights.tests;
    weights.tests = 0;
    weights.rules += Math.round(w * 0.6);
    weights.build += Math.round(w * 0.4);
  }
  const lintLayer = result.layers.find((l) => l.name === "lint");
  if (!lintLayer || lintLayer.skipped) {
    weights.rules += weights.lint;
    weights.lint = 0;
  }
  const securityLayer = result.layers.find((l) => l.name === "security");
  if (securityLayer && !securityLayer.passed && securityLayer.errors.some((e) => e.severity === "critical")) {
    return weights;
  }
  return weights;
}
function hasHardFail(result) {
  for (const layer of result.layers) {
    if (layer.passed || layer.skipped) continue;
    if (layer.name === "build") return true;
    if (layer.name === "security" && hasCriticalError(layer)) return true;
  }
  return false;
}
function hasCriticalError(layer) {
  return layer.errors.some((e) => e.severity === "critical");
}
function getHardFailReason(result) {
  for (const layer of result.layers) {
    if (layer.passed) continue;
    if (layer.name === "build") return "Build falhou \u2014 c\xF3digo n\xE3o compila";
    if (layer.name === "security" && hasCriticalError(layer)) {
      const n = layer.errors.filter((e) => e.severity === "critical").length;
      return `${n} secret(s) exposta(s) detectada(s)`;
    }
    if (layer.name === "rules" && hasCriticalError(layer)) {
      return "Viola\xE7\xE3o cr\xEDtica de arquitetura detectada";
    }
  }
  return "Hard fail detectado";
}

// src/feedback.ts
function buildFeedback(result) {
  const feedback = [];
  for (const layer of result.layers) {
    if (layer.passed) continue;
    for (const error of layer.errors) {
      feedback.push({
        error,
        instruction: buildInstruction(error, layer.name),
        context: buildContext(error)
      });
    }
  }
  return feedback;
}
function buildInstruction(error, layer) {
  switch (layer) {
    case "build":
      return `Corrija o erro de compila\xE7\xE3o em ${error.file}:${error.line ?? "?"} \u2014 ${error.message}`;
    case "tests":
      return `Corrija o teste falhando: ${error.message}`;
    case "rules": {
      if (error.message.includes("Complexidade")) {
        return `Extraia sub-fun\xE7\xF5es para reduzir a complexidade ciclom\xE1tica: ${error.message}`;
      }
      if (error.message.includes("Nesting")) {
        return `Use early-return ou extra\xE7\xE3o de fun\xE7\xF5es para reduzir nesting: ${error.message}`;
      }
      return `Corrija a viola\xE7\xE3o de arquitetura: ${error.message}`;
    }
    case "security":
      return `CR\xCDTICO: ${error.message}. Mova o valor para vari\xE1vel de ambiente.`;
    case "lint":
      return `Corrija a viola\xE7\xE3o de lint em ${error.file}:${error.line ?? "?"} \u2014 ${error.message}`;
    default:
      return error.message;
  }
}
function buildContext(error) {
  const parts = [];
  if (error.file) parts.push(`Arquivo: ${error.file}`);
  if (error.line) parts.push(`Linha: ${error.line}`);
  if (error.rule) parts.push(`Regra: ${error.rule}`);
  parts.push(`Severidade: ${error.severity}`);
  return parts.join(" | ");
}

// src/review-gate.ts
var GENERATED_PATHS = ["dist/**", "out/**", "node_modules/**"];
var DEPENDENCY_FILES = ["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"];
function runReviewGate(input) {
  const findings = [];
  for (const change of input.changes) {
    if (matchesAny(change.path, GENERATED_PATHS)) {
      findings.push({
        category: "generated",
        severity: "high",
        blocking: true,
        file: change.path,
        message: `${change.path} parece arquivo gerado e nao deve ser editado manualmente`
      });
    }
    if (change.type !== "create" && DEPENDENCY_FILES.includes(change.path)) {
      findings.push({
        category: "dependency",
        severity: "high",
        blocking: true,
        file: change.path,
        message: `${change.path} altera dependencias ou lockfile; exige aprovacao explicita`
      });
    }
    if (input.contract && !matchesAny(change.path, input.contract.allowedPaths)) {
      findings.push({
        category: "scope",
        severity: "high",
        blocking: true,
        file: change.path,
        message: `${change.path} esta fora do escopo do contrato`
      });
    }
    if (change.type !== "create" && input.contract && matchesAny(change.path, input.contract.safeZones)) {
      findings.push({
        category: "security",
        severity: "high",
        blocking: true,
        file: change.path,
        message: `${change.path} e safe zone e precisa revisao humana`
      });
    }
  }
  if (input.contract?.requiresTests && !hasTestChange(input.changes) && changesExecutableCode(input.changes)) {
    findings.push({
      category: "tests",
      severity: "medium",
      blocking: false,
      message: "Contrato espera teste para mudanca de comportamento, mas nenhum arquivo de teste foi alterado",
      suggestion: "Adicione teste ou registre justificativa tecnica."
    });
  }
  for (const layer of input.harnessResult.layers) {
    for (const error of layer.errors) {
      if (error.severity === "critical") {
        findings.push({
          category: error.type === "security" ? "security" : "quality",
          severity: "critical",
          blocking: true,
          file: error.file,
          message: error.humanMessage || error.message
        });
      }
    }
  }
  const blocking = findings.some((f) => f.blocking);
  return { passed: !blocking, findings };
}
function hasTestChange(changes) {
  return changes.some((c) => /(^|\/)(__tests__|test|tests)\//.test(c.path) || /\.(test|spec)\.[tj]sx?$/.test(c.path));
}
function changesExecutableCode(changes) {
  return changes.some((c) => /\.(ts|tsx|js|jsx|go|py|rs|java|cs)$/.test(c.path));
}
function matchesAny(path, patterns) {
  return patterns.some((pattern) => matchGlob(path.replace(/\\/g, "/"), pattern));
}
function matchGlob(path, pattern) {
  if (pattern === "**") return true;
  if (path === pattern) return true;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\0").replace(/\*/g, "[^/]+").replace(/\x00/g, ".*");
  return new RegExp(`^${escaped}$`).test(path);
}

// src/decision-engine.ts
function decide(result, history, context = {}) {
  const rawScore = result.validationConfidence === "none" || hasNoRealValidation(result) ? 75 : calculateScore(result);
  const score = result.validationConfidence === "partial" && rawScore > 0 ? Math.min(rawScore, 85) : rawScore;
  const feedback = buildFeedback(result);
  const reviewGate = context.changes ? runReviewGate({ changes: context.changes, contract: context.contract, harnessResult: result }) : void 0;
  if (reviewGate && !reviewGate.passed) {
    const top = reviewGate.findings.find((f) => f.blocking && f.severity === "critical") ?? reviewGate.findings.find((f) => f.blocking);
    return {
      decision: top?.severity === "critical" ? "reject" : "human_required",
      score: Math.min(score, top?.severity === "critical" ? 0 : 69),
      reason: `Review Gate blocked: ${top?.message ?? "diff requires review"}`,
      feedback,
      reviewGate
    };
  }
  if (hasRepeatedError(result, history)) {
    return {
      decision: "human_required",
      score,
      reason: "Same error repeated for 4 iterations; human intervention required",
      feedback,
      reviewGate
    };
  }
  if (isScoreRegressing(result, history)) {
    return {
      decision: "human_required",
      score,
      reason: "Score regressed for 3 iterations without progress",
      feedback,
      reviewGate
    };
  }
  if (score === 0) {
    return { decision: "reject", score, reason: getHardFailReason(result), feedback, reviewGate };
  }
  if (score >= 90) {
    return { decision: "auto_apply", score, reason: "Senior-quality patch confirmed", feedback, reviewGate };
  }
  if (score >= 70) {
    return { decision: "suggest", score, reason: "Acceptable quality; review recommended", feedback, reviewGate };
  }
  return { decision: "reject", score, reason: `Score ${score} below threshold 70`, feedback, reviewGate };
}
function hasNoRealValidation(result) {
  const evidenceLayers = result.layers.filter((layer) => ["build", "tests", "lint"].includes(layer.name));
  if (evidenceLayers.length === 0) return true;
  return evidenceLayers.every((layer) => layer.skipped);
}
function hasRepeatedError(result, history) {
  const current = buildFingerprints(result);
  if (current.size === 0) return false;
  let consecutive = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const prev = buildFingerprints(history[i].harnessResult);
    const overlap = [...current].some((fp) => prev.has(fp));
    if (overlap) consecutive++;
    else break;
  }
  return consecutive >= 4;
}
function buildFingerprints(result) {
  const fps = /* @__PURE__ */ new Set();
  for (const layer of result.layers) {
    for (const error of layer.errors) {
      fps.add(`${error.layer}:${error.file}:${error.rule ?? error.type}:${error.line ?? 0}`);
    }
  }
  return fps;
}
function isScoreRegressing(result, history) {
  if (history.length < 3) return false;
  const current = calculateScore(result);
  if (current === 0) return false;
  const prev1 = calculateScore(history[history.length - 1].harnessResult);
  const prev2 = calculateScore(history[history.length - 2].harnessResult);
  return current < prev1 && prev1 < prev2;
}
export {
  buildFeedback,
  calculateScore,
  decide,
  getHardFailReason,
  runReviewGate
};
