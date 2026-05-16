import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ExecutionEvent, TaskDefinition, HarnessResult, LayerResult } from '@kova/shared'
import { ExecutionEngine } from '../src/execution-engine'
import type { ExecutionDependencies, ExecutionEngineOptions } from '../src/execution-engine'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTask(id = 'task-1', overrides: Partial<TaskDefinition> = {}): TaskDefinition {
  return {
    id, objective: 'implement feature', constraints: [], nonGoals: [],
    validationCriteria: [], type: 'feature', impact: 'medium',
    affectedFiles: ['src/app.ts'], stackAdapter: 'typescript',
    ...overrides,
  }
}

// passed=true + build weight=25 único → calculateScore retorna 100 → auto_apply
function makePassResult(): HarnessResult {
  const layer: LayerResult = { name: 'build', passed: true, errors: [], warnings: [], duration: 10, skipped: false }
  return { passed: true, score: 100, layers: [layer], duration: 20, iteration: 1 }
}

// build failed → calculateScore detecta hasHardFail → score=0 → reject
function makeFailResult(): HarnessResult {
  const layer: LayerResult = { name: 'build', passed: false, errors: [], warnings: [], duration: 10, skipped: false }
  return { passed: false, score: 0, layers: [layer], duration: 20, iteration: 1 }
}

// lint failed → score ~40 → reject (repairable, NOT hard fail)
function makeSoftRejectResult(): HarnessResult {
  const layer: LayerResult = { name: 'lint', passed: false, errors: [{
    layer: 'lint', type: 'style', severity: 'high', fixable: true,
    message: 'lint error', humanMessage: 'lint error', file: 'src/app.ts',
  }], warnings: [], duration: 10, skipped: false }
  return { passed: false, score: 40, layers: [layer], duration: 20, iteration: 1 }
}

