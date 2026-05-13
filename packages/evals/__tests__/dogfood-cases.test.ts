import { describe, expect, it, afterEach } from 'vitest'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DOGFOOD_CASES, readDogfoodProviderConfig, setupDogfoodProject, validateDogfoodOutput } from '../src'

let root = ''

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = ''
})

describe('dogfood real cases', () => {
  it('casos versionados existem para os cenarios principais', () => {
    expect(DOGFOOD_CASES.map(testCase => testCase.id)).toEqual([
      'bugfix-ts',
      'backend-go',
      'python',
      'safe-zone',
      'failing-test',
      'fallback-provider',
      'long-task',
      'js-pure-no-install',
    ])
  })

  it('monta projetos temporarios reais', () => {
    root = mkdtempSync(join(tmpdir(), 'kova-dogfood-test-'))
    setupDogfoodProject('python', root)
    expect(existsSync(join(root, 'app.py'))).toBe(true)
    expect(existsSync(join(root, '.kova', 'harness.json'))).toBe(true)
  })

  it('runner falha explicitamente sem provider local e cloud', () => {
    expect(() => readDogfoodProviderConfig({})).toThrow('Dogfooding real exige provider local e cloud')
  })

  it('runner aceita env local e cloud e preserva provider kind', () => {
    const config = readDogfoodProviderConfig({
      KOVA_DOGFOOD_LOCAL_BASE_URL: 'http://localhost:11434/v1',
      KOVA_DOGFOOD_LOCAL_MODEL: 'qwen',
      KOVA_DOGFOOD_CLOUD_PROVIDER: 'openrouter',
      KOVA_DOGFOOD_CLOUD_API_KEY: 'key',
      KOVA_DOGFOOD_CLOUD_BASE_URL: 'https://openrouter.ai/api/v1',
      KOVA_DOGFOOD_CLOUD_MODEL: 'model',
    })
    expect(config.map(item => item.kind)).toEqual(['local', 'cloud'])
  })
})

// ─── Regression: js-pure-no-install scenario ────────────────────────────────────
// These tests encode the exact bug the user reported as a permanent gate.
// If any of these assertions break in the future, Kova has regressed on the
// "respect user-declared stack" guarantee.

describe('js-pure-no-install — declared expectations', () => {
  const jsCase = DOGFOOD_CASES.find(c => c.id === 'js-pure-no-install')

  it('case is defined with expectations attached', () => {
    expect(jsCase).toBeDefined()
    expect(jsCase?.expectations).toBeDefined()
    expect(jsCase?.task.stackAdapter).toBe('javascript')
  })

  it('expectations forbid TypeScript artifacts (the bug the user hit)', () => {
    const expectations = jsCase?.expectations
    expect(expectations?.forbiddenPaths).toContain('**/*.ts')
    expect(expectations?.forbiddenPaths).toContain('tsconfig.json')
    expect(expectations?.forbiddenPaths).toContain('package.json')
  })

  it('expectations forbid dependency installation', () => {
    const expectations = jsCase?.expectations
    expect(expectations?.forbiddenCommands).toContain('tsc')
    expect(expectations?.forbiddenCommands).toContain('npm install')
    expect(expectations?.forbiddenCommands).toContain('npx tsx')
  })
})

describe('js-pure-no-install — synthetic agent output validation', () => {
  const jsCase = DOGFOOD_CASES.find(c => c.id === 'js-pure-no-install')!

  it('CORRECT output produces zero violations', () => {
    // What the agent SHOULD produce: only .js files + harness.json + node --test command
    const violations = validateDogfoodOutput(jsCase.expectations!, [
      { path: 'calculator.js' },
      { path: 'test/calculator.test.js' },
      { path: '.kova/harness.json' },
    ], ['node --test test/calculator.test.js'])
    expect(violations).toEqual([])
  })

  it('REPRODUCES the user bug: creates src/calculator.ts → flagged', () => {
    // Exact reproduction of test 2 in the user report
    const violations = validateDogfoodOutput(jsCase.expectations!, [
      { path: 'src/calculator.ts' },
      { path: 'test/calculator.test.js' },
      { path: '.kova/harness.json' },
    ], [])
    expect(violations.some(v => v.evidence === 'src/calculator.ts')).toBe(true)
  })

  it('REPRODUCES the user bug: harness ran tsc --noEmit → flagged', () => {
    // Exact reproduction of test 1 in the user report
    const violations = validateDogfoodOutput(jsCase.expectations!, [
      { path: 'calculator.js' },
      { path: '.kova/harness.json' },
    ], ['tsc --noEmit'])
    expect(violations.some(v => v.rule === 'forbidden_command' && v.evidence.includes('tsc'))).toBe(true)
  })

  it('REPRODUCES the user bug: agent ran npx tsx → flagged', () => {
    // Exact reproduction of task 2 isPrime in the user report
    const violations = validateDogfoodOutput(jsCase.expectations!, [
      { path: 'src/isPrime.ts' },
      { path: 'test/isPrime.test.ts' },
      { path: 'package.json' },
      { path: 'tsconfig.json' },
    ], ['npx --yes tsx --test test/isPrime.test.ts'])

    const rules = violations.map(v => v.rule)
    expect(rules).toContain('forbidden_path') // .ts files + package.json + tsconfig
    expect(rules).toContain('forbidden_command') // npx tsx
    expect(rules).toContain('missing_required') // no .js file, no harness.json
  })
})
