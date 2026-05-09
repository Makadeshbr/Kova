import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TaskDefinition, AgentContext } from '@kova/shared'
import { Agent } from '../src/agent'
import { AnthropicProvider } from '../src/providers/anthropic'
import { AGENT_TOOLS, ToolExecutor } from '../src/tools'
import type { AgentProvider, LLMResponse } from '../src/providers/provider'

const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

function makeTask(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
  return {
    id: 'task-1', objective: 'implement token validation',
    constraints: ['no any types'], nonGoals: ['UI changes'],
    validationCriteria: ['tests pass'], type: 'feature', impact: 'medium',
    affectedFiles: ['src/auth.ts'], stackAdapter: 'typescript',
    ...overrides,
  }
}

function makeContext(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    files: [{ path: 'src/auth.ts', content: '// empty', tokens: 3, relevance: 'target' }],
    tokensUsed: 3, learnings: [], ...overrides,
  }
}

function mockEndTurn(text: string) {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text }],
    usage: { input_tokens: 100, output_tokens: 200 },
    stop_reason: 'end_turn',
  })
}

function mockToolUse(text: string, toolName: string, toolInput: Record<string, string>) {
  mockCreate.mockResolvedValueOnce({
    content: [
      { type: 'text', text },
      { type: 'tool_use', id: 'tool_0', name: toolName, input: toolInput },
    ],
    usage: { input_tokens: 100, output_tokens: 100 },
    stop_reason: 'tool_use',
  })
}

describe('AnthropicProvider', () => {
  beforeEach(() => mockCreate.mockReset())

  it('deve chamar a API com system prompt e mensagens em generate()', async () => {
    mockEndTurn('Analysis complete')
    const provider = new AnthropicProvider({ apiKey: 'test-key' })
    await provider.generate([{ role: 'user', content: 'do something' }], { system: 'be helpful' })
    const call = mockCreate.mock.calls[0][0]
    expect(call.system).toBe('be helpful')
    expect(call.messages[0].content).toBe('do something')
  })

  it('generate() não envia tools — é single-turn para task structuring', async () => {
    mockEndTurn('{"objective":"ok"}')
    const provider = new AnthropicProvider({ apiKey: 'test-key' })
    await provider.generate([{ role: 'user', content: 'task' }])
    expect(mockCreate.mock.calls[0][0].tools).toBeUndefined()
  })

  it('generate() deve extrair thought do bloco text', async () => {
    mockEndTurn('I will create the auth module')
    const provider = new AnthropicProvider({ apiKey: 'test-key' })
    const result = await provider.generate([{ role: 'user', content: 'task' }])
    expect(result.thought).toBe('I will create the auth module')
    expect(result.changes).toHaveLength(0)
  })

  it('runAgentLoop() deve executar loop: tool_use → tool_result → end_turn', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'kova-agent-test-'))
    try {
      mockToolUse('Creating file...', 'write_file', { path: 'main.go', content: 'package main\n' })
      mockEndTurn('Done! File created successfully.')

      const executor = new ToolExecutor(projectRoot)
      const provider = new AnthropicProvider({ apiKey: 'test-key' })
      const result = await provider.runAgentLoop(
        [{ role: 'user', content: 'create main.go' }],
        { system: 'you are kova', tools: AGENT_TOOLS, executor },
      )

      expect(mockCreate).toHaveBeenCalledTimes(2)
      expect(result.thought).toContain('Done!')
      expect(result.changes).toHaveLength(1)
      expect(result.changes[0].path).toBe('main.go')
      expect(result.changes[0].type).toBe('create')
      expect(result.tokensUsed).toBe(500) // 100+100 + 100+200
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })

  it('runAgentLoop() deve parar em end_turn sem tool calls', async () => {
    mockEndTurn('No files needed.')
    const projectRoot = mkdtempSync(join(tmpdir(), 'kova-agent-test-'))
    try {
      const executor = new ToolExecutor(projectRoot)
      const provider = new AnthropicProvider({ apiKey: 'test-key' })
      await provider.runAgentLoop(
        [{ role: 'user', content: 'analyze' }],
        { system: 'analyze', tools: AGENT_TOOLS, executor },
      )
      expect(mockCreate).toHaveBeenCalledTimes(1)
    } finally {
      rmSync(projectRoot, { recursive: true, force: true })
    }
  })
})

