import React, { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { TerminalSessionInfo, PendingApproval } from '../app-state'

export type { TerminalSessionInfo, PendingApproval }

interface Props {
  sessions: TerminalSessionInfo[]
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
    try { term.focus() } catch { /* ignore focus errors on detached terminals */ }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
            Terminal
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
            interactive PTY
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', color: 'var(--text-3)', fontSize: 14, padding: '2px 6px' }}
          title="Stop terminal session"
          aria-label="Stop terminal session"
        >
          x
        </button>
      </div>
      <div
        ref={containerRef}
        onMouseDown={() => termRef.current?.focus()}
        style={{ flex: 1, overflow: 'hidden' }}
      />
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

// FIX-CMD: the standalone floating command-output panel was removed. Inline
// rendering in ActivityFeed (chat area) is now the single source of truth for
// `run_command` output, matching Claude Code / Cursor / Codex UX. TerminalPanel
// is reserved for interactive PTY sessions and approval dialogs.

export function TerminalPanel({ sessions, pendingApproval, onClose, onApprove }: Props): React.ReactElement | null {
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

  if (sessions.length === 0 && !pendingApproval) return null

  return (
    <>
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
