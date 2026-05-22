import React, { useEffect, useMemo, useState } from 'react'
import type { DiffReviewSelection, FileChange } from '../types'
import { EXT_LANG, fileIconInfo, getExt, getFileName, getFolder } from '../file-utils'

interface Props {
  changes: FileChange[]
  onClose: () => void
  onApplySelection?: (selection: DiffReviewSelection) => void
  canApplyActions?: boolean
  embedded?: boolean
}

type DiffLineType = 'add' | 'remove' | 'same'

interface DiffLine {
  text: string
  type: DiffLineType
  hunkId?: string
}

interface ChangeStats {
  additions: number
  deletions: number
  total: number
}

interface FilePreview {
  lines: DiffLine[]
  stats: ChangeStats
  approvedHunkIds: string[]
}

const TYPE_META = {
  create: { short: 'A', color: 'var(--teal)' },
  modify: { short: 'M', color: 'var(--yellow)' },
  delete: { short: 'D', color: 'var(--red)' },
}

const LINE_BG: Record<DiffLineType, string> = {
  add: 'rgba(93,202,165,0.08)',
  remove: 'rgba(226,75,74,0.08)',
  same: 'transparent',
}

const LINE_MARKER_COLOR: Record<DiffLineType, string> = {
  add: 'rgba(93,202,165,0.65)',
  remove: 'rgba(226,75,74,0.75)',
  same: 'transparent',
}

const LINE_MARKER: Record<DiffLineType, string> = { add: '+', remove: '-', same: ' ' }

function diffLines(before: string[], after: string[]): DiffLine[] {
  if (before.length * after.length > 300_000) {
    return after.map(text => ({ text, type: 'add' }))
  }

  const m = before.length
  const n = after.length
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = before[i - 1] === after[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const result: DiffLine[] = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && before[i - 1] === after[j - 1]) {
      result.unshift({ text: before[i - 1], type: 'same' })
      i -= 1
      j -= 1
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ text: after[j - 1], type: 'add' })
      j -= 1
    } else {
      result.unshift({ text: before[i - 1], type: 'remove' })
      i -= 1
    }
  }

  return result
}

function buildDiffLines(change: FileChange): DiffLine[] {
  if (change.type === 'delete') {
    return (change.before ?? '').split('\n').map((text, index) => ({
      text,
      type: 'remove',
      hunkId: `${change.path}:remove:${index + 1}`,
    }))
  }

  if (change.type === 'create' || !change.before) {
    return (change.diff ?? '').split('\n').map((text, index) => ({
      text,
      type: 'add',
      hunkId: `${change.path}:add:${index + 1}`,
    }))
  }

  let changeIndex = 0
  return diffLines(change.before.split('\n'), (change.diff ?? '').split('\n')).map(line => {
    if (line.type === 'same') return line
    changeIndex += 1
    return { ...line, hunkId: `${change.path}:${line.type}:${changeIndex}` }
  })
}

function statsForLines(lines: DiffLine[]): ChangeStats {
  const additions = lines.filter(line => line.type === 'add').length
  const deletions = lines.filter(line => line.type === 'remove').length
  return { additions, deletions, total: lines.length }
}

function buildFilePreview(change: FileChange): FilePreview {
  const lines = buildDiffLines(change)
  return {
    lines,
    stats: statsForLines(lines),
    approvedHunkIds: lines.flatMap(line => line.hunkId ? [line.hunkId] : []),
  }
}

function reviewStats(changes: FileChange[], previewByPath: Map<string, FilePreview>): { files: number; additions: number; deletions: number } {
  return changes.reduce((acc, change) => {
    const stats = previewByPath.get(change.path)?.stats ?? { additions: 0, deletions: 0, total: 0 }
    return {
      files: acc.files + 1,
      additions: acc.additions + stats.additions,
      deletions: acc.deletions + stats.deletions,
    }
  }, { files: 0, additions: 0, deletions: 0 })
}

function FileIcon({ name }: { name: string }): React.ReactElement {
  const { label, color } = fileIconInfo(name)
  return (
    <div className="kova-file-icon" style={{ background: `${color}22`, borderColor: `${color}44`, color }}>
      {label}
    </div>
  )
}

function FileEntry({
  change,
  decision,
  isSelected,
  onClick,
  preview,
}: {
  change: FileChange
  decision: 'approve' | 'reject'
  isSelected: boolean
  onClick: () => void
  preview: FilePreview
}): React.ReactElement {
  const name = getFileName(change.path)
  const folder = getFolder(change.path)
  const ext = getExt(change.path)
  const stats = preview.stats
  const meta = TYPE_META[change.type]

  return (
    <button
      className="kova-review-file-entry"
      data-decision={decision}
      data-kind={change.type}
      data-selected={isSelected ? 'true' : 'false'}
      onClick={onClick}
    >
      <FileIcon name={name} />
      <div className="kova-review-file-entry-main">
        <div className="kova-review-file-entry-title">
          <span>{name}</span>
          <small style={{ color: meta.color }}>{meta.short}</small>
        </div>
        {folder && <div className="kova-review-file-folder">{folder}/</div>}
        <div className="kova-review-file-meta">
          {EXT_LANG[ext] ?? ext.toUpperCase()}
          <span className="kova-review-file-delta">
            {stats.additions > 0 && <b className="add">+{stats.additions}</b>}
            {stats.deletions > 0 && <b className="remove">-{stats.deletions}</b>}
          </span>
        </div>
      </div>
      {decision === 'reject' && <span className="kova-review-file-state">Excluded</span>}
    </button>
  )
}

