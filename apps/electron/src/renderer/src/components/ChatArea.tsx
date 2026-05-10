import React, { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import type { ExecutionEvent, ExecutionState, TaskDefinition } from '../types'
import type { ChatMessage, ChatMode, PermissionMode, QueuedMessage, SessionUsage } from '../App'
import type { AgentResultMessage } from '@kova/shared'
import { FileCard } from './FileCard'

interface Props {
  messages: ChatMessage[]
  executionState: ExecutionState | null
  task: TaskDefinition | null
  isThinking: boolean
  isRunning: boolean
  streamingText: string
  events: ExecutionEvent[]
  projectRoot: string | null
  onSend: (text: string) => void
  onOpenFolder: () => void
  queuedMessages: QueuedMessage[]
  activeMode: ChatMode
  permissionMode: PermissionMode
  includeProjectContext: boolean
  sessionUsage: SessionUsage
  activeModel: string | null
  onModeChange: (mode: ChatMode) => void
  onPermissionModeChange: (mode: PermissionMode) => void
  onIncludeProjectContextChange: (enabled: boolean) => void
  onClearQueue: () => void
}

interface ComposerOption<T extends string> {
  value: T
  label: string
  detail: string
  accent: string
}

const CHAT_MODE_OPTIONS: ComposerOption<ChatMode>[] = [
  { value: 'patch', label: '/patch', detail: 'Edita código e valida', accent: 'var(--cyan)' },
  { value: 'chat', label: '/chat', detail: 'Responde sem alterar arquivos', accent: 'var(--cyan)' },
  { value: 'plan', label: '/plan', detail: 'Leitura e plano técnico', accent: 'var(--cyan)' },
  { value: 'review', label: '/review', detail: 'Análise read-only', accent: 'var(--cyan)' },
]

const PERMISSION_OPTIONS: ComposerOption<PermissionMode>[] = [
  { value: 'auto-review', label: 'Auto review', detail: 'Pausa em mudancas sensiveis', accent: 'var(--teal)' },
  { value: 'ask', label: 'Ask first', detail: 'Confirma antes de editar/rodar', accent: 'var(--yellow)' },
  { value: 'full-access', label: 'Full access', detail: 'Executa sem pedir confirmacao', accent: 'var(--red)' },
]

function Avatar(): React.ReactElement {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%', background: 'var(--amber)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0, marginTop: 2,
    }}>K</div>
  )
}

function UserBubble({ msg }: { msg: ChatMessage }): React.ReactElement {
  const atRefs = extractAtRefs(msg.content)
  const isPlan = /^\/plan(\s|$)/i.test(msg.content.trimStart())
  const displayText = msg.content.trim()

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        {(atRefs.length > 0 || isPlan) && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {isPlan && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-3)', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontWeight: 600, border: '1px solid var(--border)' }}>
                /plan
              </span>
            )}
            {atRefs.map(ref => (
              <span key={ref} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-3)', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border)' }}>
                @ {ref.split(/[/\\]/).pop()}
              </span>
            ))}
          </div>
        )}
        <div style={{
          padding: '12px 16px',
          background: 'var(--bg-3)', border: '1px solid var(--border)',
          borderRadius: '12px',
          color: 'var(--text-1)', fontSize: 13, lineHeight: 1.6,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {displayText}
        </div>
      </div>
    </div>
  )
}

