import { HarnessResult, AgentFeedback, FileChange, ExecutionContract, IterationRecord, DecisionResult, ReviewGateResult } from '@kova/shared';

declare function calculateScore(result: HarnessResult): number;
declare function getHardFailReason(result: HarnessResult): string;

declare function buildFeedback(result: HarnessResult): AgentFeedback[];

interface DecisionContext {
    changes?: FileChange[];
    contract?: ExecutionContract;
}
declare function decide(result: HarnessResult, history: IterationRecord[], context?: DecisionContext): DecisionResult;

interface ReviewGateInput {
    changes: FileChange[];
    contract?: ExecutionContract;
    harnessResult: HarnessResult;
}
declare function runReviewGate(input: ReviewGateInput): ReviewGateResult;

export { type DecisionContext, type ReviewGateInput, buildFeedback, calculateScore, decide, getHardFailReason, runReviewGate };
