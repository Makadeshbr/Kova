import React, { useState, useEffect, useCallback } from 'react'
import { fileIconInfo } from '../file-utils'

interface FileNode { name: string; path: string; isDir: boolean; protected?: boolean; children?: FileNode[] }
interface Props {
  projectRoot: string
  changedPaths: Set<string>
  onOpenFile: (path: string) => void
  refreshKey: number
}

function hasChangedDescendant(node: FileNode, changedPaths: Set<string>): boolean {
  if (!node.isDir) return changedPaths.has(node.path)
  return (node.children ?? []).some(c => hasChangedDescendant(c, changedPaths))
}

function NodeRow({ node, depth, changedPaths, onOpenFile }: {
  node: FileNode; depth: number; changedPaths: Set<string>; onOpenFile: (p: string) => void
}): React.ReactElement {
  const [open, setOpen] = useState(depth === 0)
  const isChanged = !node.isDir && changedPaths.has(node.path)
  const isProtected = !!node.protected
  const childChanged = node.isDir && hasChangedDescendant(node, changedPaths)
  const icon = !node.isDir ? fileIconInfo(node.name) : { label: '', color: '' }

  const nameColor = isChanged ? 'var(--teal)'
    : childChanged ? 'var(--amber)'
    : isProtected ? 'var(--yellow)'
    : node.isDir ? 'var(--text-2)'
    : 'var(--text-1)'

  return (
    <>
      <div
        onClick={() => node.isDir ? setOpen(v => !v) : onOpenFile(node.path)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, height: 22, paddingLeft: 6 + depth * 12, paddingRight: 10, cursor: 'pointer', userSelect: 'none', background: isChanged ? 'rgba(93,202,165,0.04)' : 'transparent' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { e.currentTarget.style.background = isChanged ? 'rgba(93,202,165,0.04)' : 'transparent' }}
      >
        <span style={{ width: 14, fontSize: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: childChanged ? 'var(--amber)' : 'var(--text-ghost)', transition: 'transform 0.15s ease', transform: node.isDir ? (open ? 'rotate(0deg)' : 'rotate(-90deg)') : 'none' }}>
          {node.isDir ? '▾' : ''}
        </span>

        {node.isDir ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <path d="M1 3.5C1 2.94 1.45 2.5 2 2.5H5.5L7 4H12C12.55 4 13 4.45 13 5V10.5C13 11.05 12.55 11.5 12 11.5H2C1.45 11.5 1 11.05 1 10.5V3.5Z"
              fill={childChanged ? 'rgba(193,122,46,0.25)' : 'rgba(255,255,255,0.06)'}
              stroke={childChanged ? 'var(--amber)' : 'var(--text-ghost)'} strokeWidth="0.6" />
          </svg>
        ) : (
          <div style={{ width: 16, height: 16, borderRadius: 2, flexShrink: 0, background: `${icon.color}22`, border: `1px solid ${icon.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 900, color: icon.color, letterSpacing: '-0.03em' }}>
            {icon.label}
          </div>
        )}

        <span style={{ fontSize: 12, color: nameColor, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>

        {isProtected && (
          <span title="Protected file" style={{ color: 'var(--yellow)', fontSize: 10, flexShrink: 0 }}>lock</span>
        )}

        {(isChanged || childChanged) && (
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: isChanged ? 'var(--teal)' : 'var(--amber)', flexShrink: 0 }} />
        )}
      </div>

      {node.isDir && open && node.children?.map(child => (
        <NodeRow key={child.path} node={child} depth={depth + 1} changedPaths={changedPaths} onOpenFile={onOpenFile} />
      ))}
    </>
  )
}

export function ProjectFiles({ projectRoot, changedPaths, onOpenFile, refreshKey }: Props): React.ReactElement {
  const [tree, setTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    window.kova.listDir(projectRoot)
      .then(nodes => setTree(nodes as FileNode[]))
      .catch(() => setTree([]))
      .finally(() => setLoading(false))
  }, [projectRoot])

  useEffect(() => { refresh() }, [refresh, refreshKey])

  return (
    <div style={{ flex: 1, overflow: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px 4px' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Files</span>
        <button onClick={refresh} style={{ background: 'transparent', color: 'var(--text-3)', padding: '2px 4px', fontSize: 13, lineHeight: 1 }} title="Refresh">⟳</button>
      </div>
      {loading && <p style={{ fontSize: 11, color: 'var(--text-3)', padding: '6px 14px' }}>Carregando...</p>}
      {!loading && tree.length === 0 && <p style={{ fontSize: 11, color: 'var(--text-ghost)', padding: '6px 14px' }}>Pasta vazia</p>}
      {tree.map(node => (
        <NodeRow key={node.path} node={node} depth={0} changedPaths={changedPaths} onOpenFile={onOpenFile} />
      ))}
    </div>
  )
}
