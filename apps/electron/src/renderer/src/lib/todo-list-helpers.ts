/**
 * FIX-018 — pure helpers for the multi-step todo list UI.
 *
 * Kept out of TodoListCard.tsx so they can be unit-tested without React.
 * No imports beyond the Todo type from @kova/shared.
 */
import type { Todo, TodoStatus } from '@kova/shared'

/** Compact symbolic marker for status badges. ○ / ◐ / ● map to pending / in_progress / completed. */
export function todoStatusLabel(status: TodoStatus): string {
  if (status === 'in_progress') return '◐'
  if (status === 'completed') return '●'
  return '○'
}

/** Rounded percent of completed items, 0 for an empty list. */
export function todoCompletionPercent(todos: Todo[]): number {
  if (todos.length === 0) return 0
  const completed = todos.filter(t => t.status === 'completed').length
  return Math.round((completed / todos.length) * 100)
}

/**
 * Pick the right display string for a todo. activeForm (present-continuous)
 * while in_progress; content (imperative) for pending and completed.
 */
export function todoActiveContent(todo: Todo): string {
  return todo.status === 'in_progress' ? todo.activeForm : todo.content
}

/** True only when at least one item exists and all of them are completed. */
export function todoIsAllCompleted(todos: Todo[]): boolean {
  if (todos.length === 0) return false
  return todos.every(t => t.status === 'completed')
}

/** "2 of 5 complete" header line. "No plan" when the list is empty. */
export function todoSummaryLine(todos: Todo[]): string {
  if (todos.length === 0) return 'No plan'
  const completed = todos.filter(t => t.status === 'completed').length
  return `${completed} of ${todos.length} complete`
}
