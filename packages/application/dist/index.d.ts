import { PatchRecord, FileChange } from '@kova/shared';

interface SafeZoneConfig {
    patterns: string[];
    allowOverride: boolean;
}
declare function isSafeZone(filePath: string, config?: Partial<SafeZoneConfig>): boolean;

interface ApplyResult {
    applied: boolean;
    patches: PatchRecord[];
    checkpointId: string;
    reason?: string;
}
declare class CodeApplicationEngine {
    private readonly projectRoot;
    private readonly safeZoneConfig?;
    constructor(projectRoot: string, safeZoneConfig?: Partial<SafeZoneConfig> | undefined);
    preview(changes: FileChange[]): string;
    apply(changes: FileChange[], taskId: string, harnessScore?: number): Promise<ApplyResult>;
    rollback(checkpointId: string): Promise<void>;
}

interface CheckpointMeta {
    id: string;
    taskId: string;
    timestamp: string;
    harnessScore: number;
    files: string[];
}
interface CreateCheckpointParams {
    taskId: string;
    files: string[];
    projectRoot: string;
    harnessScore?: number;
}
declare function createCheckpoint(params: CreateCheckpointParams): CheckpointMeta;
declare function restoreCheckpoint(id: string, projectRoot: string): void;
declare function listCheckpoints(projectRoot: string): CheckpointMeta[];
declare function deleteCheckpoint(id: string, projectRoot: string): void;

export { type ApplyResult, type CheckpointMeta, CodeApplicationEngine, type SafeZoneConfig, createCheckpoint, deleteCheckpoint, isSafeZone, listCheckpoints, restoreCheckpoint };
