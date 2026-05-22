/**
 * Task structuring boundary — turns a free-form user objective into a TaskDefinition
 * for the ExecutionEngine. Uses the LLM via structureTask, with a deterministic fallback
 * when the structuring call fails, times out, or produces invalid JSON.
 *
 * Hardening (anti-hang, enterprise-grade):
 *   - 30s hard timeout via AbortSignal — Kimi / DeepSeek / OpenRouter can hang
 *     under load; falling back to `buildFallbackTask` after 30s is strictly
 *     better than pinning the UI in "structuring..." indefinitely.
 *   - External signal propagates: user-abort during structuring cancels cleanly.
 */
import type { AgentProvider } from '@kova/agent'
import { structureTask } from '@kova/execution'
import type { AgentMessage, TaskDefinition } from '@kova/shared'
import type { detectStack } from '@kova/adapters'
import { buildFallbackTask } from './session-utils'

const STRUCTURE_TIMEOUT_MS = 30_000

export interface BuildPatchTaskOptions {
  /** Caller-provided signal — usually `sessionAbort.signal` from EngineManager. */
  signal?: AbortSignal
}

export async function buildPatchTask(
  objective: string,
  provider: AgentProvider,
  projectRoot: string,
  adapter: ReturnType<typeof detectStack>,
  options: BuildPatchTaskOptions = {},
): Promise<TaskDefinition> {
  const fallback = buildFallbackTask(objective.split('\n')[0].slice(0, 120), adapter.name)
  // Pure-create scaffolding requests don't benefit from structuring — the
  // model only needs the user's words. Skipping structuring saves a round-trip
  // AND avoids the JSON-mode brittleness that hits weak/local models hardest.
  if (looksLikeScaffoldingRequest(objective)) return fallback

  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), STRUCTURE_TIMEOUT_MS)
  const composedSignal = options.signal
    ? AbortSignal.any([options.signal, timeoutController.signal])
    : timeoutController.signal

  try {
    const structured = await structureTask(objective, {
      root: projectRoot,
      stackAdapter: adapter.name,
      affectedFiles: [],
      llm: wrapWithSignal(provider, composedSignal),
    })
    if (structured.valid) return structured.task
  } catch {
    // Fallback below keeps the execution path available when structuring fails.
  } finally {
    clearTimeout(timeoutId)
  }
  return fallback
}

/**
 * Wraps the provider's `generate` so the structuring LLM call honours the
 * composed timeout/abort signal. structureTask doesn't take a signal directly,
 * so we thread it through the LLM facade.
 */
function wrapWithSignal(provider: AgentProvider, signal: AbortSignal): { generate: AgentProvider['generate'] } {
  return {
    async generate(messages: AgentMessage[], opts?: { system?: string; maxTokens?: number }) {
      if (signal.aborted) throw new Error('structuring aborted')
      return provider.generate(messages, opts)
    },
  }
}

/**
 * Detects "scaffold a fresh thing from scratch" requests where structuring
 * a JSON contract is pure overhead. Examples:
 *   - "crie uma landing page para barbearia"
 *   - "scaffold a next.js app with auth"
 *   - "gere um Dockerfile para Python"
 * The agent has all the tools it needs to interpret these directly.
 */
function looksLikeScaffoldingRequest(objective: string): boolean {
  const normalized = objective.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const hasCreateVerb = /\b(?:cri[aeio]r?|gere|gerar?|scaffold|bootstrap|generate|build|create|make|setup|set up)\b/.test(normalized)
  if (!hasCreateVerb) return false
  const hasDeliverable = /\b(?:landing|site|website|pagina|page|app|webapp|dockerfile|component|projeto|project|dashboard|admin)\b/.test(normalized)
  return hasDeliverable
}
