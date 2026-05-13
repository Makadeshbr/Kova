import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import type {
  CommandCandidate,
  DetectedItem,
  HarnessProjectConfig,
  InstructionFile,
  ProjectFileReference,
  ProjectKind,
  ProjectProfile,
  ProjectRisk,
  ProjectSignal,
  ProjectTrait,
  ProjectValidation,
  ProjectWorkspace,
} from '@kova/shared'

const ROOT_MARKERS = [
  '.git', '.hg', '.sl',
  'KOVA.md', 'AGENTS.md', 'CLAUDE.md',
  'package.json', 'go.mod', 'pyproject.toml', 'Cargo.toml', 'pom.xml',
  'build.gradle', 'build.gradle.kts', 'global.json', 'composer.json', 'Gemfile',
  'pnpm-workspace.yaml',
]

const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'out', 'build', '.next', '.cache',
  'coverage', 'vendor', 'target', '__pycache__', '.kova/tmp',
])

const MANIFESTS: Record<string, { language: string; confidence: number }> = {
  'package.json': { language: 'javascript', confidence: 0.85 },
  'tsconfig.json': { language: 'typescript', confidence: 0.9 },
  'go.mod': { language: 'go', confidence: 0.98 },
  'pyproject.toml': { language: 'python', confidence: 0.95 },
  'requirements.txt': { language: 'python', confidence: 0.8 },
  'Cargo.toml': { language: 'rust', confidence: 0.98 },
  'pom.xml': { language: 'java', confidence: 0.95 },
  'build.gradle': { language: 'java', confidence: 0.85 },
  'build.gradle.kts': { language: 'kotlin', confidence: 0.9 },
  'composer.json': { language: 'php', confidence: 0.95 },
  'Gemfile': { language: 'ruby', confidence: 0.95 },
  'Package.swift': { language: 'swift', confidence: 0.95 },
  'pubspec.yaml': { language: 'dart', confidence: 0.95 },
  'CMakeLists.txt': { language: 'cpp', confidence: 0.8 },
}

const LOCKFILES: Record<string, string> = {
  'pnpm-lock.yaml': 'pnpm',
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'bun.lockb': 'bun',
  'uv.lock': 'uv',
  'poetry.lock': 'poetry',
  'Cargo.lock': 'cargo',
  'go.sum': 'go',
  'composer.lock': 'composer',
  'Gemfile.lock': 'bundler',
}

const EXT_LANG: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript',
  '.go': 'go',
  '.py': 'python',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.cs': 'csharp',
  '.php': 'php',
  '.rb': 'ruby',
  '.swift': 'swift',
  '.dart': 'dart',
  '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp',
  '.c': 'c',
}

const CI_FILES = [
  '.gitlab-ci.yml',
  'azure-pipelines.yml',
  'Jenkinsfile',
  '.circleci/config.yml',
]

const CONTAINER_FILES = [
  'Dockerfile',
  'Containerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'compose.yaml',
]

const TASK_RUNNER_FILES = [
  'Makefile',
  'Taskfile.yml',
  'Taskfile.yaml',
  'justfile',
]

interface PackageJson {
  name?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  workspaces?: string[] | { packages?: string[] }
}

type CommandBuckets = {
  build: CommandCandidate[]
  test: CommandCandidate[]
  lint: CommandCandidate[]
  typecheck: CommandCandidate[]
}

type ValidationCommandKind = keyof CommandBuckets

export function findProjectRoot(startDir: string): string {
  let current = resolve(startDir)
  while (true) {
    if (ROOT_MARKERS.some(marker => existsSync(join(current, marker)))) return current
    const parent = dirname(current)
    if (parent === current) return resolve(startDir)
    current = parent
  }
}