function CodeView({
  change,
  preview,
}: {
  change: FileChange
  preview: FilePreview
}): React.ReactElement {
  const name = getFileName(change.path)
  const ext = getExt(change.path)
  const diffed = preview.lines
  const hasRealDiff = change.type === 'modify' && change.before !== undefined
  const stats = preview.stats

  return (
    <div className="kova-review-code">
      <div className="kova-review-code-header">
        <FileIcon name={name} />
        <div>
          <strong>{change.path}</strong>
          <span>
            {EXT_LANG[ext] ?? ext}
            {hasRealDiff ? ' - diff' : ` - ${stats.total} lines`}
          </span>
        </div>
        <div className="kova-review-code-stats">
          {stats.additions > 0 && <span className="add">+{stats.additions}</span>}
          {stats.deletions > 0 && <span className="remove">-{stats.deletions}</span>}
        </div>
      </div>
      <div className="kova-review-code-lines">
        {diffed.map((line, index) => (
          <div className="kova-review-code-line" data-type={line.type} key={`${line.type}:${index}`} style={{ background: LINE_BG[line.type] }}>
            <span className="kova-review-line-number">
              {line.type !== 'remove' ? index + 1 : ''}
            </span>
            <span className="kova-review-line-marker" style={{ color: LINE_MARKER_COLOR[line.type] }}>
              {LINE_MARKER[line.type]}
            </span>
            <span className="kova-review-line-text">{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FilesViewer({ changes, onClose, onApplySelection, canApplyActions = false, embedded = false }: Props): React.ReactElement {
  const [query, setQuery] = useState('')
  const [selectedPath, setSelectedPath] = useState(() => changes[0]?.path ?? '')
  const [fileDecisions, setFileDecisions] = useState<Record<string, 'approve' | 'reject'>>(() =>
    Object.fromEntries(changes.map(change => [change.path, 'approve'])),
  )

  useEffect(() => {
    setFileDecisions(prev => {
      const next = Object.fromEntries(changes.map(change => [change.path, prev[change.path] ?? 'approve']))
      return next
    })
    setSelectedPath(prev => changes.some(change => change.path === prev) ? prev : changes[0]?.path ?? '')
  }, [changes])

  const filteredChanges = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return changes
    return changes.filter(change => change.path.toLowerCase().includes(q))
  }, [changes, query])

  const previewByPath = useMemo(() => {
    return new Map(changes.map(change => [change.path, buildFilePreview(change)]))
  }, [changes])

  const active = filteredChanges.find(change => change.path === selectedPath) ?? filteredChanges[0] ?? changes[0]
  const activeDecision = active ? fileDecisions[active.path] ?? 'approve' : 'approve'
  const activePreview = active ? previewByPath.get(active.path) : undefined
  const totals = useMemo(() => reviewStats(changes, previewByPath), [changes, previewByPath])
  const includedCount = changes.filter(change => (fileDecisions[change.path] ?? 'approve') === 'approve').length
  const selection: DiffReviewSelection = {
    files: changes.map(change => ({
      path: change.path,
      decision: fileDecisions[change.path] ?? 'approve',
      approvedHunkIds: (fileDecisions[change.path] ?? 'approve') === 'reject'
        ? []
        : previewByPath.get(change.path)?.approvedHunkIds ?? [],
    })),
  }

  function setDecision(path: string, decision: 'approve' | 'reject'): void {
    setFileDecisions(prev => ({ ...prev, [path]: decision }))
  }

  return (
    <div
      className={embedded ? 'kova-files-viewer embedded' : 'kova-files-viewer'}
      style={{ height: embedded ? '100%' : 360, borderTop: embedded ? 0 : '1px solid var(--border)' }}
    >
      <div className="kova-review-toolbar">
        <div className="kova-review-title">
          <span>Review</span>
          <strong>{totals.files} files</strong>
          <b className="add">+{totals.additions}</b>
          {totals.deletions > 0 && <b className="remove">-{totals.deletions}</b>}
        </div>
        <label className="kova-review-search">
          <span className="material-symbols-outlined">search</span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Find file"
          />
        </label>
        {active && canApplyActions && (
          <div className="kova-review-actions">
            <button
              aria-pressed={activeDecision === 'approve'}
              onClick={() => setDecision(active.path, 'approve')}
            >
              Include file
            </button>
            <button
              aria-pressed={activeDecision === 'reject'}
              onClick={() => setDecision(active.path, 'reject')}
            >
              Exclude file
            </button>
            {onApplySelection && (
              <button className="primary" onClick={() => onApplySelection(selection)}>
                Apply {includedCount}
              </button>
            )}
          </div>
        )}
        {active && !canApplyActions && (
          <p className="kova-review-readonly">Live preview. Apply unlocks when Kova pauses for review.</p>
        )}
        <button className="kova-review-close" onClick={onClose} title="Close review">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="kova-review-layout">
        <div className="kova-review-file-list">
          {filteredChanges.length === 0 && (
            <div className="kova-review-empty-list">No files match this search.</div>
          )}
          {filteredChanges.map(change => (
            <FileEntry
              change={change}
              decision={fileDecisions[change.path] ?? 'approve'}
              isSelected={change.path === active?.path}
              key={change.path}
              onClick={() => setSelectedPath(change.path)}
              preview={previewByPath.get(change.path) ?? buildFilePreview(change)}
            />
          ))}
        </div>
        {active && activePreview ? (
          <CodeView change={active} preview={activePreview} />
        ) : (
          <div className="kova-review-empty">Select a file</div>
        )}
      </div>
    </div>
  )
}
