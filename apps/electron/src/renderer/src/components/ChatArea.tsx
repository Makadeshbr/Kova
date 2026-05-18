import React, { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ChangeEvent, type DragEvent, type ClipboardEvent } from 'react'
import type { ExecutionEvent, ExecutionState, TaskDefinition } from '../types'
import type { ChatMessage, ChatMode, QueuedMessage, ReasoningState, SessionUsage } from '../App'
import type { AgentResultMessage, Attachment, Todo } from '@kova/shared'
import { FileCard } from './FileCard'
import { ActivityFeed } from './ActivityFeed'
import { TodoListCard } from './TodoListCard'
import { getValidationConfidenceCopy } from '../lib/validation-confidence-copy'
import { contextualStatusLabel } from '../lib/status-context'
import { shouldRenderFloatingResultCard } from '../lib/chat-ordering'
import kovaLogo from '../assets/Logo_Kova.png'

// Per-attachment cap (10 MB) and per-message cap (50 MB total). Enforced
// renderer-side AND main-side so a malicious renderer can't bypass the limit.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_ATTACHMENT_BYTES = 50 * 1024 * 1024

function classifyAttachment(mimeType: string): Attachment['kind'] {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'text'
  return 'document'
}

async function fileToAttachment(file: File): Promise<Attachment> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
  }
  const base64 = btoa(binary)
  return {
    kind: classifyAttachment(file.type || 'application/octet-stream'),
    name: file.name || 'unnamed',
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    base64,
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  messages: ChatMessage[]
  executionState: ExecutionState | null
  task: TaskDefinition | null
  isThinking: boolean
  isRunning: boolean
  streamingText: string
  reasoning: ReasoningState
  events: ExecutionEvent[]
  projectRoot: string | null
  onSend: (text: string, modeOverride?: ChatMode, attachments?: Attachment[]) => void
  /** Vision capability of the active model — gates image attachment + shows hint. */
  supportsVision?: boolean
  onOpenFolder: () => void
  queuedMessages: QueuedMessage[]
  activeMode: ChatMode
  sessionUsage: SessionUsage
  activeModel: string | null
  /** FIX-018: multi-step todo list emitted by todo_write. [] hides the card. */
  todos: Todo[]
  onModeChange: (mode: ChatMode) => void
  onClearQueue: () => void
}

// ─── Attachment chip ──────────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentChip({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }): React.ReactElement {
  const isImage = attachment.kind === 'image'
  const dataUrl = isImage ? `data:${attachment.mimeType};base64,${attachment.base64}` : null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 10px 6px 6px',
      background: 'var(--bg-3)', border: '1px solid var(--border)',
      borderRadius: 8, fontSize: 11, color: 'var(--text-2)',
      maxWidth: 240,
    }}>
      {dataUrl ? (
        <img src={dataUrl} alt={attachment.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
      ) : (
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--text-3)' }}>
          {attachment.kind === 'text' ? 'description' : 'attach_file'}
        </span>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
          {attachment.name}
        </div>
        <div style={{ color: 'var(--text-3)', fontSize: 10 }}>{formatBytes(attachment.sizeBytes)}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        title="Remove attachment"
        style={{
          width: 18, height: 18, borderRadius: 4,
          background: 'transparent', border: 'none', color: 'var(--text-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, cursor: 'pointer',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
      </button>
    </div>
  )
}

// ─── Slash command palette ────────────────────────────────────────────────────

const SLASH_COMMANDS = [
  { cmd: '/plan',   label: 'Plan',   detail: 'Analyze and create a technical plan — no file changes' },
  { cmd: '/review', label: 'Review', detail: 'Read-only code review with detailed findings' },
]

function SlashPalette({ query, onSelect }: { query: string; onSelect: (cmd: string) => void }): React.ReactElement | null {
  const matches = SLASH_COMMANDS.filter(c => c.cmd.startsWith(query.toLowerCase()))
  if (!matches.length) return null

  return (
    <div style={{
      position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden', minWidth: 280,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 50,
    }}>
      {matches.map(m => (
        <button
          key={m.cmd}
          type="button"
          onClick={() => onSelect(m.cmd)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', background: 'transparent', textAlign: 'left',
            borderBottom: '1px solid var(--border)',
          }}
          className="kova-slash-option"
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan)', fontWeight: 700, minWidth: 60 }}>
            {m.cmd}
          </span>
          <div>
            <div style={{ color: 'var(--text-1)', fontSize: 13, fontWeight: 600 }}>{m.label}</div>
            <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 1 }}>{m.detail}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Message bubbles ──────────────────────────────────────────────────────────

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(() => { /* ignore */ })
}

function renderInline(text: string): React.ReactNode[] {
  // Handle **bold**, *italic*, and `inline code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} style={{ color: 'var(--text-1)', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*') && p.endsWith('*'))
      return <em key={i} style={{ color: 'var(--text-2)' }}>{p.slice(1, -1)}</em>
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 4, color: 'var(--cyan)' }}>{p.slice(1, -1)}</code>
    return <React.Fragment key={i}>{p}</React.Fragment>
  })
}

