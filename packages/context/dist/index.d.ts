import { HarnessError, StackAdapter, TaskDefinition, AgentContext, ContextFile, ContextRelevance } from '@kova/shared';
import { MemorySystem } from '@kova/memory';

interface BuildContextOptions {
    harnessErrors?: HarnessError[];
    maxTokens?: number;
    diff?: string;
}
declare class ContextEngine {
    private readonly memory;
    private readonly adapter;
    constructor(memory: MemorySystem, adapter: StackAdapter);
    buildContext(task: TaskDefinition, projectRoot: string, options?: BuildContextOptions): Promise<AgentContext>;
}

interface DependencyGraphBuildOptions {
    includeExternal?: boolean;
}
declare class DependencyGraph {
    private readonly deps;
    private readonly rdeps;
    build(projectRoot: string, adapter: StackAdapter, options?: DependencyGraphBuildOptions): Promise<void>;
    directDependencies(file: string): string[];
    dependents(file: string): string[];
    fullGraph(): Map<string, string[]>;
}

interface GrepMatch {
    file: string;
    score: number;
}
declare function grepForTask(task: string, projectRoot: string): Promise<GrepMatch[]>;
declare function extractKeywords(text: string): string[];

type ContextSource = 'instruction' | 'explicit' | 'error' | 'dependency' | 'grep' | 'memory' | 'profile' | 'diff';
interface PrioritizedFile {
    path: string;
    content: string;
    relevance: ContextRelevance;
    score?: number;
    reason?: string;
    evidence?: string[];
    source?: ContextSource;
}
type ContextFileWithEvidence = ContextFile & {
    score?: number;
    reason?: string;
    evidence?: string[];
    source?: ContextSource;
};
interface BudgetResult {
    files: ContextFileWithEvidence[];
    tokensUsed: number;
}
declare function allocateBudget(files: PrioritizedFile[], maxTokens: number): BudgetResult;
declare function estimateTokens(content: string): number;

export { type BudgetResult, type BuildContextOptions, ContextEngine, DependencyGraph, type GrepMatch, type PrioritizedFile, allocateBudget, estimateTokens, extractKeywords, grepForTask };
