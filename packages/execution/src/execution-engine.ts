import type {
  AgentContext, AgentMode, AgentOutput, CommandOutputCallback, DecisionResult, ExecutionContract,
  DiffReviewSelection, ExecutionEvent, ExecutionState, FileChange, HarnessError, HarnessResult,
  IterationRecord, Learning, TaskDefinition, AgentMessage, ProofPack, ProofPackValidation, Todo, ServerSessionInfo
} from '@kova/shared'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createOrchestratorConfig } from '@kova/orchestrator'
import type { OrchestratorConfig, OrchestratorResult } from '@kova/orchestrator'
import { runCompletionLayer } from '@kova/harness'
import { decide } from '@kova/decision'
import { recordTrace } from '@kova/observability'
import { createInitialState, withIteration, withStatus } from './state'
import { shouldStop, type StopOptions } from './stop-conditions'
import {
  contractViolationsToHarnessResult,
  createExecutionContract,
  validateContractChanges,
} from './execution-contract'
import { generateProofPack } from './proof-pack'
import { buildCompletionProof, type CompletionTrace } from './completion-contract'
import { buildContextCacheKey, shouldReuseContext, type ContextCacheKey } from './context-cache'

type InteractiveCommandRunner = (command: string, cwd: string, reason: string, options?: { previewChanges?: FileChange[] }) => Promise<{
  exitCode: number
  output: string
  sessionId?: string
  persistent?: boolean
  ready?: boolean
  url?: string
  port?: number
  cwd?: string
  diagnostics?: string[]
}>

interface ProviderUsageReport {
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  inputTokens: number
  outputTokens: number
}

type AgentPermissionPolicy = Record<string, unknown>

interface IAgent {
  execute(task: TaskDefinition, context: AgentContext, mode: AgentMode, options?: {
    signal?: AbortSignal
    onToken?: (token: string) => void
    onToolCall?: (name: string, input: Record<string, unknown>) => void
    onToolResult?: (name: string, result: string) => void
    interactiveRunner?: InteractiveCommandRunner
    onCommandOutput?: CommandOutputCallback
    onUsageReport?: (report: ProviderUsageReport) => void
    permissionPolicy?: AgentPermissionPolicy
    /** FIX-018: seed and listen to the multi-step todo list. */
    initialTodos?: Todo[]
    onTodosUpdated?: (todos: Todo[]) => void
  }): Promise<AgentOutput>
}

interface IOrchestrator {
  run(changes: FileChange[], config: OrchestratorConfig): Promise<OrchestratorResult>
}

interface IContextEngine {
  buildContext(task: TaskDefinition, projectRoot: string, options?: { harnessErrors?: HarnessError[]; explicitFiles?: string[]; openedFiles?: string[]; diff?: string }): Promise<AgentContext>
}

interface IApplicationEngine {
  apply(changes: FileChange[], taskId: string, score?: number, selection?: DiffReviewSelection): Promise<{ applied: boolean; checkpointId: string; reason?: string }>
  rollback(checkpointId: string): Promise<void>
}

interface IMemoryRecorder {
  recordFromIteration(task: TaskDefinition, iterations: IterationRecord[]): Learning[]
}

export interface ExecutionDependencies {
  agent: IAgent
  orchestrator: IOrchestrator
  contextEngine: IContextEngine
  applicationEngine: IApplicationEngine
  /** Optional: when present, auto-records verified learnings after auto_apply. */
  memory?: IMemoryRecorder
}

export interface ExecutionEngineOptions extends StopOptions {
  projectRoot: string
  contract?: ExecutionContract
  autoApply?: boolean
  history?: AgentMessage[]
  skipPlan?: boolean
  explicitFiles?: string[]
  openedFiles?: string[]
  diff?: string
  onStateChange?: (state: ExecutionState) => void
  onEvent?: (event: ExecutionEvent) => void
  /** Called for each stdout/stderr line from a harness subprocess in real-time. */
  onHarnessLine?: (layer: string, line: string, stream: 'stdout' | 'stderr') => void
  /** Injected by EngineManager to allow agent tools to run interactive PTY sessions. */
  interactiveRunner?: InteractiveCommandRunner
  /** FIX-003: forwarded to the agent so run_command can stream stdout/stderr live. */
  onCommandOutput?: CommandOutputCallback
  /** Provider token/cache telemetry, reported once per model API call. */
  onUsageReport?: (report: ProviderUsageReport) => void
  /** Tool permission policy selected by the user. */
  permissionPolicy?: AgentPermissionPolicy
  /**
   * FIX-018: fired whenever the agent calls todo_write. Carries the full new
   * list. The engine also emits a 'todos_updated' ExecutionEvent on the same
   * boundary; this callback is for consumers that want a direct stream.
   */
  onTodosUpdated?: (todos: Todo[]) => void
}

