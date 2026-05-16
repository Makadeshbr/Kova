import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { Learning, IterationRecord, ProjectProfile, TaskDefinition, HarnessResult, DecisionResult } from '@kova/shared'
import { MemorySystem } from '../src/memory-system'

let tmpDir = ''

function setup(): { root: string; mem: MemorySystem } {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-memory-'))
  return { root: tmpDir, mem: new MemorySystem(tmpDir) }
}

afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
  tmpDir = ''
})

function baseInput(overrides: Partial<Omit<Learning, 'id' | 'createdAt' | 'lastSeen'>> = {}) {
  return {
    type: 'pattern' as const, scope: 'project' as const,
    status: 'experimental' as const, confidence: 1, contradictions: 0,
    description: 'sempre usar early return em funções', evidence: [], tags: ['typescript', 'functions'],
    ...overrides,
  }
}

describe('record', () => {
  it('deve registrar novo learning e gerar id', () => {
    const { mem } = setup()
    const l = mem.record(baseInput())
    expect(l.id).toBeTruthy()
    expect(l.createdAt).toBeTruthy()
    expect(l.lastSeen).toBeTruthy()
  })

  it('deve persistir no disco', () => {
    const { root, mem } = setup()
    mem.record(baseInput())
    const mem2 = new MemorySystem(root)
    expect(mem2.list()).toHaveLength(1)
  })

  it('deve deduplicar learning com mesma description', () => {
    const { mem } = setup()
    mem.record(baseInput())
    const updated = mem.record(baseInput())
    expect(mem.list()).toHaveLength(1)
    expect(updated.confidence).toBe(2)
  })

  it('deve ignorar diferença de case/espaços na deduplicação', () => {
    const { mem } = setup()
    mem.record(baseInput({ description: 'usar early return' }))
    mem.record(baseInput({ description: '  Usar Early Return  ' }))
    expect(mem.list()).toHaveLength(1)
  })

  it('deve adicionar learnings distintos separadamente', () => {
    const { mem } = setup()
    mem.record(baseInput({ description: 'padrão A' }))
    mem.record(baseInput({ description: 'padrão B' }))
    expect(mem.list()).toHaveLength(2)
  })
})

describe('query', () => {
  it('deve retornar learnings relevantes por tags', () => {
    const { mem } = setup()
    mem.record(baseInput({ tags: ['typescript', 'async'], description: 'async pattern', confidence: 3 }))
    mem.record(baseInput({ tags: ['python', 'loops'], description: 'loop pattern', confidence: 2 }))

    const results = mem.query('typescript async patterns')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].tags).toContain('typescript')
  })

  it('deve respeitar maxResults', () => {
    const { mem } = setup()
    for (let i = 0; i < 10; i++) {
      mem.record(baseInput({ description: `padrão ${i}`, tags: ['test'] }))
    }
    const results = mem.query('test pattern', 3)
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('deve retornar vazio para task sem palavras relevantes', () => {
    const { mem } = setup()
    mem.record(baseInput({ tags: ['rust'] }))
    expect(mem.query('typescript')).toHaveLength(0)
  })
})

function profile(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    root: tmpDir,
    projectKind: 'existing',
    traits: [],
    languages: [{ name: 'typescript', confidence: 1, source: 'test' }],
    frameworks: [{ name: 'react', confidence: 1, source: 'test' }],
    packageManagers: [{ name: 'pnpm', confidence: 1, source: 'test' }],
    workspaces: [],
    buildCommands: [],
    testCommands: [],
    lintCommands: [],
    typecheckCommands: [],
    validations: [],
    ci: [],
    containers: [],
    taskRunners: [],
    instructionFiles: [],
    sensitiveFiles: [],
    risks: [],
    entrypoints: [],
    architectureHints: [],
    signals: [],
    observations: [],
    confidence: 1,
    ...overrides,
  }
}

describe('active invalidation', () => {
  it('invalida learning quando stack/framework/package manager muda', () => {
    const { mem } = setup()
    mem.record(baseInput({
      status: 'verified',
      description: 'typescript async pattern',
      tags: ['typescript'],
      projectFingerprint: 'old-fingerprint',
    }))

    const invalidated = mem.invalidateAgainstProject(profile())

    expect(invalidated).toHaveLength(1)
    expect(mem.list({ status: 'invalidated' })).toHaveLength(1)
    expect(mem.list({ status: 'invalidated' })[0].invalidationReason).toContain('fingerprint')
  })

  it('learning invalidado nao aparece em query', () => {
    const { mem } = setup()
    const learning = mem.record(baseInput({ status: 'verified', description: 'typescript async pattern', tags: ['typescript', 'async'] }))
    mem.remove(learning.id)
    mem.record({ ...baseInput({ status: 'invalidated', description: 'typescript async pattern', tags: ['typescript', 'async'] }), invalidatedAt: new Date().toISOString() })

    expect(mem.query('typescript async')).toHaveLength(0)
  })

  it('learning invalidado permanece auditavel na listagem', () => {
    const { mem } = setup()
    mem.record(baseInput({ status: 'invalidated', description: 'old pattern', invalidationReason: 'Package manager changed.' }))

    const invalidated = mem.list({ status: 'invalidated' })
    expect(invalidated).toHaveLength(1)
    expect(invalidated[0].invalidationReason).toBe('Package manager changed.')
  })
})

