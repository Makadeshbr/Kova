import { TaskDefinition, FileChange } from '@kova/shared';

interface EvalCase {
    id: string;
    description: string;
    category: 'stack' | 'scope' | 'safe-zone' | 'security' | 'score' | 'review-gate';
    task: TaskDefinition;
    changes: FileChange[];
    mustPass: boolean;
    expectedRules: string[];
}
interface EvalResult {
    id: string;
    category: EvalCase['category'];
    passed: boolean;
    score: number;
    failedRules: string[];
    notes: string[];
}
declare function runStaticEval(testCase: EvalCase): EvalResult;
declare const BASE_EVALS: EvalCase[];

export { BASE_EVALS, type EvalCase, type EvalResult, runStaticEval };