export class ExecutionEngine {
  private state: ExecutionState | null = null
  private task: TaskDefinition | null = null
  private contract: ExecutionContract | null = null
  private paused = false
  private aborted = false
  private lastCheckpointId = ''
  private abortController: AbortController | null = null
  /**
   * FIX-018: multi-step todo list shared across iterations. The agent sees this
   * via `initialTodos` and replaces it via `todo_write`. Survives the
   * code → harness → fix cycle so the model can resume its plan after a repair.
   */
  private todos: Todo[] = []
  /**
   * FIX-019: cached AgentContext from a previous iteration. Reused when the
   * inputs (task, explicit/opened files, diff, error file set) are stable.
   * `cachedContextAge` counts how many iterations since the cached value was
   * built — TTL caps reuse at CONTEXT_CACHE_TTL (3) so a long repair loop
   * doesn't carry stale grep results forever.
   */
  private cachedContext: AgentContext | null = null
  private cachedContextKey: ContextCacheKey | null = null
  private cachedContextAge = 0

  constructor(
    private readonly deps: ExecutionDependencies,
    private readonly options: ExecutionEngineOptions,
  ) {}

  async run(task: TaskDefinition): Promise<ExecutionState> {
    this.task = task
    this.contract = this.options.contract ?? createExecutionContract(task)
    this.paused = false
    this.aborted = false
    // FIX-007: dynamic maxIterations. The repair loop needs more iterations for
    // bigger tasks. We compute a floor from the contract scope (`maxFilesChanged`)
    // and honour user override when it's higher. The user can ALWAYS raise above
    // the floor; the floor protects against tasks that would otherwise fail on
    // an arbitrarily small limit.
    const maxIterations = resolveMaxIterations(this.options.maxIterations, this.contract.maxFilesChanged)
    this.state = createInitialState(task, maxIterations)
    this.event({ type: 'contract_created', contract: this.contract, message: 'Execution contract created' })
    this.emit()
    return this.loop()
  }

  pause(): void { this.paused = true }

  async resume(): Promise<ExecutionState> {
    if (!this.task || !this.state || this.state.status !== 'paused') {
      throw new Error('Engine is not paused')
    }
    this.paused = false
    return this.loop()
  }

  async abort(): Promise<void> {
    this.aborted = true
    if (this.abortController) {
      this.abortController.abort()
    }
    // Only roll back if the engine hasn't already reached a completed state.
    // Calling abort() after forceApply() succeeded must not undo applied changes.
    if (this.lastCheckpointId && this.state?.status !== 'completed') {
      await this.deps.applicationEngine.rollback(this.lastCheckpointId)
    }
    if (this.state) {
      this.state = withStatus(this.state, 'failed')
      this.emit()
    }
  }

  async forceApply(selection?: DiffReviewSelection): Promise<void> {
    const last = this.state?.iterationHistory.at(-1)
    if (!last || !this.task) throw new Error('No changes to apply')
    if (last.changes.length === 0) throw new Error('No changes to apply')

    const score = last.harnessResult.score
    const result = await this.deps.applicationEngine.apply(last.changes, this.task.id, score, selection)

    if (result.applied) {
      this.lastCheckpointId = result.checkpointId
      this.state = withStatus(this.state!, 'completed')
      this.emit()
      // Auto-record learnings on forceApply too — same as auto_apply path
      try {
        this.deps.memory?.recordFromIteration(this.task, this.state!.iterationHistory)
      } catch { /* memory is always best-effort */ }
      return
    }

    this.state = withStatus(this.state!, 'paused')
    this.emit()
  }

  getState(): ExecutionState | null { return this.state }

  private emit(): void {
    if (!this.state) return
    this.options.onStateChange?.(this.state)
    this.event({ type: 'state_changed', state: this.state.status })
  }

  private event(event: Omit<ExecutionEvent, 'taskId' | 'timestamp' | 'iteration'> & { iteration?: number }): void {
    this.options.onEvent?.({
      taskId: this.task?.id ?? this.state?.taskId ?? 'unknown',
      timestamp: new Date().toISOString(),
      iteration: event.iteration ?? this.state?.currentIteration,
      ...event,
    })
  }

