import React, { useMemo, useState } from 'react'
import type { ExecutionEvent, ExecutionState } from '../types'
import { serverActivityLabel } from '../lib/task-activity'
import { isTerminalExecutionStatus, validationLifecycleView } from '../lib/run-lifecycle'

// ─── Status icons (kept minimal — colour conveys the kind) ───────────────────
const Spinner = (): React.ReactElement => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" style={{ opacity: 0.8 }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)
const IconCheck = (): React.ReactElement => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconError = (): React.ReactElement => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

export interface Activity {
  id: string
  type: 'read' | 'write' | 'command' | 'validate' | 'list' | 'server'
  status: 'pending' | 'success' | 'error'
  label: string
  detail?: string
  commandId?: string
  /** Workspace-relative path or directory associated with this activity (for tooltips). */
  fullPath?: string
  /** Line count for write activities, surfaced inline (CC-style). */
  lineCount?: number
  /** FIX-003: run_command output streamed live, capped to last N lines. */
  lines?: string[]
}

const MAX_STREAMED_LINES = 40
// Cap shown activities at a generous number so even long sessions stay
// fully visible (CC shows every tool call inline). Older entries collapse
// behind a "show all" toggle if the count blows past this floor.
const VISIBLE_ACTIVITY_COUNT = 20

function shortCommand(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length <= 96) return trimmed
  return `${trimmed.slice(0, 93)}...`
}

