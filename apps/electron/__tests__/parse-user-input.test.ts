/**
 * Tests for the atomic UserCommand parser. These tests pin down the contract
 * that downstream pipeline code depends on — once a UserCommand is created,
 * its mode/text/fromSlashCommand are frozen and authoritative.
 */
import { describe, it, expect } from 'vitest'
import { parseUserInput } from '../src/renderer/src/lib/parse-user-input'

describe('parseUserInput — slash commands', () => {
  it('routes /plan to plan mode regardless of defaultMode', () => {
    const cmd = parseUserInput('/plan add login', 'patch')
    expect(cmd.mode).toBe('plan')
    expect(cmd.text).toBe('add login')
    expect(cmd.fromSlashCommand).toBe(true)
  })

  it('routes /review to review mode regardless of defaultMode', () => {
    const cmd = parseUserInput('/review check security', 'patch')
    expect(cmd.mode).toBe('review')
    expect(cmd.text).toBe('check security')
    expect(cmd.fromSlashCommand).toBe(true)
  })

  it('routes /chat to chat mode regardless of defaultMode', () => {
    const cmd = parseUserInput('/chat explain monads', 'patch')
    expect(cmd.mode).toBe('chat')
    expect(cmd.text).toBe('explain monads')
    expect(cmd.fromSlashCommand).toBe(true)
  })

  it('case-insensitive slash command matching', () => {
    expect(parseUserInput('/PLAN x', 'patch').mode).toBe('plan')
    expect(parseUserInput('/Review x', 'patch').mode).toBe('review')
    expect(parseUserInput('/CHAT x', 'patch').mode).toBe('chat')
  })

  it('handles slash command with no body — preserves the slash itself', () => {
    const cmd = parseUserInput('/plan', 'patch')
    expect(cmd.mode).toBe('plan')
    // Empty body must still send something so the model sees a turn
    expect(cmd.text).toBe('/plan')
  })

  it('handles slash command followed by extra whitespace', () => {
    const cmd = parseUserInput('/plan    do the thing', 'patch')
    expect(cmd.text).toBe('do the thing')
  })

  it('does NOT match a slash that is not a known command', () => {
    const cmd = parseUserInput('/refactor everything', 'patch')
    expect(cmd.mode).toBe('patch')
    expect(cmd.text).toBe('/refactor everything')
    expect(cmd.fromSlashCommand).toBe(false)
  })

  it('does NOT match slash inside the text body', () => {
    const cmd = parseUserInput('use the /api endpoint', 'patch')
    expect(cmd.mode).toBe('patch')
    expect(cmd.text).toBe('use the /api endpoint')
  })

  it('does NOT match slash command without word boundary', () => {
    // "/planet" is not "/plan"
    const cmd = parseUserInput('/planet earth', 'patch')
    expect(cmd.mode).toBe('patch')
    expect(cmd.text).toBe('/planet earth')
  })
})

describe('parseUserInput — default mode propagation', () => {
  it('uses defaultMode when no slash command is present', () => {
    expect(parseUserInput('hello', 'patch').mode).toBe('patch')
    expect(parseUserInput('hello', 'plan').mode).toBe('plan')
    expect(parseUserInput('hello', 'review').mode).toBe('review')
    expect(parseUserInput('hello', 'chat').mode).toBe('chat')
  })

  it('slash command WINS over defaultMode — explicit beats implicit', () => {
    // User pinned plan via the pill, then typed /review explicitly → review wins
    const cmd = parseUserInput('/review do the audit', 'plan')
    expect(cmd.mode).toBe('review')
  })
})

describe('parseUserInput — race-condition contract (regression)', () => {
  // These tests pin down the contract that makes the pipeline race-free.
  // If any of them break, slash commands could dispatch in the wrong mode again.

  it('contract: slash command always wins over defaultMode (no React races)', () => {
    // Even if defaultMode is 'patch' (e.g. activeMode hasn't updated yet),
    // a /plan in the text MUST resolve to 'plan'. This is the crux of the fix.
    expect(parseUserInput('/plan x', 'patch').mode).toBe('plan')
    expect(parseUserInput('/plan x', 'chat').mode).toBe('plan')
    expect(parseUserInput('/plan x', 'review').mode).toBe('plan')
  })

  it('contract: returned object has no references to external state', () => {
    // The command must be a fresh plain object — passing it through async
    // boundaries (queue, IPC) cannot mutate or alias source state.
    const cmd = parseUserInput('/plan add login', 'patch')
    expect(typeof cmd.text).toBe('string')
    expect(typeof cmd.mode).toBe('string')
    expect(typeof cmd.fromSlashCommand).toBe('boolean')
    // Mutating the returned object must not affect future parses
    ;(cmd as { text: string }).text = 'mutated'
    expect(parseUserInput('/plan add login', 'patch').text).toBe('add login')
  })
})

describe('parseUserInput — text normalization', () => {
  it('trims leading and trailing whitespace from input', () => {
    expect(parseUserInput('   hello   ', 'patch').text).toBe('hello')
  })

  it('preserves internal whitespace in the message body', () => {
    expect(parseUserInput('do  multiple   things', 'patch').text).toBe('do  multiple   things')
  })

  it('returns immutable command (TypeScript readonly inferred)', () => {
    // Sanity: the returned shape is a new object, not a reference to anything stateful
    const a = parseUserInput('hello', 'patch')
    const b = parseUserInput('hello', 'patch')
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})
