import type { Learning } from '@kova/shared'

const DAYS_90 = 90 * 24 * 60 * 60 * 1000
const DAYS_180 = 180 * 24 * 60 * 60 * 1000

export function pruneLearnings(learnings: Learning[], max = 200): Learning[] {
  const now = Date.now()

  const pruned = learnings
    .map(l => applyRules(l, now))
    .filter((l): l is Learning => l !== null)

  // Mantém os mais confiantes dentro do limite
  return pruned
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, max)
}

function applyRules(l: Learning, now: number): Learning | null {
  // 2+ contradições → remove sempre
  if (l.contradictions >= 2) return null

  const lastSeen = new Date(l.lastSeen).getTime()
  const age = now - lastSeen

  // experimental: 1 contradição ou > 90 dias sem ver → remove
  if (l.status === 'experimental') {
    if (l.contradictions >= 1) return null
    if (age > DAYS_90) return null
    return l
  }

  // verified: 1+ contradição → demote; > 180 dias → demote
  if (l.status === 'verified') {
    if (l.contradictions >= 1) return { ...l, status: 'experimental' as const }
    if (age > DAYS_180) return { ...l, status: 'experimental' as const }
    return l
  }

  // canonical: nunca removido por anti-drift (requer intervenção humana)
  return l
}
