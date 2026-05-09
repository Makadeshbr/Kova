import { describe, expect, it, vi } from 'vitest'
import type { HarnessError, HarnessResult, LayerResult, TaskDefinition } from '@kova/shared'
import { ExecutionEngine } from '../src/execution-engine'
import type { ExecutionDependencies } from '../src/execution-engine'

const error: HarnessError = {
  layer: 'build',
  type: 'syntax',
  severity: 'high',
  fixable: true,
  message: 'Type error',
  humanMessage: 'Type error',
  file: 'src/app.ts',
}

function task(): TaskDefinition {
  return {
    id: 'task-1',
    objective: 'fix app type error',
    constraints: [],
    nonGoals: [],
    validationCriteria: ['build passes'],
    type: 'bugfix',
    impact: 'medium',
    affectedFiles: ['src/app.ts'],
    stackAdapter: 'typescript',
  }
}

function result(passed: boolean, errors: HarnessError[] = []): HarnessResult {
  const layer: LayerResult = {
    name: passed ? 'build' : 'lint',
    passed,
    errors,
    warnings: [],
    duration: 1,
    skipped: false,
  }
  // Use score 40 for failures (reject but repairable) instead of 0 (hard fail)
  return { passed, score: passed ? 100 : 40, layers: [layer], duration: 1, iteration: 1 }
}

describe('ExecutionEngine feedback loop', () => {
  it('usa modo fix e injeta erros do harness apos uma falha', async () => {
    const deps: ExecutionDependencies = {
      agent: {
        execute: vi.fn(async (_task, _context, mode) => ({
          mode,
          thought: `${mode} thought`,
          changes: mode === 'plan' ? [] : [{ path: 'src/app.ts', type: 'modify' as const, diff: 'const x = 1' }],
          tokensUsed: 1,
        })),
      },
      orchestrator: {
        run: vi.fn()
          .mockResolvedValueOnce({ harnessResult: result(false, [error]), scratchpadFallback: false, mode: 'standard' })
          .mockResolvedValueOnce({ harnessResult: result(true), scratchpadFallback: false, mode: 'standard' }),
      },
      contextEngine: {
        buildContext: vi.fn().mockResolvedValue({ files: [], tokensUsed: 1, learnings: [] }),
      },
      applicationEngine: {
        apply: vi.fn().mockResolvedValue({ applied: true, checkpointId: 'chk-1' }),
        rollback: vi.fn(),
      },
    }

    const engine = new ExecutionEngine(deps, { projectRoot: '/tmp/project', maxIterations: 2 })
    const state = await engine.run(task())

    const agentCalls = (deps.agent.execute as ReturnType<typeof vi.fn>).mock.calls
    const contextCalls = (deps.contextEngine.buildContext as ReturnType<typeof vi.fn>).mock.calls
    expect(state.status).toBe('completed')
    expect(agentCalls.map(call => call[2])).toEqual(['plan', 'code', 'fix'])
    expect(contextCalls[1][2]).toEqual({ harnessErrors: [error] })
  })
})