  private async loop(): Promise<ExecutionState> {
    let lastDecision: DecisionResult | undefined

    while (!this.paused && !this.aborted) {
      const stopReason = shouldStop(this.state!, lastDecision, this.options)
      if (stopReason) {
        if (stopReason === 'max_iterations' || stopReason === 'timeout') {
          // If the agent produced reviewable changes during the loop, give the
          // user a chance to apply/reject them instead of dropping straight to
          // 'failed' (which the UI renders as an error). Hard fails (raw harness
          // score 0 — broken build, secret leaked) still end as 'failed' because
          // the code does not work. We look at harnessResult.score, not
          // decision.score: the decision score is capped at 55 in the soft-reject
          // path, but the underlying harness score still reflects code quality.
          const last = this.state!.iterationHistory.at(-1)
          const hasReviewableChanges = !!last
            && last.changes.length > 0
            && (last.harnessResult?.score ?? 0) >= 70
          this.state = withStatus(this.state!, hasReviewableChanges ? 'paused' : 'failed')
          this.emit()
        } else if (stopReason === 'human_required') {
          this.state = withStatus(this.state!, 'paused')
          this.emit()
        } else if (stopReason === 'success' && lastDecision?.decision === 'suggest') {
          this.state = withStatus(this.state!, 'paused')
          this.emit()
        }
        break
      }
      try {
        lastDecision = await this.runIteration()
      } catch (e: unknown) {
        const isAbort = this.aborted || (e instanceof Error && e.name === 'AbortError')
        if (isAbort) break
        throw e
      }
    }

    const status = this.state!.status
    if (this.aborted) {
      this.state = withStatus(this.state!, 'failed')
      this.emit()
    } else if (this.paused && status !== 'completed' && status !== 'failed' && status !== 'paused') {
      this.state = withStatus(this.state!, 'paused')
      this.emit()
    }

    if (this.state!.status === 'completed' || this.state!.status === 'failed' || this.state!.status === 'paused') {
      const proofPack = generateProofPack(this.state!, this.contract ?? createExecutionContract(this.task!))
      this.state = { ...this.state!, proofPack }
      this.emit()
      this.event({ type: 'proof_pack', proofPack, message: 'Proof Pack generated' })
      try { recordTrace(this.state!, this.options.projectRoot) } catch { /* traces are best-effort */ }
    }

    return this.state!
  }

