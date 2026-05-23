import { describe, expect, it } from 'vitest'
import { collectOpenedFiles } from '../src/renderer/src/lib/opened-files'

describe('collectOpenedFiles', () => {
  it('puts openFilePath first', () => {
    const result = collectOpenedFiles({
      openFilePath: 'src/a.ts',
      iterationHistory: [{ changes: [{ path: 'index.html' }] }],
    })
    expect(result[0]).toBe('src/a.ts')
    expect(result[1]).toBe('index.html')
  })

  it('deduplicates and caps at 12', () => {
    const changes = Array.from({ length: 20 }, (_, i) => ({ path: `file-${i}.ts` }))
    const result = collectOpenedFiles({
      openFilePath: 'file-0.ts',
      iterationHistory: [{ changes }],
    })
    expect(result).toHaveLength(12)
    expect(result[0]).toBe('file-0.ts')
    expect(new Set(result).size).toBe(12)
  })

  it('returns recent paths when no open file', () => {
    expect(collectOpenedFiles({
      openFilePath: null,
      iterationHistory: [
        { changes: [{ path: 'index.html' }, { path: 'styles.css' }] },
      ],
    })).toEqual(['index.html', 'styles.css'])
  })

  it('returns empty when no open file and no history', () => {
    expect(collectOpenedFiles({ openFilePath: null })).toEqual([])
  })
})
