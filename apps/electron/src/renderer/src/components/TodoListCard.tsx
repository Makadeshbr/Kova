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
export function TodoListCard({ todos }: Props): React.ReactElement | null {
  if (todos.length === 0) return null

  const percent = todoCompletionPercent(todos)
  const allDone = todoIsAllCompleted(todos)
  const summary = todoSummaryLine(todos)

  return (
    <div
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 12,
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-1)',
      }}
      data-testid="todo-list-card"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>Plan</span>
        <span style={{ color: allDone ? 'var(--cyan)' : 'var(--text-2)', fontSize: 12 }}>
          {summary}
        </span>
      </div>

      <div
        style={{
          height: 3,
          width: '100%',
          background: 'var(--bg-3)',
          borderRadius: 2,
          overflow: 'hidden',
          marginBottom: 10,
        }}
        aria-label={`progress: ${percent}%`}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: allDone ? 'var(--cyan)' : 'var(--teal)',
            transition: 'width 200ms ease-out',
          }}
        />
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {todos.map((todo, i) => (
          <TodoRow key={`${i}-${todo.content}`} todo={todo} />
        ))}
      </ul>
    </div>
  )
}

function TodoRow({ todo }: { todo: Todo }): React.ReactElement {
  const glyph = todoStatusLabel(todo.status)
  const text = todoActiveContent(todo)
  const muted = todo.status === 'completed'
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '4px 0',
        lineHeight: 1.5,
      }}
    >
      <span
        aria-hidden
        style={{
          color: todo.status === 'completed'
            ? 'var(--cyan)'
            : todo.status === 'in_progress'
              ? 'var(--amber)'
              : 'var(--text-3)',
          fontSize: 14,
          minWidth: 14,
          textAlign: 'center',
        }}
      >
        {glyph}
      </span>
      <span
        style={{
          color: muted ? 'var(--text-3)' : 'var(--text-1)',
          textDecoration: muted ? 'line-through' : 'none',
          fontStyle: todo.status === 'in_progress' ? 'italic' : 'normal',
        }}
      >
        {text}
      </span>
    </li>
  )
}