  private async runIteration(): Promise<DecisionResult> {
    // Create AbortController BEFORE any await so abort() can fire into this iteration immediately.
    // If abort() was already called before we entered this method, throw right away.
    this.abortController = new AbortController()
    if (this.aborted) {
      this.abortController.abort()
      const err = new Error('Aborted'); err.name = 'AbortError'; throw err
    }

    const task = this.task!
    const isFirst = this.state!.currentIteration === 0
    const iterStart = Date.now()
    const previousErrors = this.previousHarnessErrors()

    this.state = withStatus(this.state!, 'structuring')
    this.emit()

    // FIX-019: decide cache hit vs rebuild BEFORE invoking the (expensive)
    // ContextEngine. The key captures everything that could change selectedFiles.
    const nextKey = buildContextCacheKey({
      taskId: task.id,
      explicitFiles: this.options.explicitFiles,
      openedFiles: this.options.openedFiles,
      diff: this.options.diff,
      harnessErrors: previousErrors,
    })
    const reuse = shouldReuseContext(this.cachedContextKey, nextKey, this.cachedContextAge)

    let context: AgentContext
    if (reuse && this.cachedContext) {
      context = this.cachedContext
      this.cachedContextAge++
    } else {
      context = await this.deps.contextEngine.buildContext(task, this.options.projectRoot, {
        harnessErrors: previousErrors,
        explicitFiles: this.options.explicitFiles,
        openedFiles: this.options.openedFiles,
        diff: this.options.diff,
      })
      this.cachedContext = context
      this.cachedContextKey = nextKey
      this.cachedContextAge = 1
    }

    this.event({
      type: 'context_loaded',
      message: `${context.files.length} context files${reuse ? ' (cached)' : ''}`,
      context: {
        files: context.files.map(file => file.path),
        tokensUsed: context.tokensUsed,
        maxTokens: context.pack?.budget.maxTokens,
        learningsCount: context.learnings.length,
        reused: reuse,
        selectedFiles: context.pack?.selectedFiles.slice(0, 12).map(file => ({
          path: file.path,
          score: file.score,
          confidence: file.confidence,
          reason: file.reason,
          evidence: file.evidence,
          source: file.source,
          kind: file.kind,
        })),
        blockedFiles: context.pack?.blockedFiles,
        rejectedFiles: context.pack?.rejectedFiles.slice(0, 20),
        warnings: context.pack?.warnings,
      },
    })

    // Re-check after context build — abort() could have fired while context was loading
    if (this.aborted || this.abortController.signal.aborted) {
      const err = new Error('Aborted'); err.name = 'AbortError'; throw err
    }

    const reasoning = createReasoningEvents((event) => this.event(event))
    reasoning.start()
    const completionTrace: CompletionTrace = { toolCalls: [], toolResults: [], events: [] }

    const agentOptions = {
      history: this.options.history,
      signal: this.abortController.signal,
      interactiveRunner: this.options.interactiveRunner,
      onCommandOutput: this.options.onCommandOutput,
      permissionPolicy: this.options.permissionPolicy,
      onUsageReport: (report: ProviderUsageReport) => {
        this.options.onUsageReport?.(report)
        this.event({
          type: 'token_usage',
          message: `${report.inputTokens + report.outputTokens} tokens`,
          tokensUsed: report.inputTokens + report.outputTokens,
          usage: report,
          cacheReadInputTokens: report.cacheReadInputTokens,
          cacheCreationInputTokens: report.cacheCreationInputTokens,
          inputTokens: report.inputTokens,
          outputTokens: report.outputTokens,
        } as Omit<ExecutionEvent, 'taskId' | 'timestamp' | 'iteration'>)
      },
      // FIX-018: pass the current session-scoped todo list to the agent so plans
      // persist across the code → harness → fix repair cycle. Replacement after
      // todo_write happens via the callback below + the AgentOutput.todos read.
      initialTodos: this.todos.length > 0 ? this.todos : undefined,
      onTodosUpdated: (next: Todo[]) => {
        this.todos = next
        this.options.onTodosUpdated?.(next)
        this.event({ type: 'todos_updated', todos: next, message: `${next.length} todo(s)` })
      },
      onToken: (token: string) => {
        reasoning.end()
        this.event({ type: 'token', token })
      },
      onReasoningStart: () => reasoning.start(),
      onReasoningDelta: (delta: string) => reasoning.delta(delta),
      onReasoningEnd: () => reasoning.end(),
      onToolCall: (name: string, input: Record<string, unknown>) => {
        const preview = name === 'write_file' ? String(input.path ?? '') : name === 'run_command' ? String(input.command ?? '') : ''
        completionTrace.toolCalls.push({ name, input })
        if (name === 'run_interactive_command') {
          this.event({ type: 'server_starting', toolName: name, toolInput: input, message: `Starting server/session: ${String(input.command ?? '')}` })
        }
        const event = { type: 'tool_call' as const, toolName: name, toolInput: input, message: preview ? `${name}: ${preview}` : name }
        completionTrace.events.push(event)
        this.event(event)
      },
      onToolResult: (name: string, result: string) => {
        completionTrace.toolResults.push({ name, result })
        const serverSession = name === 'run_interactive_command' ? serverSessionFromToolResult(result) : undefined
        if (serverSession?.persistent) {
          this.event({
            type: serverSession.ready ? 'server_ready' : 'server_failed',
            toolName: name,
            toolOutput: result.slice(0, 20_000),
            serverSession,
            message: serverSession.ready
              ? `Server ready${serverSession.url ? ` at ${serverSession.url}` : ''}`
              : 'Persistent server/session started without readiness proof',
          })
        }
        const event = {
          type: 'tool_result',
          toolName: name,
          message: result.slice(0, 2_000),
          toolOutput: result.slice(0, 20_000),
          serverSession,
        } as const
        completionTrace.events.push(event)
        this.event(event)
      }
    }

    let codeOutput!: AgentOutput
    try {
      if (isFirst && !this.options.skipPlan) {
        this.state = withStatus(this.state!, 'planning')
        this.emit()
        this.event({ type: 'agent_started', mode: 'plan', message: 'Planning started' })
        await this.deps.agent.execute(task, context, 'plan', agentOptions)
        reasoning.end()
        this.event({ type: 'stream_end', message: '' })
        this.event({ type: 'agent_completed', mode: 'plan', message: 'Planning completed' })
      }

      this.state = withStatus(this.state!, 'coding')
      this.emit()
      const mode: AgentMode = isFirst ? (this.options.skipPlan ? 'unified' : 'code') : 'fix'
      if (!isFirst) {
        this.state = withStatus(this.state!, 'repairing')
        this.emit()
      }
      this.event({ type: 'agent_started', mode, message: `${mode} started` })
      codeOutput = await this.deps.agent.execute(task, context, mode, agentOptions)
      reasoning.end()
      this.event({ type: 'stream_end', message: '' })
      this.event({ type: 'agent_completed', mode, changes: codeOutput.changes, message: `${mode} completed` })
    } finally {
      reasoning.end()
    }

    // Empty / text-only response handling.
    //
    // Patch mode is unified — the model decides via tools + prompt whether to
    // write files or just respond. A turn with zero file changes can mean
    // three different things:
    //
    //   1. docs/analysis task        → success, the answer IS the deliverable
    //   2. follow-up question        → success, model answered with substantive
    //                                  text (and possibly read-tool inspections)
    //   3. genuine hallucination     → fail fast, do NOT enter repair loop
    //
    // Old logic conflated cases 2 and 3 (any "no tools + no changes" was failure).
    // That penalized natural Q&A follow-ups and produced the "I cannot modify
    // files" UX. New logic distinguishes via two signals:
    //   - did the model use any read tools (grep/glob/read/list)?
    //   - is the response substantive (>=120 chars of cleaned text)?
    if (codeOutput.changes.length === 0) {
      const isFirstIteration = this.state!.currentIteration === 0
      const responseText = (codeOutput.thought ?? '').trim()
      const hasSubstantiveResponse = responseText.length >= 120
      const usedTools = completionTrace.toolCalls.length > 0

      // Analysis-only success: the answer IS the deliverable. Accepted when:
      //   - task is explicitly docs, OR
      //   - the model produced a substantive prose response (Q&A follow-up).
      // Tool calls alone are NOT sufficient — a model that read a file and
      // produced no real answer is still "in progress" and should repair.
      const textOnlyAllowed =
        task.type === 'docs' ||
        hasSubstantiveResponse

      // True hallucination signature: first iteration, no tool calls, no
      // substantive response, not a docs task. Anything past iteration 0
      // is repair territory (model already had a real attempt with feedback).
      const hallucinated =
        isFirstIteration &&
        task.type !== 'docs' &&
        !usedTools &&
        !hasSubstantiveResponse

      const emptyHarness = textOnlyAllowed
        ? buildTextOnlySuccessHarness(this.state!.currentIteration + 1)
        : buildMissingChangesHarness(this.state!.currentIteration + 1)
      const emptyDecision: import('@kova/shared').DecisionResult = textOnlyAllowed
        ? {
            decision: 'auto_apply', score: 100,
            reason: task.type === 'docs'
              ? 'No file changes — text-only response'
              : 'Analysis-only turn — model answered without modifying files',
            feedback: [],
          }
        : hallucinated
        ? {
            decision: 'reject',
            score: 0,
            reason:
              'Model produced no file changes, no tool calls, and no substantive response. Try rephrasing as a concrete imperative ("crie X", "adicione Y") or switch to a tool-capable model in Settings.',
            feedback: [],
          }
        : {
            decision: 'reject',
            score: 0,
            reason: 'Implementation task produced no file changes',
            feedback: [],
          }

      this.state = withIteration(
        this.state!,
        buildRecord(this.state!.currentIteration, codeOutput, emptyHarness, emptyDecision, context, iterStart),
      )
      this.emit()

      if (textOnlyAllowed) {
        this.state = withStatus(this.state!, 'completed')
        this.emit()
      } else if (hallucinated) {
        // Force-fail before the loop can retry. shouldStop() returns 'aborted'
        // when status === 'failed', which exits cleanly without rollback.
        this.event({
          type: 'agent_completed',
          mode: 'unified',
          message:
            'Model produced no tool calls and no substantive response — aborting before repair loop.',
        })
        this.state = withStatus(this.state!, 'failed')
        this.emit()
      }
      return emptyDecision
    }

    this.state = withStatus(this.state!, 'validating')
    this.emit()
    this.event({ type: 'validation_started', changes: codeOutput.changes, message: 'Validation started' })
    const harnessResult = await this.validateOutput(codeOutput, task, completionTrace)
    this.event({ type: 'validation_completed', harnessResult, message: 'Validation completed' })

    this.state = withStatus(this.state!, 'deciding')
    this.emit()
    const decision = decide(harnessResult, this.state!.iterationHistory, {
      changes: codeOutput.changes,
      contract: this.contract ?? undefined,
    })
    this.event({ type: 'decision_made', decision, message: decision.reason })

    this.state = withIteration(this.state!, buildRecord(this.state!.currentIteration, codeOutput, harnessResult, decision, context, iterStart))
    this.emit()
    this.event({ type: 'iteration_recorded', decision, harnessResult, changes: codeOutput.changes })

    if (decision.decision === 'auto_apply') {
      if (codeOutput.changes.length === 0) {
        this.state = withStatus(this.state!, 'completed')
        this.emit()
        return decision
      }

      if (this.options.autoApply === false) {
        // Harness passed and decision is auto_apply, but user has autoApply disabled.
        // Treat as 'suggest': stop the loop and wait for manual apply.
        // Without this flag, the while loop would re-run the agent indefinitely.
        this.paused = true
        this.state = withStatus(this.state!, 'paused')
        this.emit()
        return decision
      }

      this.state = withStatus(this.state!, 'applying')
      this.emit()
      this.event({ type: 'apply_started', changes: codeOutput.changes, message: 'Apply started' })
      const applyResult = await this.deps.applicationEngine.apply(codeOutput.changes, task.id, harnessResult.score)
      if (applyResult.applied) {
        this.lastCheckpointId = applyResult.checkpointId
        this.state = withStatus(this.state!, 'completed')
        this.emit()
        this.event({ type: 'apply_completed', changes: codeOutput.changes, message: 'Apply completed' })
        // Auto-record verified learnings after successful apply — best-effort, never blocks
        try {
          this.deps.memory?.recordFromIteration(task, this.state!.iterationHistory)
        } catch { /* memory is always best-effort */ }
      } else {
        this.state = withStatus(this.state!, 'paused')
        this.emit()
      }
    }

    return decision
  }

