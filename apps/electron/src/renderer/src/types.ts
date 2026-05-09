import type {
  ExecutionContract, ExecutionEvent, ExecutionState, TaskDefinition,
  HarnessResult, DecisionResult, FileChange, LayerResult, HarnessError,
  AgentMessage, ReviewGateResult, ReviewFinding,
} from '@kova/shared'
import type { KovaSettings } from '../../main/ipc-handlers'
import type { StartTaskParams } from '../../main/engine-manager'

export type {
  ExecutionContract, ExecutionEvent, ExecutionState, TaskDefinition,
  HarnessResult, DecisionResult, FileChange, LayerResult, HarnessError,
  AgentMessage, ReviewGateResult, ReviewFinding, KovaSettings, StartTaskParams,
}

export type LayerName = 'build' | 'lint' | 'tests' | 'security' | 'rules'

export type LayerStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'

export interface UILayerState {
  name: LayerName
  status: LayerStatus
  errors: number
  warnings: number
  duration: number
}

export interface AppState {
  projectRoot: string | null
  task: TaskDefinition | null
  executionState: ExecutionState | null
  settings: KovaSettings | null
  error: string | null
  activeView: 'execution' | 'settings'
}
