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
})
