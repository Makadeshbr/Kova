# @kova/execution — Engine de Execução Multi-iteração

## O que é
Loop de alta ordem que compõe agent, context, orchestrator, decision e application em ciclos de reparo. O `EngineManager` usa este caminho para tarefas de `patch`, enquanto `chat`, `plan` e `review` continuam read-only ou sem apply conforme o modo.

## Contexto de uso atual
O antigo `EngineManager.runSession()` foi removido. O fluxo de alteração de código passa pelo `ExecutionEngine`, com `skipPlan: true` para modo unified. Isso evita dois motores concorrentes para stream, abort, validação e decisão.

## API pública

```typescript
new ExecutionEngine(deps: ExecutionDependencies, options: ExecutionEngineOptions)
engine.run(task) → Promise<ExecutionState>
engine.pause()
engine.resume() → Promise<ExecutionState>
engine.abort()  → Promise<void>   // rollback do último checkpoint
engine.forceApply() → Promise<void>
engine.getState() → ExecutionState | null
```

## ExecutionDependencies — interfaces (não classes concretas)
```typescript
{
  agent:             IAgent           // Agent class de @kova/agent
  orchestrator:      IOrchestrator    // HarnessOrchestrator de @kova/orchestrator
  contextEngine:     IContextEngine   // ContextEngine de @kova/context
  applicationEngine: IApplicationEngine // CodeApplicationEngine de @kova/application
}
```

## ExecutionEngineOptions críticas
```typescript
{
  skipPlan: boolean   // true = pula fase de planning (modo unified)
  history?: AgentMessage[]  // histórico de mensagens para multi-turn
  autoApply?: boolean  // false = sempre pausa para revisão
  maxIterations?: number  // padrão 5
  onStateChange?: (state: ExecutionState) => void
  onEvent?: (event: ExecutionEvent) => void
}
```

## Fases emitidas (status no ExecutionState)
```
structuring → planning (se !skipPlan) → coding → validating → deciding → applying → completed|paused|failed
```
A UI usa esses status para mostrar indicadores. Não alterar a sequência sem atualizar `STATUS_LABEL` em `ChatArea.tsx`.

## Eventos emitidos pelo loop
- `contract_created` — ao iniciar
- `agent_started` / `agent_completed` — por fase de agente
- `stream_end` — **emitido após cada fase de agente** (flush do streaming)
- `validation_started` / `validation_completed`
- `decision_made`
- `apply_started` / `apply_completed`
- `token` — durante streaming do modelo

## Condições de parada (shouldStop)
- `success`: último decision = `auto_apply` ou `suggest` → completa ou pausa
- `max_iterations`: atingiu limite → status `failed`
- `human_required`: decision = `human_required` → status `paused`
- `timeout`: implementado via StopOptions

## Invariantes
- `ToolExecutor` é criado por `Agent.execute()` a cada iteração — não reutilizar
- `abort()` faz rollback do último `checkpointId`
- `forceApply()` funciona apenas se houver iteração com changes na história
- Não misturar trace interno (events) com histórico enviado ao modelo

## Dependências
Importa de: `@kova/shared`, `@kova/orchestrator`, `@kova/decision`
Usa via interface: `@kova/agent`, `@kova/context`, `@kova/application`
