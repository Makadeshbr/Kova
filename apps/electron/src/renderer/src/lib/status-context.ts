/**
 * Builds a contextual status label from the live ExecutionEvent stream,
 * replacing the cryptic "coding"/"validating"/"deciding" status text with
 * something the user can actually read: which files are being touched, which
 * command is running, how much progress has been made.
 *
 * Falls back to a generic verb when no useful event has been seen yet so
 * the indicator never flashes empty.
 */
import type { ExecutionEvent, ExecutionState } from '../types'
import { isTerminalExecutionStatus } from './run-lifecycle'

const MAX_FILES_IN_LABEL = 2

interface RecentActivity {
  writePaths: string[]
  uniqueWritePaths: string[]
  lastCommand: string | null
  runningCommandLines: number
  lastHarnessLayer: string | null
  searchPattern: string | null
  lastAgentMode: string | null
}

function basename(p: string): string {
  return p.split(/[/\\]/).pop() || p
}

function summarizeRecent(events: ExecutionEvent[]): RecentActivity {
  const writePaths: string[] = []
  const seen = new Set<string>()
  const uniqueWritePaths: string[] = []
  let lastCommand: string | null = null
  let runningCommandLines = 0
  let lastHarnessLayer: string | null = null
  let searchPattern: string | null = null
  let lastAgentMode: string | null = null

  // Walk in chronological order — keep the LATEST signals.
  for (const e of events) {
    if (e.type === 'tool_call') {
      const path = typeof e.toolInput?.path === 'string' ? e.toolInput.path : ''
      if ((e.toolName === 'write_file' || e.toolName === 'edit_file' || e.toolName === 'delete_file') && path) {
        writePaths.push(path)
        if (!seen.has(path)) { seen.add(path); uniqueWritePaths.push(path) }
      } else if (e.toolName === 'run_command' || e.toolName === 'run_interactive_command') {
        const cmd = typeof e.toolInput?.command === 'string' ? e.toolInput.command : ''
        lastCommand = cmd
        runningCommandLines = 0
      } else if (e.toolName === 'grep_codebase') {
        const pat = typeof e.toolInput?.pattern === 'string' ? e.toolInput.pattern : ''
        searchPattern = pat
      }
    } else if (e.type === 'tool_result') {
      // Command completed — clear the running label so we move on to the next signal.
      lastCommand = null
      runningCommandLines = 0
    } else if (e.type === 'command_output') {
      runningCommandLines += 1
    } else if (e.type === 'harness_layer_start' && e.harnessLayer) {
      lastHarnessLayer = e.harnessLayer
    } else if (e.type === 'validation_completed') {
      lastHarnessLayer = null
    } else if (e.type === 'agent_started') {
      lastAgentMode = e.mode ?? null
    }
  }

  return { writePaths, uniqueWritePaths, lastCommand, runningCommandLines, lastHarnessLayer, searchPattern, lastAgentMode }
}

function shortenCommand(cmd: string): string {
  const trimmed = cmd.trim()
  if (trimmed.length <= 50) return trimmed
  return `${trimmed.slice(0, 47)}...`
}

function formatPathList(paths: string[], total: number): string {
  if (paths.length === 0) return ''
  const shown = paths.slice(-MAX_FILES_IN_LABEL).map(basename).join(', ')
  if (total > MAX_FILES_IN_LABEL) return `${shown} (${total} files)`
  return shown
}

/**
 * Returns the verbose status string shown next to the spinner. The status
 * argument is the canonical ExecutionState.status; events provide the live
 * context that fills it in.
 */
export function contextualStatusLabel(
  status: ExecutionState['status'] | null,
  events: ExecutionEvent[],
): string {
  if (!status) return 'Processing...'
  if (isTerminalExecutionStatus(status)) {
    if (status === 'completed') return 'Validacao concluida.'
    if (status === 'paused') return 'Revisao disponivel.'
    if (status === 'blocked') return 'Bloqueado por seguranca ou permissao.'
    if (status === 'failed') return 'Execucao encerrada.'
    if (status === 'server_ready') return 'Dev server is ready.'
  }

  const recent = summarizeRecent(events)

  if (status === 'structuring') return 'Structuring task...'

  if (status === 'planning') {
    if (recent.searchPattern) return `Searching: ${recent.searchPattern.slice(0, 40)}`
    return 'Planning...'
  }

  if (status === 'coding') {
    if (recent.lastCommand) {
      const detail = recent.runningCommandLines > 0
        ? ` · ${recent.runningCommandLines} line${recent.runningCommandLines === 1 ? '' : 's'}`
        : ''
      return `${recent.lastAgentMode === 'fix' ? 'Repairing with' : 'Running'} ${shortenCommand(recent.lastCommand)}${detail}`
    }
    if (recent.uniqueWritePaths.length > 0) {
      const list = formatPathList(recent.uniqueWritePaths, recent.uniqueWritePaths.length)
      return `${recent.lastAgentMode === 'fix' ? 'Repairing' : 'Editing'} ${list}`
    }
    if (recent.searchPattern) return `Searching: ${recent.searchPattern.slice(0, 40)}`
    if (recent.lastAgentMode === 'fix') return 'Repairing failures...'
    return 'Generating code...'
  }

  if (status === 'repairing') {
    if (recent.lastCommand) return `Repairing with ${shortenCommand(recent.lastCommand)}`
    if (recent.uniqueWritePaths.length > 0) return `Repairing ${formatPathList(recent.uniqueWritePaths, recent.uniqueWritePaths.length)}`
    return 'Repairing failures...'
  }

  if (status === 'server_starting') return 'Starting dev server...'
  if (status === 'server_ready') return 'Dev server is ready.'
  if (status === 'awaiting_approval') return 'Waiting for command approval...'
  if (status === 'blocked') return 'Blocked; needs attention.'

  if (status === 'validating') {
    if (recent.lastHarnessLayer) return `Validating: ${recent.lastHarnessLayer}`
    return 'Validando projeto...'
  }

  if (status === 'deciding') return 'Reviewing changes...'

  if (status === 'applying') {
    const count = recent.uniqueWritePaths.length
    return count > 0 ? `Applying ${count} file${count === 1 ? '' : 's'}...` : 'Applying changes...'
  }

  return 'Processing...'
}
