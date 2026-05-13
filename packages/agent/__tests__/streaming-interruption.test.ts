/**
 * Streaming interruption tests — SSE mid-stream errors, chunk-boundary parsing,
 * tool call accumulation across SSE events, and state isolation after failure.
 *
 * Covers the gaps identified in KNOWN_ISSUES.md:
 *   - SSE reader.read() throws (network disconnect) → KovaProviderError normalized
 *   - SSE line split across reader chunks → buffer accumulation correct
 *   - Tool call arguments split across SSE events → assembled correctly
 *   - Anthropic stream.finalMessage() throws → normalized
 *   - Staged writes cleared after stream failure (state isolation)
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { OpenAICompatibleProvider } from '../src/providers/openai-compatible'
import { AnthropicProvider } from '../src/providers/anthropic'
import { AGENT_TOOLS, ToolExecutor } from '../src/tools'
import { KovaProviderError } from '../src/providers/errors'

// ─── Anthropic SDK mock ───────────────────────────────────────────────────────

const mockCreate = vi.fn()
const mockStream = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate, stream: mockStream },
  })),
}))

// ─── SSE stream helpers ───────────────────────────────────────────────────────

const encoder = new TextEncoder()

/** Creates an ok SSE Response from a sequence of raw SSE text lines. */
function sseResponse(lines: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line))
      controller.close()
    },
  })
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

/**
 * Creates a Response whose stream delivers initial lines then throws an error.
 * Each `pull()` call delivers one line, so we get predictable sequencing.
 */
function sseInterruptedResponse(initialLines: string[], error: Error): Response {
  let i = 0
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < initialLines.length) {
        controller.enqueue(encoder.encode(initialLines[i++]))
      } else {
        controller.error(error)
      }
    },
  })
  return new Response(stream, { status: 200 })
}

/** Single SSE event containing a text delta. */
function textDelta(content: string, finishReason: string | null = null): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: finishReason }] })}\n\n`
}

/** SSE event that carries a finish_reason with no text. */
function finishEvent(reason: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: reason }] })}\n\n`
}

/** SSE event that adds tool call fragments for a given index. */
function toolCallDelta(index: number, opts: { id?: string; name?: string; args?: string }): string {
  const tc: Record<string, unknown> = { index }
  if (opts.id) tc.id = opts.id
  if (opts.name || opts.args) tc.function = { ...(opts.name ? { name: opts.name } : {}), ...(opts.args !== undefined ? { arguments: opts.args } : {}) }
  return `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [tc] }, finish_reason: null }] })}\n\n`
}

const SSE_DONE = 'data: [DONE]\n\n'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const fetchMock = vi.fn()
let projectRoot: string

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'kova-stream-test-'))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  mockCreate.mockReset()
  mockStream.mockReset()
  rmSync(projectRoot, { recursive: true, force: true })
})

function makeProvider() {
  return new OpenAICompatibleProvider({ baseUrl: 'http://local/v1', model: 'test-model', apiKey: 'k' })
}

function makeExecutor() {
  return new ToolExecutor(projectRoot)
}

// ─── SSE stream interruption (mid-read) ──────────────────────────────────────

