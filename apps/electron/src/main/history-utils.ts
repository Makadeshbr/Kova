/**
 * History budgeting for multi-turn conversations.
 *
 * Responsibility: given a list of chat messages, select the most recent N that
 * fit within a character budget, so the context sent to the LLM never exceeds
 * a safe size regardless of session length.
 *
 * Two guards work together:
 *   charBudget  — total character limit (default 20 000 ≈ 5 000 tokens)
 *   maxMessages — message count cap (default 40) — prevents degradation when
 *                 many short messages would otherwise slip past the char limit
 *
 * Neither guard applies to the very first selected message: at least one
 * message is always returned so the model has something to respond to.
 */

import type { StructuredAgentMessage } from '@kova/shared'

export interface HistoryInputMessage {
  role: string
  content: string
  /** True when this message is the direct task/engineering request (not chitchat). */
  isTask?: boolean
  /** Structured assistant card rendered in the chat; serialized for LLM history. */
  structured?: StructuredAgentMessage
}

export interface HistoryOutputMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface BuildHistoryOptions {
  /** Maximum total characters across all selected messages. Default: 20 000. */
  charBudget?: number
  /** Maximum number of messages to include. Default: 40. */
  maxMessages?: number
  /**
   * When true, only include messages where isTask=true or role='user'.
   * Use for review/plan modes where assistant chit-chat pollutes context.
   */
  taskOnly?: boolean
}

export const HISTORY_CHAR_BUDGET = 20_000
export const HISTORY_MAX_MESSAGES = 40

/**
 * Returns the most-recent messages that fit within both guards.
 * Walk order: newest → oldest, so recent messages are always preferred.
 */
export function buildTokenBudgetedHistory(
  messages: HistoryInputMessage[],
  opts: BuildHistoryOptions = {},
): HistoryOutputMessage[] {
  const charBudget = opts.charBudget ?? HISTORY_CHAR_BUDGET
  const maxMessages = opts.maxMessages ?? HISTORY_MAX_MESSAGES
  const taskOnly = opts.taskOnly ?? false

  // Keep only conversational roles, then optionally restrict to task messages.
  // Roles like 'system' or 'tool' carry no useful conversational history.
  const eligible = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .filter(m => !taskOnly || m.isTask === true || m.role === 'user')
    .map(m => ({ ...m, content: historyContentFor(m) }))
    .filter(m => m.content.trim().length > 0)

  let remainingBudget = charBudget
  const selected: HistoryOutputMessage[] = []

  for (let i = eligible.length - 1; i >= 0; i--) {
    if (selected.length >= maxMessages) break

    const m = eligible[i]
    const chars = m.content.length

    // Budget check: always include the very first selected message regardless
    // of size, so the caller always has at least one message to send.
    if (remainingBudget - chars < 0 && selected.length > 0) break

    selected.unshift({ role: m.role as 'user' | 'assistant', content: m.content })
    remainingBudget -= chars
  }

  return selected
}

export function structuredMessageToHistoryText(message: StructuredAgentMessage): string {
  if (message.kind === 'plan_result') {
    return [
      `Plan created: ${message.objective}`,
      message.files.length
        ? `Files: ${message.files.map(file => `${file.path}${file.reason ? ` (${file.reason})` : ''}`).join(', ')}`
        : '',
      message.approach ? `Approach: ${message.approach}` : '',
      message.validations.length ? `Validations: ${message.validations.join(', ')}` : '',
      `Risk: ${message.risk}`,
    ].filter(Boolean).join('\n')
  }

  const changed = message.filesChanged.map(file => `${file.path} (${file.status})`).join(', ')
  const validations = message.validations.map(v => `${v.command}: ${v.status}`).join(', ')
  return [
    `${message.title}: ${message.summary}`,
    changed ? `Files changed: ${changed}` : 'Files changed: none',
    validations ? `Validations: ${validations}` : '',
    message.notes.length ? `Notes: ${message.notes.join(' ')}` : '',
    `Decision: ${message.decision}; risk: ${message.risk}`,
  ].filter(Boolean).join('\n')
}

function historyContentFor(message: HistoryInputMessage): string {
  const content = message.content.trim()
  if (content) return content
  return message.structured ? structuredMessageToHistoryText(message.structured) : ''
}
