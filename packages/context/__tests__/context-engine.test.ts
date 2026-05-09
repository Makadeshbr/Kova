import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { TaskDefinition } from '@kova/shared'
import { TypeScriptAdapter, GenericAdapter } from '@kova/adapters'
import { MemorySystem } from '@kova/memory'
import { ContextEngine } from '../src/context-engine'

let tmpDir = ''

function setup() {
  tmpDir = mkdtempSync(join(tmpdir(), 'kova-ctx-'))
  const memory = new MemorySystem(tmpDir)
  return { root: tmpDir, memory }
}

afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
  tmpDir = ''
})

function makeTask(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
  return {
    id: 'task-1', objective: 'implement token validation',
    constraints: [], nonGoals: [], validationCriteria: [],
    type: 'feature', impact: 'medium', affectedFiles: [], stackAdapter: 'typescript',
    ...overrides,
  }
}

describe('ContextEngine.buildContext', () => {
  it('deve retornar AgentContext com files e tokensUsed', async () => {
    const { root, memory } = setup()
    writeFileSync(join(root, 'auth.ts'), 'export function validateToken() {}')

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(makeTask({ affectedFiles: ['auth.ts'] }), root)

    expect(ctx.files).toBeDefined()
    expect(ctx.tokensUsed).toBeGreaterThan(0)
    expect(ctx.learnings).toBeDefined()
  })

  it('deve incluir arquivo alvo com relevance target', async () => {
    const { root, memory } = setup()
    writeFileSync(join(root, 'auth.ts'), 'export function validate() {}')

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(makeTask({ affectedFiles: ['auth.ts'] }), root)

    const target = ctx.files.find(f => f.path === 'auth.ts')
    expect(target).toBeDefined()
    expect(target?.relevance).toBe('target')
    expect(target?.score).toBe(100)
    expect(target?.reason).toContain('Explicitly affected')
    expect(target?.source).toBe('explicit')
    expect(target?.evidence).toContain('task.affectedFiles')
    expect(ctx.pack?.files.find(f => f.path === 'auth.ts')?.reason).toContain('Explicitly affected')
  })

  it('deve incluir RULES.md com prioridade rules quando existir', async () => {
    const { root, memory } = setup()
    writeFileSync(join(root, 'RULES.md'), '# Project Rules\n- No any types')
    writeFileSync(join(root, 'app.ts'), 'export const x = 1')

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(makeTask({ affectedFiles: ['app.ts'] }), root)

    const rules = ctx.files.find(f => f.path === 'RULES.md')
    expect(rules).toBeDefined()
    expect(rules?.relevance).toBe('rules')
  })

  it('deve incluir deps diretas com relevance direct_dep', async () => {
    const { root, memory } = setup()
    writeFileSync(join(root, 'app.ts'), `import { helper } from './utils'`)
    writeFileSync(join(root, 'utils.ts'), 'export function helper() {}')

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(makeTask({ affectedFiles: ['app.ts'] }), root)

    const dep = ctx.files.find(f => f.path === 'utils.ts')
    expect(dep?.relevance).toBe('direct_dep')
  })

  it('deve retornar max 5 learnings', async () => {
    const { root, memory } = setup()
    writeFileSync(join(root, 'app.ts'), 'export const x = 1')

    for (let i = 0; i < 8; i++) {
      memory.record({
        type: 'pattern', scope: 'project', status: 'verified',
        confidence: 5, contradictions: 0,
        description: `token validation pattern ${i}`,
        evidence: [], tags: ['token', 'validation'],
      })
    }

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(
      makeTask({ objective: 'validate token', affectedFiles: ['app.ts'] }), root,
    )

    expect(ctx.learnings.length).toBeLessThanOrEqual(5)
  })

  it('deve funcionar com GenericAdapter (grafo vazio — fallback grep-only)', async () => {
    const { root, memory } = setup()
    writeFileSync(join(root, 'main.cpp'), '#include "utils.h"\nvoid main() {}')

    const engine = new ContextEngine(memory, GenericAdapter)
    const ctx = await engine.buildContext(
      makeTask({ objective: 'main cpp utils', affectedFiles: ['main.cpp'] }), root,
    )

    // não deve crashar; deve retornar contexto válido
    expect(ctx.files).toBeDefined()
    expect(ctx.tokensUsed).toBeGreaterThan(0)
  })

  it('deve respeitar maxTokens', async () => {
    const { root, memory } = setup()
    // cria arquivo grande
    writeFileSync(join(root, 'big.ts'), 'x'.repeat(10_000))

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(
      makeTask({ affectedFiles: ['big.ts'] }), root,
      { maxTokens: 100 },
    )

    expect(ctx.tokensUsed).toBeLessThanOrEqual(110) // margem para truncamento
    expect(ctx.pack?.budget.maxTokens).toBe(100)
    expect(ctx.pack?.omitted.overBudgetFiles.length).toBeGreaterThanOrEqual(0)
  })

  it('nao inclui arquivos sensiveis no contexto nem vaza conteudo no ContextPack', async () => {
    const { root, memory } = setup()
    writeFileSync(join(root, '.env'), 'SECRET=super-secret')
    writeFileSync(join(root, 'app.ts'), 'export const safe = true')

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(
      makeTask({ objective: 'update secret handling', affectedFiles: ['.env', 'app.ts'] }),
      root,
    )

    expect(ctx.files.map(file => file.path)).not.toContain('.env')
    expect(ctx.files.map(file => file.content).join('\n')).not.toContain('super-secret')
    expect(ctx.pack?.omitted.sensitiveFiles).toContain('.env')
  })

  it('ContextPack lista validacoes e apenas memorias verificadas', async () => {
    const { root, memory } = setup()
    writeFileSync(join(root, 'package.json'), JSON.stringify({
      scripts: { build: 'tsc', test: 'vitest run', typecheck: 'tsc --noEmit' },
    }))
    writeFileSync(join(root, 'app.ts'), 'export const x = 1')
    memory.record({
      type: 'pattern', scope: 'project', status: 'verified',
      confidence: 5, contradictions: 0,
      description: 'validated token validation convention',
      evidence: [], tags: ['token'],
    })
    memory.record({
      type: 'pattern', scope: 'project', status: 'experimental',
      confidence: 2, contradictions: 0,
      description: 'temporary token workaround',
      evidence: [], tags: ['token'],
    })

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(makeTask({ objective: 'validate token', affectedFiles: ['app.ts'] }), root)

    expect(ctx.pack?.validations.map(item => item.kind)).toEqual(expect.arrayContaining(['build', 'test', 'typecheck']))
    expect(ctx.pack?.memories.map(item => item.description)).toContain('validated token validation convention')
    expect(ctx.pack?.memories.map(item => item.description)).not.toContain('temporary token workaround')
  })
})
