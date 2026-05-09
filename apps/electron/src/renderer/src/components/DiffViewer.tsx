import React, { useState } from 'react'
import type { FileChange } from '../types'

interface Props {
  changes: FileChange[]
  onClose: () => void
}

function computeLines(before: string, after: string): Array<{ type: 'add' | 'remove' | 'same'; text: string }> {
  const oldLines = before.split('\n')
  const newLines = after.split('\n')
  const result: Array<{ type: 'add' | 'remove' | 'same'; text: string }> = []

  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)

  let oi = 0
  let ni = 0

  while (oi < oldLines.length || ni < newLines.length) {
    const ol = oldLines[oi]
    const nl = newLines[ni]

    if (oi >= oldLines.length) {
      result.push({ type: 'add', text: nl })
      ni++
    } else if (ni >= newLines.length) {
      result.push({ type: 'remove', text: ol })
      oi++
    } else if (ol === nl) {
      result.push({ type: 'same', text: ol })
      oi++; ni++
    } else if (!newSet.has(ol)) {
      result.push({ type: 'remove', text: ol })
      oi++
    } else if (!oldSet.has(nl)) {
      result.push({ type: 'add', text: nl })
      ni++
    } else {
      result.push({ type: 'remove', text: ol })
      result.push({ type: 'add', text: nl })
      oi++; ni++
    }
  }

  return result
}

function FileDiff({ change }: { change: FileChange }): React.ReactElement {
  const before = change.before ?? ''
  const after = change.type === 'delete' ? '' : (change.diff ?? '')
  const lines = change.type === 'create'
    ? after.split('\n').map(text => ({ type: 'add' as const, text }))
    : change.type === 'delete'
    ? before.split('\n').map(text => ({ type: 'remove' as const, text }))
    : computeLines(before, after)

  const additions = lines.filter(l => l.type === 'add').length
  const removals = lines.filter(l => l.type === 'remove').length

  return (
    <div>
      <div style={{ padding: '8px 14px', background: 'var(--bg-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>{change.path}</span>
        <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
          <span style={{ color: 'var(--teal)' }}>+{additions}</span>
          <span style={{ color: 'var(--red)' }}>-{removals}</span>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6 }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            padding: '0 14px',
            background: line.type === 'add' ? 'rgba(93,202,165,0.06)' : line.type === 'remove' ? 'rgba(226,75,74,0.06)' : 'transparent',
            color: line.type === 'add' ? 'var(--teal)' : line.type === 'remove' ? 'var(--red)' : 'var(--text-2)',
            whiteSpace: 'pre',
          }}>
            <span style={{ userSelect: 'none', color: 'var(--text-ghost)', marginRight: 10 }}>
              {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
            </span>
            {line.text}
          </div>
        ))}
      </div>
    </div>
  )
}

export function DiffViewer({ changes, onClose }: Props): React.ReactElement {
  const [activeFile, setActiveFile] = useState(0)

  return (
    <div style={{
      height: 320,
      background: 'var(--bg-2)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-3)',
        alignItems: 'center',
        overflow: 'auto',
      }}>
        {changes.map((c, i) => (
          <button
            key={i}
            onClick={() => setActiveFile(i)}
            style={{
              padding: '8px 14px', background: 'transparent',
              color: i === activeFile ? 'var(--text-1)' : 'var(--text-3)',
              borderBottom: i === activeFile ? '2px solid var(--amber)' : '2px solid transparent',
              fontSize: 12, fontFamily: 'var(--font-mono)', borderRadius: 0,
            }}
          >
            {c.path.split('/').at(-1)}
          </button>
        ))}
        <button onClick={onClose} style={{ marginLeft: 'auto', padding: '8px 14px', background: 'transparent', color: 'var(--text-3)', fontSize: 14 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {changes[activeFile] && <FileDiff change={changes[activeFile]} />}
      </div>
    </div>
  )
}