describe('promote', () => {
  it('deve promover experimental para verified com confidence >= 3', () => {
    const { mem } = setup()
    mem.record(baseInput({ confidence: 1 }))
    mem.record(baseInput())  // confidence 2 (dedup)
    mem.record(baseInput())  // confidence 3

    mem.promote()
    const list = mem.list()
    expect(list[0].status).toBe('verified')
  })
})

describe('prune', () => {
  it('deve remover learnings com 2+ contradições', () => {
    const { mem } = setup()
    mem.record(baseInput())

    // Força contradições diretamente no arquivo para simular conflito externo
    const memFile = join(tmpDir, '.kova', 'memory', 'learnings.json')
    const data = JSON.parse(readFileSync(memFile, 'utf-8')) as Learning[]
    data[0] = { ...data[0], contradictions: 2 }
    writeFileSync(memFile, JSON.stringify(data))

    mem.prune()
    expect(mem.list()).toHaveLength(0)
  })
})

describe('list / inspect / remove', () => {
  it('deve filtrar por status', () => {
    const { mem } = setup()
    mem.record(baseInput({ status: 'experimental' }))
    mem.record(baseInput({ description: 'outro', status: 'experimental' }))
    expect(mem.list({ status: 'experimental' })).toHaveLength(2)
    expect(mem.list({ status: 'verified' })).toHaveLength(0)
  })

  it('deve retornar learning por id com inspect', () => {
    const { mem } = setup()
    const l = mem.record(baseInput())
    const found = mem.inspect(l.id)
    expect(found?.id).toBe(l.id)
  })

  it('deve retornar null para id inexistente', () => {
    const { mem } = setup()
    expect(mem.inspect('nao-existe')).toBeNull()
  })

  it('deve remover learning por id', () => {
    const { mem } = setup()
    const l = mem.record(baseInput())
    mem.remove(l.id)
    expect(mem.list()).toHaveLength(0)
  })
})

// ─── recordFromIteration ─────────────────────────────────────────────────────

function makeTask(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
  return {
    id: 'task-test', objective: 'add error handling', type: 'bugfix',
    impact: 'low', stackAdapter: 'typescript',
    constraints: [], nonGoals: [], validationCriteria: [], affectedFiles: [],
    ...overrides,
  }
}

function makePassedHarness(): HarnessResult {
  return {
    passed: true, score: 92, duration: 500, iteration: 1,
    validationConfidence: 'full',
    layers: [
      { name: 'build', passed: true, skipped: false, errors: [], warnings: [], duration: 200 },
      { name: 'tests', passed: true, skipped: false, errors: [], warnings: [], duration: 300 },
    ],
  }
}

function makeFailedHarness(errorMsg = 'Type error'): HarnessResult {
  return {
    passed: false, score: 40, duration: 200, iteration: 1,
    validationConfidence: 'partial',
    layers: [
      {
        name: 'build', passed: false, skipped: false, duration: 200,
        warnings: [],
        errors: [{ layer: 'build', type: 'syntax', severity: 'high', fixable: true, message: errorMsg, humanMessage: errorMsg, file: 'src/index.ts' }],
      },
    ],
  }
}

function makeDecision(decision: DecisionResult['decision'] = 'auto_apply'): DecisionResult {
  return { decision, score: 92, reason: 'ok', feedback: [] }
}

function makeIteration(overrides: Partial<IterationRecord> = {}): IterationRecord {
  return {
    iteration: 1, agentMode: 'code', agentThought: '', tokensUsed: 100, duration: 1000,
    changes: [{ path: 'src/index.ts', type: 'modify', diff: '+const x = 1' }],
    harnessResult: makePassedHarness(),
    decision: makeDecision(),
    ...overrides,
  }
}

