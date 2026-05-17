import { describe, expect, it } from 'vitest'
import { GOLDEN_SCENARIOS } from '../src/golden-scenarios'

describe('golden scenarios', () => {
  it('keeps the field regression for landing page + install + dev server explicit', () => {
    const scenario = GOLDEN_SCENARIOS.find(item => item.id === 'landing-page-install-dev-server')

    expect(scenario).toBeTruthy()
    expect(scenario?.expectations.commandsRun).toEqual(['npm install', 'npm run dev'])
    expect(scenario?.expectations.persistentServer).toBe(true)
    expect(scenario?.expectations.urlDetected).toBe(true)
    expect(scenario?.expectations.queueUnblocked).toBe(true)
    expect(scenario?.expectations.validatedOnlyWithEvidence).toBe(true)
  })

  it('covers the most important terminal failure modes', () => {
    const blockedCauses = GOLDEN_SCENARIOS.flatMap(item => item.expectations.blockedCauses ?? [])

    expect(blockedCauses).toEqual(expect.arrayContaining(['port_in_use', 'node_version_mismatch']))
  })
})
