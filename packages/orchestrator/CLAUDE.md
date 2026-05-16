# @kova/orchestrator - Harness de Validacao

## O que e
Executa camadas reais de validacao (`build`, `typecheck`, `tests`, `rules`, `security`, `lint`) sobre mudancas de arquivo e retorna um `HarnessResult` com Evidence Score, erros por camada e metadados de execucao.

## API publica

### createOrchestratorConfig
```typescript
createOrchestratorConfig(
  projectRoot: string,
  iteration?: number,
  generatedPaths?: string[],
): OrchestratorConfig
```

- Detecta stack via `detectStack(projectRoot)`.
- Se stack for `generic` e houver `generatedPaths`, tenta inferir stack pelas extensoes.
- Retorna comandos candidatos via adapter global, ProjectProfile e CommandCandidate.

### HarnessOrchestrator.run
```typescript
orchestrator.run(
  changes: FileChange[],
  config: OrchestratorConfig,
  explicitMode?: HarnessMode,
): Promise<OrchestratorResult>
```

## Camadas por modo
| Modo | Camadas |
|------|---------|
| fast | rules + lint |
| standard | build + typecheck + tests + rules |
| full | build + typecheck + tests + rules + security + lint |

O modo e escolhido automaticamente com base na iteracao e regressao de score.

## Evidence Score
Pesos base:
```text
build:     20
typecheck: 15
tests:     30
rules:     10
security:  15
lint:      10
```

O score final tambem aplica penalidades por validacao parcial/ausente, patch grande, arquivos sensiveis, contrato publico/configuracao e codigo fonte alterado sem teste. `score = 100` so deve ocorrer com validacao real completa, camadas passando e sem penalidade bloqueante.

## Metadados de execucao em LayerResult
Layers que rodam comando externo retornam:

- `layer`/`name`: camada executada.
- `status`: `passed`, `failed` ou `skipped`.
- `command`: comando executado.
- `cwd`: diretorio real usado pelo executor.
- `stdout`/`stderr`: outputs capturados separadamente.
- `exitCode`: codigo de saida do processo.
- `startedAt`: timestamp ISO de inicio.
- `durationMs`: duracao real em milissegundos.
- `skippedReason`: motivo quando uma camada nao rodou.
- `findings`: resumo estruturado para UI e Proof Pack.

## Hard fails
- Build falhou.
- Security com erro `critical`.
- Contrato violado por safe zone ou caminho proibido.

## Como o EngineManager usa
```typescript
const config = createOrchestratorConfig(projectRoot, iter + 1, changes.map(c => c.path))
const orchResult = await new HarnessOrchestrator().run(changes, config)
harnessResult = orchResult.harnessResult
```

Crie nova instancia de `HarnessOrchestrator` por chamada; nao reutilize entre sessoes.

## O que nao fazer
- Nao passar `iteration = 0`; comeca em 1.
- Nao assumir que `layers` tem conteudo se o projeto nao tem build/test configurado.
- Nao chamar `run()` sem `await`; e sempre async.
- Sem validacao real, o pipeline injeta aviso sintetico e retorna `validationConfidence:none`; isso nao pode gerar auto-apply.

## Dependencias
Importa de: `@kova/shared`, `@kova/harness`, `@kova/adapters`, `@kova/project`.
