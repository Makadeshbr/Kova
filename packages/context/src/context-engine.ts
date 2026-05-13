import { existsSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import type {
  AgentContext,
  ContextBlockedFile,
  ContextFileKind,
  ContextRelevance,
  ContextRejectedFile,
  ContextSource,
  HarnessError,
  Learning,
  ProjectProfile,
  TaskDefinition,
} from '@kova/shared'
import type { StackAdapter } from '@kova/shared'
import type { MemorySystem } from '@kova/memory'
import { buildProjectProfile, loadProjectInstructions } from '@kova/project'
import { grepForTask } from './grep-search'
import { DependencyGraph } from './dependency-graph'
import { allocateBudget, type ContextFileWithEvidence, type PrioritizedFile } from './token-budget'

const MAX_LEARNINGS = 5
const DEFAULT_MAX_TOKENS = 40_000
const MAX_FILE_BYTES = 180_000
const PREVIEW_CHARS = 500

export interface BuildContextOptions {
  harnessErrors?: HarnessError[]
  maxTokens?: number
  diff?: string
  explicitFiles?: string[]
  openedFiles?: string[]
}

export class ContextEngine {
  constructor(
    private readonly memory: MemorySystem,
    private readonly adapter: StackAdapter,
  ) {}

  async buildContext(
    task: TaskDefinition,
    projectRoot: string,
    options: BuildContextOptions = {},
  ): Promise<AgentContext> {
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS
    const errors = options.harnessErrors ?? []
    const profile = buildProjectProfile(projectRoot)
    const blockedFiles: ContextBlockedFile[] = []
    const rejectedFiles: ContextRejectedFile[] = []
    const memoryWithInvalidation = this.memory as MemorySystem & { invalidateAgainstProject?: (profile: ProjectProfile) => unknown }
    memoryWithInvalidation.invalidateAgainstProject?.(profile)

    const [grepMatches, graph] = await Promise.all([
      grepForTask(task.objective, projectRoot),
      buildGraph(projectRoot, this.adapter),
    ])

    const files: PrioritizedFile[] = []
    const seen = new Set<string>()

    addProfileSensitiveFiles(profile, blockedFiles)
    addInstructionFiles(files, seen, projectRoot, rejectedFiles)
    addTargetFiles(files, seen, projectRoot, uniquePaths([...(options.explicitFiles ?? []), ...task.affectedFiles]), graph, blockedFiles, rejectedFiles)
    addOpenedFiles(files, seen, projectRoot, options.openedFiles ?? [], blockedFiles, rejectedFiles)
    addErrorFiles(files, seen, projectRoot, errors, blockedFiles, rejectedFiles)
    addDiffFiles(files, seen, projectRoot, options.diff, blockedFiles, rejectedFiles)
    addGrepFiles(files, seen, projectRoot, grepMatches, 15, blockedFiles, rejectedFiles)
    addRelatedTests(files, seen, projectRoot, files.map(file => file.path), blockedFiles, rejectedFiles)

    const learnings = this.memory.query(task.objective, MAX_LEARNINGS)
      .filter(learning => learning.status === 'verified' || learning.status === 'canonical')
    const budget = allocateBudget(files, maxTokens)
    const pack = buildContextPack({
      task,
      profile,
      files: budget.files,
      allFiles: files,
      learnings,
      errors,
      diff: options.diff,
      maxTokens,
      tokensUsed: budget.tokensUsed,
      blockedFiles,
      rejectedFiles,
    })

    return { files: budget.files, tokensUsed: budget.tokensUsed, learnings, pack } as AgentContext
  }
}

function addInstructionFiles(
  files: PrioritizedFile[], seen: Set<string>, projectRoot: string, rejectedFiles: ContextRejectedFile[],
): void {
  for (const instruction of loadProjectInstructions(projectRoot)) {
    if (seen.has(instruction.path)) continue
    const kind = inferFileKind(instruction.path)
    if (shouldRejectPath(instruction.path, instruction.content.length, kind, rejectedFiles)) continue
    files.push(enrichFile({
      path: instruction.path,
      content: instruction.content,
      relevance: 'rules',
      source: 'instruction',
      kind,
      score: 95,
      confidence: 0.96,
      reason: 'Project instruction file applies to agent behavior.',
      evidence: [`instruction:${instruction.priority}`],
      sensitive: false,
      included: true,
    }))
    seen.add(instruction.path)
  }
}

async function buildGraph(projectRoot: string, adapter: StackAdapter): Promise<DependencyGraph> {
  const graph = new DependencyGraph()
  await graph.build(projectRoot, adapter)
  return graph
}

function addFile(
  files: PrioritizedFile[], seen: Set<string>,
  projectRoot: string, relPath: string, relevance: ContextRelevance,
  source: ContextSource, reason: string, evidence: string[], score: number,
  blockedFiles: ContextBlockedFile[], rejectedFiles: ContextRejectedFile[],
): void {
  const path = normalizeRelPath(relPath)
  if (!path) return
  if (seen.has(path)) {
    boostExisting(files, path, score, evidence, reason)
    return
  }
  if (isSensitiveContextPath(path)) {
    addBlocked(blockedFiles, path, 'Sensitive-looking path is never attached to model context.', ['sensitive_path'])
    return
  }
  const fullPath = join(projectRoot, path)
  const kind = inferFileKind(path)
  if (!existsSync(fullPath)) {
    addRejected(rejectedFiles, path, 'File does not exist.', ['missing_file'], score, source, kind)
    return
  }
  try {
    const stat = statSync(fullPath)
    if (shouldRejectPath(path, stat.size, kind, rejectedFiles, score, source)) return
    const content = readFileSync(fullPath, 'utf-8')
    if (isUnsafeExampleEnv(path, content)) {
      addBlocked(blockedFiles, path, 'Example env file contains secret-looking values.', ['secret_like_content'])
      return
    }
    files.push(enrichFile({
      path,
      content,
      relevance,
      source,
      kind,
      score,
      confidence: confidenceFromScore(score),
      reason,
      evidence,
      sensitive: false,
      included: true,
    }))
    seen.add(path)
  } catch {
    addRejected(rejectedFiles, path, 'File could not be read as text.', ['unreadable_file'], score, source, kind)
    // arquivo ilegível — não bloqueia a construção do contexto
  }
}

function addTargetFiles(
  files: PrioritizedFile[], seen: Set<string>,
  projectRoot: string, affectedFiles: string[], graph: DependencyGraph,
  blockedFiles: ContextBlockedFile[], rejectedFiles: ContextRejectedFile[],
): void {
  for (const f of affectedFiles) {
    addFile(files, seen, projectRoot, f, 'target', 'explicit', 'Explicitly referenced by the current task.', ['explicit_reference'], 100, blockedFiles, rejectedFiles)
    for (const dep of graph.directDependencies(f)) {
      addFile(files, seen, projectRoot, dep, 'direct_dep', 'dependency', `Imported by ${f}.`, [`dependency:${f}`], 78, blockedFiles, rejectedFiles)
    }
  }
}

function addOpenedFiles(
  files: PrioritizedFile[], seen: Set<string>,
  projectRoot: string, openedFiles: string[],
  blockedFiles: ContextBlockedFile[], rejectedFiles: ContextRejectedFile[],
): void {
  for (const file of openedFiles) {
    addFile(files, seen, projectRoot, file, 'target', 'opened_file', 'File is currently open in the editor.', ['opened_file'], 86, blockedFiles, rejectedFiles)
  }
}

function addErrorFiles(
  files: PrioritizedFile[], seen: Set<string>,
  projectRoot: string, errors: HarnessError[],
  blockedFiles: ContextBlockedFile[], rejectedFiles: ContextRejectedFile[],
): void {
  const errorPaths = [...new Set(errors.map(e => e.file).filter(Boolean))]
  for (const f of errorPaths) {
    const related = errors.filter(error => error.file === f).map(error => `${error.layer}:${error.message}`).slice(0, 3)
    addFile(files, seen, projectRoot, f, 'error', 'error', 'Referenced by recent validation errors.', related, 90, blockedFiles, rejectedFiles)
  }
}

function addDiffFiles(
  files: PrioritizedFile[], seen: Set<string>,
  projectRoot: string, diff: string | undefined,
  blockedFiles: ContextBlockedFile[], rejectedFiles: ContextRejectedFile[],
): void {
  for (const file of extractDiffFiles(diff)) {
    addFile(files, seen, projectRoot, file, 'target', 'diff', 'File appears in the current diff.', ['current_diff'], 84, blockedFiles, rejectedFiles)
  }
}

function addGrepFiles(
  files: PrioritizedFile[], seen: Set<string>,
  projectRoot: string, matches: { file: string; score?: number }[], limit: number,
  blockedFiles: ContextBlockedFile[], rejectedFiles: ContextRejectedFile[],
): void {
  for (const [index, { file }] of matches.slice(0, limit).entries()) {
    addFile(files, seen, projectRoot, file, 'indirect_dep', 'grep', 'Text search matched the task objective.', ['grep_match', `grep_rank:${index + 1}`], Math.max(45, 70 - index), blockedFiles, rejectedFiles)
  }
}

function addRelatedTests(
  files: PrioritizedFile[], seen: Set<string>,
  projectRoot: string, candidateFiles: string[],
  blockedFiles: ContextBlockedFile[], rejectedFiles: ContextRejectedFile[],
): void {
  for (const sourceFile of uniquePaths(candidateFiles)) {
    if (inferFileKind(sourceFile) === 'test') continue
    for (const testPath of relatedTestCandidates(sourceFile)) {
      if (!existsSync(join(projectRoot, testPath))) continue
      addFile(files, seen, projectRoot, testPath, 'direct_dep', 'related_test', `Related test candidate for ${sourceFile}.`, ['related_test', `source:${sourceFile}`], 74, blockedFiles, rejectedFiles)
    }
  }
}

function enrichFile(file: PrioritizedFile): PrioritizedFile {
  return {
    evidence: [],
    score: 50,
    confidence: confidenceFromScore(file.score ?? 50),
    reason: 'Relevant project context.',
    source: 'grep',
    kind: inferFileKind(file.path),
    sensitive: false,
    included: true,
    ...file,
  }
}

function addProfileSensitiveFiles(profile: ProjectProfile, blockedFiles: ContextBlockedFile[]): void {
  for (const file of profile.sensitiveFiles) {
    addBlocked(blockedFiles, file.path, 'Project scanner identified this as sensitive.', ['project_profile_sensitive'])
  }
}

function boostExisting(
  files: PrioritizedFile[],
  path: string,
  score: number,
  evidence: string[],
  reason: string,
): void {
  const existing = files.find(file => file.path === path)
  if (!existing) return
  const replacesPrimarySignal = score > (existing.score ?? 0)
  existing.score = Math.max(existing.score ?? 0, score)
  existing.confidence = Math.max(existing.confidence ?? 0, confidenceFromScore(score))
  existing.evidence = [...new Set([...(existing.evidence ?? []), ...evidence])]
  if (!existing.reason?.includes(reason)) existing.reason = `${existing.reason ?? 'Relevant project context.'} ${reason}`
  if (replacesPrimarySignal && evidence.includes('related_test')) {
    existing.source = 'related_test'
    existing.relevance = 'direct_dep'
  }
}

function addBlocked(blockedFiles: ContextBlockedFile[], path: string, reason: string, evidence: string[]): void {
  const normalized = normalizeRelPath(path)
  if (!normalized || blockedFiles.some(file => file.path === normalized)) return
  blockedFiles.push({ path: normalized, reason, evidence, sensitive: true })
}

function addRejected(
  rejectedFiles: ContextRejectedFile[],
  path: string,
  reason: string,
  evidence: string[],
  score?: number,
  source?: ContextSource,
  kind?: ContextFileKind,
): void {
  const normalized = normalizeRelPath(path)
  if (!normalized || rejectedFiles.some(file => file.path === normalized && file.reason === reason)) return
  rejectedFiles.push({ path: normalized, reason, evidence, score, source, kind, sensitive: false })
}

function shouldRejectPath(
  path: string,
  sizeBytes: number,
  kind: ContextFileKind,
  rejectedFiles: ContextRejectedFile[],
  score?: number,
  source?: ContextSource,
): boolean {
  if (sizeBytes > MAX_FILE_BYTES) {
    addRejected(rejectedFiles, path, 'File is too large for context.', ['large_file'], score, source, kind)
    return true
  }
  if (isGeneratedOrVendorPath(path)) {
    addRejected(rejectedFiles, path, 'Generated, dependency, vendor, or build artifact path is excluded.', ['generated_or_vendor'], score, source, kind)
    return true
  }
  return false
}

function isGeneratedOrVendorPath(path: string): boolean {
  return /(^|\/)(node_modules|vendor|dist|build|out|target|coverage|\.git|\.next|__pycache__)(\/|$)/.test(path.replace(/\\/g, '/'))
}

function inferFileKind(path: string): ContextFileKind {
  const normalized = path.replace(/\\/g, '/')
  const base = basename(normalized)
  const lower = normalized.toLowerCase()
  if (['KOVA.md', 'AGENTS.md', 'CLAUDE.md', 'RULES.md'].includes(base) || lower.startsWith('.kova/rules/')) return 'instruction'
  if (/(^|\/)(__tests__|tests?|spec)\//.test(lower) || /\.(test|spec)\.[^.]+$/.test(lower) || /(^|\/)test_[^/]+\.[^.]+$/.test(lower) || /_test\.[^.]+$/.test(lower)) return 'test'
  if (/\.(json|ya?ml|toml|xml|ini|cfg|conf)$/.test(lower) || base.startsWith('.')) return 'config'
  if (/\.(md|mdx|txt|rst|adoc)$/.test(lower)) return 'doc'
  if (/\.[A-Za-z0-9]+$/.test(lower)) return 'source'
  return 'unknown'
}

function relatedTestCandidates(path: string): string[] {
  const normalized = normalizeRelPath(path)
  if (!normalized) return []
  const dir = dirname(normalized).replace(/\\/g, '/')
  const ext = extname(normalized)
  const base = basename(normalized, ext)
  const prefix = dir === '.' ? '' : `${dir}/`
  return uniquePaths([
    `${prefix}${base}.test${ext}`,
    `${prefix}${base}.spec${ext}`,
    `${prefix}${base}_test${ext}`,
    `${prefix}test_${base}${ext}`,
    `${prefix}__tests__/${base}.test${ext}`,
    `tests/${base}.test${ext}`,
    `tests/test_${base}${ext}`,
  ])
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.map(normalizeRelPath).filter((path): path is string => Boolean(path)))]
}

function normalizeRelPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').trim()
}

function extractDiffFiles(diff?: string): string[] {
  if (!diff) return []
  const files: string[] = []
  for (const line of diff.split(/\r?\n/)) {
    const gitMatch = /^diff --git a\/(.+?) b\/(.+)$/.exec(line)
    if (gitMatch) {
      files.push(gitMatch[2])
      continue
    }
    const fileMatch = /^\+\+\+ b\/(.+)$/.exec(line)
    if (fileMatch && fileMatch[1] !== '/dev/null') files.push(fileMatch[1])
  }
  return uniquePaths(files)
}

function summarizeDiff(diff: string): string {
  const files = extractDiffFiles(diff)
  return files.length > 0 ? `${files.length} file(s) changed: ${files.slice(0, 8).join(', ')}` : 'Diff provided without parseable file headers.'
}

function buildSnippetPreview(content: string, request: string): string {
  if (content.length <= PREVIEW_CHARS) return content
  const keywords = request.toLowerCase().split(/\W+/).filter(word => word.length > 2)
  const lower = content.toLowerCase()
  const hit = keywords
    .map(keyword => lower.indexOf(keyword))
    .filter(index => index >= 0)
    .sort((a, b) => a - b)[0]
  if (hit === undefined) return content.slice(0, PREVIEW_CHARS)
  const start = Math.max(0, hit - Math.floor(PREVIEW_CHARS / 2))
  const end = Math.min(content.length, start + PREVIEW_CHARS)
  const prefix = start > 0 ? '...\n' : ''
  const suffix = end < content.length ? '\n...' : ''
  return `${prefix}${content.slice(start, end)}${suffix}`
}

