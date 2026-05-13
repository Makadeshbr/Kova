import type { LearningCandidate, LearningGateResult, HarnessResult } from '@kova/shared'

const TEMPORARY_KEYWORDS = ['hack', 'fixme', 'todo', 'temporary', 'workaround', 'provisório', 'gambiarra']
const INVALIDATION_TRIGGERS = ['until', 'when', 'as long as', 'enquanto', 'até que', 'quando mudar', 'if version']

export function classifyLearning(
  candidate: LearningCandidate,
  harnessResult: HarnessResult
): LearningGateResult {
  // Regra 1: Rejeitar sem evidências ou se harness falhou
  if (!harnessResult.passed) {
    return {
      classification: 'rejected_learning',
      reason: 'Validação do harness falhou. Não é possível registrar aprendizados não validados.',
      approved: false,
    }
  }

  if (candidate.evidence.length === 0) {
    return {
      classification: 'rejected_learning',
      reason: 'Candidato não possui evidências vinculadas da execução atual.',
      approved: false,
    }
  }

  const descLower = candidate.description.toLowerCase()

  // Regra 2: Detectar workarounds/temporários → nunca viram padrão automático
  if (TEMPORARY_KEYWORDS.some(kw => descLower.includes(kw))) {
    return {
      classification: 'temporary_workaround',
      reason: 'Descrição indica solução provisória/hack. Workaround não deve virar aprendizado automático.',
      approved: false,
    }
  }

  // Regra 3: Detectar candidatos com condição temporal → registrar, mas com invalidationRule
  const hasInvalidationTrigger = INVALIDATION_TRIGGERS.some(kw => descLower.includes(kw))

  // Verificar layers que rodaram
  const activeLayers = harnessResult.layers.filter(l => !l.skipped)
  const ranTests = activeLayers.some(l => l.name === 'tests')

  // Regra 4: Se não rodou testes, requer revisão humana
  if (!ranTests) {
    return {
      classification: 'needs_review',
      reason: 'Aprendizado gerado sem cobertura de testes. Requer aprovação humana antes de registrar.',
      approved: false,
    }
  }

  // Regra 5: Escopo global restrito — rebaixa para project até ter mais iterações
  if (candidate.scope === 'global') {
    return {
      classification: 'local_exception',
      reason: 'Rebaixado para escopo de projeto. Escopo global requer evidências em múltiplos projetos.',
      approved: true,
      adjustedCandidate: { ...candidate, scope: 'project' },
    }
  }

  // Regra 6: Aprovado — com invalidationRule se houver gatilho temporal
  return {
    classification: 'safe_lesson',
    reason: 'Aprendizado validado com harness e testes reais.',
    approved: true,
    invalidationRule: hasInvalidationTrigger
      ? 'Revalidar quando o contexto descrito na condição mudar.'
      : undefined,
  }
}

/** Derives a short, normalized description key for deduplication. */
export function descriptionKey(description: string): string {
  return description.toLowerCase().replace(/\W+/g, ' ').trim().slice(0, 200)
}
