import { describe, expect, it } from 'vitest'
import type { ExecutionEvent } from '../src/renderer/src/types'
import type { SessionUsage } from '../src/renderer/src/app-state'
import { buildContextContinuitySummary } from '../src/renderer/src/lib/context-continuity'

const emptyUsage: SessionUsage = {
  contextTokens: 0,
  completionTokens: 0,
  cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0,
  contextFiles: [],
  selectedFiles: [],
  blockedFiles: [],
  rejectedFiles: [],
  contextWarnings: [],
  learningsCount: 0,
  maxContextTokens: null,
}

function contextEvent(extra: NonNullable<ExecutionEvent['context']>): ExecutionEvent {
  return {
    type: 'context_loaded',
    taskId: 'task',
    timestamp: '2026-05-22T00:00:00.000Z',
    context: extra,
  }
}

describe('buildContextContinuitySummary', () => {
  it('hides when no context, memory, or safety signal exists', () => {
    expect(buildContextContinuitySummary(emptyUsage, [])).toMatchObject({
      visible: false,
      fileCount: 0,
      memoryLabel: null,
      safetyLabel: null,
    })
  })

  it('summarizes selected files, cache reuse, memory, and safety signals', () => {
    const usage: SessionUsage = {
      ...emptyUsage,
      contextTokens: 1420,
      contextFiles: ['src/App.tsx', 'src/styles.css'],
      learningsCount: 2,
      blockedFiles: [{ path: '.env', reason: 'Sensitive file.', evidence: ['sensitive_path'], sensitive: true }],
      rejectedFiles: [{ path: 'dist/app.js', reason: 'Generated file.', evidence: ['generated'], sensitive: false }],
      selectedFiles: [{
        path: 'src/App.tsx',
        reason: 'Explicitly referenced by the current task.',
        source: 'explicit',
        kind: 'source',
        score: 100,
        confidence: 96,
        evidence: ['explicit_reference'],
      }],
    }
    const summary = buildContextContinuitySummary(usage, [
      contextEvent({ files: usage.contextFiles, tokensUsed: usage.contextTokens, learningsCount: 2, reused: true }),
    ])

    expect(summary.visible).toBe(true)
    expect(summary.reused).toBe(true)
    expect(summary.tokenLabel).toBe('1.4k ctx')
    expect(summary.memoryLabel).toBe('2 memories')
    expect(summary.safetyLabel).toBe('1 blocked / 1 skipped')
    expect(summary.selectedFiles[0]).toMatchObject({
      path: 'src/App.tsx',
      source: 'referenced',
      confidence: 96,
    })
  })

  it('falls back to the latest context event when session usage has not hydrated yet', () => {
    const summary = buildContextContinuitySummary(emptyUsage, [
      contextEvent({
        files: ['old.ts'],
        tokensUsed: 200,
        selectedFiles: [{ path: 'old.ts', reason: 'Search match.', source: 'grep', kind: 'source', score: 50, confidence: 70, evidence: ['grep_match'] }],
      }),
      contextEvent({
        files: ['new.ts'],
        tokensUsed: 800,
        selectedFiles: [{ path: 'new.ts', reason: 'Currently open.', source: 'opened_file', kind: 'source', score: 86, confidence: 88, evidence: ['opened_file'] }],
      }),
    ])

    expect(summary.fileCount).toBe(1)
    expect(summary.tokenLabel).toBe('800 ctx')
    expect(summary.selectedFiles[0]).toMatchObject({ path: 'new.ts', source: 'open file' })
  })
})
