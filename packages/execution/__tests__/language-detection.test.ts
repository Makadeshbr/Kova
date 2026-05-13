import { describe, it, expect } from 'vitest'
import { detectExplicitLanguage, resolveTaskStack } from '../src/language-detection'

describe('detectExplicitLanguage', () => {
  it('detects JavaScript with explicit mention', () => {
    expect(detectExplicitLanguage('Crie um modulo em JavaScript puro')).toBe('javascript')
    expect(detectExplicitLanguage('Use node:test para os testes')).toBe('javascript')
    expect(detectExplicitLanguage('Use node --test runner')).toBe('javascript')
  })

  it('detects TypeScript explicitly (not from "JavaScript")', () => {
    expect(detectExplicitLanguage('Convert to TypeScript')).toBe('typescript')
    expect(detectExplicitLanguage('Configure tsconfig.json')).toBe('typescript')
    expect(detectExplicitLanguage('Add types.ts file')).toBe('typescript')
  })

  it('JavaScript wins over Java in "JavaScript"', () => {
    // critical: "java" is a substring of "javascript" — must not match Java
    expect(detectExplicitLanguage('Crie em JavaScript')).toBe('javascript')
    expect(detectExplicitLanguage('JavaScript only, no TypeScript')).toBe('javascript')
  })

  it('detects Python', () => {
    expect(detectExplicitLanguage('Escreva um script Python')).toBe('python')
    expect(detectExplicitLanguage('Use pytest framework')).toBe('python')
    expect(detectExplicitLanguage('Edit app.py')).toBe('python')
  })

  it('detects Go (avoiding false positive on common English "go")', () => {
    expect(detectExplicitLanguage('Use Golang for the handler')).toBe('go')
    expect(detectExplicitLanguage('Edit main.go file')).toBe('go')
    expect(detectExplicitLanguage('Create go.mod')).toBe('go')
    // "go" as English verb should NOT match (no .go file, no "golang", no explicit context)
    expect(detectExplicitLanguage('Now go and refactor this')).toBeNull()
  })

  it('detects Rust', () => {
    expect(detectExplicitLanguage('Rewrite in Rust')).toBe('rust')
    expect(detectExplicitLanguage('Add cargo dependency')).toBe('rust')
  })

  it('detects Java (not JavaScript)', () => {
    expect(detectExplicitLanguage('Migrate from Java 8 to Java 17')).toBe('java')
  })

  it('detects C#', () => {
    expect(detectExplicitLanguage('Write a C# helper')).toBe('csharp')
    expect(detectExplicitLanguage('Add to the dotnet project')).toBe('csharp')
  })

  it('returns null when no explicit language is mentioned', () => {
    expect(detectExplicitLanguage('Fix the bug in the calculator')).toBeNull()
    expect(detectExplicitLanguage('Add a new feature')).toBeNull()
    expect(detectExplicitLanguage('')).toBeNull()
  })
})

describe('resolveTaskStack', () => {
  it('explicit language in text overrides project stack', () => {
    expect(resolveTaskStack('Crie em JavaScript puro', 'generic')).toBe('javascript')
    expect(resolveTaskStack('Use Python', 'typescript')).toBe('python')
  })

  it('falls back to project stack when text has no explicit language', () => {
    expect(resolveTaskStack('Fix the bug', 'typescript')).toBe('typescript')
    expect(resolveTaskStack('Add a feature', 'go')).toBe('go')
    expect(resolveTaskStack('Refactor this', 'generic')).toBe('generic')
  })

  it('JavaScript task in empty project (generic) becomes javascript', () => {
    // The exact scenario from the user's failed test: empty folder + "JavaScript puro" task
    expect(resolveTaskStack(
      'Crie um modulo de calculadora em JavaScript puro com as quatro operacoes',
      'generic',
    )).toBe('javascript')
  })
})
