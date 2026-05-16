/**
 * FIX-018 — pure helpers for the todo list UI.
 * Render-time logic lives in TodoListCard.tsx; this file owns the math/strings.
 */
import { describe, it, expect } from 'vitest'
import type { Todo } from '@kova/shared'
import {
  todoStatusLabel,
  todoCompletionPercent,
  todoActiveContent,
  todoIsAllCompleted,
  todoSummaryLine,
} from '../src/renderer/src/lib/todo-list-helpers'

const t = (content: string, status: Todo['status'], activeForm = `${content}-active`): Todo =>
  ({ content, activeForm, status })

describe('todoStatusLabel', () => {
  it('returns a short symbolic marker per status', () => {
    expect(todoStatusLabel('pending')).toBe('○')
    expect(todoStatusLabel('in_progress')).toBe('◐')
    expect(todoStatusLabel('completed')).toBe('●')
  })
})

describe('todoCompletionPercent', () => {
  it('returns 0 for an empty list', () => {
    expect(todoCompletionPercent([])).toBe(0)
  })

  it('counts only completed items', () => {
    const todos: Todo[] = [
      t('A', 'completed'),
      t('B', 'completed'),
      t('C', 'in_progress'),
      t('D', 'pending'),
    ]
    expect(todoCompletionPercent(todos)).toBe(50)
  })

  it('returns 100 when everything is completed', () => {
    const todos: Todo[] = [t('A', 'completed'), t('B', 'completed')]
    expect(todoCompletionPercent(todos)).toBe(100)
  })

  it('rounds to nearest integer', () => {
    // 1 of 3 → 33.33 → 33
    const todos: Todo[] = [t('A', 'completed'), t('B', 'pending'), t('C', 'pending')]
    expect(todoCompletionPercent(todos)).toBe(33)
  })
})

describe('todoActiveContent', () => {
  it('uses activeForm when the item is in_progress', () => {
    expect(todoActiveContent(t('Refactor auth', 'in_progress', 'Refactoring auth'))).toBe('Refactoring auth')
  })

  it('uses content for pending / completed items', () => {
    expect(todoActiveContent(t('Refactor auth', 'pending', 'Refactoring auth'))).toBe('Refactor auth')
    expect(todoActiveContent(t('Refactor auth', 'completed', 'Refactoring auth'))).toBe('Refactor auth')
  })
})

describe('todoIsAllCompleted', () => {
  it('returns false for an empty list (no plan yet)', () => {
    expect(todoIsAllCompleted([])).toBe(false)
  })

  it('returns true only when every item is completed', () => {
    expect(todoIsAllCompleted([t('A', 'completed'), t('B', 'completed')])).toBe(true)
    expect(todoIsAllCompleted([t('A', 'completed'), t('B', 'in_progress')])).toBe(false)
    expect(todoIsAllCompleted([t('A', 'pending')])).toBe(false)
  })
})

describe('todoSummaryLine', () => {
  it('formats a "N of M" summary line for the header', () => {
    const todos: Todo[] = [
      t('A', 'completed'),
      t('B', 'completed'),
      t('C', 'in_progress'),
      t('D', 'pending'),
      t('E', 'pending'),
    ]
    expect(todoSummaryLine(todos)).toBe('2 of 5 complete')
  })

  it('handles single-item plans without grammar errors', () => {
    expect(todoSummaryLine([t('A', 'pending')])).toBe('0 of 1 complete')
    expect(todoSummaryLine([t('A', 'completed')])).toBe('1 of 1 complete')
  })

  it('handles empty list', () => {
    expect(todoSummaryLine([])).toBe('No plan')
  })
})
