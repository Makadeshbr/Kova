import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { HarnessMode, HarnessResult, FileChange } from '@kova/shared'
import {
  runBuildLayer, runTestsLayer, runRulesLayer,
  runSecurityLayer, runLintLayer, runTypecheckLayer, runPipeline,
} from '@kova/harness'
import type { LayerDef, PipelineConfig } from '@kova/harness'
import { adapterFromProjectProfile, detectStack, detectStackFromChanges, resolveCommands } from '@kova/adapters'
import { buildProjectProfile, loadHarnessProjectConfig } from '@kova/project'
import { detectContext } from './context-detector'

export interface OrchestratorConfig {
  projectRoot: string
  adapter: string
  buildCommand: string
  testCommand: string
  lintCommand: string
  typecheckCommand: string
  iteration: number
  profileConfidence?: number
}

export interface OrchestratorResult {
  harnessResult: HarnessResult
  scratchpadFallback: boolean
  mode: HarnessMode
}

// Escreve arquivos no disco antes de validar.
// Os arquivos FICAM no disco — o usuário pode ver o progresso a cada iteração.
// Se o harness falhar, o agente tenta novamente e sobrescreve na próxima iteração.
function writeChangesToDisk(changes: FileChange[], projectRoot: string): void {
  for (const change of changes) {
    if (change.type === 'delete') {
      try { unlinkSync(join(projectRoot, change.path)) } catch { /* já deletado */ }
      continue
    }
    if (!change.diff) continue
    const fullPath = join(projectRoot, change.path)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, change.diff, 'utf-8')
  }
}

export class HarnessOrchestrator {
  private scoreHistory: number[] = []

  async run(
    changes: FileChange[],
    config: OrchestratorConfig,
    explicitMode?: HarnessMode,
  ): Promise<OrchestratorResult> {
    const mode = this.determineMode(changes, explicitMode)
    const layers = this.buildLayers(changes, config, mode)
    const pipelineConfig: PipelineConfig = {
      projectRoot: config.projectRoot,
      iteration: config.iteration,
    }

    // Escreve arquivos no disco (ficam mesmo se o harness falhar)
    writeChangesToDisk(changes, config.projectRoot)
    const harnessResult = await runPipeline(layers, pipelineConfig)

    this.scoreHistory.push(harnessResult.score)
    return {
      harnessResult,
      scratchpadFallback: this.isScratchpadNeeded(),
      mode,
    }
  }

  reset(): void { this.scoreHistory = [] }

  private determineMode(changes: FileChange[], explicit?: HarnessMode): HarnessMode {
    if (explicit) return explicit
    if (changes.length > 5) return 'full'
    const allNonCore = changes.every(c => {
      const profile = detectContext(c.path)
      return profile.fileType === 'test' || profile.fileType === 'config'
    })
    return allNonCore ? 'fast' : 'standard'
  }

  private isScratchpadNeeded(): boolean {
    if (this.scoreHistory.length < 3) return false
    const [a, b, c] = this.scoreHistory.slice(-3)
    return c <= b && b <= a
  }

  private buildLayers(
    changes: FileChange[],
    config: OrchestratorConfig,
    mode: HarnessMode,
  ): LayerDef[] {
    const { projectRoot, adapter, buildCommand, testCommand, lintCommand, typecheckCommand } = config

    const build: LayerDef = {
      name: 'build', hardFail: true,
      run: () => runBuildLayer({ command: buildCommand, projectRoot }),
    }
    const typecheck: LayerDef = {
      name: 'typecheck', hardFail: false,
      run: () => runTypecheckLayer({ command: typecheckCommand, projectRoot }),
    }
    const tests: LayerDef = {
      name: 'tests', hardFail: false,
      run: () => runTestsLayer({ command: testCommand, projectRoot }),
    }
    const rules: LayerDef = {
      name: 'rules', hardFail: false,
      run: () => runRulesLayer({ changes, projectRoot, adapter }, ''),
    }
    const security: LayerDef = {
      name: 'security', hardFail: false,
      run: () => runSecurityLayer({ changes, projectRoot }),
    }
    const lint: LayerDef = {
      name: 'lint', hardFail: false,
      run: () => runLintLayer({ command: lintCommand, projectRoot }),
    }

    switch (mode) {
      case 'fast': return [rules, lint]
      case 'standard': return [build, typecheck, tests, rules]
      case 'full': return [build, typecheck, tests, rules, security, lint]
    }
  }
}

export function createOrchestratorConfig(
  projectRoot: string,
  iteration = 1,
  generatedPaths: string[] = [],
): OrchestratorConfig {
  const profile = buildProjectProfile(projectRoot)
  let adapter = profile.confidence > 0 ? adapterFromProjectProfile(profile) : detectStack(projectRoot)
  if (adapter.name === 'generic' && generatedPaths.length > 0) {
    const fromGenerated = detectStackFromChanges(generatedPaths)
    if (fromGenerated) adapter = fromGenerated
  }
  const commands = resolveCommands(adapter, projectRoot)
  const harnessConfig = loadHarnessProjectConfig(projectRoot)
  const resolved = resolveConfiguredCommands(commands, profile, harnessConfig)
  return {
    projectRoot, adapter: adapter.name,
    buildCommand: resolved.build, testCommand: resolved.test, lintCommand: resolved.lint,
    typecheckCommand: resolved.typecheck,
    iteration,
    profileConfidence: profile.confidence,
  }
}

function resolveConfiguredCommands(
  fallback: ReturnType<typeof resolveCommands>,
  profile: ReturnType<typeof buildProjectProfile>,
  config: ReturnType<typeof loadHarnessProjectConfig>,
): ReturnType<typeof resolveCommands> & { typecheck: string } {
  return {
    build: pickCommand(config?.validation?.build, profile.buildCommands, fallback.build),
    test: pickCommand(config?.validation?.test, profile.testCommands, fallback.test),
    lint: pickCommand(config?.validation?.lint, profile.lintCommands, fallback.lint),
    format: fallback.format,
    typecheck: pickCommand(undefined, profile.typecheckCommands, ''),
  }
}

function pickCommand(
  configured: string[] | 'auto' | undefined,
  candidates: { command: string; safeToRun: boolean }[],
  fallback: string,
): string {
  if (Array.isArray(configured)) return configured.find(command => command.trim()) ?? ''
  const candidate = candidates.find(item => item.safeToRun)
  return candidate?.command ?? fallback
}
