import type { ContractViolation, ExecutionContract, FileChange, HarnessError, HarnessResult, TaskDefinition } from '@kova/shared'

const DEFAULT_FORBIDDEN_PATHS = [
  'node_modules/**',
  'dist/**',
  'out/**',
  '.git/**',
]

const DEFAULT_SAFE_ZONES = [
  '.env',
  '.env.*',
  '.github/**',
  'docker-compose*',
  'package.json',
  '*-lock.yaml',
  '*-lock.json',
  '*.lock',
]

// Extensions allowed per stack — empty means allow all (generic)
const STACK_EXTENSIONS: Record<string, string[]> = {
  go:         ['.go', '.mod', '.sum', '.md', '.yaml', '.yml', '.sh', '.txt', ''],
  python:     ['.py', '.toml', '.txt', '.md', '.yaml', '.yml', '.sh', '.cfg', '.ini', '.pyi', ''],
  typescript: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.css', '.scss', '.less', '.html', '.yaml', '.yml', '.sh', '.env', ''],
  javascript: ['.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.css', '.html', '.yaml', '.yml', '.sh', ''],
  rust:       ['.rs', '.toml', '.lock', '.md', '.yaml', '.yml', '.sh', ''],
  java:       ['.java', '.xml', '.gradle', '.kts', '.properties', '.md', '.yaml', '.yml', '.sh', ''],
  kotlin:     ['.kt', '.kts', '.xml', '.gradle', '.properties', '.md', '.yaml', '.yml', ''],
  csharp:     ['.cs', '.csproj', '.sln', '.xml', '.config', '.json', '.md', '.yaml', ''],
  ruby:       ['.rb', '.rake', '.gemspec', '.ru', '.md', '.yml', '.yaml', ''],
  php:        ['.php', '.json', '.xml', '.yaml', '.yml', '.md', '.env', ''],
  swift:      ['.swift', '.xcconfig', '.plist', '.md', ''],
  dart:       ['.dart', '.yaml', '.md', ''],
  cpp:        ['.cpp', '.cc', '.cxx', '.c', '.h', '.hpp', '.cmake', '.txt', '.md', ''],
  c:          ['.c', '.h', '.md', '.mk', ''],
  generic:    [],
}

export function createExecutionContract(task: TaskDefinition): ExecutionContract {
  return {
    id: `contract-${task.id}`,
    taskId: task.id,
    objective: task.objective,
    stackAdapter: task.stackAdapter,
    allowedPaths: inferAllowedPaths(task),
    forbiddenPaths: DEFAULT_FORBIDDEN_PATHS,
    safeZones: DEFAULT_SAFE_ZONES,
    allowedCommands: [],
    forbiddenCommands: ['rm -rf', 'git reset --hard', 'git clean -f', 'git push', 'sudo ', 'curl |', 'wget |'],
    validationCriteria: task.validationCriteria,
    requiresTests: task.type === 'feature' || task.type === 'bugfix' || task.type === 'refactor',
    maxFilesChanged: task.impact === 'high' ? 20 : task.impact === 'medium' ? 12 : 6,
    createdAt: new Date().toISOString(),
  }
}

export function validateContractChanges(
  changes: FileChange[],
  contract: ExecutionContract,
): ContractViolation[] {
  const violations: ContractViolation[] = []

  if (changes.length > contract.maxFilesChanged) {
    violations.push({
      severity: 'medium',
      message: `Patch altera ${changes.length} arquivos; contrato permite ${contract.maxFilesChanged}`,
      file: '',
      rule: 'max_files_changed',
    })
  }

  for (const change of changes) {
    // Block truly forbidden paths (node_modules, dist, .git) regardless of type
    if (matchesAny(change.path, contract.forbiddenPaths)) {
      violations.push({
        severity: 'critical',
        message: `${change.path} está em path proibido`,
        file: change.path,
        rule: 'forbidden_path',
      })
      continue
    }

    // Safe zones: only block MODIFICATIONS, not new file creation
    // New projects legitimately need to create package.json, go.mod, etc.
    if (change.type !== 'create' && matchesAny(change.path, contract.safeZones)) {
      violations.push({
        severity: 'high',
        message: `${change.path} é safe zone — modificação exige revisão humana`,
        file: change.path,
        rule: 'safe_zone',
      })
    }

    // Stack extension mismatch — causes reject so the agent can retry with correct language
    if (!isStackCompatible(change.path, contract.stackAdapter)) {
      violations.push({
        severity: 'high',
        message: `${change.path} não é compatível com stack ${contract.stackAdapter}`,
        file: change.path,
        rule: 'stack_mismatch',
      })
    }

    // Paths outside the allowed scope
    if (!matchesAny(change.path, contract.allowedPaths)) {
      violations.push({
        severity: 'high',
        message: `${change.path} está fora do escopo permitido`,
        file: change.path,
        rule: 'allowed_paths',
      })
    }
  }

  return violations
}

export function contractViolationsToHarnessResult(
  violations: ContractViolation[],
  iteration: number,
): HarnessResult {
  const errors: HarnessError[] = violations.map(v => ({
    layer: 'rules',
    type: v.rule === 'safe_zone' ? 'security' : 'architecture',
    severity: v.severity,
    fixable: v.rule !== 'safe_zone' && v.rule !== 'forbidden_path',
    message: v.message,
    humanMessage: v.message,
    file: v.file,
    rule: v.rule,
  }))

  // Only hard-fail (score=0) for truly critical violations (forbidden paths)
  const hasCritical = violations.some(v => v.severity === 'critical')
  const hasHigh = violations.some(v => v.severity === 'high')
  const score = hasCritical ? 0 : hasHigh ? 45 : 70

  return {
    passed: !hasCritical && !hasHigh,
    score,
    duration: 0,
    iteration,
    layers: [{
      name: 'rules',
      passed: errors.length === 0,
      errors,
      warnings: [],
      duration: 0,
      skipped: false,
    }],
  }
}

function inferAllowedPaths(task: TaskDefinition): string[] {
  if (task.affectedFiles.length === 0) return ['**']
  const dirs = task.affectedFiles
    .map(p => p.replace(/\\/g, '/'))
    .map(p => p.includes('/') ? `${p.slice(0, p.lastIndexOf('/'))}/**` : p)
  const base = [...new Set([...task.affectedFiles, ...dirs])]
  // Always allow standard test file patterns so the agent can create tests
  // even when the test file lives outside the explicit affected-files directories.
  const testPatterns = ['**/__tests__/**', '**/*.test.*', '**/*.spec.*', '**/test/**', '**/tests/**']
  return [...base, ...testPatterns]
}

function isStackCompatible(path: string, stack: string): boolean {
  const allowed = STACK_EXTENSIONS[stack] ?? STACK_EXTENSIONS.generic
  if (allowed.length === 0) return true // generic = allow all
  if (path === 'Dockerfile' || path.endsWith('/Dockerfile')) return true
  if (path === 'Makefile' || path.endsWith('/Makefile')) return true
  const ext = extensionOf(path)
  return allowed.includes(ext)
}

function extensionOf(path: string): string {
  const name = path.split('/').pop() ?? path
  const idx = name.lastIndexOf('.')
  if (idx <= 0) return ''
  return name.slice(idx)
}

function matchesAny(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchGlob(path.replace(/\\/g, '/'), pattern))
}

function matchGlob(path: string, pattern: string): boolean {
  if (pattern === '**') return true
  if (path === pattern) return true
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]+')
    .replace(/\x00/g, '.*')
  return new RegExp(`^${escaped}$`).test(path)
}
