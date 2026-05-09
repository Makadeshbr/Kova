import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AnthropicProvider } from '../src/providers/anthropic'
import { OpenAICompatibleProvider } from '../src/providers/openai-compatible'
import { AGENT_TOOLS, ToolExecutor } from '../src/tools'

// ─── Anthropic mock ───────────────────────────────────────────────────────────

const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({ messages: { create: mockCreate } })),
}))

const fetchMock = vi.fn()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function anthropicToolUse(id: string, name: string, input: Record<string, string>) {
  return {
    content: [{ type: 'tool_use', id, name, input }],
    usage: { input_tokens: 100, output_tokens: 50 },
    stop_reason: 'tool_use',
  }
}
function anthropicEndTurn(text: string) {
  return { content: [{ type: 'text', text }], usage: { input_tokens: 80, output_tokens: 20 }, stop_reason: 'end_turn' }
}

function openAiToolCall(id: string, name: string, args: Record<string, string>) {
  return {
    ok: true,
    json: async () => ({
      choices: [{
        message: { role: 'assistant', content: null, tool_calls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }] },
        finish_reason: 'tool_calls',
      }],
      usage: { total_tokens: 120 },
    }),
    text: async () => '',
  }
}
function openAiStop(text: string) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { role: 'assistant', content: text }, finish_reason: 'stop' }], usage: { total_tokens: 60 } }),
    text: async () => '',
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Provider round-trip: tool_use_id preservation', () => {
  let projectRoot: string

  beforeEach(() => {
    mockCreate.mockReset()
    projectRoot = mkdtempSync(join(tmpdir(), 'kova-roundtrip-'))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
    rmSync(projectRoot, { recursive: true, force: true })
  })

  describe('AnthropicProvider', () => {
    it('deve preservar tool_use_id em multi-turn', async () => {
      const toolUseId = 'toolu_test_abc123'
      mockCreate
        .mockResolvedValueOnce(anthropicToolUse(toolUseId, 'write_file', { path: 'main.go', content: 'package main\n' }))
        .mockResolvedValueOnce(anthropicEndTurn('Done — main.go created.'))

      const executor = new ToolExecutor(projectRoot)
      const provider = new AnthropicProvider({ apiKey: 'test-key' })
      const result = await provider.runAgentLoop(
        [{ role: 'user', content: 'create main.go' }],
        { system: 'be helpful', tools: AGENT_TOOLS, executor },
      )

      expect(mockCreate).toHaveBeenCalledTimes(2)

      // Second call must include a tool_result block referencing the exact ID
      const secondMessages = mockCreate.mock.calls[1][0].messages
      const toolResultMsg = secondMessages.find(
        (m: { role: string; content?: Array<{ type: string; tool_use_id?: string }> }) =>
          m.role === 'user' && Array.isArray(m.content),
      )
      const toolResult = toolResultMsg?.content?.find(
        (b: { type: string; tool_use_id?: string }) => b.type === 'tool_result',
      )

      expect(toolResult?.tool_use_id).toBe(toolUseId)
      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].path).toBe('main.go')
    })

    it('deve acumular thought de múltiplos turnos', async () => {
      mockCreate
        .mockResolvedValueOnce(anthropicToolUse('t1', 'list_files', { dir: '.' }))
        .mockResolvedValueOnce(anthropicEndTurn('All files listed.'))

      const executor = new ToolExecutor(projectRoot)
      const provider = new AnthropicProvider({ apiKey: 'test-key' })
      const result = await provider.runAgentLoop(
        [{ role: 'user', content: 'list files' }],
        { system: 'sys', tools: AGENT_TOOLS, executor },
      )

      expect(result.thought).toBeTruthy()
      expect(result.tokensUsed).toBeGreaterThan(0)
    })
  })

  describe('OpenAICompatibleProvider', () => {
    it('deve preservar tool_call_id em multi-turn', async () => {
      const toolCallId = 'call_test_xyz789'
      fetchMock
        .mockResolvedValueOnce(openAiToolCall(toolCallId, 'write_file', { path: 'main.go', content: 'package main\n' }))
        .mockResolvedValueOnce(openAiStop('Done — main.go created.'))
      vi.stubGlobal('fetch', fetchMock)

      const executor = new ToolExecutor(projectRoot)
      const provider = new OpenAICompatibleProvider({ baseUrl: 'http://local/v1', model: 'm' })
      const result = await provider.runAgentLoop(
        [{ role: 'user', content: 'create main.go' }],
        { system: 'be helpful', tools: AGENT_TOOLS, executor },
      )

      expect(fetchMock).toHaveBeenCalledTimes(2)

      // Second call must include a tool role message with the correct tool_call_id
      const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string)
      const toolMsg = secondBody.messages.find((m: { role: string; tool_call_id?: string }) => m.role === 'tool')

      expect(toolMsg?.tool_call_id).toBe(toolCallId)
      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].path).toBe('main.go')
    })

    it('deve enviar tools na segunda chamada (contexto multi-turn)', async () => {
      fetchMock
        .mockResolvedValueOnce(openAiToolCall('c1', 'list_files', { dir: '.' }))
        .mockResolvedValueOnce(openAiStop('Listed.'))
      vi.stubGlobal('fetch', fetchMock)

      const executor = new ToolExecutor(projectRoot)
      const provider = new OpenAICompatibleProvider({ baseUrl: 'http://local/v1', model: 'm' })
      await provider.runAgentLoop(
        [{ role: 'user', content: 'list files' }],
        { system: 'sys', tools: AGENT_TOOLS, executor },
      )

      const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string)
      expect(secondBody.tools).toBeDefined()
      expect(secondBody.tools.length).toBeGreaterThan(0)
    })
  })
})
