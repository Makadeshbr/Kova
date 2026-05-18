import React, { useRef, useState } from 'react'
import type { KovaSettings } from '../types'
import { ModelPicker } from './ModelPicker'
import kovaLogo from '../assets/Logo_Kova.png'

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
    <div style={{ ...dragStyle, justifyContent: 'space-between' } as React.CSSProperties}>
      {/* Left: Project folder button */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, ...noDragStyle } as React.CSSProperties}>
        <button onClick={onOpenFolder} style={{
          background: 'transparent', color: projectName ? 'var(--text-1)' : 'var(--text-3)',
          padding: '4px 8px', fontSize: 12, fontWeight: projectName ? 600 : 400,
          maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: projectName ? 'var(--cyan)' : 'var(--text-3)' }}>folder_open</span>
          {projectName ? projectName : 'Abrir projeto'}
        </button>
      </div>

      {/* Center: Logo + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1 }}>
        <img
          src={kovaLogo}
          alt=""
          aria-hidden="true"
          style={{
            width: 24,
            height: 24,
            objectFit: 'contain',
            filter: 'invert(1) brightness(0.92) drop-shadow(0 0 10px rgba(116, 211, 255, 0.22))',
            opacity: 0.9,
          }}
        />
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.15em', color: 'var(--cyan)' }}>KOVA</span>
        {status && (
          <span style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: STATUS_COLOR[status] ?? 'var(--text-3)',
            animation: isActive(status) ? 'pulse-amber 1.5s infinite' : 'none',
          }} />
        )}
      </div>

      {/* Right: Model picker + Window controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flex: 1, ...noDragStyle } as React.CSSProperties}>
        <div style={{ position: 'relative' }}>
          <button
            ref={modelBtnRef}
            onClick={() => setShowPicker(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: showPicker ? 'var(--bg-active)' : 'transparent',
              border: `1px solid ${showPicker ? 'var(--border-focus)' : 'transparent'}`,
              borderRadius: 6, padding: '4px 10px', color: 'var(--text-2)', fontSize: 12,
              transition: 'all 0.15s', cursor: 'pointer',
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0,
              animation: modelConnected && isActive(status) ? 'pulse-amber 1.5s infinite' : 'none',
              boxShadow: modelConnected ? `0 0 8px ${dotColor}` : 'none',
            }} />
            <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {modelLabel}
            </span>
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

        <button onClick={onOpenSettings} style={{ background: 'transparent', color: 'var(--text-3)', padding: '4px 8px', fontSize: 14 }} title="Settings">⚙</button>
        {!isMac && <>
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          <button onClick={() => window.kova.windowMinimize()} style={{ background: 'transparent', color: 'var(--text-3)', padding: '4px 10px' }}>─</button>
          <button onClick={() => window.kova.windowMaximize()} style={{ background: 'transparent', color: 'var(--text-3)', padding: '4px 10px' }}>□</button>
          <button onClick={() => window.kova.windowClose()} style={{ background: 'transparent', color: 'var(--text-3)', padding: '4px 10px' }}>✕</button>
        </>}
      </div>
    </div>
  )
}
