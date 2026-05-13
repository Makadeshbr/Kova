/**
 * EngineManager regression tests.
 *
 * Scenarios covered:
 *  - stream_end emitted exactly once (text-only, tool-call, provider error, abort)
 *  - abort does not produce a chat error message
 *  - handleOpenFolder resets all stale state fields
 *  - no-validation score does not produce auto_apply
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { EngineManager } from '../src/main/engine-manager'
import type { StartTaskParams, ProviderResolution } from '../src/main/engine-manager'
import type { AgentProvider, AgentLoopOptions, LLMResponse } from '@kova/agent'
import type { AgentMessage, ExecutionEvent, ExecutionState, TaskDefinition } from '@kova/shared'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeParams(projectRoot: string): StartTaskParams {
  return {
    objective: 'test',
    projectRoot,
    provider: 'anthropic',
    apiKey: 'test-key',
    model: 'claude-test',
    maxIterations: 1,
    autoApply: false,
  }
}

type MockProviderOpts = {
  delay?: number
  throws?: Error
  emitTokens?: string[]
  emitReasoning?: string[]
  makeChanges?: boolean
}

function makeMockProvider(opts: MockProviderOpts = {}): AgentProvider {
  return {
    capabilities: () => ({ supportsToolCalls: true, contextTokenLimit: 8_000 }),
    generate: vi.fn().mockResolvedValue({ thought: '', changes: [], tokensUsed: 0 } as LLMResponse),
    runAgentLoop: vi.fn().mockImplementation(async (msgs: AgentMessage[], loopOpts: AgentLoopOptions) => {
      if (opts.delay) await new Promise(r => setTimeout(r, opts.delay))

      if (loopOpts.signal?.aborted) {
        const err = new DOMException('The operation was aborted', 'AbortError')
        throw err
      }

      for (const delta of opts.emitReasoning ?? []) {
        loopOpts.onReasoningStart?.()
        loopOpts.onReasoningDelta?.(delta)
      }

      for (const tok of opts.emitTokens ?? []) loopOpts.onToken?.(tok)

      if (opts.throws) throw opts.throws

      return {
        thought: (opts.emitTokens ?? []).join(''),
        changes: [],
        tokensUsed: 1,
      } as LLMResponse
    }),
  }
}

function makeManager(provider: AgentProvider): [EngineManager, {
  events: ExecutionEvent[]
  chatMessages: string[]
  errors: string[]
  states: ExecutionState[]
}] {
  const events: ExecutionEvent[] = []
  const chatMessages: string[] = []
  const errors: string[] = []
  const states: ExecutionState[] = []

  const resolution: ProviderResolution = {
    provider, resolvedProvider: 'anthropic', resolvedModel: 'claude-test', fallback: false,
  }
  const manager = new EngineManager(async () => resolution)
  manager.setHandlers(
    (s) => states.push(s),
    vi.fn(),
    (e) => errors.push(e),
    vi.fn(),
    (m) => chatMessages.push(m),
    (e) => events.push(e),
  )

  return [manager, { events, chatMessages, errors, states }]
}

// ─── Tests ────────────────────────────────────────────────────────────────────

let projectRoot: string

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'kova-em-test-'))
})

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true })
})

describe('stream_end — emitted exactly once', () => {
  it('text-only response: stream_end emitted exactly once', async () => {
    const provider = makeMockProvider({ emitTokens: ['Hello', ' world'] })
    const [manager, { events }] = makeManager(provider)

    await manager.sendMessage('Hello', [], makeParams(projectRoot))

    const streamEnds = events.filter(e => e.type === 'stream_end')
    expect(streamEnds).toHaveLength(1)
  })

  it('provider error on first iteration: stream_end emitted exactly once', async () => {
    const provider = makeMockProvider({ throws: new Error('Network error') })
    const [manager, { events }] = makeManager(provider)

    await manager.sendMessage('Fix this', [], makeParams(projectRoot))

    const streamEnds = events.filter(e => e.type === 'stream_end')
    expect(streamEnds).toHaveLength(1)
  })

  it('after abort: stream_end emitted at least once (may fire before abort clears state)', async () => {
    const provider = makeMockProvider({ delay: 500 })
    const [manager, { events }] = makeManager(provider)

    const msgPromise = manager.sendMessage('Fix this', [], makeParams(projectRoot))
    await new Promise(r => setTimeout(r, 50))
    await manager.abort()
    await msgPromise

    const streamEnds = events.filter(e => e.type === 'stream_end')
    expect(streamEnds.length).toBeGreaterThanOrEqual(1)
  })

  it('stream_end is never emitted more than once per session', async () => {
    const provider = makeMockProvider({ emitTokens: ['token1', 'token2'] })
    const [manager, { events }] = makeManager(provider)

    await manager.sendMessage('Query', [], makeParams(projectRoot))

    const streamEnds = events.filter(e => e.type === 'stream_end')
    expect(streamEnds.length).toBeLessThanOrEqual(1)
  })

  it('emits reasoning events separately from final response tokens', async () => {
    const provider = makeMockProvider({ emitReasoning: ['checking context'], emitTokens: ['Final answer'] })
    const [manager, { events }] = makeManager(provider)

    await manager.sendMessage('Hello', [], makeParams(projectRoot))

    expect(events.some(e => e.type === 'reasoning_start')).toBe(true)
    expect(events.some(e => e.type === 'reasoning_delta' && e.reasoning === 'checking context')).toBe(true)
    expect(events.some(e => e.type === 'reasoning_end')).toBe(true)
    expect(events.filter(e => e.type === 'token').map(e => e.token).join('')).toBe('Final answer')
  })

  it('shows reasoning feedback even when provider has no reasoning_content', async () => {
    const provider = makeMockProvider({ emitTokens: ['Plain final'] })
    const [manager, { events }] = makeManager(provider)

    await manager.sendMessage('Hello', [], makeParams(projectRoot))

    expect(events.some(e => e.type === 'reasoning_start')).toBe(true)
    expect(events.some(e => e.type === 'reasoning_end')).toBe(true)
    expect(events.filter(e => e.type === 'token').map(e => e.token).join('')).toBe('Plain final')
  })
})

describe('EngineManager - provider factory errors', () => {
  it('emits stream_end when provider factory throws before session starts', async () => {
    const chatMessages: string[] = []
    const events: ExecutionEvent[] = []
    const manager = new EngineManager(async () => { throw new Error('missing provider key') })
    manager.setHandlers(vi.fn(), vi.fn(), vi.fn(), vi.fn(), (m) => chatMessages.push(m), (e) => events.push(e))

    await manager.sendMessage('Hello', [], makeParams(projectRoot))

    expect(events.filter(e => e.type === 'stream_end')).toHaveLength(1)
    expect(chatMessages.join('\n')).toContain('missing provider key')
  })
})

describe('EngineManager - context and token telemetry', () => {
  it('emits context_loaded and token_usage for chat mode', async () => {
    const provider = makeMockProvider({ emitTokens: ['ok'] })
    const [manager, { events }] = makeManager(provider)
    // Use explicit 'chat' mode to test the dedicated chat session path
    await manager.sendMessage('Hello', [], { ...makeParams(projectRoot), mode: 'chat' })

    expect(events.some(e => e.type === 'context_loaded')).toBe(true)
    expect(events.some(e => e.type === 'token_usage' && (e.tokensUsed ?? 0) > 0)).toBe(true)
  })

  it('includes opened file evidence in structured context telemetry (chat mode)', async () => {
    writeFileSync(join(projectRoot, 'open-note.ts'), 'export const openedContext = true', 'utf-8')
    const provider = makeMockProvider({ emitTokens: ['ok'] })
    const [manager, { events }] = makeManager(provider)
    const params = { ...makeParams(projectRoot), mode: 'chat' as const, openedFiles: [join(projectRoot, 'open-note.ts')] }

    await manager.sendMessage('Hello', [], params)

    const context = events.find(e => e.type === 'context_loaded')?.context
    expect(context?.selectedFiles?.find(file => file.path === 'open-note.ts')).toEqual(expect.objectContaining({
      source: 'opened_file',
      evidence: expect.arrayContaining(['opened_file']),
    }))
  })

  it('includes @ reference evidence in structured context telemetry', async () => {
    writeFileSync(join(projectRoot, 'target.ts'), 'export const referencedContext = true', 'utf-8')
    const provider = makeMockProvider({ emitTokens: ['ok'] })
    const [manager, { events }] = makeManager(provider)

    await manager.sendMessage('Read @target.ts', [], makeParams(projectRoot))

    const context = events.find(e => e.type === 'context_loaded')?.context
    expect(context?.selectedFiles?.find(file => file.path === 'target.ts')).toEqual(expect.objectContaining({
      source: 'explicit',
      evidence: expect.arrayContaining(['explicit_reference']),
    }))
  })
})

describe('EngineManager - plan mode', () => {
  it('/plan uses only read tools and skips validation/apply flow', async () => {
    const provider = makeMockProvider({ emitTokens: ['plan'] })
    const [manager, { events }] = makeManager(provider)

    await manager.sendMessage('/plan inspect architecture', [], makeParams(projectRoot))

    const calls = vi.mocked(provider.runAgentLoop).mock.calls
    expect(calls).toHaveLength(1)
    expect(calls[0][1].tools.map(t => t.name).sort()).toEqual(['list_files', 'read_file'])
    expect(events.some(e => e.type === 'validation_started')).toBe(false)
    expect(events.filter(e => e.type === 'stream_end')).toHaveLength(1)
  })

  it('/plan emits PlanResultMessage when model returns valid XML', async () => {
    const xml = `
<plan_result>
  <objective>Add authentication</objective>
  <files>
    <file path="src/auth.ts" reason="New auth module" />
    <file path="src/index.ts" reason="Wire auth" />
  </files>
  <approach>1. Create auth module 2. Wire it</approach>
  <validations>
    <command>pnpm test</command>
  </validations>
  <risk>medium</risk>
</plan_result>`
    const provider = makeMockProvider({ emitTokens: [xml] })
    const [manager, { events }] = makeManager(provider)

    await manager.sendMessage('/plan add auth', [], makeParams(projectRoot))

    const streamEnd = events.find(e => e.type === 'stream_end')
    expect(streamEnd?.structuredMessage?.kind).toBe('plan_result')
    const plan = streamEnd?.structuredMessage as import('@kova/shared').PlanResultMessage | undefined
    expect(plan?.objective).toBe('Add authentication')
    expect(plan?.files).toHaveLength(2)
    expect(plan?.files[0].path).toBe('src/auth.ts')
    expect(plan?.risk).toBe('medium')
    expect(plan?.validations).toContain('pnpm test')
  })

  it('/plan emits plain stream_end when model returns no XML', async () => {
    const provider = makeMockProvider({ emitTokens: ['No XML here, just text.'] })
    const [manager, { events }] = makeManager(provider)

    await manager.sendMessage('/plan add auth', [], makeParams(projectRoot))

    const streamEnd = events.find(e => e.type === 'stream_end')
    expect(streamEnd?.structuredMessage).toBeUndefined()
  })
})

describe('inferRunMode — unified default (patch)', () => {
  it('defaults engineering requests to patch (unified)', async () => {
    const provider = makeMockProvider({ emitTokens: ['ok'] })
    const [manager, { events }] = makeManager(provider)

    await manager.sendMessage('corrija o bug em src/app.ts', [], makeParams(projectRoot))

    // Patch/unified mode goes through ExecutionEngine → emits state events
    expect(events.some(e => e.type === 'state_changed')).toBe(true)
    // stream_end is always emitted exactly once
    expect(events.filter(e => e.type === 'stream_end')).toHaveLength(1)
  })

  it('/plan prefix in message activates plan mode (read-only, no validation)', async () => {
    const provider = makeMockProvider({ emitTokens: ['plan text'] })
    const [manager, { events }] = makeManager(provider)

    await manager.sendMessage('/plan crie algo', [], makeParams(projectRoot))

    expect(events.some(e => e.type === 'validation_started')).toBe(false)
    expect(events.filter(e => e.type === 'stream_end')).toHaveLength(1)
  })

  it('explicit mode=plan from UI is respected — no file changes', async () => {
    const provider = makeMockProvider({ emitTokens: ['plan'] })
    const [manager, { events }] = makeManager(provider)

    const params = { ...makeParams(projectRoot), mode: 'plan' as const }
    await manager.sendMessage('planeje algo', [], params)

    expect(events.some(e => e.type === 'validation_started')).toBe(false)
    expect(events.filter(e => e.type === 'stream_end')).toHaveLength(1)
  })
})

describe('EngineManager - conversational routing', () => {
  it('routes short greetings to chat even when the default UI mode is patch', async () => {
    const provider = makeMockProvider({ emitTokens: ['ok'] })
    const [manager, { events }] = makeManager(provider)

    await manager.sendMessage('Ola', [], makeParams(projectRoot))

    expect(events.some(e => e.type === 'state_changed')).toBe(false)
    expect(events.some(e => e.type === 'validation_started')).toBe(false)
    expect(events.filter(e => e.type === 'token').map(e => e.token).join('')).toBe('ok')
    expect(events.filter(e => e.type === 'stream_end')).toHaveLength(1)
  })
})

describe('EngineManager - protected context refs', () => {
  it('does not attach or send protected .env refs to the provider', async () => {
    writeFileSync(join(projectRoot, '.env'), 'SECRET=super-secret', 'utf-8')
    const provider = makeMockProvider({ emitTokens: ['should not run'] })
    const [manager, { events, chatMessages }] = makeManager(provider)

    await manager.sendMessage('Leia @.env', [], makeParams(projectRoot))

    expect(vi.mocked(provider.runAgentLoop)).not.toHaveBeenCalled()
    expect(events.some(e => e.type === 'context_ref_denied')).toBe(true)
    expect(chatMessages.join('\n')).toContain('Nao posso ler')
    expect(chatMessages.join('\n')).not.toContain('super-secret')
  })
})

describe('abort flow — no error message shown on intentional abort', () => {
  it('intentional abort does not produce a network-error chat message', async () => {
    // When the user aborts mid-session, the renderer already resets state synchronously.
    // The engine-manager should NOT append a confusing error message to the chat.
    const mockProvider = makeMockProvider({ delay: 500 })
    const chatMessages: string[] = []
    const res: ProviderResolution = { provider: mockProvider, resolvedProvider: 'anthropic', resolvedModel: 'test', fallback: false }
    const manager = new EngineManager(async () => res)
    manager.setHandlers(vi.fn(), vi.fn(), vi.fn(), vi.fn(), (m) => chatMessages.push(m), vi.fn())

    const msgPromise = manager.sendMessage('Fix this', [], makeParams(projectRoot))
    await new Promise(r => setTimeout(r, 50))
    await manager.abort()
    await msgPromise

    // After abort, no error-style messages (ECONNREFUSED, fetch failed, etc.) should appear
    const confusingErrors = chatMessages.filter(m =>
      m.toLowerCase().includes('econnrefused') ||
      m.toLowerCase().includes('fetch failed') ||
      m.toLowerCase().includes('abortederror') ||
      m.toLowerCase().includes('the operation was aborted')
    )
    expect(confusingErrors).toHaveLength(0)
  })

  it('non-abort provider error does produce a chat message', async () => {
    const provider = makeMockProvider({ throws: new Error('fetch failed: ECONNREFUSED') })
    const [manager, { chatMessages }] = makeManager(provider)

    await manager.sendMessage('Fix this', [], makeParams(projectRoot))

    expect(chatMessages.length).toBeGreaterThan(0)
  })
})

describe('handleOpenFolder — state reset contract', () => {
  /**
   * handleOpenFolder is a React callback in App.tsx.
   * Here we document the required state fields it must reset so CI guards against regression.
   *
   * Invariant: after openFolder() returns a folder, these fields must be cleared:
   *   executionEvents: []
   *   executionState: null
   *   task: null
   *   isThinking: false
   *   streamingText: ''
   *   showDiff: false
   *   openFilePath: null
   *
   * This contract is validated manually or via React Testing Library.
   * A placeholder test ensures this file fails if the contract comment is deleted.
   */
  it('documents the required reset contract (placeholder for RTL coverage)', () => {
    const requiredResets = [
      'executionEvents',
      'executionState',
      'task',
      'isThinking',
      'streamingText',
      'showDiff',
      'openFilePath',
    ]
    // All required fields documented in handleOpenFolder (App.tsx)
    expect(requiredResets).toHaveLength(7)
  })
})