export function buildProjectProfile(projectRoot: string): ProjectProfile {
  const root = resolve(projectRoot)
  const files = listProjectFiles(root)
  const signals = collectSignals(root, files)
  const languages = rankDetectedItems(signals.filter(isLanguageSignal), 'language')
  const packageManagers = detectPackageManagers(files)
  const frameworks = detectFrameworks(root, files)
  const rootCommands = detectCommands(root, files)
  const workspaces = detectWorkspaces(root, files)
  const commands = mergeWorkspaceCommands(rootCommands, workspaces)
  const ci = detectFileReferences(files, 'ci')
  const containers = detectFileReferences(files, 'container')
  const taskRunners = detectFileReferences(files, 'task_runner')
  const instructionFiles = detectFileReferences(files, 'instruction')
  const sensitiveFiles = detectFileReferences(files, 'sensitive')
  const validations = detectValidations(commands, workspaces)
  const projectKind = detectProjectKind(files, languages, workspaces)
  const traits = detectProjectTraits(languages, validations, ci, containers, taskRunners, sensitiveFiles)

  return {
    root,
    projectKind,
    traits,
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
    observations: detectObservations(files, projectKind, traits, languages, workspaces, validations, sensitiveFiles),
    confidence: calculateConfidence(signals, commands),
  }
}

export function loadProjectInstructions(projectRoot: string): InstructionFile[] {
  const root = resolve(projectRoot)
  const files: InstructionFile[] = []
  const seenResolved = new Set<string>()
  const add = (path: string, priority: number): void => {
    const fullPath = join(root, path)
    if (!existsSync(fullPath)) return
    // Use device+inode as a stable identity key: two paths that resolve to the same
    // physical file on a case-insensitive filesystem (Windows/macOS) share the same key.
    let inodeKey: string
    try {
      const st = statSync(fullPath)
      inodeKey = `${st.dev}:${st.ino}`
    } catch {
      inodeKey = resolve(fullPath)
    }
    if (seenResolved.has(inodeKey)) return
    seenResolved.add(inodeKey)
    try {
      files.push({ path, priority, content: readFileSync(fullPath, 'utf-8') })
    } catch {
      // Ignore unreadable instruction files.
    }
  }

  add('KOVA.md', 100)
  add('AGENTS.md', 90)
  add('CLAUDE.md', 80)
  // Check all capitalisation variants — Linux/Mac filesystems are case-sensitive
  add('RULES.md', 70)
  add('Rules.md', 70)
  add('rules.md', 70)

  const rulesDir = join(root, '.kova', 'rules')
  if (existsSync(rulesDir)) {
    for (const file of listMarkdownFiles(rulesDir)) {
      const rel = `.kova/rules/${file}`
      add(rel, 60)
    }
  }

  return files.sort((a, b) => b.priority - a.priority)
}

export function loadHarnessProjectConfig(projectRoot: string): HarnessProjectConfig | null {
  const filePath = join(projectRoot, '.kova', 'harness.json')
  if (!existsSync(filePath)) return null
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as HarnessProjectConfig
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function listProjectFiles(root: string): string[] {
  const out: string[] = []
  walk(root, '', out, 0)
  return out
}

function walk(root: string, relDir: string, out: string[], depth: number): void {
  if (depth > 6) return
  const dir = join(root, relDir)
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    const rel = relDir ? `${relDir}/${entry}` : entry
    if (SKIP_DIRS.has(entry) || SKIP_DIRS.has(rel)) continue
    const full = join(root, rel)
    try {
      const stat = statSync(full)
      if (stat.isDirectory()) walk(root, rel, out, depth + 1)
      else out.push(rel.replace(/\\/g, '/'))
    } catch {
      // Skip broken symlinks or denied paths.
    }
  }
}

function collectSignals(root: string, files: string[]): ProjectSignal[] {
  const signals: ProjectSignal[] = []
  for (const file of files) {
    const base = basename(file)
    const manifest = MANIFESTS[base]
    if (manifest) {
      signals.push({ kind: 'manifest', path: file, stackHint: manifest.language, confidence: manifest.confidence })
    }
    if (base.endsWith('.csproj') || base.endsWith('.sln')) {
      signals.push({ kind: 'manifest', path: file, stackHint: 'csharp', confidence: 0.92 })
    }
    const lock = LOCKFILES[base]
    if (lock) {
      signals.push({ kind: 'lockfile', path: file, stackHint: lock, confidence: 0.85 })
    }
    if (base === 'Dockerfile' || base === 'docker-compose.yml' || base === 'docker-compose.yaml') {
      signals.push({ kind: 'config', path: file, stackHint: 'container', confidence: 0.75 })
    }
    if (base === 'Makefile' || base === 'Taskfile.yml' || base === 'justfile') {
      signals.push({ kind: 'task_runner', path: file, stackHint: base.toLowerCase(), confidence: 0.8 })
    }
    const ext = extensionOf(file)
    const lang = EXT_LANG[ext]
    if (lang && isSourceCandidate(root, file)) {
      signals.push({ kind: 'source_file', path: file, stackHint: lang, confidence: 0.45 })
    }
  }
  return signals
}

