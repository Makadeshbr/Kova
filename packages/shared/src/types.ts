export interface TaskDefinition {
  id: string
  objective: string
  constraints: string[]
  nonGoals: string[]
  validationCriteria: string[]
  type: 'feature' | 'bugfix' | 'refactor' | 'test' | 'docs'
  impact: 'low' | 'medium' | 'high'
  affectedFiles: string[]
  stackAdapter: string
}

export interface HarnessResult {
  passed: boolean
  score: number
  layers: LayerResult[]
  duration: number
  iteration: number
  /** Confidence level of the validation that produced this result */
  validationConfidence?: 'none' | 'partial' | 'full'
  /** Layer names that were present but skipped (not executed) */
  skippedLayers?: string[]
}

export interface LayerResult {
  name: 'tests' | 'build' | 'rules' | 'security' | 'lint' | 'typecheck'
  passed: boolean
  errors: HarnessError[]
  warnings: HarnessWarning[]
  duration: number
  skipped: boolean
  /** Command that was executed (empty for in-process layers like rules/security) */
  command?: string
  /** Raw stdout captured from the command */
  stdout?: string
  /** Raw stderr captured from the command */
  stderr?: string
  /** Process exit code (0 = success) */
  exitCode?: number
  /** Workspace or module scope that originated this validation */
  scope?: string
  /** ISO timestamp when the layer started executing */
  startedAt?: string
}

export interface HarnessError {
  layer: string
  type: 'syntax' | 'logic' | 'architecture' | 'security' | 'style'
  severity: 'low' | 'medium' | 'high' | 'critical'
  fixable: boolean
  message: string
  humanMessage: string
  file: string
  line?: number
  rule?: string
  suggestion?: string
}

export interface HarnessWarning {
  layer: string
  message: string
  file: string
  line?: number
}

export type HarnessMode = 'fast' | 'standard' | 'full'

export interface DecisionResult {
  decision: 'auto_apply' | 'suggest' | 'reject' | 'human_required'
  score: number
  reason: string
  feedback: AgentFeedback[]
  reviewGate?: ReviewGateResult
}

export interface AgentFeedback {
  error: HarnessError
  instruction: string
  context: string
  relatedLearning?: string
}

export interface Learning {
  id: string
  type: 'pattern' | 'anti_pattern' | 'decision'
  scope: 'project' | 'stack' | 'global'
  status: 'experimental' | 'verified' | 'canonical'
  confidence: number
  contradictions: number
  description: string
  evidence: Evidence[]
  tags: string[]
  stack?: string
  createdAt: string
  lastSeen: string
  ttl?: string
}

export interface Evidence {
  taskId: string
  harnessLayer: string
  file: string
  diffSnippet: string
  outcome: 'rejected' | 'approved'
  timestamp: string
}

export interface ExecutionState {
  taskId: string
  status: 'structuring' | 'planning' | 'coding' | 'validating' | 'deciding' | 'applying' | 'completed' | 'paused' | 'failed'
  currentIteration: number
  maxIterations: number
  iterationHistory: IterationRecord[]
  startedAt: string
  totalTokens: number
  /** Proof Pack gerado ao final da tarefa (completed | paused | failed) */
  proofPack?: ProofPack
}

export interface IterationRecord {
  iteration: number
  agentMode: string
  agentThought: string
  changes: FileChange[]
  harnessResult: HarnessResult
  decision: DecisionResult
  duration: number
  tokensUsed: number
  /** Arquivos que estavam no contexto desta iteração (sem conteúdo) */
  contextFiles?: Array<{ path: string }>
}

export interface FileChange {
  path: string
  type: 'create' | 'modify' | 'delete'
  diff: string
  before?: string
}

export interface ExecutionContract {
  id: string
  taskId: string
  objective: string
  stackAdapter: string
  allowedPaths: string[]
  forbiddenPaths: string[]
  safeZones: string[]
  allowedCommands: string[]
  forbiddenCommands: string[]
  validationCriteria: string[]
  requiresTests: boolean
  maxFilesChanged: number
  createdAt: string
}

