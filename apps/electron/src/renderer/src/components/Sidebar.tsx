import React, { useState, useMemo, useEffect } from 'react'
import type { ExecutionState } from '../types'
import type { SessionUsage } from '../App'
import { ProjectFiles } from './ProjectFiles'

interface Props {
  executionState: ExecutionState | null
  projectRoot: string | null
  sessionUsage: SessionUsage
  changedPaths: Set<string>
  refreshKey: number
  onOpenFile: (path: string) => void
  onLoadSession: (session: any) => void
}

type Tab = 'files' | 'history' | 'sessions'

export function Sidebar({ executionState, projectRoot, sessionUsage, changedPaths, refreshKey, onOpenFile, onLoadSession }: Props): React.ReactElement {
  const [tab, setTab] = useState<Tab>('files')
  const [sessions, setSessions] = useState<any[]>([])
  
  const history = executionState?.iterationHistory ?? []
  const totalTokens = Math.max(executionState?.totalTokens ?? 0, sessionUsage.contextTokens + sessionUsage.completionTokens)
  const contextPercent = sessionUsage.maxContextTokens
    ? Math.min(100, Math.round((sessionUsage.contextTokens / sessionUsage.maxContextTokens) * 100))
    : 0

  useEffect(() => {
    if (tab === 'sessions' && projectRoot) {
      window.kova.listSessions(projectRoot).then(setSessions)
    }
  }, [tab, projectRoot])

  const filesTabStyle = useMemo((): React.CSSProperties => ({
    flex: 1, padding: '7px 0', background: 'transparent',
    color: tab === 'files' ? 'var(--text-1)' : 'var(--text-3)',
    borderBottom: tab === 'files' ? '2px solid var(--amber)' : '2px solid transparent',
    fontSize: 11, fontWeight: tab === 'files' ? 600 : 400,
    borderRadius: 0, transition: 'color 0.15s',
  }), [tab])

  const historyTabStyle = useMemo((): React.CSSProperties => ({
    flex: 1, padding: '7px 0', background: 'transparent',
    color: tab === 'history' ? 'var(--text-1)' : 'var(--text-3)',
    borderBottom: tab === 'history' ? '2px solid var(--amber)' : '2px solid transparent',
    fontSize: 11, fontWeight: tab === 'history' ? 600 : 400,
    borderRadius: 0, transition: 'color 0.15s',
  }), [tab])

  const sessionsTabStyle = useMemo((): React.CSSProperties => ({
    flex: 1, padding: '7px 0', background: 'transparent',
    color: tab === 'sessions' ? 'var(--text-1)' : 'var(--text-3)',
    borderBottom: tab === 'sessions' ? '2px solid var(--amber)' : '2px solid transparent',
    fontSize: 11, fontWeight: tab === 'sessions' ? 600 : 400,
    borderRadius: 0, transition: 'color 0.15s',
  }), [tab])

  return (
    <div style={{ width: 220, background: 'var(--bg-2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
      {projectRoot && (
        <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projectRoot.replace(/\\/g, '/').split('/').at(-1)}
          </p>
          {(sessionUsage.contextTokens > 0 || sessionUsage.contextFiles.length > 0) && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Contexto</span>
                <span style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
                  {sessionUsage.contextFiles.length} arq · {(sessionUsage.contextTokens / 1000).toFixed(1)}k
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--bg-active)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${contextPercent || 3}%`, height: '100%', background: 'var(--amber)', borderRadius: 3 }} />
              </div>
              {sessionUsage.contextFiles.length > 0 && (
                <p style={{ marginTop: 5, fontSize: 10, color: 'var(--text-ghost)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sessionUsage.contextFiles.slice(0, 2).map(path => path.split('/').at(-1)).join(', ')}
                  {sessionUsage.contextFiles.length > 2 ? ` +${sessionUsage.contextFiles.length - 2}` : ''}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-3)' }}>
        <button style={filesTabStyle} onClick={() => setTab('files')}>Files</button>
        <button style={historyTabStyle} onClick={() => setTab('history')}>
          Log {history.length > 0 && `(${history.length})`}
        </button>
        <button style={sessionsTabStyle} onClick={() => setTab('sessions')}>Sessões</button>
      </div>

      {tab === 'files' && (
        projectRoot
          ? <ProjectFiles projectRoot={projectRoot} changedPaths={changedPaths} onOpenFile={onOpenFile} refreshKey={refreshKey} />
          : <p style={{ fontSize: 11, color: 'var(--text-ghost)', padding: '16px 14px' }}>Abra um projeto para ver os arquivos</p>
      )}

      {tab === 'history' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {history.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--text-ghost)', padding: '8px 14px' }}>Nenhuma iteração ainda</p>
          )}
          {history.map((iter, i) => {
            const scoreColor = iter.harnessResult.score >= 90 ? 'var(--teal)' : iter.harnessResult.score >= 70 ? 'var(--yellow)' : 'var(--red)'
            return (
              <div key={i} style={{ margin: '4px 6px', padding: '8px 10px', background: 'var(--bg-1)', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>#{iter.iteration + 1} · {iter.agentMode}</span>
                  <span style={{ fontSize: 11, color: scoreColor, fontWeight: 600 }}>{iter.harnessResult.score}</span>
                </div>
                <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>
                  {iter.changes.length} arquivo{iter.changes.length !== 1 ? 's' : ''} · {Math.round(iter.duration / 1000)}s
                </p>
                {iter.changes.slice(0, 3).map((c, ci) => (
                  <button key={ci} onClick={() => onOpenFile(c.path)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', color: 'var(--teal)', fontSize: 10, padding: '1px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.path.split('/').at(-1)}
                  </button>
                ))}
                {iter.changes.length > 3 && (
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>+ {iter.changes.length - 3} arquivo{iter.changes.length - 3 !== 1 ? 's' : ''}</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'sessions' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {sessions.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--text-ghost)', padding: '8px 14px' }}>Nenhuma sessão salva</p>
          )}
          {sessions.map(s => (
            <div key={s.id} style={{ margin: '4px 6px', padding: '8px 10px', background: 'var(--bg-1)', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 500, wordBreak: 'break-word', paddingRight: 6 }}>
                  {s.title}
                </span>
                <button 
                  onClick={async () => {
                    await window.kova.deleteSession(projectRoot!, s.id)
                    setSessions(sessions.filter(sess => sess.id !== s.id))
                  }}
                  style={{ background: 'transparent', color: 'var(--text-3)', padding: 2 }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                  {new Date(s.updatedAt).toLocaleDateString()} · {s.messages?.length || 0} msgs
                </span>
                <button 
                  onClick={() => onLoadSession(s)}
                  style={{ background: 'var(--amber-dim)', color: 'var(--amber)', fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}
                >
                  Carregar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalTokens > 0 && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
            {totalTokens >= 1_000_000 ? `${(totalTokens / 1_000_000).toFixed(1)}M` : `${(totalTokens / 1_000).toFixed(1)}k`} tokens
          </span>
        </div>
      )}
    </div>
  )
}
