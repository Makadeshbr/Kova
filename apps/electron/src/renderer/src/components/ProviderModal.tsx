import React, { useCallback, useState } from 'react'
import type { KovaSettings } from '../types'
import { API_KEY_CONFIG, DEFAULT_MODELS, HINTS, KNOWN_MODELS, PROVIDERS } from '../provider-config'

interface Props {
  settings: KovaSettings
  onSave: (settings: KovaSettings) => void
  onClose: () => void
}

const FIELD: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  fontSize: 13,
  background: 'var(--bg-3)',
  border: '1px solid var(--border)',
  color: 'var(--text-1)',
}

function Field({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
      {children}
    </div>
  )
}

function serverUrl(form: KovaSettings): string {
  if (form.defaultProvider === 'ollama') return form.ollamaUrl
  if (form.defaultProvider === 'lmstudio' || form.defaultProvider === 'openai-compatible') return form.compatibleUrl
  return ''
}

export function ProviderModal({ settings, onSave, onClose }: Props): React.ReactElement {
  const [form, setForm] = useState<KovaSettings>({ ...settings })
  const [models, setModels] = useState<string[]>([])
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState('')
  const [modelMode, setModelMode] = useState<'preset' | 'custom'>(() =>
    settings.model && KNOWN_MODELS[settings.defaultProvider]
      ? (KNOWN_MODELS[settings.defaultProvider].includes(settings.model) ? 'preset' : 'custom')
      : 'preset',
  )

  const set = (key: keyof KovaSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    if (key === 'defaultProvider' && typeof val === 'string') {
      setForm(prev => ({ ...prev, defaultProvider: val, model: DEFAULT_MODELS[val] ?? '' }))
      setModelMode('preset')
      setModels([])
      return
    }
    setForm(prev => ({ ...prev, [key]: val }))
    if (key === 'model') setModels([])
  }

  const detectModels = useCallback(async () => {
    const url = serverUrl(form)
    if (!url) return
    setDetecting(true)
    setDetectError('')
    setModels([])
    try {
      const res = await fetch(`${url.replace(/\/+$/, '')}/models`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { data?: Array<{ id: string }> }
      const ids = (data.data ?? []).map(m => m.id).filter(Boolean)
      if (ids.length === 0) throw new Error('Servidor rodando mas sem modelos. Carregue um modelo no LM Studio.')
      setModels(ids)
      if (ids.length === 1) setForm(prev => ({ ...prev, model: ids[0] }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setDetectError(msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')
        ? `Servidor nao encontrado em ${url}. Verifique se esta rodando.`
        : msg)
    } finally {
      setDetecting(false)
    }
  }, [form])

  const provider = PROVIDERS.find(p => p.value === form.defaultProvider)
  const isLocal = provider?.local ?? false
  const hint = HINTS[form.defaultProvider]
  const apiKeyCfg = API_KEY_CONFIG[form.defaultProvider]
  const knownModels = KNOWN_MODELS[form.defaultProvider]
  const canDetect = isLocal && !!serverUrl(form)

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: 560, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 32px)', overflow: 'auto', background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--border)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Settings</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', color: 'var(--text-3)', fontSize: 16, padding: '4px 8px' }}>x</button>
        </div>

        <Field label="Intelligence Engine">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(156px, 1fr))', gap: 10, marginTop: 4 }}>
            {PROVIDERS.map(p => {
              const isSelected = form.defaultProvider === p.value
              return (
                <button
                  key={p.value}
                  onClick={() => {
                    setForm(prev => ({ ...prev, defaultProvider: p.value, model: DEFAULT_MODELS[p.value] ?? '' }))
                    setModelMode('preset')
                    setModels([])
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 7,
                    minHeight: 92,
                    padding: 12,
                    background: isSelected ? 'var(--cyan-glow)' : 'var(--bg-1)',
                    border: `1px solid ${isSelected ? 'var(--cyan)' : 'var(--border)'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.2s, background 0.2s',
                    position: 'relative',
                  }}
                >
                  {isSelected && (
                    <span style={{ position: 'absolute', top: 8, right: 8, color: 'var(--cyan)', fontSize: 10, fontWeight: 800 }}>SELECTED</span>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 800, color: isSelected ? 'var(--text-1)' : 'var(--text-2)' }}>{p.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.35 }}>{p.description}</span>
                  <span style={{ fontSize: 10, color: isSelected ? 'var(--cyan)' : 'var(--text-3)', fontWeight: 700 }}>{p.local ? 'LOCAL' : 'CLOUD'}</span>
                </button>
              )
            })}
          </div>
        </Field>

        {hint && (
          <div style={{ padding: '10px 12px', background: 'var(--teal-dim)', borderRadius: 6, fontSize: 12, color: 'var(--teal)', lineHeight: 1.6 }}>
            {hint}
          </div>
        )}

        {(form.defaultProvider === 'lmstudio' || form.defaultProvider === 'openai-compatible') && (
          <Field label="URL do servidor">
            <input type="text" value={form.compatibleUrl} onChange={set('compatibleUrl')} placeholder="http://localhost:1234/v1" style={FIELD} />
          </Field>
        )}
        {form.defaultProvider === 'ollama' && (
          <Field label="Ollama URL">
            <input type="text" value={form.ollamaUrl} onChange={set('ollamaUrl')} placeholder="http://localhost:11434/v1" style={FIELD} />
          </Field>
        )}

        {apiKeyCfg && (
          <Field label={apiKeyCfg.label}>
            <input
              type="password"
              value={apiKeyCfg.key === 'nvidiaKey' && form.hasNvidiaKey && !form.nvidiaKey ? form.nvidiaKeyPreview : String(form[apiKeyCfg.key] ?? '')}
              onChange={set(apiKeyCfg.key)}
              placeholder={apiKeyCfg.placeholder}
              style={FIELD}
              autoComplete="off"
            />
          </Field>
        )}

        {form.defaultProvider === 'nvidia' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-2)', fontSize: 13, paddingTop: 6 }}>
            <input type="checkbox" checked={form.nvidiaEnableThinking ?? true} onChange={e => setForm(prev => ({ ...prev, nvidiaEnableThinking: e.target.checked }))} />
            Habilitar modo reasoning
          </label>
        )}

        <Field label="Modelo">
          {isLocal ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {models.length > 0
                ? (
                  <select value={form.model} onChange={set('model')} style={{ ...FIELD, flex: 1, cursor: 'pointer' }}>
                    <option value="">Usar modelo carregado</option>
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                )
                : <input type="text" value={form.model} onChange={set('model')} placeholder="Click Detect" style={{ ...FIELD, flex: 1 }} />
              }
              {canDetect && (
                <button
                  onClick={detectModels}
                  disabled={detecting}
                  style={{ background: 'var(--bg-3)', color: detecting ? 'var(--text-3)' : 'var(--teal)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 6, fontSize: 12, flexShrink: 0 }}
                >
                  {detecting ? '...' : 'Detectar'}
                </button>
              )}
            </div>
          ) : knownModels ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {modelMode === 'preset'
                ? (
                  <select value={form.model} onChange={set('model')} style={{ ...FIELD, cursor: 'pointer', borderColor: !form.model ? 'var(--amber)' : undefined }}>
                    <option value="">Selecione o modelo</option>
                    {knownModels.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                )
                : (
                  <>
                    <input
                      type="text"
                      value={form.model}
                      onChange={set('model')}
                      placeholder="Paste the exact API ID (for example: gemini-3.1-pro)"
                      style={{ ...FIELD, borderColor: !form.model ? 'var(--amber)' : undefined }}
                      autoFocus
                    />
                    <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
                      Use o ID exato da API do provider, nao o nome de exibicao. Erros de nome causam erro 400.
                    </p>
                  </>
                )
              }
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setModelMode(modelMode === 'preset' ? 'custom' : 'preset')}
                  style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-active)', padding: '3px 8px', borderRadius: 4 }}
                >
                  {modelMode === 'preset' ? '+ Modelo personalizado / mais recente' : 'Voltar para lista'}
                </button>
              </div>
            </div>
          ) : (
            <input type="text" value={form.model} onChange={set('model')} placeholder="exact model name (required)" style={FIELD} />
          )}
          {detectError && <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{detectError}</p>}
          {models.length > 1 && <p style={{ fontSize: 11, color: 'var(--teal)', marginTop: 4 }}>{models.length} modelos detectados</p>}
        </Field>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', paddingTop: 12, flexWrap: 'wrap' }}>
          <Field label="Max iterations">
            <input
              type="number"
              min={1}
              max={20}
              value={form.maxIterations}
              onChange={e => setForm(prev => ({ ...prev, maxIterations: Number(e.target.value) }))}
              style={{ ...FIELD, width: 88 }}
            />
          </Field>
          <Field label="Command permissions">
            <select value={form.permissionMode ?? 'auto-review'} onChange={set('permissionMode')} style={{ ...FIELD, width: 180 }}>
              <option value="auto-review">Auto-review safe commands</option>
              <option value="ask">Ask before commands</option>
              <option value="full-access">Full access</option>
            </select>
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--text-2)', fontSize: 13, paddingBottom: 2 }}>
            <input type="checkbox" checked={form.autoApply} onChange={set('autoApply')} />
            Auto-apply when score is 90+
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ background: 'var(--bg-active)', color: 'var(--text-2)', padding: '8px 16px', borderRadius: 6 }}>Cancel</button>
          <button onClick={() => onSave(form)} style={{ background: 'var(--cyan)', color: '#000', padding: '8px 16px', fontWeight: 700, borderRadius: 6 }}>Save</button>
        </div>
      </div>
    </div>
  )
}