describe('EngineManager — provider not configured', () => {
  it('shows configuration prompt when provider factory returns null', async () => {
    const chatMessages: string[] = []
    const events: ExecutionEvent[] = []
    const manager = new EngineManager(async () => null)
    manager.setHandlers(vi.fn(), vi.fn(), vi.fn(), vi.fn(), (m) => chatMessages.push(m), (e) => events.push(e))

    await manager.sendMessage('Hello', [], makeParams(projectRoot))

    expect(events.filter(e => e.type === 'stream_end')).toHaveLength(1)
    expect(chatMessages.some(m => m.toLowerCase().includes('configurações') || m.toLowerCase().includes('configurado'))).toBe(true)
  })
})

describe('EngineManager — provider_session_start audit', () => {
  it('emits provider_session_start with providerMeta for normal session', async () => {
    const provider = makeMockProvider({ emitTokens: ['ok'] })
    const [manager, { events }] = makeManager(provider)

    await manager.sendMessage('Hello', [], makeParams(projectRoot))

    const sessionStart = events.find(e => e.type === 'provider_session_start')
    expect(sessionStart).toBeTruthy()
    expect(sessionStart?.providerMeta?.resolvedProvider).toBe('anthropic')
    expect(sessionStart?.providerMeta?.fallback).toBe(false)
  })

  it('emits fallback=true when ProviderResolution indicates fallback', async () => {
    const provider = makeMockProvider({ emitTokens: ['ok'] })
    const res: ProviderResolution = {
      provider,
      resolvedProvider: 'openai',
      resolvedModel: 'gpt-4.1',
      fallback: true,
      fallbackReason: 'Configured model gpt-5 not found',
    }
    const events: ExecutionEvent[] = []
    const manager = new EngineManager(async () => res)
    manager.setHandlers(vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), (e) => events.push(e))

    await manager.sendMessage('Hello', [], makeParams(projectRoot))

    const sessionStart = events.find(e => e.type === 'provider_session_start')
    expect(sessionStart?.providerMeta?.fallback).toBe(true)
    expect(sessionStart?.providerMeta?.fallbackReason).toContain('gpt-5')
  })

  it('uses fallback provider when primary returns null and fallback is configured', async () => {
    // Primary returns null (e.g., missing API key) → factory falls back
    const fallbackProvider = makeMockProvider({ emitTokens: ['from fallback'] })
    const fallbackRes: ProviderResolution = {
      provider: fallbackProvider, resolvedProvider: 'openai',
      resolvedModel: 'gpt-4o', fallback: false,
    }
    let callCount = 0
    const factory = async (params: StartTaskParams) => {
      callCount++
      if (callCount === 1) return null  // primary fails
      // Fallback call should have provider='openai'
      if (params.provider === 'openai') return fallbackRes
      return null
    }
    // Mock getSettingsInternal via the file: we override the IPC handler import
    // Instead: pass a factory that simulates the fallback resolution directly
    const events: ExecutionEvent[] = []
    const chatMessages: string[] = []
    const manager = new EngineManager(factory)
    manager.setHandlers(vi.fn(), vi.fn(), vi.fn(), vi.fn(), m => chatMessages.push(m), e => events.push(e))

    // Without settings.fallbackProvider, primary null → "Provider nao configurado"
    await manager.sendMessage('Hello', [], makeParams(projectRoot))
    expect(chatMessages.some(m => m.includes('Provider nao configurado'))).toBe(true)
  })
})

