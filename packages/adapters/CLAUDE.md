# @kova/adapters — Detecção de Stack

## O que é
Detecta a linguagem/framework do projeto e resolve os comandos corretos de build, test, lint e format para aquela stack.

## API pública

```typescript
detectStack(projectRoot: string): StackAdapter
detectStackFromChanges(paths: string[]): StackAdapter | null
resolveCommands(adapter: StackAdapter, projectRoot: string): {
  build: string; test: string; lint: string; format: string
}
```

## Ordem de detecção
Flutter → Swift → .NET → Gradle → Maven → Rust → Go → Python → Ruby → PHP → C++ → TypeScript → C → Generic

O primeiro que encontrar o arquivo marcador vence. `GenericAdapter` é o fallback.

## StackAdapter
```typescript
interface StackAdapter {
  name: string  // 'typescript' | 'go' | 'python' | 'rust' | 'java' | etc.
  detect(projectRoot: string): boolean
  commands: { build: string; test: string; lint: string; format: string }
}
```

## Como o EngineManager usa
```typescript
const adapter = detectStack(projectRoot)
// adapter.name é passado para unifiedPrompt() e buildFallbackTask()
// createOrchestratorConfig() chama detectStack() internamente também
```

## Armadilha comum
Se o projeto tem `package.json` E `go.mod`, o Go adapter detecta primeiro (está mais cedo na lista). Se precisar forçar TypeScript num monorepo, verificar se `go.mod` não existe na raiz.

## O que NÃO fazer
- Não assumir que `adapter.commands.build` sempre tem um comando válido — pode ser string vazia para stacks sem build explícito
- Não criar um adapter para framework específico (Next.js, Gin, etc.) — só por linguagem/runtime

## Dependências
Importa de: `@kova/shared` apenas