function rankDetectedItems(signals: ProjectSignal[], sourcePrefix: string): DetectedItem[] {
  const scores = new Map<string, { score: number; source: string }>()
  for (const signal of signals) {
    const existing = scores.get(signal.stackHint) ?? { score: 0, source: signal.path }
    existing.score += signal.confidence
    if (signal.kind === 'manifest') existing.source = signal.path
    scores.set(signal.stackHint, existing)
  }
  return [...scores.entries()]
    .map(([name, item]) => ({
      name,
      source: `${sourcePrefix}:${item.source}`,
      confidence: Math.min(0.99, Number((item.score / 2).toFixed(2))),
    }))
    .filter(item => item.confidence >= 0.2)
    .sort((a, b) => b.confidence - a.confidence)
}

function isLanguageSignal(signal: ProjectSignal): boolean {
  return signal.kind === 'manifest' || signal.kind === 'source_file'
}

function detectPackageManagers(files: string[]): DetectedItem[] {
  const items: DetectedItem[] = []
  for (const [file, name] of Object.entries(LOCKFILES)) {
    if (files.includes(file)) items.push({ name, confidence: 0.95, source: file })
  }
  if (files.includes('package.json') && !items.some(i => ['npm', 'pnpm', 'yarn', 'bun'].includes(i.name))) {
    items.push({ name: 'npm', confidence: 0.55, source: 'package.json' })
  }
  return items.sort((a, b) => b.confidence - a.confidence)
}

function detectFrameworks(root: string, files: string[]): DetectedItem[] {
  const pkg = readPackageJson(root)
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) }
  const known: Record<string, string> = {
    react: 'react',
    next: 'next',
    vue: 'vue',
    svelte: 'svelte',
    express: 'express',
    fastify: 'fastify',
    '@nestjs/core': 'nestjs',
    django: 'django',
    flask: 'flask',
    laravel: 'laravel',
    rails: 'rails',
  }
  const items: DetectedItem[] = []
  for (const [dep, name] of Object.entries(known)) {
    if (dep in deps) items.push({ name, confidence: 0.9, source: 'package.json' })
  }
  if (files.includes('manage.py')) items.push({ name: 'django', confidence: 0.85, source: 'manage.py' })
  if (files.includes('artisan')) items.push({ name: 'laravel', confidence: 0.85, source: 'artisan' })
  if (files.includes('config/routes.rb')) items.push({ name: 'rails', confidence: 0.85, source: 'config/routes.rb' })
  return dedupeDetected(items)
}

function detectWorkspaces(root: string, files: string[]): ProjectWorkspace[] {
  const rootPkg = readPackageJson(root)
  const rootDeclaresWorkspaces = Boolean(rootPkg?.workspaces) || files.includes('pnpm-workspace.yaml')
  const manifests = files.filter(file => {
    const base = basename(file)
    return dirname(file) !== '.'
      && (base in MANIFESTS || base.endsWith('.csproj') || base.endsWith('.sln'))
  })
  const byPath = new Map<string, string[]>()
  for (const manifest of manifests) {
    const dir = dirname(manifest).replace(/\\/g, '/')
    const list = byPath.get(dir) ?? []
    list.push(manifest)
    byPath.set(dir, list)
  }

  return [...byPath.entries()]
    .map(([path]) => {
      const scopedFiles = files
        .filter(file => file.startsWith(`${path}/`))
        .map(file => file.slice(path.length + 1))
      const scopedSignals = collectSignals(join(root, path), scopedFiles)
      const pkg = readPackageJson(root, path)
      const commands = detectCommands(root, files, path)
      return {
        name: pkg?.name ?? path,
        path,
        kind: rootDeclaresWorkspaces ? 'workspace' : 'module',
        languages: rankDetectedItems(scopedSignals.filter(isLanguageSignal), 'language'),
        frameworks: detectFrameworks(join(root, path), scopedFiles),
        packageManagers: detectPackageManagers(scopedFiles).length > 0
          ? detectPackageManagers(scopedFiles)
          : detectPackageManagers(files),
        buildCommands: commands.build,
        testCommands: commands.test,
        lintCommands: commands.lint,
        typecheckCommands: commands.typecheck,
        confidence: calculateConfidence(scopedSignals, commands),
      } satisfies ProjectWorkspace
    })
    .filter(workspace => workspace.confidence >= 0.2 || workspace.buildCommands.length + workspace.testCommands.length > 0)
    .sort((a, b) => b.confidence - a.confidence)
}

