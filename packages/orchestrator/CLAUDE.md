# @kova/orchestrator — Harness de Validação

## O que é
Executa as camadas de validação (build, typecheck, tests, rules, security, lint) sobre mudanças de arquivo e retorna um `HarnessResult` com score, erros por camada e metadados de execução (command, stdout, stderr, exitCode).

## API pública

### createOrchestratorConfig
```typescript
createOrchestratorConfig(
  projectRoot: string,
  iteration?: number,   // padrão 1
  generatedPaths?: string[]  // extensões dos arquivos modificados — usado para detectar stack
): OrchestratorConfig
```
- Detecta stack via `detectStack(projectRoot)`
- Se stack = 'generic' e há `generatedPaths`, tenta inferir stack pelas extensões
- Retorna comandos de build/test/lint/typecheck via `resolveCommands(adapter, projectRoot)` + `profile.typecheckCommands`

### HarnessOrchestrator.run
```typescript
orchestrator.run(
  changes: FileChange[],
  config: OrchestratorConfig,
  explicitMode?: HarnessMode  // 'fast' | 'standard' | 'full'
): Promise<OrchestratorResult>
```

## Camadas por modo
| Modo | Camadas |
|------|---------|
| fast | rules + lint |
| standard | build + typecheck + tests + rules |
| full | build + typecheck + tests + rules + security + lint |

O modo é escolhido automaticamente com base na iteração e regressão de score.

## OrchestratorResult
```typescript
{
  harnessResult: HarnessResult
  scratchpadFallback: boolean  // true se score regredindo por 3+ iterações
  mode: HarnessMode
}
```

## Pesos de score
```
build:     25 pontos (15 quando typecheck ativo)
typecheck: 10 pontos (0 quando ausente — peso vai para build)
tests:     30 pontos
rules:     25 pontos
security:  10 pontos
lint:      10 pontos
```

## Metadados de execução em LayerResult
Layers que rodam comando externo (build, typecheck, tests, lint) agora retornam:
- `command`: comando executado
- `stdout`/`stderr`: output capturado
- `exitCode`: código de saída do processo
- `startedAt`: timestamp ISO de início

## Hard fails (score → 0 imediato)
- Build falhou
- Security com erro `critical`
- Contrato violado (safe zone, caminho proibido)

## Como o EngineManager usa
```typescript
// Em runSession (caminho principal):
const config = createOrchestratorConfig(projectRoot, iter + 1, changes.map(c => c.path))
const orchResult = await new HarnessOrchestrator().run(changes, config)
harnessResult = orchResult.harnessResult
```
Nova instância de `HarnessOrchestrator` por chamada — não reutilizar entre sessões.

## O que NÃO fazer
- Não passar `iteration = 0` — começa em 1
- Não assumir que `layers` tem conteúdo se o projeto não tem build/test configurado
- Não chamar `run()` sem `await` — é sempre async
- Se `harnessResult.layers = []`, o score será 100 por padrão (sem camadas para falhar)

## Dependências
Importa de: `@kova/shared`, `@kova/harness`, `@kova/adapters`, `@kova/project`
