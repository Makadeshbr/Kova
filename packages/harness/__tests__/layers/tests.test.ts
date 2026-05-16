import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@kova/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@kova/shared')>()
  return { ...actual, runCommandInvocation: vi.fn() }
})

import { runCommandInvocation } from '@kova/shared'
import { runTestsLayer } from '../../src/layers/tests'

const mockRun = vi.mocked(runCommandInvocation)

function commandResult(overrides: Partial<Awaited<ReturnType<typeof runCommandInvocation>>> = {}) {
  return {
    command: 'vitest run',
    cwd: '/tmp',
    kind: 'test' as const,
    stdout: '',
    stderr: '',
    exitCode: 0,
    durationMs: 5,
    startedAt: new Date().toISOString(),
    timedOut: false,
    ...overrides,
  }
}

function mockSuccess() {
  mockRun.mockResolvedValue(commandResult())
}

function mockFailure(stdout: string) {
  mockRun.mockResolvedValue(commandResult({ exitCode: 1, stdout }))
}

function mockTimeout() {
  mockRun.mockResolvedValue(commandResult({ exitCode: 1, timedOut: true }))
}

const FAILURE_OUTPUT = `
 FAILED myFunc > deve retornar valor correto
     -> expected 1 to be 2

 Test Files  1 failed (1)
       Tests  1 failed | 2 passed (3)
`

describe('runTestsLayer', () => {
  beforeEach(() => vi.resetAllMocks())

  it('deve retornar passed:true quando todos testes passam', async () => {
    mockSuccess()
    const result = await runTestsLayer({ command: 'vitest run', projectRoot: '/tmp' })
    expect(result.passed).toBe(true)
    expect(result.name).toBe('tests')
    expect(result.errors).toHaveLength(0)
  })

  it('deve retornar erros com nomes dos testes que falharam', async () => {
    mockFailure(FAILURE_OUTPUT)
    const result = await runTestsLayer({ command: 'vitest run', projectRoot: '/tmp' })
    expect(result.passed).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('myFunc > deve retornar valor correto')
  })

  it('deve retornar erro generico quando output nao tem nomes de testes', async () => {
    mockFailure('Tests  2 failed | 1 passed (3)')
    const result = await runTestsLayer({ command: 'vitest run', projectRoot: '/tmp' })
    expect(result.passed).toBe(false)
    expect(result.errors[0].message).toContain('2 test(s) failed')
  })

  it('deve retornar erro critico quando timeout', async () => {
    mockTimeout()
    const result = await runTestsLayer({ command: 'vitest run', projectRoot: '/tmp', timeoutMs: 5000 })
    expect(result.passed).toBe(false)
    expect(result.errors[0].severity).toBe('critical')
    expect(result.errors[0].message).toContain('5000')
  })
})