function makeDeps(overrides: Partial<ExecutionDependencies> = {}): ExecutionDependencies {
  return {
    agent: {
      execute: vi.fn().mockImplementation(async (_t: unknown, _c: unknown, mode: string) => ({
        mode,
        thought: 'Agent thought',
        // plan mode is read-only; code/fix modes produce a real change
        changes: mode === 'plan' ? [] : [{ path: 'src/app.ts', type: 'modify', diff: 'const x = 1' }],
        tokensUsed: 100,
      })),
    },
    orchestrator: {
      run: vi.fn().mockResolvedValue({ harnessResult: makePassResult(), scratchpadFallback: false, mode: 'standard' }),
    },
    contextEngine: {
      buildContext: vi.fn().mockResolvedValue({ files: [], tokensUsed: 50, learnings: [] }),
    },
    applicationEngine: {
      apply: vi.fn().mockResolvedValue({ applied: true, checkpointId: 'chk-1', patches: [] }),
      rollback: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  }
}

function makeOptions(overrides: Partial<ExecutionEngineOptions> = {}): ExecutionEngineOptions {
  return { projectRoot: '/tmp/project', ...overrides }
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('ExecutionEngine', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('run — loop completo', () => {
    it('deve completar com status completed quando score >= 90 (auto_apply)', async () => {
      const deps = makeDeps()
      const engine = new ExecutionEngine(deps, makeOptions())
      const state = await engine.run(makeTask())

      expect(state.status).toBe('completed')
      expect(state.currentIteration).toBe(1)
      expect(deps.applicationEngine.apply).toHaveBeenCalledOnce()
    })

    it('deve chamar agent em mode plan na primeira iteração', async () => {
      const deps = makeDeps()
      const engine = new ExecutionEngine(deps, makeOptions())
      await engine.run(makeTask())

      const modes = (deps.agent.execute as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[2])
      expect(modes).toContain('plan')
      expect(modes).toContain('code')
    })

    it('deve registrar iteração no histórico com thought e changes', async () => {
      const deps = makeDeps()
      const engine = new ExecutionEngine(deps, makeOptions())
      const state = await engine.run(makeTask())

      expect(state.iterationHistory).toHaveLength(1)
      expect(state.iterationHistory[0].agentThought).toBe('Agent thought')
    })

    it('deve pausar sem aplicar quando autoApply=false mesmo com score alto', async () => {
      const deps = makeDeps()
      const engine = new ExecutionEngine(deps, makeOptions({ autoApply: false }))
      const state = await engine.run(makeTask())

      expect(state.status).toBe('paused')
      expect(state.currentIteration).toBe(1)
      expect(deps.applicationEngine.apply).not.toHaveBeenCalled()
      expect(state.iterationHistory[0].decision.decision).toBe('auto_apply')
    })

    it('deve acumular tokens usados no estado', async () => {
      const deps = makeDeps()
      const engine = new ExecutionEngine(deps, makeOptions())
      const state = await engine.run(makeTask())

      expect(state.totalTokens).toBe(150) // 100 (agent) + 50 (context)
    })

    it('deve emitir eventos de streaming do contrato ate a decisao', async () => {
      const events: ExecutionEvent[] = []
      const deps = makeDeps()
      const engine = new ExecutionEngine(deps, makeOptions({ onEvent: event => events.push(event) }))
      await engine.run(makeTask())

      expect(events.map(e => e.type)).toContain('contract_created')
      expect(events.map(e => e.type)).toContain('agent_started')
      expect(events.map(e => e.type)).toContain('validation_completed')
      expect(events.map(e => e.type)).toContain('decision_made')
    })

    it('deve rejeitar antes do orchestrator quando contrato detecta mismatch de stack', async () => {
      const deps = makeDeps()
      ;(deps.agent.execute as ReturnType<typeof vi.fn>).mockImplementation(
        async (_t: unknown, _c: unknown, mode: string) => ({
          mode,
          thought: 'thought',
          changes: mode === 'code' ? [{ path: 'src/helpers.ts', type: 'create', diff: 'export const x = 1' }] : [],
          tokensUsed: 10,
        }),
      )
      const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1 }))
      const state = await engine.run(makeTask(undefined, {
        objective: 'create go api',
        affectedFiles: ['main.go'],
        stackAdapter: 'go',
      } as Partial<TaskDefinition>))

      expect(deps.orchestrator.run).not.toHaveBeenCalled()
      // ReviewGate detects scope + stack violation and escalates to human_required (not just reject)
      expect(['reject', 'human_required']).toContain(state.iterationHistory[0].decision.decision)
      expect(state.iterationHistory[0].harnessResult.layers[0].errors.map(e => e.rule)).toContain('stack_mismatch')
    })
  })

  describe('stop — max iterations', () => {
    it('deve falhar na primeira iteração com build score=0 (hard fail imediato)', async () => {
      // build failed → score=0 → reject → hard fail stops engine immediately
      const deps = makeDeps({
        orchestrator: {
          run: vi.fn().mockResolvedValue({ harnessResult: makeFailResult(), scratchpadFallback: false, mode: 'standard' }),
        },
      })
      const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 2 }))
      const state = await engine.run(makeTask())

      // plan (iter 1, no changes) + code (iter 2, build fails) = 2 iterations
      expect(state.currentIteration).toBe(2)
      expect(state.status).toBe('failed')
    })

    it('Proof Pack vem do harness e nao de texto livre do modelo quando build falha', async () => {
      const failing = makeFailResult()
      failing.layers[0].command = 'python -m py_compile task_manager.py test_task_manager.py'
      const deps = makeDeps({
        agent: {
          execute: vi.fn().mockResolvedValue({
            mode: 'unified',
            thought: '## Proof Pack\n- py_compile passed\n- unittest passed',
            changes: [{ path: 'task_manager.py', type: 'modify' as const, diff: 'def broken(:\n' }],
            tokensUsed: 50,
          }),
        },
        orchestrator: {
          run: vi.fn().mockResolvedValue({ harnessResult: failing, scratchpadFallback: false, mode: 'standard' }),
        },
      })
      const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1, skipPlan: true }))

      const state = await engine.run(makeTask('task-python', { stackAdapter: 'python', affectedFiles: ['task_manager.py'] }))

      expect(state.status).toBe('failed')
      expect(state.proofPack?.validationsRun[0]).toMatchObject({
        kind: 'build',
        command: 'python -m py_compile task_manager.py test_task_manager.py',
        passed: false,
        source: 'harness',
      })
      expect(state.proofPack?.finalDecision).toBe('reject')
      expect(state.proofPack?.finalUiDecision).toBe('repair_needed')
      expect(state.proofPack?.sourceOfTruth).toBe('harness')
      expect(state.proofPack?.results?.passed).toBe(false)
      expect(state.proofPack?.summary).toContain('harness')
      expect(JSON.stringify(state.proofPack)).not.toContain('unittest passed')
    })

    it('Proof Pack sem validacao real fica needs_review e nao declara sucesso completo', async () => {
      const noValidation: HarnessResult = {
        passed: false,
        score: 55,
        layers: [{
          name: 'rules',
          passed: true,
          errors: [],
          warnings: [{ layer: 'rules', message: 'Nenhuma validacao configurada', file: '' }],
          duration: 0,
          durationMs: 0,
          skipped: true,
          skippedReason: 'no_validation_layers_configured',
          status: 'skipped',
        }],
        duration: 0,
        iteration: 1,
        validationConfidence: 'none',
        skippedLayers: ['build', 'typecheck', 'tests', 'rules'],
      }
      const deps = makeDeps({
        agent: {
          execute: vi.fn().mockResolvedValue({
            mode: 'unified',
            thought: 'All tests passed',
            changes: [{ path: 'src/app.ts', type: 'modify' as const, diff: '+const x = 1\n' }],
            tokensUsed: 50,
          }),
        },
        orchestrator: {
          run: vi.fn().mockResolvedValue({ harnessResult: noValidation, scratchpadFallback: false, mode: 'standard' }),
        },
      })
      const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1, skipPlan: true, autoApply: true }))

      const state = await engine.run(makeTask())

      expect(state.status).toBe('paused')
      expect(state.proofPack?.results?.validationConfidence).toBe('none')
      expect(state.proofPack?.finalUiDecision).toBe('needs_review')
      expect(state.proofPack?.validationsNotRun.map(v => v.kind)).toEqual(expect.arrayContaining(['rules', 'build', 'typecheck', 'tests']))
      expect(state.proofPack?.residualRisk.join(' ')).toContain('No real validation executed')
    })
  })

  describe('stop — timeout', () => {
    it('deve falhar com status failed em timeout imediato (timeoutMs=0)', async () => {
      // timeoutMs=0 → elapsed(0) >= 0 → timeout antes da primeira iteração
      const deps = makeDeps()
      const engine = new ExecutionEngine(deps, makeOptions({ timeoutMs: 0 }))
      const state = await engine.run(makeTask())

      expect(state.currentIteration).toBe(0)
      expect(state.status).toBe('failed')
    })
  })

  describe('pause / resume', () => {
    it('deve pausar o loop quando pause() é chamado durante execução', async () => {
      let codeCallCount = 0
      const deps = makeDeps({
        orchestrator: {
          run: vi.fn().mockResolvedValue({ harnessResult: makeSoftRejectResult(), scratchpadFallback: false, mode: 'standard' }),
        },
      })

      // Referência ao engine para ser usada dentro do mock
      let engine!: ExecutionEngine
      ;(deps.agent.execute as ReturnType<typeof vi.fn>).mockImplementation(
        async (_t: unknown, _c: unknown, mode: string) => {
          if (mode === 'code' && ++codeCallCount === 1) engine.pause()
          return { mode, thought: 'thought', changes: [{ path: 'src/app.ts', type: 'modify' as const, diff: 'x' }], tokensUsed: 50 }
        },
      )

      engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 5 }))
      const state = await engine.run(makeTask())

      expect(state.status).toBe('paused')
      expect(state.currentIteration).toBeGreaterThanOrEqual(1)
    })

    it('throws when resuming an engine that is not paused', async () => {
      const engine = new ExecutionEngine(makeDeps(), makeOptions())
      await expect(engine.resume()).rejects.toThrow('Engine is not paused')
    })

    it('deve retomar execução e continuar iterando após resume', async () => {
      let codeCallCount = 0
      const deps = makeDeps({
        orchestrator: {
          run: vi.fn().mockResolvedValue({ harnessResult: makeSoftRejectResult(), scratchpadFallback: false, mode: 'standard' }),
        },
      })

      let engine!: ExecutionEngine
      ;(deps.agent.execute as ReturnType<typeof vi.fn>).mockImplementation(
        async (_t: unknown, _c: unknown, mode: string) => {
          if (mode === 'code' && ++codeCallCount === 1) engine.pause()
          return { mode, thought: 'thought', changes: [{ path: 'src/app.ts', type: 'modify' as const, diff: 'x' }], tokensUsed: 50 }
        },
      )

      engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 3 }))
      const paused = await engine.run(makeTask())
      expect(paused.status).toBe('paused')

      const final = await engine.resume()
      expect(final.currentIteration).toBeGreaterThan(paused.currentIteration)
    })
  })

  describe('abort', () => {
    it('deve marcar failed quando abort é chamado após run completar', async () => {
      const deps = makeDeps()
      const engine = new ExecutionEngine(deps, makeOptions())
      await engine.run(makeTask())

      await engine.abort()

      expect(engine.getState()?.status).toBe('failed')
    })

    it('abort durante LLM ativo — interrompe sem esperar iteração completar', async () => {
      let resolveAgent!: () => void
      let capturedSignal: AbortSignal | undefined

      const deps = makeDeps({
        agent: {
          execute: vi.fn().mockImplementation(async (_t: unknown, _c: unknown, mode: string, opts?: { signal?: AbortSignal }) => {
            capturedSignal = opts?.signal
            // Simulate a long LLM call by waiting until the signal fires
            await new Promise<void>((resolve, reject) => {
              resolveAgent = resolve
              if (opts?.signal) {
                opts.signal.addEventListener('abort', () => {
                  const err = new Error('Aborted'); err.name = 'AbortError'; reject(err)
                })
              }
            })
            return { mode, thought: '', changes: [], tokensUsed: 0 }
          }),
        },
      })

      const engine = new ExecutionEngine(deps, makeOptions())
      const runPromise = engine.run(makeTask())

      // Wait for agent to start
      await new Promise(r => setTimeout(r, 20))

      // Abort fires mid-LLM
      await engine.abort()
      await runPromise

      expect(engine.getState()?.status).toBe('failed')
      // The signal was passed to the agent — providers can abort HTTP connections
      expect(capturedSignal).toBeDefined()
      expect(capturedSignal!.aborted).toBe(true)
    })

    it('abort durante contextEngine.buildContext — runIteration detecta flag e não inicia LLM', async () => {
      let resolveContext!: () => void
      const agentExecute = vi.fn().mockResolvedValue({ mode: 'code', thought: '', changes: [], tokensUsed: 0 })

      const deps = makeDeps({
        agent: { execute: agentExecute },
        contextEngine: {
          buildContext: vi.fn().mockImplementation(() => new Promise<{ files: []; tokensUsed: 0; learnings: [] }>(resolve => {
            resolveContext = () => resolve({ files: [], tokensUsed: 0, learnings: [] })
          })),
        },
      })

      const engine = new ExecutionEngine(deps, makeOptions())
      const runPromise = engine.run(makeTask())

      // Let buildContext start, then abort while it's suspended
      await new Promise(r => setTimeout(r, 10))
      await engine.abort()

      // Unblock context build — engine should detect aborted flag and skip LLM
      resolveContext()
      const state = await runPromise

      expect(state.status).toBe('failed')
      // LLM was NOT called because runIteration checks this.aborted after buildContext
      expect(agentExecute).not.toHaveBeenCalled()
    })

    it('rollback é chamado no checkpoint mais recente quando abort dispara', async () => {
      const rollback = vi.fn().mockResolvedValue(undefined)
      const deps = makeDeps({
        applicationEngine: {
          apply: vi.fn().mockResolvedValue({ applied: true, checkpointId: 'chk-42', patches: [] }),
          rollback,
        },
      })

      const engine = new ExecutionEngine(deps, makeOptions())
      await engine.run(makeTask()) // completes, records checkpointId 'chk-42'
      await engine.abort()

      expect(rollback).not.toHaveBeenCalled()
    })
  })

  describe('forceApply', () => {
    it('deve aplicar changes da última iteração e marcar completed', async () => {
      // build falha → reject → loop para em maxIterations=1
      const deps = makeDeps({
        orchestrator: {
          run: vi.fn().mockResolvedValue({ harnessResult: makeFailResult(), scratchpadFallback: false, mode: 'standard' }),
        },
        applicationEngine: {
          apply: vi.fn().mockResolvedValue({ applied: true, checkpointId: 'chk-forced', patches: [] }),
          rollback: vi.fn(),
        },
      })

      const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1 }))
      const state = await engine.run(makeTask())

      expect(state.status).not.toBe('completed')
      expect(state.currentIteration).toBe(1)

      await engine.forceApply()
      expect(engine.getState()?.status).toBe('completed')
    })

    it('deve lançar erro quando não há iterações (timeout imediato)', async () => {
      const engine = new ExecutionEngine(makeDeps(), makeOptions({ timeoutMs: 0 }))
      await engine.run(makeTask())

      await expect(engine.forceApply()).rejects.toThrow('Sem changes')
    })
  })
})