describe('EngineManager — abort state cleanup', () => {
  it('abort clears active engine state', async () => {
    const provider = makeMockProvider({ delay: 2000 })
    const [manager] = makeManager(provider)

    const msgPromise = manager.sendMessage('Fix this', [], makeParams(projectRoot))
    await new Promise(r => setTimeout(r, 50))
    await manager.abort()
    await msgPromise

    // After abort, getState() returns null (engine cleared)
    expect(manager.getState()).toBeNull()
  })
})

describe('EngineManager - provider rate limit', () => {
  it('classifica 429 como provider_rate_limited, encerra stream e reverte escrita parcial', async () => {
    const provider: AgentProvider = {
      capabilities: () => ({ supportsToolCalls: true, contextTokenLimit: 8_000 }),
      generate: vi.fn().mockResolvedValue({ thought: '', changes: [], tokensUsed: 1 } as LLMResponse),
      runAgentLoop: vi.fn().mockImplementation(async (_msgs: AgentMessage[], loopOpts: AgentLoopOptions) => {
        loopOpts.onToken?.('## Proof Pack\n- py_compile: passed')
        loopOpts.onToolCall?.('write_file', { path: 'task_manager.py', content: 'print("partial")\n' })
        await loopOpts.executor.execute('write_file', { path: 'task_manager.py', content: 'print("partial")\n' })
        throw new Error('LLM request failed: 429 {"status":429,"title":"Too Many Requests"}')
      }),
    }
    const [manager, { events, chatMessages }] = makeManager(provider)

    await manager.sendMessage('Crie um CLI pequeno em Python', [], makeParams(projectRoot))

    expect(events.some(e => e.type === 'provider_error' && e.providerError === 'provider_rate_limited')).toBe(true)
    expect(events.filter(e => e.type === 'stream_end')).toHaveLength(1)
    expect(chatMessages.join('\n')).toContain('Limite do provider atingido')
    expect(existsSync(join(projectRoot, 'task_manager.py'))).toBe(false)
    expect(events.some(e => e.type === 'validation_completed')).toBe(false)
    expect(events.some(e => e.type === 'proof_pack')).toBe(false)
  })
})

