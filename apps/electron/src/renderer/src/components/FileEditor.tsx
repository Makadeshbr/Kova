import React, { useState, useEffect, useCallback } from 'react'
import { EXT_COLOR, EXT_LANG, fileIconInfo, getExt, getFileName } from '../file-utils'

interface Props {
  path: string
  onClose: () => void
}

function folderPath(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : ''
}

export function FileEditor({ path, onClose }: Props): React.ReactElement {
  const [content, setContent] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setContent(null)
    setError('')
    setIsEditing(false)
    setIsDirty(false)
    window.kova.readFile(path).then(c => {
      if (c !== null) { setContent(c); setEditContent(c) }
      else setError('File not found or missing read permission')
    })
  }, [path])

  const startEdit = useCallback(() => {
    setEditContent(content ?? '')
    setIsEditing(true)
  }, [content])

  const save = useCallback(async () => {
    setIsSaving(true)
    setError('')
    try {
      await window.kova.writeFile(path, editContent)
      setContent(editContent)
      setIsEditing(false)
      setIsDirty(false)
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : 'permission denied or disk full'}`)
    } finally {
      setIsSaving(false)
    }
  }, [path, editContent])

  const cancel = useCallback(() => {
    setEditContent(content ?? '')
    setIsEditing(false)
    setIsDirty(false)
    setError('')
  }, [content])

  const e = getExt(path)
  const name = getFileName(path)
  const { label: iconLabel, color } = fileIconInfo(name)
  const lines = (isEditing ? editContent : content ?? '').split('\n')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--bg-3)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ width: 24, height: 24, borderRadius: 3, background: `${color}22`, border: `1px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800, color, flexShrink: 0 }}>
          {iconLabel}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name} {isDirty && <span style={{ color: 'var(--yellow)' }}>●</span>}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
            {EXT_LANG[e] ?? e.toUpperCase()}{folderPath(path) && ` · ${folderPath(path)}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {!isEditing && (
            <button onClick={startEdit} style={{ background: 'var(--bg-active)', color: 'var(--text-2)', padding: '4px 10px', fontSize: 11, borderRadius: 4 }}>
              ✏ Editar
            </button>
          )}
          {isEditing && (
            <>
              <span style={{ fontSize: 10, color: 'var(--amber)', background: 'var(--amber-dim)', padding: '2px 8px', borderRadius: 10, fontWeight: 600, letterSpacing: '0.04em' }}>EDIT</span>
              <button onClick={cancel} style={{ background: 'transparent', color: 'var(--text-3)', padding: '4px 10px', fontSize: 11 }}>Cancelar</button>
              <button onClick={save} disabled={isSaving} style={{ background: 'var(--teal)', color: '#000', padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 4 }}>
                {isSaving ? '...' : '✓ Salvar'}
              </button>
            </>
          )}
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-3)', padding: '4px 8px', fontSize: 14 }}>✕</button>
        </div>
      </div>

      {error && <div style={{ padding: '10px 14px', color: 'var(--red)', fontSize: 12, borderBottom: '1px solid var(--border)', background: 'var(--red-dim)' }}>{error}</div>}

      {!error && content === null && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 12 }}>Carregando...</div>
      )}

      {!error && content !== null && !isEditing && (
        <div style={{ flex: 1, overflow: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.65 }}>
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ minWidth: 44, padding: '0 10px 0 8px', color: 'var(--text-ghost)', userSelect: 'none', textAlign: 'right', flexShrink: 0, borderRight: '1px solid var(--border)' }}>{i + 1}</span>
              <span style={{ padding: '0 12px', color: 'var(--text-2)', whiteSpace: 'pre', flex: 1 }}>{line}</span>
            </div>
          ))}
        </div>
      )}

      {!error && isEditing && (
        <textarea
          value={editContent}
          onChange={e => { setEditContent(e.target.value); setIsDirty(true) }}
          spellCheck={false}
          style={{
            flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.65,
            background: 'var(--bg-1)', color: 'var(--text-1)', border: 'none',
            padding: '8px 12px', resize: 'none', outline: 'none',
            borderTop: '2px solid var(--amber)',
          }}
        />
      )}
    </div>
  )
}
