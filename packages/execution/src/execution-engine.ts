import type {
  AgentContext, AgentMode, AgentOutput, DecisionResult, ExecutionContract,
  ExecutionEvent, ExecutionState, FileChange, HarnessError, HarnessResult,
  IterationRecord, TaskDefinition, AgentMessage, ProofPack, ProofPackValidation
} from '@kova/shared'
import { createOrchestratorConfig } from '@kova/orchestrator'
import type { OrchestratorConfig, OrchestratorResult } from '@kova/orchestrator'
import { decide } from '@kova/decision'
import { createInitialState, withIteration, withStatus } from './state'
import { shouldStop, type StopOptions } from './stop-conditions'
import {
  contractViolationsToHarnessResult,
  createExecutionContract,
  validateContractChanges,
} from './execution-contract'

interface IAgent {
  execute(task: TaskDefinition, context: AgentContext, mode: AgentMode, options?: {
    signal?: AbortSignal
    onToken?: (token: string) => void
    onToolCall?: (name: string, input: Record<string, unknown>) => void
    onToolResult?: (name: string, result: string) => void
  }): Promise<AgentOutput>
}

interface IOrchestrator {
  run(changes: FileChange[], config: OrchestratorConfig): Promise<OrchestratorResult>
}

interface IContextEngine {
  buildContext(task: TaskDefinition, projectRoot: string, options?: { harnessErrors?: HarnessError[] }): Promise<AgentContext>
}

interface IApplicationEngine {
  apply(changes: FileChange[], taskId: string, score?: number): Promise<{ applied: boolean; checkpointId: string; reason?: string }>
  rollback(checkpointId: string): Promise<void>
}

export interface ExecutionDependencies {
  agent: IAgent
  orchestrator: IOrchestrator
  contextEngine: IContextEngine
  applicationEngine: IApplicationEngine
}

export interface ExecutionEngineOptions extends StopOptions {
  projectRoot: string
  contract?: ExecutionContract
  autoApply?: boolean
  history?: AgentMessage[]
  skipPlan?: boolean
  onStateChange?: (state: ExecutionState) => void
  onEvent?: (event: ExecutionEvent) => void
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
    if (this.lastCheckpointId) {
      await this.deps.applicationEngine.rollback(this.lastCheckpointId)
    }
    if (this.state) {
      this.state = withStatus(this.state, 'failed')
      this.emit()
    }
  }

  async forceApply(): Promise<void> {
    const last = this.state?.iterationHistory.at(-1)
    if (!last || !this.task) throw new Error('Sem changes para aplicar')

    const score = last.harnessResult.score
    const result = await this.deps.applicationEngine.apply(last.changes, this.task.id, score)

    if (result.applied) {
      this.lastCheckpointId = result.checkpointId
      this.state = withStatus(this.state!, 'completed')
      this.emit()
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
      this.event({ type: 'proof_pack', proofPack, message: 'Proof Pack gerado' })
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
    const context = await this.deps.contextEngine.buildContext(task, this.options.projectRoot, { harnessErrors: previousErrors })
    this.event({
      type: 'context_loaded',
      message: `${context.files.length} context files`,
      context: {
        files: context.files.map(file => file.path),
        tokensUsed: context.tokensUsed,
        learningsCount: context.learnings.length,
      },
    })

    // Re-check after context build — abort() could have fired while context was loading
    if (this.aborted || this.abortController.signal.aborted) {
      const err = new Error('Aborted'); err.name = 'AbortError'; throw err
    }

    const agentOptions = {
      history: this.options.history,
      signal: this.abortController.signal,
      onToken: (token: string) => this.event({ type: 'token', token }),
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

    if (isFirst && !this.options.skipPlan) {
      this.state = withStatus(this.state!, 'planning')
      this.emit()
      this.event({ type: 'agent_started', mode: 'plan', message: 'Planning started' })
      await this.deps.agent.execute(task, context, 'plan', agentOptions)
      this.event({ type: 'stream_end', message: '' })
      this.event({ type: 'agent_completed', mode: 'plan', message: 'Planning completed' })
    }

    this.state = withStatus(this.state!, 'coding')
    this.emit()
    const mode: AgentMode = isFirst ? (this.options.skipPlan ? 'unified' : 'code') : 'fix'
    this.event({ type: 'agent_started', mode, message: `${mode} started` })
    const codeOutput = await this.deps.agent.execute(task, context, mode, agentOptions)
    this.event({ type: 'stream_end', message: '' })
    this.event({ type: 'agent_completed', mode, changes: codeOutput.changes, message: `${mode} completed` })

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
      return { score: 100, layers: [], passed: true, duration: 0, iteration }
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
    const orchResult = await this.deps.orchestrator.run(output.changes, config)
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

function generateProofPack(state: ExecutionState, contract: ExecutionContract): ProofPack {
  const lastIter = state.iterationHistory.at(-1)
  const changes = lastIter?.changes.map(c => ({
    path: c.path,
    type: c.type,
    reason: 'Modificado durante iteração'
  })) ?? []

  const validationsRun: ProofPackValidation[] = []
  const validationsNotRun: Array<{ kind: string; reason: string }> = []
  const residualRisk: string[] = []

  if (lastIter?.harnessResult) {
    for (const layer of lastIter.harnessResult.layers) {
      if (layer.skipped) {
        validationsNotRun.push({ kind: layer.name, reason: layer.warnings[0]?.message ?? 'Skipped' })
      } else {
        validationsRun.push({
          kind: layer.name as ProofPackValidation['kind'],
          command: layer.command,
          passed: layer.passed,
          skipped: false,
          note: layer.passed ? undefined : `${layer.errors.length} erro(s)`
        })
      }
    }
  }

  // Collect context files from all iterations, deduplicating by path
  const contextFileMap = new Map<string, { path: string; reason: string }>()
  for (const iter of state.iterationHistory) {
    for (const f of iter.contextFiles ?? []) {
      if (!contextFileMap.has(f.path)) {
        contextFileMap.set(f.path, { path: f.path, reason: `No contexto da iteração ${iter.iteration}` })
      }
    }
  }
  const analyzedFiles = Array.from(contextFileMap.values())

  return {
    objective: contract.objective,
    iterations: state.currentIteration,
    totalTokens: state.totalTokens,
    changes,
    analyzedFiles,
    validationsRun,
    validationsNotRun,
    residualRisk,
    finalDecision: lastIter?.decision.decision ?? 'suggest',
    finalScore: lastIter?.decision.score ?? 0,
    completedAt: new Date().toISOString()
  }
}
