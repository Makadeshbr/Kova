import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@kova/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@kova/shared')>()
  return { ...actual, runCommandInvocation: vi.fn() }
})

import { runCommandInvocation } from '@kova/shared'
import { runLintLayer } from '../../src/layers/lint'

const mockRun = vi.mocked(runCommandInvocation)

function commandResult(overrides: Partial<Awaited<ReturnType<typeof runCommandInvocation>>> = {}) {
  return {
    command: 'eslint .',
    cwd: '/tmp',
    kind: 'lint' as const,
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
    mockFailure('src/a.ts:1:1: error Some problem [my-rule]')
    const result = await runLintLayer({ command: 'eslint .', projectRoot: '/tmp' })
    expect(result.errors[0].rule).toBe('my-rule')
  })

  it('deve retornar erro generico quando output nao tem file:line', async () => {
    mockFailure('Lint config error: cannot read config file')
    const result = await runLintLayer({ command: 'eslint .', projectRoot: '/tmp' })
    expect(result.passed).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toBeTruthy()
  })

  it('deve retornar erro quando timeout', async () => {
    mockRun.mockResolvedValue(commandResult({ exitCode: 1, timedOut: true }))
    const result = await runLintLayer({ command: 'eslint .', projectRoot: '/tmp', timeoutMs: 5000 })
    expect(result.passed).toBe(false)
    expect(result.errors[0].message).toContain('5000')
  })
})
