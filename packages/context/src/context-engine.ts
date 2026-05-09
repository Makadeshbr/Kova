import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { TaskDefinition, HarnessError, AgentContext, ContextRelevance, Learning } from '@kova/shared'
import type { StackAdapter } from '@kova/shared'
import type { MemorySystem } from '@kova/memory'
import { buildProjectProfile, loadProjectInstructions } from '@kova/project'
import { grepForTask } from './grep-search'
import { DependencyGraph } from './dependency-graph'
import { allocateBudget, type ContextFileWithEvidence, type ContextSource, type PrioritizedFile } from './token-budget'

const MAX_LEARNINGS = 5
const DEFAULT_MAX_TOKENS = 40_000

export interface BuildContextOptions {
  harnessErrors?: HarnessError[]
  maxTokens?: number
  diff?: string
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
    const omittedSensitive = new Set<string>()

    const [grepMatches, graph] = await Promise.all([
      grepForTask(task.objective, projectRoot),
      buildGraph(projectRoot, this.adapter),
    ])

    const files: PrioritizedFile[] = []
    const seen = new Set<string>()

    addInstructionFiles(files, seen, projectRoot)
    addTargetFiles(files, seen, projectRoot, task.affectedFiles, graph, omittedSensitive)
    addErrorFiles(files, seen, projectRoot, errors, omittedSensitive)
    addGrepFiles(files, seen, projectRoot, grepMatches, 15, omittedSensitive)

    const learnings = this.memory.query(task.objective, MAX_LEARNINGS)
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
      omittedSensitive: [...omittedSensitive],
    })

    return { files: budget.files, tokensUsed: budget.tokensUsed, learnings, pack } as AgentContext
  }
}

function addInstructionFiles(
  files: PrioritizedFile[], seen: Set<string>, projectRoot: string,
): void {
  for (const instruction of loadProjectInstructions(projectRoot)) {
    if (seen.has(instruction.path)) continue
    files.push(enrichFile({
      path: instruction.path,
      content: instruction.content,
      relevance: 'rules',
      source: 'instruction',
      score: 95,
      reason: 'Project instruction file applies to agent behavior.',
      evidence: [`instruction:${instruction.priority}`],
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
  omittedSensitive?: Set<string>,
): void {
  if (seen.has(relPath)) return
  if (isSensitiveContextPath(relPath)) {
    omittedSensitive?.add(relPath)
    return
  }
  const fullPath = join(projectRoot, relPath)
  if (!existsSync(fullPath)) return
  try {
    files.push(enrichFile({
      path: relPath,
      content: readFileSync(fullPath, 'utf-8'),
      relevance,
      source,
      score,
      reason,
      evidence,
    }))
    seen.add(relPath)
  } catch {
    // arquivo ilegível — não bloqueia a construção do contexto
  }
}

function addTargetFiles(
  files: PrioritizedFile[], seen: Set<string>,
  projectRoot: string, affectedFiles: string[], graph: DependencyGraph, omittedSensitive: Set<string>,
): void {
  for (const f of affectedFiles) {
    addFile(files, seen, projectRoot, f, 'target', 'explicit', 'Explicitly affected by the task.', ['task.affectedFiles'], 100, omittedSensitive)
    for (const dep of graph.directDependencies(f)) {
      addFile(files, seen, projectRoot, dep, 'direct_dep', 'dependency', `Imported by ${f}.`, [`dependency:${f}`], 78, omittedSensitive)
    }
  }
}

function addErrorFiles(
  files: PrioritizedFile[], seen: Set<string>,
  projectRoot: string, errors: HarnessError[], omittedSensitive: Set<string>,
): void {
  const errorPaths = [...new Set(errors.map(e => e.file).filter(Boolean))]
  for (const f of errorPaths) {
    const related = errors.filter(error => error.file === f).map(error => `${error.layer}:${error.message}`).slice(0, 3)
    addFile(files, seen, projectRoot, f, 'error', 'error', 'Referenced by recent validation errors.', related, 90, omittedSensitive)
  }
}

function addGrepFiles(
  files: PrioritizedFile[], seen: Set<string>,
  projectRoot: string, matches: { file: string }[], limit: number, omittedSensitive: Set<string>,
): void {
  for (const [index, { file }] of matches.slice(0, limit).entries()) {
    addFile(files, seen, projectRoot, file, 'indirect_dep', 'grep', 'Text search matched the task objective.', [`grep_rank:${index + 1}`], Math.max(45, 70 - index), omittedSensitive)
  }
}

function enrichFile(file: PrioritizedFile): PrioritizedFile {
  return {
    evidence: [],
    score: 50,
    reason: 'Relevant project context.',
    source: 'grep',
    ...file,
  }
}

function buildContextPack(input: {
  task: TaskDefinition
  profile: ReturnType<typeof buildProjectProfile>
  files: ContextFileWithEvidence[]
  allFiles: PrioritizedFile[]
  learnings: Learning[]
  errors: HarnessError[]
  diff?: string
  maxTokens: number
  tokensUsed: number
  omittedSensitive: string[]
}) {
  const included = new Set(input.files.map(file => file.path))
  const overBudgetFiles = input.allFiles
    .filter(file => !included.has(file.path) && !input.omittedSensitive.includes(file.path))
    .map(file => file.path)

  return {
    request: input.task.objective,
    profile: {
      root: input.profile.root,
      languages: input.profile.languages.slice(0, 6),
      frameworks: input.profile.frameworks.slice(0, 6),
      workspaces: input.profile.workspaces
        .slice(0, 8)
        .map(({ name, path, kind, confidence }) => ({ name, path, kind, confidence })),
      risks: input.profile.risks.slice(0, 8),
    },
    files: input.files.map(file => ({
      path: file.path,
      relevance: file.relevance,
      source: file.source ?? 'grep',
      score: file.score ?? 50,
      reason: file.reason ?? 'Relevant project context.',
      evidence: file.evidence ?? [],
      tokens: file.tokens,
    })),
    validations: input.profile.validations.filter(item => item.available).slice(0, 12),
    instructions: input.profile.instructionFiles.map(file => file.path),
    errors: input.errors.slice(0, 12),
    ...(input.diff ? { diff: input.diff.slice(0, 12_000) } : {}),
    memories: input.learnings
      .filter(learning => learning.status === 'verified' || learning.status === 'canonical')
      .map(({ id, description, scope, status, confidence, tags }) => ({ id, description, scope, status, confidence, tags })),
    omitted: {
      sensitiveFiles: input.omittedSensitive,
      overBudgetFiles,
    },
    budget: {
      maxTokens: input.maxTokens,
      tokensUsed: input.tokensUsed,
      fileCount: input.files.length,
    },
  }
}

function isSensitiveContextPath(path: string): boolean {
  const name = basename(path.replace(/\\/g, '/')).toLowerCase()
  if (name === '.env.example') return false
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
}
