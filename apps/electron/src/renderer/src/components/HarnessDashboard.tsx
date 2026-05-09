import React, { useMemo, useState } from 'react'
import type { ExecutionEvent, ExecutionState, HarnessError, LayerResult, ReviewFinding } from '../types'
import type { SessionUsage } from '../App'

interface Props {
  executionState: ExecutionState | null
  events: ExecutionEvent[]
  sessionUsage: SessionUsage
  isThinking?: boolean
  onViewDiff?: () => void
  onPause: () => void
  onAbort: () => void
  onApply: () => void
}

const PHASES: Array<{ key: string; label: string; events: ExecutionEvent['type'][] }> = [
  { key: 'contract', label: 'Contract', events: ['contract_created'] },
  { key: 'plan', label: 'Plan', events: ['agent_started', 'agent_completed'] },
  { key: 'code', label: 'Code', events: ['agent_started', 'agent_completed'] },
  { key: 'validate', label: 'Validate', events: ['validation_started', 'validation_completed'] },
  { key: 'decide', label: 'Decide', events: ['decision_made'] },
  { key: 'apply', label: 'Apply', events: ['apply_started', 'apply_completed'] },
]

const LAYER_ORDER = ['build', 'tests', 'rules', 'security', 'lint']
const LAYER_LABEL: Record<string, string> = {
  build: 'Build',
  tests: 'Tests',
  rules: 'Rules',
  security: 'Security',
  lint: 'Lint',
}

const STATUS_COPY: Record<string, string> = {
  structuring: 'Structuring',
  planning: 'Planning',
  coding: 'Coding',
  validating: 'Validating',
  deciding: 'Deciding',
  applying: 'Applying',
  completed: 'Completed',
  failed: 'Failed',
  paused: 'Review',
}

function statusTone(status: string | null): { color: string; bg: string; label: string } {
  if (status === 'completed') return { color: 'var(--teal)', bg: 'var(--teal-dim)', label: 'Ready' }
  if (status === 'failed') return { color: 'var(--red)', bg: 'var(--red-dim)', label: 'Failed' }
  if (status === 'paused') return { color: 'var(--yellow)', bg: 'var(--yellow-dim)', label: 'Review' }
  if (status) return { color: 'var(--amber)', bg: 'var(--amber-dim)', label: STATUS_COPY[status] ?? status }
  return { color: 'var(--text-3)', bg: 'var(--bg-active)', label: 'Idle' }
}

