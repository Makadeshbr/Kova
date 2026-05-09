import React, { useEffect, useRef } from 'react'
import type { ExecutionState, TaskDefinition } from '../types'

interface Props {
  executionState: ExecutionState | null
  task: TaskDefinition | null
  error: string | null
}

const STATUS_LABEL: Record<string, string> = {
  structuring: 'Estruturando tarefa...',
  planning: 'Planejando abordagem...',
  coding: 'Gerando código...',
  validating: 'Validando com harness...',
  deciding: 'Analisando resultado...',
  applying: 'Aplicando mudanças...',
  completed: 'Concluído',
  failed: 'Falhou',
  paused: 'Aguardando revisão',
}

export function AgentStream({ executionState, task, error }: Props): React.ReactElement {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [executionState?.iterationHistory?.length])

  const history = executionState?.iterationHistory ?? []
  const status = executionState?.status ?? null
  const isActive = status && !['completed', 'failed'].includes(status)

  return (
    <div style={{
      flex: 1,
      overflow: 'auto',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {!executionState && !error && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', lineHeight: 2 }}>
            Selecione um projeto e descreva uma tarefa.<br />
            O agente vai gerar código e o harness valida automaticamente.
          </p>
        </div>
      )}

      {error && (
        <div className="animate-fade-in" style={{
          padding: '12px 14px', background: 'var(--red-dim)',
          border: '1px solid var(--red)', borderRadius: 'var(--radius-md)',
          color: 'var(--red)', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {task && (
        <div className="animate-fade-in" style={{
          padding: '12px 14px', background: 'var(--amber-glow)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {task.type} · {task.impact} impact
          </p>
          <p style={{ color: 'var(--text-1)', fontWeight: 500 }}>{task.objective}</p>
          {task.constraints.length > 0 && (
            <ul style={{ marginTop: 8, paddingLeft: 16, color: 'var(--text-2)', fontSize: 12 }}>
              {task.constraints.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
        </div>
      )}

      {history.map((iter, i) => (
        <div key={i} className="animate-fade-in" style={{
          padding: '12px 14px', background: 'var(--bg-2)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Iteração {iter.iteration + 1} · {iter.agentMode}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {Math.round(iter.duration / 1000)}s · {iter.tokensUsed.toLocaleString()} tokens
            </span>
          </div>
          {iter.agentThought && (
            <p style={{ color: 'var(--text-2)', fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {iter.agentThought}
            </p>
          )}
          {iter.changes.length > 0 && (
            <p style={{ marginTop: 8, fontSize: 11, color: 'var(--teal)' }}>
              {iter.changes.length} arquivo{iter.changes.length !== 1 ? 's' : ''} modificado{iter.changes.length !== 1 ? 's' : ''}: {iter.changes.map(c => c.path.split('/').at(-1)).join(', ')}
            </p>
          )}
        </div>
      ))}

      {isActive && (
        <div className="animate-fade-in" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', background: 'var(--amber-glow)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)',
            animation: 'pulse-amber 1.2s infinite',
          }} />
          <span style={{ color: 'var(--amber)', fontSize: 13 }}>
            {STATUS_LABEL[status!] ?? status}
          </span>
          <span style={{ color: 'var(--text-3)', fontSize: 11, marginLeft: 'auto' }}>
            iter {executionState!.currentIteration + 1}/{executionState!.maxIterations}
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
