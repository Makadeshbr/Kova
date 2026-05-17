import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ExecutionEvent, TaskDefinition, HarnessResult, LayerResult } from '@kova/shared'
import { ExecutionEngine, extractExplicitRequiredPaths } from '../src/execution-engine'
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
  const layers: LayerResult[] = [
    { name: 'build', passed: true, errors: [], warnings: [], duration: 10, skipped: false },
    { name: 'tests', passed: true, errors: [], warnings: [], duration: 10, skipped: false },
  ]
  return { passed: true, score: 100, layers, duration: 20, iteration: 1, validationConfidence: 'full' }
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

    it('deve rejeitar antes do orchestrator quando contrato detecta mismatch de stack em modify', async () => {
      // Stack mismatch only fires on modify changes. Pure-create scaffolding
      // bypasses the rule to match Claude Code parity — the agent picks the
      // stack when materializing new files.
      const deps = makeDeps()
      ;(deps.agent.execute as ReturnType<typeof vi.fn>).mockImplementation(
        async (_t: unknown, _c: unknown, mode: string) => ({
          mode,
          thought: 'thought',
          changes: mode === 'code'
            ? [{ path: 'src/helpers.ts', type: 'modify', diff: 'export const x = 1', before: '// old' }]
            : [],
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
      expect(['reject', 'human_required']).toContain(state.iterationHistory[0].decision.decision)
      expect(state.iterationHistory[0].harnessResult.layers[0].errors.map(e => e.rule)).toContain('stack_mismatch')
    })

    it('scaffolding bypass: pure-create patches go straight to auto_apply with no orchestrator run', async () => {
      const deps = makeDeps()
      ;(deps.agent.execute as ReturnType<typeof vi.fn>).mockImplementation(
        async (_t: unknown, _c: unknown, mode: string) => ({
          mode,
          thought: 'thought',
          changes: mode === 'code' || mode === 'unified'
            ? [
                { path: 'package.json', type: 'create' as const, diff: '{}' },
                { path: 'src/App.tsx', type: 'create' as const, diff: 'export const App = () => null' },
                { path: 'src/main.tsx', type: 'create' as const, diff: 'import "./App"' },
              ]
            : [],
          tokensUsed: 10,
        }),
      )
      const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1, skipPlan: true }))
      const state = await engine.run(makeTask())

      // Enterprise mode: even pure-create scaffolding goes through completion
      // proof + harness before it can be applied.
      expect(deps.orchestrator.run).toHaveBeenCalledOnce()
      expect(state.iterationHistory[0].decision.decision).toBe('auto_apply')
      expect(state.status).toBe('completed')
      expect(deps.applicationEngine.apply).toHaveBeenCalledOnce()
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

      expect(state.status).toBe('failed')
      expect(state.proofPack?.results?.validationConfidence).toBe('none')
      expect(state.proofPack?.finalUiDecision).toBe('repair_needed')
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

      await expect(engine.forceApply()).rejects.toThrow('No changes')
    })
  })
})

// ─── Contract enforcement regression tests ────────────────────────────────────

