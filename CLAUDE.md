# Rules.md - Kova Master Rules

Este e o arquivo mestre para qualquer IA que ajude a desenvolver o Kova.
Se outro documento divergir deste arquivo, este arquivo vence.

Objetivo: manter o Kova como um agente de codigo real, guiado por contexto,
contrato, ferramentas, harness, diff, checkpoints e evidencia verificavel.

Este arquivo deve ser lido sempre, mas deve continuar objetivo. Detalhes longos
devem ficar em documentos auxiliares e ser consultados apenas quando a tarefa
exigir.

## Documentos auxiliares (ler quando a tarefa envolver)

* `ARCHITECTURE.md` — fluxo de dados, IPC, estados da UI, scores, providers
* `EVENT_CONTRACT.md` — todos os ExecutionEvent: quem emite, quando, quais campos
* `KNOWN_ISSUES.md` — problemas conhecidos e limitacoes de design atuais
* `packages/shared/CLAUDE.md` — tipos criticos e invariantes
* `packages/agent/CLAUDE.md` — providers, tools, modos de agente
* `packages/execution/CLAUDE.md` — ExecutionEngine, fases, dependencias
* `packages/orchestrator/CLAUDE.md` — harness, camadas, scores
* `packages/decision/CLAUDE.md` — logica de decisao, feedback de reparo
* `packages/application/CLAUDE.md` — apply, checkpoint, safe zones
* `packages/adapters/CLAUDE.md` — deteccao de stack, ordem de prioridade
* `packages/context/CLAUDE.md` — contexto JIT, budget de tokens
* `packages/memory/CLAUDE.md` — learnings, promocao, limites
* `apps/electron/CLAUDE.md` — UI, IPC, componentes, EngineManager

## 1. Realidade atual do projeto

O Kova e um monorepo TypeScript com `pnpm`, `turbo`, `vitest` e `tsup`.

Apps reais:

* `apps/electron`: desktop Electron + Vite + React.
* `apps/cli`: CLI standalone `kova`.

Packages reais:

* `@kova/shared`: tipos e contratos compartilhados.
* `@kova/adapters`: deteccao de stack e comandos por projeto.
* `@kova/harness`: camadas `build`, `tests`, `rules`, `security`, `lint`.
* `@kova/orchestrator`: escolhe modo do harness e roda o pipeline.
* `@kova/decision`: score, feedback e decisao final.
* `@kova/agent`: providers, prompts, tool calling e executor de ferramentas.
* `@kova/context`: contexto JIT por grep, grafo, erros e memory.
* `@kova/memory`: aprendizados, promocao e anti-drift.
* `@kova/application`: preview, safe zones, checkpoints, apply e rollback.
* `@kova/execution`: loop multi-iteracao do agente.
* `@kova/observability`: traces e metricas.
* `@kova/kova-runner`: runner usado por CLI/IDE.

Nao existe hoje:

* `apps/ide`.
* `packages/rules`.
* `rules/default`.
* staging area isolada antes da validacao.

Arquivos gerados nao devem ser editados manualmente:

* `dist/**`
* `out/**`
* `node_modules/**`
* lockfiles, salvo quando a tarefa for dependencia.

## 2. Missao

A LLM propoe.
O agente executa com ferramentas.
O harness valida.
O decision engine decide.
O application engine aplica com checkpoint.
O diff e os testes provam.

Nenhuma tarefa pode ser considerada pronta sem evidencia real.

Evidencia real inclui:

* arquivos alterados;
* diff ou resumo de patch;
* comandos executados;
* resultado de testes/build/lint quando aplicavel;
* riscos restantes;
* validacoes nao executadas e motivo real.

Regra central:

```txt
Kova nao confia em texto bonito.
Kova confia em evidencia verificavel.
```

## 3. Norte de produto

O Kova nao deve copiar Claude Code, Codex ou OpenCode. Ele deve competir com
eles onde importa e vencer onde tem arquitetura propria: validacao independente,
rollback, memoria, multi-provider e harness.

A qualidade final nao depende apenas do modelo. O mesmo modelo pode falhar em
um harness fraco e performar muito melhor em um harness forte.

Regra de produto:

```txt
Harness e produto.
Harness fraco mascara modelo bom.
Harness forte destrava modelo bom.
```

Diagnostico honesto:

