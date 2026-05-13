import { describe, expect, it } from 'vitest'
import type { FileChange } from '@kova/shared'
import { applyDiffReviewSelection, buildReviewHunks, createDiffReviewDecision } from '../src/diff-review'

const changes: FileChange[] = [
  { path: 'src/a.ts', type: 'modify', before: 'one\ntwo\nthree', diff: 'one\nTWO\nthree\nfour' },
  { path: 'src/b.ts', type: 'create', diff: 'new file' },
]

describe('diff review', () => {
  it('aprova arquivo inteiro', () => {
    const approved = applyDiffReviewSelection(changes, { files: [{ path: 'src/a.ts', decision: 'approve' }] })
    expect(approved).toEqual(changes)
  })

  it('rejeita arquivo inteiro', () => {
    const approved = applyDiffReviewSelection(changes, { files: [{ path: 'src/a.ts', decision: 'reject' }, { path: 'src/b.ts', decision: 'reject' }] })
    expect(approved).toEqual([])
  })

  it('aplica somente hunk aprovado', () => {
    const hunks = buildReviewHunks(changes[0])
    const addTWO = hunks.find(hunk => hunk.type === 'add' && hunk.afterLines.includes('TWO'))!
    const approved = applyDiffReviewSelection([changes[0]], {
      files: [{ path: 'src/a.ts', decision: 'partial', approvedHunkIds: [addTWO.id] }],
    })

    expect(approved).toHaveLength(1)
    expect(approved[0].diff).toBe('one\nTWO\ntwo\nthree')
  })

  it('aplica somente linhas aprovadas em arquivo criado', () => {
    const created: FileChange = { path: 'src/new.ts', type: 'create', diff: 'keep\nreject\nkeep too' }
    const hunks = buildReviewHunks(created)
    const approved = applyDiffReviewSelection([created], {
      files: [{
        path: created.path,
        decision: 'partial',
        approvedHunkIds: [hunks[0].id, hunks[2].id],
      }],
    })

    expect(approved).toEqual([{ ...created, diff: 'keep\nkeep too' }])
  })

  it('converte delete parcial em modify preservando linhas rejeitadas', () => {
    const deleted: FileChange = { path: 'src/old.ts', type: 'delete', before: 'remove\nkeep\nremove too', diff: '' }
    const hunks = buildReviewHunks(deleted)
    const approved = applyDiffReviewSelection([deleted], {
      files: [{
        path: deleted.path,
        decision: 'partial',
        approvedHunkIds: [hunks[0].id, hunks[2].id],
      }],
    })

    expect(approved).toEqual([{ ...deleted, type: 'modify', diff: 'keep' }])
  })

  it('nao corrompe arquivo quando nenhum hunk parcial encaixa', () => {
    const approved = applyDiffReviewSelection([changes[0]], {
      files: [{ path: 'src/a.ts', decision: 'partial', approvedHunkIds: ['missing-hunk'] }],
    })
    expect(approved).toEqual([])
  })

  it('produz decisao auditavel com rejeitados', () => {
    const decision = createDiffReviewDecision(changes, {
      files: [{ path: 'src/a.ts', decision: 'reject' }, { path: 'src/b.ts', decision: 'approve' }],
    })
    expect(decision.approvedChanges.map(change => change.path)).toEqual(['src/b.ts'])
    expect(decision.rejectedPaths).toEqual(['src/a.ts'])
    expect(decision.hunks.length).toBeGreaterThan(0)
  })
})
