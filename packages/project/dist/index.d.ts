import { ProjectProfile, HarnessProjectConfig, InstructionFile } from '@kova/shared';

declare function findProjectRoot(startDir: string): string;
declare function buildProjectProfile(projectRoot: string): ProjectProfile;
declare function loadProjectInstructions(projectRoot: string): InstructionFile[];
declare function loadHarnessProjectConfig(projectRoot: string): HarnessProjectConfig | null;

export { buildProjectProfile, findProjectRoot, loadHarnessProjectConfig, loadProjectInstructions };
