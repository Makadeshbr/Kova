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
      return `Fix the compilation error in ${error.file}:${error.line ?? '?'} - ${error.message}`
    case 'tests':
      return `Fix the failing test: ${error.message}`
    case 'rules': {
      if (error.message.includes('Complexidade')) {
        return `Extract helper functions to reduce cyclomatic complexity: ${error.message}`
      }
      if (error.message.includes('Nesting')) {
        return `Use early returns or extract functions to reduce nesting: ${error.message}`
      }
      return `Fix the architecture violation: ${error.message}`
    }
    case 'security':
      return `CRITICAL: ${error.message}. Move the value to an environment variable.`
    case 'lint':
      return `Fix the lint violation in ${error.file}:${error.line ?? '?'} - ${error.message}`
    default:
      return error.message
  }
}

function buildContext(error: HarnessError): string {
  const parts: string[] = []
  if (error.file) parts.push(`File: ${error.file}`)
  if (error.line) parts.push(`Line: ${error.line}`)
  if (error.rule) parts.push(`Rule: ${error.rule}`)
  parts.push(`Severity: ${error.severity}`)
  return parts.join(' | ')
}
