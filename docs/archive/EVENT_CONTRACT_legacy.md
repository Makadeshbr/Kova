# Kova — Contrato de Eventos (ExecutionEvent)

Este documento é a fonte de verdade para o sistema de eventos. Qualquer IA ou dev que modifique o loop de execução deve seguir este contrato.

## Quem emite o quê

### EngineManager.runSession() (caminho principal)
| Evento | Quando | Campos extras |
|--------|--------|---------------|
| `token` | token de texto do modelo | `token: string` |
| `stream_end` | fim do streaming (apenas iteração 0) | — |
| `tool_call` | antes de executar tool | `toolName`, `toolInput`, `message` (preview) |
| `tool_result` | após executar tool | `toolName`, `message` (resultado truncado 100 chars) |
| `validation_started` | antes do harness | `changes: FileChange[]` |
| `validation_completed` | após o harness | `harnessResult: HarnessResult` |
| `apply_completed` | após apply bem-sucedido | `changes: FileChange[]` |

### EngineManager.runUnifiedSession() → ExecutionEngine (/plan)
| Evento | Quando |
|--------|--------|
| `contract_created` | ao iniciar |
| `state_changed` | em toda mudança de status |
| `agent_started` | início de cada fase de agente |
| `stream_end` | após cada fase de agente (planning e coding) |
| `agent_completed` | fim de cada fase |
| `validation_started/completed` | idem |
| `decision_made` | após decide() |
| `iteration_recorded` | após gravar iteração |
| `apply_started/completed` | se auto_apply |

## Como App.tsx consome eventos

```typescript
// token → streamingText += token
// stream_end → streamingText → messages[], streamingText = ''
// tool_call (write_file|delete_file) → fileRefreshKey++
// apply_completed → fileRefreshKey++
// validation_* → repassados para HarnessDashboard via executionEvents[]
```

## Como ChatArea.tsx usa eventos

```typescript
// LiveFeed mostra: tool_call (write_file, delete_file, run_command, read_file, list_files)
//                 validation_started, validation_completed
// Slice de -6 eventos mais recentes
```

## Como HarnessDashboard usa eventos
Recebe `events: ExecutionEvent[]` e filtra `validation_completed` para mostrar score e layers.

## Regras do contrato
1. `stream_end` deve ser emitido exatamente uma vez por resposta de texto do modelo. Emitir duas vezes cria mensagem duplicada vazia.
2. `token` deve ser emitido apenas para texto visível ao usuário — não para raciocínio interno.
3. `tool_call` deve ser emitido ANTES da execução (não depois).
4. Eventos do `ExecutionEngine` passam por `this.options.onEvent` → `this.onExecutionEvent?.()` → IPC.
5. Eventos do `runSession` passam por `this.emit()` → `this.onExecutionEvent?.()` → IPC.
6. `taskId` em todos os eventos do `runSession` = `'chat'` (constante no `emit()`).
7. `taskId` em eventos do `ExecutionEngine` = `task.id`.

## Campos de ExecutionEvent

```typescript
interface ExecutionEvent {
  type: string          // ver lista acima
  taskId: string
  timestamp: string     // ISO 8601
  iteration?: number
  token?: string
  toolName?: string
  toolInput?: Record<string, unknown>
  message?: string
  changes?: FileChange[]
  harnessResult?: HarnessResult
  decision?: DecisionResult
  state?: ExecutionState['status']
  contract?: ExecutionContract
  mode?: AgentMode
}
```

## Adicionando um novo tipo de evento
1. Adicionar o type literal em `ExecutionEvent` em `@kova/shared/src/types.ts`
2. Documentar aqui: quem emite, quando, quais campos
3. Se a UI precisa reagir: adicionar handler em `App.tsx` ou filtro em `ChatArea.tsx`/`HarnessDashboard.tsx`
4. Nunca adicionar evento sem consumidor — gera ruído sem propósito