function mergeWorkspaceCommands(rootCommands: CommandBuckets, workspaces: ProjectWorkspace[]): CommandBuckets {
  const merged: CommandBuckets = {
    build: [...rootCommands.build],
    test: [...rootCommands.test],
    lint: [...rootCommands.lint],
    typecheck: [...rootCommands.typecheck],
  }
  for (const workspace of workspaces) {
    merged.build.push(...workspace.buildCommands)
    merged.test.push(...workspace.testCommands)
    merged.lint.push(...workspace.lintCommands)
    merged.typecheck.push(...workspace.typecheckCommands)
  }
  return {
    build: dedupeCommands(merged.build),
    test: dedupeCommands(merged.test),
    lint: dedupeCommands(merged.lint),
    typecheck: dedupeCommands(merged.typecheck),
  }
}

function detectCommands(root: string, files: string[], scope = ''): CommandBuckets {
  const build: CommandCandidate[] = []
  const test: CommandCandidate[] = []
  const lint: CommandCandidate[] = []
  const typecheck: CommandCandidate[] = []
  const scopedFiles = scope
    ? files.filter(file => file.startsWith(`${scope}/`)).map(file => file.slice(scope.length + 1))
    : files
  const add = (bucket: CommandCandidate[], command: string, source: CommandCandidate['source'], confidence: number): void => {
    if (!bucket.some(item => item.command === command && item.scope === (scope || undefined))) {
      bucket.push({ command, source, confidence, safeToRun: isSafeCommand(command), ...(scope ? { scope } : {}) })
    }
  }

  const pkg = readPackageJson(root, scope)
  if (pkg?.scripts) {
    const runner = detectNodeRunner(files, scope)
    const source: CommandCandidate['source'] = scope ? 'workspace_manifest' : 'manifest'
    if (pkg.scripts.build) add(build, nodeRunCommand(runner, 'build', scope), source, 0.95)
    if (pkg.scripts.test) add(test, nodeRunCommand(runner, 'test', scope), source, 0.95)
    if (pkg.scripts.lint) add(lint, nodeRunCommand(runner, 'lint', scope), source, 0.95)
    if (pkg.scripts.typecheck) add(typecheck, nodeRunCommand(runner, 'typecheck', scope), source, 0.95)
    if (pkg.scripts.check) add(typecheck, nodeRunCommand(runner, 'check', scope), source, 0.8)
  }

  if (scopedFiles.includes('go.mod')) {
    add(build, 'go build ./...', 'adapter_default', 0.82)
    add(test, 'go test ./...', 'adapter_default', 0.85)
    add(lint, 'go vet ./...', 'adapter_default', 0.7)
  }
  if (scopedFiles.includes('Cargo.toml')) {
    add(build, 'cargo build', 'adapter_default', 0.82)
    add(test, 'cargo test', 'adapter_default', 0.85)
    add(typecheck, 'cargo check', 'adapter_default', 0.8)
    add(lint, 'cargo clippy -- -D warnings', 'adapter_default', 0.65)
  }
  if (scopedFiles.includes('pyproject.toml') || scopedFiles.includes('requirements.txt')) {
    add(test, 'pytest', 'adapter_default', 0.75)
    add(lint, 'ruff check .', 'adapter_default', 0.65)
  }
  if (scopedFiles.includes('pom.xml')) {
    add(build, 'mvn compile -q', 'adapter_default', 0.8)
    add(test, 'mvn test -q', 'adapter_default', 0.82)
  }
  if (scopedFiles.includes('build.gradle') || scopedFiles.includes('build.gradle.kts')) {
    add(build, './gradlew build', 'adapter_default', 0.8)
    add(test, './gradlew test', 'adapter_default', 0.82)
  }
  if (scopedFiles.some(file => file.endsWith('.csproj'))) {
    add(build, 'dotnet build', 'adapter_default', 0.8)
    add(test, 'dotnet test', 'adapter_default', 0.82)
  }
  if (scopedFiles.includes('Makefile')) {
    const targets = parseMakeTargets(root, scope)
    if (targets.has('build')) add(build, 'make build', 'makefile', 0.78)
    if (targets.has('test')) add(test, 'make test', 'makefile', 0.78)
    if (targets.has('lint')) add(lint, 'make lint', 'makefile', 0.68)
    if (targets.has('typecheck')) add(typecheck, 'make typecheck', 'makefile', 0.68)
  }
  if (scopedFiles.includes('Taskfile.yml') || scopedFiles.includes('Taskfile.yaml')) {
    const tasks = parseNamedTasks(root, scope, scopedFiles.includes('Taskfile.yml') ? 'Taskfile.yml' : 'Taskfile.yaml')
    if (tasks.has('build')) add(build, 'task build', 'taskfile', 0.72)
    if (tasks.has('test')) add(test, 'task test', 'taskfile', 0.72)
    if (tasks.has('lint')) add(lint, 'task lint', 'taskfile', 0.62)
    if (tasks.has('typecheck')) add(typecheck, 'task typecheck', 'taskfile', 0.62)
  }
  if (scopedFiles.includes('justfile')) {
    const recipes = parseJustRecipes(root, scope)
    if (recipes.has('build')) add(build, 'just build', 'taskfile', 0.72)
    if (recipes.has('test')) add(test, 'just test', 'taskfile', 0.72)
    if (recipes.has('lint')) add(lint, 'just lint', 'taskfile', 0.62)
    if (recipes.has('typecheck')) add(typecheck, 'just typecheck', 'taskfile', 0.62)
  }
  for (const candidate of detectCiCommands(root, scopedFiles, scope)) {
    add(bucketForCommand(candidate.kind, { build, test, lint, typecheck }), candidate.command, 'ci', candidate.confidence)
  }
  for (const candidate of detectReadmeCommands(root, scopedFiles, scope)) {
    add(bucketForCommand(candidate.kind, { build, test, lint, typecheck }), candidate.command, 'readme', candidate.confidence)
  }

  return { build, test, lint, typecheck }
}

