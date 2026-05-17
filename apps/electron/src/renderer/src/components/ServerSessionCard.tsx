import React from 'react'
import type { ExecutionEvent } from '../types'

export function ServerSessionCard({ events }: { events: ExecutionEvent[] }): React.ReactElement | null {
  const session = [...events].reverse().find(event => event.serverSession)?.serverSession
  if (!session) return null
  const tone = session.ready ? 'pass' : session.diagnostics?.length ? 'fail' : 'warn'
  return (
    <section className="kova-panel-section kova-server-session" data-tone={tone}>
      <div className="kova-section-title">
        <span>Dev Server</span>
        <strong>{session.ready ? 'ready' : 'starting'}</strong>
      </div>
      <div className="kova-contract-grid">
        <div><span>Port</span><strong>{session.port ?? '-'}</strong></div>
        <div><span>Session</span><strong>{session.sessionId ?? '-'}</strong></div>
      </div>
      {session.url && <p className="kova-proof-next">{session.url}</p>}
      {session.diagnostics?.length ? (
        <div className="kova-proof-list danger">
          {session.diagnostics.map(item => <p key={item}>{item}</p>)}
        </div>
      ) : null}
    </section>
  )
}