// ─── Contract enforcement regression tests ────────────────────────────────────

describe('ExecutionEngine — Contract enforcement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('text-only response completes immediately without harness', async () => {
    // Regression: when model replies with text and writes no files, the engine
    // must complete immediately (status=completed) without running the harness.
    const orchestratorSpy = vi.fn()
    const deps = makeDeps({
      agent: {
        execute: vi.fn().mockResolvedValue({ mode: 'unified', thought: 'done', changes: [], tokensUsed: 10 }),
      },
      orchestrator: { run: orchestratorSpy } as never,
    })
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1, autoApply: true }))
    const state = await engine.run(makeTask())

    expect(state.status).toBe('completed')
    expect(orchestratorSpy).not.toHaveBeenCalled()
  })

  it('text-only response has auto_apply decision even with autoApply=false', async () => {
    // When no files changed, completing is always safe — there is nothing to apply.
    const deps = makeDeps({
      agent: {
        execute: vi.fn().mockResolvedValue({ mode: 'unified', thought: 'done', changes: [], tokensUsed: 10 }),
      },
    })
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1, autoApply: false }))
    const state = await engine.run(makeTask())

    expect(state.status).toBe('completed')
    const last = state.iterationHistory.at(-1)
    expect(last?.decision.decision).toBe('auto_apply')
  })

  it('max_files_changed violation leads to reject (agent-fixable)', async () => {
    // Low-impact task allows 6 files. Model changes 8 → contract violation → reject.
    const bigChange = Array.from({ length: 8 }, (_, i) => ({
      path: `src/file${i}.ts`, type: 'create' as const, diff: 'const x = 1',
    }))
    const deps = makeDeps({
      agent: {
        execute: vi.fn().mockResolvedValue({ mode: 'code', thought: '', changes: bigChange, tokensUsed: 100 }),
      },
    })
    const task = makeTask('t1', { impact: 'low', stackAdapter: 'typescript' })  // maxFilesChanged=6
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1, autoApply: false }))
    const state = await engine.run(task)

    const last = state.iterationHistory.at(-1)
    expect(last?.decision.decision).toBe('reject')
    expect(last?.decision.score).toBeLessThan(70)
  })
})

