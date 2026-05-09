import type { HarnessResult, HarnessError, AgentFeedback } from '@kova/shared'

export function buildFeedback(result: HarnessResult): AgentFeedback[] {
  const feedback: AgentFeedback[] = []
  for (const layer of result.layers) {
    if (layer.passed) continue
    for (const error of layer.errors) {
      feedback.push({
        error,
        instruction: buildInstruction(error, layer.name),
        context: buildContext(error),
      })
    }
  }
  return feedback
}

function buildInstruction(error: HarnessError, layer: string): string {
  switch (layer) {
    case 'build':
      return `Corrija o erro de compilação em ${error.file}:${error.line ?? '?'} — ${error.message}`
    case 'tests':
      return `Corrija o teste falhando: ${error.message}`
    case 'rules': {
      if (error.message.includes('Complexidade')) {
        return `Extraia sub-funções para reduzir a complexidade ciclomática: ${error.message}`
      }
      if (error.message.includes('Nesting')) {
        return `Use early-return ou extração de funções para reduzir nesting: ${error.message}`
      }
      return `Corrija a violação de arquitetura: ${error.message}`
    }
    case 'security':
      return `CRÍTICO: ${error.message}. Mova o valor para variável de ambiente.`
    case 'lint':
      return `Corrija a violação de lint em ${error.file}:${error.line ?? '?'} — ${error.message}`
    default:
      return error.message
  }
}

function buildContext(error: HarnessError): string {
  const parts: string[] = []
  if (error.file) parts.push(`Arquivo: ${error.file}`)
  if (error.line) parts.push(`Linha: ${error.line}`)
  if (error.rule) parts.push(`Regra: ${error.rule}`)
  parts.push(`Severidade: ${error.severity}`)
  return parts.join(' | ')
}
