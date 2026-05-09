import type { LearningCandidate, LearningGateResult, HarnessResult } from '@kova/shared'

const TEMPORARY_KEYWORDS = ['hack', 'fixme', 'todo', 'temporary', 'workaround', 'provisório']

export function classifyLearning(
  candidate: LearningCandidate,
  harnessResult: HarnessResult
): LearningGateResult {
  // Regra 1: Rejeitar sem evidências ou se harness falhou
  if (!harnessResult.passed) {
    return {
      classification: 'rejected_learning',
      reason: 'Validação do harness falhou. Não é possível registrar aprendizados não validados.',
      approved: false
    }
  }

  if (candidate.evidence.length === 0) {
    return {
      classification: 'rejected_learning',
      reason: 'Candidato não possui evidências vinculadas da execução atual.',
      approved: false
    }
  }

  // Regra 2: Detectar workarounds
  const descLower = candidate.description.toLowerCase()
  if (TEMPORARY_KEYWORDS.some(kw => descLower.includes(kw))) {
    return {
      classification: 'temporary_workaround',
      reason: 'Descrição indica que é uma solução provisória/hack.',
      approved: false
    }
  }

  // Verificar layers que rodaram
  const activeLayers = harnessResult.layers.filter(l => !l.skipped)
  const ranTests = activeLayers.some(l => l.name === 'tests')

  // Regra 3: Se não rodou testes, é needs_review
  if (!ranTests) {
    return {
      classification: 'needs_review',
      reason: 'Aprendizado gerado sem cobertura de testes. Requer aprovação humana.',
      approved: false
    }
  }

  // Regra 4: Escopo global restrito
  if (candidate.scope === 'global') {
    // Para simplificar, transformamos em project se a evidência é apenas local
    // Em um sistema real poderíamos analisar se cruza boundaries.
    return {
      classification: 'local_exception',
      reason: 'Aprendizado rebaixado para escopo de projeto. Escopo global requer mais iterações.',
      approved: true,
      adjustedCandidate: { ...candidate, scope: 'project' }
    }
  }

  // Regra 5: Seguro
  return {
    classification: 'safe_lesson',
    reason: 'Aprendizado validado com sucesso através de testes automatizados.',
    approved: true
  }
}
