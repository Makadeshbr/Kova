import { IterationRecord, ExecutionState } from '@kova/shared';

interface ExecutionTrace {
    id: string;
    taskId: string;
    timestamp: string;
    status: string;
    totalIterations: number;
    totalDurationMs: number;
    totalTokens: number;
    finalScore: number;
    finalDecision: string;
    errorFingerprint: string;
    iterations: IterationRecord[];
}
interface TraceFilters {
    status?: string;
    finalDecision?: string;
    taskId?: string;
    since?: string;
}
declare function recordTrace(state: ExecutionState, projectRoot: string): ExecutionTrace;
declare function queryTraces(projectRoot: string, filters?: TraceFilters): ExecutionTrace[];

interface KovaMetrics {
    totalRuns: number;
    firstPassRate: number;
    avgIterations: number;
    avgDurationMs: number;
    avgTokens: number;
    topRejectionReasons: Array<{
        reason: string;
        count: number;
    }>;
    lastUpdated: string;
}
declare function getMetrics(projectRoot: string): KovaMetrics;
declare function updateMetrics(trace: ExecutionTrace, projectRoot: string): void;

export { type ExecutionTrace, type KovaMetrics, type TraceFilters, getMetrics, queryTraces, recordTrace, updateMetrics };
