import React, { useState } from 'react'
import type { FileChange } from '../types'
import { EXT_LANG, getExt, getFileName, getFolder } from '../file-utils'

const TYPE_META = {
  create: { label: 'created', sign: '+', color: 'var(--teal)', bg: 'var(--teal-dim)' },
  modify: { label: 'modified', sign: '~', color: 'var(--yellow)', bg: 'var(--yellow-dim)' },
  delete: { label: 'deleted', sign: '-', color: 'var(--red)', bg: 'var(--red-dim)' },
}

type DiffLineType = 'add' | 'remove' | 'same'
interface DiffLine { text: string; type: DiffLineType }

const LINE_BG: Record<DiffLineType, string> = {
  add: 'rgba(93,202,165,0.07)',
  remove: 'rgba(226,75,74,0.07)',
  same: 'transparent',
}
const LINE_MARKER_COLOR: Record<DiffLineType, string> = {
  add: 'rgba(93,202,165,0.72)',
  remove: 'rgba(226,75,74,0.72)',
  same: 'transparent',
}

function buildDiffLines(change: FileChange): DiffLine[] {
  if (change.type === 'delete') {
    return (change.before ?? '').split('\n').map(text => ({ text, type: 'remove' as const }))
  }
  if (change.type === 'create' || !change.before) {
    return (change.diff ?? '').split('\n').map(text => ({ text, type: 'add' as const }))
  }
  const a = change.before.split('\n')
  const b = (change.diff ?? '').split('\n')
  if (a.length * b.length > 200_000) return b.map(text => ({ text, type: 'add' as const }))

  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const result: DiffLine[] = []
  let i = a.length
  let j = b.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ text: a[i - 1], type: 'same' }); i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ text: b[j - 1], type: 'add' }); j--
    } else {
      result.unshift({ text: a[i - 1], type: 'remove' }); i--
    }
  }
  return result
}

interface Props {
  change: FileChange
  defaultOpen?: boolean
}

export function FileCard({ change, defaultOpen = false }: Props): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen)
  const ext = getExt(change.path)
  const name = getFileName(change.path)
  const folder = getFolder(change.path)
  const meta = TYPE_META[change.type]
  const lines = buildDiffLines(change)
  const language = EXT_LANG[ext] ?? ext

  return (
    <div className="animate-fade-in" style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      marginBottom: 6,
      overflow: 'hidden',
      background: 'rgba(255,255,255,0.018)',
    }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: '100%',
        textAlign: 'left',
        padding: '9px 12px',
        background: open ? 'rgba(255,255,255,0.035)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderRadius: 0,
        transition: 'background 0.15s',
      }}>
        <span style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          flexShrink: 0,
          background: meta.bg,
          border: `1px solid ${meta.color}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 800,
          color: meta.color,
          fontFamily: 'var(--font-mono)',
        }}>
          {meta.sign}
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-1)',
              fontFamily: 'var(--font-mono)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {name}
            </span>
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 999, color: meta.color, background: meta.bg, flexShrink: 0 }}>
              {meta.label}
            </span>
          </span>
          {folder && <span style={{ display: 'block', fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{folder}/</span>}
        </span>

        <span style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{language}</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{lines.length} lines</span>
          <span style={{
            fontSize: 12,
            color: 'var(--text-3)',
            transition: 'transform 0.2s ease',
            display: 'inline-block',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          }}>
            &gt;
          </span>
        </span>
      </button>

      {open && lines.length > 0 && (
        <div style={{ maxHeight: 320, overflow: 'auto', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.18)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.65 }}>
            {lines.map((line, i) => (
              <div
                key={i}
                style={{ display: 'flex', background: LINE_BG[line.type] }}
                onMouseEnter={event => { event.currentTarget.style.background = line.type === 'same' ? 'var(--bg-hover)' : LINE_BG[line.type] }}
                onMouseLeave={event => { event.currentTarget.style.background = LINE_BG[line.type] }}
              >
                <span style={{ minWidth: 40, padding: '0 10px 0 8px', color: 'var(--text-ghost)', userSelect: 'none', textAlign: 'right', flexShrink: 0, borderRight: '1px solid var(--border)' }}>
                  {line.type !== 'remove' ? i + 1 : ''}
                </span>
                <span style={{ color: LINE_MARKER_COLOR[line.type], width: 14, flexShrink: 0, userSelect: 'none', textAlign: 'center' }}>
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ''}
                </span>
                <span style={{ padding: '0 8px', color: 'var(--text-2)', whiteSpace: 'pre', flex: 1 }}>{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