function detectFileReferences(files: string[], kind: ProjectFileReference['kind']): ProjectFileReference[] {
  return files
    .filter(file => {
      const base = basename(file)
      if (kind === 'ci') return CI_FILES.includes(file) || /^\.github\/workflows\/.+\.ya?ml$/.test(file)
      if (kind === 'container') return CONTAINER_FILES.includes(base) || CONTAINER_FILES.includes(file)
      if (kind === 'task_runner') return TASK_RUNNER_FILES.includes(base)
      if (kind === 'instruction') return isInstructionFile(file)
      return isSensitiveProjectFile(file)
    })
    .sort()
    .map(path => ({ path, kind, confidence: kind === 'sensitive' ? 0.95 : 0.85 }))
}

function detectProjectKind(
  files: string[],
  languages: DetectedItem[],
  workspaces: ProjectWorkspace[],
): ProjectKind {
  if (files.length === 0) return 'empty'
  if (workspaces.length > 0) return 'monorepo'
  if (languages.length === 0) return 'generic_unknown'
  return 'existing'
}

function detectProjectTraits(
  languages: DetectedItem[],
  validations: ProjectValidation[],
  ci: ProjectFileReference[],
  containers: ProjectFileReference[],
  taskRunners: ProjectFileReference[],
  sensitiveFiles: ProjectFileReference[],
): ProjectTrait[] {
  const traits: ProjectTrait[] = []
  if (languages.length > 1) traits.push('multi_stack')
  if (ci.length > 0) traits.push('has_ci')
  if (containers.length > 0) traits.push('has_containers')
  if (taskRunners.length > 0) traits.push('has_task_runners')
  if (sensitiveFiles.length > 0) traits.push('has_sensitive_files')
  const available = validations.filter(item => item.available)
  if (available.length === 0) traits.push('no_validation')
  else {
    traits.push('has_validation')
    if (!available.some(item => item.kind === 'test') || !available.some(item => item.kind === 'build')) {
      traits.push('partial_validation')
    }
  }
  return traits
}

