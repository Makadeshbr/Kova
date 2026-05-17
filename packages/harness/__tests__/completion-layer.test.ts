import { describe, expect, it } from 'vitest'
import type { CompletionProof } from '@kova/shared'
import { runCompletionLayer } from '../src/layers/completion'

function proof(overrides: Partial<CompletionProof> = {}): CompletionProof {
  return {
    requirements: [],
    items: [],
    changedFiles: [],
    commandsRun: [],
    validationsRun: [],
    serverSessions: [],
    claims: [],
    ...overrides,
  }
}

describe('completion layer', () => {
  it('passes when every blocking completion requirement has evidence', () => {
    const result = runCompletionLayer({
      proof: proof({
        requirements: [{
          id: 'command:npm install',
          kind: 'command',
          label: 'Requested command npm install',
          value: 'npm install',
          required: true,
          source: 'user_request',
        }],
        items: [{
          requirementId: 'command:npm install',
          satisfied: true,
          evidence: 'npm install',
          blocking: true,
          fixable: true,
        }],
      }),
    })

    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails as fixable when a requested command or dev server has no proof', () => {
    const result = runCompletionLayer({
      proof: proof({
        requirements: [{
          id: 'dev_server:npm run dev',
          kind: 'dev_server',
          label: 'Requested command npm run dev',
          value: 'npm run dev',
          required: true,
          source: 'user_request',
        }],
        items: [{
          requirementId: 'dev_server:npm run dev',
          satisfied: false,
          blocking: true,
          fixable: true,
          reason: 'Dev server was requested but no ready persistent session was proven.',
        }],
      }),
    })

    expect(result.passed).toBe(false)
    expect(result.errors[0]).toMatchObject({
      layer: 'completion',
      severity: 'high',
      fixable: true,
      rule: 'completion_dev_server',
    })
  })

  it('marks non-fixable blocking proof gaps as critical', () => {
    const result = runCompletionLayer({
      proof: proof({
        requirements: [{
          id: 'claim:forbidden',
          kind: 'claim',
          label: 'Agent finished honestly',
          value: 'forbidden path',
          required: true,
          source: 'contract',
        }],
        items: [{
          requirementId: 'claim:forbidden',
          satisfied: false,
          blocking: true,
          fixable: false,
          reason: 'Forbidden path requires human review.',
        }],
      }),
    })

    expect(result.passed).toBe(false)
    expect(result.errors[0]).toMatchObject({ severity: 'critical', fixable: false })
  })
})