```txt
Capacidade                         Kova hoje        Status
Tool calling real                  existe           manter e polir
Multi-turn com feedback real        existe           manter e polir
Multi-stack                         parcial          expandir adapters/evals
Harness independente                existe           diferencial central
Rollback/checkpoint                 existe           endurecer safe zones
Multi-provider                      existe           melhorar UX/config
Streaming de output                 falta            prioridade alta
Execution Contract                  falta            prioridade alta
Review Gate real                    falta parcial    prioridade alta
Evals do agente                     falta            prioridade alta
Provider protocol harness           falta parcial    prioridade alta
Fallback auditavel                  falta parcial    prioridade alta
```

Regra de posicionamento:

```txt
Kova deve ser menos "chat que edita arquivo" e mais "sistema de engenharia
que deixa modelos trabalharem sob contrato, validacao e evidencia".
```

Capacidades que faltam para produto de primeira linha:

1. Streaming de output

   O usuario deve ver pensamento operacional, tool calls, stdout/stderr,
   harness, score e decisao em tempo real. CLI e Electron devem consumir a
   mesma fonte de eventos.

   Pronto quando:

   * existir contrato de evento em `@kova/shared`;
   * `@kova/execution` emitir eventos incrementais;
   * CLI mostrar stream sem esperar fim da tarefa;
   * Electron renderizar progresso sem polling fragil;
   * testes cobrirem ordem minima de eventos.

2. Execution Contract

   Toda tarefa deve virar contrato antes do loop de codigo. O contrato deve
   limitar stack, paths, comandos, safe zones, criterios de aceite e gates.

   Pronto quando:

   * existir tipo explicito em `@kova/shared`;
   * `structureTask` produzir ou alimentar o contrato;
   * `ToolExecutor`, `ContextEngine`, `HarnessOrchestrator` e
     `ApplicationEngine` respeitarem o contrato;
   * violacao de contrato virar `reject` ou `human_required`;
   * houver testes para mismatch de linguagem e path fora do escopo.

3. Review Gate real

   Review Gate nao e checklist em markdown. Deve ser codigo que analisa o diff
   apos o harness e antes de aplicar ou sugerir.

   Pronto quando:

   * houver modulo testado em `@kova/decision` ou package dedicado;
   * o gate detectar escopo excessivo, dependencia nova, safe zone, arquivo
     gerado, ausencia de teste esperado, risco de security e mismatch de stack;
   * o resultado influenciar `DecisionResult`;
   * CLI/Electron mostrarem os motivos de review de forma clara.

4. Evals do agente

   Kova precisa medir modelos, prompts e regressao do loop completo. Teste de
   package nao substitui eval de agente.

   Pronto quando:

   * houver suite versionada de casos em `packages/evals` ou local equivalente;
   * existir runner reproduzivel para CLI/CI;
   * casos cobrirem mismatch de stack de forma stack-agnostic;
   * casos cobrirem safe zones, comandos bloqueados, repair loop, review mode,
     provider fallback e multi-turn;
   * cada eval salvar score, diff, decisao, comandos e trace;
   * regressao bloquear mudancas em prompts/gates.

5. Provider protocol harness

   Multi-provider nao e apenas trocar URL e API key. Cada provider pode ter
   formato proprio de mensagens, tool calls, tool results, streaming, erros,
   cache, contexto e campos obrigatorios para multi-turn.

   Pronto quando:

   * cada provider tiver adapter explicito;
   * tool calls forem normalizadas para contrato interno;
   * erros de provider forem normalizados e auditaveis;
   * multi-turn preservar campos necessarios do protocolo;
   * fallback/retry forem registrados sem mascarar o modelo real;
   * houver testes de round-trip multi-turn por provider.

6. Produto, nao so arquitetura

   O diferencial tecnico so importa se o usuario sentir confianca.

   Pronto quando:

   * erro aparece com causa e proximo passo;
   * diff e preview sao legiveis;
   * pausas para revisao sao previsiveis;
   * rollback e checkpoint sao visiveis;
   * configuracao de provider/modelo e simples;
   * uma tarefa real pode ser acompanhada do inicio ao fim sem abrir logs.

## 4. Fluxo real do Kova

Fluxo implementado:

```txt
task -> structureTask -> ContextEngine -> Agent(plan/code/fix)
     -> ToolExecutor writes/reads/runs
     -> HarnessOrchestrator writes changes to disk and validates
     -> DecisionEngine
     -> ApplicationEngine apply/checkpoint/rollback or pause for review
```

Importante: o orquestrador atual escreve as mudancas no disco antes de rodar
o harness. Isso e intencional no codigo atual. Se a validacao falhar, o loop
de reparo deve sobrescrever na iteracao seguinte. O `ApplicationEngine` ainda
e responsavel por safe zones, checkpoints, rollback e apply final.

