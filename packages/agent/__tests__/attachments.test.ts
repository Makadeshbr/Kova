/**
 * Attachment round-trip tests across providers.
 *
 * Invariants:
 *   - Anthropic: image attachments → `image` content block (base64 source).
 *   - OpenAI-compatible: image attachments → `image_url` content part (data: URL).
 *   - Non-image attachments inline as text excerpts so they reach text-only models.
 *   - User messages without attachments keep the simpler string content shape.
 *   - Vision capability is detected per-model.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AgentMessage, Attachment } from '@kova/shared'
import { AnthropicProvider } from '../src/providers/anthropic'
import { OpenAICompatibleProvider } from '../src/providers/openai-compatible'
import { detectCapabilities } from '../src/providers/model-catalog'

function image(base64 = 'AAAA'): Attachment {
  return { kind: 'image', name: 'shot.png', mimeType: 'image/png', sizeBytes: 100, base64 }
}

function textFile(content = 'hello'): Attachment {
  return {
    kind: 'text', name: 'notes.txt', mimeType: 'text/plain',
    sizeBytes: content.length, base64: Buffer.from(content, 'utf-8').toString('base64'),
  }
}

describe('detectCapabilities — vision flag per model family', () => {
  it('marks Claude 4.x as vision-capable', () => {
    expect(detectCapabilities('claude-sonnet-4-6').supportsVision).toBe(true)
    expect(detectCapabilities('claude-opus-4-7').supportsVision).toBe(true)
  })

  it('marks Gemini 3.x as vision-capable', () => {
    expect(detectCapabilities('gemini-3.1-pro-preview').supportsVision).toBe(true)
    expect(detectCapabilities('gemini-3-flash-preview').supportsVision).toBe(true)
  })

  it('marks GPT-5.x as vision-capable, except codex/nano coding-tuned variants', () => {
    expect(detectCapabilities('gpt-5.5').supportsVision).toBe(true)
    expect(detectCapabilities('gpt-5.4-mini').supportsVision).toBe(true)
    expect(detectCapabilities('gpt-5.2-codex').supportsVision).toBeFalsy()
    expect(detectCapabilities('gpt-5.4-nano').supportsVision).toBeFalsy()
  })

  it('marks Grok 4.x as vision-capable', () => {
    expect(detectCapabilities('grok-4').supportsVision).toBe(true)
    expect(detectCapabilities('grok-4-fast-reasoning').supportsVision).toBe(true)
  })

  it('does NOT mark text-only families (DeepSeek chat, Kimi K2 base) as vision-capable', () => {
    expect(detectCapabilities('deepseek-chat').supportsVision).toBeFalsy()
    expect(detectCapabilities('deepseek-reasoner').supportsVision).toBeFalsy()
    expect(detectCapabilities('kimi-k2.6').supportsVision).toBeFalsy()
    expect(detectCapabilities('kimi-k2.6-thinking').supportsVision).toBeFalsy()
  })

  it('marks dedicated VL variants as vision-capable', () => {
    expect(detectCapabilities('deepseek-vl').supportsVision).toBe(true)
    expect(detectCapabilities('kimi-k2.6-vl').supportsVision).toBe(true)
    expect(detectCapabilities('qwen2.5-vl').supportsVision).toBe(true)
  })

  it('unknown models default to no vision', () => {
    expect(detectCapabilities('totally-made-up-model').supportsVision).toBeFalsy()
  })
})

// ─── Anthropic ────────────────────────────────────────────────────────────────

describe('AnthropicProvider — attachment round-trip', () => {
  let createMock: ReturnType<typeof vi.fn>
  let provider: AnthropicProvider

  beforeEach(() => {
    createMock = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      stop_reason: 'end_turn',
    })
    provider = new AnthropicProvider({ apiKey: 'fake', model: 'claude-sonnet-4-6' })
    // Replace the internal SDK client with our spy
    ;(provider as unknown as { client: { messages: { create: typeof createMock } } }).client = {
      messages: { create: createMock },
    } as never
  })

  it('expands image attachment into an image content block (base64 source)', async () => {
    const messages: AgentMessage[] = [
      { role: 'user', content: 'What is in this screenshot?', attachments: [image('PNGBYTES')] },
    ]
    await provider.generate(messages, { system: 'you help' })

    const call = createMock.mock.calls[0][0]
    const userMsg = call.messages[0]
    expect(userMsg.role).toBe('user')
    expect(Array.isArray(userMsg.content)).toBe(true)
    const imageBlock = userMsg.content.find((b: { type: string }) => b.type === 'image')
    expect(imageBlock).toBeDefined()
    expect(imageBlock.source.type).toBe('base64')
    expect(imageBlock.source.media_type).toBe('image/png')
    expect(imageBlock.source.data).toBe('PNGBYTES')
    // The user's prompt text travels as the trailing text block
    const lastBlock = userMsg.content[userMsg.content.length - 1]
    expect(lastBlock.type).toBe('text')
    expect(lastBlock.text).toBe('What is in this screenshot?')
  })

  it('text-only messages contain no image blocks (cache breakpoint may wrap text)', async () => {
    await provider.generate([{ role: 'user', content: 'hello' }])
    const userMsg = createMock.mock.calls[0][0].messages[0]
    // History cache breakpoint wraps the last message's content in an array with
    // a cache_control marker; what matters is that no image block was injected.
    const blocks = Array.isArray(userMsg.content)
      ? userMsg.content as Array<{ type: string; text?: string }>
      : [{ type: 'text', text: userMsg.content as string }]
    expect(blocks.some(b => b.type === 'image')).toBe(false)
    expect(blocks.some(b => b.text === 'hello')).toBe(true)
  })

  it('inlines text attachments as text blocks (not image blocks)', async () => {
    await provider.generate([{ role: 'user', content: 'summarize this', attachments: [textFile('line one\nline two')] }])
    const userMsg = createMock.mock.calls[0][0].messages[0]
    const blocks = userMsg.content as Array<{ type: string; text?: string }>
    expect(blocks.some(b => b.type === 'image')).toBe(false)
    const attBlock = blocks.find(b => b.text?.includes('attachment: notes.txt'))
    expect(attBlock?.text).toContain('line one')
    expect(attBlock?.text).toContain('line two')
  })

  it('reports supportsVision from the configured model', () => {
    const visionModel = new AnthropicProvider({ apiKey: 'fake', model: 'claude-sonnet-4-6' })
    expect(visionModel.capabilities().supportsVision).toBe(true)
  })
})

// ─── OpenAI-compatible ────────────────────────────────────────────────────────

describe('OpenAICompatibleProvider — attachment round-trip', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let provider: OpenAICompatibleProvider
  // Capture the original fetch (may be undefined in pure-node test envs) so
  // beforeEach's stub doesn't leak into the next file — restoring keeps test
  // isolation correct when other suites assume a real fetch.
  const originalFetch = (globalThis as { fetch?: typeof fetch }).fetch

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok', role: 'assistant' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    })
    ;(globalThis as { fetch: typeof fetchMock }).fetch = fetchMock
    provider = new OpenAICompatibleProvider({ apiKey: 'fake', baseUrl: 'http://x', model: 'gpt-5.5' })
  })

  afterEach(() => {
    if (originalFetch) {
      ;(globalThis as { fetch: typeof fetch }).fetch = originalFetch
    } else {
      delete (globalThis as { fetch?: typeof fetch }).fetch
    }
  })

  it('expands image attachment into an image_url content part (data: URL)', async () => {
    const messages: AgentMessage[] = [
      { role: 'user', content: 'what is this?', attachments: [image('JPEGBYTES')] },
    ]
    await provider.generate(messages, { system: 'you help' })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const userMsg = body.messages.find((m: { role: string }) => m.role === 'user')
    expect(Array.isArray(userMsg.content)).toBe(true)
    const imagePart = userMsg.content.find((p: { type: string }) => p.type === 'image_url')
    expect(imagePart).toBeDefined()
    expect(imagePart.image_url.url).toBe('data:image/png;base64,JPEGBYTES')
    const lastPart = userMsg.content[userMsg.content.length - 1]
    expect(lastPart.type).toBe('text')
    expect(lastPart.text).toBe('what is this?')
  })

  it('keeps simple string content for messages without attachments', async () => {
    await provider.generate([{ role: 'user', content: 'hello' }])
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const userMsg = body.messages.find((m: { role: string }) => m.role === 'user')
    expect(userMsg.content).toBe('hello')
  })

  it('inlines text attachments as text parts (not image_url)', async () => {
    await provider.generate([{ role: 'user', content: 'summarize', attachments: [textFile('hello')] }])
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const userMsg = body.messages.find((m: { role: string }) => m.role === 'user')
    const parts = userMsg.content as Array<{ type: string; text?: string }>
    expect(parts.some(p => p.type === 'image_url')).toBe(false)
    expect(parts.find(p => p.text?.includes('attachment: notes.txt'))?.text).toContain('hello')
  })

  it('reports supportsVision based on the configured model', () => {
    const visionProvider = new OpenAICompatibleProvider({ apiKey: 'fake', baseUrl: 'http://x', model: 'gemini-3.1-pro-preview' })
    expect(visionProvider.capabilities().supportsVision).toBe(true)
    const textOnlyProvider = new OpenAICompatibleProvider({ apiKey: 'fake', baseUrl: 'http://x', model: 'deepseek-chat' })
    expect(textOnlyProvider.capabilities().supportsVision).toBeFalsy()
  })
})