  private async validateOutput(output: AgentOutput, task: TaskDefinition, completionTrace: CompletionTrace): Promise<HarnessResult> {
    const iteration = this.state!.currentIteration + 1
    if (output.changes.length === 0) {
      return {
        score: 75,
        layers: [],
        passed: false,
        duration: 0,
        iteration,
        validationConfidence: 'none',
        skippedLayers: ['build', 'typecheck', 'tests', 'rules'],
      }
    }

    const contract = this.contract ?? createExecutionContract(task)
    const violations = validateContractChanges(output.changes, contract)
    if (violations.length > 0) {
      return contractViolationsToHarnessResult(violations, iteration)
    }

    const missingRequiredPaths = findMissingRequiredPaths(task, output.changes, this.options.projectRoot)
    if (missingRequiredPaths.length > 0) {
      return buildMissingRequiredPathsHarness(missingRequiredPaths, iteration)
    }

    // Claude Code parity for scaffolding: when every change creates a brand-new
    // file, skip the build/test/lint harness entirely. A fresh project has no
    // build script to run yet — Claude Code, Codex and Cursor all just write
    // the files and let the user run their own validation when they're ready.
    // Combined with the pure-create auto_apply rule in @kova/decision, this
    // produces score 90 → auto_apply → files committed.
    const completionProof = buildCompletionProof(task, output.changes, completionTrace, output.thought)
    if (output.maxTurnsReached || output.incompleteReason) {
      completionProof.requirements.push({
        id: 'agent:finished',
        kind: 'claim',
        label: 'Agent finished within turn budget',
        value: output.incompleteReason ?? 'max turns reached',
        required: true,
        source: 'contract',
      })
      completionProof.items.push({
        requirementId: 'agent:finished',
        satisfied: false,
        blocking: true,
        fixable: true,
        reason: output.incompleteReason ?? 'Agent reached max turns before a natural final response.',
      })
    }
    const completionLayer = runCompletionLayer({ proof: completionProof })

    const config = createOrchestratorConfig(
      this.options.projectRoot,
      iteration,
      output.changes.map(c => c.path),
    )
    const signal = this.abortController?.signal
    const orchResult = await this.deps.orchestrator.run(output.changes, {
      ...config,
      signal,
      onLayerStart: (layer, command) => {
        this.event({ type: 'harness_layer_start', harnessLayer: layer, message: command || layer })
      },
      onHarnessLine: (layer, line, stream) => {
        this.event({ type: 'harness_line', harnessLayer: layer, harnessLine: line, harnessStream: stream, message: line })
      },
    })
    return mergeCompletionLayer(orchResult.harnessResult, completionLayer, completionProof)
  }

