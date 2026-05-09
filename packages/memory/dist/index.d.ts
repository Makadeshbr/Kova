import { Learning, LearningCandidate, HarnessResult, LearningGateResult } from '@kova/shared';

type NewLearning = Omit<Learning, 'id' | 'createdAt' | 'lastSeen'>;
type ListFilters = Partial<Pick<Learning, 'status' | 'type' | 'scope'>>;
declare class MemorySystem {
    private readonly projectRoot;
    constructor(projectRoot: string);
    record(input: NewLearning): Learning;
    query(task: string, maxResults?: number): Learning[];
    promote(): void;
    prune(): void;
    list(filters?: ListFilters): Learning[];
    inspect(id: string): Learning | null;
    remove(id: string): void;
    private readAll;
    private save;
}

declare function promoteLearnings(learnings: Learning[]): Learning[];

declare function pruneLearnings(learnings: Learning[], max?: number): Learning[];

type Scope = 'project' | 'global';
declare function readLearnings(scope: Scope, projectRoot?: string): Learning[];
declare function writeLearnings(scope: Scope, data: Learning[], projectRoot?: string): void;

declare function classifyLearning(candidate: LearningCandidate, harnessResult: HarnessResult): LearningGateResult;

export { MemorySystem, classifyLearning, promoteLearnings, pruneLearnings, readLearnings, writeLearnings };
