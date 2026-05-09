import { ExecutionState, DecisionResult, TaskDefinition, AgentContext, AgentMode, AgentOutput, FileChange, HarnessError, ExecutionContract, AgentMessage, ExecutionEvent, IterationRecord, ContractViolation, HarnessResult } from '@kova/shared';
import { OrchestratorConfig, OrchestratorResult } from '@kova/orchestrator';

type StopReason = 'success' | 'max_iterations' | 'human_required' | 'timeout' | 'aborted';
interface StopOptions {
    maxIterations?: number;
    timeoutMs?: number;
}
declare function shouldStop(state: ExecutionState, lastDecision?: DecisionResult, options?: StopOptions): StopReason | null;

interface IAgent {
    execute(task: TaskDefinition, context: AgentContext, mode: AgentMode, options?: {
        signal?: AbortSignal;
        onToken?: (token: string) => void;
        onToolCall?: (name: string, input: Record<string, unknown>) => void;
        onToolResult?: (name: string, result: string) => void;
    }): Promise<AgentOutput>;
}
interface IOrchestrator {
    run(changes: FileChange[], config: OrchestratorConfig): Promise<OrchestratorResult>;
}
interface IContextEngine {
    buildContext(task: TaskDefinition, projectRoot: string, options?: {
        harnessErrors?: HarnessError[];
    }): Promise<AgentContext>;
}
interface IApplicationEngine {
    apply(changes: FileChange[], taskId: string, score?: number): Promise<{
        applied: boolean;
        checkpointId: string;
        reason?: string;
    }>;
    rollback(checkpointId: string): Promise<void>;
}
interface ExecutionDependencies {
    agent: IAgent;
    orchestrator: IOrchestrator;
    contextEngine: IContextEngine;
    applicationEngine: IApplicationEngine;
}
interface ExecutionEngineOptions extends StopOptions {
    projectRoot: string;
    contract?: ExecutionContract;
    autoApply?: boolean;
    history?: AgentMessage[];
    skipPlan?: boolean;
    onStateChange?: (state: ExecutionState) => void;
    onEvent?: (event: ExecutionEvent) => void;
}
declare class ExecutionEngine {
    private readonly deps;
    private readonly options;
    private state;
    private task;
    private contract;
    private paused;
    private aborted;
    private lastCheckpointId;
    private abortController;
    constructor(deps: ExecutionDependencies, options: ExecutionEngineOptions);
    run(task: TaskDefinition): Promise<ExecutionState>;
    pause(): void;
    resume(): Promise<ExecutionState>;
    abort(): Promise<void>;
    forceApply(): Promise<void>;
    getState(): ExecutionState | null;
    private emit;
    private event;
    private loop;
    private runIteration;
    private validateOutput;
    private previousHarnessErrors;
}

declare function createInitialState(task: TaskDefinition, maxIterations?: number): ExecutionState;
declare function withStatus(state: ExecutionState, status: ExecutionState['status']): ExecutionState;
declare function withIteration(state: ExecutionState, record: IterationRecord): ExecutionState;

interface TaskStructuringLLM {
    generate(messages: AgentMessage[], options?: {
        system?: string;
        maxTokens?: number;
    }): Promise<{
        thought: string;
    }>;
}
interface TaskStructuringProject {
    id?: string;
    root: string;
    stackAdapter: string;
    affectedFiles: string[];
    context?: string;
    llm: TaskStructuringLLM;
}
type TaskStructuringResult = {
    valid: true;
    task: TaskDefinition;
} | {
    valid: false;
    reason: string;
    suggestions: string[];
};
declare function structureTask(input: string, project: TaskStructuringProject): Promise<TaskStructuringResult>;

declare function createExecutionContract(task: TaskDefinition): ExecutionContract;
declare function validateContractChanges(changes: FileChange[], contract: ExecutionContract): ContractViolation[];
declare function contractViolationsToHarnessResult(violations: ContractViolation[], iteration: number): HarnessResult;

export { type ExecutionDependencies, ExecutionEngine, type ExecutionEngineOptions, type StopOptions, type StopReason, type TaskStructuringLLM, type TaskStructuringProject, type TaskStructuringResult, contractViolationsToHarnessResult, createExecutionContract, createInitialState, shouldStop, structureTask, validateContractChanges, withIteration, withStatus };
