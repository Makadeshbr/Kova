import { LayerResult, FileChange, RuleProfile, HarnessResult } from '@kova/shared';

interface BuildLayerConfig {
    command: string;
    projectRoot: string;
    timeoutMs?: number;
}
declare function runBuildLayer(config: BuildLayerConfig): Promise<LayerResult>;

interface TestsLayerConfig {
    command: string;
    projectRoot: string;
    timeoutMs?: number;
}
declare function runTestsLayer(config: TestsLayerConfig): Promise<LayerResult>;

interface RulesLayerConfig {
    changes: FileChange[];
    projectRoot: string;
    adapter?: string;
    profile?: Partial<RuleProfile>;
}
declare function runRulesLayer(config: RulesLayerConfig, _rulesContent: string): Promise<LayerResult>;

interface SecurityLayerConfig {
    changes: FileChange[];
    projectRoot: string;
}
declare function runSecurityLayer(config: SecurityLayerConfig): Promise<LayerResult>;

interface LintLayerConfig {
    command: string;
    projectRoot: string;
    timeoutMs?: number;
}
declare function runLintLayer(config: LintLayerConfig): Promise<LayerResult>;

interface TypecheckLayerConfig {
    command: string;
    projectRoot: string;
    timeoutMs?: number;
}
declare function runTypecheckLayer(config: TypecheckLayerConfig): Promise<LayerResult>;

interface LayerDef {
    name: 'build' | 'tests' | 'lint' | 'rules' | 'security' | 'typecheck';
    run: () => Promise<LayerResult>;
    hardFail: boolean;
}
interface PipelineConfig {
    projectRoot: string;
    iteration: number;
}
declare function runPipeline(layers: LayerDef[], config: PipelineConfig): Promise<HarnessResult>;

export { type BuildLayerConfig, type LayerDef, type LintLayerConfig, type PipelineConfig, type RulesLayerConfig, type SecurityLayerConfig, type TestsLayerConfig, type TypecheckLayerConfig, runBuildLayer, runLintLayer, runPipeline, runRulesLayer, runSecurityLayer, runTestsLayer, runTypecheckLayer };
