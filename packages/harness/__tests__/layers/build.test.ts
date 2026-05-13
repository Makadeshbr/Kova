import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@kova/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@kova/shared')>()
  return { ...actual, runCommandInvocation: vi.fn() }
})

import { runCommandInvocation } from '@kova/shared'
import { runBuildLayer } from '../../src/layers/build'

const mockRun = vi.mocked(runCommandInvocation)

function commandResult(overrides: Partial<Awaited<ReturnType<typeof runCommandInvocation>>> = {}) {
  return {
    command: 'tsc',
    cwd: '/tmp',
    kind: 'build' as const,
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

function mockFailure(output: string, viaStdout = false) {
  mockRun.mockResolvedValue(commandResult({
    exitCode: 1,
    stderr: viaStdout ? '' : output,
    stdout: viaStdout ? output : '',
  }))
}

function mockTimeout() {
  mockRun.mockResolvedValue(commandResult({ exitCode: 1, timedOut: true }))
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

  it('deve parsear multiplos erros', async () => {
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

  it('deve retornar erro generico quando stderr nao tem formato TypeScript', async () => {
    mockFailure('something went wrong')
    const result = await runBuildLayer({ command: 'tsc', projectRoot: '/tmp' })
    expect(result.passed).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toBe('something went wrong')
  })

  it('deve retornar erro critico quando build timeout', async () => {
    mockTimeout()
    const result = await runBuildLayer({ command: 'tsc', projectRoot: '/tmp', timeoutMs: 5000 })
    expect(result.passed).toBe(false)
    expect(result.errors[0].severity).toBe('critical')
    expect(result.errors[0].message).toContain('5000')
  })
})