export function ActivityFeed({ events, executionStatus }: { events: ExecutionEvent[]; executionStatus?: ExecutionState['status'] | null }): React.ReactElement | null {
  const activities = useMemo(() => {
    const list: Activity[] = []
    const isTerminal = isTerminalExecutionStatus(executionStatus)
    
    // Processa eventos agrupando chamadas e resultados
    for (let i = 0; i < events.length; i++) {
      const e = events[i]
      
      if (e.type === 'tool_call') {
        const rawPath = String(e.toolInput?.path ?? e.toolInput?.command ?? e.message ?? '')
        const shortPath = rawPath.split(/[/\\]/).pop() || rawPath

        let type: Activity['type'] = 'read'
        let label = ''
        let lineCount: number | undefined

        if (e.toolName === 'write_file') {
          type = 'write'
          // Count lines of the content being written so we can echo "(N lines)"
          // like CC does — surfaces patch size at a glance.
          const content = String(e.toolInput?.content ?? '')
          lineCount = content ? content.split('\n').length : undefined
          label = `Writing ${shortPath}`
        } else if (e.toolName === 'edit_file') {
          type = 'write'; label = `Editing ${shortPath}`
        } else if (e.toolName === 'delete_file') {
          type = 'write'; label = `Deleting ${shortPath}`
        } else if (e.toolName === 'run_command') {
          type = 'command'; label = `$ ${shortCommand(rawPath)}`
        } else if (e.toolName === 'run_interactive_command') {
          type = 'command'; label = `↗ ${shortCommand(rawPath)} (terminal)`
        } else if (e.toolName === 'list_files') {
          type = 'list'; label = `Listing ${shortPath || '.'}`
        } else if (e.toolName === 'grep_codebase') {
          const pattern = String(e.toolInput?.pattern ?? '')
          type = 'read'; label = `Searching: ${pattern.slice(0, 60)}`
        } else if (e.toolName === 'glob_files') {
          const pattern = String(e.toolInput?.pattern ?? '')
          type = 'list'; label = `Globbing ${pattern}`
        } else if (e.toolName === 'read_file') {
          type = 'read'; label = `Reading ${shortPath}`
        } else if (e.toolName === 'todo_write') {
          type = 'list'; label = 'Updating todo list'
        } else {
          type = 'read'; label = `${e.toolName ?? 'tool'} ${shortPath}`.trim()
        }

        list.push({ id: `tool_${i}`, type, status: 'pending', label, detail: rawPath, fullPath: rawPath, lineCount })
      }
      else if (e.type === 'tool_result') {
        // Find the last pending activity and mark it as success
        const lastPending = [...list].reverse().find(a => a.status === 'pending' && a.type !== 'validate')
        if (lastPending) {
          lastPending.status = e.message?.startsWith('Error:') || e.message?.startsWith('Blocked:') ? 'error' : 'success'
          if (lastPending.type === 'command') lastPending.detail = e.message
        }
      }
      else if (e.type === 'provider_session_start' && e.providerMeta) {
        const m = e.providerMeta
        const label = m.fallback
          ? `${m.resolvedProvider}/${m.resolvedModel ?? '?'} (fallback)`
          : `${m.resolvedProvider}/${m.resolvedModel ?? 'auto'}`
        list.push({ id: `pss_${i}`, type: 'read', status: m.fallback ? 'error' : 'success', label, detail: m.fallbackReason })
      }
      else if (e.type === 'server_starting' || e.type === 'server_ready' || e.type === 'server_failed') {
        const label = serverActivityLabel(e) ?? e.message ?? 'Server session'
        list.push({
          id: `srv_${i}`,
          type: 'server',
          status: e.type === 'server_starting' ? 'pending' : e.type === 'server_ready' ? 'success' : 'error',
          label,
          detail: e.serverSession?.diagnostics?.join(', ') || e.message,
          fullPath: e.serverSession?.cwd,
        })
      }
      else if (e.type === 'validation_started') {
        const view = validationLifecycleView({ executionStatus, harness: undefined, isValidationStarted: true })
        list.push({ id: `val_${i}`, type: 'validate', status: view.status, label: view.label, detail: view.detail ?? undefined })
      }
      else if (e.type === 'harness_layer_start') {
        if (isTerminal) continue
        const layer = e.harnessLayer ?? 'harness'
        const cmd = e.message ? e.message.slice(0, 60) : layer
        list.push({ id: `hl_${i}`, type: 'command', status: 'pending', label: `${layer}: ${cmd}`, detail: e.message })
      }
      else if (e.type === 'harness_line') {
        if (isTerminal) continue
        // Update the most recent pending harness entry with the latest output line
        const lastHarness = [...list].reverse().find(a => a.type === 'command' && a.status === 'pending')
        if (lastHarness) lastHarness.detail = e.harnessLine?.slice(0, 120)
      }
      else if (e.type === 'command_output') {
        const lastCmd = [...list].reverse().find(a =>
          a.type === 'command' &&
          a.status === 'pending' &&
          a.id.startsWith('tool_') &&
          (!a.commandId || a.commandId === e.commandId),
        )
        if (lastCmd && e.commandLine !== undefined) {
          lastCmd.commandId = e.commandId
          if (!lastCmd.lines) lastCmd.lines = []
          lastCmd.lines.push(e.commandLine)
          if (lastCmd.lines.length > MAX_STREAMED_LINES) lastCmd.lines = lastCmd.lines.slice(-MAX_STREAMED_LINES)
        }
      }
      else if (e.type === 'context_ref_denied') {
        const path = String(e.toolInput?.path ?? e.message ?? 'protected file')
        list.push({ id: `deny_${i}`, type: 'read', status: 'error', label: `Blocked ${path.split(/[/\\]/).pop()}`, detail: e.message })
      }
      else if (e.type === 'file_mutation') {
        const change = e.changes?.[0]
        if (change) list.push({ id: `mut_${i}`, type: 'write', status: 'success', label: `${change.type} ${change.path.split('/').pop()}`, detail: change.path })
      }
      else if (e.type === 'validation_completed') {
        const lastVal = [...list].reverse().find(a => a.type === 'validate' && a.status === 'pending')
        if (lastVal) {
          const view = validationLifecycleView({ executionStatus, harness: e.harnessResult, isValidationStarted: true })
          lastVal.status = view.status
          lastVal.label = view.label
          lastVal.detail = view.detail ?? undefined
        }
      }
    }

    if (isTerminal) {
      const harness = [...events].reverse().find(event => event.type === 'validation_completed')?.harnessResult
      for (const activity of list) {
        if (activity.type !== 'validate' || activity.status !== 'pending') continue
        const view = validationLifecycleView({ executionStatus, harness, isValidationStarted: true })
        activity.status = view.status
        activity.label = view.label
        activity.detail = view.detail ?? undefined
      }
    }
    
    // Manter a lista curta visualmente mas não perder histórico: mostramos os últimos 5
    // Para um visual premium, se houver muitos, mostramos que estão "agrupados"
    return list
  }, [events, executionStatus])

  return <ActivityFeedView activities={activities} />
}

