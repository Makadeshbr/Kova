import { describe, it, expect } from 'vitest'
import { allocateBudget, estimateTokens } from '../src/token-budget'
import type { PrioritizedFile } from '../src/token-budget'

function makeFile(path: string, relevance: PrioritizedFile['relevance'], chars = 400): PrioritizedFile {
  return { path, content: 'x'.repeat(chars), relevance }
}

describe('estimateTokens', () => {
  it('deve estimar 1 token por 4 chars', () => {
    expect(estimateTokens('a'.repeat(400))).toBe(100)
    expect(estimateTokens('a'.repeat(1))).toBe(1)
    expect(estimateTokens('')).toBe(0)
  })
})

describe('allocateBudget', () => {
  it('deve incluir arquivos por ordem de prioridade', () => {
    const files: PrioritizedFile[] = [
      makeFile('c.ts', 'indirect_dep'),
      makeFile('a.md', 'rules'),
      makeFile('b.ts', 'target'),
    ]
    const result = allocateBudget(files, 10_000)
    expect(result.files[0].relevance).toBe('rules')
    expect(result.files[1].relevance).toBe('target')
    expect(result.files[2].relevance).toBe('indirect_dep')
  })

  it('deve cortar de baixo para cima quando excede budget', () => {
    const files: PrioritizedFile[] = [
      makeFile('rules.md', 'rules', 40),       // 10 tokens
      makeFile('target.ts', 'target', 40),     // 10 tokens
      makeFile('dep.ts', 'indirect_dep', 400), // 100 tokens
    ]
    const result = allocateBudget(files, 25)
    expect(result.files.some(f => f.relevance === 'rules')).toBe(true)
    expect(result.files.some(f => f.relevance === 'target')).toBe(true)
    // indirect_dep ficou de fora por exceder budget
    expect(result.files.some(f => f.relevance === 'indirect_dep')).toBe(false)
  })

  it('deve contabilizar tokens corretamente', () => {
    const files = [makeFile('a.ts', 'target', 400)]
    const result = allocateBudget(files, 10_000)
    expect(result.tokensUsed).toBe(100)
    expect(result.files[0].tokens).toBe(100)
  })

  it('deve ativar fallback quando nenhum arquivo cabe e truncar o mais prioritário', () => {
    // arquivo com 10_000 chars = 2500 tokens, maxTokens = 10
    const files = [makeFile('rules.md', 'rules', 10_000)]
    const result = allocateBudget(files, 10)
    expect(result.files).toHaveLength(1)
    expect(result.files[0].content.length).toBeLessThanOrEqual(40) // 10 tokens * 4 chars
    expect(result.files[0].relevance).toBe('rules')
  })

  it('deve retornar lista vazia para input vazio', () => {
    const result = allocateBudget([], 10_000)
    expect(result.files).toHaveLength(0)
    expect(result.tokensUsed).toBe(0)
  })

  it('deve priorizar error acima de direct_dep', () => {
    const files: PrioritizedFile[] = [
      makeFile('dep.ts', 'direct_dep'),
      makeFile('broken.ts', 'error'),
    ]
    const result = allocateBudget(files, 10_000)
    expect(result.files[0].relevance).toBe('error')
  })

  it('usa score como desempate dentro da mesma relevancia', () => {
    const files: PrioritizedFile[] = [
      { ...makeFile('low.ts', 'indirect_dep'), score: 20 },
      { ...makeFile('high.ts', 'indirect_dep'), score: 80 },
    ]
    const result = allocateBudget(files, 10_000)
    expect(result.files[0].path).toBe('high.ts')
  })
})
