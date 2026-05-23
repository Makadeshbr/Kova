import { describe, expect, it } from 'vitest'
import {
  classifyCommandFragility,
  extractInlineScript,
  isValidationTempPath,
} from '@kova/shared'

describe('classifyCommandFragility', () => {
  it('node --version is safe', () => {
    expect(classifyCommandFragility('node --version')).toBe('safe')
  })

  it('short node -e is safe', () => {
    expect(classifyCommandFragility('node -e "console.log(1)"')).toBe('safe')
  })

  it('long node -e with quotes/regex is fragile', () => {
    const script = 'node -e "const s=\\"hello\\"; console.log(s.replace(/foo/g, \\"bar\\")); console.log(\\"done\\");"'
    expect(classifyCommandFragility(script)).toBe('fragile')
  })

  it('shell composition with && is blocked', () => {
    expect(classifyCommandFragility('node --version && echo ok')).toBe('blocked')
  })

  it('redirection is blocked', () => {
    expect(classifyCommandFragility('node --version > out.txt')).toBe('blocked')
  })

  it('interactive gh auth login is blocked', () => {
    expect(classifyCommandFragility('gh auth login')).toBe('blocked')
  })
})

describe('extractInlineScript', () => {
  it('extracts node -e body', () => {
    const extracted = extractInlineScript('node -e "console.log(42)"', 'javascript')
    expect(extracted).toEqual({ body: 'console.log(42)', extension: 'js', runner: 'node' })
  })

  it('returns null for non-inline commands', () => {
    expect(extractInlineScript('node --version', 'javascript')).toBeNull()
  })
})

describe('isValidationTempPath', () => {
  it('matches validation temp prefix', () => {
    expect(isValidationTempPath('.kova/tmp/validation/validate-abc.js')).toBe(true)
    expect(isValidationTempPath('.kova\\tmp\\validation\\validate-abc.js')).toBe(true)
  })

  it('rejects normal project paths', () => {
    expect(isValidationTempPath('src/index.ts')).toBe(false)
    expect(isValidationTempPath('.kova/sessions/foo.json')).toBe(false)
  })
})
