import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:child_process', () => ({ exec: vi.fn() }))

import { exec } from 'node:child_process'
import { runTestsLayer } from '../../src/layers/tests'

const mockExec = vi.mocked(exec)

type ExecCb = (err: Error | null, stdout: string, stderr: string) => void

function mockSuccess() {
  mockExec.mockImplementation((...args: unknown[]) => {
    ;(args[args.length - 1] as ExecCb)(null, '', '')
  })
}

function mockFailure(stdout: string) {
  mockExec.mockImplementation((...args: unknown[]) => {
    const err = Object.assign(new Error('Tests failed'), { code: 1, killed: false, stdout })
    ;(args[args.length - 1] as ExecCb)(err, stdout, '')
  })
}

function mockTimeout() {
  mockExec.mockImplementation((...args: unknown[]) => {
    const err = Object.assign(new Error('timeout'), { killed: true, code: null, stdout: '' })
    ;(args[args.length - 1] as ExecCb)(err, '', '')
  })
}

const FAILURE_OUTPUT = `
 ✗ __tests__/foo.test.ts (3 tests | 1 failed) 10ms
   ✗ myFunc > deve retornar valor correto
     → expected 1 to be 2

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

  it('deve retornar erro genérico quando output não tem nomes de testes', async () => {
    mockFailure('Tests  2 failed | 1 passed (3)')
    const result = await runTestsLayer({ command: 'vitest run', projectRoot: '/tmp' })
    expect(result.passed).toBe(false)
    expect(result.errors[0].message).toContain('2 test(s) falharam')
  })

  it('deve retornar erro crítico quando timeout', async () => {
    mockTimeout()
    const result = await runTestsLayer({ command: 'vitest run', projectRoot: '/tmp', timeoutMs: 5000 })
    expect(result.passed).toBe(false)
    expect(result.errors[0].severity).toBe('critical')
    expect(result.errors[0].message).toContain('5000')
  })
})
