import { describe, expect, it, vi } from 'vitest'
import { structureTask, type TaskStructuringProject } from '../src/tsl'

function makeProject(response: string, id = 'task-1'): TaskStructuringProject {
  return {
    id,
    root: '/repo',
    stackAdapter: 'typescript',
    affectedFiles: ['src/auth.ts'],
    llm: { generate: vi.fn().mockResolvedValue({ thought: response }) },
  }
}

function validJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    objective: 'Refatorar fluxo de login preservando comportamento',
    constraints: ['Nao alterar API publica'],
    nonGoals: ['Nao trocar provider de auth'],
    validationCriteria: ['Build passa', 'Testes de auth passam'],
    type: 'refactor',
    impact: 'medium',
    ...overrides,
  })
}

describe('structureTask', () => {
  it('deve retornar invalid quando input e vago', async () => {
    const project = makeProject(validJson())
    const result = await structureTask('melhore', project)

    expect(result.valid).toBe(false)
    if (result.valid) throw new Error('expected invalid result')
    expect(result.suggestions[0]).toContain('objetivo concreto')
    expect(project.llm.generate).not.toHaveBeenCalled()
  })

  it('deve retornar TaskDefinition completa quando input e claro', async () => {
    const project = makeProject(validJson())
    const result = await structureTask(
      'refatore o fluxo de login em src/auth.ts sem mudar a API',
      project,
    )

    expect(result.valid).toBe(true)
    if (!result.valid) throw new Error('expected valid result')
    expect(result.task.objective).toContain('login')
    expect(result.task.constraints).toContain('Nao alterar API publica')
    expect(result.task.validationCriteria).toContain('Build passa')
    expect(result.task.type).toBe('refactor')
    expect(result.task.stackAdapter).toBe('typescript')
    const prompt = (project.llm.generate as ReturnType<typeof vi.fn>).mock.calls[0][0][0].content
    expect(prompt).toContain('/repo')
    expect(prompt).toContain('src/auth.ts')
  })

  it('deve tentar reparar JSON malformado do LLM', async () => {
    const llm = {
      generate: vi.fn()
        .mockResolvedValueOnce({ thought: '{ objective:' })
        .mockResolvedValueOnce({ thought: validJson({ objective: 'Corrigir erro de build no modulo auth' }) }),
    }
    const result = await structureTask(
      'corrija erro de build em src/auth.ts',
      { ...makeProject(validJson()), llm },
    )

    expect(llm.generate).toHaveBeenCalledTimes(2)
    expect(result.valid).toBe(true)
  })

  it('deve retornar invalid quando JSON continua malformado', async () => {
    const llm = { generate: vi.fn().mockResolvedValue({ thought: 'not json' }) }
    const result = await structureTask(
      'corrija erro de build em src/auth.ts',
      { ...makeProject(validJson()), llm },
    )

    expect(result.valid).toBe(false)
    if (result.valid) throw new Error('expected invalid result')
    expect(result.reason).toContain('malformado')
  })

  it('deve inferir impact high para auth e security', async () => {
    const result = await structureTask(
      'corrija validacao de token no login',
      makeProject(validJson({ impact: 'low' })),
    )

    expect(result.valid).toBe(true)
    if (!result.valid) throw new Error('expected valid result')
    expect(result.task.impact).toBe('high')
  })

  it('deve inferir impact low para documentacao', async () => {
    const result = await structureTask(
      'atualize a documentacao do README',
      { ...makeProject(validJson({ type: 'docs', impact: 'high' })), affectedFiles: ['README.md'] },
    )

    expect(result.valid).toBe(true)
    if (!result.valid) throw new Error('expected valid result')
    expect(result.task.impact).toBe('low')
  })

  it('deve rejeitar resposta sem criterios de validacao', async () => {
    const result = await structureTask(
      'implemente cache de contexto em src/context.ts',
      makeProject(validJson({ validationCriteria: [] })),
    )

    expect(result.valid).toBe(false)
    if (result.valid) throw new Error('expected invalid result')
    expect(result.reason).toContain('Missing criteria')
  })
})