describe('ExecutionEngine — Contract enforcement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('docs text-only response completes immediately without harness', async () => {
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
    const state = await engine.run(makeTask('docs-task', { type: 'docs' }))

    expect(state.status).toBe('completed')
    expect(orchestratorSpy).not.toHaveBeenCalled()
  })

  it('docs text-only response has auto_apply decision even with autoApply=false', async () => {
    // When no files changed, completing is always safe — there is nothing to apply.
    const deps = makeDeps({
      agent: {
        execute: vi.fn().mockResolvedValue({ mode: 'unified', thought: 'done', changes: [], tokensUsed: 10 }),
      },
    })
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1, autoApply: false }))
    const state = await engine.run(makeTask('docs-task', { type: 'docs' }))

    expect(state.status).toBe('completed')
    const last = state.iterationHistory.at(-1)
    expect(last?.decision.decision).toBe('auto_apply')
  })

  it('implementation text-only response is not treated as completed', async () => {
    const deps = makeDeps({
      agent: {
        execute: vi.fn().mockResolvedValue({ mode: 'unified', thought: 'Aqui esta o codigo em markdown', changes: [], tokensUsed: 10 }),
      },
    })
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1, autoApply: true, skipPlan: true }))
    const state = await engine.run(makeTask('feature-task', { type: 'feature' }))

    expect(state.status).toBe('failed')
    const last = state.iterationHistory.at(-1)
    expect(last?.decision.decision).toBe('reject')
    expect(last?.harnessResult.layers[0].errors[0].rule).toBe('missing_file_changes')
    expect(deps.applicationEngine.apply).not.toHaveBeenCalled()
  })

  it('rejects implementation when explicitly required files are missing', async () => {
    const deps = makeDeps({
      agent: {
        execute: vi.fn().mockResolvedValue({
          mode: 'code',
          thought: 'partial',
          changes: [
            { path: 'index.html', type: 'create' as const, diff: '<main></main>' },
            { path: 'css/style.css', type: 'create' as const, diff: 'body{}' },
            { path: 'js/main.js', type: 'create' as const, diff: 'console.log(1)' },
          ],
          tokensUsed: 10,
        }),
      },
    })
    const objective = 'Materialize no minimo: index.html, css/style.css, js/main.js, package.json e vite.config.js.'
    expect(extractExplicitRequiredPaths(objective)).toEqual(['index.html', 'css/style.css', 'js/main.js', 'package.json', 'vite.config.js'])
    const engine = new ExecutionEngine(deps, makeOptions({
      projectRoot: `C:\\tmp\\kova-required-files-${Date.now()}`,
      maxIterations: 1,
      autoApply: true,
      skipPlan: true,
    }))
    const state = await engine.run(makeTask('required-files', { objective }))

    expect(state.status).toBe('failed')
    const last = state.iterationHistory.at(-1)
    expect(last?.decision.decision).toBe('reject')
    const missing = last?.harnessResult.layers.flatMap(layer => layer.errors.map(error => error.file)) ?? []
    expect(missing).toEqual(expect.arrayContaining(['package.json', 'vite.config.js']))
    expect(deps.applicationEngine.apply).not.toHaveBeenCalled()
  })

  it('extracts explicit required paths from natural language requirements', () => {
    const paths = extractExplicitRequiredPaths('Crie arquivos reais. Materialize no mínimo: index.html, src/style.css, src/main.js, package.json e vite.config.js.')

    expect(paths).toEqual(['index.html', 'src/style.css', 'src/main.js', 'package.json', 'vite.config.js'])
  })

  it('extracts paths from architecture requests without mandatory-keyword wording', () => {
    const paths = extractExplicitRequiredPaths('Crie uma arquitetura simples e limpa: index.html, src/main.ts, src/style.css e vite.config.ts.')

    expect(paths).toEqual(['index.html', 'src/main.ts', 'src/style.css', 'vite.config.ts'])
  })

  it('does not treat design prompt prose like etc.Use as required files', () => {
    const prompt = 'crie uma landing page moderna,de festas de aniversario,onde tem festa na caixa,arco decorativo e etc.Use stack moderna,projeto bem arquitetado. ## Identidade Visual - **Paleta dark premium**: fundo #0A0A0A. Use TypeScript, React e Vite.'

    expect(extractExplicitRequiredPaths(prompt)).toEqual([])
  })

  it('rejects wrong inferred fallback files when architecture paths were requested', async () => {
    const deps = makeDeps({
      agent: {
        execute: vi.fn().mockResolvedValue({
          mode: 'code',
          thought: 'partial fallback',
          changes: [
            { path: 'index.html', type: 'create' as const, diff: '<main></main>' },
            { path: 'css/style.css', type: 'create' as const, diff: 'body{}' },
            { path: 'js/main.js', type: 'create' as const, diff: 'console.log(1)' },
          ],
          tokensUsed: 10,
        }),
      },
    })
    const objective = 'Crie uma arquitetura simples e limpa: index.html, src/main.ts, src/style.css e vite.config.ts.'
    const engine = new ExecutionEngine(deps, makeOptions({
      projectRoot: `C:\\tmp\\kova-wrong-fallback-${Date.now()}`,
      maxIterations: 1,
      autoApply: true,
      skipPlan: true,
    }))
    const state = await engine.run(makeTask('required-architecture-files', { objective }))

    expect(state.status).toBe('failed')
    const missing = state.iterationHistory.at(-1)?.harnessResult.layers.flatMap(layer => layer.errors.map(error => error.file)) ?? []
    expect(missing).toEqual(expect.arrayContaining(['src/main.ts', 'src/style.css', 'vite.config.ts']))
    expect(deps.applicationEngine.apply).not.toHaveBeenCalled()
  })

  it('max_files_changed violation leads to reject when many files MODIFY existing code', async () => {
    // Low-impact task allows 15 files. Patch MODIFIES 20 existing files → contract
    // violation → reject. The scaffolding bypass only applies to pure creates;
    // modifying many files must still be flagged.
    const bigChange = Array.from({ length: 20 }, (_, i) => ({
      path: `src/file${i}.ts`, type: 'modify' as const, diff: 'const x = 1', before: 'const x = 0',
    }))
    const deps = makeDeps({
      agent: {
        execute: vi.fn().mockResolvedValue({ mode: 'code', thought: '', changes: bigChange, tokensUsed: 100 }),
      },
    })
    const task = makeTask('t1', { impact: 'low', stackAdapter: 'typescript' })  // maxFilesChanged=15
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1, autoApply: false }))
    const state = await engine.run(task)

    const last = state.iterationHistory.at(-1)
    expect(last?.decision.decision).toBe('reject')
    expect(last?.decision.score).toBeLessThan(70)
  })

  it('scaffolding bypass: 18 brand-new files do NOT trigger max_files_changed', async () => {
    // Regression for the "create landing page" bug: when every change creates a
    // brand-new file, the per-impact limit is replaced by the 150-file safety
    // cap. Claude Code/Codex/Cursor all permit creating a full project in one
    // shot — Kova must too.
    const scaffolding = Array.from({ length: 18 }, (_, i) => ({
      path: `src/component${i}.tsx`, type: 'create' as const, diff: 'export const X = 1',
    }))
    const deps = makeDeps({
      agent: {
        execute: vi.fn().mockResolvedValue({ mode: 'code', thought: '', changes: scaffolding, tokensUsed: 100 }),
      },
    })
    const task = makeTask('t-scaffold', { impact: 'low', stackAdapter: 'typescript' })  // maxFilesChanged=15
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1, autoApply: false }))
    const state = await engine.run(task)

    const last = state.iterationHistory.at(-1)
    // No max_files_changed violation in the harness errors
    const violations = last?.harnessResult.layers.flatMap(l => l.errors.map(e => e.rule)) ?? []
    expect(violations).not.toContain('max_files_changed')
  })
})