describe('recordFromIteration', () => {
  it('records a pattern learning after clean first-pass auto_apply', () => {
    const { mem } = setup()
    const task = makeTask()
    const iterations = [makeIteration()]

    const recorded = mem.recordFromIteration(task, iterations)

    expect(recorded).toHaveLength(1)
    expect(recorded[0].type).toBe('pattern')
    expect(recorded[0].source).toBe('auto_extracted')
    expect(recorded[0].tags).toContain('typescript')
    expect(mem.list()).toHaveLength(1)
  })

  it('records a decision learning after a successful repair loop', () => {
    const { mem } = setup()
    const task = makeTask()
    const iterations = [
      makeIteration({ iteration: 1, harnessResult: makeFailedHarness('Type mismatch in handler'), decision: makeDecision('reject') }),
      makeIteration({ iteration: 2, harnessResult: makePassedHarness(), decision: makeDecision('auto_apply') }),
    ]

    const recorded = mem.recordFromIteration(task, iterations)

    expect(recorded).toHaveLength(1)
    expect(recorded[0].type).toBe('decision')
    expect(recorded[0].description).toContain('Type mismatch')
  })

  it('does not record when last iteration harness failed', () => {
    const { mem } = setup()
    const task = makeTask()
    const iterations = [makeIteration({ harnessResult: makeFailedHarness(), decision: makeDecision('reject') })]

    const recorded = mem.recordFromIteration(task, iterations)
    expect(recorded).toHaveLength(0)
  })

  it('does not duplicate: same learning recorded twice stays as one', () => {
    const { mem } = setup()
    const task = makeTask()
    const iterations = [makeIteration()]

    mem.recordFromIteration(task, iterations)
    mem.recordFromIteration(task, iterations)

    expect(mem.list()).toHaveLength(1)
  })

  it('sets source to auto_extracted', () => {
    const { mem } = setup()
    const recorded = mem.recordFromIteration(makeTask(), [makeIteration()])
    expect(recorded[0].source).toBe('auto_extracted')
  })

  it('queues needs_review when harness passes but no tests ran', () => {
    const { mem, root } = setup()
    const task = makeTask()
    // Harness passed but only build ran (no tests) → gate returns needs_review
    const noTestHarness: HarnessResult = {
      passed: true, score: 70, duration: 200, iteration: 1,
      validationConfidence: 'partial',
      layers: [{ name: 'build', passed: true, skipped: false, errors: [], warnings: [], duration: 200 }],
    }
    const iterations = [makeIteration({ harnessResult: noTestHarness })]

    const recorded = mem.recordFromIteration(task, iterations)

    expect(recorded).toHaveLength(0)
    const pending = mem.listPending()
    expect(pending.length).toBeGreaterThan(0)
    expect(pending[0].classification).toBe('needs_review')
  })

  it('increments contradictions on existing pattern when repair learning is recorded', () => {
    const { mem } = setup()
    const task = makeTask()

    // First: record a "first-pass" pattern
    mem.recordFromIteration(task, [makeIteration()])
    const patternBefore = mem.list().find(l => l.type === 'pattern')
    expect(patternBefore).toBeTruthy()
    expect(patternBefore!.contradictions).toBe(0)

    // Then: record a repair in the same stack — should contradict the pattern
    mem.recordFromIteration(task, [
      makeIteration({ iteration: 1, harnessResult: makeFailedHarness('build error'), decision: makeDecision('reject') }),
      makeIteration({ iteration: 2, harnessResult: makePassedHarness(), decision: makeDecision('auto_apply') }),
    ])

    const patternAfter = mem.list().find(l => l.type === 'pattern')
    expect(patternAfter!.contradictions).toBe(1)
  })

  it('does not queue duplicate pending entries', () => {
    const { mem } = setup()
    const noTestHarness: HarnessResult = {
      passed: true, score: 70, duration: 200, iteration: 1,
      validationConfidence: 'partial',
      layers: [{ name: 'build', passed: true, skipped: false, errors: [], warnings: [], duration: 200 }],
    }
    const iterations = [makeIteration({ harnessResult: noTestHarness })]

    mem.recordFromIteration(makeTask(), iterations)
    mem.recordFromIteration(makeTask(), iterations)

    expect(mem.listPending()).toHaveLength(1)
  })

  it('clearPending empties the queue', () => {
    const { mem } = setup()
    const noTestHarness: HarnessResult = {
      passed: true, score: 70, duration: 200, iteration: 1,
      validationConfidence: 'partial',
      layers: [{ name: 'build', passed: true, skipped: false, errors: [], warnings: [], duration: 200 }],
    }
    mem.recordFromIteration(makeTask(), [makeIteration({ harnessResult: noTestHarness })])
    expect(mem.listPending()).toHaveLength(1)

    mem.clearPending()
    expect(mem.listPending()).toHaveLength(0)
  })
})
