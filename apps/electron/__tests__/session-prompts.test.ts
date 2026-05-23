import { describe, expect, it } from 'vitest'
import {
  inferRunMode,
  isConversationalMessage,
  looksLikeEngineeringTask,
  resolveRunMode,
} from '../src/main/session-prompts'

describe('resolveRunMode - slash prefix in message text always wins', () => {
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
    expect(resolveRunMode('/plan refactor X', 'chat')).toBe('plan')
  })

  it('case-insensitive slash matching', () => {
    expect(resolveRunMode('/Plan stuff')).toBe('plan')
    expect(resolveRunMode('/REVIEW stuff')).toBe('review')
  })

  it('bare slash command still routes', () => {
    expect(resolveRunMode('/plan')).toBe('plan')
    expect(resolveRunMode('/chat')).toBe('chat')
  })
})

describe('resolveRunMode - explicit pinned mode without slash', () => {
  it('honours pinned plan', () => {
    expect(resolveRunMode('keep planning the same thing', 'plan')).toBe('plan')
  })

  it('honours pinned review', () => {
    expect(resolveRunMode('keep reviewing', 'review')).toBe('review')
  })

  it('honours pinned chat', () => {
    expect(resolveRunMode('keep chatting', 'chat')).toBe('chat')
  })

  it('keeps engineering work in patch when patch is pinned', () => {
    expect(resolveRunMode('crie um componente', 'patch')).toBe('patch')
  })

  it('routes engineering task to patch when chat is pinned', () => {
    expect(resolveRunMode('Crie uma landing page para barbearia', 'chat')).toBe('patch')
    expect(resolveRunMode('adicione uma secao de FAQ nessa landing page', 'chat')).toBe('patch')
  })
})

describe('resolveRunMode - explicit chat slash override', () => {
  it('keeps /chat as chat even for engineering wording', () => {
    expect(resolveRunMode('/chat crie uma landing page', 'patch')).toBe('chat')
    expect(resolveRunMode('/chat crie uma landing page', 'chat')).toBe('chat')
  })
})

describe('resolveRunMode - conversational turns stay chat', () => {
  const conversationalTurns = [
    'oi',
    'Ola',
    'um momento',
    'obrigado',
    'tudo bem?',
    'o que e REST?',
  ]

  for (const message of conversationalTurns) {
    it(`routes to chat: "${message}"`, () => {
      expect(resolveRunMode(message)).toBe('chat')
      expect(resolveRunMode(message, 'patch')).toBe('chat')
    })
  }

  it('keeps oi in chat when chat mode is pinned', () => {
    expect(resolveRunMode('oi', 'chat')).toBe('chat')
  })
})

describe('resolveRunMode - engineering commands stay patch', () => {
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

describe('resolveRunMode - edge cases', () => {
  it('empty string defaults to patch', () => {
    expect(resolveRunMode('')).toBe('patch')
  })

  it('whitespace-only defaults to patch', () => {
    expect(resolveRunMode('    ')).toBe('patch')
  })

  it('slash followed immediately by text without space is not a command', () => {
    expect(resolveRunMode('/planning the next sprint')).toBe('patch')
  })
})

describe('inferRunMode - deprecated alias mirrors resolveRunMode', () => {
  it('delegates to resolveRunMode', () => {
    expect(inferRunMode('/plan x')).toBe('plan')
    expect(inferRunMode('como criar X?')).toBe('patch')
    expect(inferRunMode('oi')).toBe('chat')
  })
})

describe('isConversationalMessage - soft signal', () => {
  it('flags clear conversational phrases', () => {
    expect(isConversationalMessage('oi')).toBe(true)
    expect(isConversationalMessage('obrigado')).toBe(true)
    expect(isConversationalMessage('hello')).toBe(true)
    expect(isConversationalMessage('responda em portugues')).toBe(true)
  })

  it('flags definitional questions', () => {
    expect(isConversationalMessage('o que e REST?')).toBe(true)
    expect(isConversationalMessage('what is OAuth?')).toBe(true)
  })

  it('engineering signal wins over conversational form', () => {
    expect(isConversationalMessage('como criar uma landing page?')).toBe(false)
    expect(isConversationalMessage('pode criar um componente?')).toBe(false)
    expect(isConversationalMessage('refactor src/auth.ts')).toBe(false)
  })

  it('empty returns false', () => {
    expect(isConversationalMessage('')).toBe(false)
    expect(isConversationalMessage('   ')).toBe(false)
  })
})

describe('looksLikeEngineeringTask - coverage by family', () => {
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
