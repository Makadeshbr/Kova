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
  onRepair?: () => void
}

const PHASES: Array<{ key: string; label: string; events: ExecutionEvent['type'][] }> = [
  { key: 'contract', label: 'Contract', events: ['contract_created'] },
  { key: 'plan', label: 'Plan', events: ['agent_started', 'agent_completed'] },
  { key: 'code', label: 'Code', events: ['agent_started', 'agent_completed'] },
  { key: 'validate', label: 'Validate', events: ['validation_started', 'validation_completed'] },
  { key: 'decide', label: 'Decide', events: ['decision_made'] },
  { key: 'apply', label: 'Apply', events: ['apply_started', 'apply_completed'] },
]

const LAYER_ORDER = ['build', 'typecheck', 'tests', 'rules', 'security', 'lint']
const LAYER_LABEL: Record<string, string> = {
  build: 'Build',
  typecheck: 'Typecheck',
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

function phaseState(
  phase: (typeof PHASES)[number],
  events: ExecutionEvent[],
  executionState: ExecutionState | null,
): 'done' | 'running' | 'idle' | 'skipped' | 'failed' {
  const relevant = events.filter(event => phase.events.includes(event.type))
  if (phase.key === 'plan') {
    const started = events.some(event => event.type === 'agent_started' && event.mode === 'plan')
    const done = events.some(event => event.type === 'agent_completed' && event.mode === 'plan')
    const codeStarted = events.some(event => event.type === 'agent_started' && event.mode !== 'plan')
    if (!started && codeStarted) return 'skipped'
    return done ? 'done' : started ? 'running' : 'idle'
  }
  if (phase.key === 'code') {
    const started = events.some(event => event.type === 'agent_started' && event.mode !== 'plan')
    const done = events.some(event => event.type === 'agent_completed' && event.mode !== 'plan')
    return done ? 'done' : started ? 'running' : 'idle'
  }
  if (phase.key === 'validate') {
    const lastValidation = [...events].reverse().find(event => event.type === 'validation_completed')
    if (lastValidation?.harnessResult) return lastValidation.harnessResult.passed ? 'done' : 'failed'
    if (events.some(event => event.type === 'validation_started')) return 'running'
    return 'idle'
  }
  if (phase.key === 'apply') {
    if (events.some(event => event.type === 'apply_completed')) return 'done'
    if (events.some(event => event.type === 'apply_started')) return 'running'
    if (executionState?.iterationHistory?.length && executionState.status !== 'completed') return 'skipped'
    return 'idle'
  }
  if (phase.key === 'contract' && executionState) return 'done'
  return relevant.length > 0 ? 'done' : 'idle'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

function useTicker(active: boolean): number {
  const [now, setNow] = useState(Date.now())
  React.useEffect(() => {
    if (!active) {
      setNow(Date.now())
      return
    }
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
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

function PhaseRail({ events, executionState }: { events: ExecutionEvent[]; executionState: ExecutionState | null }): React.ReactElement {
  return (
    <div className="kova-phase-rail">
      {PHASES.map(phase => {
        const state = phaseState(phase, events, executionState)
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
  const duration = layer.durationMs ?? layer.duration
  const canOpen = layer.errors.length > 0
    || !!layer.command
    || !!layer.stdout
    || !!layer.stderr
    || !!layer.cwd
    || !!layer.skippedReason
  return (
    <div className={`kova-layer ${tone}`}>
      <button className="kova-layer-button" onClick={() => setOpen(v => !v)} disabled={!canOpen}>
        <span className="kova-layer-dot" />
        <span className="kova-layer-name">{LAYER_LABEL[layer.name] ?? layer.name}</span>
        <span className="kova-layer-meta">
          {layer.skipped ? 'skip' : layer.passed ? formatDuration(duration) : `${layer.errors.length} err - ${formatDuration(duration)}`}
        </span>
      </button>
      {open && canOpen && (
        <div className="kova-layer-detail">
          {layer.cwd && (
            <div className="kova-layer-cwd">
              <span>cwd</span>
              <code>{layer.cwd}</code>
            </div>
          )}
          {layer.skippedReason && (
            <div className="kova-layer-skip">
              <span>skipped</span>
              <p>{layer.skippedReason}</p>
            </div>
          )}
          {layer.command && (
            <div className="kova-layer-command">
              <span>command</span>
              <code>{layer.command}</code>
              {typeof layer.exitCode === 'number' && <strong>exit {layer.exitCode}</strong>}
            </div>
          )}
          {layer.errors.length > 0 && (
            <div className="kova-layer-errors">
              {layer.errors.slice(0, 4).map((error, index) => <ErrorLine key={index} error={error} />)}
            </div>
          )}
          {(layer.stderr || layer.stdout) && (
            <pre className="kova-layer-output">{(layer.stderr || layer.stdout || '').slice(0, 2500)}</pre>
          )}
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

function ContextEvidenceCard({ sessionUsage }: { sessionUsage: SessionUsage }): React.ReactElement | null {
  const selected = sessionUsage.selectedFiles ?? []
  const blocked = sessionUsage.blockedFiles ?? []
  const rejected = sessionUsage.rejectedFiles ?? []
  const warnings = sessionUsage.contextWarnings ?? []
  if (selected.length === 0 && blocked.length === 0 && rejected.length === 0 && warnings.length === 0) return null

  return (
    <section className="kova-panel-section kova-context-evidence">
      <div className="kova-section-title">
        <span>Context Pack</span>
        <strong>{selected.length} used</strong>
      </div>

      {selected.length > 0 && (
        <div className="kova-context-card-group">
          <div className="kova-mini-title">Files used</div>
          {selected.slice(0, 6).map(file => (
            <div key={file.path} className="kova-context-file used">
              <div>
                <strong>{file.path}</strong>
                <p>{file.reason}</p>
              </div>
              <span>{file.score}</span>
            </div>
          ))}
        </div>
      )}

      {blocked.length > 0 && (
        <div className="kova-context-card-group">
          <div className="kova-mini-title danger">Blocked</div>
          {blocked.slice(0, 4).map(file => (
            <div key={file.path} className="kova-context-file blocked">
              <div>
                <strong>{file.path}</strong>
                <p>{file.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejected.length > 0 && (
        <div className="kova-context-card-group">
          <div className="kova-mini-title muted">Rejected</div>
          {rejected.slice(0, 4).map(file => (
            <div key={`${file.path}:${file.reason}`} className="kova-context-file rejected">
              <div>
                <strong>{file.path}</strong>
                <p>{file.reason}</p>
              </div>
              {typeof file.score === 'number' && <span>{file.score}</span>}
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="kova-context-warnings">
          {warnings.slice(0, 3).map(warning => <p key={warning}>{warning}</p>)}
        </div>
      )}
    </section>
  )
}

function EvidenceScoreCard({ last }: { last: NonNullable<ExecutionState['iterationHistory']>[number] | null }): React.ReactElement | null {
  const evidence = last?.harnessResult.evidenceScore
  if (!evidence) return null
  const tone = evidence.score >= 90 ? 'pass' : evidence.score >= 70 ? 'warn' : 'fail'
  return (
    <section className="kova-panel-section kova-evidence-score" data-tone={tone}>
      <div className="kova-section-title">
        <span>Evidence Score</span>
        <strong>{evidence.score}</strong>
      </div>
      <div className="kova-evidence-grid">
        <div><span>Confidence</span><strong>{evidence.validationConfidence}</strong></div>
        <div><span>Validations</span><strong>{evidence.validation.passedLayers.length}/{evidence.validation.executedLayers.length}</strong></div>
        <div><span>Risk</span><strong>{evidence.risk.riskLevel}</strong></div>
        <div><span>Patch</span><strong>{evidence.risk.patchSize}</strong></div>
      </div>
      {(evidence.blockers.length > 0 || evidence.notes.length > 0) && (
        <div className="kova-evidence-notes">
          {[...evidence.blockers, ...evidence.notes].slice(0, 5).map(note => <p key={note}>{note}</p>)}
        </div>
      )}
    </section>
  )
}

function ProofPackCard({ executionState }: { executionState: ExecutionState | null }): React.ReactElement | null {
  const proof = executionState?.proofPack
  if (!proof) return null
  const failed = proof.validationsRun.filter(validation => !validation.passed && !validation.skipped)
  const tone = proof.finalUiDecision === 'apply' ? 'pass'
    : proof.finalUiDecision === 'repair_needed' || proof.finalUiDecision === 'reject' ? 'fail'
    : 'warn'

  return (
    <section className="kova-panel-section kova-proof-pack" data-tone={tone}>
      <div className="kova-section-title">
        <span>Proof Pack</span>
        <strong>{proof.finalUiDecision ?? proof.finalDecision}</strong>
      </div>
      {proof.summary && <p className="kova-proof-summary">{proof.summary}</p>}
      <div className="kova-evidence-grid">
        <div><span>Score</span><strong>{proof.finalScore}</strong></div>
        <div><span>Confidence</span><strong>{proof.results?.validationConfidence ?? '-'}</strong></div>
        <div><span>Validations</span><strong>{proof.validationsRun.filter(v => v.passed).length}/{proof.validationsRun.length}</strong></div>
        <div><span>Files</span><strong>{proof.diffSummary?.filesChanged ?? proof.changes.length}</strong></div>
      </div>

      {failed.length > 0 && (
        <div className="kova-proof-list danger">
          <div className="kova-mini-title danger">Falhas reais</div>
          {failed.slice(0, 3).map(validation => (
            <p key={`${validation.kind}:${validation.command ?? validation.note}`}>
              {(validation.command ?? validation.kind)} - {validation.note ?? 'failed'}
            </p>
          ))}
        </div>
      )}

      {proof.validationsNotRun.length > 0 && (
        <div className="kova-proof-list">
          <div className="kova-mini-title muted">Not run</div>
          {proof.validationsNotRun.slice(0, 4).map(validation => (
            <p key={`${validation.kind}:${validation.reason}`}>{validation.kind}: {validation.reason}</p>
          ))}
        </div>
      )}

      {proof.residualRisk.length > 0 && (
        <div className="kova-proof-list">
          <div className="kova-mini-title muted">Riscos</div>
          {proof.residualRisk.slice(0, 4).map(risk => <p key={risk}>{risk}</p>)}
        </div>
      )}

      {proof.nextStepRecommended && <p className="kova-proof-next">{proof.nextStepRecommended}</p>}
    </section>
  )
}

export function HarnessDashboard({ executionState, events, sessionUsage, isThinking, onViewDiff, onPause, onAbort, onApply, onRepair }: Props): React.ReactElement {
  const [tab, setTab] = useState<'timeline' | 'run' | 'review' | 'events'>('timeline')
  const last = executionState?.iterationHistory?.at(-1) ?? null
  const status = executionState?.status ?? null
  const isRunning = isThinking || (!!status && !['completed', 'failed', 'paused'].includes(status))
  const now = useTicker(isRunning)

  const hasWrite = useMemo(() => events.some(e => e.type === 'tool_call' && (e.toolName === 'write_file' || e.toolName === 'run_command')), [events])
  const hasRead = useMemo(() => events.some(e => e.type === 'tool_call' && (e.toolName === 'read_file' || e.toolName === 'list_files')), [events])
  const changes = last?.changes ?? []

  let uxMode: 'Chat' | 'Review' | 'Task' = 'Chat'
  if (hasWrite || changes.length > 0) uxMode = 'Task'
  else if (hasRead) uxMode = 'Review'

  const decision = last?.decision ?? null
  const score = decision?.score ?? last?.harnessResult.score ?? 0
  const review = decision?.reviewGate ?? null
  const contract = [...events].reverse().find(event => event.contract)?.contract ?? null
  const isPaused = status === 'paused'
  const failedLayers = last?.harnessResult.layers.filter(layer => !layer.skipped && !layer.passed) ?? []
  const needsRepair = status === 'failed' && failedLayers.some(layer => ['build', 'typecheck', 'tests', 'lint'].includes(layer.name))
  const currentIteration = executionState?.iterationHistory?.length ?? 0
  const maxIterations = executionState?.maxIterations ?? 5
  const isRepairLoop = isRunning && currentIteration > 1

  const meaningfulEvents = useMemo(() => events.filter(e =>
    e.type !== 'token'
    && e.type !== 'stream_end'
    && e.type !== 'reasoning_start'
    && e.type !== 'reasoning_delta'
    && e.type !== 'reasoning_end'
  ), [events])
  const latestEvents = useMemo(() => meaningfulEvents.slice(-20).reverse(), [meaningfulEvents])
  const totalTokens = Math.max(executionState?.totalTokens ?? 0, sessionUsage.contextTokens + sessionUsage.completionTokens)
  const proofFiles = executionState?.proofPack?.analyzedFiles?.length ?? 0
  const visibleContextFiles = Math.max(sessionUsage.contextFiles.length, proofFiles, changes.length)
  const elapsedMs = executionState?.startedAt ? now - new Date(executionState.startedAt).getTime() : 0
  const contextPercent = sessionUsage.maxContextTokens
    ? Math.min(100, Math.round((sessionUsage.contextTokens / sessionUsage.maxContextTokens) * 100))
    : null

  // Contextual labels
  let heroLabel = 'Idle'
  let heroColor = 'var(--text-3)'
  let heroBg = 'var(--bg-active)'
  let heroSub = 'Waiting for a task.'

  if (uxMode === 'Chat') {
    if (isRunning) { heroLabel = 'Chatting'; heroColor = 'var(--purple)'; heroBg = 'var(--purple-dim)'; heroSub = 'Processing request...' }
  } else if (uxMode === 'Review') {
    if (isRunning) { heroLabel = 'Reviewing'; heroColor = 'var(--blue)'; heroBg = 'var(--blue-dim)'; heroSub = 'Reading files and preparing analysis...' }
    else { heroLabel = 'Review complete'; heroColor = 'var(--teal)'; heroBg = 'var(--teal-dim)'; heroSub = 'No changes applied.' }
  } else if (uxMode === 'Task') {
    const tone = statusTone(status)
    heroLabel = tone.label
    heroColor = tone.color
    heroBg = tone.bg
    heroSub = decision?.reason ?? 'Running changes and validation...'
    if (isRepairLoop) {
      heroLabel = `Repair ${currentIteration}/${maxIterations}`
      heroColor = 'var(--amber)'
      heroBg = 'var(--amber-dim)'
      const failing = failedLayers.map(layer => LAYER_LABEL[layer.name] ?? layer.name).join(', ')
      heroSub = failing ? `Fixing: ${failing}` : 'Applying fix...'
    }
    if (needsRepair) {
      heroLabel = 'Repair needed'
      heroColor = 'var(--red)'
      heroBg = 'var(--red-dim)'
      heroSub = `${failedLayers.map(layer => LAYER_LABEL[layer.name] ?? layer.name).join(', ')} failed; needs another fix.`
    }
  }

  // Se for Chat puro (terminou e não tem nada), mantem a UI limpa
  if (uxMode === 'Chat' && !isRunning && meaningfulEvents.length === 0) {
    return (
      <aside className="kova-run-panel" style={{ justifyContent: 'center', alignItems: 'center', opacity: 0.5 }}>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No active task</p>
      </aside>
    )
  }

  return (
    <aside className="kova-run-panel">
      <div className="kova-run-hero">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: heroColor, padding: '2px 6px', background: heroBg, borderRadius: 4 }}>
              Mode {uxMode}
            </span>
          </div>
          <h2 style={{ color: heroColor }}>{heroLabel}</h2>
          <p>{heroSub}</p>
        </div>
        {uxMode === 'Task' && <ScoreRing score={score} />}
      </div>

      {uxMode === 'Task' && <PhaseRail events={events} executionState={executionState} />}

      <div className="kova-run-tabs">
        <button className={tab === 'timeline' ? 'active' : ''} onClick={() => setTab('timeline')}>Timeline</button>
        {uxMode === 'Task' && <button className={tab === 'run' ? 'active' : ''} onClick={() => setTab('run')}>Run</button>}
        {uxMode === 'Task' && <button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>Review</button>}
        <button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>Debug</button>
      </div>

      <div className="kova-run-body">
        {(tab === 'timeline' || tab === 'events') && (sessionUsage.contextTokens > 0 || totalTokens > 0 || visibleContextFiles > 0) && (
          <section className="kova-panel-section">
            <div className="kova-section-title">
              <span>Context</span>
              <strong>{contextPercent !== null ? `${contextPercent}%` : '-'}</strong>
            </div>
            <div className="kova-contract-grid">
              <div><span>Files</span><strong>{visibleContextFiles}</strong></div>
              <div><span>Context</span><strong>{(sessionUsage.contextTokens / 1000).toFixed(1)}k</strong></div>
              <div><span>Total</span><strong>{totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens}</strong></div>
              {executionState && <div><span>Duration</span><strong>{formatDuration(elapsedMs)}</strong></div>}
            </div>
          </section>
        )}

        {(tab === 'timeline' || tab === 'events') && <ContextEvidenceCard sessionUsage={sessionUsage} />}

        {tab === 'timeline' && (
          <section className="kova-panel-section">
            <div className="kova-section-title">
              <span>Timeline</span>
              <strong>{meaningfulEvents.length}</strong>
            </div>
            <div className="kova-event-list">
              {latestEvents.length === 0 && <p className="kova-muted">No actions yet.</p>}
              {latestEvents.map((event, index) => <EventRow key={`${event.timestamp}:timeline:${index}`} event={event} />)}
            </div>
          </section>
        )}

        {(tab === 'run' && uxMode === 'Task') && (
          <>
            <section className="kova-panel-section">
              <div className="kova-section-title">
                <span>Harness</span>
                <strong>{last ? `${last.harnessResult.layers.filter(layer => layer.passed && !layer.skipped).length}/${last.harnessResult.layers.filter(layer => !layer.skipped).length}` : '-'}</strong>
              </div>
              <div className="kova-layer-stack">
                {LAYER_ORDER.map(name => {
                  const layer = last?.harnessResult.layers.find(item => item.name === name)
                  return layer ? <LayerPill key={name} layer={layer} /> : <div key={name} className="kova-layer idle"><div className="kova-layer-button"><span className="kova-layer-dot" /><span className="kova-layer-name">{LAYER_LABEL[name]}</span><span className="kova-layer-meta">idle</span></div></div>
                })}
              </div>
            </section>

            <EvidenceScoreCard last={last} />

            <section className="kova-panel-section">
              <div className="kova-section-title">
                <span>Files</span>
                <strong>{changes.length}</strong>
              </div>
              <div className="kova-file-list">
                {changes.length === 0 && <p className="kova-muted">No files changed.</p>}
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
            <ProofPackCard executionState={executionState} />

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
              ) : <p className="kova-muted">Created when task starts.</p>}
            </section>

            <section className="kova-panel-section">
              <div className="kova-section-title">
                <span>Review Gate</span>
                <strong style={{ color: review?.passed ? 'var(--teal)' : review ? 'var(--yellow)' : 'var(--text-3)' }}>
                  {review ? (review.passed ? 'pass' : 'hold') : '-'}
                </strong>
              </div>
              <div className="kova-findings">
                {!review && <p className="kova-muted">Waiting for validation.</p>}
                {review?.findings.length === 0 && <p className="kova-muted">No findings.</p>}
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
              {latestEvents.length === 0 && <p className="kova-muted">No events recorded.</p>}
              {latestEvents.map((event, index) => <EventRow key={`${event.timestamp}:${index}`} event={event} />)}
            </div>
          </section>
        )}
      </div>

      <div className="kova-run-actions">
        {needsRepair && onRepair && <button className="primary repair" onClick={onRepair}>Fix failures</button>}
        {onViewDiff && uxMode === 'Task' && <button className="secondary" onClick={onViewDiff}>Review files</button>}
        {isPaused && uxMode === 'Task' && <button className="primary" onClick={onApply}>Apply changes</button>}
        {isRunning && (
          <div className="kova-action-row">
            {uxMode === 'Task' && <button className="secondary" onClick={onPause}>Pause</button>}
            <button className="danger" onClick={onAbort}>Cancel</button>
          </div>
        )}
      </div>
    </aside>
  )
}
