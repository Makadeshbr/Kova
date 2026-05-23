import type { ExecutionEvent, ExecutionState } from '../types'
import type { ChatMode } from '../app-state'
import type { Todo } from '@kova/shared'

const WRITE_TOOL_NAMES = new Set([
  'write_file',
  'edit_file',
  'delete_file',
  'todo_write',
  'run_command',
  'run_interactive_command',
])

const AGENTIC_EVENT_TYPES = new Set<ExecutionEvent['type']>([
  'agent_started',
  'agent_completed',
  'validation_started',
  'validation_completed',
  'decision_made',
  'apply_started',
  'apply_completed',
  'iteration_recorded',
  'file_mutation',
  'harness_layer_start',
  'harness_line',
  'command_output',
  'provider_retry',
  'diff_review_ready',
  'todos_updated',
  'server_starting',
  'server_ready',
  'server_failed',
])

export interface RunOverlayVisibilityInput {
  executionState: ExecutionState | null
  events: ExecutionEvent[]
  todos: Todo[]
  reviewChangeCount: number
  isThinking: boolean
  activeMode: ChatMode
}

export function shouldRenderRunOverlay(input: RunOverlayVisibilityInput): boolean {
  const changes = input.executionState?.iterationHistory.flatMap(iteration => iteration.changes) ?? []
  if (input.executionState?.status === 'completed' && changes.length > 0) return false

  if (input.reviewChangeCount > 0) return true
  if (input.todos.length > 0) return true
  if (input.activeMode === 'plan' || input.activeMode === 'review') {
    return input.isThinking || input.events.some(isAgenticOverlayEvent)
  }

  if (changes.length > 0) return true

  return input.events.some(isAgenticOverlayEvent)
}

function isAgenticOverlayEvent(event: ExecutionEvent): boolean {
  if (event.type === 'tool_call') return WRITE_TOOL_NAMES.has(event.toolName ?? '')
  if (event.type === 'tool_result') return WRITE_TOOL_NAMES.has(event.toolName ?? '')
  return AGENTIC_EVENT_TYPES.has(event.type)
}