  private previousHarnessErrors(): HarnessError[] {
    const last = this.state?.iterationHistory.at(-1)
    return last?.harnessResult.layers.flatMap(layer => layer.errors) ?? []
  }
}

function mergeCompletionLayer(
  harness: HarnessResult,
  completionLayer: HarnessResult['layers'][number],
  completionProof: import('@kova/shared').CompletionProof,
): HarnessResult {
  const layers = [completionLayer, ...harness.layers.filter(layer => layer.name !== 'completion')]
  const completionFailed = !completionLayer.skipped && !completionLayer.passed
  const score = completionFailed ? Math.min(harness.score, 55) : harness.score
  const validationConfidence = harness.validationConfidence ?? 'partial'
  return {
    ...harness,
    layers,
    score,
    passed: harness.passed && completionLayer.passed,
    validationConfidence,
    completionProof,
    evidenceScore: harness.evidenceScore
      ? {
          ...harness.evidenceScore,
          score,
          validationConfidence,
          validation: {
            ...harness.evidenceScore.validation,
            executedLayers: ['completion', ...harness.evidenceScore.validation.executedLayers.filter(name => name !== 'completion')],
            passedLayers: completionLayer.passed
              ? ['completion', ...harness.evidenceScore.validation.passedLayers.filter(name => name !== 'completion')]
              : harness.evidenceScore.validation.passedLayers.filter(name => name !== 'completion'),
            failedLayers: completionLayer.passed
              ? harness.evidenceScore.validation.failedLayers.filter(name => name !== 'completion')
              : ['completion', ...harness.evidenceScore.validation.failedLayers.filter(name => name !== 'completion')],
          },
          blockers: completionLayer.passed
            ? harness.evidenceScore.blockers
            : [...new Set(['completion failed', ...harness.evidenceScore.blockers])],
          notes: completionLayer.passed
            ? harness.evidenceScore.notes
            : [...new Set(['completion proof failed', ...harness.evidenceScore.notes])],
        }
      : harness.evidenceScore,
  }
}