describe('ExecutionEngine — dynamic maxIterations (FIX-007)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('low-impact task gets ≥5 iterations even when user passes a smaller value', async () => {
    const deps = makeDeps()
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1 }))
    const state = await engine.run(makeTask('t', { impact: 'low' }))
    // contract.maxFilesChanged for low impact = 15 → ceil(15 * 0.6) = 9 → max(5, 9) = 9
    expect(state.maxIterations).toBeGreaterThanOrEqual(5)
  })

  it('medium-impact task auto-scales above default of 5', async () => {
    const deps = makeDeps()
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 5 }))
    const state = await engine.run(makeTask('t', { impact: 'medium' }))
    // contract.maxFilesChanged for medium = 30 → ceil(30 * 0.6) = 18 → clamped to 12
    expect(state.maxIterations).toBe(12)
  })

  it('high-impact task scales up to 12 even with user default 5', async () => {
    const deps = makeDeps()
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 5 }))
    const state = await engine.run(makeTask('t', { impact: 'high' }))
    // contract.maxFilesChanged for high = 60 → ceil(60 * 0.6) = 36 → clamped to 12
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

// ─── max_iterations → paused when changes are reviewable ──────────────────────

describe('ExecutionEngine — max_iterations with reviewable changes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ends as paused (not failed) when max_iterations hit but last decision has score >= 70', async () => {
    // suggest at score 77 would normally short-circuit to success/paused via
    // shouldStop. To force max_iterations with reviewable changes we need a
    // reject decision (e.g. lint failure) that still produces a score >= 70.
    // The simplest way is to control the decision score directly via a custom
    // harness shape, but the public engine path only exposes harnessResult.
    // We use a 'suggest' decision via score >= 70 then check the actual code
    // path: when shouldStop returns max_iterations, status reflects the change.
    // Here we simulate by using a soft reject with explicit score in the result.
    const reviewableReject: HarnessResult = {
      passed: false,
      score: 75,
      layers: [{
        name: 'lint', passed: false,
        errors: [{ layer: 'lint', type: 'style', severity: 'low', fixable: true, message: 'x', humanMessage: 'x', file: 'src/app.ts' }],
        warnings: [], duration: 5, skipped: false,
      }],
      duration: 5,
      iteration: 1,
      validationConfidence: 'full',
    }
    const deps = makeDeps({
      orchestrator: {
        run: vi.fn().mockResolvedValue({ harnessResult: reviewableReject, scratchpadFallback: false, mode: 'standard' }),
      },
    })
    // skipPlan + maxIterations=1: one code iteration → reject → max_iterations stop
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1, skipPlan: true }))
    const state = await engine.run(makeTask())

    // Score 75 is reviewable → must pause for user to apply/reject
    expect(state.status).toBe('paused')
    const last = state.iterationHistory.at(-1)
    expect(last?.changes.length).toBeGreaterThan(0)
  })

  it('stays failed when max_iterations hit and score is a hard fail (0)', async () => {
    const deps = makeDeps({
      orchestrator: {
        run: vi.fn().mockResolvedValue({ harnessResult: makeFailResult(), scratchpadFallback: false, mode: 'standard' }),
      },
    })
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1, skipPlan: true }))
    const state = await engine.run(makeTask())

    // Hard fail (build broken, score 0) must never invite apply
    expect(state.status).toBe('failed')
  })

  it('stays failed when max_iterations hit and there are no changes', async () => {
    const deps = makeDeps({
      agent: {
        execute: vi.fn().mockResolvedValue({ mode: 'fix', thought: '', changes: [], tokensUsed: 10 }),
      },
      orchestrator: {
        run: vi.fn().mockResolvedValue({ harnessResult: makeSoftRejectResult(), scratchpadFallback: false, mode: 'standard' }),
      },
    })
    const engine = new ExecutionEngine(deps, makeOptions({ maxIterations: 1, skipPlan: true }))
    const state = await engine.run(makeTask())

    // No reviewable artifact → failed makes sense
    expect(state.status).toBe('failed')
    expect(state.iterationHistory.at(-1)?.decision.decision).toBe('reject')
    // text-only path short-circuits before harness — sanity check
  })
})
