import React, { useState } from 'react'
import type { FileChange } from '../types'
import { EXT_LANG, EXT_COLOR, fileIconInfo, getExt, getFileName, getFolder } from '../file-utils'

const TYPE_BADGE = {
  create: { label: 'New', color: 'var(--teal)', bg: 'var(--teal-dim)' },
  modify: { label: 'Modified', color: 'var(--yellow)', bg: 'var(--yellow-dim)' },
  delete: { label: 'Deleted', color: 'var(--red)', bg: 'var(--red-dim)' },
}

type DiffLineType = 'add' | 'remove' | 'same'
interface DiffLine { text: string; type: DiffLineType }

const LINE_BG: Record<DiffLineType, string> = {
  add: 'rgba(93,202,165,0.07)', remove: 'rgba(226,75,74,0.07)', same: 'transparent',
}
const LINE_MARKER_COLOR: Record<DiffLineType, string> = {
  add: 'rgba(93,202,165,0.6)', remove: 'rgba(226,75,74,0.7)', same: 'transparent',
}

function buildDiffLines(change: FileChange): DiffLine[] {
  if (change.type === 'delete') {
    return (change.before ?? '').split('\n').map(t => ({ text: t, type: 'remove' as const }))
  }
  if (change.type === 'create' || !change.before) {
    return (change.diff ?? '').split('\n').map(t => ({ text: t, type: 'add' as const }))
  }
  const a = change.before.split('\n'), b = (change.diff ?? '').split('\n')
  if (a.length * b.length > 200_000) return b.map(t => ({ text: t, type: 'add' as const }))
  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1))
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1])
  const result: DiffLine[] = []
  let i = a.length, j = b.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) { result.unshift({ text: a[i-1], type: 'same' }); i--; j-- }
    else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { result.unshift({ text: b[j-1], type: 'add' }); j-- }
    else { result.unshift({ text: a[i-1], type: 'remove' }); i-- }
  }
  return result
}

interface Props {
  change: FileChange
  defaultOpen?: boolean
}

export function FileCard({ change, defaultOpen = false }: Props): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen)
  const e = getExt(change.path)
  const name = getFileName(change.path)
  const folder = getFolder(change.path)
  const { label: iconLabel, color } = fileIconInfo(name)
  const badge = TYPE_BADGE[change.type]
  const lines = buildDiffLines(change)

  return (
    <div className="animate-fade-in" style={{
      border: '1px solid var(--border)', borderLeft: `3px solid ${color}`,
      borderRadius: '0 6px 6px 0', marginBottom: 6, overflow: 'hidden', background: 'var(--bg-1)',
    }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: '100%', textAlign: 'left', padding: '8px 12px',
        background: open ? 'var(--bg-active)' : 'var(--bg-2)',
        display: 'flex', alignItems: 'center', gap: 10,
        borderRadius: 0, transition: 'background 0.15s',
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 4, flexShrink: 0,
          background: `${color}22`, border: `1px solid ${color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 800, color, fontFamily: 'var(--font-mono)',
        }}>
          {iconLabel}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </span>
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, color: badge.color, background: badge.bg, flexShrink: 0 }}>
              {badge.label}
            </span>
          </div>
          {folder && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{folder}/</div>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{EXT_LANG[e] ?? e}</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{lines.length} linhas</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)', transition: 'transform 0.2s ease', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▾
          </span>
        </div>
      </button>

      {open && lines.length > 0 && (
        <div style={{ maxHeight: 320, overflow: 'auto', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.65 }}>
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'flex', background: LINE_BG[line.type] }}
                onMouseEnter={e => { e.currentTarget.style.background = line.type === 'same' ? 'var(--bg-hover)' : LINE_BG[line.type] }}
                onMouseLeave={e => { e.currentTarget.style.background = LINE_BG[line.type] }}
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