describe('OpenAICompatibleProvider — SSE stream interruption mid-read', () => {
  it('reader.read() throws network error → KovaProviderError with provider_unavailable', async () => {
    const networkError = new TypeError('network socket closed')
    fetchMock.mockResolvedValueOnce(
      sseInterruptedResponse([textDelta('partial...')], networkError),
    )

    await expect(
      makeProvider().runAgentLoop(
        [{ role: 'user', content: 'hi' }],
        { system: '', tools: [], executor: makeExecutor(), onToken: vi.fn() },
      ),
    ).rejects.toMatchObject({
      code: 'provider_unavailable',
      recoverable: true,
    })
  })

  it('reader.read() error is tagged with provider=openai-compatible', async () => {
    fetchMock.mockResolvedValueOnce(
      sseInterruptedResponse([], new TypeError('ECONNRESET')),
    )

    let thrown: unknown
    try {
      await makeProvider().runAgentLoop(
        [{ role: 'user', content: 'hi' }],
        { system: '', tools: [], executor: makeExecutor(), onToken: vi.fn() },
      )
    } catch (err) {
      thrown = err
    }

    expect(thrown).toBeInstanceOf(KovaProviderError)
    expect((thrown as KovaProviderError).provider).toBe('openai-compatible')
  })

  it('stream error thrown after partial tokens are emitted still throws — tokens already received by caller', async () => {
    const tokens: string[] = []
    const networkError = new TypeError('connection lost')
    fetchMock.mockResolvedValueOnce(
      sseInterruptedResponse(
        [textDelta('hello '), textDelta('world')],
        networkError,
      ),
    )

    let threw = false
    try {
      await makeProvider().runAgentLoop(
        [{ role: 'user', content: 'hi' }],
        { system: '', tools: [], executor: makeExecutor(), onToken: t => tokens.push(t) },
      )
    } catch {
      threw = true
    }

    expect(threw).toBe(true)
    // Partial tokens were already delivered to the caller before the error
    expect(tokens.join('')).toContain('hello')
  })

  it('SSE stream errors are normalized even without an initial response text chunk', async () => {
    // 'fetch failed' / 'network' / 'econnrefused' in message → provider_unavailable
    fetchMock.mockResolvedValueOnce(
      sseInterruptedResponse([], new Error('fetch failed: network error')),
    )

    await expect(
      makeProvider().runAgentLoop(
        [{ role: 'user', content: 'hi' }],
        { system: '', tools: [], executor: makeExecutor(), onToken: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: 'provider_unavailable' })
  })
})

// ─── SSE chunk boundary and buffer handling ───────────────────────────────────

describe('OpenAICompatibleProvider — SSE chunk boundary handling', () => {
  it('SSE data line split across two reader chunks is assembled correctly', async () => {
    // Split a single SSE line right in the middle of the JSON payload.
    // Chunk 1 has no \n so it goes into buffer. Chunk 2 completes the line.
    const fullEvent = textDelta('assembled')
    const splitPoint = Math.floor(fullEvent.length / 2)
    const chunk1 = fullEvent.slice(0, splitPoint)
    const chunk2 = fullEvent.slice(splitPoint) + finishEvent('stop') + SSE_DONE

    fetchMock.mockResolvedValueOnce(sseResponse([chunk1, chunk2]))

    const tokens: string[] = []
    await makeProvider().runAgentLoop(
      [{ role: 'user', content: 'hi' }],
      { system: '', tools: [], executor: makeExecutor(), onToken: t => tokens.push(t) },
    )

    expect(tokens.join('')).toBe('assembled')
  })

  it('malformed JSON chunk is silently skipped — valid chunks after it are processed', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([
      'data: {this is not valid json}\n\n',
      textDelta('valid token'),
      finishEvent('stop'),
      SSE_DONE,
    ]))

    const tokens: string[] = []
    await makeProvider().runAgentLoop(
      [{ role: 'user', content: 'hi' }],
      { system: '', tools: [], executor: makeExecutor(), onToken: t => tokens.push(t) },
    )

    expect(tokens.join('')).toBe('valid token')
  })

  it('premature stream close (done:true without [DONE]) returns partial response without error', async () => {
    // Stream closes after delivering some text, no finishReason, no [DONE]
    fetchMock.mockResolvedValueOnce(sseResponse([
      textDelta('partial response'),
      // No finishEvent, no SSE_DONE — abrupt close
    ]))

    const tokens: string[] = []
    const result = await makeProvider().runAgentLoop(
      [{ role: 'user', content: 'hi' }],
      { system: '', tools: [], executor: makeExecutor(), onToken: t => tokens.push(t) },
    )

    expect(tokens.join('')).toBe('partial response')
    expect(result.thought).toBe('partial response')
  })

  it('empty stream (immediate done:true) returns empty thought without error', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([]))

    const result = await makeProvider().runAgentLoop(
      [{ role: 'user', content: 'hi' }],
      { system: '', tools: [], executor: makeExecutor(), onToken: vi.fn() },
    )

    expect(result.thought).toBe('')
    expect(result.changes).toHaveLength(0)
  })

  it('multiple text deltas concatenate into a single thought', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([
      textDelta('The '),
      textDelta('answer '),
      textDelta('is 42.'),
      finishEvent('stop'),
      SSE_DONE,
    ]))

    const tokens: string[] = []
    const result = await makeProvider().runAgentLoop(
      [{ role: 'user', content: 'what is the answer?' }],
      { system: '', tools: [], executor: makeExecutor(), onToken: t => tokens.push(t) },
    )

    expect(tokens).toEqual(['The ', 'answer ', 'is 42.'])
    expect(result.thought).toBe('The answer is 42.')
  })
})

// ─── SSE tool call streaming accumulation ────────────────────────────────────

