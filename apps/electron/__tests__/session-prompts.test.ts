/**
 * Mode-resolution contract — Kova v2 (sticky session mode).
 *
 * NEW CONTRACT (maio 2026):
 *   - Mode is a SESSION property, not inferred per-message.
 *   - The renderer pins a mode (default 'patch') and only changes it on
 *     explicit slash commands (`/plan`, `/review`, `/chat`).
 *   - Follow-up questions in a patch session stay in patch mode — the agent
 *     has tools and decides via tool use whether to read, answer, or write.
 *
 * Resolution order (first match wins):
 *   1. Slash prefix in message text (`/plan`, `/review`, `/chat`)
 *   2. Explicit `params.mode` from UI (when not 'patch')
 *   3. Default → 'patch' (unified, all tools)
 *
 * The old "engineering signal vs question form" heuristic is no longer used
 * for routing. It lives on as `isConversationalMessage` / `looksLikeEngineeringTask`
 * for soft signals (memory ranking, telemetry) but never decides mode.
 */
import { describe, it, expect } from 'vitest'
import {
  resolveRunMode,
  inferRunMode,
  isConversationalMessage,
  looksLikeEngineeringTask,
} from '../src/main/session-prompts'

describe('resolveRunMode — slash prefix in message text always wins', () => {
  it('routes /plan to plan', () => {
    expect(resolveRunMode('/plan add login flow')).toBe('plan')
  })
  it('routes /review to review', () => {
    expect(resolveRunMode('/review my recent change')).toBe('review')
  })
  it('routes /chat to chat', () => {
    expect(resolveRunMode('/chat explain monads')).toBe('chat')
  })
  it('slash wins over explicit pinned mode', () => {
    // user pinned 'chat' but typed /plan this turn — single-turn override.
    expect(resolveRunMode('/plan refactor X', 'chat')).toBe('plan')
  })
  it('case-insensitive slash matching', () => {
    expect(resolveRunMode('/Plan stuff')).toBe('plan')
    expect(resolveRunMode('/REVIEW stuff')).toBe('review')
  })
  it('bare slash command (no body) still routes', () => {
    expect(resolveRunMode('/plan')).toBe('plan')
    expect(resolveRunMode('/chat')).toBe('chat')
  })
})

describe('resolveRunMode — explicit pinned mode (no slash)', () => {
  it('honours pinned plan', () => {
    expect(resolveRunMode('keep planning the same thing', 'plan')).toBe('plan')
  })
  it('honours pinned review', () => {
    expect(resolveRunMode('keep reviewing', 'review')).toBe('review')
  })
  it('honours pinned chat', () => {
    expect(resolveRunMode('keep chatting', 'chat')).toBe('chat')
  })
  it('explicit patch falls through to default (patch)', () => {
    expect(resolveRunMode('any message', 'patch')).toBe('patch')
  })
})

describe('resolveRunMode — default is patch (unified), never chat', () => {
  // The critical fix: messages that LOOK like questions no longer
  // route to chat. Patch (unified) has read tools and the model decides.
  const followUpsThatUsedToRouteToChat = [
    'como posso testar?',
    'isso funcionou?',
    'que mais falta?',
    'how do I test this?',
    'did it work?',
    'what else is missing?',
    'o que é REST?',          // even pure curiosity → patch by default now
    'explain this code',
    'oi',                     // greeting in patch mode = patch (model will reply briefly)
    'obrigado',
    'tudo bem?',
  ]
  for (const message of followUpsThatUsedToRouteToChat) {
    it(`defaults to patch: "${message}"`, () => {
      expect(resolveRunMode(message)).toBe('patch')
      expect(resolveRunMode(message, 'patch')).toBe('patch')
    })
  }
})

describe('resolveRunMode — engineering commands stay patch', () => {
  const commands = [
    'crie uma landing page para barbearia',
    'corrija o bug em src/app.ts',
    'adicionar endpoint de login',
    'refatore o ContextEngine',
    'instale react-router',
    'rode os testes',
    'implemente paginacao na lista de usuarios',
    'fix the auth bug',
    'add a logout button',
    'create a new component called Hero',
    'refactor packages/decision/src/decision-engine.ts',
    'bootstrap a next.js app',
  ]
  for (const message of commands) {
    it(`stays patch: "${message}"`, () => {
      expect(resolveRunMode(message)).toBe('patch')
    })
  }
})

