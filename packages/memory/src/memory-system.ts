import { execSync } from 'node:child_process'
import type { Learning, IterationRecord, ProjectProfile, TaskDefinition } from '@kova/shared'
import {
  readLearnings, writeLearnings,
  readPendingLearnings, appendPendingLearning, clearPendingLearnings,
} from './storage'
import type { PendingLearning } from './storage'
import { promoteLearnings } from './promotion'
import { pruneLearnings } from './anti-drift'
import { classifyLearning, descriptionKey } from './learning-gate'

const MAX_PROJECT = 200
const MAX_GLOBAL = 500

type NewLearning = Omit<Learning, 'id' | 'createdAt' | 'lastSeen'>
type LearningDraft = NewLearning  // explicit alias for intent clarity in buildCandidates
type ListFilters = Partial<Pick<Learning, 'status' | 'type' | 'scope'>>

export class MemorySystem {
  constructor(private readonly projectRoot: string) {}

  record(input: NewLearning): Learning {
    const learnings = this.readAll()
    const existing = findDuplicate(learnings, input)

    if (existing) {
      const updated: Learning = {
        ...existing,
        confidence: existing.confidence + 1,
        evidence: [...existing.evidence, ...input.evidence].slice(-20),
        lastSeen: new Date().toISOString(),
        invalidationRule: input.invalidationRule ?? existing.invalidationRule,
      }
      this.save(learnings.map(l => l.id === existing.id ? updated : l))
      return updated
    }

    const now = new Date().toISOString()
    const learning: Learning = {
      ...input,
      id: generateId(),
      createdAt: now,
      lastSeen: now,
      source: input.source ?? 'legacy',
    }
    this.save([...learnings, learning])
    return learning
  }

  query(task: string, maxResults = 5): Learning[] {
    const keywords = extractKeywords(task)
    if (keywords.length === 0) return []

    return this.readAll()
      .filter(l => l.status !== 'invalidated')
      .map(l => ({ l, score: scoreMatch(l, keywords) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ l }) => l)
  }

  promote(): void {
    this.save(promoteLearnings(this.readAll()))
  }

  prune(): void {
    const project = readLearnings('project', this.projectRoot)
    const global = readLearnings('global')
    writeLearnings('project', pruneLearnings(project, MAX_PROJECT), this.projectRoot)
    writeLearnings('global', pruneLearnings(global, MAX_GLOBAL))
  }

  list(filters?: ListFilters): Learning[] {
    const learnings = this.readAll()
    if (!filters) return learnings
    return learnings.filter(l =>
      (!filters.status || l.status === filters.status) &&
      (!filters.type || l.type === filters.type) &&
      (!filters.scope || l.scope === filters.scope),
    )
  }

  invalidateAgainstProject(profile: ProjectProfile): Learning[] {
    const fingerprint = buildProjectFingerprint(profile)
    const now = new Date().toISOString()
    const invalidated: Learning[] = []
    const next = this.readAll().map(learning => {
      if (learning.status === 'invalidated') return learning
      const reason = invalidationReason(learning, profile, fingerprint)
      if (!reason) return learning
      const updated: Learning = {
        ...learning,
        status: 'invalidated',
        invalidatedAt: now,
        invalidationReason: reason,
      }
      invalidated.push(updated)
      return updated
    })
    if (invalidated.length > 0) this.save(next)
    return invalidated
  }

  listPending(): PendingLearning[] {
    return readPendingLearnings(this.projectRoot)
  }

  clearPending(): void {
    clearPendingLearnings(this.projectRoot)
  }

  inspect(id: string): Learning | null {
    return this.readAll().find(l => l.id === id) ?? null
  }

  remove(id: string): void {
    this.save(this.readAll().filter(l => l.id !== id))
  }

