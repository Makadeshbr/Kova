# @kova/decision — Engine de Decisão

## O que é
Recebe `HarnessResult` e decide o que o sistema deve fazer: aplicar, sugerir revisão, rejeitar e tentar de novo, ou pedir intervenção humana.

## API pública

```typescript
decide(
  result: HarnessResult,
  history: IterationRecord[],  // iterações anteriores (para detectar regressão/repetição)
  context: DecisionContext = {}
): DecisionResult

interface DecisionContext {
  changes?: FileChange[]         // usado pelo ReviewGate
  contract?: ExecutionContract   // usado para verificar violações
}
```

## Lógica de decisão

```
score === 0                     → reject   (hard fail: build caiu, security critical)
review gate bloqueou (critical) → reject   (score forçado a 0)
review gate bloqueou            → human_required (score ≤ 69)
erro repetido por 4+ iterações  → human_required
score regressando por 3+ iter   → human_required
score ≥ 90                      → auto_apply
score ≥ 70                      → suggest
score < 70                      → reject
```

## O que cada decisão significa para o repair loop (runSession)

| Decisão | Comportamento |
|---------|--------------|
| `auto_apply` | Aplica se `params.autoApply !== false`, senão pausa |
| `suggest` | Pausa para revisão do usuário |
| `reject` | Alimenta erros de volta ao modelo e tenta mais uma vez |
| `human_required` | Para completamente — requer intervenção manual |

## ReviewGate — o que verifica
- Escopo excessivo (muitos arquivos modificados)
- Dependência nova adicionada sem aprovação
- Safe zone alterada
- Arquivo gerado modificado (`dist/**`, `out/**`)
- Ausência de teste esperado
- Risk de segurança (secret hardcoded, path traversal)
- Mismatch de stack (arquivo TypeScript em projeto Go, etc.)

## Invariantes
- `score` no `DecisionResult` é o score calculado por `calculateScore()`, não o original do harness
- `feedback[]` contém instruções para o modelo corrigir os erros — incluir no repair prompt
- O histórico de iterações é necessário para detectar loops — nunca passar `[]` no repair loop (passar `allRecords`)

## O que NÃO fazer
- Não chamar `decide()` com `history = []` em iterações > 0 (perde detecção de regressão)
- Não ignorar `decision.feedback` — é a instrução de reparo
- Não usar o score do `decide()` como substituto para `harnessResult.score` na UI (são diferentes)

## Dependências
Importa de: `@kova/shared`
