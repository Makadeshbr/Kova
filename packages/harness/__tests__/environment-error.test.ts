import { describe, expect, it } from 'vitest'
import { classifyEnvironmentFailure } from '../src/layers/environment-error'

describe('classifyEnvironmentFailure - filesystem access failures', () => {
  it('detects Next.js .next trace EPERM as an environment file lock', () => {
    const error = classifyEnvironmentFailure(
      'build',
      `uncaughtException [Error: EPERM: operation not permitted, open 'C:\\Users\\allan\\Desktop\\TesteHarnes\\puphub\\.next\\trace'] {
  errno: -4048,
  code: 'EPERM',
  syscall: 'open',
  path: 'C:\\Users\\allan\\Desktop\\TesteHarnes\\puphub\\.next\\trace'
}`,
      'npm run build',
    )

    expect(error).not.toBeNull()
    expect(error?.type).toBe('environment')
    expect(error?.severity).toBe('critical')
    expect(error?.fixable).toBe(false)
    expect(error?.rule).toBe('environment_filesystem_access')
    expect(error?.humanMessage).toContain('Next.js')
    expect(error?.humanMessage).toContain('Source edits will not fix this')
    expect(error?.suggestion).toContain('Do not keep retrying build')
  })
})

describe('classifyEnvironmentFailure - Windows cmd / PowerShell', () => {
  it('detects English "is not recognized" pattern', () => {
    const error = classifyEnvironmentFailure(
      'build',
      `'next' is not recognized as an internal or external command,
operable program or batch file.`,
      'npm run build',
    )
    expect(error).not.toBeNull()
    expect(error?.type).toBe('environment')
    expect(error?.severity).toBe('critical')
    expect(error?.fixable).toBe(false)
    expect(error?.humanMessage).toContain("'next'")
    expect(error?.humanMessage).toContain('npm install')
  })

  it('detects Portuguese localized variant ("n o reconhecido")', () => {
    const error = classifyEnvironmentFailure(
      'build',
      `'next' n o   reconhecido como um comando interno ou externo, um programa oper vel ou um arquivo em lotes.`,
      'npm run build',
    )
    expect(error).not.toBeNull()
    expect(error?.type).toBe('environment')
    expect(error?.humanMessage).toContain("'next'")
  })

  it('detects "nao e reconhecido" localized variant when accents are lost', () => {
    const error = classifyEnvironmentFailure(
      'build',
      `'vite' nao e reconhecido como um comando interno ou externo`,
      'npm run build',
    )
    expect(error).not.toBeNull()
    expect(error?.type).toBe('environment')
  })

  it('detects full-accent Portuguese localized variant', () => {
    const error = classifyEnvironmentFailure(
      'build',
      `'vite' não é reconhecido como um comando interno ou externo`,
      'npm run build',
    )
    expect(error).not.toBeNull()
    expect(error?.type).toBe('environment')
  })
})

describe('classifyEnvironmentFailure - POSIX command not found', () => {
  it('detects "X: command not found"', () => {
    const error = classifyEnvironmentFailure(
      'build',
      `sh: next: command not found\nMake failed`,
      'npm run build',
    )
    expect(error).not.toBeNull()
    expect(error?.type).toBe('environment')
    expect(error?.humanMessage).toContain('next')
  })

  it('detects "command not found: X" (zsh)', () => {
    const error = classifyEnvironmentFailure(
      'tests',
      `zsh: command not found: pytest`,
      'pytest -v',
    )
    expect(error).not.toBeNull()
    expect(error?.humanMessage).toContain('pytest')
  })
})

describe('classifyEnvironmentFailure - Node module resolution', () => {
  it('detects "Cannot find module"', () => {
    const error = classifyEnvironmentFailure(
      'build',
      `Error: Cannot find module 'next/dist/server/lib/setup-server-worker'
    at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1235:15)`,
      'next build',
    )
    expect(error).not.toBeNull()
    expect(error?.type).toBe('environment')
    expect(error?.humanMessage).toContain('next/dist/server/lib/setup-server-worker')
    expect(error?.humanMessage).toContain('npm install')
  })

  it('detects bare MODULE_NOT_FOUND code', () => {
    const error = classifyEnvironmentFailure(
      'build',
      `code: 'MODULE_NOT_FOUND'\nrequireStack: [ ... ]`,
      'next build',
    )
    expect(error).not.toBeNull()
    expect(error?.type).toBe('environment')
    expect(error?.humanMessage).toContain('Node module')
  })

  it('detects ESM ERR_MODULE_NOT_FOUND', () => {
    const error = classifyEnvironmentFailure(
      'build',
      `Error [ERR_MODULE_NOT_FOUND]: Cannot resolve module`,
      'vite build',
    )
    expect(error).not.toBeNull()
    expect(error?.type).toBe('environment')
  })
})

describe('classifyEnvironmentFailure - Python', () => {
  it('detects ModuleNotFoundError', () => {
    const error = classifyEnvironmentFailure(
      'tests',
      `ModuleNotFoundError: No module named 'pytest'`,
      'pytest -v',
    )
    expect(error).not.toBeNull()
    expect(error?.type).toBe('environment')
    expect(error?.humanMessage).toContain('pytest')
    expect(error?.humanMessage).toContain('pip install')
  })
})

describe('classifyEnvironmentFailure - does NOT misfire on real source errors', () => {
  it('returns null for TypeScript compile errors', () => {
    const error = classifyEnvironmentFailure(
      'build',
      `src/app.ts(42,10): error TS2304: Cannot find name 'foo'.`,
      'tsc',
    )
    expect(error).toBeNull()
  })

  it('returns null for test failures', () => {
    const error = classifyEnvironmentFailure(
      'tests',
      `FAIL src/app.test.ts > "should login" - expected 1 to equal 2`,
      'vitest',
    )
    expect(error).toBeNull()
  })

  it('returns null for empty output', () => {
    const error = classifyEnvironmentFailure('build', '', 'npm run build')
    expect(error).toBeNull()
  })

  it('returns null for syntax errors that mention "Cannot find" without module', () => {
    const error = classifyEnvironmentFailure(
      'build',
      `Error: Cannot find name 'someVariable' at line 5`,
      'tsc',
    )
    expect(error).toBeNull()
  })
})
