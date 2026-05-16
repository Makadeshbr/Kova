/**
 * FIX (race-free): Parse raw user input into an atomic UserCommand at the moment
 * of submission. Once created, the command flows through the entire send pipeline
 * unchanged — no downstream code reads `state.activeMode` to "guess" intent.
 *
 * This eliminates the class of stale-closure bugs where a slash command would
 * race with `setState(activeMode)` and end up dispatched in the wrong mode.
 *
 * Pure function, exhaustively tested.
 */

export type ChatMode = 'patch' | 'plan' | 'review' | 'chat'

export interface UserCommand {
  /** The text to send to the model, with any slash command prefix stripped. */
  text: string
  /** The mode to dispatch in. Resolved from slash prefix OR caller default. */
  mode: ChatMode
  /** True when the slash command came from the input itself (not the active pill). */
  fromSlashCommand: boolean
}

const SLASH_PATTERN = /^\/(plan|review)\b\s*/i

export function parseUserInput(raw: string, defaultMode: ChatMode): UserCommand {
  const trimmed = raw.trim()
  const match = SLASH_PATTERN.exec(trimmed)
  if (match) {
    const stripped = trimmed.slice(match[0].length).trim()
    return {
      // Preserve the slash command itself when there's no body — model still gets context
      text: stripped || trimmed,
      mode: match[1].toLowerCase() as ChatMode,
      fromSlashCommand: true,
    }
  }
  return {
    text: trimmed,
    mode: defaultMode,
    fromSlashCommand: false,
  }
}
