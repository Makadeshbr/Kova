import { describe, it, expect } from 'vitest'
import { parseBuildErrors, parseTestFailures, parseLintErrors } from '../../src/layers/error-parsers'

// ─── parseBuildErrors ─────────────────────────────────────────────────────────

describe('parseBuildErrors', () => {
  it('deve parsear erro TypeScript (formato parênteses)', () => {
    const output = 'src/app.ts(10,5): error TS2345: Argument of type string is not assignable'
    const errors = parseBuildErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('src/app.ts')
    expect(errors[0].line).toBe(10)
    expect(errors[0].rule).toBe('TS2345')
    expect(errors[0].message).toContain('Argument of type string')
    expect(errors[0].layer).toBe('build')
  })

  it('deve parsear erro C# (formato parênteses com CS)', () => {
    const output = 'Program.cs(5,1): error CS1002: ; expected'
    const errors = parseBuildErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('Program.cs')
    expect(errors[0].rule).toBe('CS1002')
  })

  it('deve parsear erro Rust (multi-linha com -->)', () => {
    const output = [
      'error[E0308]: mismatched types',
      '  --> src/main.rs:5:14',
      '   |',
      '5  |     let x: i32 = "hello";',
    ].join('\n')
    const errors = parseBuildErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('src/main.rs')
    expect(errors[0].line).toBe(5)
    expect(errors[0].rule).toBe('E0308')
    expect(errors[0].message).toContain('mismatched types')
  })

  it('deve parsear warning Rust (multi-linha com -->)', () => {
    const output = [
      'warning[W0001]: unused variable',
      '  --> src/lib.rs:10:5',
    ].join('\n')
    const errors = parseBuildErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('src/lib.rs')
    expect(errors[0].line).toBe(10)
  })

  it('deve parsear erro GCC/Clang (file:line:col: error:)', () => {
    const output = 'src/main.c:12:5: error: use of undeclared identifier'
    const errors = parseBuildErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('src/main.c')
    expect(errors[0].line).toBe(12)
    expect(errors[0].message).toContain('undeclared identifier')
  })

  it('deve parsear erro Go (file:line:col: error)', () => {
    const output = 'main.go:8:2: undefined: fmt'
    const errors = parseBuildErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('main.go')
    expect(errors[0].line).toBe(8)
  })

  it('deve parsear erro Python/mypy (file.py:line:col: error:)', () => {
    const output = 'app/main.py:15:4: error: Incompatible types in assignment'
    const errors = parseBuildErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('app/main.py')
    expect(errors[0].line).toBe(15)
  })

  it('deve parsear erro Java (javac: file.java:line: error:)', () => {
    const output = 'src/Main.java:7: error: ';' expected'
    const errors = parseBuildErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('src/Main.java')
    expect(errors[0].line).toBe(7)
  })

  it('deve parsear erro genérico (file:line: Error:)', () => {
    const output = 'build/output.log:3: Error: something went wrong'
    const errors = parseBuildErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].line).toBe(3)
  })

  it('deve retornar erro raw quando nenhum padrão combina', () => {
    const output = 'Something totally unexpected happened'
    const errors = parseBuildErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe('Something totally unexpected happened')
    expect(errors[0].file).toBe('')
  })

  it('deve retornar array vazio para output vazio', () => {
    expect(parseBuildErrors('')).toHaveLength(0)
    expect(parseBuildErrors('   ')).toHaveLength(0)
  })

  it('deve parsear múltiplos erros TypeScript', () => {
    const output = [
      'src/a.ts(1,1): error TS2304: Cannot find name',
      'src/b.ts(5,3): error TS2345: Argument mismatch',
    ].join('\n')
    const errors = parseBuildErrors(output)
    expect(errors).toHaveLength(2)
    expect(errors[0].file).toBe('src/a.ts')
    expect(errors[1].file).toBe('src/b.ts')
  })
})

// ─── parseTestFailures ────────────────────────────────────────────────────────