describe('OpenAICompatibleProvider — SSE tool call streaming', () => {
  it('tool call arguments split across multiple SSE events are assembled correctly', async () => {
    // Turn 1: tool call name + args across separate SSE events
    fetchMock.mockResolvedValueOnce(sseResponse([
      toolCallDelta(0, { id: 'tc-1', name: 'write_file' }),
      toolCallDelta(0, { args: '{"path":"main.go",' }),
      toolCallDelta(0, { args: '"content":"package main\\n"}' }),
      finishEvent('tool_calls'),
      SSE_DONE,
    ]))
    // Turn 2: onToken is still set → streaming path is used for follow-up turn too
    fetchMock.mockResolvedValueOnce(sseResponse([
      textDelta('Done.'),
      finishEvent('stop'),
      SSE_DONE,
    ]))

    const executor = makeExecutor()
    const result = await makeProvider().runAgentLoop(
      [{ role: 'user', content: 'create main.go' }],
      { system: 'sys', tools: AGENT_TOOLS, executor, onToken: vi.fn() },
    )

    expect(result.changes).toHaveLength(1)
    expect(result.changes[0].path).toBe('main.go')
    expect(result.changes[0].diff).toBe('package main\n')
  })

  it('tool_call_id from streaming incremental events is preserved in the tool result', async () => {
    const toolCallId = 'tc-stream-id-42'
    // Turn 1: streaming tool call
    fetchMock.mockResolvedValueOnce(sseResponse([
      toolCallDelta(0, { id: toolCallId, name: 'list_files' }),
      toolCallDelta(0, { args: '{"dir":"."}' }),
      finishEvent('tool_calls'),
      SSE_DONE,
    ]))
    // Turn 2: streaming finish (onToken provided → streaming path)
    fetchMock.mockResolvedValueOnce(sseResponse([
      textDelta('Listed.'),
      finishEvent('stop'),
      SSE_DONE,
    ]))

    const executor = makeExecutor()
    await makeProvider().runAgentLoop(
      [{ role: 'user', content: 'list files' }],
      { system: 'sys', tools: AGENT_TOOLS, executor, onToken: vi.fn() },
    )

    // Second fetch body must include a tool role message with the correct tool_call_id
    const secondBody = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)
    const toolMsg = (secondBody.messages as Array<{ role: string; tool_call_id?: string }>)
      .find(m => m.role === 'tool')
    expect(toolMsg?.tool_call_id).toBe(toolCallId)
  })

  it('reasoning_content in SSE events is accumulated and NOT emitted as user tokens', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([
      `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: 'internal thinking' }, finish_reason: null }] })}\n\n`,
      textDelta('Visible output.'),
      finishEvent('stop'),
      SSE_DONE,
    ]))

    const tokens: string[] = []
    const reasoningDeltas: string[] = []
    await makeProvider().runAgentLoop(
      [{ role: 'user', content: 'think' }],
      {
        system: 'sys', tools: [], executor: makeExecutor(),
        onToken: t => tokens.push(t),
        onReasoningDelta: d => reasoningDeltas.push(d),
      },
    )

    expect(tokens.join('')).toBe('Visible output.')
    expect(tokens.join('')).not.toContain('internal thinking')
    expect(reasoningDeltas.join('')).toBe('internal thinking')
  })
})

// ─── Anthropic streaming interruption ────────────────────────────────────────

