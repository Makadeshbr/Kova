import type { ExecutionState, IterationRecord, TaskDefinition } from '@kova/shared'

export function createInitialState(task: TaskDefinition, maxIterations = 5): ExecutionState {
  return {
    taskId: task.id,
    status: 'structuring',
    currentIteration: 0,
    maxIterations,
    iterationHistory: [],
    startedAt: new Date().toISOString(),
    totalTokens: 0,
  }
}

export function withStatus(
  state: ExecutionState,
  status: ExecutionState['status'],
): ExecutionState {
  return { ...state, status }
}

export function withIteration(state: ExecutionState, record: IterationRecord): ExecutionState {
  return {
    ...state,
    currentIteration: state.currentIteration + 1,
    iterationHistory: [...state.iterationHistory, record],
    totalTokens: state.totalTokens + record.tokensUsed,
  }
}
