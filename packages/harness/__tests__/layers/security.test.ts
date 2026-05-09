import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:child_process', () => ({ exec: vi.fn() }))

import { exec } from 'node:child_process'
import { runSecurityLayer } from '../../src/layers/security'
import type { FileChange } from '@kova/shared'

const mockExec = vi.mocked(exec)
type ExecCb = (err: Error | null, stdout: string, stderr: string) => void

function makeChange(diff: string, path = 'src/config.ts'): FileChange {
  return { path, type: 'modify', diff }
}

function mockSemgrepMissing() {
  mockExec.mockImplementation((...args: unknown[]) => {
    const err = new Error('semgrep: command not found')
    ;(args[args.length - 1] as ExecCb)(err, '', '')
  })
}

const cfg = { projectRoot: '/tmp' }

describe('runSecurityLayer — detecção de secrets', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockSemgrepMissing() // semgrep ausente por padrão — secrets retornam antes dele
  })

  it('deve detectar OpenAI API key hardcoded', async () => {
    const diff = '+const key = "sk-abcdefghijklmnopqrstuvwxyz12345"'
    const result = await runSecurityLayer({ changes: [makeChange(diff)], ...cfg })
    expect(result.passed).toBe(false)
    expect(result.errors[0].severity).toBe('critical')
    expect(result.errors[0].message).toContain('OpenAI API key')
  })

  it('deve detectar AWS access key', async () => {
    const diff = '+const awsKey = "AKIAIOSFODNN7EXAMPLE"'
    const result = await runSecurityLayer({ changes: [makeChange(diff)], ...cfg })
    expect(result.passed).toBe(false)
    expect(result.errors[0].message).toContain('AWS access key')
  })

  it('deve detectar password hardcoded', async () => {
    const diff = '+const pwd = password = "superSecret123"'
    const result = await runSecurityLayer({ changes: [makeChange(diff)], ...cfg })
    expect(result.passed).toBe(false)
    expect(result.errors[0].message).toContain('Hardcoded password')
  })

  it('deve ignorar linhas removidas (-)', async () => {
    const diff = '-const key = "sk-abcdefghijklmnopqrstuvwxyz12345"'
    const result = await runSecurityLayer({ changes: [makeChange(diff)], ...cfg })
    expect(result.passed).toBe(true)
  })
})

describe('runSecurityLayer — semgrep', () => {
  beforeEach(() => vi.resetAllMocks())

  it('deve retornar passed:true com warning quando semgrep não está disponível', async () => {
    mockSemgrepMissing()
    const result = await runSecurityLayer({ changes: [makeChange('+const x = 1')], ...cfg })
    expect(result.passed).toBe(true)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].message).toContain('Semgrep')
  })

  it('deve retornar erro crítico de secret sem chamar semgrep', async () => {
    // exec não deve ser chamado quando há secret (retorno antecipado)
    const diff = '+const key = "sk-abcdefghijklmnopqrstuvwxyz12345"'
    const result = await runSecurityLayer({ changes: [makeChange(diff)], ...cfg })
    expect(result.passed).toBe(false)
    expect(mockExec).not.toHaveBeenCalled()
  })
})
