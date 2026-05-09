interface TaskDefinition {
    id: string;
    objective: string;
    constraints: string[];
    nonGoals: string[];
    validationCriteria: string[];
    type: 'feature' | 'bugfix' | 'refactor' | 'test' | 'docs';
    impact: 'low' | 'medium' | 'high';
    affectedFiles: string[];
    stackAdapter: string;
}
interface HarnessResult {
    passed: boolean;
    score: number;
    layers: LayerResult[];
    duration: number;
    iteration: number;
    /** Confidence level of the validation that produced this result */
    validationConfidence?: 'none' | 'partial' | 'full';
    /** Layer names that were present but skipped (not executed) */
    skippedLayers?: string[];
}
interface LayerResult {
    name: 'tests' | 'build' | 'rules' | 'security' | 'lint' | 'typecheck';
    passed: boolean;
    errors: HarnessError[];
    warnings: HarnessWarning[];
    duration: number;
    skipped: boolean;
    /** Command that was executed (empty for in-process layers like rules/security) */
    command?: string;
    /** Raw stdout captured from the command */
    stdout?: string;
    /** Raw stderr captured from the command */
    stderr?: string;
    /** Process exit code (0 = success) */
    exitCode?: number;
    /** Workspace or module scope that originated this validation */
    scope?: string;
    /** ISO timestamp when the layer started executing */
    startedAt?: string;
}
interface HarnessError {
    layer: string;
    type: 'syntax' | 'logic' | 'architecture' | 'security' | 'style';
    severity: 'low' | 'medium' | 'high' | 'critical';
    fixable: boolean;
    message: string;
    humanMessage: string;
    file: string;
    line?: number;
    rule?: string;
    suggestion?: string;
}
interface HarnessWarning {
    layer: string;
    message: string;
    file: string;
    line?: number;
}
type HarnessMode = 'fast' | 'standard' | 'full';
interface DecisionResult {
    decision: 'auto_apply' | 'suggest' | 'reject' | 'human_required';
    score: number;
    reason: string;
    feedback: AgentFeedback[];
    reviewGate?: ReviewGateResult;
}
interface AgentFeedback {
    error: HarnessError;
    instruction: string;
    context: string;
    relatedLearning?: string;
}
interface Learning {
    id: string;
    type: 'pattern' | 'anti_pattern' | 'decision';
    scope: 'project' | 'stack' | 'global';
    status: 'experimental' | 'verified' | 'canonical';
    confidence: number;
    contradictions: number;
    description: string;
    evidence: Evidence[];
    tags: string[];
    stack?: string;
    createdAt: string;
    lastSeen: string;
    ttl?: string;
}
interface Evidence {
    taskId: string;
    harnessLayer: string;
    file: string;
    diffSnippet: string;
    outcome: 'rejected' | 'approved';
    timestamp: string;
}
interface ExecutionState {
    taskId: string;
    status: 'structuring' | 'planning' | 'coding' | 'validating' | 'deciding' | 'applying' | 'completed' | 'paused' | 'failed';
    currentIteration: number;
    maxIterations: number;
    iterationHistory: IterationRecord[];
    startedAt: string;
    totalTokens: number;
    /** Proof Pack gerado ao final da tarefa (completed | paused | failed) */
    proofPack?: ProofPack;
}
interface IterationRecord {
    iteration: number;
    agentMode: string;
    agentThought: string;
    changes: FileChange[];
    harnessResult: HarnessResult;
    decision: DecisionResult;
    duration: number;
    tokensUsed: number;
    /** Arquivos que estavam no contexto desta iteração (sem conteúdo) */
    contextFiles?: Array<{
        path: string;
    }>;
}
interface FileChange {
    path: string;
    type: 'create' | 'modify' | 'delete';
    diff: string;
    before?: string;
}
interface ExecutionContract {
    id: string;
    taskId: string;
    objective: string;
    stackAdapter: string;
    allowedPaths: string[];
    forbiddenPaths: string[];
    safeZones: string[];
    allowedCommands: string[];
    forbiddenCommands: string[];
    validationCriteria: string[];
    requiresTests: boolean;
    maxFilesChanged: number;
    createdAt: string;
}
interface ContractViolation {
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    file: string;
    rule: string;
}
interface AgentResultMessage {
    kind: 'agent_result';
    title: string;
    summary: string;
    filesChanged: Array<{
        path: string;
        displayName: string;
        status: 'created' | 'modified' | 'deleted';
        additions?: number;
        deletions?: number;
    }>;
    validations: Array<{
        command: string;
        status: 'passed' | 'failed' | 'skipped';
        exitCode?: number;
        durationMs?: number;
    }>;
    risk: 'low' | 'medium' | 'high';
    decision: 'apply' | 'suggest' | 'needs_review' | 'reject';
    notes: string[];
    logsRef?: string;
    proofPackRef?: string;
}
interface PlanResultMessage {
    kind: 'plan_result';
    objective: string;
    files: Array<{
        path: string;
        reason: string;
    }>;
    approach: string;
    validations: string[];
    risk: 'low' | 'medium' | 'high';
}
type StructuredAgentMessage = AgentResultMessage | PlanResultMessage;
interface ReviewFinding {
    category: 'scope' | 'stack' | 'dependency' | 'security' | 'tests' | 'generated' | 'quality';
    severity: 'low' | 'medium' | 'high' | 'critical';
    blocking: boolean;
    message: string;
    file?: string;
    suggestion?: string;
}
interface ReviewGateResult {
    passed: boolean;
    findings: ReviewFinding[];
}
interface ExecutionEvent {
    type: 'contract_created' | 'state_changed' | 'agent_started' | 'agent_completed' | 'validation_started' | 'validation_completed' | 'decision_made' | 'apply_started' | 'apply_completed' | 'iteration_recorded' | 'proof_pack' | 'token' | 'stream_end' | 'context_loaded' | 'context_ref_denied' | 'file_mutation' | 'token_usage' | 'tool_call' | 'tool_result';
    taskId: string;
    timestamp: string;
    iteration?: number;
    state?: ExecutionState['status'];
    mode?: AgentMode;
    message?: string;
    contract?: ExecutionContract;
    harnessResult?: HarnessResult;
    decision?: DecisionResult;
    changes?: FileChange[];
    proofPack?: ProofPack;
    structuredMessage?: StructuredAgentMessage;
    token?: string;
    context?: {
        files: string[];
        tokensUsed: number;
        maxTokens?: number;
        learningsCount?: number;
        reused?: boolean;
    };
    tokensUsed?: number;
    toolName?: string;
    toolInput?: Record<string, unknown>;
    toolOutput?: string;
}
interface StackAdapter {
    name: string;
    detect(projectRoot: string): boolean;
    commands: {
        build: string;
        test: string;
        lint: string;
        format?: string;
    };
    parseImports(filePath: string, content: string): string[];
    treeSitterLanguage(): string;
    semgrepRuleset(): string;
    namingConvention: {
        functions: 'camelCase' | 'snake_case' | 'PascalCase';
        files: 'kebab-case' | 'snake_case' | 'PascalCase';
        classes: 'PascalCase';
    };
}
type ProjectSignalKind = 'manifest' | 'lockfile' | 'source_file' | 'config' | 'doc' | 'task_runner';
interface ProjectSignal {
    kind: ProjectSignalKind;
    path: string;
    stackHint: string;
    confidence: number;
}
interface DetectedItem {
    name: string;
    confidence: number;
    source: string;
}
interface CommandCandidate {
    command: string;
    source: 'manifest' | 'workspace_manifest' | 'makefile' | 'taskfile' | 'readme' | 'agent_instructions' | 'adapter_default';
    confidence: number;
    safeToRun: boolean;
    scope?: string;
}
interface InstructionFile {
    path: string;
    content: string;
    priority: number;
}
interface ProjectWorkspace {
    name: string;
    path: string;
    kind: 'workspace' | 'module';
    languages: DetectedItem[];
    frameworks: DetectedItem[];
    packageManagers: DetectedItem[];
    buildCommands: CommandCandidate[];
    testCommands: CommandCandidate[];
    lintCommands: CommandCandidate[];
    typecheckCommands: CommandCandidate[];
    confidence: number;
}
interface ProjectValidation {
    kind: 'build' | 'test' | 'lint' | 'typecheck' | 'security' | 'architecture';
    command?: string;
    source: CommandCandidate['source'] | 'ci' | 'config';
    confidence: number;
    safeToRun: boolean;
    scope: string;
    available: boolean;
}
interface ProjectFileReference {
    path: string;
    kind: 'ci' | 'container' | 'task_runner' | 'instruction' | 'sensitive';
    confidence: number;
}
interface ProjectRisk {
    kind: 'sensitive_files' | 'no_validation' | 'partial_validation' | 'unsafe_command' | 'large_project' | 'multi_stack';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    evidence: string[];
}
interface ProjectProfile {
    root: string;
    languages: DetectedItem[];
    frameworks: DetectedItem[];
    packageManagers: DetectedItem[];
    workspaces: ProjectWorkspace[];
    buildCommands: CommandCandidate[];
    testCommands: CommandCandidate[];
    lintCommands: CommandCandidate[];
    typecheckCommands: CommandCandidate[];
    validations: ProjectValidation[];
    ci: ProjectFileReference[];
    containers: ProjectFileReference[];
    taskRunners: ProjectFileReference[];
    instructionFiles: ProjectFileReference[];
    sensitiveFiles: ProjectFileReference[];
    risks: ProjectRisk[];
    entrypoints: string[];
    architectureHints: string[];
    signals: ProjectSignal[];
    confidence: number;
}
interface HarnessProjectConfig {
    validation?: {
        build?: string[] | 'auto';
        test?: string[] | 'auto';
        lint?: string[] | 'auto';
        security?: string[] | 'auto';
        architecture?: string[] | 'auto';
    };
    policy?: {
        autoApplyThreshold?: number;
        suggestThreshold?: number;
        rejectBelow?: number;
        requireRealValidationForAutoApply?: boolean;
    };
}
interface KovaConfig {
    project: {
        name: string;
        stack: string;
    };
    harness: {
        max_iterations: number;
        default_mode: HarnessMode;
        layers: Record<string, unknown>;
    };
    decision: {
        auto_apply_threshold: number;
        suggest_threshold: number;
        max_repeated_errors: number;
    };
    agent: {
        provider: string;
        model: string;
        temperature: number;
        fallback_provider: string;
        fallback_model: string;
    };
    context: {
        strategy: string;
        max_tokens: number;
        include_rules: boolean;
        include_errors: boolean;
        include_learnings: boolean;
        max_files: number;
    };
    memory: {
        max_project_learnings: number;
        max_global_learnings: number;
        promotion_threshold: number;
        canonical_threshold: number;
        contradiction_limit: number;
        decay_experimental_days: number;
        decay_verified_days: number;
    };
    safe_zones: string[];
    observability: {
        trace_retention_days: number;
        log_level: string;
    };
}
interface PatchRecord {
    taskId: string;
    file: string;
    diff: string;
    appliedAt: string;
    rolledBack: boolean;
    rollbackReason?: string;
}
interface Checkpoint {
    id: string;
    taskId: string;
    iteration: number;
    state: ExecutionState;
    timestamp: string;
}
interface RuleProfile {
    fileType: 'ui' | 'logic' | 'config' | 'test';
    functionSizeLimit: number;
    fileSizeLimit: number;
    nestingLimit: number;
    cyclomaticLimit: number;
    enforceNaming: boolean;
}
type AgentMode = 'plan' | 'code' | 'test' | 'fix' | 'review' | 'unified';
interface AgentMessage {
    role: 'user' | 'assistant';
    content: string;
}
interface AgentOutput {
    mode: AgentMode;
    thought: string;
    changes: FileChange[];
    tokensUsed: number;
}
type ContextRelevance = 'rules' | 'target' | 'error' | 'direct_dep' | 'learning' | 'indirect_dep';
type ContextSource = 'instruction' | 'explicit' | 'error' | 'dependency' | 'grep' | 'memory' | 'profile' | 'diff';
interface ContextFile {
    path: string;
    content: string;
    tokens: number;
    relevance: ContextRelevance;
    score?: number;
    reason?: string;
    evidence?: string[];
    source?: ContextSource;
}
interface ContextPackFile {
    path: string;
    relevance: ContextRelevance;
    source: ContextSource;
    score: number;
    reason: string;
    evidence: string[];
    tokens: number;
}
interface ContextPack {
    request: string;
    profile: {
        root: string;
        languages: DetectedItem[];
        frameworks: DetectedItem[];
        workspaces: Pick<ProjectWorkspace, 'name' | 'path' | 'kind' | 'confidence'>[];
        risks: ProjectRisk[];
    };
    files: ContextPackFile[];
    validations: ProjectValidation[];
    instructions: string[];
    errors: HarnessError[];
    diff?: string;
    memories: Array<Pick<Learning, 'id' | 'description' | 'scope' | 'status' | 'confidence' | 'tags'>>;
    omitted: {
        sensitiveFiles: string[];
        overBudgetFiles: string[];
    };
    budget: {
        maxTokens: number;
        tokensUsed: number;
        fileCount: number;
    };
}
interface AgentContext {
    files: ContextFile[];
    tokensUsed: number;
    learnings: Learning[];
    pack?: ContextPack;
}
interface ProofPackValidation {
    kind: 'build' | 'test' | 'lint' | 'typecheck' | 'security' | 'rules';
    command?: string;
    passed: boolean;
    skipped: boolean;
    /** motivo do skip ou do fail resumido */
    note?: string;
}
interface ProofPack {
    /** Objetivo entendido (do contrato ou task) */
    objective: string;
    /** Iterações completas */
    iterations: number;
    /** Total de tokens usados */
    totalTokens: number;
    /** Arquivos alterados + razão resumida por arquivo */
    changes: Array<{
        path: string;
        type: FileChange['type'];
        reason: string;
    }>;
    /** Arquivos analisados no contexto (sem conteúdo — apenas paths e motivo) */
    analyzedFiles: Array<{
        path: string;
        reason: string;
    }>;
    /** Validações executadas e seus resultados */
    validationsRun: ProofPackValidation[];
    /** Validações que NÃO foram executadas e por quê */
    validationsNotRun: Array<{
        kind: string;
        reason: string;
    }>;
    /** Risco residual identificado */
    residualRisk: string[];
    /** Decisão final do harness */
    finalDecision: DecisionResult['decision'];
    /** Score final */
    finalScore: number;
    /** Timestamp de conclusão */
    completedAt: string;
}
type LearningClassification = 'safe_lesson' | 'needs_review' | 'temporary_workaround' | 'local_exception' | 'rejected_learning';
interface LearningCandidate {
    description: string;
    type: Learning['type'];
    scope: Learning['scope'];
    tags: string[];
    /** Evidence da tarefa atual */
    evidence: Evidence[];
    /** Stack detectada no projeto */
    stack?: string;
}
interface LearningGateResult {
    classification: LearningClassification;
    /** Razão da classificação */
    reason: string;
    /** Se approved, o learning a registrar */
    approved: boolean;
    /** Ajustes aplicados ao candidato antes de registrar (ex: scope rebaixado) */
    adjustedCandidate?: LearningCandidate;
}

export type { AgentContext, AgentFeedback, AgentMessage, AgentMode, AgentOutput, AgentResultMessage, Checkpoint, CommandCandidate, ContextFile, ContextPack, ContextPackFile, ContextRelevance, ContextSource, ContractViolation, DecisionResult, DetectedItem, Evidence, ExecutionContract, ExecutionEvent, ExecutionState, FileChange, HarnessError, HarnessMode, HarnessProjectConfig, HarnessResult, HarnessWarning, InstructionFile, IterationRecord, KovaConfig, LayerResult, Learning, LearningCandidate, LearningClassification, LearningGateResult, PatchRecord, PlanResultMessage, ProjectFileReference, ProjectProfile, ProjectRisk, ProjectSignal, ProjectSignalKind, ProjectValidation, ProjectWorkspace, ProofPack, ProofPackValidation, ReviewFinding, ReviewGateResult, RuleProfile, StackAdapter, StructuredAgentMessage, TaskDefinition };
