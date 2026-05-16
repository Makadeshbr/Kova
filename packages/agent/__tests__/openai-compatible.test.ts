import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { OpenAICompatibleProvider } from '../src/providers/openai-compatible'
import { AGENT_TOOLS, ToolExecutor } from '../src/tools'

const fetchMock = vi.fn()

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function mockResponse(body: unknown): void {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => body, text: async () => '' } as Response)
  vi.stubGlobal('fetch', fetchMock)
}

function mockStream(chunks: unknown[]): void {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  fetchMock.mockResolvedValueOnce({ ok: true, body: stream, text: async () => '' } as Response)
  vi.stubGlobal('fetch', fetchMock)
}

describe('OpenAICompatibleProvider', () => {
  describe('generate()', () => {
    it('deve enviar para o endpoint correto', async () => {
      mockResponse({ choices: [{ message: { content: 'done' } }], usage: { total_tokens: 7 } })
      const provider = new OpenAICompatibleProvider({ apiKey: 'key', baseUrl: 'https://api.example.com/v1', model: 'model-a' })
      await provider.generate([{ role: 'user', content: 'hello' }], { system: 'sys' })
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/v1/chat/completions')
    })

    it('deve extrair thought e tokensUsed', async () => {
      mockResponse({ choices: [{ message: { content: 'done' } }], usage: { total_tokens: 7 } })
      const provider = new OpenAICompatibleProvider({ baseUrl: 'http://local/v1', model: 'm' })
      const result = await provider.generate([{ role: 'user', content: 'hello' }])
      expect(result.thought).toBe('done')
      expect(result.tokensUsed).toBe(7)
    })

    it('não deve enviar tools em generate() — single-turn sem ferramentas', async () => {
      mockResponse({ choices: [{ message: { content: '{}' } }] })
      const provider = new OpenAICompatibleProvider({ baseUrl: 'http://local/v1', model: 'm' })
      await provider.generate([{ role: 'user', content: 'json' }])
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
      expect(body.tools).toBeUndefined()
    })

    it('deve extrair tool_calls como FileChange', async () => {
      mockResponse({
        choices: [{
          message: {
            content: 'writing',
            tool_calls: [{ function: { name: 'write_file', arguments: '{"path":"src/a.ts","content":"x"}' } }],
          },
        }],
      })
      const provider = new OpenAICompatibleProvider({ baseUrl: 'http://local/v1', model: 'm' })
      const result = await provider.generate([{ role: 'user', content: 'write' }])
      expect(result.changes).toEqual([{ path: 'src/a.ts', type: 'create', diff: 'x' }])
    })

    it('deve extrair arquivo de XML <kova_file> quando não há tool calls', async () => {
      const body = 'Here is the file:\n<kova_file path="main.go">package main\n</kova_file>'
      mockResponse({ choices: [{ message: { content: body } }] })
      const provider = new OpenAICompatibleProvider({ baseUrl: 'http://local/v1', model: 'm' })
      const result = await provider.generate([{ role: 'user', content: 'create' }])
      expect(result.changes[0].path).toBe('main.go')
      expect(result.changes[0].diff).toBe('package main')
    })
  })

  describe('runAgentLoop()', () => {
    let projectRoot: string
    beforeEach(() => { projectRoot = mkdtempSync(join(tmpdir(), 'kova-oai-test-')) })
    afterEach(() => rmSync(projectRoot, { recursive: true, force: true }))

    it('deve executar loop com tool_calls até finish_reason=stop', async () => {
      // First call: tool_calls → write_file
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              role: 'assistant', content: 'Writing...',
              tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'write_file', arguments: '{"path":"main.go","content":"package main\\n"}' } }],
            },
            finish_reason: 'tool_calls',
          }],
          usage: { total_tokens: 150 },
        }),
        text: async () => '',
      } as Response)

      // Second call: stop
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Done.' }, finish_reason: 'stop' }],
          usage: { total_tokens: 80 },
        }),
        text: async () => '',
      } as Response)

      vi.stubGlobal('fetch', fetchMock)

      const executor = new ToolExecutor(projectRoot)
      const provider = new OpenAICompatibleProvider({ baseUrl: 'http://local/v1', model: 'm' })
      const result = await provider.runAgentLoop(
        [{ role: 'user', content: 'create main.go' }],
        { system: 'be helpful', tools: AGENT_TOOLS, executor },
      )

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].path).toBe('main.go')
      expect(result.thought).toContain('Done.')
    })

    it('deve enviar tools na request body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }),
        text: async () => '',
      } as Response)
      vi.stubGlobal('fetch', fetchMock)

      const executor = new ToolExecutor(projectRoot)
      const provider = new OpenAICompatibleProvider({ baseUrl: 'http://local/v1', model: 'm' })
      await provider.runAgentLoop(
        [{ role: 'user', content: 'task' }],
        { system: 'sys', tools: AGENT_TOOLS, executor },
      )

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
      expect(body.tools).toBeDefined()
      expect(body.tools.length).toBeGreaterThan(0)
    })

    it('streams reasoning_content separately from final tokens', async () => {
      mockStream([
        { choices: [{ delta: { reasoning_content: 'checking' } }] },
        { choices: [{ delta: { content: 'Final' }, finish_reason: 'stop' }] },
      ])

      const tokens: string[] = []
      const reasoning: string[] = []
      const executor = new ToolExecutor(projectRoot)
      const provider = new OpenAICompatibleProvider({ baseUrl: 'http://local/v1', model: 'm' })
      const result = await provider.runAgentLoop(
        [{ role: 'user', content: 'task' }],
        {
          system: 'sys',
          tools: [],
          executor,
          onToken: token => tokens.push(token),
          onReasoningDelta: delta => reasoning.push(delta),
        },
      )

      expect(tokens.join('')).toBe('Final')
      expect(reasoning.join('')).toBe('checking')
      expect(result.thought).toBe('Final')
    })

    it('extracts legacy think tags and removes them from final tokens', async () => {
      mockStream([
        { choices: [{ delta: { content: '<think>private plan</think>Visible' }, finish_reason: 'stop' }] },
      ])

      const tokens: string[] = []
      const reasoning: string[] = []
      const executor = new ToolExecutor(projectRoot)
      const provider = new OpenAICompatibleProvider({ baseUrl: 'http://local/v1', model: 'm' })
      const result = await provider.runAgentLoop(
        [{ role: 'user', content: 'task' }],
        {
          system: 'sys',
          tools: [],
          executor,
          onToken: token => tokens.push(token),
          onReasoningDelta: delta => reasoning.push(delta),
        },
      )

      expect(tokens.join('')).toBe('Visible')
      expect(tokens.join('')).not.toContain('<think>')
      expect(reasoning.join('')).toBe('private plan')
      expect(result.thought).toBe('Visible')
    })
  })

  // FIX-011: Adversarial reasoning isolation tests. The audit confirmed reasoning
  // never leaks via the happy path; these tests verify edge cases (split tags,
  // multiple blocks, unclosed tags, partial prefix at end) cannot bypass the filter.
  describe('reasoning isolation — adversarial cases (FIX-011)', () => {
    let projectRoot: string
    beforeEach(() => { projectRoot = mkdtempSync(join(tmpdir(), 'kova-oai-rfx11-')) })
    afterEach(() => rmSync(projectRoot, { recursive: true, force: true }))

    async function runAndCapture(chunks: unknown[]): Promise<{ tokens: string; reasoning: string; result: { thought: string } }> {
      mockStream(chunks)
      const tokens: string[] = []
      const reasoning: string[] = []
      const executor = new ToolExecutor(projectRoot)
      const provider = new OpenAICompatibleProvider({ baseUrl: 'http://local/v1', model: 'm' })
      const result = await provider.runAgentLoop(
        [{ role: 'user', content: 'task' }],
        {
          system: 'sys',
          tools: [],
          executor,
          onToken: token => tokens.push(token),
          onReasoningDelta: delta => reasoning.push(delta),
        },
      )
      return { tokens: tokens.join(''), reasoning: reasoning.join(''), result }
    }

    it('opening <think> split across SSE chunks does not leak the tag', async () => {
      const { tokens, reasoning } = await runAndCapture([
        { choices: [{ delta: { content: 'Hello <thi' } }] },
        { choices: [{ delta: { content: 'nk>secret</think>World' }, finish_reason: 'stop' }] },
      ])
      expect(tokens).toBe('Hello World')
      expect(tokens).not.toContain('<thi')
      expect(tokens).not.toContain('<think>')
      expect(reasoning).toBe('secret')
    })

    it('closing </think> split across chunks does not leak reasoning to tokens', async () => {
      const { tokens, reasoning } = await runAndCapture([
        { choices: [{ delta: { content: '<think>private plan</thi' } }] },
        { choices: [{ delta: { content: 'nk>visible answer' }, finish_reason: 'stop' }] },
      ])
      expect(tokens).toBe('visible answer')
      expect(tokens).not.toContain('private plan')
      expect(tokens).not.toContain('</thi')
      expect(reasoning).toContain('private plan')
    })

    it('multiple <think> blocks in one stream are all filtered', async () => {
      const { tokens, reasoning } = await runAndCapture([
        { choices: [{ delta: { content: '<think>step 1</think>Apple <think>step 2</think>Banana' }, finish_reason: 'stop' }] },
      ])
      expect(tokens).toBe('Apple Banana')
      expect(reasoning).toContain('step 1')
      expect(reasoning).toContain('step 2')
    })

    it('unclosed <think> at end of stream is flushed as reasoning, not as tokens', async () => {
      const { tokens, reasoning } = await runAndCapture([
        { choices: [{ delta: { content: 'Visible <think>thought never closes' }, finish_reason: 'stop' }] },
      ])
      expect(tokens).toBe('Visible ')
      expect(tokens).not.toContain('thought never closes')
      expect(reasoning).toContain('thought never closes')
    })

    it('reasoning_content interleaved with content keeps streams separate', async () => {
      const { tokens, reasoning } = await runAndCapture([
        { choices: [{ delta: { reasoning_content: 'part A' } }] },
        { choices: [{ delta: { content: 'visible 1 ' } }] },
        { choices: [{ delta: { reasoning_content: 'part B' } }] },
        { choices: [{ delta: { content: 'visible 2' }, finish_reason: 'stop' }] },
      ])
      expect(tokens).toBe('visible 1 visible 2')
      expect(tokens).not.toContain('part A')
      expect(tokens).not.toContain('part B')
      expect(reasoning).toBe('part Apart B')
    })

    it('partial-tail-that-looks-like-tag is held back, not emitted prematurely', async () => {
      // The filter must hold back trailing characters that could be the start of '<think>'
      // until either the full tag arrives or the stream ends.
      const { tokens } = await runAndCapture([
        { choices: [{ delta: { content: 'Result is 42 <thi' } }] },
        { choices: [{ delta: { content: 's is plain text' }, finish_reason: 'stop' }] },
      ])
      // Combined: "Result is 42 <this is plain text" — no real think tag
      expect(tokens).toBe('Result is 42 <this is plain text')
    })

    it('content arriving AFTER reasoning_content does not pull reasoning into tokens', async () => {
      const { tokens, reasoning } = await runAndCapture([
        { choices: [{ delta: { reasoning_content: 'inner monologue' } }] },
        { choices: [{ delta: { content: 'final answer' }, finish_reason: 'stop' }] },
      ])
      expect(tokens).toBe('final answer')
      expect(reasoning).toBe('inner monologue')
    })
  })
})
