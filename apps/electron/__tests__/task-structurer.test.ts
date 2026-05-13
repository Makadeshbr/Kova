/**
 * task-structurer unit tests — verifies the buildPatchTask helper extracted from
 * EngineManager. The contract: try structureTask with the LLM; fall back to a
 * deterministic task when structuring fails or returns invalid output.
 */
import { describe, it, expect, vi } from 'vitest'
import { buildPatchTask } from '../src/main/task-structurer'
import type { AgentProvider } from '@kova/agent'
import { GenericAdapter } from '@kova/adapters'

function mockProvider(thought: string): AgentProvider {
  return {
    capabilities: () => ({ supportsToolCalls: true, contextTokenLimit: 8_000 }),
    generate: vi.fn().mockResolvedValue({ thought, changes: [], tokensUsed: 1 }),
    runAgentLoop: vi.fn(),
  }
}

describe('buildPatchTask', () => {
  it('returns the structured task when LLM produces valid JSON', async () => {
    const provider = mockProvider(JSON.stringify({
      objective: 'Add prime check helper',
      constraints: [],
      nonGoals: [],
      validationCriteria: ['tests must pass'],
      type: 'feature',
      impact: 'low',
    }))

    const task = await buildPatchTask('Add isPrime helper', provider, '/tmp/project', GenericAdapter)
    expect(task.objective).toContain('Add prime check helper')
    expect(task.validationCriteria).toContain('tests must pass')
  })

  it('falls back when LLM throws an error', async () => {
    const provider: AgentProvider = {
      capabilities: () => ({ supportsToolCalls: true, contextTokenLimit: 8_000 }),
      generate: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
      runAgentLoop: vi.fn(),
    }

    const task = await buildPatchTask('Implement feature X', provider, '/tmp/project', GenericAdapter)
    // fallback truncates to first line, max 120 chars
    expect(task.objective).toBe('Implement feature X')
    expect(task.stackAdapter).toBe('generic')
  })

  it('falls back when LLM produces invalid JSON', async () => {
    const provider = mockProvider('not a JSON at all')
    const task = await buildPatchTask('A real task', provider, '/tmp/project', GenericAdapter)
    expect(task.objective).toBe('A real task')
  })

  it('fallback respects explicit language in the objective (JS puro → javascript stack)', async () => {
    const provider = mockProvider('garbage')
    const task = await buildPatchTask(
      'Crie um modulo em JavaScript puro',
      provider,
      '/tmp/empty',
      GenericAdapter,
    )
    // resolveTaskStack should kick in via buildFallbackTask and upgrade generic → javascript
    expect(task.stackAdapter).toBe('javascript')
  })

  it('fallback truncates long objectives to 120 chars on the first line', async () => {
    const longObjective = 'A'.repeat(200) + '\nsecond line'
    const provider = mockProvider('not JSON')
    const task = await buildPatchTask(longObjective, provider, '/tmp/p', GenericAdapter)
    expect(task.objective.length).toBeLessThanOrEqual(120)
    expect(task.objective).not.toContain('second line')
  })
})