function detectObservations(
  files: string[],
  projectKind: ProjectKind,
  traits: ProjectTrait[],
  languages: DetectedItem[],
  workspaces: ProjectWorkspace[],
  validations: ProjectValidation[],
  sensitiveFiles: ProjectFileReference[],
): string[] {
  const observations: string[] = []
  if (projectKind === 'empty') observations.push('Project is empty; no stack or validation command was inferred.')
  if (projectKind === 'generic_unknown') observations.push('Project files exist, but no known language manifest or source signal was strong enough.')
  if (traits.includes('multi_stack')) observations.push(`Multiple languages detected: ${languages.map(item => item.name).join(', ')}.`)
  if (projectKind === 'monorepo') observations.push(`${workspaces.length} workspace/module candidate(s) detected.`)
  if (validations.filter(item => item.available).length === 0) observations.push('No runnable validation command was detected.')
  if (sensitiveFiles.length > 0) observations.push(`${sensitiveFiles.length} sensitive-looking file(s) detected and excluded from context reads.`)
  if (files.some(file => /^\.github\/workflows\/.+\.ya?ml$/.test(file) || CI_FILES.includes(file))) observations.push('CI configuration detected.')
  if (files.some(file => CONTAINER_FILES.includes(basename(file)) || CONTAINER_FILES.includes(file))) observations.push('Container configuration detected.')
  return observations
}

function bucketForCommand(kind: ValidationCommandKind, buckets: CommandBuckets): CommandCandidate[] {
  return buckets[kind]
}

function parseMakeTargets(root: string, scope: string): Set<string> {
  const content = readSmallTextFile(join(root, scope, 'Makefile'))
  const targets = new Set<string>()
  for (const line of content.split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_.-]+)\s*:(?![=])/.exec(line)
    if (match) targets.add(match[1])
  }
  return targets
}

function parseNamedTasks(root: string, scope: string, file: string): Set<string> {
  const content = readSmallTextFile(join(root, scope, file))
  const tasks = new Set<string>()
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s{2}([A-Za-z0-9_.-]+)\s*:/.exec(line)
    if (match) tasks.add(match[1])
  }
  return tasks
}

function parseJustRecipes(root: string, scope: string): Set<string> {
  const content = readSmallTextFile(join(root, scope, 'justfile'))
  const recipes = new Set<string>()
  for (const line of content.split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_.-]+)\s*:/.exec(line)
    if (match) recipes.add(match[1])
  }
  return recipes
}

function detectCiCommands(
  root: string,
  files: string[],
  scope: string,
): Array<{ kind: ValidationCommandKind; command: string; confidence: number }> {
  const candidates: Array<{ kind: ValidationCommandKind; command: string; confidence: number }> = []
  for (const file of files.filter(file => CI_FILES.includes(file) || /^\.github\/workflows\/.+\.ya?ml$/.test(file))) {
    for (const command of extractCommandsFromText(readSmallTextFile(join(root, scope, file)))) {
      const kind = classifyValidationCommand(command)
      if (kind) candidates.push({ kind, command, confidence: 0.65 })
    }
  }
  return candidates
}

function detectReadmeCommands(
  root: string,
  files: string[],
  scope: string,
): Array<{ kind: ValidationCommandKind; command: string; confidence: number }> {
  const candidates: Array<{ kind: ValidationCommandKind; command: string; confidence: number }> = []
  for (const file of files.filter(file => /^readme(\.[a-z]+)?$/i.test(basename(file)))) {
    for (const command of extractCommandsFromText(readSmallTextFile(join(root, scope, file)))) {
      const kind = classifyValidationCommand(command)
      if (kind) candidates.push({ kind, command, confidence: 0.45 })
    }
  }
  return candidates
}

function extractCommandsFromText(content: string): string[] {
  const commands = new Set<string>()
  const add = (text: string): void => {
    const command = text
      .replace(/^[-*]\s+/, '')
      .replace(/^run:\s*/, '')
      .replace(/^`+|`+$/g, '')
      .trim()
    if (!command || command.startsWith('#')) return
    if (/^(npm|pnpm|yarn|bun|go|cargo|pytest|ruff|mvn|gradle|\.\/gradlew|dotnet|make|task|just|python)\b/.test(command)) {
      commands.add(command)
    }
  }
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    add(line)
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      add(match[1])
    }
  }
  return [...commands]
}

