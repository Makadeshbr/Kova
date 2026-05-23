import { describe, expect, it } from 'vitest'
import type { ExecutionEvent, HarnessResult } from '../src/renderer/src/types'
import {
  reviewActivityLabel,
  shouldAutoCollapseRunPanel,
  shouldExpandRunPanelForActiveRun,
  shouldShowActivityArchive,
  validationLifecycleView,
} from '../src/renderer/src/lib/run-lifecycle'

function event<T extends ExecutionEvent['type']>(type: T, extra: Partial<ExecutionEvent> = {}): ExecutionEvent {
  return { taskId: 't', timestamp: '2026-05-23T00:00:00.000Z', type, ...extra } as ExecutionEvent
}

function harness(overrides: Partial<HarnessResult> = {}): HarnessResult {
  return {
    passed: true,
    score: 80,
    duration: 1,
    iteration: 1,
    validationConfidence: 'full',
    layers: [],
    ...overrides,
  }
}

describe('run lifecycle presentation', () => {
  it('does not keep validation visually running after completed', () => {
    const view = validationLifecycleView({
      executionStatus: 'completed',
      harness: harness({ validationConfidence: 'partial' }),
      isValidationStarted: true,
    })

    expect(view.status).toBe('success')
    expect(view.label).toBe('Validacao concluida com avisos')
  })

  it('maps completion evidence failure to warning copy, not primary failure copy', () => {
    const view = validationLifecycleView({
      executionStatus: 'completed',
      harness: harness({
        passed: false,
        layers: [{
          name: 'completion',
          passed: false,
          errors: [],
          warnings: [],
          duration: 1,
          skipped: false,
          command: 'completion-proof',
        }],
      }),
      isValidationStarted: true,
    })

    expect(view.status).toBe('success')
    expect(view.label).toBe('Evidencia incompleta')
    expect(view.detail).toContain('evidencia parcial')
  })

  it('keeps security critical as a blocking validation state', () => {
    const view = validationLifecycleView({
      executionStatus: 'failed',
      harness: harness({
        passed: false,
        layers: [{
          name: 'security',
          passed: false,
          errors: [{ layer: 'security', type: 'security', severity: 'critical', fixable: false, message: 'secret', humanMessage: 'secret' }],
          warnings: [],
          duration: 1,
          skipped: false,
        }],
      }),
      isValidationStarted: true,
    })

    expect(view.status).toBe('error')
    expect(view.label).toBe('Validacao bloqueada')
  })

  it('auto-collapses completed product results but expands active work', () => {
    expect(shouldAutoCollapseRunPanel({
      executionStatus: 'completed',
      productStatus: 'completed_with_warnings',
      isRunning: false,
      isThinking: false,
    })).toBe(true)

    expect(shouldExpandRunPanelForActiveRun({
      executionStatus: 'validating',
      isRunning: true,
      isThinking: false,
    })).toBe(true)
  })

  it('hides the archive for completed result cards so details stay collapsed', () => {
    expect(shouldShowActivityArchive({
      hasResult: true,
      showLive: false,
      eventsLength: 4,
      executionStatus: 'completed',
    })).toBe(false)
  })
})

describe('reviewActivityLabel', () => {
  it('shows skeleton progress when review has no tool activity yet', () => {
    expect(reviewActivityLabel([])).toBe('Analisando arquivos e preparando revisao...')
  })

  it('describes read and search activity in review mode', () => {
    expect(reviewActivityLabel([
      event('tool_call', { toolName: 'read_file', toolInput: { path: 'src/index.html' } }),
    ])).toBe('Lendo index.html')

    expect(reviewActivityLabel([
      event('tool_call', { toolName: 'grep_codebase', toolInput: { pattern: 'auth' } }),
    ])).toBe('Buscando padroes no codigo')
  })
})