describe('parseTestFailures', () => {
  it('deve parsear falhas vitest/jest (símbolo ✗)', () => {
    const output = [
      ' ✗ deve retornar erro quando token expirado',
      ' ✓ deve aceitar token válido',
    ].join('\n')
    const names = parseTestFailures(output)
    expect(names).toHaveLength(1)
    expect(names[0]).toBe('deve retornar erro quando token expirado')
  })

  it('deve parsear falhas vitest/jest (símbolo ×)', () => {
    const output = ' × deve calcular score corretamente'
    const names = parseTestFailures(output)
    expect(names).toHaveLength(1)
    expect(names[0]).toBe('deve calcular score corretamente')
  })

  it('deve parsear falhas vitest/jest (símbolo ✕)', () => {
    const output = ' ✕ deve lançar exceção para input inválido'
    const names = parseTestFailures(output)
    expect(names).toHaveLength(1)
    expect(names[0]).toBe('deve lançar exceção para input inválido')
  })

  it('deve ignorar linhas de arquivo de teste (✗ com .test.ts)', () => {
    const output = ' ✗ src/auth.test.ts'
    const names = parseTestFailures(output)
    expect(names).toHaveLength(0)
  })

  it('deve parsear falhas pytest (FAILED keyword)', () => {
    const output = [
      'FAILED tests/test_auth.py::TestLogin::test_invalid_password',
      'FAILED tests/test_auth.py::TestLogin::test_expired_token - AssertionError',
    ].join('\n')
    const names = parseTestFailures(output)
    expect(names).toHaveLength(2)
    expect(names[0]).toBe('tests/test_auth.py::TestLogin::test_invalid_password')
    expect(names[1]).toBe('tests/test_auth.py::TestLogin::test_expired_token')
  })

  it('deve parsear falhas go test (--- FAIL:)', () => {
    const output = [
      '--- FAIL: TestValidateToken (0.00s)',
      '--- FAIL: TestCalculateScore (0.01s)',
      '--- PASS: TestParseBuild (0.00s)',
    ].join('\n')
    const names = parseTestFailures(output)
    expect(names).toHaveLength(2)
    expect(names[0]).toBe('TestValidateToken')
    expect(names[1]).toBe('TestCalculateScore')
  })

  it('deve parsear falhas cargo test (bloco failures:)', () => {
    const output = [
      'test result: FAILED. 0 passed; 2 failed',
      '',
      'failures:',
      '    auth::tests::test_invalid_token',
      '    score::tests::test_calculate',
      '',
    ].join('\n')
    const names = parseTestFailures(output)
    expect(names).toHaveLength(2)
    expect(names[0]).toBe('auth::tests::test_invalid_token')
    expect(names[1]).toBe('score::tests::test_calculate')
  })

  it('deve retornar array vazio quando todos passam', () => {
    const output = '✓ all 10 tests passed'
    expect(parseTestFailures(output)).toHaveLength(0)
  })

  it('deve retornar array vazio para output vazio', () => {
    expect(parseTestFailures('')).toHaveLength(0)
  })
})

// ─── parseLintErrors ──────────────────────────────────────────────────────────

describe('parseLintErrors', () => {
  it('deve parsear ESLint formato compacto', () => {
    const output = 'src/app.ts:10:5: error no-unused-vars [no-unused-vars]'
    const errors = parseLintErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('src/app.ts')
    expect(errors[0].line).toBe(10)
    expect(errors[0].rule).toBe('no-unused-vars')
    expect(errors[0].layer).toBe('lint')
    expect(errors[0].severity).toBe('low')
  })

  it('deve parsear ESLint warning', () => {
    const output = 'src/utils.ts:5:1: warning Unexpected console statement [no-console]'
    const errors = parseLintErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('src/utils.ts')
    expect(errors[0].rule).toBe('no-console')
  })

  it('deve parsear ruff/Python (Exxxx)', () => {
    const output = 'app/main.py:15:4: E501 Line too long (120 > 88 characters)'
    const errors = parseLintErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('app/main.py')
    expect(errors[0].line).toBe(15)
    expect(errors[0].rule).toBe('E501')
    expect(errors[0].message).toContain('Line too long')
  })

  it('deve parsear golangci-lint/staticcheck (arquivo .go)', () => {
    const output = 'pkg/auth/token.go:22:5: unused variable x (SA4006)'
    const errors = parseLintErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('pkg/auth/token.go')
    expect(errors[0].line).toBe(22)
  })

  it('deve parsear clippy/Rust (multi-linha com -->)', () => {
    const output = [
      'warning[unused_variables]: unused variable: `x`',
      '  --> src/main.rs:4:9',
    ].join('\n')
    const errors = parseLintErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('src/main.rs')
    expect(errors[0].line).toBe(4)
    expect(errors[0].rule).toBe('unused_variables')
  })

  it('deve parsear biome (formato ESLint compacto)', () => {
    const output = 'src/index.ts:3:1: error organizeImports [organizeImports/useImportExtensions]'
    const errors = parseLintErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].file).toBe('src/index.ts')
  })

  it('deve retornar erro raw para output não reconhecido', () => {
    const output = 'Lint failed with unknown error'
    const errors = parseLintErrors(output)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe('Lint failed with unknown error')
    expect(errors[0].layer).toBe('lint')
  })

  it('deve retornar array vazio para output vazio', () => {
    expect(parseLintErrors('')).toHaveLength(0)
    expect(parseLintErrors('  ')).toHaveLength(0)
  })

  it('deve parsear múltiplos erros ESLint', () => {
    const output = [
      'src/a.ts:1:1: error no-var [no-var]',
      'src/b.ts:5:3: warning no-console [no-console]',
    ].join('\n')
    const errors = parseLintErrors(output)
    expect(errors).toHaveLength(2)
  })
})
