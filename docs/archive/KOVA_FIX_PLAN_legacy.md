# Kova Enterprise Readiness Log

> Atualizado: 2026-05-17
> Status: a fundacao de confiabilidade foi implementada e validada nos pacotes principais, mas o Kova inteiro ainda nao deve ser declarado "100% enterprise".

## Estado Atual

O pass de fundacao entregou as partes criticas para o Kova parar de parecer travado e passar a provar conclusao real:

- Completion proof para arquivos, comandos, dev server, validacoes e claims do agente.
- Harness com layer `completion`, falhando quando a tarefa esta incompleta mesmo sem erro de sintaxe.
- `npm run dev` e comandos similares tratados como sessoes persistentes, nao como `run_command` comum.
- Preview workspace para iniciar dev server com mudancas ainda nao aplicadas.
- Readiness de servidor com URL, porta, diagnostics e sessao viva.
- Repair/decision mais honesto: sem auto-apply de pure-create sem evidencia.
- Eventos explicitos para fases reais e atividade de servidor.
- Protecao contra card/resultado antigo aparecer acima da proxima mensagem.
- Golden scenarios para landing page + install + dev server.

Validacao executada:

- `@kova/harness test/build`
- `@kova/decision test/build`
- `@kova/agent test/build`
- `@kova/execution test/build`
- `@kova/electron test/build`
- `@kova/evals test/build`

Commit publicado:

- `1fe315a6 feat: harden Kova execution reliability`

## O Que Ainda Falta Para o Kova

### 1. Trust UX profundo

Objetivo: a interface precisa mostrar verdade operacional, nao apenas texto do modelo.

- Timeline central unica para mensagens, tool calls, eventos, proof pack, resultados e servidores.
- Activity feed como fonte de verdade, com agrupamento por comando, arquivo, validacao, repair e approval.
- Proof pack visivel e escaneavel: Done, Validated, Not validated, Blocked, Needs repair.
- Server session card completo: status, URL, porta, cwd, logs, diagnostics e botao stop.
- Resultado final sempre honesto: separar feito, validado, nao validado e bloqueado.
- Eliminar cards flutuantes duplicados ou fora de ordem.

### 2. UI/UX repaginada total

Objetivo: visual e ergonomia no nivel Codex/Claude Code/Cursor, com identidade Kova.

- Layout mais moderno, denso e legivel.
- Navegacao lateral com contexto, sessoes, arquivos, servidores e proof pack.
- Composer mais claro para modo, modelo, contexto, anexos e permissoes.
- Terminal integrado com logs agrupados e estados persistentes.
- Menos decoracao, mais produto operacional.
- Componentes enterprise: tabela/listas compactas, estados vazios bons, erros acionaveis, foco visual correto.
- Acessibilidade real: foco, contraste, teclado, leitura de status.

### 3. Runtime global para qualquer stack

Objetivo: o Kova precisa funcionar bem em projetos pequenos, grandes e stacks diferentes.

- Detectores de stack mais completos: Next, Vite, Astro, Remix, Python, Go, Rust, Rails, Laravel, .NET, Java, mobile.
- Plano de comandos por stack: install, build, test, lint, typecheck, dev server, watch.
- Diagnostico acionavel para Node/Python/Go/Rust version mismatch.
- Porta ocupada: sugerir ou usar porta alternativa quando seguro.
- Scripts ausentes: explicar e propor comando correto.
- Monorepo awareness: detectar package root correto antes de rodar comando.

### 4. Agent behavior e prompts

Objetivo: reduzir promessa falsa e aumentar execucao real.

- Prompt de contrato mais rigido: nao afirmar que rodou comando sem tool call.
- Penalizar "feito" sem proof.
- Ensinar o agente a continuar apos dev server pronto e destravar fila.
- Melhorar uso de todos baseado em tool calls reais, nao so plano textual.
- Melhorar repair automatico com causa, tentativa anterior e limite claro.
- Fallback honesto quando modelo fraco nao consegue completar.

### 5. Harness e evals mais agressivos

Objetivo: regressao de produto precisa ser pega antes do usuario.

- Golden tests end-to-end reais com fixtures de Vite/Next/Python/Go.
- Teste de UI para ordem cronologica de chat/cards em fluxo real.
- Teste de preview workspace com apps reais.
- Teste de terminal persistente com porta ocupada e versao Node incompatvel.
- Testes de "agent promised but did not execute".
- Evals de tarefas longas: multi-file feature, bugfix, refactor, install, dev server e build.

### 6. Aplicacao, review e safety

Objetivo: enterprise nao pode perder trabalho nem aplicar coisa errada.

- Review/apply com diff por hunk mais forte.
- Partial approval real e compreensivel.
- Rollback visivel por checkpoint.
- Safe zones mais explicitas.
- Confirmacoes dentro do painel, nunca janela externa indevida.
- Auditoria de comandos destrutivos e permissoes.

### 7. Performance e escala

Objetivo: projetos grandes nao podem deixar o Kova lento ou confuso.

- Context engine incremental e medido.
- Cache de indices por projeto.
- Busca simbolica/AST onde fizer sentido.
- Controle de budget de tokens por fase.
- Telemetria local de latencia por etapa: context, agent, tools, harness, apply, render.

## Proximo Marco Recomendado

**Kova Trust UX + Runtime Dogfood Pass**

Escopo recomendado:

1. Redesenhar timeline central e painel lateral de proof/server.
2. Criar fixtures reais de Vite, Next e Python.
3. Rodar dogfood: "crie landing page + npm install + npm run dev".
4. Medir se o usuario consegue entender: o que foi feito, o que foi validado, o que ficou bloqueado e onde clicar para testar.
5. So depois aplicar polish visual grande.

## Definicao De Pronto Para Dizer "Enterprise"

O Kova so deve ser tratado como enterprise-ready quando:

- Concluir tarefas comuns sem travar em pelo menos 5 stacks.
- Nao declarar sucesso sem proof.
- Rodar dev servers como first-class em terminal interno.
- Reparar automaticamente falhas fixaveis.
- Mostrar bloqueios com causa clara.
- Manter chat/cards em ordem cronologica sempre.
- Passar golden tests e dogfood flows reais.
- Ter UI de confianca consistente, densa, moderna e acessivel.
