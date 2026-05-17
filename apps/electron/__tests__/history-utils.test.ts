/**
 * Tests for buildTokenBudgetedHistory — the history budgeting function that
 * controls how many past messages are sent to the LLM on each turn.
 *
 * Invariants:
 *   - At least one message is always returned when input is non-empty
 *   - Newest messages are preferred over oldest
 *   - charBudget: total chars of selected messages never exceed budget (except first)
 *   - maxMessages: count of selected messages never exceeds the cap
 *   - taskOnly: filters to task messages + user messages (review/plan mode)
 *   - Non-conversational roles (system, tool) are always excluded
 */
import { describe, it, expect } from 'vitest'
import {
  buildTokenBudgetedHistory,
  HISTORY_CHAR_BUDGET,
  HISTORY_MAX_MESSAGES,
  structuredMessageToHistoryText,
} from '../src/main/history-utils'
import type { AgentResultMessage, PlanResultMessage } from '@kova/shared'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function msg(role: 'user' | 'assistant', content: string, isTask = false) {
  return { role, content, isTask }
}

function user(content: string, isTask = true) { return msg('user', content, isTask) }
function assistant(content: string) { return msg('assistant', content, false) }

/**
 * Creates `count` user messages of exactly `charEach` characters each.
 * Format: "mNNN" + padding — always results in `charEach` chars total.
 * The 4-char prefix "mNNN" supports charEach ≥ 4.
 */
