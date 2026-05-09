import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createProviderPair } from '../src/llm-provider'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

function clearProviderEnv(): void {
  delete process.env.KOVA_LLM_PROVIDER
  delete process.env.KOVA_LLM_MODEL
  delete process.env.KOVA_LLM_BASE_URL
  delete process.env.KOVA_LLM_API_KEY
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.OPENAI_API_KEY
  delete process.env.DEEPSEEK_API_KEY
  delete process.env.KIMI_API_KEY
  delete process.env.MOONSHOT_API_KEY
  delete process.env.OLLAMA_BASE_URL
  delete process.env.OPENAI_COMPATIBLE_API_KEY
  delete process.env.OPENAI_COMPATIBLE_BASE_URL
  delete process.env.KOVA_AUTH_FILE
  delete process.env.KOVA_HOME
  delete process.env.KOVA_ONAUTH_LLM_BASE_URL
}

describe('createProviderPair', () => {
  it('retorna null quando nenhum provider esta configurado', () => {
    clearProviderEnv()
    expect(createProviderPair()).toBeNull()
  })

  it('seleciona DeepSeek por chave dedicada', () => {
    clearProviderEnv()
    process.env.DEEPSEEK_API_KEY = 'deepseek-key'
    const pair = createProviderPair()
    expect(pair?.description).toBe('deepseek:deepseek-v4-flash')
  })

  it('habilita Ollama local sem API key', () => {
    clearProviderEnv()
    process.env.KOVA_LLM_PROVIDER = 'ollama'
    const pair = createProviderPair()
    expect(pair?.description).toBe('ollama:qwen2.5-coder:7b')
  })

  it('suporta endpoint OpenAI-compatible customizado', () => {
    clearProviderEnv()
    process.env.KOVA_LLM_PROVIDER = 'openai-compatible'
    process.env.OPENAI_COMPATIBLE_API_KEY = 'custom-key'
    process.env.OPENAI_COMPATIBLE_BASE_URL = 'https://llm.example/v1'
    process.env.KOVA_LLM_MODEL = 'custom-model'
    const pair = createProviderPair()
    expect(pair?.description).toBe('openai-compatible:custom-model')
  })

  it('usa sessao OnAuth quando nenhuma API key esta configurada', () => {
    clearProviderEnv()
    const dir = mkdtempSync(join(tmpdir(), 'kova-auth-test-'))
    process.env.KOVA_AUTH_FILE = join(dir, 'auth.json')
    writeFileSync(process.env.KOVA_AUTH_FILE, JSON.stringify({
      type: 'oauth',
      provider: 'onauth',
      accessToken: 'oauth-token',
      baseUrl: 'https://kova.example/v1',
      model: 'kova-model',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    try {
      const pair = createProviderPair()
      expect(pair?.description).toBe('openai-compatible:kova-model')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('ignora sessao OnAuth expirada', () => {
    clearProviderEnv()
    const dir = mkdtempSync(join(tmpdir(), 'kova-auth-test-'))
    process.env.KOVA_AUTH_FILE = join(dir, 'auth.json')
    writeFileSync(process.env.KOVA_AUTH_FILE, JSON.stringify({
      type: 'oauth',
      provider: 'onauth',
      accessToken: 'oauth-token',
      baseUrl: 'https://kova.example/v1',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    try {
      expect(createProviderPair()).toBeNull()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
