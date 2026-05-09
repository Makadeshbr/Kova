import React, { useState } from 'react'
import type { FileChange } from '../types'
import { EXT_LANG, EXT_COLOR, fileIconInfo, getExt, getFileName, getFolder } from '../file-utils'

interface Props {
  changes: FileChange[]
  onClose: () => void
}

type DiffLineType = 'add' | 'remove' | 'same'
interface DiffLine { text: string; type: DiffLineType }

const TYPE_META = {
  create: { label: 'Novo', color: 'var(--teal)', bg: 'var(--teal-dim)' },
  modify: { label: 'Modificado', color: 'var(--yellow)', bg: 'var(--yellow-dim)' },
  delete: { label: 'Deletado', color: 'var(--red)', bg: 'var(--red-dim)' },
}

const LINE_BG: Record<DiffLineType, string> = {
  add: 'rgba(93,202,165,0.08)', remove: 'rgba(226,75,74,0.08)', same: 'transparent',
}
const LINE_MARKER_COLOR: Record<DiffLineType, string> = {
  add: 'rgba(93,202,165,0.65)', remove: 'rgba(226,75,74,0.75)', same: 'transparent',
}
const LINE_MARKER: Record<DiffLineType, string> = { add: '+', remove: '-', same: ' ' }

function diffLines(before: string[], after: string[]): DiffLine[] {
  if (before.length * after.length > 300_000) {
    return after.map(text => ({ text, type: 'add' as const }))
  }
  const m = before.length, n = after.length
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = before[i - 1] === after[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const result: DiffLine[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && before[i - 1] === after[j - 1]) {
      result.unshift({ text: before[i - 1], type: 'same' }); i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ text: after[j - 1], type: 'add' }); j--
    } else {
      result.unshift({ text: before[i - 1], type: 'remove' }); i--
    }
  }
  return result
}

function buildDiffLines(change: FileChange): DiffLine[] {
  if (change.type === 'delete') {
    return (change.before ?? '').split('\n').map(text => ({ text, type: 'remove' as const }))
  }
  if (change.type === 'create' || !change.before) {
    return (change.diff ?? '').split('\n').map(text => ({ text, type: 'add' as const }))
  }
  return diffLines(change.before.split('\n'), (change.diff ?? '').split('\n'))
}

function FileIcon({ name }: { name: string }): React.ReactElement {
  const { label, color } = fileIconInfo(name)
  return (
    <div style={{
      width: 26, height: 26, borderRadius: 4, flexShrink: 0,
      background: `${color}22`, border: `1px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 8, fontWeight: 700, color, letterSpacing: '-0.02em',
    }}>
      {label}
    </div>
  )
}

function FileEntry({ change, isSelected, onClick }: { change: FileChange; isSelected: boolean; onClick: () => void }): React.ReactElement {
  const name = getFileName(change.path)
  const folder = getFolder(change.path)
  const e = getExt(change.path)
  const meta = TYPE_META[change.type]
  const lines = (change.diff ?? change.before ?? '').split('\n').length

  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', padding: '8px 12px',
      background: isSelected ? 'var(--bg-active)' : 'transparent',
      borderLeft: isSelected ? '2px solid var(--amber)' : '2px solid transparent',
      borderRadius: 0, display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: '1px solid var(--border)',
    }}>
      <FileIcon name={name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--amber)' : 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          <span style={{ fontSize: 10, color: meta.color, background: meta.bg, padding: '1px 6px', borderRadius: 10, flexShrink: 0 }}>
            {meta.label}
          </span>
        </div>
        {folder && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder}/</div>}
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
          {EXT_LANG[e] ?? e.toUpperCase()} · {lines} linha{lines !== 1 ? 's' : ''}
        </div>
      </div>
    </button>
  )
}

function CodeView({ change }: { change: FileChange }): React.ReactElement {
  const name = getFileName(change.path)
  const e = getExt(change.path)
  const diffed = buildDiffLines(change)
  const hasRealDiff = change.type === 'modify' && change.before !== undefined

  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-1)' }}>
      <div style={{ padding: '10px 14px', background: 'var(--bg-3)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0 }}>
        <FileIcon name={name} />
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>{change.path}</span>
          <span style={{ marginLeft: 10, fontSize: 10, color: 'var(--text-3)' }}>
            {EXT_LANG[e] ?? e}
            {hasRealDiff && ` · diff`}
            {!hasRealDiff && ` · ${diffed.length} linhas`}
          </span>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.65 }}>
        {diffed.map((line, i) => (
          <div key={i} style={{ display: 'flex', background: LINE_BG[line.type] }}>
            <span style={{ minWidth: 44, padding: '0 10px 0 8px', color: 'var(--text-ghost)', userSelect: 'none', textAlign: 'right', flexShrink: 0 }}>
              {line.type !== 'remove' ? i + 1 : ''}
            </span>
            <span style={{ color: LINE_MARKER_COLOR[line.type], width: 14, flexShrink: 0, userSelect: 'none', textAlign: 'center' }}>
              {LINE_MARKER[line.type]}
            </span>
            <span style={{ color: 'var(--text-2)', whiteSpace: 'pre', flex: 1, padding: '0 8px' }}>{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FilesViewer({ changes, onClose }: Props): React.ReactElement {
  const [selected, setSelected] = useState(0)
  const active = changes[selected]

  return (
    <div style={{ height: 360, display: 'flex', flexDirection: 'column', background: 'var(--bg-2)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-3)', gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Arquivos gerados</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-active)', padding: '1px 8px', borderRadius: 10 }}>{changes.length}</span>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'transparent', color: 'var(--text-3)', padding: '2px 8px', fontSize: 14 }}>✕</button>
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 220, borderRight: '1px solid var(--border)', overflow: 'auto', flexShrink: 0 }}>
          {changes.map((c, i) => (
            <FileEntry key={i} change={c} isSelected={i === selected} onClick={() => setSelected(i)} />
          ))}
        </div>
        {active ? <CodeView change={active} /> : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 12 }}>
            Selecione um arquivo
          </div>
        )}
      </div>
    </div>
  )
}
