export type CommandEnvironmentRule =
  | 'environment_missing'
  | 'environment_filesystem_access'

export interface CommandEnvironmentIssue {
  rule: CommandEnvironmentRule
  name: string
  matchedText: string
  humanMessage: string
  suggestion: string
}

interface MissingPattern {
  pattern: RegExp
  extractName: (match: RegExpMatchArray) => string
  hint: (name: string) => string
}

const MISSING_ENVIRONMENT_PATTERNS: MissingPattern[] = [
  {
    pattern: /['"]([^'"\n]+)['"][^\n]{0,40}(?:is\s+not\s+recognized|reconhecid[oa])/i,
    extractName: m => m[1],
    hint: name => `'${name}' is not on PATH. Install it (for example, run npm install for project tools) or use the project's package manager to populate node_modules.`,
  },
  {
    pattern: /command not found:\s*([^\s\n]+)/i,
    extractName: m => m[1],
    hint: name => `'${name}' is not on PATH. Install it or run the project's package manager install command.`,
  },
  {
    pattern: /(?:^|\n)(?:[a-z]+:\s+)?([^\s:]+):\s*command not found/i,
    extractName: m => m[1],
    hint: name => `'${name}' is not on PATH. Install it or run the project's package manager install command.`,
  },
  {
    pattern: /Cannot find module ['"]([^'"\n]+)['"]/,
    extractName: m => m[1],
    hint: name => `Node could not resolve '${name}'. Run npm install, pnpm install, or the project's package manager to install dependencies.`,
  },
  {
    pattern: /\b(?:MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND)\b/,
    extractName: () => 'a required module',
    hint: () => 'A required Node module is missing. Run npm install, pnpm install, or the project package manager to install dependencies.',
  },
  {
    pattern: /ModuleNotFoundError:\s*No module named ['"]([^'"\n]+)['"]/,
    extractName: m => m[1],
    hint: name => `Python could not import '${name}'. Run pip install ${name} in the active environment or use the project virtualenv.`,
  },
]

const EPERM_PATTERN = /\bEPERM:\s*operation not permitted,\s*(open|lstat|stat|unlink|rmdir|mkdir|rename)\s+['"]([^'"\n]+)['"]/i

export function classifyCommandEnvironmentIssue(output: string): CommandEnvironmentIssue | null {
  if (!output.trim()) return null

  const filesystemIssue = classifyFilesystemAccessIssue(output)
  if (filesystemIssue) return filesystemIssue

  for (const entry of MISSING_ENVIRONMENT_PATTERNS) {
    const match = output.match(entry.pattern)
    if (!match) continue
    const name = entry.extractName(match).trim()
    if (!name) continue
    const hint = entry.hint(name)
    return {
      rule: 'environment_missing',
      name,
      matchedText: match[0].trim(),
      humanMessage: hint,
      suggestion: hint,
    }
  }

  return null
}

function classifyFilesystemAccessIssue(output: string): CommandEnvironmentIssue | null {
  const match = output.match(EPERM_PATTERN)
  if (!match) return null

  const syscall = match[1].trim()
  const path = match[2].trim()
  const normalizedPath = path.replace(/\\/g, '/')
  const isNextTraceLock = /(^|\/)\.next\/trace$/i.test(normalizedPath)

  if (isNextTraceLock) {
    const humanMessage = `Next.js could not ${syscall} ${path}. On Windows this usually means .next/trace is locked by another Next/Node process or by the filesystem. Source edits will not fix this.`
    return {
      rule: 'environment_filesystem_access',
      name: '.next/trace',
      matchedText: match[0].trim(),
      humanMessage,
      suggestion: 'Stop active next dev/build Node processes, release the file lock, remove .next if needed, then rerun validation once. Do not keep retrying build or editing source for this lock error.',
    }
  }

  const humanMessage = `The OS denied filesystem access while trying to ${syscall} ${path}. This is an environment or permissions failure, not a source-code repair.`
  return {
    rule: 'environment_filesystem_access',
    name: path,
    matchedText: match[0].trim(),
    humanMessage,
    suggestion: 'Check file locks, antivirus/sync tools, permissions, or sandbox restrictions, then rerun validation after the environment is fixed.',
  }
}