Estados principais em `ExecutionState`:

* `structuring`
* `planning`
* `coding`
* `validating`
* `deciding`
* `applying`
* `completed`
* `paused`
* `failed`

Decisoes possiveis:

* `auto_apply`: score >= 90 e sem falha critica de review.
* `suggest`: score >= 70, pausa para revisao.
* `reject`: precisa nova iteracao.
* `human_required`: erro repetido, estagnacao, safe zone ou violacao de contrato.

## 5. Regras absolutas para qualquer IA

Nunca:

* inventar arquivo, import, tipo, modulo ou resultado de comando;
* afirmar que teste passou sem log real;
* declarar conclusao sem evidencia;
* criar dependencia sem aprovacao explicita;
* alterar `dist/**`, `out/**` ou `node_modules/**`;
* alterar lockfile sem tarefa de dependencia;
* mascarar erro real;
* mascarar fallback de provider/modelo;
* dizer que um modelo executou algo se outro assumiu a tarefa;
* usar `any` em TypeScript novo;
* criar default export novo;
* criar catch silencioso;
* colocar secrets, tokens ou senhas em codigo;
* executar comando destrutivo;
* mudar arquitetura global por uma tarefa pequena;
* trocar stack sem evidencia do projeto;
* criar arquivos, runtimes, frameworks ou gerenciadores de pacote que nao existem no projeto sem motivo explicito;
* remover teste/regra para fazer build passar.

Sempre:

* ler o codigo antes de editar;
* detectar a stack real antes de escolher comandos;
* preservar padroes existentes;
* manter patch pequeno;
* preferir `src/**` e `__tests__/**`;
* usar imports `@kova/*` entre packages;
* evitar imports relativos entre packages;
* adicionar ou ajustar teste quando ha comportamento novo;
* reportar validacoes executadas e validacoes nao executadas;
* reportar fallback/retry de provider quando acontecer;
* revisar o diff antes de concluir.

## 6. Padroes de codigo

TypeScript:

* named exports.
* sem default export novo.
* sem `any` em codigo novo.
* assinaturas publicas com tipos claros.
* erro com contexto, nunca `throw 'string'`.
* early return em vez de aninhamento profundo.

Tamanho:

* logica/core: arquivo alvo ate 200 linhas quando viavel.
* UI React: ate 400 linhas quando o componente justificar.
* funcao core: ate 40 linhas quando viavel.
* funcao UI: ate 80 linhas quando viavel.

Testes:

* Vitest.
* testes em `__tests__`.
* nome descreve comportamento.
* preferir teste de comportamento a teste de detalhe interno.

## 7. Arquitetura e dependencias

Regra de direcao:

```txt
shared -> adapters/harness/agent/context/memory/application
       -> orchestrator/decision/execution/kova-runner
       -> apps/cli e apps/electron
```

`@kova/shared` deve continuar sem depender de outros packages.

`@kova/execution` e o loop alto nivel. Ele pode compor agent, context,
orchestrator, decision e application.

`apps/electron` e `apps/cli` consomem packages. Packages nao devem depender
de apps.

Se surgir dependencia circular, extraia contrato minimo para `@kova/shared`.

Nao criar package novo sem necessidade clara.

## 8. Harness e gates

Camadas existentes:

* `build`: hard fail.
* `tests`: soft fail.
* `rules`: soft fail, mas pode gerar erro severo.
* `security`: critical secret e hard fail via score 0.
* `lint`: soft fail.

Pesos atuais do score:

```txt
build: 25
tests: 30
rules: 25
security: 10
lint: 10
```

Hard fail atual:

* build falhou;
* security com erro critical;
* contrato violado;
* safe zone alterada sem permissao;
* fallback mascarado;
* comando bloqueado executado.

Modos:

* `fast`: rules + lint.
* `standard`: build + tests + rules.
* `full`: build + tests + rules + security + lint.

Nao prometa que `full` sempre roda. O modo e escolhido pelo orquestrador ou
passado explicitamente.

## 9. Agente e ferramentas

Ferramentas reais:

* `read_file`
* `write_file`
* `delete_file`
* `list_files`
* `run_command`

Modos `plan` e `review` usam somente ferramentas read-only.

`write_file` sempre recebe o conteudo completo do arquivo.

O `ToolExecutor` registra `FileChange` com:

