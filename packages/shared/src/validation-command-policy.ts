export type CommandFragility = 'safe' | 'fragile' | 'blocked'

export interface ExtractedInlineScript {
  body: string
  extension: 'js' | 'py'
  runner: 'node' | 'python'
}

const VALIDATION_TEMP_PREFIX = '.kova/tmp/validation/'

const DANGEROUS_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\brm\s+-r\b/i,
  /\bsudo\b/i,
  /\bgit\s+push\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\beval\b/i,
  /\bdd\s+if=/i,
]

const INTERACTIVE_COMMANDS: Array<{ exe: string; sub: string; third?: string }> = [
  { exe: 'gh', sub: 'auth', third: 'login' },
  { exe: 'gh', sub: 'auth', third: 'refresh' },
  { exe: 'npm', sub: 'login' },
  { exe: 'pnpm', sub: 'login' },
  { exe: 'yarn', sub: 'login' },
  { exe: 'docker', sub: 'login' },
]

const JS_STACKS = new Set(['javascript', 'typescript', 'html', 'css', 'react', 'vue', 'svelte'])
const PY_STACKS = new Set(['python'])

const GENERIC_PLACEHOLDER_FRAGMENTS = [
  'prepare a concrete implementation plan from the request',
  'validate the affected behavior',
  'no specific files identified',
]

export function isValidationTempPath(path: string): boolean {
  const normalized = path.replace(/\\/g, '/').replace(/^\.\/+/, '').toLowerCase()
  return normalized.startsWith(VALIDATION_TEMP_PREFIX)
    || normalized.includes(`/${VALIDATION_TEMP_PREFIX}`)
}

export function isGenericPlanPlaceholder(text: string): boolean {
  const lowered = text.trim().toLowerCase()
  if (!lowered) return true
  return GENERIC_PLACEHOLDER_FRAGMENTS.some(fragment => lowered.includes(fragment))
}

export function classifyCommandFragility(command: string): CommandFragility {
  const trimmed = command.trim()
  if (!trimmed) return 'blocked'

  if (findShellMeta(trimmed)) return 'blocked'
  if (DANGEROUS_PATTERNS.some(pattern => pattern.test(trimmed))) return 'blocked'

  const parsed = parseCommandTokens(trimmed)
  if (!parsed.ok) return 'blocked'

  if (isInteractiveTokens(parsed.tokens)) return 'blocked'

  if (isFragileCommand(trimmed, parsed.tokens)) return 'fragile'
  return 'safe'
}

export function extractInlineScript(command: string, stackAdapter?: string): ExtractedInlineScript | null {
  const trimmed = command.trim()
  const parsed = parseCommandTokens(trimmed)
  if (!parsed.ok || parsed.tokens.length < 3) return null

  const exe = normalizeExecutable(parsed.tokens[0])
  const flag = parsed.tokens[1].toLowerCase()

  if (exe === 'node' && (flag === '-e' || flag === '--eval')) {
    if (!supportsJsStack(stackAdapter)) return null
    const body = parsed.tokens.slice(2).join(' ')
    if (!body.trim()) return null
    return { body: unquoteToken(body), extension: 'js', runner: 'node' }
  }

  if (exe === 'python' || exe === 'python3') {
    if (flag === '-c' && supportsPyStack(stackAdapter)) {
      const body = parsed.tokens.slice(2).join(' ')
      if (!body.trim()) return null
      return { body: unquoteToken(body), extension: 'py', runner: 'python' }
    }
  }

  return null
}

function supportsJsStack(stackAdapter?: string): boolean {
  if (!stackAdapter) return true
  const key = stackAdapter.toLowerCase()
  return JS_STACKS.has(key) || key.includes('script') || key.includes('node')
}

function supportsPyStack(stackAdapter?: string): boolean {
  if (!stackAdapter) return false
  return PY_STACKS.has(stackAdapter.toLowerCase())
}

function isFragileCommand(command: string, tokens: string[]): boolean {
  if (command.length > 200) return true
  if (command.includes('`')) return true

  const exe = normalizeExecutable(tokens[0])
  const flag = (tokens[1] ?? '').toLowerCase()
  if (exe === 'node' && (flag === '-e' || flag === '--eval')) {
    const script = tokens.slice(2).join(' ')
    if (script.length > 80) return true
    if ((script.match(/\\/g) ?? []).length >= 4) return true
    if (/\.replace\s*\(\s*\/[^/]+\/[gimsuy]*/.test(script)) return true
    if ((script.match(/['"]/g) ?? []).length >= 6) return true
  }

  return false
}

function isInteractiveTokens(tokens: string[]): boolean {
  const exe = normalizeExecutable(tokens[0])
  const sub = (tokens[1] ?? '').toLowerCase()
  const third = (tokens[2] ?? '').toLowerCase()
  return INTERACTIVE_COMMANDS.some(entry =>
    entry.exe === exe
    && entry.sub === sub
    && (entry.third === undefined || entry.third === third),
  )
}

function findShellMeta(command: string): string | null {
  let quote: '"' | "'" | null = null
  for (let i = 0; i < command.length; i++) {
    const ch = command[i]
    if (quote) {
      if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '|' || ch === '>' || ch === '<' || ch === '`') return ch
    if (ch === ';') return ';'
    if (ch === '&' && command[i + 1] === '&') return '&&'
    if (ch === '$' && command[i + 1] === '(') return '$()'
  }
  return null
}

function parseCommandTokens(command: string): { ok: true; tokens: string[] } | { ok: false } {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  for (let i = 0; i < command.length; i++) {
    const ch = command[i]
    if (quote) {
      if (ch === quote) quote = null
      else current += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }
    current += ch
  }
  if (quote) return { ok: false }
  if (current) tokens.push(current)
  return { ok: true, tokens }
}

function normalizeExecutable(value: string): string {
  const base = value.replace(/\\/g, '/').split('/').pop() ?? value
  return base.replace(/\.(?:cmd|exe|bat)$/i, '').toLowerCase()
}

function unquoteToken(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}