describe('resolveRunMode — edge cases', () => {
  it('empty string defaults to patch', () => {
    expect(resolveRunMode('')).toBe('patch')
  })
  it('whitespace-only defaults to patch', () => {
    expect(resolveRunMode('    ')).toBe('patch')
  })
  it('slash followed immediately by text without space — not a command', () => {
    // "/planning" should NOT route to plan mode (no word boundary).
    expect(resolveRunMode('/planning the next sprint')).toBe('patch')
  })
})

describe('inferRunMode — deprecated alias mirrors resolveRunMode', () => {
  it('delegates to resolveRunMode', () => {
    expect(inferRunMode('/plan x')).toBe('plan')
    expect(inferRunMode('como criar X?')).toBe('patch')
    expect(inferRunMode('oi')).toBe('patch')
  })
})

// ─── Soft signals (not used for routing — useful for memory/telemetry) ──────

describe('isConversationalMessage — kept as a soft signal', () => {
  it('still flags clear conversational phrases', () => {
    expect(isConversationalMessage('oi')).toBe(true)
    expect(isConversationalMessage('obrigado')).toBe(true)
    expect(isConversationalMessage('hello')).toBe(true)
    expect(isConversationalMessage('responda em portugues')).toBe(true)
  })
  it('still flags definitional questions', () => {
    expect(isConversationalMessage('o que é REST?')).toBe(true)
    expect(isConversationalMessage('what is OAuth?')).toBe(true)
  })
  it('engineering signal still wins over conversational form', () => {
    expect(isConversationalMessage('como criar uma landing page?')).toBe(false)
    expect(isConversationalMessage('pode criar um componente?')).toBe(false)
    expect(isConversationalMessage('refactor src/auth.ts')).toBe(false)
  })
  it('empty returns false (caller decides)', () => {
    expect(isConversationalMessage('')).toBe(false)
    expect(isConversationalMessage('   ')).toBe(false)
  })
})

describe('looksLikeEngineeringTask — coverage by family', () => {
  it('detects pt-BR action verbs in common conjugations', () => {
    expect(looksLikeEngineeringTask('crie um teste')).toBe(true)
    expect(looksLikeEngineeringTask('criar um teste')).toBe(true)
    expect(looksLikeEngineeringTask('cria um teste')).toBe(true)
    expect(looksLikeEngineeringTask('gere um arquivo')).toBe(true)
    expect(looksLikeEngineeringTask('faca isso')).toBe(true)
  })

  it('detects English action verbs', () => {
    expect(looksLikeEngineeringTask('create a function')).toBe(true)
    expect(looksLikeEngineeringTask('refactor the engine')).toBe(true)
    expect(looksLikeEngineeringTask('scaffold a project')).toBe(true)
    expect(looksLikeEngineeringTask('bootstrap a next.js app')).toBe(true)
  })

  it('detects named deliverables without verbs', () => {
    expect(looksLikeEngineeringTask('a landing page for the app')).toBe(true)
    expect(looksLikeEngineeringTask('um componente novo')).toBe(true)
    expect(looksLikeEngineeringTask('endpoint de pagamento')).toBe(true)
    expect(looksLikeEngineeringTask('a dockerfile')).toBe(true)
  })

  it('detects repo-shaped paths', () => {
    expect(looksLikeEngineeringTask('something in src/main.go')).toBe(true)
    expect(looksLikeEngineeringTask('apps/electron/src')).toBe(true)
    expect(looksLikeEngineeringTask('the Dockerfile')).toBe(true)
    expect(looksLikeEngineeringTask('config.yml is broken')).toBe(true)
  })

  it('returns false for pure conversational text', () => {
    expect(looksLikeEngineeringTask('oi tudo bem')).toBe(false)
    expect(looksLikeEngineeringTask('obrigado')).toBe(false)
    expect(looksLikeEngineeringTask('que dia bonito')).toBe(false)
  })
})
