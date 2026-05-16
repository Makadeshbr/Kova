/**
 * FIX-014 — Integration tests for prompt caching in AnthropicProvider.
 *
 * These exercise the provider end-to-end with a mocked Anthropic SDK to
 * assert that:
 *   • system prompt is sent as a cached TextBlockParam[]
 *   • tools array carries cache_control only on the last tool
 *   • the history breakpoint moves forward each turn (incremental caching)
 *   • onUsageReport is fired with parsed cache counters
 *   • supportsPromptCaching capability is advertised
 *   • absent system prompt is omitted (no empty cached block sent)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AnthropicProvider } from '../src/providers/anthropic'
import { AGENT_TOOLS, ToolExecutor } from '../src/tools'
import type { ProviderUsageReport } from '../src/providers/provider'

// ─── SDK mock ────────────────────────────────────────────────────────────────

const mockCreate = vi.fn()
const mockStreamFinalMessage = vi.fn()
const streamHandlers = new Map<string, (arg: string) => void>()
const mockStream = vi.fn().mockImplementation(() => ({
  on: (event: string, cb: (arg: string) => void) => {
    streamHandlers.set(event, cb)
  },
  finalMessage: () => mockStreamFinalMessage(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate, stream: mockStream },
  })),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function anthropicToolUse(id: string, name: string, input: Record<string, string>) {
  return {
    content: [{ type: 'tool_use', id, name, input }],
    usage: { input_tokens: 50, output_tokens: 30, cache_creation_input_tokens: 1200, cache_read_input_tokens: 0 },
    stop_reason: 'tool_use',
  }
}
function anthropicEndTurn(text: string, cacheRead = 0, cacheWrite = 0) {
  return {
    content: [{ type: 'text', text }],
    usage: {
      input_tokens: 20,
      output_tokens: 15,
      cache_creation_input_tokens: cacheWrite,
      cache_read_input_tokens: cacheRead,
    },
    stop_reason: 'end_turn',
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AnthropicProvider — capabilities advertise prompt caching', () => {
  it('exposes supportsPromptCaching: true', () => {
    const provider = new AnthropicProvider({ apiKey: 'test-key' })
    expect(provider.capabilities().supportsPromptCaching).toBe(true)
  })
})

describe('AnthropicProvider — system prompt caching', () => {
  let projectRoot: string

  beforeEach(() => {
    mockCreate.mockReset()
    mockStream.mockClear()
    streamHandlers.clear()
    projectRoot = mkdtempSync(join(tmpdir(), 'kova-cache-int-'))
  })
  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('sends system as a cached TextBlockParam[] with cache_control: ephemeral', async () => {
    mockCreate.mockResolvedValueOnce(anthropicEndTurn('Hello.'))

    const executor = new ToolExecutor(projectRoot)
    const provider = new AnthropicProvider({ apiKey: 'test-key' })
    await provider.runAgentLoop(
      [{ role: 'user', content: 'hi' }],
      { system: 'You are Kova.', tools: AGENT_TOOLS, executor },
    )

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const params = mockCreate.mock.calls[0][0]
    expect(Array.isArray(params.system)).toBe(true)
    expect(params.system).toEqual([
      { type: 'text', text: 'You are Kova.', cache_control: { type: 'ephemeral' } },
    ])
  })

  it('omits system entirely when the prompt is empty', async () => {
    mockCreate.mockResolvedValueOnce(anthropicEndTurn('OK.'))

    const executor = new ToolExecutor(projectRoot)
    const provider = new AnthropicProvider({ apiKey: 'test-key' })
    await provider.runAgentLoop(
      [{ role: 'user', content: 'hi' }],
      { system: '   ', tools: AGENT_TOOLS, executor },
    )

    const params = mockCreate.mock.calls[0][0]
    expect(params.system).toBeUndefined()
  })
})

describe('AnthropicProvider — tools caching', () => {
  let projectRoot: string

  beforeEach(() => {
    mockCreate.mockReset()
    projectRoot = mkdtempSync(join(tmpdir(), 'kova-cache-int-'))
  })
  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('marks ONLY the last tool with cache_control', async () => {
    mockCreate.mockResolvedValueOnce(anthropicEndTurn('Done.'))

    const executor = new ToolExecutor(projectRoot)
    const provider = new AnthropicProvider({ apiKey: 'test-key' })
    await provider.runAgentLoop(
      [{ role: 'user', content: 'hi' }],
      { system: 'sys', tools: AGENT_TOOLS, executor },
    )

    const params = mockCreate.mock.calls[0][0]
    const tools = params.tools as Array<{ name: string; cache_control?: { type: string } }>
    expect(tools.length).toBe(AGENT_TOOLS.length)
    for (let i = 0; i < tools.length - 1; i++) {
      expect(tools[i].cache_control).toBeUndefined()
    }
    expect(tools[tools.length - 1].cache_control).toEqual({ type: 'ephemeral' })
  })
})

describe('AnthropicProvider — history breakpoint movement', () => {
  let projectRoot: string

  beforeEach(() => {
    mockCreate.mockReset()
    projectRoot = mkdtempSync(join(tmpdir(), 'kova-cache-int-'))
  })
  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('marks the last content block of the last message every turn', async () => {
    mockCreate
      .mockResolvedValueOnce(anthropicToolUse('t1', 'list_files', { dir: '.' }))
      .mockResolvedValueOnce(anthropicEndTurn('Listed.', /*cacheRead*/ 1200))

    const executor = new ToolExecutor(projectRoot)
    const provider = new AnthropicProvider({ apiKey: 'test-key' })
    await provider.runAgentLoop(
      [{ role: 'user', content: 'list files please' }],
      { system: 'sys', tools: AGENT_TOOLS, executor },
    )

    expect(mockCreate).toHaveBeenCalledTimes(2)

    // Turn 1: history is just the initial user message — its last block should carry cache_control
    const t1Messages = mockCreate.mock.calls[0][0].messages
    expect(t1Messages).toHaveLength(1)
    const t1Last = t1Messages[t1Messages.length - 1]
    expect(Array.isArray(t1Last.content)).toBe(true)
    const t1Block = t1Last.content[t1Last.content.length - 1]
    expect(t1Block.cache_control).toEqual({ type: 'ephemeral' })

    // Turn 2: history grew by [assistant tool_use, user tool_result] — cache marker now sits on the last tool_result
    const t2Messages = mockCreate.mock.calls[1][0].messages
    expect(t2Messages.length).toBeGreaterThan(t1Messages.length)
    const t2Last = t2Messages[t2Messages.length - 1]
    expect(Array.isArray(t2Last.content)).toBe(true)
    const t2LastBlock = t2Last.content[t2Last.content.length - 1]
    expect(t2LastBlock.cache_control).toEqual({ type: 'ephemeral' })
    expect(t2LastBlock.type).toBe('tool_result')

    // And the earlier user message in turn 2 should NOT have a cache marker on its now-stale blocks
    const t2EarliestUser = t2Messages[0]
    if (Array.isArray(t2EarliestUser.content)) {
      // The earlier turn-1 user message in the turn-2 history was passed through
      // unchanged (no cache_control should remain on it — the breakpoint moved).
      for (const b of t2EarliestUser.content) {
        expect(b.cache_control).toBeUndefined()
      }
    }
  })
})