function serverSessionFromToolResult(result: string): ServerSessionInfo | undefined {
  if (!/Persistent command started/i.test(result)) return undefined
  const sessionId = result.match(/\((term-[^)]+)\)/)?.[1]
  const url = result.match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?[^\s]*/i)?.[0]
  const port = url?.match(/:(\d+)/)?.[1]
  const readyFlag = result.match(/\bready=(true|false)\b/i)?.[1]
  const diagnostics = result.match(/\bdiagnostics=([^\n]+)/i)?.[1]
    ?.split(',')
    .map(item => item.trim())
    .filter(Boolean)
  return {
    sessionId,
    command: 'run_interactive_command',
    cwd: '',
    persistent: true,
    ready: readyFlag ? readyFlag.toLowerCase() === 'true' : /\bready\b|\blocal:\s*https?:\/\/|localhost|127\.0\.0\.1/i.test(result),
    url,
    port: port ? Number(port) : undefined,
    diagnostics,
  }
}

/**
 * FIX-007: Compute the dynamic maxIterations for the repair loop.
 *
 * Floor is derived from the contract scope (bigger task = more retries needed):
 *   maxFilesChanged * 0.6, rounded up, clamped to [5, 12].
 *
 * The user value (from settings) is honoured when it's >= the floor — they can
 * always raise the ceiling. When the user value is lower than the floor, the
 * floor wins so realistic-sized tasks don't fail on an arbitrarily small limit.
 *
 * Pure function, exported for testing.
 */
export function resolveMaxIterations(userValue: number | undefined, maxFilesChanged: number): number {
  const scopeFloor = Math.min(12, Math.max(5, Math.ceil(maxFilesChanged * 0.6)))
  if (userValue === undefined || userValue <= 0) return scopeFloor
  return Math.max(userValue, scopeFloor)
}

function buildRecord(
  iteration: number,
  output: AgentOutput,
  harnessResult: HarnessResult,
  decision: DecisionResult,
  context: AgentContext,
  startMs: number,
): IterationRecord {
  return {
    iteration,
    agentMode: output.mode,
    agentThought: output.thought,
    changes: output.changes,
    harnessResult,
    decision,
    duration: Date.now() - startMs,
    tokensUsed: output.tokensUsed + context.tokensUsed,
    contextFiles: context.files.map(f => ({ path: f.path })),
  }
}

function buildTextOnlySuccessHarness(iteration: number): HarnessResult {
  return {
    passed: true,
    score: 100,
    duration: 0,
    iteration,
    layers: [],
    validationConfidence: 'full',
  }
}

function buildMissingChangesHarness(iteration: number): HarnessResult {
  return {
    passed: false,
    score: 0,
    duration: 0,
    iteration,
    validationConfidence: 'partial',
    layers: [{
      name: 'rules',
      passed: false,
      errors: [{
        layer: 'rules',
        type: 'architecture',
        severity: 'high',
        fixable: true,
        message: 'Implementation task produced no file changes',
        humanMessage: 'A tarefa pedia alteracao de codigo, mas o agente respondeu apenas texto. Use write_file/edit_file e materialize os arquivos antes de concluir.',
        file: '',
        rule: 'missing_file_changes',
      }],
      warnings: [],
      duration: 0,
      skipped: false,
    }],
  }
}