function renderTextBlock(text: string, key: number): React.ReactNode {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []

  const flushList = () => {
    if (listItems.length === 0) return
    nodes.push(<ul key={`list-${nodes.length}`} style={{ margin: '6px 0 6px 18px', padding: 0 }}>{listItems}</ul>)
    listItems = []
  }

  lines.forEach((line, li) => {
    // Headings
    const h3 = line.match(/^###\s+(.+)/)
    const h2 = line.match(/^##\s+(.+)/)
    const h1 = line.match(/^#\s+(.+)/)
    if (h3) { flushList(); nodes.push(<div key={li} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginTop: 14, marginBottom: 4 }}>{renderInline(h3[1])}</div>); return }
    if (h2) { flushList(); nodes.push(<div key={li} style={{ fontSize: 14, fontWeight: 700, color: 'var(--cyan)', marginTop: 16, marginBottom: 5, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>{renderInline(h2[1])}</div>); return }
    if (h1) { flushList(); nodes.push(<div key={li} style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal)', marginTop: 18, marginBottom: 6 }}>{renderInline(h1[1])}</div>); return }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) { flushList(); nodes.push(<hr key={li} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />); return }

    // Bullet list items
    const bullet = line.match(/^[-*]\s+(.+)/)
    if (bullet) { listItems.push(<li key={li} style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.65, marginBottom: 2 }}>{renderInline(bullet[1])}</li>); return }

    // Table rows — render as styled divs
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushList()
      const isHeader = line.includes('---')
      if (!isHeader) {
        const cells = line.split('|').filter((_, ci) => ci > 0 && ci < line.split('|').length - 1)
        nodes.push(
          <div key={li} style={{ display: 'flex', gap: 1, margin: '1px 0' }}>
            {cells.map((cell, ci) => (
              <div key={ci} style={{ flex: 1, padding: '3px 8px', background: 'var(--bg-3)', fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {renderInline(cell.trim())}
              </div>
            ))}
          </div>
        )
      }
      return
    }

    flushList()
    if (line === '') { nodes.push(<br key={li} />); return }
    nodes.push(<div key={li} style={{ lineHeight: 1.7 }}>{renderInline(line)}</div>)
  })

  flushList()
  return <React.Fragment key={key}>{nodes}</React.Fragment>
}

function renderMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const match = part.match(/```(\w*)\n?([\s\S]*?)```/)
      const lang = match?.[1] ?? ''
      const code = match?.[2] ?? part.slice(3, -3)
      return (
        <div key={i} style={{
          background: 'var(--bg-0)', border: '1px solid var(--border)',
          borderRadius: 8, overflow: 'hidden', margin: '10px 0',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '5px 12px', background: 'var(--bg-2)', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{lang || 'code'}</span>
            <button
              onClick={() => copyToClipboard(code)}
              title="Copiar"
              style={{ background: 'transparent', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>content_copy</span>
            </button>
          </div>
          <pre style={{ margin: 0, padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-1)', overflowX: 'auto', lineHeight: 1.6 }}>
            <code>{code}</code>
          </pre>
        </div>
      )
    }
    return renderTextBlock(part, i)
  })
}

function UserBubble({ msg }: { msg: ChatMessage }): React.ReactElement {
  const atRefs = (msg.content.match(/@(?:"([^"]+)"|'([^']+)'|([^\s,;]+))/g) ?? [])
    .map(m => m.replace(/^@/, '').replace(/[)\].!?]+$/, '').trim())
    .filter(Boolean)

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
        {atRefs.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {atRefs.map(ref => (
              <span key={ref} style={{
                fontSize: 10, padding: '1px 7px', borderRadius: 6,
                background: 'var(--bg-3)', color: 'var(--text-3)',
                fontFamily: 'var(--font-mono)', border: '1px solid var(--border)',
              }}>
                @{ref.split(/[/\\]/).pop()}
              </span>
            ))}
          </div>
        )}
        <div style={{
          padding: '10px 14px',
          background: 'var(--bg-3)', border: '1px solid var(--border)',
          borderRadius: '12px 2px 12px 12px',
          color: 'var(--text-1)', fontSize: 13.5, lineHeight: 1.65,
          wordBreak: 'break-word',
        }}>
          {msg.content.trim()}
        </div>
      </div>
    </div>
  )
}

function AgentResultCard({ msg }: { msg: AgentResultMessage }): React.ReactElement {
  const [expandV, setExpandV] = useState(false)
  const ok = msg.decision === 'apply'
  const statusColor = ok ? 'var(--teal)' : msg.decision === 'needs_review' ? 'var(--yellow)' : 'var(--red)'
  const statusIcon  = ok ? '✓' : msg.decision === 'needs_review' ? '⏸' : '✗'

  const created  = msg.filesChanged.filter(f => f.status === 'created').length
  const modified = msg.filesChanged.filter(f => f.status === 'modified').length
  const deleted  = msg.filesChanged.filter(f => f.status === 'deleted').length
  const parts: string[] = []
  if (created)  parts.push(`+${created}`)
  if (modified) parts.push(`~${modified}`)
  if (deleted)  parts.push(`−${deleted}`)

  return (
    <div className="animate-fade-in" style={{ marginBottom: 16 }}>
      <div style={{ border: '1px solid var(--border)', borderRadius: '2px 12px 12px 12px', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
          <span style={{ color: statusColor, fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{statusIcon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-1)', fontSize: 13, fontWeight: 600 }}>{msg.title}</div>
            <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 1 }}>{msg.summary}</div>
          </div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
            {parts.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', background: 'var(--bg-3)', padding: '1px 7px', borderRadius: 8 }}>{parts.join(' ')}</span>
            )}
            <span style={{ fontSize: 10, color: msg.risk === 'low' ? 'var(--teal)' : msg.risk === 'medium' ? 'var(--yellow)' : 'var(--red)', background: 'var(--bg-3)', padding: '1px 7px', borderRadius: 8, fontFamily: 'var(--font-mono)' }}>
              {msg.risk}
            </span>
          </div>
        </div>

        {msg.validations.length > 0 && (
          <div style={{ padding: '5px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-3)', display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>checks:</span>
            {(expandV ? msg.validations : msg.validations.slice(0, 5)).map((v, i) => (
              <span key={i} style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 8, fontFamily: 'var(--font-mono)',
                color: v.status === 'passed' ? 'var(--teal)' : v.status === 'failed' ? 'var(--red)' : 'var(--text-3)',
                background: v.status === 'passed' ? 'var(--teal-dim)' : v.status === 'failed' ? 'var(--red-dim)' : 'var(--bg-active)',
              }}>{v.command} {v.status === 'passed' ? '✓' : v.status === 'failed' ? '✗' : '—'}</span>
            ))}
            {msg.validations.length > 5 && (
              <button onClick={() => setExpandV(e => !e)} style={{ fontSize: 10, color: 'var(--text-3)', background: 'transparent' }}>
                {expandV ? 'less' : `+${msg.validations.length - 5}`}
              </button>
            )}
          </div>
        )}

        {msg.filesChanged.length > 0 && (
          <div style={{ padding: '6px 10px', background: 'var(--bg-2)' }}>
            {msg.filesChanged.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 5px' }}>
                <span style={{
                  fontSize: 9, padding: '1px 5px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontWeight: 700, flexShrink: 0,
                  color: f.status === 'created' ? 'var(--teal)' : f.status === 'deleted' ? 'var(--red)' : 'var(--yellow)',
                  background: f.status === 'created' ? 'var(--teal-dim)' : f.status === 'deleted' ? 'var(--red-dim)' : 'var(--yellow-dim)',
                }}>{f.status === 'created' ? '+' : f.status === 'deleted' ? '−' : '~'}</span>
                <span style={{ color: 'var(--text-2)', fontSize: 12, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path}</span>
              </div>
            ))}
          </div>
        )}

        {msg.notes.length > 0 && (
          <div style={{ padding: '5px 12px', background: 'var(--bg-1)', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
            {msg.notes.join(' · ')}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Plan card helpers ────────────────────────────────────────────────────────

function fileExtensionBadge(path: string): { label: string; color: string } {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, { label: string; color: string }> = {
    ts: { label: 'TS', color: '#3178C6' }, tsx: { label: 'TSX', color: '#3178C6' },
    js: { label: 'JS', color: '#F7DF1E' }, jsx: { label: 'JSX', color: '#F7DF1E' },
    py: { label: 'PY', color: '#3776AB' }, go: { label: 'GO', color: '#00ADD8' },
    rs: { label: 'RS', color: '#DEA584' }, java: { label: 'JV', color: '#B07219' },
    rb: { label: 'RB', color: '#CC342D' }, php: { label: 'PHP', color: '#777BB4' },
    cs: { label: 'C#', color: '#178600' }, cpp: { label: 'C++', color: '#F34B7D' },
    c: { label: 'C', color: '#555555' }, swift: { label: 'SW', color: '#FFAC45' },
    kt: { label: 'KT', color: '#A97BFF' }, dart: { label: 'DART', color: '#00B4AB' },
    html: { label: 'HTML', color: '#E34C26' }, css: { label: 'CSS', color: '#563D7C' },
    scss: { label: 'SCSS', color: '#C6538C' }, json: { label: 'JSON', color: '#999999' },
    md: { label: 'MD', color: '#888888' }, yml: { label: 'YML', color: '#CB171E' },
    yaml: { label: 'YML', color: '#CB171E' }, sql: { label: 'SQL', color: '#E38C00' },
  }
  return map[ext] ?? { label: ext.slice(0, 4).toUpperCase() || 'FILE', color: 'var(--text-3)' }
}

/** Splits "1. step one 2. step two 3. step three" into ["step one", "step two", "step three"]. */
function parseApproachSteps(approach: string): string[] {
  const trimmed = approach.trim().replace(/\r\n/g, '\n')
  const numbered = trimmed
    .replace(/\s+(\d+[.)]\s+)/g, '\n$1')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(line => /^\d+[.)]\s+/.test(line))
  if (numbered.length >= 2) {
    return numbered.map(s => s.replace(/^\d+[.)]\s+/, '').trim()).filter(Boolean)
  }
  const bullets = trimmed.split(/\n+/).filter(line => /^\s*[-*]\s+/.test(line))
  if (bullets.length >= 2) {
    return bullets.map(s => s.replace(/^\s*[-*]\s+/, '').trim()).filter(Boolean)
  }
  return trimmed ? [trimmed] : []
}

function PlanResultCard({ msg }: { msg: import('@kova/shared').PlanResultMessage }): React.ReactElement {
  const riskColor = msg.risk === 'low' ? 'var(--teal)' : msg.risk === 'medium' ? 'var(--yellow)' : 'var(--red)'
  const riskBg = msg.risk === 'low' ? 'var(--teal-dim)' : msg.risk === 'medium' ? 'var(--yellow-dim)' : 'var(--red-dim)'
  const steps = parseApproachSteps(msg.approach)
  const hasContent = msg.files.length > 0 || steps.length > 0 || msg.validations.length > 0

  return (
    <div className="animate-fade-in" style={{ marginBottom: 18 }}>
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--bg-1)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.02), 0 8px 24px rgba(0,0,0,0.25)',
      }}>
        {/* HEADER */}
        <div style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(180deg, rgba(164,230,255,0.04) 0%, transparent 100%)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--cyan-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--cyan)', fontSize: 14, fontWeight: 700, flexShrink: 0,
          }}>P</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              color: 'var(--text-3)', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
            }}>Implementation Plan</div>
            <div style={{
              color: 'var(--text-1)', fontSize: 14, fontWeight: 500,
              lineHeight: 1.45, wordBreak: 'break-word',
            }}>{msg.objective}</div>
          </div>
          <span style={{
            fontSize: 10, color: riskColor, background: riskBg,
            padding: '4px 10px', borderRadius: 8, fontFamily: 'var(--font-mono)',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
            flexShrink: 0, alignSelf: 'flex-start', marginTop: 2,
          }}>{msg.risk} risk</span>
        </div>

        {/* FILES */}
        {msg.files.length > 0 && (
          <div style={{ padding: '14px 18px', borderBottom: hasContent ? '1px solid var(--border)' : undefined }}>
            <div style={{
              color: 'var(--text-3)', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>Files</span>
              <span style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 8,
                background: 'var(--bg-active)', color: 'var(--text-3)',
                fontFamily: 'var(--font-mono)', textTransform: 'none',
              }}>{msg.files.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {msg.files.map((f, i) => {
                const badge = fileExtensionBadge(f.path)
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 6px',
                      borderRadius: 4, background: 'var(--bg-3)',
                      color: badge.color, fontFamily: 'var(--font-mono)',
                      flexShrink: 0, minWidth: 32, textAlign: 'center',
                      letterSpacing: '0.02em',
                    }}>{badge.label}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: 'var(--text-1)', fontSize: 12.5,
                        fontFamily: 'var(--font-mono)', fontWeight: 500,
                        wordBreak: 'break-all',
                      }}>{f.path}</div>
                      {f.reason && (
                        <div style={{
                          color: 'var(--text-3)', fontSize: 11.5, marginTop: 2,
                          lineHeight: 1.45,
                        }}>{f.reason}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* APPROACH */}
        {steps.length > 0 && (
          <div style={{ padding: '14px 18px', borderBottom: msg.validations.length > 0 ? '1px solid var(--border)' : undefined }}>
            <div style={{
              color: 'var(--text-3)', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
            }}>Approach</div>
            {steps.length > 1 ? (
              <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {steps.map((step, i) => (
                  <li key={i} style={{
                    display: 'flex', gap: 12, padding: '6px 0',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--cyan)',
                      background: 'var(--cyan-dim)', minWidth: 22, height: 22,
                      borderRadius: '50%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-mono)',
                    }}>{i + 1}</span>
                    <span style={{
                      color: 'var(--text-2)', fontSize: 12.5, lineHeight: 1.6,
                      paddingTop: 2,
                    }}>{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div style={{
                color: 'var(--text-2)', fontSize: 12.5, lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
              }}>{steps[0]}</div>
            )}
          </div>
        )}

        {/* VALIDATIONS */}
        {msg.validations.length > 0 && (
          <div style={{ padding: '12px 18px', background: 'var(--bg-2)' }}>
            <div style={{
              color: 'var(--text-3)', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
            }}>Validation</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {msg.validations.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--text-ghost)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>$</span>
                  <code style={{
                    fontSize: 11.5, color: 'var(--text-1)',
                    fontFamily: 'var(--font-mono)', wordBreak: 'break-all',
                  }}>{v}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty-plan hint: model failed to produce structured content. */}
        {!hasContent && (
          <div style={{ padding: '14px 18px', color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>
            The model did not produce a structured plan. Try rephrasing the request or switch to a stronger model.
          </div>
        )}
      </div>
    </div>
  )
}

function AssistantBubble({ msg }: { msg: ChatMessage }): React.ReactElement {
  if (msg.structured?.kind === 'agent_result') return <AgentResultCard msg={msg.structured} />
  if (msg.structured?.kind === 'plan_result') return <PlanResultCard msg={msg.structured} />
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 20 }} className="animate-fade-in">
      <div style={{ flex: 1, minWidth: 0, color: 'var(--text-1)', fontSize: 13.5, lineHeight: 1.7, wordBreak: 'break-word' }}>
        {renderMarkdown(msg.content)}
      </div>
    </div>
  )
}

// ─── Reasoning panel ──────────────────────────────────────────────────────────

function ReasoningPanel({ reasoning }: { reasoning: ReasoningState }): React.ReactElement {
  const [expanded, setExpanded] = useState(false)
  const now = useTicker(reasoning.active)
  const elapsed = reasoning.startedAt
    ? formatDuration((reasoning.active ? now : reasoning.endedAt ?? now) - reasoning.startedAt)
    : '0s'

  return (
    <div className="kova-reasoning-panel" data-active={reasoning.active}>
      <button type="button" className="kova-reasoning-header" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>
        <span className="kova-reasoning-orb"><span /></span>
        <span className="kova-reasoning-title">{reasoning.active ? 'Thinking...' : 'Thinking done'}</span>
        <span className="kova-reasoning-time">{elapsed}</span>
        <span className="kova-reasoning-dots" aria-hidden="true"><i /><i /><i /></span>
      </button>
      {expanded && reasoning.text.trim() && (
        <pre className="kova-reasoning-body">{reasoning.text}</pre>
      )}
    </div>
  )
}

function useTicker(active: boolean): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) { setNow(Date.now()); return }
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`
}

// ─── Task result card ─────────────────────────────────────────────────────────

function TaskResultCard({ executionState }: { executionState: ExecutionState }): React.ReactElement | null {
  const last = executionState.iterationHistory.at(-1)
  if (!last || last.changes.length === 0) return null

  const { changes, harnessResult, decision } = last
  const score  = decision.score ?? harnessResult.score
  const status = executionState.status
  const iters  = executionState.iterationHistory.length

  const created  = changes.filter(c => c.type === 'create').length
  const modified = changes.filter(c => c.type === 'modify').length
  const deleted  = changes.filter(c => c.type === 'delete').length
  const parts = [
    created  > 0 && `+${created} created`,
    modified > 0 && `~${modified} modified`,
    deleted  > 0 && `-${deleted} deleted`,
  ].filter(Boolean) as string[]

  const statusColor = status === 'completed' ? 'var(--teal)' : status === 'paused' ? 'var(--yellow)' : 'var(--red)'
  const statusLabel = status === 'completed' ? 'Applied'
    : status === 'paused' ? 'Awaiting review'
    : decision.reason || 'Repair needed'

  const passedLayers = harnessResult.layers.filter(l =>  l.passed && !l.skipped)
  const failedLayers = harnessResult.layers.filter(l => !l.passed && !l.skipped)
  const scoreColor   = score >= 90 ? 'var(--teal)' : score >= 70 ? 'var(--yellow)' : 'var(--red)'
  const validationCopy = getValidationConfidenceCopy(harnessResult.validationConfidence)
  const statusTitle = status === 'completed' ? 'Changes ready' : status === 'paused' ? 'Review required' : 'Repair needed'
  const statusMark = status === 'completed' ? 'OK' : status === 'paused' ? '!' : 'x'
  const summaryText = parts.length > 0 ? parts.join(' / ') : 'No file changes'
  const repairHint = status === 'failed' && failedLayers.length > 0
    ? `Kova is using ${failedLayers.map(layer => layer.name).join(', ')} output as repair context.`
    : null

  return (
    <div className="animate-fade-in" style={{ marginBottom: 16 }}>
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-1)' }}>
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
          <span style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            display: 'grid',
            placeItems: 'center',
            background: status === 'completed' ? 'var(--teal-dim)' : status === 'paused' ? 'var(--yellow-dim)' : 'var(--red-dim)',
            color: statusColor,
            fontSize: 11,
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            flexShrink: 0,
          }}>
            {statusMark}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-1)', fontSize: 13.5, fontWeight: 700 }}>{statusTitle}</span>
              <span style={{ color: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{summaryText}</span>
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: 11.5, lineHeight: 1.45, marginTop: 2 }}>
              {statusLabel}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
            {iters > 1 && (
              <span style={{ fontSize: 10, color: 'var(--yellow)', background: 'var(--yellow-dim)', padding: '1px 6px', borderRadius: 8, fontFamily: 'var(--font-mono)' }}>
                iter {iters}
              </span>
            )}
            {passedLayers.map(l => (
              <span key={l.name} style={{ fontSize: 10, color: 'var(--teal)', background: 'var(--teal-dim)', padding: '1px 6px', borderRadius: 8, fontFamily: 'var(--font-mono)' }}>
                {l.name} ok
              </span>
            ))}
            {failedLayers.map(l => (
              <span key={l.name} style={{ fontSize: 10, color: 'var(--red)', background: 'var(--red-dim)', padding: '1px 6px', borderRadius: 8, fontFamily: 'var(--font-mono)' }}>
                {l.name} failed
              </span>
            ))}
            {harnessResult.layers.length > 0 && (
              <span style={{ fontSize: 11, color: scoreColor, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{score}</span>
            )}
          </div>
        </div>

        {iters > 1 && (
          <div style={{ padding: '5px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 5, background: 'var(--bg-3)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            {executionState.iterationHistory.map((rec, i) => {
              const s = rec.harnessResult.score
              const c = s >= 90 ? 'var(--teal)' : s >= 70 ? 'var(--yellow)' : 'var(--red)'
              return <span key={i} style={{ color: i === iters - 1 ? c : 'var(--text-3)' }}>{i + 1}:{s}{i < iters - 1 ? ' ->' : ''}</span>
            })}
          </div>
        )}

        {status !== 'completed' && (
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: 11.5, color: statusColor, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: status === 'failed' ? 'rgba(226,75,74,0.045)' : 'transparent' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: statusColor, flexShrink: 0 }} />
            <span>{status === 'failed' ? 'Repair context' : statusLabel}</span>
            {repairHint && <span style={{ color: 'var(--text-3)' }}>{repairHint}</span>}
          </div>
        )}

        {validationCopy.show && (
          <div style={{
            padding: '8px 14px',
            borderBottom: '1px solid var(--border)',
            background: validationCopy.tone === 'warning' ? 'var(--yellow-dim)' : 'var(--cyan-dim)',
            color: validationCopy.tone === 'warning' ? 'var(--yellow)' : 'var(--cyan)',
            fontSize: 11,
            lineHeight: 1.5,
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 11, lineHeight: 1.2, flexShrink: 0, marginTop: 1, fontWeight: 800 }}>i</span>
            <span>{validationCopy.text}</span>
          </div>
        )}

        <div style={{ padding: '8px 10px', background: 'var(--bg-2)' }}>
          {changes.map((change, i) => (
            <FileCard key={i} change={change} defaultOpen={changes.length === 1} />
          ))}
        </div>
      </div>
    </div>
  )
}

function extractAtRefs(text: string): string[] {
  const refs: string[] = []
  for (const m of text.matchAll(/@(?:"([^"]+)"|'([^']+)'|([^\s,;]+))/g)) {
    const ref = (m[1] ?? m[2] ?? m[3] ?? '').replace(/[)\].!?]+$/, '').trim()
    if (ref && !refs.includes(ref)) refs.push(ref)
  }
  return refs
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChatArea({
  messages, executionState, isThinking, isRunning,
  streamingText, reasoning, events, projectRoot, onSend, onOpenFolder,
  queuedMessages, activeMode, sessionUsage, activeModel, todos, onModeChange, onClearQueue,
  supportsVision,
}: Props): React.ReactElement {
  const [value, setValue]           = useState('')
  const [showSlash, setShowSlash]   = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    const currentTotal = attachments.reduce((sum, a) => sum + a.sizeBytes, 0)
    let runningTotal = currentTotal
    const added: Attachment[] = []
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setAttachmentError(`${file.name}: max 10 MB per file`)
        continue
      }
      if (runningTotal + file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
        setAttachmentError(`Total exceeds 50 MB — drop some attachments`)
        break
      }
      const isImage = (file.type || '').startsWith('image/')
      if (isImage && supportsVision === false) {
        setAttachmentError(`${activeModel ?? 'Active model'} does not support images. Switch to a vision model.`)
        continue
      }
      runningTotal += file.size
      added.push(await fileToAttachment(file))
    }
    if (added.length > 0) {
      setAttachments(prev => [...prev, ...added])
      setAttachmentError(null)
    }
  }, [attachments, supportsVision, activeModel])

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
    setAttachmentError(null)
  }, [])

  const onPickFiles = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    addFiles(Array.from(e.target.files))
    e.target.value = ''
  }, [addFiles])

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (!e.dataTransfer?.files?.length) return
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!isDragging) setIsDragging(true)
  }, [isDragging])

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    // Only clear when leaving the composer entirely — dragLeave fires on every child.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    setIsDragging(false)
  }, [])

  const onPaste = useCallback((e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      addFiles(files)
    }
  }, [addFiles])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, executionState?.status, isThinking, streamingText, reasoning.active])

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, Math.round(window.innerHeight * 0.3))}px`
  }, [value])

  // Slash command detection
  useEffect(() => {
    const trimmed = value.trimStart()
    setShowSlash(trimmed.startsWith('/') && !trimmed.includes(' '))
  }, [value])

  const submit = useCallback(() => {
    const t = value.trim()
    // Allow sending with attachments but no text (e.g. "what's in this screenshot?")
    if ((!t && attachments.length === 0) || !projectRoot) return
    // The slash command parsing happens canonically inside handleSend (parseUserInput).
    // We still update the pinned-mode pill visually so subsequent messages without a
    // slash prefix continue in the same mode. This setState is for UI state only —
    // the dispatch decision is owned by handleSend.
    if (/^\/plan(\s|$)/i.test(t)) onModeChange('plan')
    else if (/^\/review(\s|$)/i.test(t)) onModeChange('review')
    onSend(t, undefined, attachments.length > 0 ? attachments : undefined)
    setValue('')
    setAttachments([])
    setAttachmentError(null)
  }, [value, attachments, projectRoot, onSend, onModeChange])

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
    if (e.key === 'Escape') setShowSlash(false)
  }, [submit])

  const selectSlashCommand = (cmd: string) => {
    const modeKey = cmd.slice(1) as ChatMode
    onModeChange(modeKey)
    setValue('')
    setShowSlash(false)
    textareaRef.current?.focus()
  }

  const atRefs    = extractAtRefs(value)
  const isEmpty   = messages.length === 0 && !executionState && !isThinking && !streamingText && events.length === 0
  const lastIter  = executionState?.iterationHistory?.at(-1)
  const hasResult = !!lastIter && lastIter.changes.length > 0
  const isActive  = !!executionState && !['completed', 'failed', 'paused'].includes(executionState.status)
  const showLive  = (isRunning || isThinking || reasoning.active) && !hasResult
  const hasStructuredTaskResult = messages.some(msg => msg.structured?.kind === 'agent_result')
  const showTodoCard = todos.length > 0 && (isActive || isRunning || isThinking || reasoning.active)
  const showResultCard = shouldRenderFloatingResultCard({
    hasResult,
    showLive,
    hasStructuredTaskResult,
    lastMessageRole: messages.at(-1)?.role,
  })

  const totalTokens = sessionUsage.contextTokens + sessionUsage.completionTokens
  const contextPct  = sessionUsage.maxContextTokens
    ? Math.min(100, Math.round((sessionUsage.contextTokens / sessionUsage.maxContextTokens) * 100))
    : 0

  const isNonDefaultMode = activeMode === 'plan' || activeMode === 'review'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ─── Messages ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px 12px', scrollbarWidth: 'thin' }}>

        {isEmpty && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{
              width: 82,
              height: 82,
              borderRadius: 18,
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(180deg, rgba(116, 211, 255, 0.10), rgba(9, 11, 13, 0.12))',
              border: '1px solid rgba(116, 211, 255, 0.16)',
              boxShadow: '0 18px 54px rgba(0, 0, 0, 0.34)',
            }}>
              <img
                src={kovaLogo}
                alt=""
                aria-hidden="true"
                style={{
                  width: 62,
                  height: 62,
                  objectFit: 'contain',
                  filter: 'invert(1) brightness(0.88) drop-shadow(0 0 18px rgba(116, 211, 255, 0.22))',
                  opacity: 0.92,
                }}
              />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--cyan)', letterSpacing: '0.12em' }}>KOVA</div>
            <p style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', lineHeight: 1.8, maxWidth: 340 }}>
              {projectRoot
                ? 'Ask, analyze, or request to create and fix code.'
                : 'Open a project to get started.'}
            </p>
            {!projectRoot && (
              <button onClick={onOpenFolder} style={{
                marginTop: 8, background: 'var(--amber-dim)', color: 'var(--amber)',
                border: '1px solid rgba(193,122,46,0.25)', padding: '8px 22px',
                borderRadius: 8, fontSize: 13,
              }}>
                Open project
              </button>
            )}
            {projectRoot && (
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {[
                  { label: '/plan — plan before coding', mode: 'plan' as ChatMode },
                  { label: '/review — read-only review', mode: 'review' as ChatMode },
                ].map(item => (
                  <button key={item.mode} onClick={() => onModeChange(item.mode)} style={{
                    fontSize: 11, padding: '5px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg-2)',
                    color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
                  }}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FIX-018: multi-step plan card. Hidden when no active agent run owns it. */}
        {showTodoCard && <TodoListCard todos={todos} />}

        {messages.map(msg =>
          msg.role === 'user'
            ? <UserBubble key={msg.id} msg={msg} />
            : <AssistantBubble key={msg.id} msg={msg} />
        )}

        {showResultCard && <TaskResultCard executionState={executionState!} />}

        {showLive && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {(reasoning.active || reasoning.text) && <ReasoningPanel reasoning={reasoning} />}
              {streamingText && (
                <div style={{
                  padding: '10px 14px', marginBottom: 6,
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: '2px 12px 12px 12px',
                  color: 'var(--text-1)', fontSize: 13.5, lineHeight: 1.7,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {streamingText}
                  <span style={{
                    display: 'inline-block', width: 2, height: '1.1em',
                    background: 'var(--amber)', marginLeft: 2,
                    animation: 'pulse-amber 0.8s infinite', verticalAlign: 'text-bottom',
                  }} />
                </div>
              )}
              {events.length > 0 && <ActivityFeed events={events} />}
              {isActive && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="kova-shimmer-text" style={{ fontSize: 12, fontWeight: 500 }}>
                    {contextualStatusLabel(executionState!.status, events)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ─── Composer ─────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 16px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-1)', flexShrink: 0 }}>

        {/* Queue banner */}
        {queuedMessages.length > 0 && (
          <div style={{ marginBottom: 8, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--yellow)', fontSize: 11, fontWeight: 700 }}>{queuedMessages.length} queued</span>
            <span style={{ color: 'var(--text-3)', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{queuedMessages[0]?.content}</span>
            <button onClick={onClearQueue} style={{ background: 'transparent', color: 'var(--text-3)', fontSize: 11, padding: '1px 6px' }}>clear</button>
          </div>
        )}

        {/* Active mode badge */}
        {isNonDefaultMode && (
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 11, padding: '2px 10px', borderRadius: 20,
              background: 'var(--cyan-dim)', color: 'var(--cyan)',
              fontFamily: 'var(--font-mono)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              /{activeMode}
              <button onClick={() => onModeChange('patch')} style={{ background: 'transparent', color: 'var(--cyan)', opacity: 0.7, padding: 0, fontSize: 12, lineHeight: 1, marginLeft: 2 }} title="Exit mode">✕</button>
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
              {activeMode === 'plan' ? 'Plan mode — no file changes' : 'Review mode — no file changes'}
            </span>
          </div>
        )}

        {/* @ref chips */}
        {atRefs.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {atRefs.map(ref => (
              <span key={ref} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 6, background: 'var(--bg-3)', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border)' }}>
                @ {ref.split(/[/\\]/).pop()}
              </span>
            ))}
          </div>
        )}

        {/* Main composer box */}
        <div style={{ position: 'relative' }}>
          {showSlash && (
            <SlashPalette query={value.trimStart()} onSelect={selectSlashCommand} />
          )}

          {/* Hidden file input — driven by the + button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,text/*,application/pdf,application/json"
            onChange={onPickFiles}
            style={{ display: 'none' }}
          />

          <div
            style={{
              border: `1px solid ${isDragging ? 'var(--cyan)' : 'var(--border)'}`,
              borderRadius: 12,
              background: isDragging ? 'var(--cyan-dim)' : 'var(--bg-2)',
              overflow: 'hidden',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            {/* Attachment thumbnails strip */}
            {attachments.length > 0 && (
              <div style={{
                display: 'flex', gap: 8, padding: '10px 12px 0', flexWrap: 'wrap',
                borderBottom: '1px solid var(--border)',
                paddingBottom: 10,
              }}>
                {attachments.map((att, idx) => (
                  <AttachmentChip key={`${att.name}-${idx}`} attachment={att} onRemove={() => removeAttachment(idx)} />
                ))}
              </div>
            )}

            {attachmentError && (
              <div style={{
                padding: '6px 14px',
                fontSize: 11,
                color: 'var(--red)',
                background: 'var(--red-dim)',
                borderBottom: '1px solid var(--border)',
              }}>
                {attachmentError}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              disabled={!projectRoot}
              placeholder={
                !projectRoot ? 'Open a project to get started...'
                : isRunning || isThinking ? 'Message will be queued...'
                : isDragging ? 'Drop files here...'
                : 'Ask, analyze, or request code changes. Use @file or /plan, /review'
              }
              rows={1}
              style={{
                width: '100%', resize: 'none', background: 'transparent',
                border: 'none', padding: '12px 14px 6px', outline: 'none',
                color: 'var(--text-1)', fontSize: 13.5, lineHeight: 1.6,
                fontFamily: 'inherit', minHeight: 44,
              }}
            />

            {/* Bottom toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px 8px', gap: 6 }}>
              {/* Attach button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!projectRoot}
                title={supportsVision === false ? 'Active model does not support images — text/PDF only' : 'Attach files or images (drag-drop or paste also works)'}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, cursor: projectRoot ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { if (projectRoot) { e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.color = 'var(--cyan)' } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              </button>

              {/* Mode pills */}
              {(['plan', 'review'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onModeChange(activeMode === mode ? 'patch' : mode)}
                  style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500,
                    border: `1px solid ${activeMode === mode ? 'rgba(93,202,165,0.4)' : 'var(--border)'}`,
                    background: activeMode === mode ? 'var(--cyan-dim)' : 'transparent',
                    color: activeMode === mode ? 'var(--cyan)' : 'var(--text-3)',
                    transition: 'all 0.15s',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  /{mode}
                </button>
              ))}

              {/* Token indicator */}
              {totalTokens > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 4, fontFamily: 'var(--font-mono)' }}>
                  {totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens} tk
                  {contextPct > 60 && <span style={{ color: contextPct > 80 ? 'var(--red)' : 'var(--yellow)', marginLeft: 4 }}>· {contextPct}%</span>}
                </span>
              )}
              {activeModel && (
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                  {activeModel.split('/').pop()}
                </span>
              )}

              <div style={{ flex: 1 }} />

              {/* Send button — enabled when there's text OR at least one attachment */}
              <button
                onClick={submit}
                disabled={(!value.trim() && attachments.length === 0) || !projectRoot}
                style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: (value.trim() || attachments.length > 0) && projectRoot ? 'var(--cyan)' : 'var(--bg-active)',
                  color: (value.trim() || attachments.length > 0) && projectRoot ? '#000' : 'var(--text-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s, color 0.15s',
                  border: 'none',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>send</span>
              </button>
            </div>
          </div>
        </div>

        <p style={{ marginTop: 5, fontSize: 10, color: 'var(--text-ghost)', textAlign: 'center' }}>
          Enter · Shift+Enter new line · @file includes context
        </p>
      </div>
    </div>
  )
}
