import React, { useMemo } from 'react'
import type { ExecutionEvent } from '../types'

// ─── Ícones Premium ───────────────────────────────────────────────────────────
const Spinner = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" style={{ opacity: 0.8 }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const IconError = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconRead = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
const IconFolder = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
const IconWrite = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
const IconTerminal = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
const IconShield = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>

interface Activity {
  id: string
  type: 'read' | 'write' | 'command' | 'validate' | 'list'
  status: 'pending' | 'success' | 'error'
  label: string
  detail?: string
  commandId?: string
  /** FIX-003: run_command output streamed live, capped to last N lines. */
  lines?: string[]
}

const MAX_STREAMED_LINES = 40

export function ActivityFeed({ events }: { events: ExecutionEvent[] }): React.ReactElement | null {
  const activities = useMemo(() => {
    const list: Activity[] = []
    
    // Processa eventos agrupando chamadas e resultados
    for (let i = 0; i < events.length; i++) {
      const e = events[i]
      
      if (e.type === 'tool_call') {
        const rawPath = String(e.toolInput?.path ?? e.toolInput?.command ?? e.message ?? '')
        const shortPath = rawPath.split(/[/\\]/).pop() || rawPath
        
        let type: Activity['type'] = 'read'
        let label = ''
        
        if (e.toolName === 'write_file' || e.toolName === 'delete_file') {
          type = 'write'; label = e.toolName === 'write_file' ? `Writing ${shortPath}` : `Deleting ${shortPath}`
        } else if (e.toolName === 'run_command') {
          type = 'command'; label = `Running command`
        } else if (e.toolName === 'list_files') {
          type = 'list'; label = `Reading directory`
        } else {
          type = 'read'; label = `Reading ${shortPath}`
        }
        
        list.push({ id: `tool_${i}`, type, status: 'pending', label, detail: rawPath })
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
      else if (e.type === 'validation_started') {
        list.push({ id: `val_${i}`, type: 'validate', status: 'pending', label: 'Running harness validation' })
      }
      else if (e.type === 'harness_layer_start') {
        const layer = e.harnessLayer ?? 'harness'
        const cmd = e.message ? e.message.slice(0, 60) : layer
        list.push({ id: `hl_${i}`, type: 'command', status: 'pending', label: `${layer}: ${cmd}`, detail: e.message })
      }
      else if (e.type === 'harness_line') {
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
          lastVal.status = e.harnessResult?.passed ? 'success' : 'error'
          const failed = e.harnessResult?.layers.filter(layer => !layer.skipped && !layer.passed).map(layer => layer.command || layer.name)
          lastVal.detail = failed?.length ? `Failed: ${failed.join(', ')}` : `Score: ${e.harnessResult?.score ?? 0}/100`
        }
      }
    }
    
    // Manter a lista curta visualmente mas não perder histórico: mostramos os últimos 5
    // Para um visual premium, se houver muitos, mostramos que estão "agrupados"
    return list
  }, [events])

  if (!activities.length) return null

  // Mostramos os 5 últimos para não poluir a tela
  const visible = activities.slice(-5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, marginBottom: 12 }}>
      {activities.length > 5 && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', paddingLeft: 8, marginBottom: 2 }}>
          ... {activities.length - 5} previous steps
        </div>
      )}
      
      {visible.map((act, i) => {
        const isPending = act.status === 'pending'
        const isLast = i === visible.length - 1
        
        let icon = <IconRead />
        let color = 'var(--text-2)'
        let bg = 'transparent'

        if (act.status === 'error') { icon = <IconError />; color = 'var(--red)' }
        else if (act.type === 'write') { icon = <IconWrite />; color = 'var(--teal)' }
        else if (act.type === 'command') { icon = <IconTerminal />; color = 'var(--yellow)' }
        else if (act.type === 'validate') { icon = <IconShield />; color = 'var(--amber)' }
        else if (act.type === 'list') { icon = <IconFolder />; color = 'var(--text-2)' }
        else { icon = <IconRead />; color = 'var(--purple)' }

        return (
          <div key={act.id} className="animate-fade-in" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 10px',
            borderRadius: '6px',
            background: isPending ? 'var(--bg-active, rgba(255,255,255,0.04))' : 'transparent',
            border: isPending ? `1px solid rgba(255,255,255,0.05)` : '1px solid transparent',
            transition: 'all 0.2s ease',
            opacity: isPending ? 1 : 0.7
          }}>
            <div style={{ width: 16, display: 'flex', justifyContent: 'center', color: isPending || act.status === 'error' ? color : 'var(--teal)' }}>
              {isPending ? <Spinner /> : act.status === 'error' ? <IconError /> : <IconCheck />}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <div style={{ 
                color: isPending ? 'var(--text-1)' : 'var(--text-2)', 
                fontSize: 12, fontWeight: isPending ? 600 : 500,
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                {act.label}
                {!isPending && act.detail && act.type === 'validate' && (
                  <span style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    background: act.status === 'error' ? 'var(--red-dim)' : 'var(--teal-dim)',
                    color: act.status === 'error' ? 'var(--red)' : 'var(--teal)',
                    borderRadius: 4
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
                  color: act.status === 'error' ? 'var(--red)' : 'var(--text-3)',
                  fontSize: 10,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {act.detail.slice(0, 700)}
                </pre>
              )}
              {act.lines && act.lines.length > 0 && act.type === 'command' && (
                <pre style={{
                  margin: '4px 0 0',
                  maxHeight: isPending ? 180 : 140,
                  overflow: 'auto',
                  color: act.status === 'error' ? 'var(--red)' : 'var(--text-3)',
                  fontSize: 10,
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(0,0,0,0.25)',
                  padding: '6px 8px',
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.04)',
                }}>
                  {act.lines.join('\n')}
                </pre>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
