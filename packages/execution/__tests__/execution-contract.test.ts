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
  it('blocks TypeScript files in a Go task when modifying existing code', () => {
    // Stack mismatch and allowed_paths only fire when the patch touches
    // existing code. Pure-create scaffolding bypasses these rules to match
    // Claude Code's "let the agent build what it builds" UX.
    const contract = createExecutionContract(task())
    const modify: FileChange = { path: 'cmd/api/helpers.ts', type: 'modify', diff: 'export {}', before: '// old' }
    const violations = validateContractChanges([modify], contract)

    expect(violations.some(v => v.rule === 'stack_mismatch')).toBe(true)
  })

  it('blocks changes outside allowed paths when modifying existing code', () => {
    const contract = createExecutionContract(task())
    const modify: FileChange = { path: 'web/app.tsx', type: 'modify', diff: 'export {}', before: '// old' }
    const violations = validateContractChanges([modify], contract)

    expect(violations.some(v => v.rule === 'allowed_paths')).toBe(true)
  })

  it('scaffolding bypass: pure-create patches skip stack_mismatch and allowed_paths', () => {
    // Claude Code parity: when every change is a brand-new file, the agent
    // is materializing a project — there is no existing scope to honour.
    // Stack mismatch and allowed_paths are dropped; only forbidden paths
    // (node_modules, dist, .git) and credential files (.env) still block.
    const contract = createExecutionContract(task())
    const violations = validateContractChanges([change('web/app.tsx'), change('cmd/api/helpers.ts')], contract)

    expect(violations.some(v => v.rule === 'stack_mismatch')).toBe(false)
    expect(violations.some(v => v.rule === 'allowed_paths')).toBe(false)
  })

  it('scaffolding bypass: still blocks forbidden paths even in pure-create', () => {
    const contract = createExecutionContract(task({ stackAdapter: 'typescript', affectedFiles: [] }))
    const violations = validateContractChanges([change('node_modules/foo.js'), change('src/app.tsx')], contract)

    expect(violations.some(v => v.rule === 'forbidden_path')).toBe(true)
  })

  it('scaffolding bypass: still blocks credential files even in pure-create', () => {
    const contract = createExecutionContract(task({ stackAdapter: 'typescript', affectedFiles: [] }))
    const violations = validateContractChanges([change('.env'), change('src/app.tsx')], contract)

    expect(violations.some(v => v.rule === 'safe_zone' && v.file === '.env')).toBe(true)
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