function phaseState(phase: (typeof PHASES)[number], events: ExecutionEvent[]): 'done' | 'running' | 'idle' {
  const relevant = events.filter(event => phase.events.includes(event.type))
  if (phase.key === 'plan') {
    const started = events.some(event => event.type === 'agent_started' && event.mode === 'plan')
    const done = events.some(event => event.type === 'agent_completed' && event.mode === 'plan')
    return done ? 'done' : started ? 'running' : 'idle'
  }
  if (phase.key === 'code') {
    const started = events.some(event => event.type === 'agent_started' && event.mode !== 'plan')
    const done = events.some(event => event.type === 'agent_completed' && event.mode !== 'plan')
    return done ? 'done' : started ? 'running' : 'idle'
  }
  if (phase.key === 'validate') {
    if (events.some(event => event.type === 'validation_completed')) return 'done'
    if (events.some(event => event.type === 'validation_started')) return 'running'
    return 'idle'
  }
  if (phase.key === 'apply') {
    if (events.some(event => event.type === 'apply_completed')) return 'done'
    if (events.some(event => event.type === 'apply_started')) return 'running'
    return 'idle'
  }
  return relevant.length > 0 ? 'done' : 'idle'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function ScoreRing({ score }: { score: number }): React.ReactElement {
  const radius = 29
  const circle = 2 * Math.PI * radius
  const color = score >= 90 ? 'var(--teal)' : score >= 70 ? 'var(--yellow)' : score > 0 ? 'var(--red)' : 'var(--text-ghost)'
  return (
    <svg className="kova-score-ring" viewBox="0 0 76 76" aria-label={`Score ${score}`}>
      <circle cx="38" cy="38" r={radius} fill="none" stroke="var(--bg-active)" strokeWidth="6" />
      <circle
        cx="38"
        cy="38"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * circle} ${circle}`}
        transform="rotate(-90 38 38)"
      />
      <text x="38" y="38" textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="16" fontWeight="800">{score}</text>
    </svg>
  )
}

function PhaseRail({ events }: { events: ExecutionEvent[] }): React.ReactElement {
  return (
    <div className="kova-phase-rail">
      {PHASES.map(phase => {
        const state = phaseState(phase, events)
        return (
          <div key={phase.key} className={`kova-phase ${state}`}>
            <span className="kova-phase-dot" />
            <span>{phase.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function LayerPill({ layer }: { layer: LayerResult }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const tone = layer.skipped ? 'idle' : layer.passed ? 'pass' : 'fail'
  return (
    <div className={`kova-layer ${tone}`}>
      <button className="kova-layer-button" onClick={() => setOpen(v => !v)} disabled={layer.errors.length === 0}>
        <span className="kova-layer-dot" />
        <span className="kova-layer-name">{LAYER_LABEL[layer.name] ?? layer.name}</span>
        <span className="kova-layer-meta">
          {layer.skipped ? 'skip' : layer.passed ? `${layer.duration}ms` : `${layer.errors.length} err`}
        </span>
      </button>
      {open && layer.errors.length > 0 && (
        <div className="kova-layer-errors">
          {layer.errors.slice(0, 4).map((error, index) => <ErrorLine key={index} error={error} />)}
        </div>
      )}
    </div>
  )
}

function ErrorLine({ error }: { error: HarnessError }): React.ReactElement {
  const file = error.file ? `${error.file.split('/').at(-1)}${error.line ? `:${error.line}` : ''}` : 'harness'
  return (
    <div className="kova-error-line">
      <span>{file}</span>
      <p>{error.humanMessage || error.message}</p>
    </div>
  )
}

function FindingRow({ finding }: { finding: ReviewFinding }): React.ReactElement {
  return (
    <div className={`kova-finding ${finding.blocking ? 'blocking' : 'notice'}`}>
      <div>
        <span>{finding.category}</span>
        <p>{finding.message}</p>
      </div>
      <strong>{finding.severity}</strong>
    </div>
  )
}

function EventRow({ event }: { event: ExecutionEvent }): React.ReactElement {
  const label = event.message ?? event.type.replace(/_/g, ' ')
  return (
    <div className="kova-event-row">
      <span>{formatTime(event.timestamp)}</span>
      <p>{label}</p>
    </div>
  )
}

export function HarnessDashboard({ executionState, events, sessionUsage, isThinking, onViewDiff, onPause, onAbort, onApply }: Props): React.ReactElement {
  const [tab, setTab] = useState<'timeline' | 'run' | 'review' | 'events'>('timeline')
  const last = executionState?.iterationHistory?.at(-1) ?? null
  const status = executionState?.status ?? null

  const hasWrite = useMemo(() => events.some(e => e.type === 'tool_call' && (e.toolName === 'write_file' || e.toolName === 'run_command')), [events])
  const hasRead = useMemo(() => events.some(e => e.type === 'tool_call' && (e.toolName === 'read_file' || e.toolName === 'list_files')), [events])
  const changes = last?.changes ?? []

  let uxMode: 'Chat' | 'Review' | 'Task' = 'Chat'
  if (hasWrite || changes.length > 0) uxMode = 'Task'
  else if (hasRead) uxMode = 'Review'

  const score = last?.harnessResult.score ?? 0
  const decision = last?.decision ?? null
  const review = decision?.reviewGate ?? null
  const contract = [...events].reverse().find(event => event.contract)?.contract ?? null
  const isRunning = isThinking || (!!status && !['completed', 'failed', 'paused'].includes(status))
  const isPaused = status === 'paused'

  const meaningfulEvents = useMemo(() => events.filter(e => e.type !== 'token' && e.type !== 'stream_end'), [events])
  const latestEvents = useMemo(() => meaningfulEvents.slice(-20).reverse(), [meaningfulEvents])
  const totalTokens = Math.max(executionState?.totalTokens ?? 0, sessionUsage.contextTokens + sessionUsage.completionTokens)
  const contextPercent = sessionUsage.maxContextTokens
    ? Math.min(100, Math.round((sessionUsage.contextTokens / sessionUsage.maxContextTokens) * 100))
    : null

  // Contextual labels
  let heroLabel = 'Idle'
  let heroColor = 'var(--text-3)'
  let heroBg = 'var(--bg-active)'
  let heroSub = 'Aguardando tarefa.'

  if (uxMode === 'Chat') {
    if (isRunning) { heroLabel = 'Conversando'; heroColor = 'var(--purple)'; heroBg = 'var(--purple-dim)'; heroSub = 'Entendendo o pedido...' }
  } else if (uxMode === 'Review') {
    if (isRunning) { heroLabel = 'Revisando'; heroColor = 'var(--blue)'; heroBg = 'var(--blue-dim)'; heroSub = 'Lendo arquivos e preparando diagnóstico...' }
    else { heroLabel = 'Review concluído'; heroColor = 'var(--teal)'; heroBg = 'var(--teal-dim)'; heroSub = 'Nenhuma alteração foi aplicada.' }
  } else if (uxMode === 'Task') {
    const tone = statusTone(status)
    heroLabel = tone.label
    heroColor = tone.color
    heroBg = tone.bg
    heroSub = decision?.reason ?? 'Aplicando modificações e validações...'
  }

  // Se for Chat puro (terminou e não tem nada), mantem a UI limpa
  if (uxMode === 'Chat' && !isRunning && meaningfulEvents.length === 0) {
    return (
      <aside className="kova-run-panel" style={{ justifyContent: 'center', alignItems: 'center', opacity: 0.5 }}>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Nenhuma tarefa ativa</p>
      </aside>
    )
  }

  return (
    <aside className="kova-run-panel">
      <div className="kova-run-hero">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: heroColor, padding: '2px 6px', background: heroBg, borderRadius: 4 }}>
              Modo {uxMode}
            </span>
          </div>
          <h2 style={{ color: heroColor }}>{heroLabel}</h2>
          <p>{heroSub}</p>
        </div>
        {uxMode === 'Task' && <ScoreRing score={score} />}
      </div>

      {uxMode === 'Task' && <PhaseRail events={events} />}

      <div className="kova-run-tabs">
        <button className={tab === 'timeline' ? 'active' : ''} onClick={() => setTab('timeline')}>Timeline</button>
        {uxMode === 'Task' && <button className={tab === 'run' ? 'active' : ''} onClick={() => setTab('run')}>Run</button>}
        {uxMode === 'Task' && <button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>Review</button>}
        <button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>Debug</button>
      </div>

      <div className="kova-run-body">
        {(tab === 'timeline' || tab === 'events') && (sessionUsage.contextTokens > 0 || totalTokens > 0) && (
          <section className="kova-panel-section">
            <div className="kova-section-title">
              <span>Contexto</span>
              <strong>{contextPercent !== null ? `${contextPercent}%` : '-'}</strong>
            </div>
            <div className="kova-contract-grid">
              <div><span>Arquivos</span><strong>{sessionUsage.contextFiles.length}</strong></div>
              <div><span>Contexto</span><strong>{(sessionUsage.contextTokens / 1000).toFixed(1)}k</strong></div>
              <div><span>Total</span><strong>{totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}</strong></div>
            </div>
          </section>
        )}

        {tab === 'timeline' && (
          <section className="kova-panel-section">
            <div className="kova-section-title">
              <span>Timeline</span>
              <strong>{meaningfulEvents.length}</strong>
            </div>
            <div className="kova-event-list">
              {latestEvents.length === 0 && <p className="kova-muted">Nenhuma ação ainda.</p>}
              {latestEvents.map((event, index) => <EventRow key={`${event.timestamp}:timeline:${index}`} event={event} />)}
            </div>
          </section>
        )}

        {(tab === 'run' && uxMode === 'Task') && (
          <>
            <section className="kova-panel-section">
              <div className="kova-section-title">
                <span>Harness</span>
                <strong>{last ? `${last.harnessResult.layers.filter(layer => layer.passed).length}/${last.harnessResult.layers.length}` : '-'}</strong>
              </div>
              <div className="kova-layer-stack">
                {LAYER_ORDER.map(name => {
                  const layer = last?.harnessResult.layers.find(item => item.name === name)
                  return layer ? <LayerPill key={name} layer={layer} /> : <div key={name} className="kova-layer idle"><div className="kova-layer-button"><span className="kova-layer-dot" /><span className="kova-layer-name">{LAYER_LABEL[name]}</span><span className="kova-layer-meta">idle</span></div></div>
                })}
              </div>
            </section>

            <section className="kova-panel-section">
              <div className="kova-section-title">
                <span>Files</span>
                <strong>{changes.length}</strong>
              </div>
              <div className="kova-file-list">
                {changes.length === 0 && <p className="kova-muted">Nenhum arquivo alterado.</p>}
                {changes.slice(0, 6).map(change => (
                  <div key={`${change.type}:${change.path}`} className="kova-file-row">
                    <span>{change.type}</span>
                    <p>{change.path.split('/').at(-1)}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {(tab === 'review' && uxMode === 'Task') && (
          <>
            <section className="kova-panel-section">
              <div className="kova-section-title">
                <span>Contract</span>
                <strong>{contract ? contract.stackAdapter : '-'}</strong>
              </div>
              {contract ? (
                <div className="kova-contract-grid">
                  <div><span>Max files</span><strong>{contract.maxFilesChanged}</strong></div>
                  <div><span>Tests</span><strong>{contract.requiresTests ? 'required' : 'optional'}</strong></div>
                  <div><span>Scope</span><strong>{contract.allowedPaths.slice(0, 2).join(', ') || '**'}</strong></div>
                </div>
              ) : <p className="kova-muted">Criado ao iniciar alterações.</p>}
            </section>

            <section className="kova-panel-section">
              <div className="kova-section-title">
                <span>Review Gate</span>
                <strong style={{ color: review?.passed ? 'var(--teal)' : review ? 'var(--yellow)' : 'var(--text-3)' }}>
                  {review ? (review.passed ? 'pass' : 'hold') : '-'}
                </strong>
              </div>
              <div className="kova-findings">
                {!review && <p className="kova-muted">Aguardando validação.</p>}
                {review?.findings.length === 0 && <p className="kova-muted">Nenhum alerta.</p>}
                {review?.findings.map((finding, index) => <FindingRow key={index} finding={finding} />)}
              </div>
            </section>
          </>
        )}

        {tab === 'events' && (
          <section className="kova-panel-section">
            <div className="kova-section-title">
              <span>Debug / Raw Events</span>
              <strong>{meaningfulEvents.length}</strong>
            </div>
            <div className="kova-event-list">
              {latestEvents.length === 0 && <p className="kova-muted">Nenhum evento registrado.</p>}
              {latestEvents.map((event, index) => <EventRow key={`${event.timestamp}:${index}`} event={event} />)}
            </div>
          </section>
        )}
      </div>

      <div className="kova-run-actions">
        {onViewDiff && uxMode === 'Task' && <button className="secondary" onClick={onViewDiff}>Revisar arquivos</button>}
        {isPaused && uxMode === 'Task' && <button className="primary" onClick={onApply}>Aplicar mudanças</button>}
        {isRunning && (
          <div className="kova-action-row">
            {uxMode === 'Task' && <button className="secondary" onClick={onPause}>Pausar</button>}
            <button className="danger" onClick={onAbort}>Cancelar</button>
          </div>
        )}
      </div>
    </aside>
  )
}