describe('Agent', () => {
  let projectRoot: string
  beforeEach(() => {
    mockCreate.mockReset()
    projectRoot = mkdtempSync(join(tmpdir(), 'kova-agent-test-'))
  })
  afterEach(() => rmSync(projectRoot, { recursive: true, force: true }))

  it('deve retornar AgentOutput com mode correto', async () => {
    mockEndTurn('Plan complete')
    const agent = new Agent(new AnthropicProvider({ apiKey: 'test-key' }), projectRoot)
    const output = await agent.execute(makeTask(), makeContext(), 'plan')
    expect(output.mode).toBe('plan')
    expect(output.thought).toBe('Plan complete')
  })

  it('deve usar mode code como default', async () => {
    mockEndTurn('Code done')
    const agent = new Agent(new AnthropicProvider({ apiKey: 'test-key' }), projectRoot)
    const output = await agent.execute(makeTask(), makeContext())
    expect(output.mode).toBe('code')
  })

  it('deve incluir constraints na mensagem enviada à API', async () => {
    mockEndTurn('OK')
    const agent = new Agent(new AnthropicProvider({ apiKey: 'test-key' }), projectRoot)
    await agent.execute(makeTask({ constraints: ['no external deps'] }), makeContext())
    const content = mockCreate.mock.calls[0][0].messages[0].content
    expect(content).toContain('no external deps')
  })

  it('deve incluir arquivos de contexto na mensagem', async () => {
    mockEndTurn('OK')
    const ctx = makeContext({ files: [{ path: 'src/utils.ts', content: 'export const x = 1', tokens: 5, relevance: 'direct_dep' }] })
    const agent = new Agent(new AnthropicProvider({ apiKey: 'test-key' }), projectRoot)
    await agent.execute(makeTask(), ctx)
    const content = mockCreate.mock.calls[0][0].messages[0].content
    expect(content).toContain('src/utils.ts')
  })

  it('deve incluir evidencias do ContextPack sem incluir conteudo omitido', async () => {
    mockEndTurn('OK')
    const ctx = makeContext({
      pack: {
        request: 'implement token validation',
        profile: { root: projectRoot, languages: [], frameworks: [], workspaces: [], risks: [] },
        files: [{
          path: 'src/auth.ts',
          relevance: 'target',
          source: 'explicit',
          score: 100,
          reason: 'Explicitly affected by the task.',
          evidence: ['task.affectedFiles'],
          tokens: 3,
        }],
        validations: [{ kind: 'test', command: 'npm test', source: 'manifest', confidence: 0.95, safeToRun: true, scope: 'root', available: true }],
        instructions: [],
        errors: [],
        memories: [],
        omitted: { sensitiveFiles: ['.env'], overBudgetFiles: [] },
        budget: { maxTokens: 1000, tokensUsed: 3, fileCount: 1 },
      },
    })
    const agent = new Agent(new AnthropicProvider({ apiKey: 'test-key' }), projectRoot)
    await agent.execute(makeTask(), ctx)
    const content = mockCreate.mock.calls[0][0].messages[0].content
    expect(content).toContain('Context pack evidence')
    expect(content).toContain('Explicitly affected by the task.')
    expect(content).toContain('test: npm test')
    expect(content).toContain('Sensitive files omitted: .env')
    expect(content).not.toContain('SECRET=')
  })

  it('deve aceitar AgentProvider customizado', async () => {
    const mockProvider: AgentProvider = {
      generate: vi.fn(),
      capabilities: () => ({ supportsToolCalls: true, contextTokenLimit: 8_000 }),
      runAgentLoop: vi.fn().mockResolvedValue({
        thought: 'custom response', changes: [], tokensUsed: 50,
      } satisfies LLMResponse),
    }
    const agent = new Agent(mockProvider, projectRoot)
    const output = await agent.execute(makeTask(), makeContext(), 'fix')
    expect(output.thought).toBe('custom response')
    expect(mockProvider.runAgentLoop).toHaveBeenCalledOnce()
  })

  it('não deve enviar write_file em modo plan', async () => {
    mockEndTurn('Analysis only')
    const agent = new Agent(new AnthropicProvider({ apiKey: 'test-key' }), projectRoot)
    await agent.execute(makeTask(), makeContext(), 'plan')
    const tools: Array<{ name: string }> = mockCreate.mock.calls[0][0].tools ?? []
    const toolNames = tools.map(t => t.name)
    expect(toolNames).not.toContain('write_file')
    expect(toolNames).not.toContain('run_command')
  })
})
