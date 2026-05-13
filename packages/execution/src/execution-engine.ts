import type {
  AgentContext, AgentMode, AgentOutput, DecisionResult, ExecutionContract,
  DiffReviewSelection, ExecutionEvent, ExecutionState, FileChange, HarnessError, HarnessResult,
  IterationRecord, Learning, TaskDefinition, AgentMessage, ProofPack, ProofPackValidation
} from '@kova/shared'
import { createOrchestratorConfig } from '@kova/orchestrator'
import type { OrchestratorConfig, OrchestratorResult } from '@kova/orchestrator'
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

type InteractiveCommandRunner = (command: string, cwd: string, reason: string) => Promise<{ exitCode: number; output: string }>

interface IAgent {
  execute(task: TaskDefinition, context: AgentContext, mode: AgentMode, options?: {
    signal?: AbortSignal
    onToken?: (token: string) => void
    onToolCall?: (name: string, input: Record<string, unknown>) => void
    onToolResult?: (name: string, result: string) => void
    interactiveRunner?: InteractiveCommandRunner
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
}

export class ExecutionEngine {
  private state: ExecutionState | null = null
  private task: TaskDefinition | null = null
  private contract: ExecutionContract | null = null
  private paused = false
  private aborted = false
  private lastCheckpointId = ''
  private abortController: AbortController | null = null

  constructor(
    private readonly deps: ExecutionDependencies,
    private readonly options: ExecutionEngineOptions,
  ) {}

  async run(task: TaskDefinition): Promise<ExecutionState> {
    this.task = task
    this.contract = this.options.contract ?? createExecutionContract(task)
    this.paused = false
    this.aborted = false
    this.state = createInitialState(task, this.options.maxIterations)
    this.event({ type: 'contract_created', contract: this.contract, message: 'Execution contract created' })
    this.emit()
    return this.loop()
  }

  pause(): void { this.paused = true }

  async resume(): Promise<ExecutionState> {
    if (!this.task || !this.state || this.state.status !== 'paused') {
      throw new Error('Engine não está pausada')
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
    if (!last || !this.task) throw new Error('Sem changes para aplicar')
    if (last.changes.length === 0) throw new Error('Sem changes para aplicar')

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
          this.state = withStatus(this.state!, 'failed')
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
      this.event({ type: 'proof_pack', proofPack, message: 'Proof Pack gerado' })
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
    const context = await this.deps.contextEngine.buildContext(task, this.options.projectRoot, {
      harnessErrors: previousErrors,
      explicitFiles: this.options.explicitFiles,
      openedFiles: this.options.openedFiles,
      diff: this.options.diff,
    })
    this.event({
      type: 'context_loaded',
      message: `${context.files.length} context files`,
      context: {
        files: context.files.map(file => file.path),
        tokensUsed: context.tokensUsed,
        maxTokens: context.pack?.budget.maxTokens,
        learningsCount: context.learnings.length,
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

    const agentOptions = {
      history: this.options.history,
      signal: this.abortController.signal,
      interactiveRunner: this.options.interactiveRunner,
      onToken: (token: string) => {
        reasoning.end()
        this.event({ type: 'token', token })
      },
      onReasoningStart: () => reasoning.start(),
      onReasoningDelta: (delta: string) => reasoning.delta(delta),
      onReasoningEnd: () => reasoning.end(),
      onToolCall: (name: string, input: Record<string, unknown>) => {
        const preview = name === 'write_file' ? String(input.path ?? '') : name === 'run_command' ? String(input.command ?? '') : ''
        this.event({ type: 'tool_call', toolName: name, toolInput: input, message: preview ? `${name}: ${preview}` : name })
      },
      onToolResult: (name: string, result: string) => {
        this.event({
          type: 'tool_result',
          toolName: name,
          message: result.slice(0, 2_000),
          toolOutput: result.slice(0, 20_000),
        })
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
      this.event({ type: 'agent_started', mode, message: `${mode} started` })
      codeOutput = await this.deps.agent.execute(task, context, mode, agentOptions)
      reasoning.end()
      this.event({ type: 'stream_end', message: '' })
      this.event({ type: 'agent_completed', mode, changes: codeOutput.changes, message: `${mode} completed` })
    } finally {
      reasoning.end()
    }

    // Text-only response: model responded without writing any files.
    // Nothing to validate and nothing to apply — complete immediately.
    if (codeOutput.changes.length === 0) {
      const emptyDecision: import('@kova/shared').DecisionResult = {
        decision: 'auto_apply', score: 100,
        reason: 'No file changes — text-only response',
        feedback: [],
      }
      const emptyHarness: import('@kova/shared').HarnessResult = {
        passed: true, score: 100, duration: 0, iteration: this.state!.currentIteration + 1,
        layers: [], validationConfidence: 'full',
      }
      this.state = withIteration(this.state!, buildRecord(this.state!.currentIteration, codeOutput, emptyHarness, emptyDecision, context, iterStart))
      this.emit()
      this.state = withStatus(this.state!, 'completed')
      this.emit()
      return emptyDecision
    }

    this.state = withStatus(this.state!, 'validating')
    this.emit()
    this.event({ type: 'validation_started', changes: codeOutput.changes, message: 'Validation started' })
    const harnessResult = await this.validateOutput(codeOutput)
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

  private async validateOutput(output: AgentOutput): Promise<HarnessResult> {
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

    const contract = this.contract ?? createExecutionContract(this.task!)
    const violations = validateContractChanges(output.changes, contract)
    if (violations.length > 0) {
      return contractViolationsToHarnessResult(violations, iteration)
    }

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
    return orchResult.harnessResult
  }

  private previousHarnessErrors(): HarnessError[] {
    const last = this.state?.iterationHistory.at(-1)
    return last?.harnessResult.layers.flatMap(layer => layer.errors) ?? []
  }
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

function createReasoningEvents(
  emit: (event: Omit<ExecutionEvent, 'taskId' | 'timestamp' | 'iteration'> & { iteration?: number }) => void,
): { start: () => void; delta: (delta: string) => void; end: () => void } {
  let active = false
  return {
    start: () => {
      if (active) return
      active = true
      emit({ type: 'reasoning_start', message: 'Raciocinando...' })
    },
    delta: (delta: string) => {
      if (!delta) return
      if (!active) {
        active = true
        emit({ type: 'reasoning_start', message: 'Raciocinando...' })
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
