/**
 * Dogfood case constraint validator.
 *
 * Pure function: given the constraints declared by a dogfood case and the agent's actual
 * output (file changes + commands run), returns the list of violations.
 *
 * Used by the eval suite to gate regressions — when the user reports "Kova ran tsc on a
 * pure JS task", we encode the constraint here and never lose the protection.
 */

export interface DogfoodExpectations {
  /** Glob patterns the agent MUST NOT create or modify. */
  forbiddenPaths?: string[]
  /** Substrings the agent MUST NOT run (substring match — covers flag variations). */
  forbiddenCommands?: string[]
  /** Glob patterns where at least ONE matching change is required. */
  requiredPaths?: string[]
  /** When set, files outside this extension allow-list are violations. */
  allowedExtensions?: string[]
}

export type DogfoodViolationRule =
  | 'forbidden_path'
  | 'forbidden_command'
  | 'missing_required'
  | 'extension_not_allowed'

export interface DogfoodViolation {
  rule: DogfoodViolationRule
  evidence: string
  detail: string
}

export interface FileChangeRef {
  path: string
}

export function validateDogfoodOutput(
  expectations: DogfoodExpectations,
  changes: FileChangeRef[],
  commandsRun: string[],
): DogfoodViolation[] {
  const violations: DogfoodViolation[] = []
  const paths = changes.map(c => normalizePath(c.path))

  // Rule 1: forbidden_path — any change touching a forbidden pattern
  for (const path of paths) {
    for (const pattern of expectations.forbiddenPaths ?? []) {
      if (matchGlob(path, pattern)) {
        violations.push({
          rule: 'forbidden_path',
          evidence: path,
          detail: `Path matches forbidden pattern "${pattern}"`,
        })
        break // one violation per file is enough
      }
    }
  }

  // Rule 2: forbidden_command — ordered-token match (handles flags between tokens,
  // e.g. "npx tsx" matches "npx --yes tsx test/foo")
  for (const command of commandsRun) {
    for (const needle of expectations.forbiddenCommands ?? []) {
      if (commandContainsOrderedTokens(command, needle)) {
        violations.push({
          rule: 'forbidden_command',
          evidence: command,
          detail: `Command contains forbidden sequence "${needle}"`,
        })
        break
      }
    }
  }

  // Rule 3: missing_required — every required pattern must match at least one path
  for (const pattern of expectations.requiredPaths ?? []) {
    if (!paths.some(p => matchGlob(p, pattern))) {
      violations.push({
        rule: 'missing_required',
        evidence: pattern,
        detail: `No file matched the required pattern "${pattern}"`,
      })
    }
  }

  // Rule 4: extension_not_allowed — only matters when the allow-list is set
  if (expectations.allowedExtensions && expectations.allowedExtensions.length > 0) {
    for (const path of paths) {
      const ext = extensionOf(path)
      if (!expectations.allowedExtensions.includes(ext)) {
        violations.push({
          rule: 'extension_not_allowed',
          evidence: path,
          detail: `Extension "${ext}" not in allow-list`,
        })
      }
    }
  }

  return violations
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

function extensionOf(path: string): string {
  const name = path.split('/').pop() ?? path
  const idx = name.lastIndexOf('.')
  if (idx <= 0) return ''
  return name.slice(idx)
}

function commandContainsOrderedTokens(command: string, needle: string): boolean {
  const tokens = needle.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return false
  if (tokens.length === 1) return command.includes(tokens[0])
  let pos = 0
  for (const token of tokens) {
    const idx = command.indexOf(token, pos)
    if (idx === -1) return false
    pos = idx + token.length
  }
  return true
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
