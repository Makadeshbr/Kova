import { classifyCommandEnvironmentIssue, type HarnessError, type LayerResult } from '@kova/shared'

/**
 * Converts build/test output that indicates environment breakage into a typed
 * HarnessError. Pattern knowledge lives in @kova/shared because the agent tool
 * layer must classify the same failures before it starts retrying commands.
 */
export function classifyEnvironmentFailure(
  layer: LayerResult['name'],
  output: string,
  command: string | undefined,
): HarnessError | null {
  const issue = classifyCommandEnvironmentIssue(output)
  if (!issue) return null
  const commandPrefix = command ? `${command}: ` : ''
  return {
    layer,
    type: 'environment',
    severity: 'critical',
    fixable: false,
    message: `${commandPrefix}${issue.matchedText}`,
    humanMessage: issue.humanMessage,
    file: '',
    rule: issue.rule,
    suggestion: issue.suggestion,
  }
}
