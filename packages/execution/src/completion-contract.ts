import type {
  CompletionProof,
  CompletionProofItem,
  CompletionRequirement,
  ExecutionEvent,
  FileChange,
  ServerSessionInfo,
  TaskDefinition,
} from '@kova/shared'

export interface CompletionTrace {
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>
  toolResults: Array<{ name: string; result: string }>
  events: Array<Pick<ExecutionEvent, 'type' | 'toolName' | 'toolInput' | 'toolOutput' | 'message' | 'serverSession'>>
}

export function buildCompletionProof(
  task: TaskDefinition,
  changes: FileChange[],
  trace: CompletionTrace,
  thought: string,
): CompletionProof {
  const requirements = inferCompletionRequirements(task.objective, thought)
  const changedFiles = changes.map(change => normalizeProjectPath(change.path))
  const commandsRun = trace.toolCalls
    .filter(call => call.name === 'run_command' || call.name === 'run_interactive_command')
    .map(call => String(call.input.command ?? '').trim())
    .filter(Boolean)
  const validationsRun = commandsRun.filter(isValidationCommand)
  const serverSessions = extractServerSessions(trace)
  const claims = extractClaims(thought)
  const items = requirements.map(req => evaluateRequirement(req, { changedFiles, commandsRun, validationsRun, serverSessions, claims }, changes))

  return {
    requirements,
    items,
    changedFiles,
    commandsRun,
    validationsRun,
    serverSessions,
    claims,
  }
}

export function inferCompletionRequirements(objective: string, thought = ''): CompletionRequirement[] {
  const requirements: CompletionRequirement[] = []
  const seen = new Set<string>()
  const add = (kind: CompletionRequirement['kind'], value: string, label: string, source: CompletionRequirement['source'], required = true) => {
    const normalized = value.trim()
    if (!normalized) return
    const id = `${kind}:${normalized.toLowerCase()}`
    if (seen.has(id)) return
    seen.add(id)
    requirements.push({ id, kind, value: normalized, label, source, required })
  }

  for (const path of extractExplicitRequiredPaths(objective)) {
    add('file', path, `Required file ${path}`, 'user_request')
  }
  for (const command of extractRequestedCommands(objective)) {
    add(isDevServerCommand(command) ? 'dev_server' : 'command', command, `Requested command ${command}`, 'user_request')
  }
  if (isFrontendCreationObjective(objective)) {
    add(
      'artifact_quality',
      'frontend_landing_page',
      'Frontend page must be complete, styled, responsive, and relevant to the requested product',
      'contract',
    )
  }
  for (const claim of extractClaims(thought)) {
    if (/build|test|lint|typecheck|validat/i.test(claim)) add('validation', claim, `Claimed validation: ${claim}`, 'agent_claim')
    else if (/server|servidor|localhost|porta|port/i.test(claim)) add('dev_server', claim, `Claimed server: ${claim}`, 'agent_claim')
    else add('claim', claim, `Claimed work: ${claim}`, 'agent_claim', false)
  }

  return requirements
}

function evaluateRequirement(
  req: CompletionRequirement,
  proof: Pick<CompletionProof, 'changedFiles' | 'commandsRun' | 'validationsRun' | 'serverSessions' | 'claims'>,
  changes: FileChange[],
): CompletionProofItem {
  if (req.kind === 'file') {
    const satisfied = proof.changedFiles.includes(normalizeProjectPath(req.value))
    return {
      requirementId: req.id,
      satisfied,
      evidence: satisfied ? req.value : undefined,
      fixable: true,
      blocking: req.required,
      reason: satisfied ? undefined : `Required file was not produced: ${req.value}`,
    }
  }

  if (req.kind === 'command') {
    const matched = proof.commandsRun.find(command => commandMatches(command, req.value))
    return {
      requirementId: req.id,
      satisfied: !!matched,
      evidence: matched,
      fixable: true,
      blocking: req.required,
      reason: matched ? undefined : `Requested command was not executed: ${req.value}`,
    }
  }

  if (req.kind === 'validation') {
    const matched = proof.validationsRun.find(command => commandMatches(command, req.value)) ?? proof.validationsRun[0]
    return {
      requirementId: req.id,
      satisfied: !!matched,
      evidence: matched,
      fixable: true,
      blocking: req.required,
      reason: matched ? undefined : `Agent claimed validation but no validation command ran: ${req.value}`,
    }
  }

  if (req.kind === 'dev_server') {
    const ready = proof.serverSessions.find(session => session.ready)
    return {
      requirementId: req.id,
      satisfied: !!ready,
      evidence: ready?.url ?? ready?.command,
      fixable: true,
      blocking: req.required,
      reason: ready ? undefined : `Dev server was requested or claimed but no ready persistent session was proven: ${req.value}`,
    }
  }

  if (req.kind === 'artifact_quality') {
    const quality = evaluateFrontendArtifactQuality(changes)
    return {
      requirementId: req.id,
      satisfied: quality.passed,
      evidence: quality.evidence,
      fixable: true,
      blocking: req.required,
      reason: quality.passed ? undefined : quality.reason,
    }
  }

  return {
    requirementId: req.id,
    satisfied: true,
    evidence: req.value,
    fixable: true,
    blocking: false,
  }
}