  /**
   * Auto-extracts and records learnings from a completed execution.
   * Must only be called when the last iteration has a passing harness (auto_apply or forceApply).
   *
   * - Approved learnings → persisted to .kova/memory/learnings.json
   * - needs_review learnings → queued to .kova/memory/pending.json for human review
   * - temporary_workaround / rejected → silently ignored (never become automatic learnings)
   * - Contradictions with existing patterns → existing patterns receive +1 contradiction
   *
   * Returns the list of learnings that were approved and recorded.
   */
  recordFromIteration(task: TaskDefinition, iterations: IterationRecord[]): Learning[] {
    if (iterations.length === 0) return []
    const last = iterations[iterations.length - 1]
    if (!last.harnessResult.passed) return []

    const gitHash = getGitHash(this.projectRoot)
    const candidates = buildCandidates(task, iterations, gitHash)
    const recorded: Learning[] = []

    for (const candidate of candidates) {
      const gate = classifyLearning(candidate, last.harnessResult)

      if (!gate.approved) {
        if (gate.classification === 'needs_review') {
          appendPendingLearning({
            candidateDescription: candidate.description,
            type: candidate.type,
            scope: candidate.scope,
            tags: candidate.tags,
            stack: candidate.stack,
            source: 'auto_extracted',
            reason: gate.reason,
            classification: gate.classification,
            queuedAt: new Date().toISOString(),
          }, this.projectRoot)
        }
        continue
      }

      // Apply gate adjustments (e.g., scope downgrade from global → project)
      const finalCandidate: LearningDraft = {
        ...candidate,
        ...(gate.adjustedCandidate
          ? { scope: gate.adjustedCandidate.scope, description: gate.adjustedCandidate.description }
          : {}),
        source: 'auto_extracted' as const,
        invalidationRule: gate.invalidationRule ?? candidate.invalidationRule,
      }

      // Re-read after each record to keep deduplication fresh
      const currentLearnings = this.readAll()
      const key = descriptionKey(finalCandidate.description)
      if (currentLearnings.some(l => descriptionKey(l.description) === key)) continue

      const learning = this.record(finalCandidate)
      recorded.push(learning)

      // Contradiction propagation: a successful repair means a prior "first-pass" pattern
      // for the same stack+type was over-confident. Increment its contradictions counter.
      if (candidate.type === 'decision') {
        this.incrementContradictions(candidate.stack, candidate.tags)
      }
    }

    return recorded
  }

  /**
   * When a repair is successful, existing experimental `pattern` learnings with the
   * same stack and overlapping tags gain +1 contradiction — their confidence is called
   * into question by the fact that something needed repair.
   */
  private incrementContradictions(stack: string | undefined, tags: string[]): void {
    if (!stack) return
    const learnings = this.readAll()
    const tagSet = new Set(tags)

    const affected = learnings.map(l => {
      if (l.status !== 'experimental') return l
      if (l.type !== 'pattern') return l
      if (l.stack !== stack) return l
      const overlap = l.tags.filter(t => tagSet.has(t)).length
      if (overlap === 0) return l
      return { ...l, contradictions: l.contradictions + 1 }
    })

    this.save(affected)
  }

  private readAll(): Learning[] {
    const project = readLearnings('project', this.projectRoot)
    const global = readLearnings('global')
    return [...project, ...global]
  }

  private save(learnings: Learning[]): void {
    const project = learnings.filter(l => l.scope !== 'global')
    const global = learnings.filter(l => l.scope === 'global')
    if (project.length > 0 || readLearnings('project', this.projectRoot).length > 0) {
      writeLearnings('project', project, this.projectRoot)
    }
    if (global.length > 0) {
      writeLearnings('global', global)
    }
  }
}

function findDuplicate(learnings: Learning[], input: NewLearning): Learning | null {
  const key = descriptionKey(input.description)
  return learnings.find(l => l.status !== 'invalidated' && descriptionKey(l.description) === key) ?? null
}

function buildProjectFingerprint(profile: ProjectProfile): string {
  const parts = [
    `kind:${profile.projectKind}`,
    `lang:${profile.languages.map(item => item.name).sort().join(',')}`,
    `fw:${profile.frameworks.map(item => item.name).sort().join(',')}`,
    `pm:${profile.packageManagers.map(item => item.name).sort().join(',')}`,
    `ws:${profile.workspaces.map(item => `${item.kind}:${item.name}:${item.path}`).sort().join(',')}`,
  ]
  return parts.join('|')
}

