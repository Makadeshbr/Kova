import { FileChange, AgentMessage, TaskDefinition, AgentContext, AgentMode, AgentOutput } from '@kova/shared';

type PermissionAction = 'allow' | 'ask' | 'deny';
type PermissionKey = 'read' | 'edit' | 'list' | 'bash';
interface PermissionRule {
    pattern: string;
    action: PermissionAction;
}
type PermissionPolicy = Partial<Record<PermissionKey, PermissionAction | PermissionRule[]>>;
declare const DEFAULT_PERMISSION_POLICY: PermissionPolicy;
declare const READ_ONLY_PERMISSION_POLICY: PermissionPolicy;
interface KovaTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}
declare const AGENT_TOOLS: KovaTool[];
declare const READ_ONLY_TOOLS: KovaTool[];
declare class ToolExecutor {
    private readonly projectRoot;
    private readonly signal?;
    private readonly permissionPolicy;
    private readonly written;
    private readonly originals;
    constructor(projectRoot: string, signal?: AbortSignal | undefined, permissionPolicy?: PermissionPolicy);
    execute(name: string, input: Record<string, unknown>): Promise<string>;
    getChanges(): FileChange[];
    private writeFile;
    private readFile;
    private deleteFile;
    private listFiles;
    private runCommand;
    private sanitizePath;
    private requirePermission;
}

interface LLMResponse {
    thought: string;
    changes: FileChange[];
    tokensUsed: number;
}
interface GenerateOptions {
    system?: string;
    maxTokens?: number;
    model?: string;
}
interface LLMProvider {
    generate(messages: AgentMessage[], options?: GenerateOptions): Promise<LLMResponse>;
}
interface AgentLoopOptions {
    system: string;
    tools: KovaTool[];
    executor: ToolExecutor;
    maxTurns?: number;
    model?: string;
    maxTokens?: number;
    signal?: AbortSignal;
    onToken?: (token: string) => void;
    onToolCall?: (name: string, input: Record<string, unknown>) => void;
    onToolResult?: (name: string, output: string) => void;
}
interface ProviderCapabilities {
    supportsToolCalls: boolean;
    contextTokenLimit: number;
}
interface AgentProvider extends LLMProvider {
    runAgentLoop(messages: AgentMessage[], options: AgentLoopOptions): Promise<LLMResponse>;
    capabilities(): ProviderCapabilities;
}

declare class Agent {
    private readonly provider;
    private readonly projectRoot;
    constructor(provider: AgentProvider, projectRoot: string);
    execute(task: TaskDefinition, context: AgentContext, mode?: AgentMode, options?: {
        history?: AgentMessage[];
        signal?: AbortSignal;
        onToken?: (token: string) => void;
        onToolCall?: (name: string, input: Record<string, unknown>) => void;
        onToolResult?: (name: string, result: string) => void;
    }): Promise<AgentOutput>;
}

interface AnthropicProviderOptions {
    apiKey?: string;
    model?: string;
}
declare class AnthropicProvider implements AgentProvider {
    private readonly client;
    private readonly defaultModel;
    constructor(options?: AnthropicProviderOptions);
    capabilities(): ProviderCapabilities;
    generate(messages: AgentMessage[], options?: GenerateOptions): Promise<LLMResponse>;
    runAgentLoop(messages: AgentMessage[], options: AgentLoopOptions): Promise<LLMResponse>;
}

interface OpenAICompatibleProviderOptions {
    apiKey?: string;
    baseUrl: string;
    model: string;
}
declare class OpenAICompatibleProvider implements AgentProvider {
    private readonly options;
    constructor(options: OpenAICompatibleProviderOptions);
    capabilities(): ProviderCapabilities;
    generate(messages: AgentMessage[], options?: GenerateOptions): Promise<LLMResponse>;
    runAgentLoop(messages: AgentMessage[], options: AgentLoopOptions): Promise<LLMResponse>;
    private streamingTurn;
    private callApi;
}

declare const MODE_PROMPTS: Record<AgentMode, string>;

export { AGENT_TOOLS, Agent, type AgentLoopOptions, type AgentProvider, AnthropicProvider, type AnthropicProviderOptions, DEFAULT_PERMISSION_POLICY, type GenerateOptions, type KovaTool, type LLMProvider, type LLMResponse, MODE_PROMPTS, OpenAICompatibleProvider, type OpenAICompatibleProviderOptions, type PermissionAction, type PermissionKey, type PermissionPolicy, type PermissionRule, READ_ONLY_PERMISSION_POLICY, READ_ONLY_TOOLS, ToolExecutor };