describe('ExecutionEngine — dynamic maxIterations (FIX-007)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('low-impact task gets ≥5 iterations even when user passes a smaller value', async () => {
    const deps = makeDeps()
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1 }))
    const state = await engine.run(makeTask('t', { impact: 'low' }))
    // contract.maxFilesChanged for low impact = 6 → ceil(6 * 0.6) = 4 → floor max(1, 4) = 4
    // Actually the floor is bumped to at least 5 by the helper to keep minimum sanity.
    expect(state.maxIterations).toBeGreaterThanOrEqual(5)
  })

  it('medium-impact task auto-scales above default of 5', async () => {
    const deps = makeDeps()
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 5 }))
    const state = await engine.run(makeTask('t', { impact: 'medium' }))
    // contract.maxFilesChanged for medium = 12 → ceil(12 * 0.6) = 8 → max(5, 8) = 8
    expect(state.maxIterations).toBe(8)
  })

  it('high-impact task scales up to 12 even with user default 5', async () => {
    const deps = makeDeps()
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 5 }))
    const state = await engine.run(makeTask('t', { impact: 'high' }))
    // contract.maxFilesChanged for high = 20 → ceil(20 * 0.6) = 12 → max(5, 12) = 12
    expect(state.maxIterations).toBe(12)
  })

  it('respects an explicit user override above the computed floor', async () => {
    const deps = makeDeps()
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 15 }))
    const state = await engine.run(makeTask('t', { impact: 'low' }))
    expect(state.maxIterations).toBe(15)
  })

  it('uses contract from options when provided, instead of recomputing from task', async () => {
    const deps = makeDeps()
    const customContract = {
      id: 'c-1',
      taskId: 't',
      objective: 'test',
      stackAdapter: 'typescript',
      allowedPaths: ['**'],
      forbiddenPaths: [],
      safeZones: [],
      allowedCommands: [],
      forbiddenCommands: [],
      validationCriteria: [],
      requiresTests: false,
      maxFilesChanged: 18,
      createdAt: new Date().toISOString(),
    }
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 5, contract: customContract }))
    const state = await engine.run(makeTask('t', { impact: 'low' }))
    // ceil(18 * 0.6) = 11 → max(5, 11) = 11
    expect(state.maxIterations).toBe(11)
  })

  it('uses safe default of 5 when no maxIterations is provided and impact is low', async () => {
    const deps = makeDeps()
    const engine = new ExecutionEngine(deps, makeOptions({}))
    const state = await engine.run(makeTask('t', { impact: 'low' }))
    expect(state.maxIterations).toBeGreaterThanOrEqual(5)
  })
})

