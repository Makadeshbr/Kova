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
    expect(target?.reason).toContain('Explicitly referenced')
    expect(target?.source).toBe('explicit')
    expect(target?.evidence).toContain('explicit_reference')
    expect(ctx.pack?.files.find(f => f.path === 'auth.ts')?.reason).toContain('Explicitly referenced')
    expect(ctx.pack?.files.find(f => f.path === 'auth.ts')?.included).toBe(true)
    expect(ctx.pack?.files.find(f => f.path === 'auth.ts')?.confidence).toBeGreaterThan(0.9)
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

  it('inclui KOVA.md e AGENTS.md como instrucoes aplicadas com fonte clara', async () => {
    const { root, memory } = setup()
    writeFileSync(join(root, 'KOVA.md'), '# Kova\nPreserve local style.')
    writeFileSync(join(root, 'AGENTS.md'), '# Agents\nRun deterministic checks.')
    writeFileSync(join(root, 'app.ts'), 'export const x = 1')

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(makeTask({ affectedFiles: ['app.ts'] }), root)

    expect(ctx.pack?.appliedInstructions.map(item => item.path)).toEqual(expect.arrayContaining(['KOVA.md', 'AGENTS.md']))
    expect(ctx.pack?.selectedFiles.find(file => file.path === 'KOVA.md')).toEqual(expect.objectContaining({
      kind: 'instruction',
      source: 'instruction',
    }))
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

  it('inclui teste relacionado por convencao de nome e caminho', async () => {
    const { root, memory } = setup()
    writeFileSync(join(root, 'auth.ts'), 'export function validateToken() {}')
    writeFileSync(join(root, 'auth.test.ts'), 'import { validateToken } from "./auth"')

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(makeTask({ affectedFiles: ['auth.ts'] }), root)

    const related = ctx.pack?.relatedTests.find(file => file.path === 'auth.test.ts')
    expect(related).toEqual(expect.objectContaining({
      source: 'related_test',
      kind: 'test',
      evidence: expect.arrayContaining(['related_test', 'source:auth.ts']),
    }))
  })

  it('ranqueia match textual acima de arquivo irrelevante', async () => {
    const { root, memory } = setup()
    writeFileSync(join(root, 'token-policy.ts'), 'export const tokenValidation = true')
    writeFileSync(join(root, 'misc.ts'), 'export const unrelated = true')

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(makeTask({ objective: 'token validation', affectedFiles: [] }), root)

    const matched = ctx.pack?.selectedFiles.find(file => file.path === 'token-policy.ts')
    expect(matched?.source).toBe('grep')
    expect(matched?.score).toBeGreaterThan(0)
    expect(ctx.pack?.selectedFiles.map(file => file.path)[0]).toBe('token-policy.ts')
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

  it('limita contexto em projeto com muitos arquivos e registra rejeicoes por budget', async () => {
    const { root, memory } = setup()
    for (let i = 0; i < 12; i++) {
      writeFileSync(join(root, `token-${i}.ts`), `export const tokenValidation${i} = '${'x'.repeat(120)}'`)
    }

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(makeTask({ objective: 'token validation', affectedFiles: [] }), root, { maxTokens: 120 })

    expect(ctx.pack?.contextBudget.maxTokens).toBe(120)
    expect(ctx.pack?.selectedFiles.length).toBeLessThan(12)
    expect(ctx.pack?.rejectedFiles.some(file => file.reason === 'Excluded by context budget.')).toBe(true)
  })

  it('gera snippet perto do trecho relevante em arquivo longo', async () => {
    const { root, memory } = setup()
    writeFileSync(join(root, 'policy.ts'), [
      'x'.repeat(900),
      'export function validateTokenPolicy() { return true }',
      'y'.repeat(900),
    ].join('\n'))

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(makeTask({ objective: 'validate token policy', affectedFiles: ['policy.ts'] }), root)

    const snippet = ctx.pack?.selectedSnippets.find(item => item.path === 'policy.ts')?.preview ?? ''
    expect(snippet).toContain('validateTokenPolicy')
    expect(snippet.length).toBeLessThan(620)
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
    expect(ctx.pack?.blockedFiles.find(file => file.path === '.env')?.reason).toContain('sensitive')
  })

  it('permite .env.example seguro quando citado explicitamente', async () => {
    const { root, memory } = setup()
    writeFileSync(join(root, '.env.example'), 'TOKEN=example\nAPI_URL=http://localhost')

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(
      makeTask({ objective: 'document env example', affectedFiles: ['.env.example'] }),
      root,
    )

    expect(ctx.files.map(file => file.path)).toContain('.env.example')
    expect(ctx.pack?.blockedFiles.map(file => file.path)).not.toContain('.env.example')
  })

  it('rejeita arquivos grandes, gerados, vendor e build artifacts', async () => {
    const { root, memory } = setup()
    mkdirSync(join(root, 'dist'), { recursive: true })
    mkdirSync(join(root, 'vendor'), { recursive: true })
    writeFileSync(join(root, 'dist/generated.ts'), 'export const generated = true')
    writeFileSync(join(root, 'vendor/lib.ts'), 'export const vendored = true')
    writeFileSync(join(root, 'large.ts'), 'x'.repeat(200_000))

    const engine = new ContextEngine(memory, TypeScriptAdapter)
    const ctx = await engine.buildContext(
      makeTask({ objective: 'inspect files', affectedFiles: ['dist/generated.ts', 'vendor/lib.ts', 'large.ts'] }),
      root,
    )

    expect(ctx.files.map(file => file.path)).not.toEqual(expect.arrayContaining(['dist/generated.ts', 'vendor/lib.ts', 'large.ts']))
    expect(ctx.pack?.rejectedFiles).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'dist/generated.ts', reason: expect.stringContaining('Generated') }),
      expect.objectContaining({ path: 'vendor/lib.ts', reason: expect.stringContaining('Generated') }),
      expect.objectContaining({ path: 'large.ts', reason: 'File is too large for context.' }),
    ]))
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
    expect(ctx.learnings.map(item => item.description)).not.toContain('temporary token workaround')
    expect(ctx.pack?.verifiedMemories[0]).toEqual(expect.objectContaining({
      description: 'validated token validation convention',
      status: 'verified',
      scope: 'project',
    }))
  })
})