function classifyValidationCommand(command: string): ValidationCommandKind | null {
  const text = command.toLowerCase()
  if (/\b(test|pytest|unittest|vitest|jest|go test|cargo test|dotnet test|mvn test)\b/.test(text)) return 'test'
  if (/\b(lint|ruff check|clippy|vet)\b/.test(text)) return 'lint'
  if (/\b(typecheck|type-check|tsc --noemit|cargo check)\b/.test(text)) return 'typecheck'
  if (/\b(build|compile|mvn compile|go build|cargo build|dotnet build)\b/.test(text)) return 'build'
  return null
}

function detectValidations(commands: CommandBuckets, workspaces: ProjectWorkspace[]): ProjectValidation[] {
  const validations: ProjectValidation[] = []
  const add = (kind: ProjectValidation['kind'], command: CommandCandidate): void => {
    validations.push({
      kind,
      command: command.command,
      source: command.source,
      confidence: command.confidence,
      safeToRun: command.safeToRun,
      scope: command.scope ?? 'root',
      available: true,
    })
  }
  for (const command of commands.build) add('build', command)
  for (const command of commands.test) add('test', command)
  for (const command of commands.lint) add('lint', command)
  for (const command of commands.typecheck) add('typecheck', command)

  if (workspaces.length > 0 && validations.length === 0) {
    validations.push({
      kind: 'architecture',
      source: 'config',
      confidence: 0.4,
      safeToRun: true,
      scope: 'root',
      available: false,
    })
  }
  return validations
}

function detectRisks(
  files: string[],
  languages: DetectedItem[],
  commands: CommandBuckets,
  validations: ProjectValidation[],
  sensitiveFiles: ProjectFileReference[],
): ProjectRisk[] {
  const risks: ProjectRisk[] = []
  if (sensitiveFiles.length > 0) {
    risks.push({
      kind: 'sensitive_files',
      severity: 'high',
      message: 'Sensitive-looking files exist and must not be attached to model context or edited automatically.',
      evidence: sensitiveFiles.map(file => file.path),
    })
  }
  if (validations.filter(item => item.available).length === 0) {
    risks.push({
      kind: 'no_validation',
      severity: 'medium',
      message: 'No deterministic build, test, lint, or typecheck command was detected.',
      evidence: [],
    })
  } else if (commands.test.length === 0 || commands.build.length === 0) {
    risks.push({
      kind: 'partial_validation',
      severity: 'medium',
      message: 'Only partial validation commands were detected; auto-apply should require review.',
      evidence: validations.map(item => item.command).filter((command): command is string => Boolean(command)),
    })
  }
  const unsafe = [...commands.build, ...commands.test, ...commands.lint, ...commands.typecheck].filter(command => !command.safeToRun)
  if (unsafe.length > 0) {
    risks.push({
      kind: 'unsafe_command',
      severity: 'high',
      message: 'Some detected commands require approval before running.',
      evidence: unsafe.map(command => command.command),
    })
  }
  if (languages.length > 1) {
    risks.push({
      kind: 'multi_stack',
      severity: 'low',
      message: 'Multiple languages were detected; validation and context should stay scoped to the affected area.',
      evidence: languages.map(item => `${item.name}:${item.source}`),
    })
  }
  if (files.length > 1_000) {
    risks.push({
      kind: 'large_project',
      severity: 'medium',
      message: 'Large project detected; avoid broad context loading and validate by module first.',
      evidence: [`${files.length} scanned files`],
    })
  }
  return risks
}

function detectEntrypoints(files: string[]): string[] {
  return files.filter(file => [
    'src/main.ts', 'src/index.ts', 'index.ts', 'main.py', 'app.py',
    'cmd/api/main.go', 'cmd/server/main.go', 'src/main.rs', 'Program.cs',
  ].includes(file) || /(^|\/)main\.(go|rs|java|kt|swift|dart)$/.test(file)).slice(0, 12)
}

function detectArchitectureHints(files: string[]): string[] {
  const hints: string[] = []
  for (const dir of ['apps', 'packages', 'src', 'internal', 'pkg', 'cmd', 'tests', 'docs']) {
    if (files.some(file => file.startsWith(`${dir}/`))) hints.push(`${dir}/*`)
  }
  return hints
}

