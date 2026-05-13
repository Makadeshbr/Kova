/**
 * Task structuring boundary — turns a free-form user objective into a TaskDefinition
 * for the ExecutionEngine. Uses the LLM via structureTask, with a deterministic fallback
 * when the structuring call fails or produces invalid JSON.
 */
import type { AgentProvider } from '@kova/agent'
import { structureTask } from '@kova/execution'
import type { TaskDefinition } from '@kova/shared'
import type { detectStack } from '@kova/adapters'
import { buildFallbackTask } from './session-utils'

export async function buildPatchTask(
  objective: string,
  provider: AgentProvider,
  projectRoot: string,
  adapter: ReturnType<typeof detectStack>,
): Promise<TaskDefinition> {
  try {
    const structured = await structureTask(objective, {
      root: projectRoot,
      stackAdapter: adapter.name,
      affectedFiles: [],
      llm: provider,
    })
    if (structured.valid) return structured.task
  } catch {
    // Fallback below keeps the execution path available when structuring fails.
  }
  return buildFallbackTask(objective.split('\n')[0].slice(0, 120), adapter.name)
}