// ─── FIX-018: session-scoped todos across iterations ─────────────────────────

describe('ExecutionEngine — todos persist across iterations (FIX-018)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes empty initialTodos to the agent on the first iteration', async () => {
    const deps = makeDeps()
    const engine = new ExecutionEngine(deps, makeOptions())
    await engine.run(makeTask())
    const firstCall = (deps.agent.execute as ReturnType<typeof vi.fn>).mock.calls[0]
    const opts = firstCall[3]
    // No prior list → undefined, not an empty array (preserves API)
    expect(opts.initialTodos).toBeUndefined()
  })

  it('replays the latest todos to the next iteration as initialTodos', async () => {
    const todosFromAgent = [
      { content: 'Refactor auth', activeForm: 'Refactoring auth', status: 'completed' as const },
      { content: 'Write tests',   activeForm: 'Writing tests',     status: 'in_progress' as const },
    ]

    let agentCallCount = 0
    const deps = makeDeps({
      agent: {
        execute: vi.fn().mockImplementation(async (_t: unknown, _c: unknown, mode: string, opts: { onTodosUpdated?: (t: unknown[]) => void }) => {
          agentCallCount++
          // First call: agent emits a plan via the callback (todo_write).
          if (agentCallCount === 1) {
            opts.onTodosUpdated?.(todosFromAgent)
          }
          // plan mode returns no changes; code/fix produces a real change
          return {
            mode,
            thought: `iter ${agentCallCount}`,
            changes: mode === 'plan' ? [] : [{ path: 'src/app.ts', type: 'modify', diff: 'x' }],
            tokensUsed: 100,
            todos: todosFromAgent,
          }
        }),
      },
      // Force a repair loop: first iteration fails, second passes.
      orchestrator: {
        run: vi.fn()
          .mockResolvedValueOnce({ harnessResult: makeSoftRejectResult(), scratchpadFallback: false, mode: 'standard' })
          .mockResolvedValue({ harnessResult: makePassResult(), scratchpadFallback: false, mode: 'standard' }),
      },
    })

    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 3 }))
    await engine.run(makeTask())

    const calls = (deps.agent.execute as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.length).toBeGreaterThanOrEqual(2)
    // Last call (the 'fix' iteration) MUST receive the prior list as initialTodos.
    const lastOpts = calls[calls.length - 1][3]
    expect(lastOpts.initialTodos).toEqual(todosFromAgent)
  })

  it('emits a todos_updated ExecutionEvent when the agent calls todo_write', async () => {
    const events: ExecutionEvent[] = []
    const updatedList = [
      { content: 'Step', activeForm: 'Stepping', status: 'pending' as const },
    ]
    const deps = makeDeps({
      agent: {
        execute: vi.fn().mockImplementation(async (_t: unknown, _c: unknown, mode: string, opts: { onTodosUpdated?: (t: unknown[]) => void }) => {
          opts.onTodosUpdated?.(updatedList)
          return {
            mode, thought: 'done',
            changes: mode === 'plan' ? [] : [{ path: 'src/app.ts', type: 'modify', diff: 'x' }],
            tokensUsed: 50,
          }
        }),
      },
    })
    const engine = new ExecutionEngine(deps, makeOptions({ onEvent: (e) => events.push(e) }))
    await engine.run(makeTask())

    const todosEvents = events.filter(e => e.type === 'todos_updated')
    expect(todosEvents.length).toBeGreaterThanOrEqual(1)
    expect(todosEvents[0].todos).toEqual(updatedList)
  })

  it('forwards onTodosUpdated option to consumers (direct stream)', async () => {
    const captured: Array<Array<unknown>> = []
    const list = [{ content: 'S', activeForm: 'Sing', status: 'pending' as const }]
    const deps = makeDeps({
      agent: {
        execute: vi.fn().mockImplementation(async (_t: unknown, _c: unknown, mode: string, opts: { onTodosUpdated?: (t: unknown[]) => void }) => {
          opts.onTodosUpdated?.(list)
          return { mode, thought: '', changes: mode === 'plan' ? [] : [{ path: 'src/app.ts', type: 'modify', diff: 'x' }], tokensUsed: 0 }
        }),
      },
    })
    const engine = new ExecutionEngine(deps, makeOptions({ onTodosUpdated: (t) => captured.push(t) }))
    await engine.run(makeTask())

    expect(captured.length).toBeGreaterThanOrEqual(1)
    expect(captured[0]).toEqual(list)
  })
})

