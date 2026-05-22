import { describe, expect, it, afterEach, beforeEach } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ExecutionEvent, ExecutionState, StructuredAgentMessage, TaskDefinition } from '@kova/shared'
import {
  createRunSnapshot,
  finalizeRunSnapshot,
  listRunSnapshotSessions,
  recordSnapshotEvent,
  recordSnapshotState,
  writeRunSnapshot,
} from '../src/main/run-snapshot-store'

let projectRoot: string

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'kova-snapshot-'))
})

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true })
})

function task(): TaskDefinition {
  return {
    id: 'task-1',
    objective: 'Create a landing page',
    constraints: [],
    nonGoals: [],
    validationCriteria: [],
    type: 'feature',
    impact: 'medium',
    affectedFiles: [],
    stackAdapter: 'unknown',
  }
}

function state(status: ExecutionState['status'], currentIteration: number): ExecutionState {
  return {
    taskId: 'task-1',
    status,
    currentIteration,
    maxIterations: 5,
    iterationHistory: [],
    startedAt: '2026-05-22T10:00:00.000Z',
    totalTokens: 10,
  }
}

function event(type: ExecutionEvent['type'], extra: Partial<ExecutionEvent> = {}): ExecutionEvent {
  return {
    type,
    taskId: 'task-1',
    timestamp: '2026-05-22T10:01:00.000Z',
    ...extra,
  }
}

describe('run snapshot store', () => {
  it('writes current and per-iteration snapshots atomically', () => {
    let snapshot = createRunSnapshot({
      sessionId: 'session-1',
      projectRoot,
      objective: 'Create a landing page',
      task: task(),
    })
    snapshot = recordSnapshotState(snapshot, state('validating', 1))

    writeRunSnapshot(projectRoot, snapshot)

    const dir = join(projectRoot, '.kova', 'sessions', 'session-1')
    expect(existsSync(join(dir, 'current.json'))).toBe(true)
    expect(existsSync(join(dir, 'state-iter-1.json'))).toBe(true)
    const persisted = JSON.parse(readFileSync(join(dir, 'current.json'), 'utf-8')) as { sessionId?: string }
    expect(persisted.sessionId).toBe('session-1')
  })

  it('keeps a final session receipt and cleans transient snapshots', () => {
    const structured: StructuredAgentMessage = {
      kind: 'agent_result',
      title: 'Task complete',
      summary: 'Done',
      filesChanged: [{ path: 'src/App.tsx', displayName: 'App.tsx', status: 'created' }],
      validations: [],
      risk: 'low',
      decision: 'apply',
      notes: [],
    }
    let snapshot = createRunSnapshot({
      sessionId: 'session-final',
      projectRoot,
      objective: 'Create a landing page',
      task: task(),
    })
    snapshot = recordSnapshotState(snapshot, state('validating', 1))
    snapshot = recordSnapshotEvent(snapshot, event('stream_end', { structuredMessage: structured }))
    writeRunSnapshot(projectRoot, snapshot)

    snapshot = recordSnapshotState(snapshot, state('completed', 1))
    finalizeRunSnapshot(projectRoot, snapshot)

    const dir = join(projectRoot, '.kova', 'sessions', 'session-final')
    expect(existsSync(join(dir, 'session.json'))).toBe(true)
    expect(existsSync(join(dir, 'current.json'))).toBe(false)
    expect(existsSync(join(dir, 'state-iter-1.json'))).toBe(false)

    const [session] = listRunSnapshotSessions(projectRoot)
    expect(session.recoveredFromSnapshot).toBe(true)
    expect(session.messages.at(-1)?.structured?.kind).toBe('agent_result')
    expect(session.executionState?.status).toBe('completed')
  })

  it('restores interrupted runs as failed evidence instead of pretending the engine is still alive', () => {
    let snapshot = createRunSnapshot({
      sessionId: 'session-running',
      projectRoot,
      objective: 'Create a landing page',
      task: task(),
    })
    snapshot = recordSnapshotState(snapshot, state('coding', 0))
    snapshot = recordSnapshotEvent(snapshot, event('tool_call', {
      toolName: 'write_file',
      toolInput: { path: 'index.html' },
    }))

    writeRunSnapshot(projectRoot, snapshot)

    const [session] = listRunSnapshotSessions(projectRoot)
    expect(session.recoveryStatus).toBe('running')
    expect(session.executionState?.status).toBe('failed')
    expect(session.events.some(item => item.type === 'tool_call')).toBe(true)
    expect(session.recoveryNote).toContain('interrupted run')
  })
})
