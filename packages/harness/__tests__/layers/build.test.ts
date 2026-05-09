import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:child_process', () => ({ exec: vi.fn() }))

import { exec } from 'node:child_process'
import { runBuildLayer } from '../../src/layers/build'

const mockExec = vi.mocked(exec)

type ExecCb = (err: Error | null, stdout: string, stderr: string) => void

function mockSuccess() {
  mockExec.mockImplementation((...args: unknown[]) => {
    ;(args[args.length - 1] as ExecCb)(null, '', '')
  })
}

function mockFailure(output: string, viaStdout = false) {
  mockExec.mockImplementation((...args: unknown[]) => {
    const err = Object.assign(new Error('Build failed'), {
      code: 1,
      killed: false,
      stderr: viaStdout ? '' : output,
      stdout: viaStdout ? output : '',
    })
    ;(args[args.length - 1] as ExecCb)(err, viaStdout ? output : '', viaStdout ? '' : output)
  })
}

function mockTimeout() {
  mockExec.mockImplementation((...args: unknown[]) => {
    const err = Object.assign(new Error('timeout'), { killed: true, code: null })
    ;(args[args.length - 1] as ExecCb)(err, '', '')
  })
}

describe('runBuildLayer', () => {
  beforeEach(() => vi.resetAllMocks())

  it('deve retornar passed:true quando build tem sucesso', async () => {
    mockSuccess()
    const result = await runBuildLayer({ command: 'tsc', projectRoot: '/tmp' })
    expect(result.passed).toBe(true)
    expect(result.name).toBe('build')
    expect(result.errors).toHaveLength(0)
  })

  it('deve parsear erros TypeScript do stderr', async () => {
    mockFailure("src/foo.ts(10,5): error TS2345: Type 'string' is not assignable.")
    const result = await runBuildLayer({ command: 'tsc', projectRoot: '/tmp' })
    expect(result.passed).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].file).toBe('src/foo.ts')
    expect(result.errors[0].line).toBe(10)
    expect(result.errors[0].rule).toBe('TS2345')
  })

  it('deve parsear múltiplos erros', async () => {
    const stderr = [
      "src/a.ts(1,1): error TS1001: Error one.",
      "src/b.ts(5,3): error TS2002: Error two.",
    ].join('\n')
    mockFailure(stderr)
    const result = await runBuildLayer({ command: 'tsc', projectRoot: '/tmp' })
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0].file).toBe('src/a.ts')
    expect(result.errors[1].file).toBe('src/b.ts')
  })

  it('deve retornar erro genérico quando stderr não tem formato TypeScript', async () => {
    mockFailure('something went wrong')
    const result = await runBuildLayer({ command: 'tsc', projectRoot: '/tmp' })
    expect(result.passed).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toBe('something went wrong')
  })

  it('deve retornar erro crítico quando build timeout', async () => {
    mockTimeout()
    const result = await runBuildLayer({ command: 'tsc', projectRoot: '/tmp', timeoutMs: 5000 })
    expect(result.passed).toBe(false)
    expect(result.errors[0].severity).toBe('critical')
    expect(result.errors[0].message).toContain('5000')
  })
})
