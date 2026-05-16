import { describe, it, expect } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import {
  withCachedSystem,
  withCachedTools,
  withHistoryCacheBreakpoint,
  parseCacheUsage,
} from '../src/providers/anthropic-cache'

// ─── withCachedSystem ─────────────────────────────────────────────────────────

describe('withCachedSystem', () => {
  it('converts a non-empty system string into a single cached text block', () => {
    const result = withCachedSystem('You are Kova.')
    expect(result).toEqual([
      { type: 'text', text: 'You are Kova.', cache_control: { type: 'ephemeral' } },
    ])
  })

  it('returns undefined for an empty system string', () => {
    expect(withCachedSystem('')).toBeUndefined()
    expect(withCachedSystem('   ')).toBeUndefined()
  })

  it('returns undefined for undefined input (no system prompt)', () => {
    expect(withCachedSystem(undefined)).toBeUndefined()
  })

  it('preserves the original system text verbatim (no trimming)', () => {
    const sys = '  System prompt with leading spaces.\n\nAnd blank lines.  '
    const result = withCachedSystem(sys)!
    expect(result[0].text).toBe(sys)
  })
})

// ─── withCachedTools ──────────────────────────────────────────────────────────

describe('withCachedTools', () => {
  const make = (name: string): Anthropic.Tool => ({
    name,
    description: `desc-${name}`,
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  })

  it('returns empty array unchanged when no tools are provided', () => {
    expect(withCachedTools([])).toEqual([])
  })

  it('sets cache_control only on the last tool — caching is prefix-based', () => {
    const tools = [make('a'), make('b'), make('c')]
    const result = withCachedTools(tools)
    expect(result[0].cache_control).toBeUndefined()
    expect(result[1].cache_control).toBeUndefined()
    expect(result[2].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('handles a single tool — the only tool receives cache_control', () => {
    const result = withCachedTools([make('only')])
    expect(result).toHaveLength(1)
    expect(result[0].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('does not mutate the input array', () => {
    const tools = [make('a'), make('b')]
    const before = JSON.stringify(tools)
    withCachedTools(tools)
    expect(JSON.stringify(tools)).toBe(before)
  })

  it('preserves tool name, description, and input_schema', () => {
    const result = withCachedTools([make('alpha'), make('beta')])
    expect(result[0]).toMatchObject({ name: 'alpha', description: 'desc-alpha' })
    expect(result[1]).toMatchObject({ name: 'beta', description: 'desc-beta' })
  })
})

// ─── withHistoryCacheBreakpoint ───────────────────────────────────────────────

describe('withHistoryCacheBreakpoint', () => {
  it('returns empty array unchanged when history is empty', () => {
    expect(withHistoryCacheBreakpoint([])).toEqual([])
  })

  it('converts a string content into a single cached text block', () => {
    const result = withHistoryCacheBreakpoint([{ role: 'user', content: 'hello' }])
    expect(result).toEqual([
      {
        role: 'user',
        content: [{ type: 'text', text: 'hello', cache_control: { type: 'ephemeral' } }],
      },
    ])
  })

  it('marks the last content block of the last message when content is already an array', () => {
    const result = withHistoryCacheBreakpoint([
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'analysis' },
          { type: 'tool_use', id: 't1', name: 'read_file', input: { path: 'a.ts' } },
        ],
      },
    ])
    expect((result[0].content as Anthropic.Messages.ContentBlockParam[])[0].cache_control).toBeUndefined()
    expect((result[0].content as Anthropic.Messages.ContentBlockParam[])[1].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('marks the LAST message only — earlier messages stay untouched', () => {
    const result = withHistoryCacheBreakpoint([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'second' },
      { role: 'user', content: 'third' },
    ])
    expect((result[0].content as Anthropic.Messages.ContentBlockParam[])[0].cache_control).toBeUndefined()
    expect((result[1].content as Anthropic.Messages.ContentBlockParam[])[0].cache_control).toBeUndefined()
    expect((result[2].content as Anthropic.Messages.ContentBlockParam[])[0].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('handles tool_result blocks — cache_control set on the last tool_result', () => {
    const result = withHistoryCacheBreakpoint([
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 't1', content: 'OK: read file' },
          { type: 'tool_result', tool_use_id: 't2', content: 'OK: ran command' },
        ],
      },
    ])
    const blocks = result[0].content as Anthropic.Messages.ToolResultBlockParam[]
    expect(blocks[0].cache_control).toBeUndefined()
    expect(blocks[1].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('handles message with empty content array — no cache marker, no crash', () => {
    const result = withHistoryCacheBreakpoint([{ role: 'user', content: [] }])
    expect(result[0].content).toEqual([])
  })

  it('does not mutate the input history', () => {
    const history: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: 'one' },
      { role: 'assistant', content: 'two' },
    ]
    const before = JSON.stringify(history)
    withHistoryCacheBreakpoint(history)
    expect(JSON.stringify(history)).toBe(before)
  })

  it('idempotent: applying twice yields the same shape', () => {
    const input: Anthropic.Messages.MessageParam[] = [{ role: 'user', content: 'hi' }]
    const once = withHistoryCacheBreakpoint(input)
    const twice = withHistoryCacheBreakpoint(once)
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once))
  })
})

// ─── parseCacheUsage ──────────────────────────────────────────────────────────

describe('parseCacheUsage', () => {
  it('extracts both counters when usage contains cache fields', () => {
    const usage = {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 800,
      cache_read_input_tokens: 1200,
    } as Anthropic.Messages.Usage
    expect(parseCacheUsage(usage)).toEqual({
      cacheCreationInputTokens: 800,
      cacheReadInputTokens: 1200,
      inputTokens: 100,
      outputTokens: 50,
    })
  })

  it('treats null cache fields as 0', () => {
    const usage = {
      input_tokens: 10,
      output_tokens: 5,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
    } as Anthropic.Messages.Usage
    expect(parseCacheUsage(usage)).toEqual({
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      inputTokens: 10,
      outputTokens: 5,
    })
  })

  it('treats missing cache fields as 0 (backward compat with older SDK responses)', () => {
    const usage = { input_tokens: 7, output_tokens: 3 } as Anthropic.Messages.Usage
    expect(parseCacheUsage(usage)).toEqual({
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      inputTokens: 7,
      outputTokens: 3,
    })
  })
})

// ─── breakpoint budget ────────────────────────────────────────────────────────

describe('cache breakpoint budget', () => {
  it('uses at most 3 of the 4 allowed breakpoints — leaves headroom for callers', () => {
    // Apply all three transformations and count cache_control markers.
    const system = withCachedSystem('S')!
    const tools = withCachedTools([
      { name: 't', description: 'd', input_schema: { type: 'object' as const, properties: {}, required: [] } },
    ])
    const history = withHistoryCacheBreakpoint([{ role: 'user', content: 'hi' }])

    const count =
      (system?.filter(b => b.cache_control).length ?? 0) +
      tools.filter(t => t.cache_control).length +
      history
        .flatMap(m => Array.isArray(m.content) ? m.content : [])
        .filter((b: Anthropic.Messages.ContentBlockParam) => b.cache_control).length

    expect(count).toBeLessThanOrEqual(4)
    expect(count).toBe(3) // exact: one per transformation
  })
})