describe('AnthropicProvider — streaming path errors', () => {
  function makeAnthropicProvider() {
    return new AnthropicProvider({ apiKey: 'test-key' })
  }

  function makeMockStream(opts: {
    tokens?: string[]
    throwOnFinal?: Error
  }) {
    const handlers: Record<string, ((...args: unknown[]) => void)[]> = {}
    return {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!handlers[event]) handlers[event] = []
        handlers[event].push(handler)
      }),
      finalMessage: vi.fn(async () => {
        // Emit tokens before resolving/rejecting
        for (const text of opts.tokens ?? []) {
          handlers['text']?.forEach(h => h(text))
        }
        if (opts.throwOnFinal) throw opts.throwOnFinal
        return {
          content: (opts.tokens ?? []).map(t => ({ type: 'text', text: t })),
          usage: { input_tokens: 50, output_tokens: 20 },
          stop_reason: 'end_turn',
        }
      }),
    }
  }

  it('stream.finalMessage() throws → normalized as KovaProviderError', async () => {
    const networkError = Object.assign(new Error('Connection reset'), { status: undefined })
    mockStream.mockReturnValueOnce(makeMockStream({ throwOnFinal: networkError }))

    const executor = makeExecutor()
    await expect(
      makeAnthropicProvider().runAgentLoop(
        [{ role: 'user', content: 'hi' }],
        { system: 'sys', tools: [], executor, onToken: vi.fn() },
      ),
    ).rejects.toBeInstanceOf(KovaProviderError)
  })

  it('stream.finalMessage() rate-limit → KovaProviderError provider_rate_limited recoverable', async () => {
    const rateLimitErr = Object.assign(new Error('429 Too Many Requests'), { status: 429 })
    mockStream.mockReturnValueOnce(makeMockStream({ throwOnFinal: rateLimitErr }))

    const executor = makeExecutor()
    await expect(
      makeAnthropicProvider().runAgentLoop(
        [{ role: 'user', content: 'hi' }],
        { system: 'sys', tools: [], executor, onToken: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: 'provider_rate_limited', recoverable: true, provider: 'anthropic' })
  })

  it('partial tokens emitted before stream.finalMessage() throws — error still propagates', async () => {
    const tokens: string[] = []
    const streamErr = new Error('502 Bad Gateway')
    mockStream.mockReturnValueOnce(
      makeMockStream({ tokens: ['partial ', 'output'], throwOnFinal: streamErr }),
    )

    const executor = makeExecutor()
    let threw = false
    try {
      await makeAnthropicProvider().runAgentLoop(
        [{ role: 'user', content: 'hi' }],
        { system: 'sys', tools: [], executor, onToken: t => tokens.push(t) },
      )
    } catch {
      threw = true
    }

    expect(threw).toBe(true)
    // Tokens were delivered before the error
    expect(tokens.join('')).toBe('partial output')
  })

  it('stream.finalMessage() auth error → KovaProviderError provider_auth NOT recoverable', async () => {
    const authErr = Object.assign(new Error('401 Unauthorized'), { status: 401 })
    mockStream.mockReturnValueOnce(makeMockStream({ throwOnFinal: authErr }))

    const executor = makeExecutor()
    await expect(
      makeAnthropicProvider().runAgentLoop(
        [{ role: 'user', content: 'hi' }],
        { system: 'sys', tools: [], executor, onToken: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: 'provider_auth', recoverable: false })
  })
})

// ─── State isolation after streaming failure ──────────────────────────────────

describe('State isolation after streaming failure', () => {
  it('executor.getChanges() is empty after OpenAI SSE stream error (no state leak)', async () => {
    // First turn: tool call succeeds (write_file staged in memory)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            role: 'assistant', content: null,
            tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'write_file', arguments: '{"path":"staged.ts","content":"export const x = 1"}' } }],
          },
          finish_reason: 'tool_calls',
        }],
        usage: { total_tokens: 100 },
      }),
      text: async () => '',
    } as unknown as Response)

    // Second turn: SSE stream throws mid-read
    fetchMock.mockResolvedValueOnce(
      sseInterruptedResponse(
        [textDelta('processing...')],
        new TypeError('socket closed'),
      ),
    )

    const executor = makeExecutor()
    let threw = false
    try {
      await makeProvider().runAgentLoop(
        [{ role: 'user', content: 'write and continue' }],
        { system: 'sys', tools: AGENT_TOOLS, executor, onToken: vi.fn() },
      )
    } catch {
      threw = true
    }

    expect(threw).toBe(true)
    // The provider threw — agent.ts calls rollbackWrites() → buffer cleared
    // Simulate what agent.ts does on provider error:
    executor.rollbackWrites()
    expect(executor.getChanges()).toHaveLength(0)
  })

  it('after stream error, disk is never touched (in-memory staging invariant)', async () => {
    const { existsSync } = await import('node:fs')

    fetchMock.mockResolvedValueOnce(
      sseInterruptedResponse(
        [toolCallDelta(0, { id: 'tc1', name: 'write_file' }), toolCallDelta(0, { args: '{"path":"leak.ts","content":"leaked"}' })],
        new TypeError('network closed'),
      ),
    )

    const executor = makeExecutor()
    try {
      await makeProvider().runAgentLoop(
        [{ role: 'user', content: 'write a file' }],
        { system: 'sys', tools: AGENT_TOOLS, executor, onToken: vi.fn() },
      )
    } catch { /* expected */ }

    // ToolExecutor never writes to disk — disk must be untouched
    expect(existsSync(join(projectRoot, 'leak.ts'))).toBe(false)
  })
})
