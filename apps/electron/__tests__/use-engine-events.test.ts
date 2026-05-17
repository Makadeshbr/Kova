import { describe, expect, it } from 'vitest'
import type { AgentResultMessage } from '@kova/shared'
import { historyTextForStreamEnd } from '../src/renderer/src/hooks/useEngineEvents'
import { createChatMessageId } from '../src/renderer/src/lib/message-ids'

describe('useEngineEvents stream_end history text', () => {
  it('prefers structured agent result history over raw streamed markdown', () => {
    const structured: AgentResultMessage = {
      kind: 'agent_result',
      title: 'Task complete',
      summary: 'Changes applied successfully.',
      filesChanged: [{ path: 'src/main.ts', displayName: 'main.ts', status: 'created' }],
      validations: [],
      risk: 'low',
      decision: 'apply',
      notes: ['Run additional validation before auto-apply.'],
    }

    const historyText = historyTextForStreamEnd('```ts\nconsole.log("raw leaked code")\n```', structured)

    expect(historyText).toContain('Files changed: src/main.ts (created)')
    expect(historyText).not.toContain('raw leaked code')
  })

  it('generates unique message ids for rapid same-tick updates', () => {
    const ids = new Set(Array.from({ length: 20 }, () => createChatMessageId('test')))

    expect(ids.size).toBe(20)
  })
})
