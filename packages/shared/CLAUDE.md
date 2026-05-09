# @kova/shared — Contrato de Tipos

## O que é
Único package sem dependências de outros `@kova/*`. Define todos os tipos e contratos que circulam entre packages. **Nenhuma lógica aqui — só tipos.**

## Regra absoluta
`@kova/shared` não importa nenhum outro `@kova/*`. Qualquer dependência circular deve ser resolvida extraindo o tipo necessário para cá.

## Tipos críticos — não altere sem entender o impacto

### ExecutionState
```typescript
status: 'structuring' | 'planning' | 'coding' | 'validating' | 'deciding' | 'applying' | 'completed' | 'paused' | 'failed'
iterationHistory: IterationRecord[]
totalTokens: number
```
- A UI em `apps/electron` depende de cada status string exato para decidir o que renderizar.
- `iterationHistory.length > 0 && last.changes.length > 0` é o gatilho do `TaskResultCard`.

### ExecutionEvent.type
Os seguintes types são consumidos pela UI e pelo EngineManager:
- `token` — streaming de texto (acumula em `streamingText`)
- `stream_end` — flush: `streamingText` → mensagem de chat
- `tool_call` — mostrado no `LiveFeed` (write_file, delete_file, run_command, read_file)
- `validation_started` / `validation_completed` — indicador de harness no `LiveFeed`
- `apply_completed` — dispara refresh do sidebar

**Nunca remover um type sem verificar todos os consumidores.**

### FileChange
```typescript
type: 'create' | 'modify' | 'delete'
diff: string      // conteúdo novo (ou vazio se delete)
before?: string   // snapshot original (necessário para diff visual)
```
`before` é obrigatório para `FileCard` renderizar diff correto em arquivos modificados.

### DecisionResult.decision
```typescript
'auto_apply' | 'suggest' | 'reject' | 'human_required'
```
Cada valor tem comportamento específico no repair loop de `runSession`. Não adicionar valores sem atualizar `engine-manager.ts`.

### AgentMode
```typescript
'plan' | 'code' | 'test' | 'fix' | 'review' | 'unified'
```
`unified` = modo que o EngineManager usa no `runSession` (single-shot). `fix` = repair iterations. Os outros são usados pelo `ExecutionEngine` com `skipPlan=false`.

## O que NÃO fazer
- Não adicionar imports de `node:*` aqui
- Não adicionar classes, só interfaces e types
- Não criar default exports
- Não importar de outros `@kova/*`
