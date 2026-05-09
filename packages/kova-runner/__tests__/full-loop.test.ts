import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runFullLoop } from '../src/full-loop'

let tmpDir = ''
const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
  tmpDir = ''
})

describe('runFullLoop', () => {
  it('degrada sem provider configurado', async () => {
    clearProviderEnv()
    tmpDir = mkdtempSync(join(tmpdir(), 'kova-runner-loop-'))
    writeFileSync(join(tmpDir, 'package.json'), '{}')

    const result = await runFullLoop(tmpDir, {
      objective: 'Safely update the current file',
      affectedFiles: [],
    })

    expect(result.handled).toBe(false)
    expect(result.status).toBe('skipped')
    expect(result.reason).toContain('Nenhum provider LLM')
  })
})

function clearProviderEnv(): void {
  delete process.env.KOVA_LLM_PROVIDER
  delete process.env.KOVA_LLM_API_KEY
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.OPENAI_API_KEY
  delete process.env.DEEPSEEK_API_KEY
  delete process.env.KIMI_API_KEY
  delete process.env.MOONSHOT_API_KEY
  delete process.env.OLLAMA_BASE_URL
  delete process.env.OPENAI_COMPATIBLE_API_KEY
  delete process.env.OPENAI_COMPATIBLE_BASE_URL
}