// Visual result card for structured AgentResultMessage
function AgentResultCard({ msg }: { msg: AgentResultMessage }): React.ReactElement {
  const [expandedValidations, setExpandedValidations] = useState(false)
  const statusColor = msg.decision === 'apply' ? 'var(--teal)' : msg.decision === 'needs_review' ? 'var(--yellow)' : 'var(--red)'
  const statusIcon  = msg.decision === 'apply' ? '✓' : msg.decision === 'needs_review' ? '⏸' : '✗'
  const riskColor = msg.risk === 'low' ? 'var(--teal)' : msg.risk === 'medium' ? 'var(--yellow)' : 'var(--red)'

  const created  = msg.filesChanged.filter(f => f.status === 'created').length
  const modified = msg.filesChanged.filter(f => f.status === 'modified').length
  const deleted  = msg.filesChanged.filter(f => f.status === 'deleted').length
  const parts: string[] = []
  if (created)  parts.push(`+${created} criado${created  !== 1 ? 's' : ''}`)
  if (modified) parts.push(`~${modified} modificado${modified !== 1 ? 's' : ''}`)
  if (deleted)  parts.push(`−${deleted} deletado${deleted  !== 1 ? 's' : ''}`)

  const passedV = msg.validations.filter(v => v.status === 'passed')
  const failedV = msg.validations.filter(v => v.status === 'failed')

  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
      <Avatar />
      <div style={{ flex: 1, minWidth: 0, border: '1px solid var(--border)', borderRadius: '2px 12px 12px 12px', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
          <span style={{ color: statusColor, fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{statusIcon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-1)', fontSize: 13, fontWeight: 600 }}>{msg.title}</div>
            <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>{msg.summary}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
            {parts.map(p => (
              <span key={p} style={{ fontSize: 10, color: 'var(--text-2)', background: 'var(--bg-3)', padding: '1px 7px', borderRadius: 10, fontFamily: 'var(--font-mono)' }}>{p}</span>
            ))}
            <span style={{ fontSize: 10, color: riskColor, background: 'var(--bg-3)', padding: '1px 7px', borderRadius: 10, fontFamily: 'var(--font-mono)' }}>risco: {msg.risk}</span>
          </div>
        </div>

        {/* Validation pills */}
        {msg.validations.length > 0 && (
          <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-3)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Validações:</span>
            {(expandedValidations ? msg.validations : msg.validations.slice(0, 4)).map((v, i) => (
              <span key={i} style={{
                fontSize: 10, padding: '1px 7px', borderRadius: 10, fontFamily: 'var(--font-mono)',
                color: v.status === 'passed' ? 'var(--teal)' : v.status === 'failed' ? 'var(--red)' : 'var(--text-3)',
                background: v.status === 'passed' ? 'var(--teal-dim)' : v.status === 'failed' ? 'var(--red-dim)' : 'var(--bg-active)',
              }}>{v.command} {v.status === 'passed' ? '✓' : v.status === 'failed' ? '✗' : '—'}</span>
            ))}
            {msg.validations.length > 4 && (
              <button onClick={() => setExpandedValidations(e => !e)} style={{ fontSize: 10, color: 'var(--text-3)', background: 'transparent', padding: '1px 4px' }}>
                {expandedValidations ? 'menos' : `+${msg.validations.length - 4} mais`}
              </button>
            )}
          </div>
        )}

        {/* File list */}
        {msg.filesChanged.length > 0 && (
          <div style={{ padding: '8px 10px', background: 'var(--bg-2)' }}>
            {msg.filesChanged.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 6, marginBottom: 2 }}>
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 6, fontFamily: 'var(--font-mono)', fontWeight: 700, flexShrink: 0,
                  color: f.status === 'created' ? 'var(--teal)' : f.status === 'deleted' ? 'var(--red)' : 'var(--yellow)',
                  background: f.status === 'created' ? 'var(--teal-dim)' : f.status === 'deleted' ? 'var(--red-dim)' : 'var(--yellow-dim)',
                }}>{f.status === 'created' ? '+' : f.status === 'deleted' ? '−' : '~'}</span>
                <span style={{ color: 'var(--text-2)', fontSize: 12, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {msg.notes.length > 0 && (
          <div style={{ padding: '6px 14px', background: 'var(--bg-1)', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
            {msg.notes.join(' · ')}
          </div>
        )}
      </div>
    </div>
  )
}

function AssistantBubble({ msg }: { msg: ChatMessage }): React.ReactElement {
  if (msg.structured?.kind === 'agent_result') {
    return <AgentResultCard msg={msg.structured} />
  }
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }} className="animate-fade-in">
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--cyan-dim)', border: '1px solid var(--cyan-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)', flexShrink: 0, marginTop: 2 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>smart_toy</span>
      </div>
      <div style={{
        flex: 1, minWidth: 0, padding: '4px 0',
        color: 'var(--text-1)', fontSize: 13, lineHeight: 1.7,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {msg.content}
      </div>
    </div>
  )
}

import { ActivityFeed } from './ActivityFeed'

// Task result card — shown after completion when the model made file changes
function TaskResultCard({ executionState }: { executionState: ExecutionState }): React.ReactElement | null {
  const history = executionState.iterationHistory
  const last    = history.at(-1)
  if (!last || last.changes.length === 0) return null

  const { changes, harnessResult, decision } = last
  const score  = harnessResult.score
  const status = executionState.status
  const iters  = history.length

  const created  = changes.filter(c => c.type === 'create').length
  const modified = changes.filter(c => c.type === 'modify').length
  const deleted  = changes.filter(c => c.type === 'delete').length

  const parts: string[] = []
  if (created)  parts.push(`+${created} criado${created  !== 1 ? 's' : ''}`)
  if (modified) parts.push(`~${modified} modificado${modified !== 1 ? 's' : ''}`)
  if (deleted)  parts.push(`−${deleted} deletado${deleted  !== 1 ? 's' : ''}`)

  const statusColor = status === 'completed' ? 'var(--teal)'
    : status === 'paused' ? 'var(--yellow)'
    : 'var(--red)'
  const statusIcon  = status === 'completed' ? '✓' : status === 'paused' ? '⏸' : '✗'
  const statusLabel = status === 'completed' ? 'Aplicado'
    : status === 'paused' ? 'Aguardando revisão'
    : decision.reason || 'Falhou'

  const passedLayers = harnessResult.layers.filter(l => l.passed && !l.skipped)
  const failedLayers = harnessResult.layers.filter(l => !l.passed && !l.skipped)
  const scoreColor   = score >= 90 ? 'var(--teal)' : score >= 70 ? 'var(--yellow)' : 'var(--red)'

  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
      <Avatar />
      <div style={{ flex: 1, minWidth: 0, border: '1px solid var(--border)', borderRadius: '2px 12px 12px 12px', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid var(--border)', background: 'var(--bg-1)',
        }}>
          <span style={{ color: statusColor, fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{statusIcon}</span>
          <span style={{ color: 'var(--text-1)', fontSize: 13, fontWeight: 600 }}>{parts.join('  ')}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
            {/* Iteration count badge when model needed more than one attempt */}
            {iters > 1 && (
              <span style={{ fontSize: 10, color: 'var(--yellow)', background: 'var(--yellow-dim)', padding: '1px 6px', borderRadius: 10, fontFamily: 'var(--font-mono)' }}>
                {iters} tentativas
              </span>
            )}
            {passedLayers.map(l => (
              <span key={l.name} style={{ fontSize: 10, color: 'var(--teal)', background: 'var(--teal-dim)', padding: '1px 6px', borderRadius: 10, fontFamily: 'var(--font-mono)' }}>
                {l.name} ✓
              </span>
            ))}
            {failedLayers.map(l => (
              <span key={l.name} style={{ fontSize: 10, color: 'var(--red)', background: 'var(--red-dim)', padding: '1px 6px', borderRadius: 10, fontFamily: 'var(--font-mono)' }}>
                {l.name} ✗
              </span>
            ))}
            {harnessResult.layers.length > 0 && (
              <span style={{ fontSize: 11, color: scoreColor, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {score}
              </span>
            )}
          </div>
        </div>

        {/* Iteration history strip — shown only when there were multiple attempts */}
        {iters > 1 && (
          <div style={{
            padding: '6px 14px', borderBottom: '1px solid var(--border)',
            display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
            background: 'var(--bg-3)', fontFamily: 'var(--font-mono)', fontSize: 10,
          }}>
            {history.map((rec, i) => {
              const s = rec.harnessResult.score
              const c = s >= 90 ? 'var(--teal)' : s >= 70 ? 'var(--yellow)' : 'var(--red)'
              const isLast = i === history.length - 1
              return (
                <span key={i} style={{ color: isLast ? c : 'var(--text-3)' }}>
                  {i + 1}:{s}{i < history.length - 1 ? ' →' : ''}
                </span>
              )
            })}
          </div>
        )}

        {/* Status banner for non-completed states */}
        {status !== 'completed' && (
          <div style={{
            padding: '5px 14px', borderBottom: '1px solid var(--border)',
            fontSize: 11, color: statusColor,
            background: status === 'paused' ? 'rgba(229,192,123,0.04)' : 'rgba(226,75,74,0.04)',
          }}>
            {statusLabel}
          </div>
        )}

        {/* File cards */}
        <div style={{ padding: '8px 10px', background: 'var(--bg-2)' }}>
          {changes.map((change, i) => (
            <FileCard key={i} change={change} defaultOpen={changes.length === 1} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Extract @filename tokens from text, deduplicated
function extractAtRefs(text: string): string[] {
  const refs: string[] = []
  for (const match of text.matchAll(/@(?:"([^"]+)"|'([^']+)'|([^\s,;]+))/g)) {
    const ref = (match[1] ?? match[2] ?? match[3] ?? '').replace(/[)\].!?]+$/g, '').trim()
    if (ref && !refs.includes(ref)) refs.push(ref)
  }
  return refs
}

function ComposerMenu<T extends string>({
  label,
  value,
  options,
  onChange,
  align = 'left',
}: {
  label: string
  value: T
  options: ComposerOption<T>[]
  onChange: (value: T) => void
  align?: 'left' | 'right'
}): React.ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = options.find(o => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  return (
    <div ref={ref} className="kova-control-menu" data-align={align}>
      <button
        type="button"
        className="kova-control-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{ '--option-accent': active.accent } as React.CSSProperties}
      >
        <span className="kova-control-meta">{label}</span>
        <span className="kova-control-value">
          <span className="kova-option-dot" />
          {active.label}
        </span>
        <span className="kova-control-chevron">v</span>
      </button>

      {open && (
        <div className="kova-control-popover animate-fade-in" role="listbox">
          {options.map(option => {
            const selected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={`kova-control-option${selected ? ' active' : ''}`}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                style={{ '--option-accent': option.accent } as React.CSSProperties}
              >
                <span className="kova-option-dot" />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.detail}</small>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ChatArea({
  messages, executionState, isThinking, isRunning,
  streamingText, events, projectRoot, onSend, onOpenFolder,
  queuedMessages, activeMode, permissionMode, includeProjectContext,
  sessionUsage, activeModel, onModeChange, onPermissionModeChange,
  onIncludeProjectContextChange, onClearQueue,
}: Props): React.ReactElement {
  const [value, setValue] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, executionState?.status, isThinking, streamingText])

  const submit = useCallback(() => {
    const t = value.trim()
    if (!t || !projectRoot) return
    onSend(t)
    setValue('')
  }, [value, projectRoot, onSend])

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }, [submit])

  // Detect @refs typed in the input for inline preview
  const atRefs = extractAtRefs(value)
  const isPlan = /^\/plan(\s|$)/i.test(value.trim())

  const isEmpty = messages.length === 0 && !executionState && !isThinking && !streamingText && events.length === 0
  const totalTokens = sessionUsage.contextTokens + sessionUsage.completionTokens
  const contextPercent = sessionUsage.maxContextTokens
    ? Math.min(100, Math.round((sessionUsage.contextTokens / sessionUsage.maxContextTokens) * 100))
    : 0

  const lastIteration  = executionState?.iterationHistory?.at(-1)
  const hasTaskResult  = !!lastIteration && lastIteration.changes.length > 0
  const isActive       = !!executionState && !['completed', 'failed', 'paused'].includes(executionState.status)
  const showLive       = (isRunning || isThinking) && !hasTaskResult

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px 8px' }}>

        {/* Empty state */}
        {isEmpty && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--amber)', letterSpacing: '0.1em' }}>KOVA</div>
            <p style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', lineHeight: 2 }}>
              {projectRoot
                ? 'Pergunte, analise ou peça para criar, modificar ou corrigir código.'
                : 'Selecione um projeto para começar.'}
            </p>
            {!projectRoot && (
              <button onClick={onOpenFolder} style={{
                marginTop: 12, background: 'var(--amber-dim)', color: 'var(--amber)',
                border: '1px solid rgba(193,122,46,0.3)', padding: '8px 20px', borderRadius: 6, fontSize: 13,
              }}>
                + Abrir projeto
              </button>
            )}
          </div>
        )}

        {/* Chat history */}
        {messages.map(msg =>
          msg.role === 'user'
            ? <UserBubble key={msg.id} msg={msg} />
            : <AssistantBubble key={msg.id} msg={msg} />
        )}

        {/* Task result — completed/paused/failed with file changes */}
        {hasTaskResult && !showLive && (
          <TaskResultCard executionState={executionState!} />
        )}

        {/* Live execution area — streaming text + events */}
        {showLive && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <Avatar />
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Streaming text bubble */}
              {streamingText && (
                <div style={{
                  padding: '10px 14px', marginBottom: 6,
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: '2px 12px 12px 12px',
                  color: 'var(--text-1)', fontSize: 13, lineHeight: 1.7,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {streamingText}
                  <span style={{
                    display: 'inline-block', width: 2, height: '1em',
                    background: 'var(--amber)', marginLeft: 2,
                    animation: 'pulse-amber 0.8s infinite', verticalAlign: 'text-bottom',
                  }} />
                </div>
              )}

              {/* Operations feed */}
              {events.length > 0 && (
                <div style={{ paddingLeft: 2 }}>
                  <ActivityFeed events={events} />
                </div>
              )}

              {/* Harness/apply phase indicator */}
              {isActive && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', animation: 'pulse-amber 1.2s infinite', flexShrink: 0 }} />
                  <span style={{ color: 'var(--amber)', fontSize: 11 }}>
                    {executionState!.status === 'validating' ? 'Validando com harness...'
                     : executionState!.status === 'applying'   ? 'Aplicando mudanças...'
                     : 'Processando...'}
                  </span>
                </div>
              )}

              {/* Thinking dots — initial state, no text yet */}
              {!streamingText && events.length === 0 && !isActive && (
                <div style={{
                  display: 'inline-flex', gap: 6, alignItems: 'center',
                  color: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-mono)'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 2s linear infinite' }}>sync</span>
                  <span>Thinking...</span>
                  <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--cyan)', animation: `pulse-amber 1.2s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-1)', flexShrink: 0 }}>
        {queuedMessages.length > 0 && (
          <div style={{ marginBottom: 8, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--yellow)', fontSize: 11, fontWeight: 700 }}>{queuedMessages.length} na fila</span>
            <span style={{ color: 'var(--text-3)', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{queuedMessages[0]?.content}</span>
            <button onClick={onClearQueue} style={{ background: 'transparent', color: 'var(--text-3)', fontSize: 11, padding: '2px 6px' }}>limpar</button>
          </div>
        )}

        {/* Context chips — @refs and /plan indicator */}
        {(atRefs.length > 0 || isPlan) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {isPlan && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--amber-dim)', color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                /plan · multi-iteração com harness
              </span>
            )}
            {atRefs.map(ref => (
              <span key={ref} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--purple-dim)', color: 'var(--purple)', fontFamily: 'var(--font-mono)' }}>
                @ {ref}
              </span>
            ))}
          </div>
        )}

        <div className="kova-composer">
          <div className="kova-chat-toolbar">
            <button type="button" title="Adicionar arquivo ou imagem" className="kova-icon-button">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            </button>
            <ComposerMenu label="Modo" value={activeMode} options={CHAT_MODE_OPTIONS} onChange={onModeChange} />
            <ComposerMenu label="Acesso" value={permissionMode} options={PERMISSION_OPTIONS} onChange={onPermissionModeChange} />
            <label className={`kova-context-toggle${includeProjectContext ? ' active' : ''}`}>
              <input type="checkbox" checked={includeProjectContext} onChange={e => onIncludeProjectContextChange(e.target.checked)} />
              <span className="kova-context-switch" />
              <span>Contexto IDE</span>
            </label>
            <div className="kova-token-ring" title={`${sessionUsage.contextFiles.length} arquivos, ${(sessionUsage.contextTokens / 1000).toFixed(1)}k contexto, ${(totalTokens / 1000).toFixed(1)}k tokens, modelo ${activeModel ?? 'não definido'}`} style={{ borderTopColor: contextPercent > 80 ? 'var(--red)' : contextPercent > 50 ? 'var(--yellow)' : 'var(--teal)' }}>
              {contextPercent || 0}
            </div>
          </div>
          <div className="kova-composer-textrow">
          <textarea
            value={value} onChange={e => setValue(e.target.value)} onKeyDown={onKeyDown}
            disabled={!projectRoot}
            placeholder={
              !projectRoot ? 'Selecione um projeto...'
              : isRunning || isThinking ? 'Mensagem será adicionada à fila...'
              : 'Pergunte ou peça para criar algo. Use @arquivo.ts para incluir contexto.'
            }
            rows={1}
            style={{
              flex: 1, resize: 'none', background: 'transparent', border: 'none', padding: 0,
              color: 'var(--text-1)', lineHeight: 1.6, minHeight: 22, maxHeight: 120,
              overflow: 'auto', fontSize: 13, outline: 'none',
            }}
          />
          <button
            onClick={submit}
            disabled={!value.trim() || !projectRoot}
            className="kova-send-button"
            style={{
              background: value.trim() && projectRoot ? 'var(--cyan)' : 'var(--bg-active)',
              color:      value.trim() && projectRoot ? '#000' : 'var(--text-3)',
              borderRadius: '8px',
              transition: 'background 0.15s, color 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
          </button>
        </div>
        </div>
        <p style={{ marginTop: 6, fontSize: 10, color: 'var(--text-ghost)', textAlign: 'center' }}>
          Enter para enviar · Shift+Enter nova linha · @arquivo.ts inclui contexto · mensagens durante execução entram na fila
        </p>
      </div>
    </div>
  )
}