function confidenceFromScore(score: number): number {
  return Number(Math.max(0.1, Math.min(0.99, score / 100)).toFixed(2))
}

function isUnsafeExampleEnv(path: string, content: string): boolean {
  if (basename(path).toLowerCase() !== '.env.example') return false
  return /(-----BEGIN [A-Z ]*PRIVATE KEY-----|sk_live_[A-Za-z0-9]+|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})/.test(content)
}

function dedupeBlocked(blockedFiles: ContextBlockedFile[]): ContextBlockedFile[] {
  const map = new Map<string, ContextBlockedFile>()
  for (const file of blockedFiles) {
    if (!map.has(file.path)) map.set(file.path, file)
  }
  return [...map.values()]
}

function buildWarnings(
  profile: ProjectProfile,
  blockedFiles: ContextBlockedFile[],
  rejectedFiles: ContextRejectedFile[],
): string[] {
  const warnings: string[] = []
  if (blockedFiles.length > 0) warnings.push(`${blockedFiles.length} sensitive file(s) blocked from context.`)
  if (rejectedFiles.length > 0) warnings.push(`${rejectedFiles.length} candidate file(s) rejected from context.`)
  if (profile.traits.includes('no_validation')) warnings.push('Project profile has no detected validation command candidates.')
  return warnings
}