function manyMessages(count: number, charEach = 50): ReturnType<typeof user>[] {
  return Array.from({ length: count }, (_, i) =>
    user(`m${i.toString().padStart(3, '0')}${'x'.repeat(Math.max(0, charEach - 4))}`),
  )
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

describe('buildTokenBudgetedHistory — defaults', () => {
  it('exported constants have expected default values', () => {
    expect(HISTORY_CHAR_BUDGET).toBe(20_000)
    expect(HISTORY_MAX_MESSAGES).toBe(40)
  })

  it('empty input returns empty array', () => {
    expect(buildTokenBudgetedHistory([])).toEqual([])
  })

  it('single message below budget is returned', () => {
    const result = buildTokenBudgetedHistory([user('hello')])
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('hello')
    expect(result[0].role).toBe('user')
  })

  it('returns user and assistant messages as HistoryOutputMessage', () => {
    const result = buildTokenBudgetedHistory([user('ask'), assistant('reply')])
    expect(result[0].role).toBe('user')
    expect(result[1].role).toBe('assistant')
  })
})

// ─── Character budget ─────────────────────────────────────────────────────────

describe('buildTokenBudgetedHistory — character budget', () => {
  it('excludes oldest messages when total exceeds charBudget', () => {
    // 5 messages × 100 chars = 500 chars; budget = 250
    const messages = [
      user('a'.repeat(100)),
      user('b'.repeat(100)),
      user('c'.repeat(100)),
      user('d'.repeat(100)),
      user('e'.repeat(100)),
    ]
    const result = buildTokenBudgetedHistory(messages, { charBudget: 250 })

    // Newest 2-3 messages should fit: 250 / 100 = 2.5 → 2 messages
    expect(result.length).toBeLessThanOrEqual(3)
    // Most recent message ('e') must always be included
    expect(result.at(-1)?.content).toBe('e'.repeat(100))
  })

  it('newest messages are always preferred over oldest', () => {
    const messages = [
      user('old-1'),
      user('old-2'),
      user('recent-1'),
      user('recent-2'),
    ]
    const result = buildTokenBudgetedHistory(messages, { charBudget: 20 })

    expect(result.at(-1)?.content).toBe('recent-2')
    const contents = result.map(m => m.content)
    expect(contents).not.toContain('old-1')
    expect(contents).not.toContain('old-2')
  })

  it('first message always included even when it alone exceeds charBudget', () => {
    const giant = user('x'.repeat(50_000))
    const result = buildTokenBudgetedHistory([giant], { charBudget: 100 })

    expect(result).toHaveLength(1)
    expect(result[0].content).toHaveLength(50_000)
  })

  it('subsequent messages after the first are excluded when budget is negative', () => {
    const big = user('x'.repeat(1_000))
    const small = user('tiny')
    // big alone already exceeds budget of 500; tiny comes before big → excluded
    const result = buildTokenBudgetedHistory([small, big], { charBudget: 500 })

    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('x'.repeat(1_000))
  })

  it('total chars of all selected messages does not exceed budget (except first-message bypass)', () => {
    const messages = Array.from({ length: 20 }, (_, i) => user(`${'a'.repeat(200)}-${i}`))
    const result = buildTokenBudgetedHistory(messages, { charBudget: 1_000 })

    const totalChars = result.reduce((sum, m) => sum + m.content.length, 0)
    // First message may push slightly over, but all others must fit within budget
    if (result.length > 1) {
      const withoutFirst = result.slice(1).reduce((sum, m) => sum + m.content.length, 0)
      expect(withoutFirst).toBeLessThanOrEqual(1_000)
    }
  })

  it('custom charBudget is respected', () => {
    const messages = [user('a'.repeat(50)), user('b'.repeat(50)), user('c'.repeat(50))]
    const result = buildTokenBudgetedHistory(messages, { charBudget: 80 })
    const totalChars = result.reduce((sum, m) => sum + m.content.length, 0)

    // 80 / 50 = 1.6 → at most 1 message (the most recent 'c')
    expect(result.at(-1)?.content).toBe('c'.repeat(50))
    // charBudget allows at most 1 full 50-char message before second would overflow
    expect(totalChars).toBeLessThanOrEqual(100)  // first-message bypass may allow slight overage
  })
})

// ─── Message count limit ──────────────────────────────────────────────────────

describe('buildTokenBudgetedHistory — message count (maxMessages)', () => {
  it('returns at most maxMessages messages regardless of budget', () => {
    const messages = manyMessages(60, 10)  // 60 messages × 10 chars = 600 chars (under 20k budget)
    const result = buildTokenBudgetedHistory(messages, { maxMessages: 10 })

    expect(result).toHaveLength(10)
  })

  it('default HISTORY_MAX_MESSAGES (40) caps a 60-message session', () => {
    const messages = manyMessages(60, 10)  // 60 messages × 10 chars = 600 chars, well under 20k
    const result = buildTokenBudgetedHistory(messages)

    expect(result).toHaveLength(40)
  })

  it('most recent maxMessages messages are kept (not oldest)', () => {
    // manyMessages(50, 10): "mNNNxxxxxx" (10 chars each)
    const messages = manyMessages(50, 10)
    const result = buildTokenBudgetedHistory(messages, { maxMessages: 5 })

    // Should be the last 5 messages: indices 45-49
    expect(result[0].content).toContain('m045')
    expect(result[4].content).toContain('m049')
  })

  it('session with 50 messages and short content: only last 40 returned', () => {
    // Key regression guard: many short messages bypass char budget but not count limit
    const messages = Array.from({ length: 50 }, (_, i) => user(`turn-${i}`))
    const result = buildTokenBudgetedHistory(messages)

    expect(result).toHaveLength(40)
    expect(result[0].content).toBe('turn-10')
    expect(result[39].content).toBe('turn-49')
  })

  it('custom maxMessages=1 returns only the most recent message', () => {
    const messages = [user('first'), user('second'), user('third')]
    const result = buildTokenBudgetedHistory(messages, { maxMessages: 1 })

    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('third')
  })
})

// ─── Role filtering ───────────────────────────────────────────────────────────

describe('buildTokenBudgetedHistory — role filtering', () => {
  it('excludes system messages', () => {
    const messages = [
      { role: 'system', content: 'system prompt', isTask: false },
      user('user question'),
    ]
    const result = buildTokenBudgetedHistory(messages)

    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('user')
    expect(result.some(m => m.role === 'system')).toBe(false)
  })

  it('excludes tool messages', () => {
    const messages = [
      user('write a file'),
      { role: 'tool', content: 'OK: wrote main.ts', isTask: false },
      assistant('File written.'),
    ]
    const result = buildTokenBudgetedHistory(messages)

    expect(result.some(m => m.role === 'tool' as string)).toBe(false)
    expect(result).toHaveLength(2)
  })

  it('includes both user and assistant messages by default', () => {
    const messages = [user('question'), assistant('answer'), user('follow-up')]
    const result = buildTokenBudgetedHistory(messages)

    expect(result).toHaveLength(3)
    expect(result.map(m => m.role)).toEqual(['user', 'assistant', 'user'])
  })
})

// ─── taskOnly mode (review / plan) ───────────────────────────────────────────

describe('buildTokenBudgetedHistory — taskOnly mode', () => {
  it('taskOnly=true excludes non-task assistant messages', () => {
    const messages = [
      user('good morning', false),            // user, isTask=false
      assistant('Hello! How can I help?'),     // chitchat, isTask=false
      user('add a login button', true),        // task message
      assistant('I will add it.'),             // response to task, isTask=false
    ]
    const result = buildTokenBudgetedHistory(messages, { taskOnly: true })

    // user messages are always included regardless of isTask
    // assistant messages are only included if isTask=true (none here)
    expect(result.some(m => m.content === 'Hello! How can I help?')).toBe(false)
    expect(result.some(m => m.content === 'I will add it.')).toBe(false)
    expect(result.some(m => m.content === 'add a login button')).toBe(true)
    expect(result.some(m => m.content === 'good morning')).toBe(true)
  })

  it('taskOnly=false includes all conversational messages', () => {
    const messages = [
      user('hello', false),
      assistant('hi'),
      user('task', true),
      assistant('done'),
    ]
    const result = buildTokenBudgetedHistory(messages, { taskOnly: false })

    expect(result).toHaveLength(4)
  })

  it('default taskOnly=false includes all messages', () => {
    const messages = [user('hi', false), assistant('hello')]
    const result = buildTokenBudgetedHistory(messages)

    expect(result).toHaveLength(2)
  })

  it('taskOnly=true: all user messages are included regardless of isTask flag', () => {
    const messages = [
      user('chitchat 1', false),
      user('chitchat 2', false),
      user('actual task', true),
    ]
    const result = buildTokenBudgetedHistory(messages, { taskOnly: true })

    // All user messages pass through (role='user' is always included)
    expect(result).toHaveLength(3)
  })

  it('taskOnly=true with budget still respects charBudget', () => {
    const messages = [
      user('old task 1', true),
      user('old task 2', true),
      user('recent task', true),
    ]
    const result = buildTokenBudgetedHistory(messages, { taskOnly: true, charBudget: 15 })

    // 'recent task' is 11 chars, fits; 'old task 2' is 10 chars, might fit
    expect(result.at(-1)?.content).toBe('recent task')
  })
})

// ─── Combined guards ──────────────────────────────────────────────────────────

describe('buildTokenBudgetedHistory — charBudget + maxMessages together', () => {
  it('whichever guard triggers first wins', () => {
    // 20 messages × 10 chars = 200 chars; budget=150 allows 15 messages; maxMessages=5
    const messages = manyMessages(20, 10)
    const result = buildTokenBudgetedHistory(messages, { charBudget: 150, maxMessages: 5 })

    expect(result).toHaveLength(5)  // maxMessages wins (5 < 15)
  })

  it('budget triggers before maxMessages when messages are large', () => {
    // 20 messages × 200 chars = 4000 chars; budget=500 allows 2-3 messages; maxMessages=15
    const messages = manyMessages(20, 200)
    const result = buildTokenBudgetedHistory(messages, { charBudget: 500, maxMessages: 15 })

    expect(result.length).toBeLessThan(15)  // budget triggers before maxMessages
  })
})

// ─── Output shape ─────────────────────────────────────────────────────────────

describe('buildTokenBudgetedHistory — output shape', () => {
  it('output only contains role and content fields', () => {
    const result = buildTokenBudgetedHistory([user('hello', true)])

    expect(Object.keys(result[0]).sort()).toEqual(['content', 'role'])
  })

  it('isTask flag is NOT present in output (internal implementation detail)', () => {
    const result = buildTokenBudgetedHistory([user('task', true)])

    expect('isTask' in result[0]).toBe(false)
  })

  it('preserves message order (oldest first) in output', () => {
    const messages = [user('first'), assistant('second'), user('third')]
    const result = buildTokenBudgetedHistory(messages)

    expect(result[0].content).toBe('first')
    expect(result[1].content).toBe('second')
    expect(result[2].content).toBe('third')
  })
})

describe('buildTokenBudgetedHistory — structured assistant cards', () => {
  it('serializes agent result cards so patch follow-ups remember changed files', () => {
    const structured: AgentResultMessage = {
      kind: 'agent_result',
      title: 'Task complete',
      summary: 'Changes applied successfully.',
      filesChanged: [{ path: 'src/calc.ts', displayName: 'calc.ts', status: 'created' }],
      validations: [{ command: 'npm test', status: 'passed' }],
      risk: 'low',
      decision: 'apply',
      notes: ['Created calculator helpers.'],
    }

    const result = buildTokenBudgetedHistory([
      user('create calculator'),
      { role: 'assistant', content: '', isTask: true, structured },
      user('now add multiply'),
    ])

    expect(result.map(m => m.content).join('\n')).toContain('src/calc.ts (created)')
    expect(result.map(m => m.content).join('\n')).toContain('Created calculator helpers.')
  })

  it('prefers structured summary over raw content when both are present', () => {
    const structured: AgentResultMessage = {
      kind: 'agent_result',
      title: 'Task complete',
      summary: 'Changes applied successfully.',
      filesChanged: [{ path: 'src/main.ts', displayName: 'main.ts', status: 'created' }],
      validations: [],
      risk: 'low',
      decision: 'apply',
      notes: [],
    }

    const result = buildTokenBudgetedHistory([
      user('create app'),
      { role: 'assistant', content: '```ts\nconsole.log("raw leaked code")\n```', isTask: true, structured },
      user('Perfeito'),
    ])

    const history = result.map(m => m.content).join('\n')
    expect(history).toContain('Files changed: src/main.ts (created)')
    expect(history).not.toContain('raw leaked code')
  })

  it('serializes plan cards into compact history text', () => {
    const structured: PlanResultMessage = {
      kind: 'plan_result',
      objective: 'add login',
      files: [{ path: 'src/login.ts', reason: 'new flow' }],
      approach: 'Create the login flow.',
      validations: ['npm test'],
      risk: 'medium',
    }

    expect(structuredMessageToHistoryText(structured)).toContain('src/login.ts (new flow)')
  })
})
