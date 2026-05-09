# @kova/memory — Learnings e Anti-drift

## O que é
Persiste aprendizados do agente por projeto e globalmente. Detecta padrões, anti-padrões e decisões para alimentar iterações futuras e evitar regressão.

## API pública

```typescript
new MemorySystem(projectRoot: string)

memory.record(input: NewLearning): Learning
memory.query(task: string, maxResults?: number): Learning[]
memory.promote(): void   // sobe experimental → verified → canonical
memory.prune(): void     // remove learnings obsoletos
memory.list(filters?): Learning[]
memory.inspect(id): Learning | null
memory.remove(id): void
```

## Limites
```
MAX_PROJECT = 200 learnings por projeto
MAX_GLOBAL  = 500 learnings globais
```

## Learning
```typescript
{
  type: 'pattern' | 'anti_pattern' | 'decision'
  scope: 'project' | 'global'
  status: 'experimental' | 'verified' | 'canonical'
  confidence: number  // 0–1
  description: string
  evidence: Evidence[]
  tags: string[]
  stack?: string
}
```

## Status de promoção
- `experimental` → 3+ evidências positivas → `verified`
- `verified` → consistente em múltiplos projetos → `canonical`
- Contradição → reduz confidence; muito baixo → prune

## Storage
- `project` learnings: `.kova/memory/project.json` dentro do projectRoot
- `global` learnings: `~/.kova/memory/global.json`

## Como o ContextEngine usa
```typescript
const learnings = memory.query(task.objective, 5)
// Injeta no AgentContext como arquivos de relevância 'learning'
```

## O que NÃO fazer
- Não fazer record() manualmente de aprendizados não verificados pelo harness
- Não usar `global` scope para aprendizados de projeto específico
- Não remover learnings `canonical` sem razão explícita

## Dependências
Importa de: `@kova/shared` apenas
