import type { Learning } from '@kova/shared'
import { readLearnings, writeLearnings } from './storage'
import { promoteLearnings } from './promotion'
import { pruneLearnings } from './anti-drift'

const MAX_PROJECT = 200
const MAX_GLOBAL = 500

type NewLearning = Omit<Learning, 'id' | 'createdAt' | 'lastSeen'>
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
        evidence: [...existing.evidence, ...input.evidence],
        lastSeen: new Date().toISOString(),
      }
      this.save(learnings.map(l => l.id === existing.id ? updated : l))
      return updated
    }

    const now = new Date().toISOString()
    const learning: Learning = { ...input, id: generateId(), createdAt: now, lastSeen: now }
    this.save([...learnings, learning])
    return learning
  }

  query(task: string, maxResults = 5): Learning[] {
    const keywords = extractKeywords(task)
    if (keywords.length === 0) return []

    return this.readAll()
      .map(l => ({ l, score: scoreMatch(l, keywords) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ l }) => l)
  }

  promote(): void {
    const learnings = this.readAll()
    this.save(promoteLearnings(learnings))
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

  inspect(id: string): Learning | null {
    return this.readAll().find(l => l.id === id) ?? null
  }

  remove(id: string): void {
    this.save(this.readAll().filter(l => l.id !== id))
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
  const normalized = input.description.toLowerCase().trim()
  return learnings.find(l => l.description.toLowerCase().trim() === normalized) ?? null
}

function extractKeywords(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(w => w.length > 2)
}

function scoreMatch(l: Learning, keywords: string[]): number {
  const matches = l.tags.filter(tag => keywords.some(kw => tag.toLowerCase().includes(kw))).length
  return matches * l.confidence
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
