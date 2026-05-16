import React, { useEffect, useState } from 'react'

interface PendingLearning {
  candidateDescription: string
  type: string
  scope: string
  tags: string[]
  stack?: string
  source: string
  reason: string
  classification: string
  queuedAt: string
}

interface ContradictedLearning {
  id: string
  description: string
  type: string
  scope: string
  status: string
  confidence: number
  contradictions: number
  tags: string[]
  stack?: string
  invalidatedAt?: string
  invalidationReason?: string
}

interface Props {
  projectRoot: string | null
  refreshKey: number
}

export function MemoryPanel({ projectRoot, refreshKey }: Props): React.ReactElement | null {
  const [pending, setPending] = useState<PendingLearning[]>([])
  const [contradicted, setContradicted] = useState<ContradictedLearning[]>([])
  const [invalidated, setInvalidated] = useState<ContradictedLearning[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!projectRoot) {
      setPending([])
      setContradicted([])
      setInvalidated([])
      return
    }
    Promise.all([
      window.kova.getPendingLearnings(projectRoot).catch(() => []),
      window.kova.getContradictedLearnings(projectRoot).catch(() => []),
      window.kova.getInvalidatedLearnings(projectRoot).catch(() => []),
    ]).then(([p, c, i]) => {
      setPending(p)
      setContradicted(c)
      setInvalidated(i)
    })
  }, [projectRoot, refreshKey])

  const total = pending.length + contradicted.length + invalidated.length
  if (!projectRoot || total === 0) return null

  return (
    <div style={{
      padding: '8px 12px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-2)',
      fontSize: 12,
    }}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', border: 'none', color: 'var(--text-2)',
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.05em', cursor: 'pointer', padding: '4px 0',
        }}
      >
        <span>Memory</span>
        <span style={{ display: 'flex', gap: 6 }}>
          {pending.length > 0 && (
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 8, fontFamily: 'var(--font-mono)',
              background: 'var(--yellow-dim)', color: 'var(--yellow)',
            }}>{pending.length} review</span>
          )}
          {contradicted.length > 0 && (
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 8, fontFamily: 'var(--font-mono)',
              background: 'var(--red-dim)', color: 'var(--red)',
            }}>{contradicted.length} conflict</span>
          )}
          {invalidated.length > 0 && (
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 8, fontFamily: 'var(--font-mono)',
              background: 'var(--bg-active)', color: 'var(--text-3)',
            }}>{invalidated.length} invalid</span>
          )}
        </span>
      </button>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {pending.length > 0 && <PendingSection items={pending} />}
          {contradicted.length > 0 && <ContradictedSection items={contradicted} />}
          {invalidated.length > 0 && <InvalidatedSection items={invalidated} />}
        </div>
      )}
    </div>
  )
}

function InvalidatedSection({ items }: { items: ContradictedLearning[] }): React.ReactElement {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>Invalidated learnings</div>
      {items.slice(0, 5).map(item => (
        <div key={item.id} style={{
          padding: '6px 8px', borderRadius: 6, background: 'var(--bg-3)',
          marginBottom: 4, border: '1px solid var(--border)',
        }}>
          <div style={{ color: 'var(--text-1)', fontSize: 12, lineHeight: 1.4 }}>
            {item.description.slice(0, 140)}
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 2 }}>
            {item.invalidationReason ?? 'Invalidated by project profile change.'}
          </div>
        </div>
      ))}
    </div>
  )
}

function PendingSection({ items }: { items: PendingLearning[] }): React.ReactElement {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>Awaiting human review</div>
      {items.slice(0, 5).map((item, i) => (
        <div key={i} style={{
          padding: '6px 8px', borderRadius: 6, background: 'var(--bg-3)',
          marginBottom: 4, border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--yellow-dim)', color: 'var(--yellow)', fontFamily: 'var(--font-mono)' }}>
              {item.type}
            </span>
            {item.stack && (
              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--bg-active)', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                {item.stack}
              </span>
            )}
          </div>
          <div style={{ color: 'var(--text-1)', fontSize: 12, lineHeight: 1.4 }}>
            {item.candidateDescription.slice(0, 140)}
          </div>
          <div style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 2 }}>
            {item.reason}
          </div>
        </div>
      ))}
      {items.length > 5 && (
        <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', marginTop: 2 }}>
          +{items.length - 5} pending
        </div>
      )}
    </div>
  )
}

function ContradictedSection({ items }: { items: ContradictedLearning[] }): React.ReactElement {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>Contradicted learnings</div>
      {items.slice(0, 5).map(item => (
        <div key={item.id} style={{
          padding: '6px 8px', borderRadius: 6, background: 'var(--bg-3)',
          marginBottom: 4, border: '1px solid var(--red-dim)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--red-dim)', color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
              {item.contradictions} × contradiction
            </span>
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'var(--bg-active)', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              {item.status}
            </span>
          </div>
          <div style={{ color: 'var(--text-1)', fontSize: 12, lineHeight: 1.4 }}>
            {item.description.slice(0, 140)}
          </div>
        </div>
      ))}
      {items.length > 5 && (
        <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', marginTop: 2 }}>
          +{items.length - 5} contradicted
        </div>
      )}
    </div>
  )
}
