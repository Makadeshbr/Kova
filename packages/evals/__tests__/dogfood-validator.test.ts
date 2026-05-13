import { describe, it, expect } from 'vitest'
import { validateDogfoodOutput, type DogfoodExpectations } from '../src/dogfood-validator'

// Shared fixture: the exact contract for the JS-pure-no-deps scenario the user reported as broken.
const JS_PURE_EXPECTATIONS: DogfoodExpectations = {
  forbiddenPaths: ['**/*.ts', '**/*.tsx', 'tsconfig.json', 'package.json', '*-lock.json', '*-lock.yaml'],
  forbiddenCommands: ['tsc', 'npm install', 'npm i ', 'pnpm add', 'pnpm install', 'yarn add', 'npx tsx', 'npx ts-node'],
  requiredPaths: ['**/*.js', '.kova/harness.json'],
}

describe('validateDogfoodOutput — base contract', () => {
  it('returns no violations when all expectations are met', () => {
    const violations = validateDogfoodOutput(JS_PURE_EXPECTATIONS, [
      { path: 'calculator.js' },
      { path: 'test/calculator.test.js' },
      { path: '.kova/harness.json' },
    ], ['node --test test/calculator.test.js'])
    expect(violations).toEqual([])
  })

  it('flags creating a forbidden .ts file (root cause of the user bug)', () => {
    const violations = validateDogfoodOutput(JS_PURE_EXPECTATIONS, [
      { path: 'src/calculator.ts' },
      { path: 'test/calc.test.js' },
      { path: '.kova/harness.json' },
    ], [])
    expect(violations).toContainEqual(expect.objectContaining({
      rule: 'forbidden_path',
      evidence: 'src/calculator.ts',
    }))
  })

  it('flags creating package.json when explicitly forbidden', () => {
    const violations = validateDogfoodOutput(JS_PURE_EXPECTATIONS, [
      { path: 'package.json' },
      { path: 'calculator.js' },
      { path: '.kova/harness.json' },
    ], [])
    expect(violations.some(v => v.rule === 'forbidden_path' && v.evidence === 'package.json')).toBe(true)
  })

  it('flags creating tsconfig.json', () => {
    const violations = validateDogfoodOutput(JS_PURE_EXPECTATIONS, [
      { path: 'tsconfig.json' },
      { path: 'calculator.js' },
      { path: '.kova/harness.json' },
    ], [])
    expect(violations.some(v => v.evidence === 'tsconfig.json')).toBe(true)
  })

  it('flags running tsc command', () => {
    const violations = validateDogfoodOutput(JS_PURE_EXPECTATIONS, [
      { path: 'calculator.js' },
      { path: '.kova/harness.json' },
    ], ['tsc --noEmit'])
    expect(violations.some(v => v.rule === 'forbidden_command' && v.evidence.includes('tsc'))).toBe(true)
  })

  it('flags running npm install', () => {
    const violations = validateDogfoodOutput(JS_PURE_EXPECTATIONS, [
      { path: 'calculator.js' },
      { path: '.kova/harness.json' },
    ], ['npm install --save-dev typescript'])
    expect(violations.some(v => v.rule === 'forbidden_command')).toBe(true)
  })

  it('flags running npx tsx (substring match, not exact)', () => {
    const violations = validateDogfoodOutput(JS_PURE_EXPECTATIONS, [
      { path: 'calculator.js' },
      { path: '.kova/harness.json' },
    ], ['npx --yes tsx test/calc.test.ts'])
    expect(violations.some(v => v.rule === 'forbidden_command')).toBe(true)
  })

  it('flags missing required .js files', () => {
    const violations = validateDogfoodOutput(JS_PURE_EXPECTATIONS, [
      { path: '.kova/harness.json' },
      // no .js file created!
    ], [])
    expect(violations.some(v => v.rule === 'missing_required' && v.evidence === '**/*.js')).toBe(true)
  })

  it('flags missing .kova/harness.json', () => {
    const violations = validateDogfoodOutput(JS_PURE_EXPECTATIONS, [
      { path: 'calculator.js' },
      // no .kova/harness.json
    ], [])
    expect(violations.some(v => v.rule === 'missing_required' && v.evidence === '.kova/harness.json')).toBe(true)
  })

  it('matches **/*.ts nested deep correctly', () => {
    const violations = validateDogfoodOutput(JS_PURE_EXPECTATIONS, [
      { path: 'src/deep/nested/leaf.ts' },
      { path: 'app.js' },
      { path: '.kova/harness.json' },
    ], [])
    expect(violations.some(v => v.evidence === 'src/deep/nested/leaf.ts')).toBe(true)
  })

  it('aggregates multiple violations from one run', () => {
    const violations = validateDogfoodOutput(JS_PURE_EXPECTATIONS, [
      { path: 'src/app.ts' },
      { path: 'tsconfig.json' },
    ], ['tsc --noEmit', 'npm install typescript'])

    const rules = violations.map(v => v.rule)
    expect(rules).toContain('forbidden_path')
    expect(rules).toContain('forbidden_command')
    expect(rules).toContain('missing_required') // no .js file, no harness.json
    expect(violations.length).toBeGreaterThanOrEqual(4)
  })
})

describe('validateDogfoodOutput — empty expectations', () => {
  it('returns no violations when expectations have no constraints', () => {
    const violations = validateDogfoodOutput({}, [{ path: 'anything.ts' }], ['rm -rf /'])
    expect(violations).toEqual([])
  })
})

describe('validateDogfoodOutput — allowedExtensions narrow rule', () => {
  it('flags extensions outside the allow list', () => {
    const violations = validateDogfoodOutput({
      allowedExtensions: ['.go', '.mod'],
    }, [
      { path: 'main.go' },
      { path: 'helpers.py' }, // outside allow list
    ], [])
    expect(violations.some(v => v.rule === 'extension_not_allowed' && v.evidence === 'helpers.py')).toBe(true)
  })

  it('does not flag files inside the allow list', () => {
    const violations = validateDogfoodOutput({
      allowedExtensions: ['.go', '.mod'],
    }, [
      { path: 'main.go' },
      { path: 'go.mod' },
    ], [])
    expect(violations).toEqual([])
  })
})
