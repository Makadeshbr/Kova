import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { Learning } from '@kova/shared'
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