function buildContextPack(input: {
  task: TaskDefinition
  profile: ProjectProfile
  files: ContextFileWithEvidence[]
  allFiles: PrioritizedFile[]
  learnings: Learning[]
  errors: HarnessError[]
  diff?: string
  maxTokens: number
  tokensUsed: number
  blockedFiles: ContextBlockedFile[]
  rejectedFiles: ContextRejectedFile[]
}) {
  const included = new Set(input.files.map(file => file.path))
  const blocked = dedupeBlocked(input.blockedFiles)
  const alreadyRejected = new Set(input.rejectedFiles.map(file => file.path))
  const overBudgetFiles = input.allFiles
    .filter(file => !included.has(file.path) && !blocked.some(blockedFile => blockedFile.path === file.path))
    .map(file => file.path)
  const budgetRejected: ContextRejectedFile[] = overBudgetFiles
    .filter(path => !alreadyRejected.has(path))
    .map(path => ({
      path,
      reason: 'Excluded by context budget.',
      evidence: ['context_budget'],
      score: input.allFiles.find(file => file.path === path)?.score,
      source: input.allFiles.find(file => file.path === path)?.source,
      kind: input.allFiles.find(file => file.path === path)?.kind,
      sensitive: false,
    }))
  const selectedFiles = input.files.map(file => ({
    path: file.path,
    relevance: file.relevance,
    source: file.source ?? 'grep',
    kind: file.kind ?? inferFileKind(file.path),
    score: file.score ?? 50,
    confidence: file.confidence ?? confidenceFromScore(file.score ?? 50),
    reason: file.reason ?? 'Relevant project context.',
    evidence: file.evidence ?? [],
    sensitive: file.sensitive ?? false,
    included: true,
    tokens: file.tokens,
  }))
  const profileSummary = {
    root: input.profile.root,
    projectKind: input.profile.projectKind,
    traits: input.profile.traits,
    languages: input.profile.languages.slice(0, 6),
    frameworks: input.profile.frameworks.slice(0, 6),
    packageManagers: input.profile.packageManagers.slice(0, 6),
    workspaces: input.profile.workspaces
      .slice(0, 8)
      .map(({ name, path, kind, confidence }) => ({ name, path, kind, confidence })),
    risks: input.profile.risks.slice(0, 8),
  }
  const verifiedMemories = input.learnings
    .filter(learning => learning.status === 'verified' || learning.status === 'canonical')
    .map(({ id, description, scope, status, confidence, tags }) => ({ id, description, scope, status, confidence, tags }))
  const commandCandidates = [
    ...input.profile.buildCommands,
    ...input.profile.testCommands,
    ...input.profile.lintCommands,
    ...input.profile.typecheckCommands,
  ].slice(0, 20)
  const budget = {
    maxTokens: input.maxTokens,
    tokensUsed: input.tokensUsed,
    fileCount: input.files.length,
  }
  const warnings = buildWarnings(input.profile, blocked, [...input.rejectedFiles, ...budgetRejected])

  return {
    request: input.task.objective,
    currentTask: {
      id: input.task.id,
      objective: input.task.objective,
      type: input.task.type,
      impact: input.task.impact,
      affectedFiles: input.task.affectedFiles,
    },
    profile: profileSummary,
    projectProfileSummary: profileSummary,
    files: selectedFiles,
    selectedFiles,
    selectedSnippets: input.files.slice(0, 8).map(file => ({
      path: file.path,
      reason: file.reason ?? 'Relevant project context.',
      preview: buildSnippetPreview(file.content, input.task.objective),
    })),
    relatedTests: selectedFiles.filter(file => file.kind === 'test'),
    validations: input.profile.validations.filter(item => item.available).slice(0, 12),
    commandCandidates,
    instructions: input.profile.instructionFiles.map(file => file.path),
    appliedInstructions: input.profile.instructionFiles.map(file => ({
      path: file.path,
      priority: Math.round(file.confidence * 100),
      source: 'project_instruction' as const,
    })),
    appliedRules: input.profile.instructionFiles
      .filter(file => file.path === 'RULES.md' || file.path.startsWith('.kova/rules/'))
      .map(file => ({ path: file.path, source: 'project_rule' as const })),
    errors: input.errors.slice(0, 12),
    recentErrors: input.errors.slice(0, 12),
    ...(input.diff ? { diff: input.diff.slice(0, 12_000) } : {}),
    ...(input.diff ? { currentDiffSummary: summarizeDiff(input.diff) } : {}),
    memories: verifiedMemories,
    verifiedMemories,
    blockedFiles: blocked,
    rejectedFiles: [...input.rejectedFiles, ...budgetRejected],
    omitted: {
      sensitiveFiles: blocked.filter(file => file.sensitive).map(file => file.path),
      overBudgetFiles,
    },
    budget,
    contextBudget: budget,
    warnings,
  }
}

function isSensitiveContextPath(path: string): boolean {
  const name = basename(path.replace(/\\/g, '/')).toLowerCase()
  if (name === '.env.example') return false
  const sourceLike = /\.(ts|tsx|js|jsx|py|go|rs|cpp|c|java|cs|rb|php|swift|kt|dart)$/.test(name)
  return name === '.env'
    || name.startsWith('.env.')
    || name.endsWith('.env')
    || name.includes('.env.')
    || name.endsWith('.pem')
    || name.endsWith('.key')
    || name.endsWith('.p12')
    || name === 'id_rsa'
    || name === 'id_dsa'
    || name.includes('secret')
    || (!sourceLike && name.includes('token'))
    || name.includes('credential')
    || name.includes('kubeconfig')
}
