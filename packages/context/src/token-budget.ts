import type { ContextRelevance, ContextFile } from '@kova/shared'

export type ContextSource = 'instruction' | 'explicit' | 'error' | 'dependency' | 'grep' | 'memory' | 'profile' | 'diff'

const PRIORITY: Record<ContextRelevance, number> = {
  rules: 0, target: 1, error: 2, direct_dep: 3, learning: 4, indirect_dep: 5,
}

export interface PrioritizedFile {
  path: string
  content: string
  relevance: ContextRelevance
  score?: number
  reason?: string
  evidence?: string[]
  source?: ContextSource
}

export type ContextFileWithEvidence = ContextFile & {
  score?: number
  reason?: string
  evidence?: string[]
  source?: ContextSource
}

export interface BudgetResult {
  files: ContextFileWithEvidence[]
  tokensUsed: number
}

export function allocateBudget(files: PrioritizedFile[], maxTokens: number): BudgetResult {
  const sorted = [...files].sort((a, b) => {
    const byPriority = PRIORITY[a.relevance] - PRIORITY[b.relevance]
    if (byPriority !== 0) return byPriority
    return (b.score ?? 0) - (a.score ?? 0)
  })
  const included: ContextFile[] = []
  let tokensUsed = 0

  for (const file of sorted) {
    const tokens = estimateTokens(file.content)
    if (tokensUsed + tokens <= maxTokens) {
      included.push({ ...file, tokens })
      tokensUsed += tokens
    }
  }

  // Fallback: nenhum arquivo coube — inclui o mais prioritário truncado
  if (included.length === 0 && sorted.length > 0) {
    const first = sorted[0]
    const truncated = first.content.slice(0, maxTokens * 4)
    const tokens = estimateTokens(truncated)
    included.push({ ...first, content: truncated, tokens })
    tokensUsed = tokens
  }

  return { files: included, tokensUsed }
}

export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4)
}