* `path`
* `type`: `create`, `modify`, `delete`
* `diff`: conteudo novo atual
* `before`: snapshot original quando existia

Comandos aceitos devem ser de build, test, lint, format ou leitura segura.
Comandos destrutivos ficam bloqueados por padrao.

Bloqueados por padrao:

```txt
rm -rf
sudo
chmod -R
chown -R
curl | bash
wget | bash
powershell iex
git push
git reset --hard
git clean -fd
npm publish
pnpm publish
```

## 10. Provider, protocolo e fallback

Multi-provider e parte central do Kova, mas nao pode ser tratado como simples
troca de endpoint.

Cada provider pode ter diferencas em:

* formato de mensagens;
* tool calls;
* tool results;
* streaming;
* system prompt;
* JSON mode;
* campos de reasoning/thinking exigidos pelo protocolo;
* retry;
* fallback;
* limites de contexto;
* cache;
* formato de erro.

Regras:

* normalizar provider para contratos internos do Kova;
* preservar campos necessarios para continuidade multi-turn;
* nao expor raciocinio privado do modelo;
* registrar provider/modelo solicitado e provider/modelo executado;
* registrar fallback e retry quando acontecerem;
* nunca mascarar output de um modelo como se fosse de outro;
* erro de provider deve virar erro auditavel, nao fallback silencioso.

Toda chamada de modelo deve conseguir informar:

```txt
provider solicitado
modelo solicitado
provider executado
modelo executado
fallback/retry, se houve
ferramentas disponiveis
ferramentas chamadas
erro sanitizado, se houve
```

## 11. Multi-turn

Multi-turn nao pode ser improvisado.

Nunca:

* perder historico sem decisao explicita;
* reenviar mensagens quebrando protocolo do provider;
* misturar trace interno com contexto enviado ao modelo;
* guardar conversa longa em storage inadequado;
* ignorar erros anteriores no repair loop.

Sempre:

* preservar contexto minimo necessario;
* incluir erros reais no loop de reparo;
* registrar tool calls e tool results corretamente;
* testar pelo menos dois turnos para feature de agente;
* compactar historico quando fizer sentido, sem perder fatos criticos.

## 12. Safe zones e apply

`ApplicationEngine.apply()` deve bloquear safe zones por padrao.

Safe zones atuais incluem:

* `.env*`
* lockfiles
* `package.json`
* `docker-compose*`
* `.github/**`
* `config/**`

Ao aplicar:

* detectar alteracao externa;
* criar checkpoint;
* escrever mudancas;
* restaurar checkpoint se apply falhar;
* registrar resultado.

Nao force safe zone sem pedido explicito do usuario.

## 13. UI Electron

UI real:

* React em `apps/electron/src/renderer/src`.
* CSS global em `styles/global.css`.
* componentes em `components/**`.
* bridge IPC em `preload/index.ts`.
* main process em `src/main/**`.

Regras:

* usar variaveis CSS existentes;
* evitar cores hardcoded;
* preservar identidade visual escura do Kova;
* nao usar emoji como icone funcional;
* usar util compartilhado quando ja existe, como `file-utils.ts`;
* componentes grandes podem exceder limites de core, mas devem continuar
  legiveis e testaveis;
* mostrar progresso real, diff, erro, checkpoint e decisao quando aplicavel.

## 14. Como trabalhar em uma tarefa

Antes de editar:

1. Leia os arquivos afetados.
2. Identifique package/app correto.
3. Detecte a stack real do projeto.
4. Confira imports e APIs existentes.
5. Defina o menor patch util.
6. Confirme o contrato da tarefa: objetivo, paths, comandos, gates e riscos.

Durante:

1. Edite apenas arquivos relacionados.
2. Escreva teste quando alterar comportamento.
3. Rode teste/build focado quando possivel.
4. Se falhar, leia o erro real e corrija a menor causa.
5. Nao troque estrategia sem evidencia.

Ao finalizar:

1. Revise o diff.
2. Informe arquivos alterados.
3. Informe comandos executados.
4. Informe resultado das validacoes.
5. Informe riscos ou validacoes pendentes.

## 15. Review Gate

Todo diff deve responder:

* Atende ao pedido?
* Alterou apenas o escopo correto?
* Usa a stack e package corretos?
* Criou dependencia nova?
* Criou abstracao desnecessaria?
* Quebrou contrato publico?
* Tem teste suficiente para o risco?
* Build/test/lint foram executados ou justificados?
* Introduz risco de security, path traversal, secret ou comando arbitrario?
* Alterou safe zone sem permissao?
* Alterou arquivo gerado?
* Mascarou fallback de provider/modelo?
* A resposta final tem evidencia real?

