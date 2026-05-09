import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:child_process', () => ({ exec: vi.fn() }))

import { exec } from 'node:child_process'
import { runLintLayer } from '../../src/layers/lint'

const mockExec = vi.mocked(exec)
type ExecCb = (err: Error | null, stdout: string, stderr: string) => void

function mockSuccess() {
  mockExec.mockImplementation((...args: unknown[]) => {
    ;(args[args.length - 1] as ExecCb)(null, '', '')
  })
}

function mockFailure(stdout: string) {
  mockExec.mockImplementation((...args: unknown[]) => {
    const err = Object.assign(new Error('Lint failed'), { code: 1, killed: false, stdout })
    ;(args[args.length - 1] as ExecCb)(err, stdout, '')
  })
}

const ESLINT_OUTPUT = [
  "src/foo.ts:10:5: error 'x' is defined but never used [no-unused-vars]",
  'src/bar.ts:5:1: error Missing semicolon [semi]',
].join('\n')

describe('runLintLayer', () => {
  beforeEach(() => vi.resetAllMocks())

  it('deve retornar passed:true quando lint passa', async () => {
    mockSuccess()
    const result = await runLintLayer({ command: 'eslint .', projectRoot: '/tmp' })
    expect(result.passed).toBe(true)
    expect(result.name).toBe('lint')
    expect(result.errors).toHaveLength(0)
  })

  it('deve parsear erros com file:line do ESLint', async () => {
    mockFailure(ESLINT_OUTPUT)
    const result = await runLintLayer({ command: 'eslint .', projectRoot: '/tmp' })
    expect(result.passed).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(1)
    expect(result.errors[0].file).toBe('src/foo.ts')
    expect(result.errors[0].line).toBe(10)
  })

  it('deve capturar o nome da regra entre colchetes', async () => {
    mockFailure("src/a.ts:1:1: error Some problem [my-rule]")
    const result = await runLintLayer({ command: 'eslint .', projectRoot: '/tmp' })
    expect(result.errors[0].rule).toBe('my-rule')
  })

  it('deve retornar erro genérico quando output não tem file:line', async () => {
    mockFailure('Lint config error: cannot read config file')
    const result = await runLintLayer({ command: 'eslint .', projectRoot: '/tmp' })
    expect(result.passed).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toBeTruthy()
  })

  it('deve retornar erro quando timeout', async () => {
    mockExec.mockImplementation((...args: unknown[]) => {
      const err = Object.assign(new Error('timeout'), { killed: true, stdout: '' })
      ;(args[args.length - 1] as ExecCb)(err, '', '')
    })
    const result = await runLintLayer({ command: 'eslint .', projectRoot: '/tmp', timeoutMs: 5000 })
    expect(result.passed).toBe(false)
    expect(result.errors[0].message).toContain('5000')
  })
})
