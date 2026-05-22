import React from 'react'
import type { Todo } from '@kova/shared'
import {
  todoActiveContent,
  todoCompletionPercent,
  todoIsAllCompleted,
  todoStatusLabel,
  todoSummaryLine,
} from '../lib/todo-list-helpers'

interface Props {
  todos: Todo[]
  summaryLabel?: string
}

/**
 * FIX-018: visual readout of the multi-step plan the agent built via todo_write.
 *
 * Visual contract:
 *  - Hidden entirely when the list is empty (no plan yet).
 *  - "N of M complete" summary + a thin progress bar based on completed count.
 *  - Each item renders with a status glyph: ○ pending, ◐ in_progress, ● completed.
 *  - In-progress items use the activeForm (present-continuous) so the user sees
 *    "Refactoring auth" instead of "Refactor auth" while it's running.
 */
export function TodoListCard({ todos, summaryLabel }: Props): React.ReactElement | null {
  if (todos.length === 0) return null

  const percent = todoCompletionPercent(todos)
  const allDone = todoIsAllCompleted(todos)
  const summary = summaryLabel ?? todoSummaryLine(todos)
  const activeTodo = todos.find(todo => todo.status === 'in_progress') ?? todos.find(todo => todo.status === 'pending') ?? todos.at(-1)

  return (
    <div className="kova-plan-card" data-testid="todo-list-card">
      <div className="kova-plan-card-header">
        <div>
          <span>Plan</span>
          {activeTodo && <strong>{todoActiveContent(activeTodo)}</strong>}
        </div>
        <small>{summary}</small>
      </div>

      <div className="kova-plan-progress" aria-label={`progress: ${percent}%`}>
        <div data-complete={allDone ? 'true' : 'false'} style={{ width: `${percent}%` }} />
      </div>

      <ol className="kova-plan-steps">
        {todos.map((todo, i) => (
          <TodoRow key={`${i}-${todo.content}`} todo={todo} />
        ))}
      </ol>
    </div>
  )
}

function TodoRow({ todo }: { todo: Todo }): React.ReactElement {
  const glyph = todoStatusLabel(todo.status)
  const text = todoActiveContent(todo)
  const muted = todo.status === 'completed'
  return (
    <li className="kova-plan-step" data-status={todo.status}>
      <span aria-hidden>
        {glyph}
      </span>
      <p data-muted={muted ? 'true' : 'false'}>
        {text}
      </p>
    </li>
  )
}