Se uma resposta critica falhar, nao entregue como pronto.

## 16. Evals do agente

Kova precisa medir o loop completo do agente, nao apenas testes de package.

Os evals devem ser stack-agnostic. Linguagens e frameworks especificos podem
ser usados como casos sentinela, mas a regra geral e respeitar qualquer stack
real detectada no projeto.

Principio obrigatorio:

```txt
O agente nao pode inventar ferramentas, arquivos, frameworks, runtimes,
gerenciadores de pacote, banco, backend, frontend, Docker ou CI que nao existem
no projeto sem pedido explicito ou evidencia forte.
```

Categorias obrigatorias de eval:

* projeto sem Node.js: nao criar `package.json`, npm, pnpm, tsconfig ou TypeScript;
* projeto sem frontend: nao criar React, Vite, UI ou assets sem pedido explicito;
* projeto sem backend: nao criar API, banco, servidor ou camada server sem pedido explicito;
* projeto sem Docker: nao criar `Dockerfile` ou `docker-compose*` sem pedido explicito;
* projeto sem CI: nao criar `.github/**` sem pedido explicito;
* projeto com lockfile existente: nao alterar lockfile sem tarefa de dependencia;
* projeto com stack desconhecida: inspecionar, limitar escopo e pausar em vez de inventar;
* projeto com safe zones: bloquear alteracao sem permissao;
* comando bloqueado: impedir execucao e registrar motivo;
* tool error: reparar usando stderr/stdout real;
* review mode: nao escrever arquivo;
* multi-turn: preservar contexto minimo e erros anteriores;
* provider fallback: registrar provider/modelo real executado;
* security: bloquear secret hardcoded;
* arquivos gerados: nao editar `dist/**`, `out/**` ou equivalentes.

Casos sentinela iniciais podem incluir Go, Python, React, Rust, Java, .NET ou
qualquer outra stack util para detectar regressao. Esses casos sao exemplos,
nao limites do Kova.

Cada eval deve salvar:

* tarefa;
* stack detectada;
* provider/modelo solicitado;
* provider/modelo executado;
* arquivos alterados;
* comandos executados;
* resultado do harness;
* decisao;
* score;
* trace sanitizado.

Regra:

```txt
Mudanca em prompt, provider adapter, ToolExecutor, HarnessOrchestrator,
DecisionEngine ou ApplicationEngine deve ter eval relevante.
```

## 17. Backlog prioritario do Kova

Prioridade alta:

1. Streaming de output do agente, ferramentas, comandos e harness.
2. Execution Contract explicito antes do agent loop.
3. Review Gate real em `@kova/decision` ou package apropriado.
4. Evals permanentes para mismatch de stack em multiplas linguagens e frameworks.
5. Provider protocol harness para multi-provider robusto.
6. Fallback auditavel, sem mascarar provider/modelo real.
7. Evals multi-turn e tool-call round-trip por provider.
8. Alinhar `Rules.md`/`RULES.md` no carregamento de contexto em ambientes
   case-sensitive.

Prioridade media:

1. Melhorar preview unificado no `ApplicationEngine`.
2. Separar melhor escrita temporaria, validacao e apply final.
3. Expandir adapters para Rust, Java, .NET e C++.
4. Melhorar metricas de qualidade por package.
5. Documentar comandos de release e empacotamento desktop.
6. Criar matriz de compatibilidade por provider/modelo.

## 18. Formato de resposta final para agentes

Use formato curto:

```txt
Concluido: resumo curto.

Arquivos alterados:
- path

Validacoes:
- comando - PASS/FAIL ou NOT RUN

Decisao:
- auto_apply/suggest/reject/human_required

Observacoes:
- risco ou pendencia, se houver
```

Se nao concluiu:

```txt
Ainda nao esta pronto.

Falhou em:
- comando ou etapa

Erro principal:
- resumo do erro real

Proximo passo:
- acao objetiva
```

Nunca concluir com:

```txt
deve estar funcionando
provavelmente esta certo
nao testei, mas esta ok
```

## 19. Frase guia

Kova nao confia em texto bonito.

Kova confia em:

```txt
contexto + contrato + ferramenta + diff + harness + checkpoint + evidencia
```

Pergunta final obrigatoria:

```txt
O que prova que isso esta correto?
```

Se nao houver evidencia, ainda nao esta pronto.
