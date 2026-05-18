import { cpSync, existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative } from 'node:path'
import type { CommandCandidate, HarnessMode, HarnessResult, FileChange } from '@kova/shared'
import { runCommandInvocation } from '@kova/shared'
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
  buildCwd?: string
  testCwd?: string
  lintCwd?: string
  typecheckCwd?: string
  iteration: number
  profileConfidence?: number
  signal?: AbortSignal
  /** Called when a harness layer starts executing. */
  onLayerStart?: (layer: string, command: string) => void
  /** Called for each output line from a layer subprocess in real-time. */
  onHarnessLine?: (layer: string, line: string, stream: 'stdout' | 'stderr') => void
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

const STAGING_SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'out', 'build', '.next', '.turbo', 'coverage'])
const STAGING_SKIP_KOVA = ['.kova/traces', '.kova/sessions', '.kova/checkpoints']

interface ValidationWorkspace {
  root: string
  cleanup: () => void
}

function createValidationWorkspace(projectRoot: string, changes: FileChange[]): ValidationWorkspace {
  const root = mkdtempSync(join(tmpdir(), 'kova-validate-'))
  if (existsSync(projectRoot)) {
    cpSync(projectRoot, root, {
      recursive: true,
      dereference: false,
      errorOnExist: false,
      filter: (src) => shouldCopyToStaging(projectRoot, src),
    })
  }
  writeChangesToDisk(changes, root)
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  }
}

function shouldCopyToStaging(projectRoot: string, src: string): boolean {
  const rel = relative(projectRoot, src).replace(/\\/g, '/')
  if (!rel) return true
  const first = rel.split('/')[0]
  if (STAGING_SKIP_DIRS.has(first)) return false
  if (STAGING_SKIP_KOVA.some(prefix => rel === prefix || rel.startsWith(`${prefix}/`))) return false
  return true
}

/**
 * When the staging workspace has a Node package.json with runnable scripts
 * but no `node_modules`, install dependencies once before the harness runs.
 *
 * Why this exists: `createValidationWorkspace` deliberately excludes
 * `node_modules` from the copy (it's huge and stale renders make it useless).
 * For scaffolding scenarios — where the agent just generated `package.json`
 * and the source project has no install yet — the build layer would otherwise
 * always fail with `'next' is not recognized` / `MODULE_NOT_FOUND` and the
 * repair loop would burn iterations trying to fix source for an env problem.
 *
 * Package manager detection follows the lockfile in the staging tree:
 *   - pnpm-lock.yaml → pnpm
 *   - yarn.lock      → yarn
 *   - package-lock.json → npm
 *   - default        → npm (most universal)
 *
 * Install runs with a generous timeout but is non-blocking — if it fails,
 * the harness still executes and surfaces the real error (which the env
 * classifier in @kova/harness will then catch as a `type: 'environment'`
 * error, exiting the repair loop cleanly).
 */
async function ensureNodeBootstrap(stagingRoot: string, config: OrchestratorConfig): Promise<void> {
  const manifestPath = join(stagingRoot, 'package.json')
  if (!existsSync(manifestPath)) return
  if (existsSync(join(stagingRoot, 'node_modules'))) return

  let manifest: { scripts?: Record<string, string> }
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as { scripts?: Record<string, string> }
  } catch {
    // Broken package.json — the build layer will surface a clearer error.
    return
  }
  // Only install when there is something to run. A package.json without any
  // scripts won't trigger build/test layers in a way install would help.
  const scripts = manifest.scripts ?? {}
  const hasRunnableScript = Boolean(scripts.build || scripts.dev || scripts.test || scripts.lint || scripts.typecheck || scripts.start)
  if (!hasRunnableScript) return

  const pm = detectPackageManager(stagingRoot)
  const installCommand = packageManagerInstallCommand(pm)
  const layerName = 'bootstrap'
  config.onLayerStart?.(layerName, installCommand)
  try {
    const result = await runCommandInvocation({
      command: installCommand,
      workspaceRoot: stagingRoot,
      cwd: stagingRoot,
      kind: 'run',
      timeoutMs: 180_000,
      signal: config.signal,
      onLine: config.onHarnessLine
        ? (line, stream) => config.onHarnessLine?.(layerName, line, stream)
        : undefined,
    })
    if (result.exitCode !== 0) {
      config.onHarnessLine?.(layerName, `bootstrap install exited with code ${result.exitCode}`, 'stderr')
    }
  } catch (err) {
    // Non-blocking — surface to the live feed and let the harness continue.
    const message = err instanceof Error ? err.message : String(err)
    config.onHarnessLine?.(layerName, `bootstrap install failed: ${message}`, 'stderr')
  }
}

type NodePackageManager = 'pnpm' | 'yarn' | 'npm'

