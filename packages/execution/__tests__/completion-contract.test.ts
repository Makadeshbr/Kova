import { describe, expect, it } from 'vitest'
import type { FileChange, TaskDefinition } from '@kova/shared'
import { buildCompletionProof, inferCompletionRequirements } from '../src/completion-contract'

function task(objective: string): TaskDefinition {
  return {
    id: 't-completion',
    objective,
    constraints: [],
    nonGoals: [],
    validationCriteria: [],
    type: 'feature',
    impact: 'medium',
    affectedFiles: [],
    stackAdapter: 'typescript',
  }
}

function proof(objective: string, changes: FileChange[] = [], thought = '') {
  return buildCompletionProof(task(objective), changes, {
    toolCalls: [],
    toolResults: [],
    events: [],
  }, thought)
}

describe('completion contract', () => {
  it('does not treat prompt prose like etc.Use as required files', () => {
    const objective = [
      'crie uma landing page moderna,de festas de aniversario,onde tem festa na caixa,arco decorativo e etc.Use stack moderna',
      '## SKILL: Frontend Cinematic Specialist',
      '## Arquitetura proposta 3. Código pronto de produção 4. Dicas de animação e performance',
    ].join(' ')

    const requirements = inferCompletionRequirements(objective)

    expect(requirements.map(req => req.value)).not.toContain('etc.Use')
    expect(requirements.filter(req => req.kind === 'file')).toHaveLength(0)
  })

  it('requires explicitly requested install and dev server commands', () => {
    const requirements = inferCompletionRequirements('rode npm install para mim e npm run dev')

    expect(requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'command', value: 'npm install' }),
      expect.objectContaining({ kind: 'dev_server', value: 'npm run dev' }),
    ]))
  })

  it('fails requested dev server proof until a ready persistent session exists', () => {
    const incomplete = proof('crie a landing page e rode npm run dev')
    expect(incomplete.items).toContainEqual(expect.objectContaining({
      satisfied: false,
      blocking: true,
      reason: expect.stringContaining('no ready persistent session'),
    }))

    const complete = buildCompletionProof(task('crie a landing page e rode npm run dev'), [], {
      toolCalls: [{ name: 'run_interactive_command', input: { command: 'npm run dev' } }],
      toolResults: [{ name: 'run_interactive_command', result: 'Persistent command started (term-1) ready=true url=http://localhost:5173 port=5173' }],
      events: [],
    }, '')

    expect(complete.items).toContainEqual(expect.objectContaining({
      satisfied: true,
      evidence: expect.stringContaining('localhost:5173'),
    }))
  })

  it('penalizes validation claims without a matching validation command', () => {
    const result = proof('implemente a feature', [], 'Rodei build e validei tudo.')

    expect(result.requirements).toContainEqual(expect.objectContaining({ kind: 'validation' }))
    expect(result.items).toContainEqual(expect.objectContaining({
      satisfied: false,
      blocking: true,
      reason: expect.stringContaining('no validation command ran'),
    }))
  })
})