function calculateConfidence(
  signals: ProjectSignal[],
  commands: ReturnType<typeof detectCommands>,
): number {
  const manifestStrength = Math.min(0.7, signals.filter(s => s.kind === 'manifest').reduce((sum, s) => sum + s.confidence, 0) / 4)
  const commandStrength = [commands.build, commands.test, commands.lint].filter(items => items.length > 0).length * 0.08
  const sourceStrength = signals.some(s => s.kind === 'source_file') ? 0.1 : 0
  return Math.min(0.99, Number((manifestStrength + commandStrength + sourceStrength).toFixed(2)))
}

function readPackageJson(root: string, scope = ''): PackageJson | null {
  const path = join(root, scope, 'package.json')
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as PackageJson
  } catch {
    return null
  }
}

function readSmallTextFile(path: string): string {
  try {
    if (!existsSync(path) || statSync(path).size > 300_000) return ''
    return readFileSync(path, 'utf-8')
  } catch {
    return ''
  }
}

function detectNodeRunner(files: string[], scope = ''): 'pnpm' | 'yarn' | 'bun' | 'npm' {
  const scoped = (file: string) => scope ? `${scope}/${file}` : file
  if (files.includes(scoped('pnpm-lock.yaml')) || files.includes('pnpm-lock.yaml')) return 'pnpm'
  if (files.includes(scoped('yarn.lock')) || files.includes('yarn.lock')) return 'yarn'
  if (files.includes(scoped('bun.lockb')) || files.includes('bun.lockb')) return 'bun'
  return 'npm'
}

function nodeRunCommand(runner: 'pnpm' | 'yarn' | 'bun' | 'npm', script: string, scope = ''): string {
  if (!scope) return `${runner} run ${script}`
  if (runner === 'npm') return `npm --prefix ${scope} run ${script}`
  if (runner === 'yarn') return `yarn --cwd ${scope} run ${script}`
  return `${runner} --dir ${scope} run ${script}`
}

function dedupeCommands(commands: CommandCandidate[]): CommandCandidate[] {
  const map = new Map<string, CommandCandidate>()
  for (const command of commands) {
    const key = `${command.scope ?? 'root'}:${command.command}`
    const existing = map.get(key)
    if (!existing || command.confidence > existing.confidence) map.set(key, command)
  }
  return [...map.values()].sort((a, b) => b.confidence - a.confidence)
}

function isInstructionFile(file: string): boolean {
  const base = basename(file)
  return ['KOVA.md', 'AGENTS.md', 'CLAUDE.md', 'RULES.md'].includes(base)
    || /^\.kova\/rules\/.+\.md$/.test(file)
}

function isSensitiveProjectFile(file: string): boolean {
  const base = basename(file).toLowerCase()
  if (base === '.env.example') return false
  return base === '.env'
    || base.startsWith('.env.')
    || base.endsWith('.env')
    || base.includes('.env.')
    || base.endsWith('.pem')
    || base.endsWith('.key')
    || base.endsWith('.p12')
    || base === 'id_rsa'
    || base === 'id_dsa'
    || base.includes('secret')
    || base.includes('kubeconfig')
}

function listMarkdownFiles(dir: string): string[] {
  try {
    return readdirSync(dir).filter(file => file.endsWith('.md')).sort()
  } catch {
    return []
  }
}

function isSourceCandidate(root: string, file: string): boolean {
  try {
    return statSync(join(root, file)).size <= 200_000
  } catch {
    return false
  }
}

function extensionOf(file: string): string {
  const name = basename(file)
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(index) : ''
}

function dedupeDetected(items: DetectedItem[]): DetectedItem[] {
  const map = new Map<string, DetectedItem>()
  for (const item of items) {
    const existing = map.get(item.name)
    if (!existing || item.confidence > existing.confidence) map.set(item.name, item)
  }
  return [...map.values()].sort((a, b) => b.confidence - a.confidence)
}

function isSafeCommand(command: string): boolean {
  const text = command.toLowerCase()
  return ![
    'rm -rf', 'sudo ', 'git push', 'git reset --hard', 'git clean -f',
    'curl |', 'wget |', 'npm publish', 'pnpm publish', 'docker system prune',
  ].some(blocked => text.includes(blocked))
}