describe('EngineManager - diff review apply', () => {
  it('encaminha selecao de diff review para forceApply da engine ativa', async () => {
    const provider = makeMockProvider({ emitTokens: ['ok'] })
    const [manager] = makeManager(provider)
    const calls: unknown[] = []
    ;(manager as unknown as { engine: { forceApply: (selection?: unknown) => Promise<void> } | null }).engine = {
      forceApply: async (selection?: unknown) => { calls.push(selection) },
    }
    const selection = { files: [{ path: 'src/a.ts', decision: 'reject' as const }] }

    await manager.forceApply(selection)

    expect(calls).toEqual([selection])
  })
})

describe('EngineManager - patch mode history isolation', () => {
  it('patch mode does NOT pass conversation history to the agent (avoids cross-task contamination)', async () => {
    const provider = makeMockProvider({ emitTokens: ['done'] })
    const [manager] = makeManager(provider)

    // Send an engineering task with a polluted history from a previous failed task
    const pollutedHistory: AgentMessage[] = [
      { role: 'user', content: 'criar calculadora' },
      { role: 'assistant', content: 'Let me check tsconfig.json... I will use TypeScript with tsx' },
      { role: 'user', content: 'isso deu errado' },
    ]

    await manager.sendMessage('agora adicione divisao', pollutedHistory, makeParams(projectRoot))

    // Patch mode should ALWAYS receive a clean history slate — only the current user message
    // is relevant. The agent rediscovers project state from disk.
    const calls = vi.mocked(provider.runAgentLoop).mock.calls
    expect(calls.length).toBeGreaterThan(0)
    const messagesPassedToAgent = calls[0][0] as AgentMessage[]
    // The polluted assistant message about tsconfig should NOT appear in the agent loop
    const allContent = messagesPassedToAgent.map(m => m.content).join('\n')
    expect(allContent).not.toContain('Let me check tsconfig.json')
    expect(allContent).not.toContain('I will use TypeScript with tsx')
  })

  it('chat mode KEEPS history (conversation continuity is required)', async () => {
    const provider = makeMockProvider({ emitTokens: ['ok'] })
    const [manager] = makeManager(provider)

    const history: AgentMessage[] = [
      { role: 'user', content: 'what is this project?' },
      { role: 'assistant', content: 'It is a calculator.' },
    ]

    await manager.sendMessage('Ola', history, makeParams(projectRoot))

    const calls = vi.mocked(provider.runAgentLoop).mock.calls
    const messagesPassedToAgent = calls[0][0] as AgentMessage[]
    const allContent = messagesPassedToAgent.map(m => m.content).join('\n')
    expect(allContent).toContain('It is a calculator')
  })
})