function extractRequestedCommands(text: string): string[] {
  const commands = new Set<string>()
  const patterns = [
    /\b(?:rode|roda|rodar|execute|executar|run)\s+(`?)(npm\s+install|pnpm\s+install|yarn\s+install|bun\s+install)\1/gi,
    /\b(?:rode|roda|rodar|execute|executar|run)\s+(`?)(npm\s+run\s+dev|pnpm\s+dev|yarn\s+dev|bun\s+dev|vite|next\s+dev|astro\s+dev)\1/gi,
    /\b(?:rode|roda|rodar|execute|executar|run)\s+(`?)(npm\s+run\s+build|pnpm\s+build|yarn\s+build|npm\s+test|pnpm\s+test|npm\s+run\s+test|pnpm\s+run\s+test)\1/gi,
    /`(npm\s+install|pnpm\s+install|yarn\s+install|bun\s+install|npm\s+run\s+dev|pnpm\s+dev|vite|next\s+dev|npm\s+run\s+build|npm\s+test|pnpm\s+test)`/gi,
    /\b(npm\s+install|pnpm\s+install|yarn\s+install|bun\s+install|npm\s+run\s+dev|pnpm\s+dev|yarn\s+dev|bun\s+dev|vite|next\s+dev|astro\s+dev|npm\s+run\s+build|pnpm\s+build|yarn\s+build|npm\s+test|pnpm\s+test|npm\s+run\s+test|pnpm\s+run\s+test)\b/gi,
  ]
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) commands.add((match[2] ?? match[1] ?? '').trim())
  }
  return [...commands]
}

function extractClaims(thought: string): string[] {
  if (!thought.trim()) return []
  const claims: string[] = []
  const sentences = thought.split(/(?<=[.!?])\s+|\n+/).map(line => line.trim()).filter(Boolean)
  for (const sentence of sentences) {
    if (/\b(ran|executed|rodei|executei|validei|validated|build passed|tests? passed|servidor|server|localhost|npm install|npm run dev)\b/i.test(sentence)) {
      claims.push(sentence.slice(0, 240))
    }
  }
  return claims.slice(0, 10)
}

function extractServerSessions(trace: CompletionTrace): ServerSessionInfo[] {
  const sessions: ServerSessionInfo[] = []
  for (const event of trace.events) {
    if (event.serverSession) sessions.push(event.serverSession)
  }
  for (const result of trace.toolResults.filter(item => item.name === 'run_interactive_command')) {
    const session = parseServerSessionFromToolResult(result.result)
    if (session) sessions.push(session)
  }
  return sessions
}

function parseServerSessionFromToolResult(result: string): ServerSessionInfo | null {
  if (!/Persistent command started/i.test(result)) return null
  const sessionId = result.match(/\((term-[^)]+)\)/)?.[1]
  const url = result.match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?[^\s]*/i)?.[0]
  const port = url?.match(/:(\d+)/)?.[1]
  const ready = parseReadyFlag(result)
  const diagnostics = result.match(/\bdiagnostics=([^\n]+)/i)?.[1]
    ?.split(',')
    .map(item => item.trim())
    .filter(Boolean)
  return {
    sessionId,
    command: 'run_interactive_command',
    cwd: '',
    persistent: true,
    ready,
    url,
    port: port ? Number(port) : undefined,
    diagnostics,
  }
}

function parseReadyFlag(result: string): boolean {
  const explicit = result.match(/\bready=(true|false)\b/i)?.[1]
  if (explicit) return explicit.toLowerCase() === 'true'
  return /\bready\b|\blocal:\s*https?:\/\/|localhost|127\.0\.0\.1/i.test(result)
}

function isFrontendCreationObjective(objective: string): boolean {
  return /\b(?:landing|site|website|pagina|p[aá]gina|frontend|home page|homepage|hero)\b/i.test(objective)
}

/**
 * Frontend artifact quality — stack-agnostic.
 *
 * The original heuristic required raw CSS signals (`@media`, `clamp()`,
 * `minmax()`) to prove responsiveness. That rejected valid output from
 * enterprise stacks: Tailwind, CSS-in-JS, framework components, container
 * queries, etc. New rules detect responsive intent across CSS, Tailwind,
 * styled-components, MUI/Chakra-style prop systems, AND raw CSS — matching
 * what Claude Code / Cursor / Codex produce in practice.
 *
 * The check is intentionally permissive on form (any responsive evidence
 * counts) but strict on substance (page structure + meaningful styling +
 * real content). False positives are acceptable — the agent already
 * produced something; the user reviews the diff.
 */
function evaluateFrontendArtifactQuality(
  changes: FileChange[],
): { passed: boolean; evidence?: string; reason?: string } {
  const relevant = changes.filter(
    change => /\.(?:html|css|scss|sass|less|js|jsx|ts|tsx|vue|svelte|astro|mjs)$/i.test(change.path)
      && change.type !== 'delete',
  )
  if (relevant.length === 0) {
    return { passed: false, reason: 'Frontend artifact produced no HTML/CSS/JS/TS files.' }
  }

  const content = relevant.map(change => change.diff ?? '').join('\n')
  const lowered = content.toLowerCase()
  const paths = relevant.map(change => change.path)

  const hasStructure = relevant.some(
    change => /\.(?:html|jsx|tsx|vue|svelte|astro)$/i.test(change.path),
  )
  const hasStyles = STYLING_SIGNAL_REGEX.test(content)
  const semanticHits = (lowered.match(SEMANTIC_LANDING_REGEX) ?? []).length
  const responsive = RESPONSIVE_SIGNAL_REGEX.test(content)
  const interactiveOrCta = CTA_SIGNAL_REGEX.test(content)
  const enoughSubstance = lowered.replace(/\s+/g, '').length >= 1200

  const missing: string[] = []
  if (!hasStructure) missing.push('page structure')
  if (!hasStyles) missing.push('real styling')
  if (semanticHits < 4) missing.push('semantic landing sections')
  if (!responsive) missing.push('responsive layout')
  if (!interactiveOrCta) missing.push('CTA/action affordance')
  if (!enoughSubstance) missing.push('implementation substance')

  return missing.length === 0
    ? { passed: true, evidence: `frontend artifact quality proven in ${paths.join(', ')}` }
    : { passed: false, reason: `Frontend artifact is too incomplete for a landing page: missing ${missing.join(', ')}.` }
}

// Styling evidence — raw CSS, Tailwind utilities, CSS-in-JS, framework props.
// Any one of these is enough to consider the page "styled".
const STYLING_SIGNAL_REGEX = new RegExp([
  // raw CSS
  '@media',
  'display\\s*:\\s*(?:grid|flex)',
  'grid-template',
  'flex(?:-wrap|-direction|-grow|-shrink|-basis|-flow)',
  'clamp\\(',
  'minmax\\(',
  'var\\(--',
  'rem\\b',
  'vh\\b',
  'vw\\b',
  // Tailwind / utility classes
  'class(?:Name)?=["\'][^"\']*(?:flex|grid|md:|lg:|sm:|xl:|2xl:|container|p[xytrbl]?-|m[xytrbl]?-|gap-|space-[xy]-|w-|h-|text-|bg-|rounded|shadow)',
  // CSS-in-JS / styled-components
  'styled\\.',
  '\\bcss`',
  'sx=\\{',
  // Tailwind-style className prop strings with multiple utilities
].join('|'), 'i')

// Responsive intent — broad coverage across stacks.
const RESPONSIVE_SIGNAL_REGEX = new RegExp([
  // raw CSS responsive
  '@media',
  '@container',
  'clamp\\(',
  'minmax\\(',
  'grid-template',
  'flex-wrap',
  'container-type',
  'aspect-ratio',
  // Tailwind responsive prefixes
  '\\b(?:sm|md|lg|xl|2xl):',
  // fluid units
  '\\bvw\\b',
  '\\bvh\\b',
  'svh\\b',
  'dvh\\b',
  // common responsive prop systems (Chakra/MUI/etc)
  '\\b(?:useMediaQuery|useBreakpointValue|useResponsive)\\b',
  // viewport meta tag
  'name=["\']viewport["\']',
].join('|'), 'i')

// Semantic landing markers — content + sections + page primitives.
const SEMANTIC_LANDING_REGEX =
  /<(?:header|main|section|article|nav|footer|aside)\b|\bhero\b|\bcta\b|\bfeatures?\b|\bservices?\b|\bbenef[ií]cios?\b|\bdepoimentos?\b|\btestimonials?\b|\bpricing\b|\bfaq\b|\bcontact\b|\bcontato\b/g

// CTA / action affordance.
const CTA_SIGNAL_REGEX = new RegExp([
  '<button\\b',
  '<a\\s+[^>]*href',
  'class(?:Name)?=["\'][^"\']*(?:cta|button|btn)',
  '\\b(?:comece|explore|ver|jogar|comprar|saiba mais|cadastr|entrar|login|signup|sign up|get started|start|play|try (?:now|free)|contact)\\b',
  '<(?:Button|CTA|Link)\\b', // React-component CTAs
].join('|'), 'i')

function isValidationCommand(command: string): boolean {
  return /\b(build|test|typecheck|tsc|lint|check)\b/i.test(command)
}

function isDevServerCommand(command: string): boolean {
  return /\b(npm\s+run\s+dev|pnpm\s+dev|yarn\s+dev|bun\s+dev|vite|next\s+dev|astro\s+dev|remix\s+dev|webpack\s+serve)\b/i.test(command)
}

function commandMatches(actual: string, expected: string): boolean {
  const a = normalizeCommand(actual)
  const e = normalizeCommand(expected)
  return a === e || a.includes(e) || e.includes(a)
}

function normalizeCommand(command: string): string {
  return command.toLowerCase().replace(/\.cmd\b/g, '').replace(/\s+/g, ' ').trim()
}

function extractExplicitRequiredPaths(objective: string): string[] {
  const normalized = objective.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const requirementIndex = normalized.search(/\b(no minimo|minimum|at least|required|obrigatorio|obrigatorios|obrigatorias|materialize)\b/)
  const explicitListMatch = normalized.match(/\b(arquitetura|estrutura|architecture|structure|arquivos|files)\b[^:\n]{0,140}:/)
    ?? normalized.match(/\b(crie|criar|create|implemente|implement)\b[^:\n]{0,100}\b(arquivos|files)\b[^:\n]{0,100}:/)
  if (requirementIndex === -1 && !explicitListMatch) return []

  const paths = new Set<string>()
  const searchStart = requirementIndex !== -1 ? requirementIndex : explicitListMatch?.index ?? 0
  const searchArea = objective.slice(searchStart, searchStart + 900)
  const pattern = /\b(?:[A-Za-z0-9_.@-]+[\\/])*[A-Za-z0-9_.@-]+\.[A-Za-z0-9]+\b/g
  for (const match of searchArea.matchAll(pattern)) {
    const path = normalizeProjectPath(match[0])
    if (isLikelyProjectPath(path)) paths.add(path)
  }
  return [...paths]
}

function normalizeProjectPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/[),.;:]+$/, '').trim()
}

function isLikelyProjectPath(path: string): boolean {
  if (!path || path.includes('://')) return false
  if (/^\d+(?:\.\d+)+[a-z]*$/i.test(path)) return false
  const basename = path.split('/').pop() ?? ''
  const dot = basename.lastIndexOf('.')
  if (dot <= 0) return false
  const ext = basename.slice(dot + 1)
  if (ext !== ext.toLowerCase()) return false
  return KNOWN_REQUIRED_PATH_EXTS.has(ext)
}

const KNOWN_REQUIRED_PATH_EXTS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'css', 'scss', 'sass', 'less', 'html', 'htm',
  'json', 'md', 'mdx', 'yml', 'yaml', 'toml', 'go', 'py', 'rs', 'java', 'kt', 'kts',
  'cs', 'rb', 'php', 'swift', 'dart', 'vue', 'svelte', 'svg', 'png', 'jpg', 'jpeg',
  'webp', 'ico',
])
