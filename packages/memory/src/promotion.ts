import type { Learning } from '@kova/shared'

// experimental → verified: confidence >= 3, sem contradições
// verified    → canonical: confidence >= 10
export function promoteLearnings(learnings: Learning[]): Learning[] {
  return learnings.map(l => {
    if (l.status === 'experimental' && l.confidence >= 3 && l.contradictions === 0) {
      return { ...l, status: 'verified' as const }
    }
    if (l.status === 'verified' && l.confidence >= 10) {
      return { ...l, status: 'canonical' as const }
    }
    return l
  })
}