function ActivityFeedView({ activities }: { activities: Activity[] }): React.ReactElement | null {
  const [expanded, setExpanded] = useState(false)

  if (!activities.length) return null

  const totalCount = activities.length
  const overflow = Math.max(0, totalCount - VISIBLE_ACTIVITY_COUNT)
  const visible = expanded || overflow === 0 ? activities : activities.slice(-VISIBLE_ACTIVITY_COUNT)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8, marginBottom: 12 }}>
      {overflow > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          style={{
            alignSelf: 'flex-start',
            fontSize: 11,
            color: 'var(--text-3)',
            background: 'transparent',
            border: '1px solid var(--border)',
            padding: '2px 10px',
            borderRadius: 12,
            cursor: 'pointer',
            marginBottom: 4,
          }}
        >
          {expanded ? `Hide ${overflow} earlier step${overflow === 1 ? '' : 's'}` : `Show ${overflow} earlier step${overflow === 1 ? '' : 's'}`}
        </button>
      )}

      {visible.map((act) => <ActivityRow key={act.id} activity={act} />)}
    </div>
  )
}

function ActivityRow({ activity: act }: { activity: Activity }): React.ReactElement {
  const isPending = act.status === 'pending'
  const isError = act.status === 'error'

  let color = 'var(--text-2)'
  if (isError) color = 'var(--red)'
  else if (act.type === 'write') color = 'var(--teal)'
  else if (act.type === 'command') color = 'var(--yellow)'
  else if (act.type === 'validate') color = 'var(--amber)'
  else if (act.type === 'server') color = 'var(--cyan)'
  else if (act.type === 'list') color = 'var(--text-2)'
  else color = 'var(--purple)'

  return (
    <div className="animate-fade-in" style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '5px 10px',
      borderRadius: 6,
      background: isPending ? 'var(--bg-active, rgba(255,255,255,0.04))' : 'transparent',
      border: isPending ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      transition: 'all 0.2s ease',
      opacity: isPending ? 1 : isError ? 0.95 : 0.78,
    }}>
      <div style={{
        width: 16, marginTop: 2,
        display: 'flex', justifyContent: 'center',
        color: isPending ? color : isError ? 'var(--red)' : 'var(--teal)',
        flexShrink: 0,
      }}>
        {isPending ? <Spinner /> : isError ? <IconError /> : <IconCheck />}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <div
          title={act.fullPath ?? undefined}
          style={{
            color: isPending ? 'var(--text-1)' : isError ? 'var(--red)' : 'var(--text-2)',
            fontSize: 12.5, fontWeight: isPending ? 600 : 500,
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            fontFamily: act.type === 'command' ? 'var(--font-mono)' : 'inherit',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {act.label}
          </span>
          {act.lineCount !== undefined && act.lineCount > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              · {act.lineCount} line{act.lineCount === 1 ? '' : 's'}
            </span>
          )}
          {!isPending && act.type === 'validate' && act.detail && (
            <span style={{
              fontSize: 10,
              padding: '1px 6px',
              background: isError ? 'var(--red-dim)' : 'var(--teal-dim)',
              color: isError ? 'var(--red)' : 'var(--teal)',
              borderRadius: 4,
            }}>
              {act.detail}
            </span>
          )}
        </div>

        {!isPending && act.detail && act.type === 'command' && !act.lines && (
          <pre style={{
            margin: '4px 0 0',
            maxHeight: 90,
            overflow: 'hidden',
            color: isError ? 'var(--red)' : 'var(--text-3)',
            fontSize: 10,
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-mono)',
          }}>
            {act.detail.slice(0, 700)}
          </pre>
        )}

        {act.lines && act.lines.length > 0 && act.type === 'command' && (
          <pre style={{
            margin: '4px 0 0',
            maxHeight: isPending ? 220 : 160,
            overflow: 'auto',
            color: isError ? 'var(--red)' : 'var(--text-2)',
            fontSize: 10.5,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-mono)',
            background: 'rgba(0,0,0,0.32)',
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}>
            {act.lines.join('\n')}
            {isPending && (
              <span style={{
                display: 'inline-block', width: 6, height: '1em', marginLeft: 2,
                background: 'var(--yellow)', verticalAlign: 'text-bottom',
                animation: 'pulse-amber 0.9s infinite',
              }} />
            )}
          </pre>
        )}
      </div>
    </div>
  )
}
