import React, { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { TerminalSessionInfo, PendingApproval } from '../app-state'
import type { ExecutionEvent } from '../types'

export type { TerminalSessionInfo, PendingApproval }

interface Props {
  sessions: TerminalSessionInfo[]
  commandEvents: ExecutionEvent[]
  pendingApproval: PendingApproval | null
  onClose: (id: string) => void
  onApprove: (id: string, approved: boolean) => void
}

function TerminalInstance({ sessionId, onClose }: { sessionId: string; onClose: () => void }): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      theme: {
        background: '#0D0F14',
        foreground: '#E8E8EB',
        cursor: '#5DCAA5',
        selectionBackground: 'rgba(93,202,165,0.25)',
        black: '#1E2027', red: '#E24B4A', green: '#5DCAA5', yellow: '#E5C07B',
        blue: '#7F77DD', magenta: '#C17A2E', cyan: '#5DCAA5', white: '#E8E8EB',
        brightBlack: '#606068', brightRed: '#E24B4A', brightGreen: '#5DCAA5',
        brightYellow: '#E5C07B', brightBlue: '#7F77DD', brightMagenta: '#C17A2E',
        brightCyan: '#5DCAA5', brightWhite: '#ffffff',
      },
      fontFamily: 'Menlo, Consolas, "Courier New", monospace',
      fontSize: 13,
      cursorBlink: true,
      scrollback: 5000,
      convertEol: true,
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)

    try { fit.fit() } catch { /* ignore initial fit errors */ }

    termRef.current = term
    fitRef.current = fit

    // Forward keystrokes to PTY
    term.onData((data) => {
      window.kova.terminalInput(sessionId, data)
    })

    // Receive data from PTY
    const unsubData = window.kova.onTerminalData((id, data) => {
      if (id === sessionId) term.write(data)
    })

    // Report size on resize
    const resizeObserver = new ResizeObserver(() => {
      try {
        fit.fit()
        window.kova.terminalResize(sessionId, term.cols, term.rows)
      } catch { /* ignore */ }
    })
    if (containerRef.current) resizeObserver.observe(containerRef.current)

    return () => {
      unsubData()
      resizeObserver.disconnect()
      term.dispose()
      termRef.current = null
    }
  }, [sessionId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 10px', background: 'var(--bg-3)', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
          Terminal
        </span>
        <button
          onClick={onClose}
          style={{ background: 'transparent', color: 'var(--text-3)', fontSize: 14, padding: '2px 6px' }}
          title="Close terminal"
        >
          ✕
        </button>
      </div>
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden' }} />
    </div>
  )
}

function ApprovalDialog({ approval, onApprove }: { approval: PendingApproval; onApprove: (id: string, approved: boolean) => void }): React.ReactElement {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 24, maxWidth: 480, width: '90%',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>
          Kova wants to run an interactive command
        </div>
        <div style={{
          background: 'var(--bg-1)', borderRadius: 6, padding: '10px 14px',
          fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--cyan)',
          marginBottom: 10, wordBreak: 'break-all',
        }}>
          {approval.command}
        </div>
        {approval.reason && (
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>
            {approval.reason}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 20 }}>
          A terminal panel will open. You will be able to interact with the process.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => onApprove(approval.id, false)}
            style={{
              padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-2)', fontSize: 13,
            }}
          >
            Deny
          </button>
          <button
            onClick={() => onApprove(approval.id, true)}
            style={{
              padding: '7px 16px', borderRadius: 6, border: 'none',
              background: 'var(--teal)', color: '#000', fontSize: 13, fontWeight: 600,
            }}
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  )
}

function CommandOutputLog({ events }: { events: ExecutionEvent[] }): React.ReactElement | null {
  const blocks: Array<{ id: string; command: string; lines: string[]; status: 'running' | 'done' | 'error' }> = []

  for (const event of events) {
    if (event.type === 'tool_call' && event.toolName === 'run_command') {
      blocks.push({
        id: `${blocks.length}`,
        command: String(event.toolInput?.command ?? event.message ?? 'run_command'),
        lines: [],
        status: 'running',
      })
    } else if (event.type === 'command_output') {
      const block = [...blocks].reverse().find(item => item.status === 'running')
      if (block && event.commandLine) block.lines.push(event.commandLine)
    } else if (event.type === 'tool_result') {
      const block = [...blocks].reverse().find(item => item.status === 'running')
      if (block) {
        block.status = event.message?.startsWith('Error:') || event.message?.startsWith('Blocked:') ? 'error' : 'done'
        if (event.message && block.lines.length === 0) block.lines.push(event.message)
      }
    }
  }

  const visible = blocks.slice(-3)
  if (visible.length === 0) return null

  return (
    <div style={{
      position: 'fixed', right: 18, bottom: 18, width: 'min(720px, calc(100vw - 36px))',
      maxHeight: '42vh', background: '#0D0F14', color: '#E8E8EB',
      border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
      boxShadow: '0 18px 50px rgba(0,0,0,0.45)', zIndex: 40,
    }}>
      <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 11 }}>
        Command output
      </div>
      <div style={{ overflow: 'auto', maxHeight: 'calc(42vh - 32px)' }}>
        {visible.map(block => (
          <div key={block.id} style={{ padding: '9px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color: block.status === 'error' ? 'var(--red)' : 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 6 }}>
              $ {block.command}
            </div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-2)', fontSize: 11, lineHeight: 1.45 }}>
              {block.lines.slice(-80).join('\n') || '(running...)'}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TerminalPanel({ sessions, commandEvents, pendingApproval, onClose, onApprove }: Props): React.ReactElement | null {
  const [activeId, setActiveId] = useState<string | null>(null)

  // Auto-select newest session
  useEffect(() => {
    if (sessions.length > 0) {
      setActiveId(sessions[sessions.length - 1].id)
    } else {
      setActiveId(null)
    }
  }, [sessions.length])

  const activeSession = sessions.find(s => s.id === activeId)

  const commandLog = <CommandOutputLog events={commandEvents} />

  if (sessions.length === 0 && !pendingApproval) return commandLog

  return (
    <>
      {commandLog}
      {pendingApproval && (
        <ApprovalDialog approval={pendingApproval} onApprove={onApprove} />
      )}

      {sessions.length > 0 && (
        <div style={{
          height: 280, flexShrink: 0,
          borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          background: '#0D0F14',
        }}>
          {/* Tab bar */}
          {sessions.length > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              padding: '4px 8px 0', background: 'var(--bg-3)',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0, overflowX: 'auto',
            }}>
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  style={{
                    padding: '3px 10px', borderRadius: '4px 4px 0 0', fontSize: 11,
                    background: s.id === activeId ? '#0D0F14' : 'transparent',
                    color: s.id === activeId ? 'var(--text-1)' : 'var(--text-3)',
                    border: '1px solid var(--border)',
                    borderBottom: s.id === activeId ? '1px solid #0D0F14' : '1px solid var(--border)',
                    fontFamily: 'var(--font-mono)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.command.split(' ')[0]}
                  {s.exitCode !== undefined && (
                    <span style={{ marginLeft: 6, color: s.exitCode === 0 ? 'var(--teal)' : 'var(--red)', fontSize: 10 }}>
                      ●
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Active terminal */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeSession && (
              <TerminalInstance
                key={activeSession.id}
                sessionId={activeSession.id}
                onClose={() => {
                  window.kova.terminalKill(activeSession.id)
                  onClose(activeSession.id)
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
