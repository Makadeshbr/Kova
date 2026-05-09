import { FileChange, HarnessMode, HarnessResult, RuleProfile } from '@kova/shared';

interface OrchestratorConfig {
    projectRoot: string;
    adapter: string;
    buildCommand: string;
    testCommand: string;
    lintCommand: string;
    typecheckCommand: string;
    iteration: number;
    profileConfidence?: number;
}
interface OrchestratorResult {
    harnessResult: HarnessResult;
    scratchpadFallback: boolean;
    mode: HarnessMode;
}
declare class HarnessOrchestrator {
    private scoreHistory;
    run(changes: FileChange[], config: OrchestratorConfig, explicitMode?: HarnessMode): Promise<OrchestratorResult>;
    reset(): void;
    private determineMode;
    private isScratchpadNeeded;
    private buildLayers;
}
declare function createOrchestratorConfig(projectRoot: string, iteration?: number, generatedPaths?: string[]): OrchestratorConfig;

declare function detectContext(filePath: string): RuleProfile;

export { HarnessOrchestrator, type OrchestratorConfig, type OrchestratorResult, createOrchestratorConfig, detectContext };
