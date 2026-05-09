# @kova/context — Construção de Contexto JIT

## O que é
Monta o contexto que o agente recebe antes de gerar código: arquivos relevantes, erros anteriores do harness, learnings da memória, tudo dentro de um budget de tokens.

## API pública

```typescript
new ContextEngine(memory: MemorySystem, adapter: StackAdapter)

engine.buildContext(
  task: TaskDefinition,
  projectRoot: string,
  options: BuildContextOptions = {}
): Promise<AgentContext>

interface BuildContextOptions {
  harnessErrors?: HarnessError[]  // erros da iteração anterior (repair loop)
  maxTokens?: number              // padrão 40_000
}
```

## O que buildContext() faz (em ordem)
1. Grep do objetivo da task nos arquivos do projeto
2. Constrói grafo de dependências dos arquivos encontrados
3. Inclui `RULES.md` se existir na raiz
4. Inclui arquivos afetados (`task.affectedFiles`) + dependências diretas
5. Inclui arquivos dos erros do harness (`harnessErrors`)
6. Inclui matches do grep (até 15 arquivos)
7. Consulta memória por learnings relevantes (até 5)
8. Aloca budget: corta arquivos por relevância até `maxTokens`

## AgentContext retornado
```typescript
interface AgentContext {
  files: ContextFile[]   // arquivos com conteúdo e relevância
  tokensUsed: number
  learnings: Learning[]
}
```

## ContextFile.relevance
```
'rules'       — RULES.md / regras do projeto
'target'      — arquivo que a task deve modificar
'error'       — arquivo onde o harness encontrou erro
'direct_dep'  — dependência direta do target
'learning'    — aprendizado da memória
'indirect_dep'— dependência indireta
```

## Relação com EngineManager
O `EngineManager.runSession()` NÃO usa `ContextEngine` — usa `buildProjectContext()` próprio (leitura direta). O `ContextEngine` é usado apenas pelo `ExecutionEngine` (caminho `/plan`).

Para o caminho principal (`runSession`), o contexto é injetado diretamente na mensagem do usuário.

## Invariantes
- Budget de tokens é respeitado — arquivos de menor relevância são cortados primeiro
- `harnessErrors` da iteração anterior devem ser passados para garantir que o agente vê os arquivos com problema
- Não incluir `dist/**`, `out/**`, `node_modules/**` no contexto

## Dependências
Importa de: `@kova/shared`, `@kova/memory`, `@kova/adapters`