function buildMissingRequiredPathsHarness(paths: string[], iteration: number): HarnessResult {
  return {
    passed: false,
    score: 0,
    duration: 0,
    iteration,
    validationConfidence: 'partial',
    layers: [{
      name: 'rules',
      passed: false,
      errors: paths.map(path => ({
        layer: 'rules',
        type: 'architecture' as const,
        severity: 'high' as const,
        fixable: true,
        message: `Required file was not produced: ${path}`,
        humanMessage: `O pedido exigia ${path}, mas o agente nao produziu esse arquivo. Continue a implementacao e crie o arquivo real antes de concluir.`,
        file: path,
        rule: 'missing_required_path',
      })),
      warnings: [],
      duration: 0,
      skipped: false,
    }],
  }
}

function findMissingRequiredPaths(task: TaskDefinition, changes: FileChange[], projectRoot: string): string[] {
  const required = extractExplicitRequiredPaths(task.objective)
  if (required.length === 0) return []
  const changed = new Set(changes.map(change => normalizeProjectPath(change.path)))
  return required.filter(path => !changed.has(path) && !existsSync(join(projectRoot, path)))
}

export function extractExplicitRequiredPaths(objective: string): string[] {
  const normalized = objective.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const requirementIndex = normalized.search(/\b(no minimo|minimum|at least|required|obrigatorio|obrigatorios|obrigatorias|materialize)\b/)
  const explicitListMatch = normalized.match(/\b(arquitetura|estrutura|architecture|structure|arquivos|files)\b[^:\n]{0,140}:/)
    ?? normalized.match(/\b(crie|criar|create|implemente|implement)\b[^:\n]{0,100}\b(arquivos|files)\b[^:\n]{0,100}:/)
  if (requirementIndex === -1 && !explicitListMatch) return []

  const paths = new Set<string>()
  const searchStart = requirementIndex !== -1
    ? requirementIndex
    : explicitListMatch?.index ?? 0
  const searchArea = objective.slice(searchStart, searchStart + 900)
  const pattern = /\b(?:[A-Za-z0-9_.@-]+[\\/])*[A-Za-z0-9_.@-]+\.[A-Za-z0-9]+\b/g
  for (const match of searchArea.matchAll(pattern)) {
    const path = normalizeProjectPath(match[0])
    if (isLikelyProjectPath(path)) paths.add(path)
  }
  return [...paths]
}

function normalizeProjectPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/[),.;:]+$/, '').trim()
}

function isLikelyProjectPath(path: string): boolean {
  if (!path || path.includes('://')) return false
  if (/^\d+(?:\.\d+)+[a-z]*$/i.test(path)) return false
  const basename = path.split('/').pop() ?? ''
  const dot = basename.lastIndexOf('.')
  if (dot <= 0) return false
  const stem = basename.slice(0, dot)
  const ext = basename.slice(dot + 1)
  if (ext !== ext.toLowerCase()) return false
  if (!KNOWN_REQUIRED_PATH_EXTS.has(ext)) return false
  return /[A-Za-z_@-]/.test(stem)
}

const KNOWN_REQUIRED_PATH_EXTS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'css', 'scss', 'sass', 'less', 'html', 'htm',
  'json', 'md', 'mdx', 'yml', 'yaml', 'toml',
  'go', 'py', 'rs', 'java', 'kt', 'kts', 'cs',
  'rb', 'php', 'swift', 'dart', 'vue', 'svelte',
  'svg', 'png', 'jpg', 'jpeg', 'webp', 'ico',
])

function createReasoningEvents(
  emit: (event: Omit<ExecutionEvent, 'taskId' | 'timestamp' | 'iteration'> & { iteration?: number }) => void,
): { start: () => void; delta: (delta: string) => void; end: () => void } {
  let active = false
  return {
    start: () => {
      if (active) return
      active = true
      emit({ type: 'reasoning_start', message: 'Reasoning...' })
    },
    delta: (delta: string) => {
      if (!delta) return
      if (!active) {
        active = true
        emit({ type: 'reasoning_start', message: 'Reasoning...' })
      }
      emit({ type: 'reasoning_delta', reasoning: delta })
    },
    end: () => {
      if (!active) return
      active = false
      emit({ type: 'reasoning_end' })
    },
  }
}

// generateProofPack extracted to ./proof-pack.ts
