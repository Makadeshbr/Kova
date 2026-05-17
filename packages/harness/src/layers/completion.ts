import type { CompletionProof, HarnessError, LayerResult } from '@kova/shared'

export interface CompletionLayerConfig {
  proof: CompletionProof
}

export function runCompletionLayer(config: CompletionLayerConfig): LayerResult {
  const started = Date.now()
  const errors: HarnessError[] = []
  const warnings: LayerResult['warnings'] = []

  for (const item of config.proof.items) {
    if (item.satisfied) continue
    const requirement = config.proof.requirements.find(req => req.id === item.requirementId)
    const label = requirement?.label ?? item.requirementId
    const blocking = item.blocking ?? requirement?.required ?? true
    const message = item.reason ?? `Completion requirement not proven: ${label}`
    if (blocking) {
      errors.push({
        layer: 'completion',
        type: 'architecture',
        severity: item.fixable ? 'high' : 'critical',
        fixable: item.fixable,
        message,
        humanMessage: message,
        file: requirement?.kind === 'file' ? requirement.value : '',
        rule: `completion_${requirement?.kind ?? 'unknown'}`,
        suggestion: item.fixable ? 'Continue the task and produce runtime evidence before reporting completion.' : undefined,
      })
    } else {
      warnings.push({
        layer: 'completion',
        message,
        file: requirement?.kind === 'file' ? requirement.value : '',
      })
    }
  }

  return {
    name: 'completion',
    passed: errors.length === 0,
    errors,
    warnings,
    duration: Date.now() - started,
    durationMs: Date.now() - started,
    skipped: false,
    command: 'completion-proof',
  }
}
