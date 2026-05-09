import React, { useRef, useState } from 'react'
import type { KovaSettings } from '../types'
import { ModelPicker } from './ModelPicker'

interface Props {
  projectRoot: string | null
  status: string | null
  settings: KovaSettings | null
  activeModel: string | null
  modelConnected: boolean
  onOpenFolder: () => void
  onOpenSettings: () => void
  onSelectModel: (model: string) => void
}

// Electron drag region requires vendor-prefixed CSS not known to React types
type DragStyle = React.CSSProperties & { WebkitAppRegion?: 'drag' | 'no-drag' }

const STATUS_COLOR: Record<string, string> = {
  structuring: 'var(--amber)', planning: 'var(--amber)', coding: 'var(--amber)',
  validating: 'var(--yellow)', deciding: 'var(--yellow)',
  applying: 'var(--teal)', completed: 'var(--teal)',
  failed: 'var(--red)', paused: 'var(--text-3)',
}

const isActive = (s: string | null) => s && !['completed', 'failed', 'paused'].includes(s)

const isMac = (window as Window & { kova?: { platform?: string } }).kova?.platform === 'darwin'

export function TitleBar({ projectRoot, status, settings, activeModel, modelConnected, onOpenFolder, onOpenSettings, onSelectModel }: Props): React.ReactElement {
  const [showPicker, setShowPicker] = useState(false)
  const modelBtnRef = useRef<HTMLButtonElement>(null)
  const projectName = projectRoot?.split(/[/\\]/).at(-1) ?? null

  const modelLabel = activeModel
    ? activeModel.split('/').at(-1)?.replace(/[-_](instruct|chat|hf|gguf|q\d.*)$/i, '') ?? activeModel
    : 'sem modelo'

  const dotColor = modelConnected ? 'var(--teal)' : settings ? 'var(--red)' : 'var(--text-ghost)'

  const dragStyle: DragStyle = {
    height: 40, background: 'var(--bg-3)', borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center',
    paddingLeft: isMac ? 80 : 12, paddingRight: 8,
    WebkitAppRegion: 'drag', flexShrink: 0, position: 'relative',
  }

  const noDragStyle: DragStyle = { WebkitAppRegion: 'no-drag' }

  return (
    <div style={dragStyle as React.CSSProperties}>
      {/* Logo + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...noDragStyle } as React.CSSProperties}>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', color: 'var(--amber)' }}>KOVA</span>
        {status && (
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: STATUS_COLOR[status] ?? 'var(--text-3)',
            animation: isActive(status) ? 'pulse-amber 1.5s infinite' : 'none',
          }} />
        )}
      </div>

      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 10px' }} />

      {/* Project folder button */}
      <button onClick={onOpenFolder} style={{
        background: 'transparent', color: projectName ? 'var(--text-2)' : 'var(--text-3)',
        padding: '2px 8px', fontSize: 12, maxWidth: 200,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        ...noDragStyle,
      } as React.CSSProperties}>
        {projectName ? `> ${projectName}` : '+ Abrir projeto'}
      </button>

      <div style={{ flex: 1 }} />

      {/* Model picker */}
      <div style={{ position: 'relative', ...noDragStyle } as React.CSSProperties}>
        <button
          ref={modelBtnRef}
          onClick={() => setShowPicker(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: showPicker ? 'var(--bg-active)' : 'transparent',
            border: `1px solid ${showPicker ? 'var(--border-focus)' : 'var(--border)'}`,
            borderRadius: 6, padding: '4px 10px', color: 'var(--text-2)', fontSize: 12,
            transition: 'all 0.15s', cursor: 'pointer',
          }}
        >
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0,
            animation: modelConnected && isActive(status) ? 'pulse-amber 1.5s infinite' : 'none',
            boxShadow: modelConnected ? `0 0 6px ${dotColor}` : 'none',
          }} />
          <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {modelLabel}
          </span>
          <span style={{ color: 'var(--text-ghost)', fontSize: 10 }}>v</span>
        </button>

        {showPicker && settings && (
          <ModelPicker
            settings={settings}
            activeModel={activeModel}
            onSelect={(m) => { onSelectModel(m); setShowPicker(false) }}
            onOpenSettings={() => { onOpenSettings(); setShowPicker(false) }}
            onClose={() => setShowPicker(false)}
            anchorRef={modelBtnRef as React.RefObject<HTMLElement>}
          />
        )}
      </div>

      {/* Settings + window controls */}
      <div style={{ display: 'flex', gap: 2, marginLeft: 6, ...noDragStyle } as React.CSSProperties}>
        <button onClick={onOpenSettings} style={{ background: 'transparent', color: 'var(--text-3)', padding: '4px 8px', fontSize: 15 }} title="Configurações">⚙</button>
        {!isMac && <>
          <button onClick={() => window.kova.windowMinimize()} style={{ background: 'transparent', color: 'var(--text-3)', padding: '4px 10px' }}>─</button>
          <button onClick={() => window.kova.windowMaximize()} style={{ background: 'transparent', color: 'var(--text-3)', padding: '4px 10px' }}>□</button>
          <button onClick={() => window.kova.windowClose()} style={{ background: 'transparent', color: 'var(--text-3)', padding: '4px 10px' }}>✕</button>
        </>}
      </div>
    </div>
  )
}