describe('AnthropicProvider — onUsageReport', () => {
  let projectRoot: string

  beforeEach(() => {
    mockCreate.mockReset()
    projectRoot = mkdtempSync(join(tmpdir(), 'kova-cache-int-'))
  })
  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('is called once per turn with parsed cache counters', async () => {
    mockCreate
      .mockResolvedValueOnce(anthropicToolUse('t1', 'list_files', { dir: '.' }))
      .mockResolvedValueOnce(anthropicEndTurn('Done.', /*cacheRead*/ 1500, /*cacheWrite*/ 100))

    const executor = new ToolExecutor(projectRoot)
    const provider = new AnthropicProvider({ apiKey: 'test-key' })
    const reports: ProviderUsageReport[] = []
    await provider.runAgentLoop(
      [{ role: 'user', content: 'do it' }],
      {
        system: 'sys',
        tools: AGENT_TOOLS,
        executor,
        onUsageReport: r => reports.push(r),
      },
    )

    expect(reports).toHaveLength(2)
    expect(reports[0]).toEqual({
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 1200,
      inputTokens: 50,
      outputTokens: 30,
    })
    expect(reports[1]).toEqual({
      cacheReadInputTokens: 1500,
      cacheCreationInputTokens: 100,
      inputTokens: 20,
      outputTokens: 15,
    })
  })

  it('does not throw when onUsageReport is omitted', async () => {
    mockCreate.mockResolvedValueOnce(anthropicEndTurn('Done.'))

    const executor = new ToolExecutor(projectRoot)
    const provider = new AnthropicProvider({ apiKey: 'test-key' })
    await expect(
      provider.runAgentLoop(
        [{ role: 'user', content: 'hi' }],
        { system: 'sys', tools: AGENT_TOOLS, executor },
      ),
    ).resolves.toBeDefined()
  })

  it('coerces null cache counters to 0', async () => {
    const responseWithNullCacheFields = {
      content: [{ type: 'text', text: 'OK' }],
      usage: {
        input_tokens: 5,
        output_tokens: 3,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
      },
      stop_reason: 'end_turn',
    }
    mockCreate.mockResolvedValueOnce(responseWithNullCacheFields)

    const executor = new ToolExecutor(projectRoot)
    const provider = new AnthropicProvider({ apiKey: 'test-key' })
    const reports: ProviderUsageReport[] = []
    await provider.runAgentLoop(
      [{ role: 'user', content: 'hi' }],
      { system: 'sys', tools: AGENT_TOOLS, executor, onUsageReport: r => reports.push(r) },
    )

    expect(reports[0]).toEqual({
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      inputTokens: 5,
      outputTokens: 3,
    })
  })
})

