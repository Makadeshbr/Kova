import React, { useState, useRef, useCallback, KeyboardEvent } from 'react'

interface Props {
  projectRoot: string | null
  isRunning: boolean
  onStart: (objective: string) => void
  onOpenFolder: () => void
}

export function TaskInput({ projectRoot, isRunning, onStart, onOpenFolder }: Props): React.ReactElement {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const submit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isRunning || !projectRoot) return
    onStart(trimmed)
    setValue('')
  }, [value, isRunning, projectRoot, onStart])

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }, [submit])

  const canSubmit = !!value.trim() && !isRunning && !!projectRoot

  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-1)',
      flexShrink: 0,
    }}>
      {!projectRoot && (
        <button
          onClick={onOpenFolder}
          style={{
            width: '100%',
            padding: '10px',
            background: 'var(--amber-dim)',
            color: 'var(--amber)',
            border: '1px dashed var(--amber)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            justifyContent: 'center',
          }}
        >
          + Selecionar projeto para começar
        </button>
      )}

      {projectRoot && (
        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '10px 12px',
          transition: 'border-color 0.15s',
        }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isRunning ? 'Agente trabalhando...' : 'Descreva a tarefa (Enter para enviar, Shift+Enter para nova linha)'}
            disabled={isRunning || !projectRoot}
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: 'var(--text-1)',
              lineHeight: 1.6,
              minHeight: 22,
              maxHeight: 120,
              overflow: 'auto',
            }}
          />
          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              background: canSubmit ? 'var(--amber)' : 'var(--bg-active)',
              color: canSubmit ? '#000' : 'var(--text-3)',
              padding: '6px 14px',
              fontWeight: 600,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            {isRunning ? '...' : '↵ Enviar'}
          </button>
        </div>
      )}
    </div>
  )
}