function detectPackageManager(stagingRoot: string): NodePackageManager {
  if (existsSync(join(stagingRoot, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(join(stagingRoot, 'yarn.lock'))) return 'yarn'
  if (existsSync(join(stagingRoot, 'package-lock.json'))) return 'npm'
  // Default to npm — most universally available and the agent rarely declares
  // a preferred manager in a brand-new scaffold.
  return 'npm'
}

function packageManagerInstallCommand(pm: NodePackageManager): string {
  // `--prefer-offline` and `--no-audit` keep things fast and resilient to
  // flaky network; `--ignore-scripts` would mask postinstall side-effects
  // and is intentionally NOT set — packages that need a postinstall (e.g.
  // esbuild, sharp) require it to wire up native binaries.
  if (pm === 'pnpm') return 'pnpm install --prefer-offline'
  if (pm === 'yarn') return 'yarn install --prefer-offline'
  return 'npm install --no-audit --no-fund --prefer-offline'
}

function mapCwdToStaging(cwd: string | undefined, realRoot: string, stagedRoot: string): string | undefined {
  if (!cwd) return cwd
  if (!isAbsolute(cwd)) return cwd
  const rel = relative(realRoot, cwd)
  if (!rel || rel.startsWith('..')) return cwd
  return join(stagedRoot, rel)
}

export class HarnessOrchestrator {
  private scoreHistory: number[] = []

  async run(
    changes: FileChange[],
    config: OrchestratorConfig,
    explicitMode?: HarnessMode,
  ): Promise<OrchestratorResult> {
    const mode = this.determineMode(changes, explicitMode)
    const staging = createValidationWorkspace(config.projectRoot, changes)
    try {
      const validationConfig: OrchestratorConfig = {
        ...config,
        projectRoot: staging.root,
        buildCwd: mapCwdToStaging(config.buildCwd, config.projectRoot, staging.root),
        testCwd: mapCwdToStaging(config.testCwd, config.projectRoot, staging.root),
        lintCwd: mapCwdToStaging(config.lintCwd, config.projectRoot, staging.root),
        typecheckCwd: mapCwdToStaging(config.typecheckCwd, config.projectRoot, staging.root),
      }
      const layers = this.buildLayers(changes, validationConfig, mode)
      const pipelineConfig: PipelineConfig = {
        projectRoot: staging.root,
        iteration: config.iteration,
        signal: config.signal,
        changes,
        onLayerStart: config.onLayerStart,
        onLayerLine: config.onHarnessLine,
      }

      // Bootstrap step — when the staging workspace has a Node manifest with
      // scripts but no `node_modules`, the build layer would otherwise fail
      // with `'next' is not recognized` / `MODULE_NOT_FOUND`. The bootstrap
      // step installs dependencies once before validation. Failures here are
      // non-blocking — the harness still runs and reports the real error.
      await ensureNodeBootstrap(staging.root, config)

      const harnessResult = await runPipeline(layers, pipelineConfig)

      this.scoreHistory.push(harnessResult.score)
      return {
        harnessResult,
        scratchpadFallback: this.isScratchpadNeeded(),
        mode,
      }
    } finally {
      staging.cleanup()
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
    const {
      projectRoot, adapter, buildCommand, testCommand, lintCommand, typecheckCommand,
      buildCwd, testCwd, lintCwd, typecheckCwd, signal, onHarnessLine,
    } = config

    const onLine = (layer: string) => onHarnessLine
      ? (line: string, stream: 'stdout' | 'stderr') => onHarnessLine(layer, line, stream)
      : undefined

    const build: LayerDef = {
      name: 'build', hardFail: true, command: buildCommand,
      run: () => runBuildLayer({ command: buildCommand, projectRoot, cwd: buildCwd, signal, onLine: onLine('build') }),
    }
    const typecheck: LayerDef = {
      name: 'typecheck', hardFail: false, command: typecheckCommand,
      run: () => runTypecheckLayer({ command: typecheckCommand, projectRoot, cwd: typecheckCwd, signal, onLine: onLine('typecheck') }),
    }
    const tests: LayerDef = {
      name: 'tests', hardFail: false, command: testCommand,
      run: () => runTestsLayer({ command: testCommand, projectRoot, cwd: testCwd, signal, onLine: onLine('tests') }),
    }
    const rules: LayerDef = {
      name: 'rules', hardFail: false,
      run: () => runRulesLayer({ changes, projectRoot, adapter }, ''),
    }
    const security: LayerDef = {
      name: 'security', hardFail: false,
      run: () => runSecurityLayer({ changes, projectRoot, signal }),
    }
    const lint: LayerDef = {
      name: 'lint', hardFail: false, command: lintCommand,
      run: () => runLintLayer({ command: lintCommand, projectRoot, cwd: lintCwd, signal, onLine: onLine('lint') }),
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
  const resolved = resolveConfiguredCommands(commands, profile, harnessConfig, generatedPaths)
  if (adapter.name === 'python') {
    resolved.build = resolvePythonCompileCommand(resolved.build, resolved.buildCwd ?? projectRoot, projectRoot, generatedPaths)
    if (resolved.test.trim() === 'pytest') resolved.test = 'python -m unittest discover -v'
  }
  return {
    projectRoot, adapter: adapter.name,
    buildCommand: resolved.build, testCommand: resolved.test, lintCommand: resolved.lint,
    typecheckCommand: resolved.typecheck,
    buildCwd: resolved.buildCwd,
    testCwd: resolved.testCwd,
    lintCwd: resolved.lintCwd,
    typecheckCwd: resolved.typecheckCwd,
    iteration,
    profileConfidence: profile.confidence,
  }
}

function resolvePythonCompileCommand(command: string, cwd: string, projectRoot: string, generatedPaths: string[]): string {
  if (!/^python\s+-m\s+py_compile\s*$/i.test(command.trim())) return command
  const files = new Set<string>()
  for (const path of generatedPaths) {
    const normalized = path.replace(/\\/g, '/')
    if (!normalized.endsWith('.py')) continue
    const scoped = pathRelativeToCwd(projectRoot, cwd, normalized)
    if (scoped) files.add(scoped)
  }
  for (const path of collectPythonFiles(cwd)) files.add(path)
  const args = [...files].sort().map(quoteShellArg).join(' ')
  return args ? `${command} ${args}` : command
}

function collectPythonFiles(dir: string, root = dir, depth = 0): string[] {
  if (depth > 5) return []
  let entries: string[]
  try { entries = readdirSync(dir) } catch { return [] }
  const files: string[] = []
  for (const entry of entries) {
    if (['.git', 'node_modules', '__pycache__', '.venv', 'venv', 'dist', 'build', '.kova'].includes(entry)) continue
    const full = join(dir, entry)
    let st
    try { st = statSync(full) } catch { continue }
    if (st.isDirectory()) files.push(...collectPythonFiles(full, root, depth + 1))
    else if (entry.endsWith('.py')) files.push(full.slice(root.length + 1).replace(/\\/g, '/'))
  }
  return files
}

function quoteShellArg(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`
}

interface ResolvedCommand {
  command: string
  cwd?: string
}

interface ResolvedHarnessCommands {
  build: string
  test: string
  lint: string
  format?: string
  typecheck: string
  buildCwd?: string
  testCwd?: string
  lintCwd?: string
  typecheckCwd?: string
}

function resolveConfiguredCommands(
  fallback: ReturnType<typeof resolveCommands>,
  profile: ReturnType<typeof buildProjectProfile>,
  config: ReturnType<typeof loadHarnessProjectConfig>,
  generatedPaths: string[],
): ResolvedHarnessCommands {
  const build = pickCommand(config?.validation?.build, profile.buildCommands, fallback.build, generatedPaths)
  const test = pickCommand(config?.validation?.test, profile.testCommands, fallback.test, generatedPaths)
  const lint = pickCommand(config?.validation?.lint, profile.lintCommands, fallback.lint, generatedPaths)
  const typecheck = pickCommand(undefined, profile.typecheckCommands, '', generatedPaths)
  return {
    build: build.command,
    test: test.command,
    lint: lint.command,
    format: fallback.format,
    typecheck: typecheck.command,
    buildCwd: build.cwd,
    testCwd: test.cwd,
    lintCwd: lint.cwd,
    typecheckCwd: typecheck.cwd,
  }
}

function pickCommand(
  configured: string[] | 'auto' | undefined,
  candidates: CommandCandidate[],
  fallback: string,
  generatedPaths: string[],
): ResolvedCommand {
  if (Array.isArray(configured)) {
    return { command: configured.find(command => command.trim()) ?? '' }
  }
  const candidate = selectCandidate(candidates, generatedPaths)
  if (!candidate) return { command: fallback }
  return {
    command: normalizeScopedCommand(candidate.command, candidate.scope),
    cwd: candidate.scope && candidate.scope !== 'root' ? candidate.scope : undefined,
  }
}

function selectCandidate(candidates: CommandCandidate[], generatedPaths: string[]): CommandCandidate | undefined {
  const safe = candidates.filter(item => item.safeToRun)
  if (safe.length === 0) return undefined
  const scored = safe.map(candidate => ({
    candidate,
    score: (candidate.confidence ?? 0) + (scopeMatches(candidate.scope, generatedPaths) ? 1 : 0),
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.candidate
}

function scopeMatches(scope: string | undefined, paths: string[]): boolean {
  if (!scope || scope === 'root' || paths.length === 0) return false
  const prefix = `${scope.replace(/\\/g, '/')}/`
  return paths.some(path => path.replace(/\\/g, '/').startsWith(prefix))
}

function normalizeScopedCommand(command: string, scope: string | undefined): string {
  if (!scope || scope === 'root') return command
  const escaped = escapeRegExp(scope.replace(/\\/g, '/'))
  return command
    .replace(new RegExp(`^npm\\s+--prefix\\s+${escaped}\\s+run\\s+`, 'i'), 'npm run ')
    .replace(new RegExp(`^pnpm\\s+--dir\\s+${escaped}\\s+run\\s+`, 'i'), 'pnpm run ')
    .replace(new RegExp(`^yarn\\s+--cwd\\s+${escaped}\\s+run\\s+`, 'i'), 'yarn run ')
}

function pathRelativeToCwd(projectRoot: string, cwd: string, path: string): string | null {
  const cwdRel = cwd.slice(projectRoot.length + 1).replace(/\\/g, '/')
  if (!cwdRel) return path
  const prefix = `${cwdRel}/`
  return path.startsWith(prefix) ? path.slice(prefix.length) : null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