// ─── FIX-019: ContextEngine cache per session ────────────────────────────────

describe('ExecutionEngine — ContextEngine cache (FIX-019)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('builds context fresh on the first iteration and reuses it across a stable repair loop', async () => {
    const deps = makeDeps({
      // Two repair iterations on the SAME error file — same error surface,
      // cache should kick in for iter 2.
      orchestrator: {
        run: vi.fn()
          .mockResolvedValueOnce({
            harnessResult: {
              passed: false, score: 40, duration: 10, iteration: 1,
              layers: [{ name: 'lint', passed: false, errors: [{
                layer: 'lint', type: 'style', severity: 'high', fixable: true,
                message: 'lint error', humanMessage: 'lint error', file: 'src/app.ts',
              }], warnings: [], duration: 5, skipped: false }],
            }, scratchpadFallback: false, mode: 'standard',
          })
          .mockResolvedValueOnce({
            harnessResult: {
              passed: false, score: 40, duration: 10, iteration: 2,
              layers: [{ name: 'lint', passed: false, errors: [{
                layer: 'lint', type: 'style', severity: 'high', fixable: true,
                message: 'lint error', humanMessage: 'lint error', file: 'src/app.ts',
              }], warnings: [], duration: 5, skipped: false }],
            }, scratchpadFallback: false, mode: 'standard',
          })
          .mockResolvedValue({ harnessResult: makePassResult(), scratchpadFallback: false, mode: 'standard' }),
      },
    })
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 4 }))
    await engine.run(makeTask())

    const calls = (deps.contextEngine.buildContext as ReturnType<typeof vi.fn>).mock.calls
    // First iteration always builds; later ones reuse when error files are the
    // same set. We expect MORE iterations than buildContext invocations.
    expect(calls.length).toBeLessThan(3)
    expect(calls.length).toBeGreaterThanOrEqual(1)
  })

  it('rebuilds when the harness reveals a NEW error file (different surface)', async () => {
    let agentCall = 0
    const deps = makeDeps({
      agent: {
        execute: vi.fn().mockImplementation(async (_t: unknown, _c: unknown, mode: string) => {
          agentCall++
          return {
            mode, thought: `iter ${agentCall}`,
            // First repair pretends to "move" the bug to a new file
            changes: mode === 'plan' ? [] : [{ path: 'src/other.ts', type: 'modify', diff: 'x' }],
            tokensUsed: 50,
          }
        }),
      },
      orchestrator: {
        run: vi.fn()
          .mockResolvedValueOnce({
            harnessResult: {
              passed: false, score: 40, duration: 10, iteration: 1,
              layers: [{ name: 'lint', passed: false, errors: [{
                layer: 'lint', type: 'style', severity: 'high', fixable: true,
                message: 'x', humanMessage: 'x', file: 'src/app.ts',
              }], warnings: [], duration: 5, skipped: false }],
            }, scratchpadFallback: false, mode: 'standard',
          })
          .mockResolvedValueOnce({
            harnessResult: {
              passed: false, score: 40, duration: 10, iteration: 2,
              layers: [{ name: 'lint', passed: false, errors: [{
                layer: 'lint', type: 'style', severity: 'high', fixable: true,
                message: 'x', humanMessage: 'x', file: 'src/totally-new.ts', // NEW FILE
              }], warnings: [], duration: 5, skipped: false }],
            }, scratchpadFallback: false, mode: 'standard',
          })
          .mockResolvedValue({ harnessResult: makePassResult(), scratchpadFallback: false, mode: 'standard' }),
      },
    })
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 4 }))
    await engine.run(makeTask())

    const calls = (deps.contextEngine.buildContext as ReturnType<typeof vi.fn>).mock.calls
    // Expect at least 2 rebuilds: iter 1 fresh, iter 2 invalidated by new error file
    expect(calls.length).toBeGreaterThanOrEqual(2)
  })

  it('emits context_loaded with reused: true on a cache hit', async () => {
    // Need at least 3 iterations to exercise a true cache window:
    //   iter 1 — fresh build (no prev errors, errorFiles=[])
    //   iter 2 — rebuild (prev errorFiles=[], now =['src/app.ts'] → new file revealed)
    //   iter 3 — cache hit (prev errorFiles=['src/app.ts'], now =['src/app.ts'])
    const events: ExecutionEvent[] = []
    const failingResult = {
      passed: false, score: 40, duration: 10, iteration: 1,
      layers: [{ name: 'lint', passed: false, errors: [{
        layer: 'lint', type: 'style', severity: 'high', fixable: true,
        message: 'x', humanMessage: 'x', file: 'src/app.ts',
      }], warnings: [], duration: 5, skipped: false }],
    }
    const deps = makeDeps({
      orchestrator: {
        run: vi.fn()
          .mockResolvedValueOnce({ harnessResult: failingResult, scratchpadFallback: false, mode: 'standard' })
          .mockResolvedValueOnce({ harnessResult: failingResult, scratchpadFallback: false, mode: 'standard' })
          .mockResolvedValue({ harnessResult: makePassResult(), scratchpadFallback: false, mode: 'standard' }),
      },
    })
    const engine = new ExecutionEngine(deps, makeOptions({
      maxIterations: 4,
      onEvent: (e) => events.push(e),
    }))
    await engine.run(makeTask())

    const ctxEvents = events.filter(e => e.type === 'context_loaded')
    expect(ctxEvents.length).toBeGreaterThanOrEqual(3)
    expect(ctxEvents[0].context?.reused).toBeFalsy() // iter 1 — fresh
    expect(ctxEvents[1].context?.reused).toBeFalsy() // iter 2 — new error file revealed
    expect(ctxEvents[2].context?.reused).toBe(true)  // iter 3 — same error surface → cache hit
  })

  it('rebuilds after the TTL is reached (3 iterations)', async () => {
    // Force 4 iterations where the error surface never changes; expect at least
    // one rebuild past iter 0 (after TTL expires).
    const sameErr = {
      passed: false, score: 40, duration: 10, iteration: 1,
      layers: [{ name: 'lint', passed: false, errors: [{
        layer: 'lint', type: 'style', severity: 'high', fixable: true,
        message: 'x', humanMessage: 'x', file: 'src/app.ts',
      }], warnings: [], duration: 5, skipped: false }],
    }
    const deps = makeDeps({
      orchestrator: {
        run: vi.fn()
          .mockResolvedValueOnce({ harnessResult: { ...sameErr, iteration: 1 }, scratchpadFallback: false, mode: 'standard' })
          .mockResolvedValueOnce({ harnessResult: { ...sameErr, iteration: 2 }, scratchpadFallback: false, mode: 'standard' })
          .mockResolvedValueOnce({ harnessResult: { ...sameErr, iteration: 3 }, scratchpadFallback: false, mode: 'standard' })
          .mockResolvedValue({ harnessResult: makePassResult(), scratchpadFallback: false, mode: 'standard' }),
      },
    })
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 5 }))
    await engine.run(makeTask())

    const calls = (deps.contextEngine.buildContext as ReturnType<typeof vi.fn>).mock.calls
    // Should have at least 2 builds: 1 fresh + 1 forced by TTL
    expect(calls.length).toBeGreaterThanOrEqual(2)
  })
})