function invalidationReason(learning: Learning, profile: ProjectProfile, fingerprint: string): string | null {
  if (learning.projectFingerprint && learning.projectFingerprint !== fingerprint) {
    return 'Project fingerprint changed since this learning was recorded.'
  }
  const rule = learning.invalidationRule?.trim()
  if (!rule) return null
  if (rule === 'project_fingerprint_changed' && learning.projectFingerprint !== fingerprint) {
    return 'Project fingerprint changed by invalidation rule.'
  }
  if (rule.startsWith('stack:')) {
    const expected = rule.slice('stack:'.length).trim().toLowerCase()
    const names = [...profile.languages, ...profile.frameworks].map(item => item.name.toLowerCase())
    return names.includes(expected) ? null : `Stack "${expected}" no longer appears in the project profile.`
  }
  if (rule.startsWith('package_manager:')) {
    const expected = rule.slice('package_manager:'.length).trim().toLowerCase()
    return profile.packageManagers.some(item => item.name.toLowerCase() === expected)
      ? null
      : `Package manager "${expected}" no longer appears in the project profile.`
  }
  return null
}

function buildCandidates(
  task: TaskDefinition,
  iterations: IterationRecord[],
  gitHash: string | undefined,
): LearningDraft[] {
  const last = iterations[iterations.length - 1]
  const isRepair = iterations.length > 1
  const changedPaths = [...new Set(last.changes.map(c => c.path))]
  const base: Pick<LearningDraft, 'status' | 'confidence' | 'contradictions'> = {
    status: 'experimental',
    confidence: 1,
    contradictions: 0,
  }

  const candidates: LearningDraft[] = []

  if (isRepair) {
    const firstErrors = iterations[0].harnessResult.layers
      .filter(l => !l.skipped && !l.passed)
      .flatMap(l => l.errors.slice(0, 2).map(e => e.humanMessage || e.message))
    const errorSummary = firstErrors.slice(0, 2).join('; ')
    const filesFixed = changedPaths.slice(0, 3).join(', ')
    if (errorSummary) {
      candidates.push({
        ...base,
        description: `Repair: "${errorSummary.slice(0, 120)}" fixed in ${task.stackAdapter} — patched ${filesFixed || 'affected files'}`,
        type: 'decision',
        scope: 'project',
        tags: [task.stackAdapter, 'repair', task.type].filter(Boolean),
        evidence: [buildEvidence(task, last)],
        stack: task.stackAdapter,
        gitHash,
      })
    }
  } else {
    candidates.push({
      ...base,
      description: `${task.type} in ${task.stackAdapter}: "${task.objective.slice(0, 80)}" passed harness on first attempt (score ${last.harnessResult.score})`,
      type: 'pattern',
      scope: 'project',
      tags: [task.stackAdapter, task.type, 'first-pass'].filter(Boolean),
      evidence: [buildEvidence(task, last)],
      stack: task.stackAdapter,
      gitHash,
    })
  }

  return candidates
}

function buildEvidence(task: TaskDefinition, record: IterationRecord) {
  return {
    taskId: task.id,
    harnessLayer: record.harnessResult.layers.find(l => !l.skipped)?.name ?? 'rules',
    file: record.changes[0]?.path ?? '',
    diffSnippet: (record.changes[0]?.diff ?? '').slice(0, 200),
    outcome: 'approved' as const,
    timestamp: new Date().toISOString(),
  }
}

function getGitHash(projectRoot: string): string | undefined {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
      timeout: 2_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return undefined
  }
}

function extractKeywords(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(w => w.length > 2)
}

function scoreMatch(l: Learning, keywords: string[]): number {
  const desc = l.description.toLowerCase()
  const tagHits = l.tags.filter(tag => keywords.some(kw => tag.toLowerCase().includes(kw))).length
  const descHits = keywords.filter(kw => desc.includes(kw)).length
  return (tagHits * 2 + descHits) * l.confidence
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
