/**
 * Unit tests for contextualStatusLabel — the helper that turns the cryptic
 * ExecutionState.status into a human-readable live update ("Editing src/App.tsx",
 * "Running npm install · 12 lines", etc.).
 */
import { describe, it, expect } from 'vitest'
import { contextualStatusLabel } from '../src/renderer/src/lib/status-context'
import type { ExecutionEvent } from '../src/renderer/src/types'

function toolCall(toolName: string, input: Record<string, unknown>): ExecutionEvent {
  return {
    taskId: 't', timestamp: '2026-01-01T00:00:00.000Z', iteration: 0,
    type: 'tool_call', toolName, toolInput: input,
  } as ExecutionEvent
}

function event<T extends ExecutionEvent['type']>(type: T, extra: Partial<ExecutionEvent> = {}): ExecutionEvent {
  return { taskId: 't', timestamp: '2026-01-01T00:00:00.000Z', iteration: 0, type, ...extra } as ExecutionEvent
}

describe('contextualStatusLabel', () => {
  it('returns "Processing..." when status is null', () => {
    expect(contextualStatusLabel(null, [])).toBe('Processing...')
  })

  it('describes the file being edited during coding', () => {
    const events = [toolCall('write_file', { path: 'src/App.tsx', content: 'x\n' })]
    expect(contextualStatusLabel('coding', events)).toBe('Editing App.tsx')
  })

  it('shows file count when multiple writes happened', () => {
    const events = [
      toolCall('write_file', { path: 'src/A.tsx', content: '1\n' }),
      toolCall('write_file', { path: 'src/B.tsx', content: '2\n' }),
      toolCall('write_file', { path: 'src/C.tsx', content: '3\n' }),
    ]
    expect(contextualStatusLabel('coding', events)).toContain('(3 files)')
  })

  it('shows the running command during coding when run_command is active', () => {
    const events = [toolCall('run_command', { command: 'npm install' })]
    expect(contextualStatusLabel('coding', events)).toBe('Running npm install')
  })

  it('appends live line count while a command streams output', () => {
    const events: ExecutionEvent[] = [
      toolCall('run_command', { command: 'npm install' }),
      event('command_output', { commandLine: 'foo' } as Partial<ExecutionEvent>),
      event('command_output', { commandLine: 'bar' } as Partial<ExecutionEvent>),
    ]
    expect(contextualStatusLabel('coding', events)).toBe('Running npm install · 2 lines')
  })

  it('falls back to editing summary after a command finishes', () => {
    const events: ExecutionEvent[] = [
      toolCall('write_file', { path: 'src/App.tsx', content: 'x\n' }),
      toolCall('run_command', { command: 'echo done' }),
      event('tool_result', { toolName: 'run_command', message: 'OK' } as Partial<ExecutionEvent>),
    ]
    expect(contextualStatusLabel('coding', events)).toBe('Editing App.tsx')
  })

  it('reports the harness layer during validating', () => {
    const events: ExecutionEvent[] = [
      event('harness_layer_start', { harnessLayer: 'build', message: 'npm run build' } as Partial<ExecutionEvent>),
    ]
    expect(contextualStatusLabel('validating', events)).toBe('Validating: build')
  })

  it('reports apply count from prior write events', () => {
    const events = [
      toolCall('write_file', { path: 'a.ts', content: '1' }),
      toolCall('write_file', { path: 'b.ts', content: '2' }),
    ]
    expect(contextualStatusLabel('applying', events)).toBe('Applying 2 files...')
  })

  it('shows search pattern during planning', () => {
    const events = [toolCall('grep_codebase', { pattern: 'useAuthHook' })]
    expect(contextualStatusLabel('planning', events)).toContain('Searching: useAuthHook')
  })

  it('returns a stable generic verb for deciding/structuring', () => {
    expect(contextualStatusLabel('deciding', [])).toBe('Reviewing changes...')
    expect(contextualStatusLabel('structuring', [])).toBe('Structuring task...')
  })

  it('falls back to "Generating code..." when coding has no events yet', () => {
    expect(contextualStatusLabel('coding', [])).toBe('Generating code...')
  })
})
