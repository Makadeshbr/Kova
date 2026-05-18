/**
 * Mode-routing regression suite.
 *
 * The contract:
 *   - Engineering signal (action verb OR named deliverable OR repo path)
 *     always wins over question form. "Como criar uma landing page?" must
 *     route to patch so the agent gets tools and can build it.
 *   - Pure questions / explanations without engineering signal → chat.
 *   - Greetings, affirmations, meta-instructions → chat.
 *
 * These tests lock down the Claude Code / Cursor / Codex parity rule:
 * the model always has tools available when a deliverable is named.
 */
import { describe, it, expect } from 'vitest'
import { inferRunMode, isConversationalMessage, looksLikeEngineeringTask } from '../src/main/session-prompts'

describe('inferRunMode — explicit overrides', () => {
  it('honours explicit plan from UI', () => {
    expect(inferRunMode('do anything', 'plan')).toBe('plan')
  })
  it('honours explicit review from UI', () => {
    expect(inferRunMode('do anything', 'review')).toBe('review')
  })
  it('explicit patch falls back to message-based inference', () => {
    // patch is the default — explicit patch lets message text re-route to chat for greetings
    expect(inferRunMode('oi', 'patch')).toBe('chat')
  })
  it('recognises /plan slash command', () => {
    expect(inferRunMode('/plan create something')).toBe('plan')
  })
  it('recognises /review slash command', () => {
    expect(inferRunMode('/review my recent change')).toBe('review')
  })
})

describe('isConversationalMessage — engineering signal wins over question form', () => {
  // The original bug: "Como criar X" was routed to chat because of "como" prefix.
  // Concorrent parity requires patch for any message that names a deliverable.
  const engineeringQuestions = [
    'como criar uma landing page para barbearia?',
    'como criar uma landing page',
    'como faço uma landing page',
    'como adicionar um endpoint /users?',
    'como implemento autenticação?',
    'pode criar um componente de hero?',
    'pode fazer uma landing page?',
    'qual a melhor forma de implementar oauth?',
    'o que falta para minha landing page funcionar?',
    'how do I create a landing page?',
    'how to add a login flow?',
    'can you build a checkout page?',
    'what should I change in src/auth.ts?',
    'why is the api returning 500?',
  ]
  for (const message of engineeringQuestions) {
    it(`routes to patch: "${message}"`, () => {
      expect(isConversationalMessage(message)).toBe(false)
      expect(inferRunMode(message)).toBe('patch')
    })
  }
})

describe('isConversationalMessage — pure conversational signals route to chat', () => {
  const pureChat = [
    'oi',
    'ola',
    'hello',
    'bom dia',
    'obrigado',
    'ok',
    'sim',
    'tudo bem',
    'oi, tudo bem?',
    'o que é REST?',                 // pure curiosity, no deliverable
    'o que é git?',
    'qual a diferença entre let e const?',
    'por que typescript é melhor que js?',
    'what is REST?',
    'why is functional programming popular?',
    'me explica monads',
    'responde em portugues',
    'fale em ingles',
    'seja mais formal',
    'act as a senior reviewer',
  ]
  for (const message of pureChat) {
    it(`routes to chat: "${message}"`, () => {
      expect(isConversationalMessage(message)).toBe(true)
      expect(inferRunMode(message)).toBe('chat')
    })
  }
})

describe('isConversationalMessage — clear engineering commands route to patch', () => {
  const commands = [
    'crie uma landing page para barbearia',
    'criar landing page',
    'corrija o bug em src/app.ts',
    'adicionar endpoint de login',
    'refatore o ContextEngine',
    'remova o codigo morto em packages/agent',
    'gere um Dockerfile',
    'gerar testes para o ExecutionEngine',
    'instale react-router',
    'rode os testes',
    'execute npm install',
    'implemente paginacao na lista de usuarios',
    'fix the auth bug',
    'add a logout button',
    'create a new component called Hero',
    'refactor packages/decision/src/decision-engine.ts',
    'install tailwind',
    'bootstrap a next.js app',
  ]
  for (const message of commands) {
    it(`routes to patch: "${message}"`, () => {
      expect(isConversationalMessage(message)).toBe(false)
      expect(inferRunMode(message)).toBe('patch')
    })
  }
})

describe('looksLikeEngineeringTask — coverage by family', () => {
  it('detects pt-BR action verbs in all common conjugations', () => {
    expect(looksLikeEngineeringTask('crie um teste')).toBe(true)
    expect(looksLikeEngineeringTask('criar um teste')).toBe(true)
    expect(looksLikeEngineeringTask('cria um teste')).toBe(true)
    expect(looksLikeEngineeringTask('gere um arquivo')).toBe(true)
    expect(looksLikeEngineeringTask('gerar um arquivo')).toBe(true)
    expect(looksLikeEngineeringTask('faca isso')).toBe(true)
    expect(looksLikeEngineeringTask('fazer isso')).toBe(true)
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

describe('isConversationalMessage — edge cases', () => {
  it('empty string returns false (caller decides)', () => {
    expect(isConversationalMessage('')).toBe(false)
  })

  it('whitespace-only normalizes to empty → returns false', () => {
    expect(isConversationalMessage('    ')).toBe(false)
  })

  it('greeting with engineering follow-up still routes to patch', () => {
    // The engineering signal is dominant; greeting prefix is incidental.
    expect(isConversationalMessage('oi, pode criar uma landing page?')).toBe(false)
  })

  it('meta-instruction without engineering still routes to chat', () => {
    expect(isConversationalMessage('responda em portugues')).toBe(true)
    expect(isConversationalMessage('respond in english please')).toBe(true)
  })

  it('short non-task message defaults to chat', () => {
    expect(isConversationalMessage('hmm')).toBe(true)
    expect(isConversationalMessage('ué')).toBe(true)
  })

  it('non-question without engineering signal stays patch (model decides)', () => {
    // A statement like "the build is broken" is ambiguous — let the agent
    // inspect via tools. This matches Claude Code/Cursor behaviour.
    expect(isConversationalMessage('the build is broken on main')).toBe(false)
  })
})