describe('AnthropicProvider — streaming chat path (no tools)', () => {
  let projectRoot: string

  beforeEach(() => {
    mockCreate.mockReset()
    mockStream.mockClear()
    mockStreamFinalMessage.mockReset()
    streamHandlers.clear()
    projectRoot = mkdtempSync(join(tmpdir(), 'kova-cache-int-'))
  })
  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('caches system and history on the streaming-chat path', async () => {
    mockStreamFinalMessage.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'hello back' }],
      usage: { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 50, cache_read_input_tokens: 0 },
      stop_reason: 'end_turn',
    })

    const executor = new ToolExecutor(projectRoot)
    const provider = new AnthropicProvider({ apiKey: 'test-key' })
    const reports: ProviderUsageReport[] = []
    const tokens: string[] = []

    // Kick off the loop; emit a streamed text token via the registered handler
    const promise = provider.runAgentLoop(
      [{ role: 'user', content: 'hi' }],
      {
        system: 'sys',
        tools: [], // empty tools → streaming-chat path
        executor,
        onToken: t => tokens.push(t),
        onUsageReport: r => reports.push(r),
      },
    )
    // Drive the simulated stream: provider registers 'text' handler synchronously
    streamHandlers.get('text')?.('hello back')
    await promise

    expect(mockStream).toHaveBeenCalledTimes(1)
    const params = mockStream.mock.calls[0][0]
    expect(params.system).toEqual([
      { type: 'text', text: 'sys', cache_control: { type: 'ephemeral' } },
    ])
    expect(Array.isArray(params.messages[0].content)).toBe(true)
    const lastBlock = params.messages[0].content[params.messages[0].content.length - 1]
    expect(lastBlock.cache_control).toEqual({ type: 'ephemeral' })

    expect(tokens).toEqual(['hello back'])
    expect(reports).toHaveLength(1)
    expect(reports[0].cacheCreationInputTokens).toBe(50)
  })
})
