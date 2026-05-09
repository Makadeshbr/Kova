import React, { useEffect, useRef, useState } from 'react'
import type { KovaSettings } from '../types'

interface ModelInfo {
  id: string
  active: boolean
}

interface Props {
  settings: KovaSettings
  activeModel: string | null
  onSelect: (model: string) => void
  onOpenSettings: () => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement>
}

function serverUrl(s: KovaSettings): string {
  if (s.defaultProvider === 'ollama') return s.ollamaUrl
  if (s.defaultProvider === 'lmstudio' || s.defaultProvider === 'openai-compatible') return s.compatibleUrl
  return ''
}

const PROVIDER_LABEL: Record<string, string> = {
  lmstudio: 'LM Studio',
  ollama: 'Ollama',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  openrouter: 'OpenRouter',
  'openai-compatible': 'Compatible',
}

export function ModelPicker({ settings, activeModel, onSelect, onOpenSettings, onClose, anchorRef }: Props): React.ReactElement {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose, anchorRef])

  useEffect(() => {
    const url = serverUrl(settings)
    setLoading(true)
    setError('')
    setModels([])

    if (!url) {
      setLoading(false)
      return
    }

    fetch(`${url.replace(/\/+$/, '')}/models`, { signal: AbortSignal.timeout(4000) })
      .then(r => r.json())
      .then((data: { data?: Array<{ id: string }> }) => {
        const ids = (data.data ?? []).map(m => m.id).filter(Boolean)
        setModels(ids.map(id => ({ id, active: id === activeModel })))
        if (ids.length === 0) setError('Servidor ativo, mas nenhum modelo foi encontrado.')
      })
      .catch(() => setError('Servidor nao responde. Verifique se esta rodando.'))
      .finally(() => setLoading(false))
  }, [settings, activeModel])

  const isLocal = ['lmstudio', 'ollama', 'openai-compatible'].includes(settings.defaultProvider)
  const url = serverUrl(settings)
  const providerLabel = PROVIDER_LABEL[settings.defaultProvider] ?? settings.defaultProvider

  return (
    <div ref={ref} className="kova-model-picker animate-fade-in">
      <div className="kova-model-picker-header">
        <div>
          <span>Provider</span>
          <strong>{providerLabel}</strong>
        </div>
        <i className={isLocal ? 'online' : 'cloud'}>{isLocal ? 'local' : 'cloud'}</i>
      </div>

      {url && <div className="kova-model-picker-url">{url}</div>}

      {loading && (
        <div className="kova-model-picker-state">
          <span className="kova-model-spinner" />
          Detectando modelos
        </div>
      )}

      {!loading && error && (
        <div className="kova-model-picker-error">{error}</div>
      )}

      {!loading && !error && models.length > 0 && (
        <div className="kova-model-list" role="listbox">
          {models.map(m => (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected={m.active}
              className={`kova-model-option${m.active ? ' active' : ''}`}
              onClick={() => {
                onSelect(m.id)
                onClose()
              }}
            >
              <span className="kova-model-dot" />
              <span>{m.id}</span>
              {m.active && <strong>ativo</strong>}
            </button>
          ))}
        </div>
      )}

      {!isLocal && (
        <div className="kova-model-cloud-model">
          <span>Modelo configurado</span>
          <strong>{settings.model || 'modelo padrao do provider'}</strong>
        </div>
      )}

      <button type="button" onClick={onOpenSettings} className="kova-model-settings">
        Abrir configuracoes
      </button>
    </div>
  )
}
