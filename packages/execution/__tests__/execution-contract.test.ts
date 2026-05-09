import { describe, expect, it } from 'vitest'
import type { FileChange, TaskDefinition } from '@kova/shared'
import { createExecutionContract, validateContractChanges } from '../src/execution-contract'

function task(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
  return {
    id: 'task-1',
    objective: 'create a Go API',
    constraints: [],
    nonGoals: [],
    validationCriteria: ['go test ./... passes'],
    type: 'feature',
    impact: 'medium',
    affectedFiles: ['cmd/api/main.go'],
    stackAdapter: 'go',
    ...overrides,
  }
}

function change(path: string): FileChange {
  return { path, type: 'create', diff: 'content' }
}

describe('Execution Contract', () => {
  it('blocks TypeScript files in a Go task', () => {
    const contract = createExecutionContract(task())
    const violations = validateContractChanges([change('cmd/api/helpers.ts')], contract)

    expect(violations.some(v => v.rule === 'stack_mismatch')).toBe(true)
  })

  it('blocks changes outside allowed paths', () => {
    const contract = createExecutionContract(task())
    const violations = validateContractChanges([change('web/app.tsx')], contract)

    expect(violations.some(v => v.rule === 'allowed_paths')).toBe(true)
  })

  it('allows creating package.json as a new file — safe zones only block modifications', () => {
    const contract = createExecutionContract(task({ stackAdapter: 'typescript', affectedFiles: [] }))
    const violations = validateContractChanges([change('package.json')], contract)

    expect(violations.some(v => v.rule === 'safe_zone')).toBe(false)
  })

  it('blocks modifying package.json as safe zone', () => {
    const contract = createExecutionContract(task({ stackAdapter: 'typescript', affectedFiles: [] }))
    const modifyChange: FileChange = { path: 'package.json', type: 'modify', diff: '{}', before: '{}' }
    const violations = validateContractChanges([modifyChange], contract)

    expect(violations.some(v => v.rule === 'safe_zone')).toBe(true)
  })
})