export interface ContractViolation {
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  file: string
  rule: string
}

export interface AgentResultMessage {
  kind: 'agent_result'
  title: string
  summary: string
  filesChanged: Array<{
    path: string
    displayName: string
    status: 'created' | 'modified' | 'deleted'
    additions?: number
    deletions?: number
  }>
  validations: Array<{
    command: string
    status: 'passed' | 'failed' | 'skipped'
    exitCode?: number
    durationMs?: number
  }>
  risk: 'low' | 'medium' | 'high'
  decision: 'apply' | 'suggest' | 'needs_review' | 'reject'
  notes: string[]
  logsRef?: string
  proofPackRef?: string
}

export interface PlanResultMessage {
  kind: 'plan_result'
  objective: string
  files: Array<{ path: string; reason: string }>
  approach: string
  validations: string[]
  risk: 'low' | 'medium' | 'high'
}

export type StructuredAgentMessage = AgentResultMessage | PlanResultMessage

export interface ReviewFinding {
  category: 'scope' | 'stack' | 'dependency' | 'security' | 'tests' | 'generated' | 'quality'
  severity: 'low' | 'medium' | 'high' | 'critical'
  blocking: boolean
  message: string
  file?: string
  suggestion?: string
}

export interface ReviewGateResult {
  passed: boolean
  findings: ReviewFinding[]
}

export interface ExecutionEvent {
  type:
    | 'contract_created'
    | 'state_changed'
    | 'agent_started'
    | 'agent_completed'
    | 'validation_started'
    | 'validation_completed'
    | 'decision_made'
    | 'apply_started'
    | 'apply_completed'
    | 'iteration_recorded'
    | 'proof_pack'   // ProofPack emitido ao final da tarefa
    | 'token'        // streaming text token from LLM
    | 'stream_end'   // LLM finished responding (no files written)
    | 'context_loaded' // project/context files were attached to the model input
    | 'context_ref_denied' // a referenced file was intentionally not attached
    | 'file_mutation' // a file was created/modified/deleted by a tool before harness completes
    | 'token_usage'  // token usage reported or estimated for the last model turn
    | 'tool_call'    // agent called a tool
    | 'tool_result'  // result of a tool call
  taskId: string
  timestamp: string
  iteration?: number
  state?: ExecutionState['status']
  mode?: AgentMode
  message?: string
  contract?: ExecutionContract
  harnessResult?: HarnessResult
  decision?: DecisionResult
  changes?: FileChange[]
  proofPack?: ProofPack
  structuredMessage?: StructuredAgentMessage
  // streaming
  token?: string
  context?: {
    files: string[]
    tokensUsed: number
    maxTokens?: number
    learningsCount?: number
    reused?: boolean
  }
  tokensUsed?: number
  // tool events
  toolName?: string
  toolInput?: Record<string, unknown>
  toolOutput?: string
}

export interface StackAdapter {
  name: string
  detect(projectRoot: string): boolean
  commands: {
    build: string
    test: string
    lint: string
    format?: string
  }
  parseImports(filePath: string, content: string): string[]
  treeSitterLanguage(): string
  semgrepRuleset(): string
  namingConvention: {
    functions: 'camelCase' | 'snake_case' | 'PascalCase'
    files: 'kebab-case' | 'snake_case' | 'PascalCase'
    classes: 'PascalCase'
  }
}

export type ProjectSignalKind =
  | 'manifest'
  | 'lockfile'
  | 'source_file'
  | 'config'
  | 'doc'
  | 'task_runner'

export interface ProjectSignal {
  kind: ProjectSignalKind
  path: string
  stackHint: string
  confidence: number
}

export interface DetectedItem {
  name: string
  confidence: number
  source: string
}

export interface CommandCandidate {
  command: string
  source: 'manifest' | 'workspace_manifest' | 'makefile' | 'taskfile' | 'readme' | 'agent_instructions' | 'adapter_default'
  confidence: number
  safeToRun: boolean
  scope?: string
}

export interface InstructionFile {
  path: string
  content: string
  priority: number
}

export interface ProjectWorkspace {
  name: string
  path: string
  kind: 'workspace' | 'module'
  languages: DetectedItem[]
  frameworks: DetectedItem[]
  packageManagers: DetectedItem[]
  buildCommands: CommandCandidate[]
  testCommands: CommandCandidate[]
  lintCommands: CommandCandidate[]
  typecheckCommands: CommandCandidate[]
  confidence: number
}

export interface ProjectValidation {
  kind: 'build' | 'test' | 'lint' | 'typecheck' | 'security' | 'architecture'
  command?: string
  source: CommandCandidate['source'] | 'ci' | 'config'
  confidence: number
  safeToRun: boolean
  scope: string
  available: boolean
}

export interface ProjectFileReference {
  path: string
  kind: 'ci' | 'container' | 'task_runner' | 'instruction' | 'sensitive'
  confidence: number
}

export interface ProjectRisk {
  kind: 'sensitive_files' | 'no_validation' | 'partial_validation' | 'unsafe_command' | 'large_project' | 'multi_stack'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  evidence: string[]
}

export interface ProjectProfile {
  root: string
  languages: DetectedItem[]
  frameworks: DetectedItem[]
  packageManagers: DetectedItem[]
  workspaces: ProjectWorkspace[]
  buildCommands: CommandCandidate[]
  testCommands: CommandCandidate[]
  lintCommands: CommandCandidate[]
  typecheckCommands: CommandCandidate[]
  validations: ProjectValidation[]
  ci: ProjectFileReference[]
  containers: ProjectFileReference[]
  taskRunners: ProjectFileReference[]
  instructionFiles: ProjectFileReference[]
  sensitiveFiles: ProjectFileReference[]
  risks: ProjectRisk[]
  entrypoints: string[]
  architectureHints: string[]
  signals: ProjectSignal[]
  confidence: number
}

export interface HarnessProjectConfig {
  validation?: {
    build?: string[] | 'auto'
    test?: string[] | 'auto'
    lint?: string[] | 'auto'
    security?: string[] | 'auto'
    architecture?: string[] | 'auto'
  }
  policy?: {
    autoApplyThreshold?: number
    suggestThreshold?: number
    rejectBelow?: number
    requireRealValidationForAutoApply?: boolean
  }
}

export interface KovaConfig {
  project: {
    name: string
    stack: string
  }
  harness: {
    max_iterations: number
    default_mode: HarnessMode
    layers: Record<string, unknown>
  }
  decision: {
    auto_apply_threshold: number
    suggest_threshold: number
    max_repeated_errors: number
  }
  agent: {
    provider: string
    model: string
    temperature: number
    fallback_provider: string
    fallback_model: string
  }
  context: {
    strategy: string
    max_tokens: number
    include_rules: boolean
    include_errors: boolean
    include_learnings: boolean
    max_files: number
  }
  memory: {
    max_project_learnings: number
    max_global_learnings: number
    promotion_threshold: number
    canonical_threshold: number
    contradiction_limit: number
    decay_experimental_days: number
    decay_verified_days: number
  }
  safe_zones: string[]
  observability: {
    trace_retention_days: number
    log_level: string
  }
}

export interface PatchRecord {
  taskId: string
  file: string
  diff: string
  appliedAt: string
  rolledBack: boolean
  rollbackReason?: string
}

export interface Checkpoint {
  id: string
  taskId: string
  iteration: number
  state: ExecutionState
  timestamp: string
}

// Perfil de regras sensível ao contexto do arquivo
// UI/Frontend: limites mais flexíveis; Logic/Core: mais rigoroso
export interface RuleProfile {
  fileType: 'ui' | 'logic' | 'config' | 'test'
  functionSizeLimit: number
  fileSizeLimit: number
  nestingLimit: number
  cyclomaticLimit: number
  enforceNaming: boolean
}

export type AgentMode = 'plan' | 'code' | 'test' | 'fix' | 'review' | 'unified'

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentOutput {
  mode: AgentMode
  thought: string
  changes: FileChange[]
  tokensUsed: number
}

export type ContextRelevance = 'rules' | 'target' | 'error' | 'direct_dep' | 'learning' | 'indirect_dep'
export type ContextSource = 'instruction' | 'explicit' | 'error' | 'dependency' | 'grep' | 'memory' | 'profile' | 'diff'

export interface ContextFile {
  path: string
  content: string
  tokens: number
  relevance: ContextRelevance
  score?: number
  reason?: string
  evidence?: string[]
  source?: ContextSource
}

export interface ContextPackFile {
  path: string
  relevance: ContextRelevance
  source: ContextSource
  score: number
  reason: string
  evidence: string[]
  tokens: number
}

export interface ContextPack {
  request: string
  profile: {
    root: string
    languages: DetectedItem[]
    frameworks: DetectedItem[]
    workspaces: Pick<ProjectWorkspace, 'name' | 'path' | 'kind' | 'confidence'>[]
    risks: ProjectRisk[]
  }
  files: ContextPackFile[]
  validations: ProjectValidation[]
  instructions: string[]
  errors: HarnessError[]
  diff?: string
  memories: Array<Pick<Learning, 'id' | 'description' | 'scope' | 'status' | 'confidence' | 'tags'>>
  omitted: {
    sensitiveFiles: string[]
    overBudgetFiles: string[]
  }
  budget: {
    maxTokens: number
    tokensUsed: number
    fileCount: number
  }
}

export interface AgentContext {
  files: ContextFile[]
  tokensUsed: number
  learnings: Learning[]
  pack?: ContextPack
}

// ─── Proof Pack ──────────────────────────────────────────────────────────────

export interface ProofPackValidation {
  kind: 'build' | 'test' | 'lint' | 'typecheck' | 'security' | 'rules'
  command?: string
  passed: boolean
  skipped: boolean
  /** motivo do skip ou do fail resumido */
  note?: string
}

export interface ProofPack {
  /** Objetivo entendido (do contrato ou task) */
  objective: string
  /** Iterações completas */
  iterations: number
  /** Total de tokens usados */
  totalTokens: number
  /** Arquivos alterados + razão resumida por arquivo */
  changes: Array<{ path: string; type: FileChange['type']; reason: string }>
  /** Arquivos analisados no contexto (sem conteúdo — apenas paths e motivo) */
  analyzedFiles: Array<{ path: string; reason: string }>
  /** Validações executadas e seus resultados */
  validationsRun: ProofPackValidation[]
  /** Validações que NÃO foram executadas e por quê */
  validationsNotRun: Array<{ kind: string; reason: string }>
  /** Risco residual identificado */
  residualRisk: string[]
  /** Decisão final do harness */
  finalDecision: DecisionResult['decision']
  /** Score final */
  finalScore: number
  /** Timestamp de conclusão */
  completedAt: string
}

// ─── Learning Gate ────────────────────────────────────────────────────────────

export type LearningClassification =
  | 'safe_lesson'          // aprendizado validado, pode registrar direto
  | 'needs_review'         // precisa de revisão humana antes de registrar
  | 'temporary_workaround' // solução temporária — não deve virar padrão
  | 'local_exception'      // exceção local ao projeto — não promover globalmente
  | 'rejected_learning'    // não deve ser registrado

export interface LearningCandidate {
  description: string
  type: Learning['type']
  scope: Learning['scope']
  tags: string[]
  /** Evidence da tarefa atual */
  evidence: Evidence[]
  /** Stack detectada no projeto */
  stack?: string
}

export interface LearningGateResult {
  classification: LearningClassification
  /** Razão da classificação */
  reason: string
  /** Se approved, o learning a registrar */
  approved: boolean
  /** Ajustes aplicados ao candidato antes de registrar (ex: scope rebaixado) */
  adjustedCandidate?: LearningCandidate
}
