# Kova â€” PendÃªncias Enterprise

> Ãšltima auditoria: 2026-05-20
>
> **HistÃ³rico recente de correÃ§Ãµes (verde):**
> - `8eb9389f` â€” 9 contratos crÃ­ticos: routing por engineering signal, chat informado, anti-hallucination, bare-block gating, structureTask resiliente, provider sentinel, frontend stack-agnostic, cleanup.
> - `b55e37b0` â€” Sticky session mode + unified default. `resolveRunMode` substitui `inferRunMode`. Mode Ã© propriedade de sessÃ£o; follow-ups herdam. Slash commands (`/plan`, `/review`, `/chat`) viraram switch explÃ­cito. ExecutionEngine reconhece resposta substantiva sem tools como "analysis-only success" (nÃ£o fica em repair loop quando user pergunta algo apÃ³s o build).
> - **(novo)** Bootstrap install + environment-error classifier + `.env.example` whitelist (itens 20/21/22 abaixo). Resolve os 3 bloqueadores ðŸ”´ do teste KÅŒJI.
> - **(novo)** ContinuaÃ§Ã£o enterprise para scaffolding grande + queue cancelÃ¡vel (itens 23/26 abaixo). `maxTurnsReached` com arquivos gerados nÃ£o vira repair burro; Kova continua em modo code, consolida mudanÃ§as entre iteraÃ§Ãµes e permite abort/flush da fila durante repair.
> - **(novo)** Sprint 1 parcial de seguranÃ§a/paridade + primeira repaginada visual (itens 1/3/4/17/27 abaixo). Secrets saem do renderer, settings usam `safeStorage` quando disponÃ­vel, Electron roda com sandbox, harness falho vira warning/review, e a UI comeÃ§a a seguir o padrÃ£o Antigravity 2.0 com identidade Kova.
> - **(novo)** Sprint 1B de higiene/manutenÃ§Ã£o fechada (itens 2/3/16 abaixo). Artefatos gerados saÃ­ram do Ã­ndice Git, IPC crÃ­tico ganhou guard Ãºnico com rate-limit/timeout/log/testes, defaults de provider passam a vir do catÃ¡logo compartilhado e o Electron agora passa em typecheck explÃ­cito.
> - **(novo)** Sprint visual 1C avanÃ§ou no fluxo real: painel direito antigo `HarnessDashboard` foi removido, o processo aparece no chat com resumo sticky + comandos reais, e `Review` agora usa diff/preview funcional com seleÃ§Ã£o de arquivos/hunks e apply aprovado.
> - **(novo)** Refinamento visual + comando subprojeto: plan/coding agora vive em overlay flutuante sobre o composer, review Ã© redimensionÃ¡vel/read-only durante execuÃ§Ã£o, e `run_command` entende `npm --prefix <subprojeto>` sem bloquear validaÃ§Ã£o por olhar sÃ³ o workspace root.
> - **(novo)** Review polish pass: removidos os Ãºltimos sinais visuais de checkbox/card antigo no review, adicionados busca, contadores `+/-`, estado read-only explÃ­cito durante execuÃ§Ã£o e preview memoizado para runs grandes.
> - **(novo)** RegressÃ£o de loop em build Next/Windows fechada (item 26.2 abaixo). `EPERM` em `.next/trace` agora Ã© classificado como falha de ambiente/lock, o harness para o repair loop e `run_command` instrui o modelo a nÃ£o retryar nem editar fonte para esse erro.
>
> Este arquivo Ã© a fonte de execuÃ§Ã£o do Kova: o que jÃ¡ foi corrigido, o que estÃ¡ parcial, e o que ainda falta para alcanÃ§ar paridade enterprise com Claude Code, Cursor, Codex e OpenCode.
> Identidade do produto: `KOVA.md`. Arquitetura: `ARCHITECTURE.md`. Estado por package: `ROADMAP.md`.

---

## Como ler este documento

Cada item tem:
- **Onde** â€” arquivo e linha aproximada
- **Sintoma** â€” o que o usuÃ¡rio vÃª (ou veria) hoje
- **Causa raiz** â€” por que existe
- **Fix proposto** â€” direÃ§Ã£o, nÃ£o cÃ³digo pronto
- **Status atual** â€” `âœ… RESOLVIDO`, `ðŸŸ¡ PARCIAL`, ou aberto por prioridade
- **Impacto** â€” quem Ã© afetado e em que cenÃ¡rio
- **EsforÃ§o** â€” estimativa em tardes/dias

Prioridade: ðŸ”´ CrÃ­tico â†’ ðŸŸ  Alto â†’ ðŸŸ¡ MÃ©dio â†’ ðŸŸ¢ Baixo.

---

## Estado atual das sprints

| Sprint | Escopo | Status real | ObservaÃ§Ã£o |
|--------|--------|-------------|------------|
| Sprint 1 â€” SeguranÃ§a & paridade | API keys, sandbox, harness informativo, IPC crÃ­tico, higiene repo, provider defaults | âœ… RESOLVIDO | Fechado em #1, #2, #3, #4, #16 e #17 com teste/build/typecheck. |
| Sprint 1 â€” Visual Kova/Antigravity | Shell, sidebar, composer, foco central, overlay de execuÃ§Ã£o, review real | ðŸŸ¡ PARCIAL | Fluxo antigo da lateral direita foi removido; plan/coding aparece em overlay flutuante sobre o composer e review Ã© redimensionÃ¡vel/read-only durante execuÃ§Ã£o. Continua parcial somente por #29: QA visual real em janela Electron/screenshot. |
| Sprint 2 â€” Motor principal | Retry/backoff, crash recovery, abort cooperativo, settings schema, logs, E2E, contexto/memÃ³ria/adapters/harness | ðŸ”´ ABERTO | PrÃ³xima etapa obrigatÃ³ria. Sem feature nova antes de estabilizar o motor. |
| Sprint 3 â€” Enterprise | MCP, skills, background jobs avanÃ§ados, branching, hooks, governance | ðŸ”´ CONGELADO | SÃ³ entra depois do Sprint 2 passar por testes reais/dogfood. |

Regra de fechamento: nenhum item vira `âœ… RESOLVIDO` sem evidÃªncia objetiva em cÃ³digo + teste/build focado. Quando a validaÃ§Ã£o falhar por sandbox do Windows (`EPERM: lstat C:\Users\allan`), registrar como ambiente e rerodar fora do sandbox antes de concluir.

---

## PolÃ­tica atual â€” motor antes de features

AtÃ© o motor principal estar confiÃ¡vel, Kova **nÃ£o deve iniciar features enterprise novas** como MCP, skills, branching, hooks ou governance. Essas features continuam importantes, mas ficam congeladas porque acrescentam superfÃ­cie de falha em cima de uma base que ainda precisa ficar previsÃ­vel.

O foco agora Ã© endurecer o ciclo essencial:

1. Entender o pedido e montar contexto certo.
2. Planejar sem virar burocracia visual.
3. Executar tools sem loop, sem retry burro, sem comando errado.
4. Manter memÃ³ria/contexto coerentes entre turnos.
5. Validar de forma informativa e confiÃ¡vel.
6. Aplicar/pausar/revisar sem perder estado.
7. Recuperar de crash, abort, erro de provider e ambiente ruim.
8. Mostrar tudo isso na UI com clareza, sem painel fake e sem botÃ£o decorativo.

### Fechado 100% atÃ© agora

- SeguranÃ§a bÃ¡sica: #1, #3, #4.
- Higiene de repo e catÃ¡logo: #2, #16.
- Harness informativo e erros de ambiente: #17, #20, #21, #22, #26.2.
- Fluxo de scaffolding grande e continuidade: #23, #26.
- Comandos de subprojeto: #26.1.
- Review/diff funcional e base visual: #24, #27, #28.

### Ainda nÃ£o pode ser considerado 100%

- Visual completo: depende de #29, QA real em janela Electron com screenshots.
- SemÃ¢ntica de modos: #34 ainda estÃ¡ parcial.
- Confiabilidade de runs longos: #5, #7, #8, #10, #11 e os itens de motor #36-#42 abaixo.
- Paridade enterprise: #30-#35 ficam congelados atÃ© o motor passar por dogfood real.

---

## ðŸ”´ CrÃ­tico â€” seguranÃ§a e confiabilidade bÃ¡sica

### 1. API keys em plain-text no disco âœ… RESOLVIDO

- **Onde:** `apps/electron/src/main/ipc-handlers.ts`, `apps/electron/src/main/ipc-security.ts`, `apps/electron/src/main/provider-resolver.ts`, `apps/electron/src/renderer/src/App.tsx`.
- **Sintoma original:** Chaves de todos os providers (`anthropicKey`, `openaiKey`, `kimiKey`, `deepseekKey`, `openrouterKey`, `geminiKey`, `xaiKey`, `nvidiaKey`, `openaiCompatibleKey`) ficavam em `JSON.stringify` puro em `app.getPath('userData')/kova-settings.json` e a UI ainda podia montar `apiKeyMap`.
- **Causa raiz:** PersistÃªncia via `writeFileSync(p, JSON.stringify(settings))` sem encriptaÃ§Ã£o.
- **Fix aplicado:**
  - `safeStorage.encryptString`/`decryptString` para campos secretos quando o SO disponibiliza criptografia.
  - MigraÃ§Ã£o automÃ¡tica de arquivo legado plain-text para formato `safe:v1:*`.
  - `get-settings` mascara secrets antes de devolver ao renderer.
  - `save-settings` preserva secrets existentes quando o renderer envia valor mascarado.
  - Providers resolvem chaves no main process via `getSettingsInternal`; renderer nÃ£o envia mais `apiKeyMap`.
- **EvidÃªncia:** `pnpm.cmd --filter @kova/electron test` PASS; `pnpm.cmd --filter @kova/electron build` PASS; busca final nÃ£o encontrou `apiKeyMap` no renderer.
- **Impacto:** Qualquer processo com acesso ao userData (malware, sync de backup naive, dump de filesystem) lÃª todas as chaves. Cursor e Claude Code desktop usam keychain do SO.
- **PendÃªncia residual:** se `safeStorage.isEncryptionAvailable()` retornar falso, o app mantÃ©m compatibilidade e salva plain-text. Para enterprise, decidir se esse caso deve bloquear salvamento ou exigir aviso explÃ­cito.

### 2. `apps/electron/out/` e `.turbo/` committados no repositÃ³rio âœ… RESOLVIDO

- **Onde:** `.gitignore`, Ã­ndice Git de `apps/electron/out/**`, `apps/*/.turbo/**` e `packages/*/.turbo/**`.
- **Sintoma original:** Cada `pnpm build`/`pnpm test` poluÃ­a o diff com bundles e logs gerados. Devs em paralelo geravam merge conflict em bundle minificado e logs de cache.
- **Causa raiz:** `.gitignore` listava `/out*/` apenas na raiz e nÃ£o cobria `apps/*/out/`; `.turbo/` jÃ¡ estava ignorado, mas arquivos antigos continuavam trackeados.
- **Fix aplicado:**
  - Adicionado `apps/*/out/` ao `.gitignore`.
  - `git rm --cached -r` aplicado em `apps/electron/out/**`, `apps/*/.turbo/**`, `packages/*/.turbo/**` e `apps/cli/dist/**`.
  - Arquivos continuam no disco local quando gerados por build/test, mas deixam de fazer parte do versionamento.
- **EvidÃªncia:** `git status --short` mostra os artefatos gerados como `D` staged no Ã­ndice; `git ls-files | rg "(^|/)(dist|out|\\.turbo)(/|$)|\\.turbo/|apps/electron/out|apps/cli/dist"` nÃ£o retorna nenhum arquivo gerado trackeado; `pnpm.cmd --filter @kova/electron build` PASS apÃ³s a limpeza original.
- **Impacto:** Todo o time. JÃ¡ gerou o ruÃ­do visto no commit `8eb9389f`.
- **EsforÃ§o:** concluÃ­do.

### 3. IPC sem rate-limit nem timeout âœ… RESOLVIDO

- **Onde:** `apps/electron/src/main/ipc-guard.ts`, `apps/electron/src/main/ipc-handlers.ts`, `apps/electron/__tests__/ipc-guard.test.ts`.
- **Sintoma original:** Handlers validavam shape via `ipc-security.ts` mas nÃ£o tinham rate-limit nem timeout centralizado. Um renderer comprometido podia floodar o main com leitura/escrita de arquivos, terminal, detecÃ§Ã£o de modelo ou chamadas ao LLM. `manager.sendMessage` podia ficar in flight sem corte no boundary de IPC.
- **Causa raiz:** Nenhum middleware de throttling. Nenhum timeout no handler â€” sÃ³ dentro de `run_command` (2min).
- **Fix aplicado:**
  - `IpcGuard` Ãºnico com token bucket por canal, timeout por policy e log estruturado (`rate_limit`/`timeout`).
  - ProteÃ§Ã£o aplicada a todos os `ipcMain.handle`: `open-folder`, `send-message`, `detect-model`, `pause`, `abort`, `force-apply`, `get-state`, settings, memory learnings, project watch, filesystem, terminal e session persistence.
  - Timeout de `send-message` chama `manager.abort()` para cortar trabalho em andamento.
  - SessÃµes agora passam por `unknown` + sanitizaÃ§Ã£o, removendo `any` novo no boundary do main.
  - Typecheck explÃ­cito corrigido para o Electron, incluindo imports pÃºblicos corretos (`ASK_PERMISSION_POLICY`, `AgentMessage`, `structureTask`) e optional array no terminal.
- **EvidÃªncia:** `pnpm.cmd --filter @kova/electron test -- ipc-guard.test.ts provider-resolver.test.ts ipc-security.test.ts` PASS (41 testes); `pnpm.cmd --filter @kova/electron test` PASS (325 testes, 1 skipped); `pnpm.cmd --filter @kova/electron exec tsc -p tsconfig.json --noEmit` PASS; `pnpm.cmd --filter @kova/electron build` PASS.
- **Impacto:** Surface de ataque + UX em renderer travado.
- **EsforÃ§o:** concluÃ­do.

### 4. `sandbox: false` no BrowserWindow âœ… RESOLVIDO

- **Onde:** `apps/electron/src/main/index.ts:23-25`
- **Sintoma original:** `contextIsolation: true` e `nodeIntegration: false` mitigavam, mas com `sandbox: false` o preload rodava com node primitives â€” qualquer bug no preload era escalation direta para acesso de filesystem total.
- **Causa raiz:** Sandbox foi desabilitado provavelmente por algum require Node-only no preload. NÃ£o hÃ¡ comentÃ¡rio justificando.
- **Fix aplicado:** `BrowserWindow.webPreferences.sandbox` ligado como `true`.
- **EvidÃªncia:** `pnpm.cmd --filter @kova/electron test` PASS; `pnpm.cmd --filter @kova/electron build` PASS; busca final nÃ£o encontrou `sandbox: false`.
- **Impacto:** Defesa em profundidade. Claude Code desktop e Cursor rodam com sandbox on.
- **PendÃªncia residual:** QA manual da janela real para validar atalhos, preload e IPC em uso interativo.

### 17. Harness bloqueante em modify mode âœ… RESOLVIDO

- **Onde:** `packages/decision/src/decision-engine.ts`, `packages/execution/src/proof-pack.ts`, `packages/decision/__tests__/decision-engine.test.ts`, `packages/decision/__tests__/no-validation-decide.test.ts`.
- **Sintoma original:** Build/test/lint falhando no harness podia virar `reject`/repair obrigatÃ³rio, contrariando o norte de produto "harness informativo, nunca bloqueia".
- **Causa raiz:** `decide()` tratava `firstFailedValidationLayer` como bloqueio duro em vez de warning revisÃ¡vel.
- **Fix aplicado:** falha de harness agora retorna `suggest` com razÃ£o explÃ­cita de warning; `mapProofPackDecision` respeita `suggest` antes de converter layers falhos em `repair_needed`.
- **EvidÃªncia:** `pnpm.cmd --filter @kova/decision test` PASS, 6 arquivos e 102 testes; `pnpm.cmd --filter @kova/electron test` PASS.
- **Hard fails que continuam bloqueando:** credenciais reais, `forbiddenPaths`, violaÃ§Ãµes crÃ­ticas de review gate e cap anti-runaway.

---

## ðŸŸ  Alto â€” degrada experiÃªncia sob carga real

### 5. Sem retry/backoff em chamadas de provider

- **Onde:** `packages/agent/src/providers/anthropic.ts`, `packages/agent/src/providers/openai-compatible.ts`. `packages/agent/src/providers/errors.ts:69` (`isRecoverableProviderError`) existe mas sÃ³ Ã© consumido por `tryFallbackProvider`.
- **Sintoma:** Um hiccup de rede / 429 / 503 quebra a sessÃ£o inteira. Em runs longos com Kimi/DeepSeek isso Ã© comum.
- **Causa raiz:** `generate` e `runAgentLoop` chamam o SDK direto sem wrapper de retry.
- **Fix proposto:**
  - Wrapper `withRetry(provider, { retries: 3, backoffMs: [500, 2000, 8000] })`
  - Aplicar em `generate` e dentro do loop SSE
  - Respeitar header `Retry-After` quando presente
  - Cancelar retries imediatamente se `AbortSignal` disparar
- **Impacto:** Confiabilidade percebida sob latÃªncia real de internet.
- **EsforÃ§o:** 2 dias (inclui testes determinÃ­sticos com fake-timers).

### 6. Sem tracking persistente de token / custo

- **Onde:** `ProviderResponse.tokensUsed` viaja por 44 arquivos. `SessionUsage` no `AppState` zera ao reiniciar.
- **Sintoma:** UsuÃ¡rio nÃ£o sabe quanto gastou. Cursor mostra "$0.42 used this session".
- **Causa raiz:** NÃ£o hÃ¡ ledger persistente nem agregaÃ§Ã£o por sessÃ£o/projeto/dia.
- **Fix proposto:**
  - Adicionar `usage-ledger.ts` em `packages/observability`
  - Flush por iteraÃ§Ã£o para `.kova/usage/YYYY-MM.jsonl` (uma linha por turn)
  - Painel no Settings: total por provider Ã— modelo Ã— perÃ­odo
  - Tabela de preÃ§os per-model atualizÃ¡vel via `model-catalog.ts`
- **Impacto:** Trust + governance para uso enterprise.
- **EsforÃ§o:** 2 dias.

### 7. Sem crash recovery / autosave de iteração [FEITO via #37]

- **Onde:** `packages/execution/src/state.ts` â€” `ExecutionState` em memÃ³ria. `useSessionPersistence` (renderer) salva conversa, nÃ£o o estado mid-flight.
- **Sintoma:** Crash do main process durante iteraÃ§Ã£o â†’ perde tudo o que foi gerado nessa iteraÃ§Ã£o.
- **Causa raiz:** Snapshot sÃ³ acontece no apply final, nÃ£o por iteraÃ§Ã£o.
- **Fix proposto:**
  - Snapshot do `ExecutionState` apÃ³s cada iteraÃ§Ã£o em `.kova/sessions/<id>/state-iter-<N>.json`
  - Flag `resumeFrom` no `StartTaskParams`
  - UI: se detectar sessÃ£o pendente ao abrir projeto, oferecer "retomar"
- **Impacto:** UsuÃ¡rio nÃ£o perde 5 minutos de geraÃ§Ã£o por um crash.
- **EsforÃ§o:** 1.5 dias.
- **Status:** fechado pelo #37. Snapshots transacionais agora preservam estado/eventos/todos/recibo final em `.kova/sessions/<id>` e recuperações aparecem na lista de chats do projeto.

### 8. Cancelamento cooperativo incompleto em tools longas

- **Onde:** `packages/agent/src/tools.ts` â€” `run_command` tem timeout, `grep_codebase`/`glob_files`/`read_file` nÃ£o checam `AbortSignal` no meio.
- **Sintoma:** UsuÃ¡rio aperta abort, mas o tool em flight continua mais 5-10s antes de parar.
- **Causa raiz:** Signal Ã© propagado para o provider mas nÃ£o para todos os tools internos.
- **Fix proposto:**
  - Propagar `signal` para todos os tools
  - Em loops > 100 iter (travessia de Ã¡rvore de arquivos, regex em arquivos grandes), checar `signal.aborted` periodicamente
  - Throw `AbortError` quando disparar
- **Impacto:** UX de abort responsivo.
- **EsforÃ§o:** 1 tarde.

---

## ðŸŸ¡ MÃ©dio â€” gaps de produto

### 9. Zero testes E2E / smoke

- **Onde:** Repo inteiro. Nenhum `playwright`, `spectron`, ou similar.
- **Sintoma:** O bug que originou esta auditoria (chat respondendo email off-topic) era integraÃ§Ã£o ponta-a-ponta â€” nÃ£o teria sido pego pelos 1450 unit tests.
- **Causa raiz:** Cobertura Ã© sÃ³ unitÃ¡ria + integraÃ§Ã£o de packages.
- **Fix proposto:**
  - Adicionar Playwright para Electron
  - 5 cenÃ¡rios mÃ­nimos:
    1. Landing scaffold do zero (Kimi K2.6) â€” verifica que arquivos aparecem
    2. Edit em arquivo existente â€” verifica diff e apply
    3. Pergunta de chat ("o que Ã© REST?") â€” verifica que vai pro chat-mode
    4. `/plan` â€” verifica que retorna PlanResultMessage
    5. Abort mid-run â€” verifica que tudo para limpo
    6. Run finalizado nunca fica silencioso â€” verifica mensagem final visivel, recibo estruturado e historico persistido
    7. Follow-up apos scaffolding â€” pede uma nova secao/componente e prova que os arquivos recem-criados entram no contexto sem redescoberta excessiva
  - Rodar no CI em paralelo (matrix por provider mockado)
- **Impacto:** Previne regressÃ£o do tipo que custou esta auditoria.
- **EsforÃ§o:** 2 dias.

### 10. `KovaSettings` sem schema de validaÃ§Ã£o

- **Onde:** `apps/electron/src/main/ipc-handlers.ts:69` (`getSettingsInternal`).
- **Sintoma:** Arquivo corrompido (`maxIterations: "five"`, `permissionMode: "wrong-value"`) passa direto pelo `JSON.parse + spread`, quebra runtime depois.
- **Causa raiz:** `JSON.parse` + spread sem validation.
- **Fix proposto:**
  - Schema zod em `packages/shared/src/settings-schema.ts`
  - `safeParse` por campo (fallback granular, nÃ£o pelo objeto inteiro)
  - Logar campos rejeitados sem derrubar o app
- **Impacto:** Robustez contra arquivo corrompido / downgrade entre versÃµes.
- **EsforÃ§o:** 1 tarde.

### 11. Logger nÃ£o estruturado

- **Onde:** `apps/electron/src/main/*` â€” sÃ³ 4 `console.*` em todo o main (boa disciplina), mas isso significa zero observabilidade quando o usuÃ¡rio reporta bug.
- **Sintoma:** NÃ£o hÃ¡ timestamps, nÃ­veis, ou rotaÃ§Ã£o. Bug reports vÃªm sem log de produÃ§Ã£o.
- **Causa raiz:** Sem logger configurado.
- **Fix proposto:**
  - `pino` ou logger prÃ³prio em `packages/observability`
  - Escrever em `.kova/logs/main.log` (rotaÃ§Ã£o diÃ¡ria, retÃ©m 7 dias)
  - Comando IPC `kova:export-logs` para gerar zip do `.kova/logs/`
  - Logger respeita level configurÃ¡vel (`info` padrÃ£o, `debug` opt-in)
- **Impacto:** Suporte e debugging viÃ¡veis.
- **EsforÃ§o:** 1 dia.

### 12. Sem auto-updater

- **Onde:** N/A â€” `electron-updater` nÃ£o estÃ¡ nas dependÃªncias.
- **Sintoma:** UsuÃ¡rio fica em versÃ£o buggada atÃ© manualmente trocar.
- **Causa raiz:** Updater nunca foi configurado.
- **Fix proposto:**
  - `electron-updater` com canal `latest` em GitHub Release
  - UI: notificaÃ§Ã£o nÃ£o-intrusiva quando hÃ¡ update disponÃ­vel
  - Mecanismo de rollback (manter versÃ£o anterior por N dias)
- **Impacto:** DistribuiÃ§Ã£o contÃ­nua sem fricÃ§Ã£o.
- **EsforÃ§o:** 1.5 dias (inclui configurar release pipeline).

### 13. Sem internacionalizaÃ§Ã£o

- **Onde:** Prompts (`apps/electron/src/main/session-prompts.ts`), UI (`apps/electron/src/renderer/src/components/*`).
- **Sintoma:** pt-BR e EN misturados sem proper i18n.
- **Causa raiz:** Strings hardcoded.
- **Fix proposto:**
  - `react-i18next` no renderer
  - LLM prompts ficam em EN com variÃ¡vel `outputLanguage` (modelo entende melhor EN e responde no idioma do usuÃ¡rio)
  - Detector automÃ¡tico baseado em locale do SO
- **Impacto:** Produto multi-tenant precisa de i18n proper.
- **EsforÃ§o:** 3 dias.

---

## ðŸŸ¢ Baixo â€” polish

### 14. InconsistÃªncia de logging em `terminal-manager.ts`

- **Onde:** `apps/electron/src/main/terminal-manager.ts:3` ainda tem `console.error`.
- **Sintoma:** InconsistÃªncia com o resto do main que jÃ¡ usa event bus.
- **Fix proposto:** Substituir por evento via event bus quando o logger estruturado (#11) existir.
- **EsforÃ§o:** 10 minutos (apÃ³s #11).

### 15. Auditar mudanÃ§as nÃ£o revisadas em `terminal-manager.test.ts`

- **Onde:** `apps/electron/__tests__/terminal-manager.test.ts` apareceu modificado no commit `8eb9389f` mas as mudanÃ§as nÃ£o foram parte do escopo direto da refatoraÃ§Ã£o.
- **Fix proposto:** Diff side-by-side contra `1fe315a6` para confirmar intenÃ§Ã£o.
- **EsforÃ§o:** 15 minutos.

### 16. DuplicaÃ§Ã£o `PRESET_URLS` / `PRESET_MODELS` âœ… RESOLVIDO

- **Onde:** `apps/electron/src/main/provider-resolver.ts`, `apps/electron/__tests__/provider-resolver.test.ts`, `packages/agent/src/index.ts`.
- **Sintoma original:** Duplicava o catÃ¡logo de `@kova/agent`.
- **Causa raiz:** `PROVIDER_DEFAULTS` Ã© importado mas re-empacotado em `PRESET_URLS` / `PRESET_MODELS`.
- **Fix aplicado:**
  - `resolveProviderBaseUrl`, `resolveProviderDefaultModel` e `isLocalProvider` consomem `PROVIDER_DEFAULTS` diretamente.
  - Removidos `PRESET_URLS`, `PRESET_MODELS` e `LOCAL_PROVIDERS`.
  - Overrides por env ficaram restritos a `NVIDIA_BASE_URL` e `OLLAMA_BASE_URL`.
  - `ASK_PERMISSION_POLICY` entrou no export pÃºblico de `@kova/agent`, evitando import cross-package por subpath interno.
- **EvidÃªncia:** `pnpm.cmd --filter @kova/electron test -- ipc-guard.test.ts provider-resolver.test.ts ipc-security.test.ts` PASS; `pnpm.cmd --filter @kova/agent build` PASS.
- **EsforÃ§o:** concluÃ­do.

---

## ðŸ”´ Motor principal â€” manutenÃ§Ã£o antes de features

Estes itens sÃ£o prioridade sobre MCP, skills, branching e hooks. Eles nÃ£o sÃ£o "features novas"; sÃ£o manutenÃ§Ã£o de confiabilidade do nÃºcleo que faz o Kova realmente trabalhar como agente.

### 36. Provider retry/backoff precisa ser sistÃªmico âœ… FEITO 100%

- **Onde:** `packages/agent/src/providers/retry.ts`, `packages/agent/src/providers/openai-compatible.ts`, `packages/agent/src/providers/anthropic.ts`, `packages/agent/src/providers/provider.ts`, `packages/agent/src/agent.ts`, `packages/execution/src/execution-engine.ts`, `packages/shared/src/types.ts`.
- **Sintoma original:** 429, 503, reset de rede ou hiccup de SSE derrubavam sessÃµes longas. Em provedores como DeepSeek/Kimi isso aparecia como falha abrupta mesmo quando retry resolveria.
- **Causa raiz:** O retry/fallback nÃ£o era um wrapper sistÃªmico em volta de `generate`/streaming/tool loop. A classificaÃ§Ã£o de erro existia, mas nÃ£o havia polÃ­tica reutilizÃ¡vel de backoff.
- **Fix aplicado:**
  - Criado `withProviderRetry` abortÃ¡vel, sem dependÃªncia nova, com limite de tentativas, exponential backoff, jitter configurÃ¡vel, `Retry-After` por segundos/data HTTP e erro normalizado.
  - Integrado nos providers `OpenAICompatibleProvider` e `AnthropicProvider` para chamadas nÃ£o-streaming e estabelecimento de streaming.
  - Streaming com tokens jÃ¡ emitidos nÃ£o Ã© reexecutado, para evitar duplicar texto/ferramentas na UI; nesse caso o erro vira nÃ£o-recuperÃ¡vel naquele stream parcial.
  - `AgentLoopOptions` ganhou `onProviderRetry`; `Agent.execute` propaga; `ExecutionEngine` emite `ExecutionEvent` `provider_retry` com provider/model/status/tentativa/delay/safeMessage.
  - Testes antigos de erro explÃ­cito usam `retryPolicy: { maxAttempts: 1 }` quando querem validar normalizaÃ§Ã£o sem retry.
- **CritÃ©rio de aceite:** 429, 503, `Retry-After`, jitter, abort durante backoff, erro nÃ£o-recuperÃ¡vel sem retry e callback de retry do agent loop cobertos por teste.
- **EvidÃªncia:** `pnpm.cmd --filter @kova/agent test -- provider-retry.test.ts provider-errors.test.ts provider-roundtrip.test.ts streaming-interruption.test.ts` PASS (49 testes); `pnpm.cmd --filter @kova/execution test -- execution-engine.test.ts` PASS (54 testes); `pnpm.cmd --filter @kova/shared build` PASS; `pnpm.cmd --filter @kova/agent build` PASS; `pnpm.cmd --filter @kova/execution build` PASS.
- **RelaÃ§Ã£o:** fecha/expande #5.

### 37. Estado de execução precisa sobreviver a crash/refresh ✅ FEITO 100%

- **Onde:** `packages/execution/src/state.ts`, `packages/execution/src/execution-engine.ts`, `apps/electron/src/renderer/src/hooks/useSessionPersistence.ts`.
- **Sintoma:** Se o app cair durante uma iteraÃ§Ã£o, o usuÃ¡rio pode perder plano, mudanÃ§as staged, eventos, comandos e decisÃ£o de apply.
- **Causa raiz:** PersistÃªncia atual cobre conversa, mas nÃ£o o estado transacional completo do run.
- **Fix proposto:** snapshots incrementais por iteraÃ§Ã£o em `.kova/sessions/<id>/state-iter-N.json`, resume seguro, limpeza de snapshots aplicados e UI para retomar/descartar. O snapshot final tambem deve preservar o recibo do run, eventos relevantes, proof pack e mensagem final para que refresh/crash nao faca a entrega "sumir" do chat.
- **CritÃ©rio de aceite:** teste simula interrupÃ§Ã£o apÃ³s files gerados e retoma com changes/eventos/todos consistentes.
- **Fix aplicado:** adicionado store transacional em `apps/electron/src/main/run-snapshot-store.ts`. O `EngineManager` agora recebe `sessionId` estável por run, grava snapshots atômicos em `.kova/sessions/<id>/current.json`, cria `state-iter-N.json` quando existe iteração, preserva eventos relevantes/todos/estado/recibo final e finaliza em `session.json` limpando snapshots transitórios. A UI lista recuperações junto dos chats do projeto, permite carregar como sessão recuperada e descartar pelo delete existente. Runs interrompidos voltam como evidência restaurada em `failed`, sem fingir que o engine em memória ainda existe.
- **Evidência:** `pnpm.cmd --filter @kova/electron test -- run-snapshot-store.test.ts engine-manager.test.ts ipc-security.test.ts context-continuity.test.ts use-engine-events.test.ts` PASS (90 testes); `pnpm.cmd --filter @kova/electron exec tsc -p tsconfig.json --noEmit` PASS.
- **RelaÃ§Ã£o:** fecha #7.

### 38. Cancelamento cooperativo precisa cobrir todas as tools [FEITO 100%]

- **Onde:** `packages/agent/src/tools.ts`, helpers `grep_codebase`, `glob_files`, leitura/listagem de diretÃ³rios e execuÃ§Ã£o de comandos.
- **Sintoma:** Abort pode parar provider, mas tools longas ainda podem continuar por segundos ou atÃ© terminar trabalho inÃºtil.
- **Causa raiz:** `AbortSignal` nÃ£o Ã© checado em todos os loops internos nem propagado de forma homogÃªnea.
- **Fix proposto:** contrato Ãºnico de abort para tools; checagem periÃ³dica em loops de filesystem/regex; retorno padronizado `Aborted`; testes com Ã¡rvore grande fake.
- **CritÃ©rio de aceite:** abort durante grep/glob/read grande para em tempo previsÃ­vel e nÃ£o deixa buffer inconsistente.
- **Fix aplicado:** `ToolExecutor.execute()` agora centraliza o contrato de abort para todas as tools, incluindo `write_file`, `edit_file`, `delete_file`, `read_file`, `list_files`, `grep_codebase`, `glob_files`, `todo_write`, `run_command` e `run_interactive_command`. Loops longos de `list_files`, staging overlay, `grepCodebase` JS fallback e `globFiles` fazem checkpoints cooperativos e cedem o event loop para o `AbortSignal` disparar. Falhas de abort retornam `Aborted:` de forma padronizada, e o overlay de arquivos staged é restaurado no `finally`.
- **Evidência:** `pnpm.cmd --filter @kova/agent test -- abort-signal.test.ts grep-codebase.test.ts glob-files.test.ts tools.test.ts` PASS (229 testes); `pnpm.cmd --filter @kova/agent test` PASS (16 arquivos, 478 testes); `pnpm.cmd --filter @kova/agent build` PASS; `pnpm.cmd --filter @kova/execution test -- execution-engine.test.ts` PASS (54 testes); `pnpm.cmd --filter @kova/execution build` PASS.
- **RelaÃ§Ã£o:** fecha #8.

### 39. Contexto e memÃ³ria precisam provar continuidade real âœ… FEITO 100%

- **Onde:** `packages/context`, `packages/memory`, `apps/electron/src/main/engine-manager.ts`, persistÃªncia de sessÃ£o.
- **Sintoma:** O agente Ã s vezes relÃª estrutura recÃ©m-criada ou age como se nÃ£o lembrasse o que acabou de fazer. Parte disso Ã© normal para validar padrÃ£o do projeto, mas nÃ£o pode virar perda de continuidade.
- **Causa raiz:** Falta uma auditoria ponta-a-ponta do que entra no context pack, o que vem da memÃ³ria, o que vem dos arquivos recÃ©m-gerados e o que a UI mostra como contexto usado.
- **Fix proposto:** rastrear context pack por turn, separar "releitura necessÃ¡ria" de "memÃ³ria ausente", expor summary de contexto usado e adicionar testes de follow-up logo apÃ³s scaffolding. A UI deve mostrar de forma explicita quais arquivos/contextos/memorias entraram no turno e quando o contexto foi reutilizado, para o usuario enxergar continuidade real em vez de confiar em uma memoria invisivel.
- **CritÃ©rio de aceite:** dogfood cria projeto, depois pede nova pÃ¡gina/componente, e o agente usa arquivos recÃ©m-criados sem redescoberta excessiva nem alucinaÃ§Ã£o de stack.
- **Fix aplicado:** adicionado `ContextContinuityPanel` no fluxo do chat, alimentado por `context_loaded` + `SessionUsage`, mostrando arquivos selecionados, motivo/source/confidence, cache reutilizado, quantidade de memÃ³rias/learnings, bloqueios/rejeiÃ§Ãµes de contexto e warnings. A regra de apresentaÃ§Ã£o foi isolada em `apps/electron/src/renderer/src/lib/context-continuity.ts`, com testes dedicados para evitar lÃ³gica espalhada no componente grande.
- **EvidÃªncia:** `pnpm.cmd --filter @kova/electron test -- context-continuity.test.ts engine-manager.test.ts history-utils.test.ts use-engine-events.test.ts run-overlay.test.ts` PASS (95 testes); `pnpm.cmd --filter @kova/electron exec tsc -p tsconfig.json --noEmit` PASS.
- **PendÃªncia relacionada:** QA visual em janela Electron/screenshot continua coberto por #29; dogfood real de longa duraÃ§Ã£o continua fazendo parte de #9.

### 40. Adapters e harness precisam de matriz real por stack ðŸ”´ ABERTO

- **Onde:** `packages/adapters`, `packages/project`, `packages/harness`, `packages/orchestrator`.
- **Sintoma:** Kova diz suportar muitas stacks, mas a confianÃ§a real depende de detectar manifesto, package manager, comandos de build/test/lint e subprojetos corretamente.
- **Causa raiz:** Cobertura unitÃ¡ria existe, mas falta matriz dogfood por stack real e subdiretÃ³rios comuns: Next, Vite, Node API, Python, Go, Rust, Java, monorepo JS, etc.
- **Fix proposto:** criar fixtures pequenas por stack, testar `ProjectProfile`, comandos detectados, harness fast/standard e erros de ambiente.
- **CritÃ©rio de aceite:** suite de fixtures prova que Kova detecta e valida stacks principais sem bloquear root errado nem rodar comando de servidor em `run_command`.

### 41. Completion criteria do agente precisa parar loops inúteis ✅ FEITO 100%

- **Onde:** `packages/execution/src/execution-engine.ts`, prompts de sessÃ£o, `packages/agent/src/tools.ts`.
- **Sintoma:** Em tarefas grandes, o agente pode continuar tentando validar/editar mesmo quando jÃ¡ entregou o essencial ou quando o erro Ã© ambiente.
- **Causa raiz:** Falta um contrato mais explÃ­cito para "tarefa concluÃ­da com warning", "bloqueio de ambiente", "precisa do usuÃ¡rio" e "continuar implementaÃ§Ã£o".
- **Fix proposto:** normalizar razÃµes de parada (`completed_with_warnings`, `environment_blocked`, `needs_user`, `continue_next_turn`), refletir isso no overlay e impedir retry automÃ¡tico fora dessas regras.
- **Critério de aceite:** regressões para build lock, quota provider, tarefa completa com warning e scaffold parcial por orçamento.
- **Implementado:** `DecisionResult.completion` normaliza os motivos de parada; `ExecutionEngine` para provider quota como `needs_user`, build lock/ambiente como `environment_blocked`, warning de harness como `completed_with_warnings` e continuação por orçamento como `continue_next_turn`; continuação repetida sem novo diff vira `needs_user` para não gastar iterações.
- **UI:** overlay do chat mostra o motivo normalizado e o detalhe da parada quando existir.
- **Validação:** `pnpm --filter @kova/execution test -- execution-engine.test.ts stop-conditions.test.ts` (72 PASS), `pnpm --filter @kova/execution build` (PASS), `pnpm --filter @kova/electron test` (325 PASS, 1 skipped e2e live), `pnpm --filter @kova/electron build` (PASS).

### 42. Observabilidade mÃ­nima do motor precisa existir antes de dogfood ðŸ”´ ABERTO

- **Onde:** `packages/observability`, `apps/electron/src/main/*`, `packages/execution`.
- **Sintoma:** Quando algo falha, ainda dependemos demais de prints/telas. Produto enterprise precisa log reproduzÃ­vel.
- **Causa raiz:** Traces existem, mas logger estruturado/rotacionado/exportÃ¡vel ainda nÃ£o cobre main, execution, provider e harness de forma unificada.
- **Fix proposto:** logger prÃ³prio ou lib aprovada, correlaÃ§Ã£o por `sessionId/runId/iteration`, export de logs e sanitizaÃ§Ã£o de secrets. Cada run tambem precisa emitir um recibo final estruturado no chat: objetivo entendido, arquivos criados/modificados/removidos, comandos/validacoes executados, validacoes nao executadas com motivo, bloqueios, risco residual, proximo passo e evidencia objetiva. Nenhuma execucao pode terminar apenas com `stream_end` vazio.
- **CritÃ©rio de aceite adicional:** qualquer tarefa de patch que finalize em `completed`, `paused` ou `failed` renderiza um relatorio final persistido no historico da sessao e reutilizavel em follow-ups.
- **Status parcial aplicado:** recibo final estruturado implementado em `AgentResultMessage.report`, renderizado no chat e serializado no historico. O engine tambem passou a emitir texto final quando o provider devolve `thought` sem streaming de token. Evidencia: `pnpm.cmd --filter @kova/electron test -- engine-manager.test.ts history-utils.test.ts use-engine-events.test.ts` PASS (87 testes), `pnpm.cmd --filter @kova/execution test -- execution-engine.test.ts` PASS (59 testes), `pnpm.cmd --filter @kova/electron exec tsc -p tsconfig.json --noEmit` PASS, builds focados de `@kova/shared` e `@kova/execution` PASS. O item continua aberto porque logger estruturado/exportavel e correlacao completa por `sessionId/runId/iteration` ainda nao foram fechados.
- **CritÃ©rio de aceite:** um bug report exporta logs suficientes para reconstruir provider, tools, harness, decisÃ£o e apply sem vazar secret.
- **RelaÃ§Ã£o:** fecha #11 e permite resolver #14.

---

## Roadmap sugerido

| Sprint | Itens | Justificativa |
|--------|-------|---------------|
| 1A â€” SeguranÃ§a/paridade | #1 âœ…, #3 âœ…, #4 âœ…, #17 âœ… | Fechado: risco crÃ­tico, IPC e harness alinhados ao norte do produto. |
| 1B â€” Higiene do repo | #2 âœ…, #16 âœ… | Fechado: diffs gerados fora do Ã­ndice e defaults de provider sem duplicaÃ§Ã£o. |
| 1C â€” Visual Kova/Antigravity | #24 âœ…, #25, #27 âœ…, #28 âœ…, #29, #34 ðŸŸ¡ | Base do fluxo visual fechada no cÃ³digo; falta QA visual real e refinamentos nÃ£o bloqueantes. |
| 2A â€” Motor/confiabilidade | #5, #7, #8, #10, #36, #37, #38, #39, #40, #41, #42 | Prioridade atual: runs longos, contexto, memÃ³ria, adapters, harness e recovery precisam ficar previsÃ­veis. |
| 2B â€” Dogfood/E2E | #9, #11, #14, #29 | Provar motor + UI em janela real antes de liberar features novas. |
| 3 â€” Enterprise core | #30, #31, #32, #33, #35 | Congelado atÃ© Sprint 2A/2B passar. |
| 4 â€” Governance/distribuiÃ§Ã£o | #6, #12, #13 | Custo, update, multi-tenant e i18n. |

Sprint 1 de motor/seguranÃ§a/higiene estÃ¡ **100% fechada nos itens listados** (#1, #2, #3, #4, #16, #17, #20, #21, #22, #23, #24, #26, #26.1, #26.2, #27, #28). A trilha visual ainda nÃ£o estÃ¡ 100% porque depende de #25, #29 e #34. A prÃ³xima etapa nÃ£o Ã© feature: Ã© Sprint 2A/2B, estabilizaÃ§Ã£o real do motor.

---

---

## PendÃªncias adicionais detectadas no teste KÅŒJI (2026-05-18)

O teste real de scaffolding (Next.js + Clean Architecture + DDD via Kimi K2.6) expÃ´s problemas que unit tests nÃ£o pegariam. Mode routing jÃ¡ foi resolvido nesta sessÃ£o â€” o resto continua aberto.

### 20. Validation workspace roda `npm run build` sem `npm install` antes âœ… RESOLVIDO

- **Onde:** `packages/orchestrator/src/orchestrator.ts` â€” novo `ensureNodeBootstrap`
- **Sintoma original:** `'next' nÃ£o Ã© reconhecido como um comando interno` em `kova-validate-*` temp dir.
- **Causa raiz:** o orchestrator copiava arquivos para temp dir mas pulava install de dependÃªncias.
- **Fix aplicado:** quando workspace de staging tem `package.json` com scripts runnable e nÃ£o tem `node_modules`, detecta package manager (pnpm-lock â†’ pnpm, yarn.lock â†’ yarn, padrÃ£o â†’ npm) e roda install antes da pipeline. Timeout 180s, nÃ£o-bloqueante: se install falhar, harness continua e o classifier (#21) marca como environment error. Comando usa flags rÃ¡pidas (`--prefer-offline`, `--no-audit`).

### 21. Repair loop nÃ£o detecta erro de ambiente irrecuperÃ¡vel âœ… RESOLVIDO

- **Onde:**
  - `packages/shared/src/types.ts` â€” adiciona `'environment'` a `HarnessError['type']`
  - `packages/harness/src/layers/environment-error.ts` â€” novo classifier
  - `packages/harness/src/layers/{build,tests}.ts` â€” invoca classifier
  - `packages/execution/src/execution-engine.ts` â€” `collectEnvironmentErrors` + `buildEnvFailureDecision` interrompem o loop
- **Sintoma original:** "Repairing... iter 2/20" travado quando erro Ã© `command not found` â€” nenhum edit de cÃ³digo resolve.
- **Fix aplicado:** stderr Ã© varrido contra patterns multi-plataforma â€” Windows (English + pt-BR + variants mangled), POSIX (bash/zsh "command not found"), Node (`Cannot find module`, `MODULE_NOT_FOUND`, `ERR_MODULE_NOT_FOUND`), Python (`ModuleNotFoundError`). Match marca o erro como `type: 'environment'`, severidade crÃ­tica, `fixable: false`. Execution engine detecta antes de `decide()` e override:
  - **scaffold (all creates):** `auto_apply` com mensagem clara â€” aplica os arquivos e diz pro user `npm install`.
  - **modify:** `suggest` â€” pausa pro user decidir.
- Repair loop nunca dispara nessa condiÃ§Ã£o. 14 testes cobrindo cada plataforma.

### 22. `.env.example` bloqueado como credencial âœ… RESOLVIDO

- **Onde:** `packages/execution/src/execution-contract.ts` + `packages/decision/src/review-gate.ts`
- **Sintoma original:** `Review Gate blocked: .env.example is a credentials file`
- **Causa raiz:** filtro `['.env', '.env.*']` casava qualquer `.env*` incluindo templates.
- **Fix aplicado:** helper `isCredentialPath` com whitelist explÃ­cita dos sufixos seguros: `.example`, `.template`, `.sample`, `.dist`. Bloqueia continua `.env`, `.env.local`, `.env.production`, `.env.staging`, etc. Case-insensitive, funciona em subpastas (ex: `apps/api/.env.example`). 11 testes novos cobrindo whitelist + manutenÃ§Ã£o do block para arquivos reais.

### 23. Queue bloqueia input durante repair âœ… RESOLVIDO

- **Onde:** `apps/electron/src/renderer/src/App.tsx` queue logic
- **Sintoma original:** "Message will be queued..." enquanto repair roda. Cancel nÃ£o cancela.
- **Fix aplicado:** Cancel agora chama abort, limpa fila, task, eventos, streaming, reasoning e todos no renderer. Mensagem nova durante `repairing` pergunta se deve cancelar a tarefa atual e enviar a nova imediatamente.
- **EvidÃªncia:** `pnpm --filter @kova/electron test` passou com 313 testes; `pnpm --filter @kova/electron build` passou. Ambos precisaram rodar fora do sandbox por causa do `EPERM: lstat C:\Users\allan`.

### 24. Sem preview/diff para arquivos criados âœ… RESOLVIDO

- **Onde:** `apps/electron/src/renderer/src/components/FilesViewer.tsx`, `apps/electron/src/renderer/src/App.tsx`, `apps/electron/src/renderer/src/components/ChatArea.tsx`, `apps/electron/src/renderer/src/styles/global.css`.
- **Sintoma original:** 30 arquivos com chip `create` + filename, nenhum jeito de ver o conteÃºdo antes do apply.
- **Fix aplicado:** `Review` agora abre um workspace de diff/preview real. Arquivos criados aparecem como linhas adicionadas, arquivos modificados tÃªm diff calculado contra `before`, deletes aparecem como remoÃ§Ã£o, e cada hunk pode ser aprovado/desaprovado antes do `forceApply(selection)`.
- **EvidÃªncia:** `pnpm.cmd --filter @kova/electron exec tsc -p tsconfig.json --noEmit` PASS; `pnpm.cmd --filter @kova/electron test` PASS; `pnpm.cmd --filter @kova/electron build` PASS.

### 25. Thinking inline + contadores inconsistentes ðŸŸ¡ ABERTO

- **Onde:** UI (renderer)
- **Sintoma:** Cadeia de pensamento aparece como output normal. Mesma tela mostra "iter 2/20" e "maxTurns 24".
- **Fix proposto:**
  - Colapsar `<thinking>` em accordion fechado por padrÃ£o.
  - Labels explÃ­citos pros contadores: "Repair iter X/Y", "Agent turn N/M".
- **EsforÃ§o:** 3 horas total.

### 26. `maxTurnsReached` com progresso vira repair em vez de continuar âœ… RESOLVIDO

- **Onde:** `packages/execution/src/execution-engine.ts`, `packages/execution/src/changes.ts`, `apps/electron/src/main/engine-manager.ts`
- **Sintoma original:** Em scaffolding grande do zero, o modelo cria parte dos arquivos, estoura o orÃ§amento de turn do agent loop e Kova entra em "Repairing" mesmo sem erro real de cÃ³digo. A prÃ³xima iteraÃ§Ã£o roda em modo `fix`, perde o foco de completar o plano e pode aplicar/revisar sÃ³ a Ãºltima leva de arquivos.
- **Causa raiz:** `maxTurnsReached` era convertido em falha de completion/harness, alimentando repair. O apply/proof/card olhava principalmente a Ãºltima iteraÃ§Ã£o, entÃ£o tarefas multi-iteraÃ§Ã£o podiam nÃ£o representar o patch completo.
- **Fix aplicado:** Se o agente produziu mudanÃ§as e atingiu `maxTurnsReached`/`incompleteReason`, Kova registra uma iteraÃ§Ã£o de continuaÃ§Ã£o e volta em modo `code`, sem status `repairing` e sem rodar harness prematuramente. ValidaÃ§Ã£o, decision, apply, forceApply, proof pack e card final usam mudanÃ§as consolidadas de todas as iteraÃ§Ãµes.
- **EvidÃªncia:** `pnpm --filter @kova/execution test` passou com 123 testes, incluindo regressÃ£o nova que prova `['unified', 'code']` em vez de `fix` e valida/aplica `package.json + src/app.ts` consolidados. `pnpm --filter @kova/execution build` passou.

### 26.1. `run_command` bloqueia `npm --prefix <subprojeto>` por validar o root errado âœ… RESOLVIDO

- **Onde:** `packages/shared/src/command-runner.ts`, `packages/harness/__tests__/command-runner.test.ts`.
- **Sintoma original:** Kova gerava um subprojeto (`puphub/package.json`) e depois rodava `$ npm --prefix puphub install`, mas a validaÃ§Ã£o bloqueava com `no recognized manifest/build file was found in C:\Users\allan\Desktop\TesteHarnes`, porque ela sÃ³ olhava o workspace root.
- **Causa raiz:** `validateManifestRequirement()` recebia sempre o `cwd` efetivo do processo, ignorando flags de cwd/prefixo do package manager (`--prefix`, `--cwd`, `-C`). AlÃ©m disso, `npm --prefix app run dev` nÃ£o era classificado corretamente como long-running.
- **Fix aplicado:** `normalizeCommandInvocation()` agora resolve um `manifestCwd` a partir de flags de subprojeto e valida o manifesto nesse diretÃ³rio, preservando o comando original. Caminhos fora do workspace continuam bloqueados e `npm --prefix app run dev` continua indo para `run_interactive_command`.
- **EvidÃªncia:** `pnpm.cmd --filter @kova/shared build` PASS; `pnpm.cmd --filter @kova/harness test -- command-runner.test.ts` PASS com 54 testes, incluindo regressÃµes para manifesto real, manifesto staged, prefix fora do workspace e `run dev`.

### 26.2. Loop em `npm run build` quando Next.js trava `.next/trace` no Windows âœ… RESOLVIDO

- **Onde:** `packages/shared/src/command-environment.ts`, `packages/harness/src/layers/environment-error.ts`, `packages/agent/src/tools.ts`, `packages/harness/__tests__/environment-error.test.ts`, `packages/agent/__tests__/tools.test.ts`.
- **Sintoma original:** Em projetos Next.js no Windows, `npm run build` podia falhar com `EPERM: operation not permitted, open ...\.next\trace`. O Kova tratava isso como erro genÃ©rico, tentava `rm -rf .next && npm run build`, `npx next build` e voltava para repair/ediÃ§Ãµes mesmo quando o site jÃ¡ estava pronto.
- **Causa raiz:** O classificador de ambiente sÃ³ reconhecia binÃ¡rio/mÃ³dulo ausente. `run_command` devolvia qualquer falha como `Error:` genÃ©rico, entÃ£o o modelo interpretava lock de filesystem como algo reparÃ¡vel por cÃ³digo.
- **Fix aplicado:**
  - ExtraÃ­do `classifyCommandEnvironmentIssue()` para `@kova/shared`, usado por harness e agente.
  - `EPERM` em `.next/trace` vira `environment_filesystem_access`, `fixable: false`, com mensagem explÃ­cita de que source edits nÃ£o resolvem.
  - `run_command` retorna `Environment blocked` e instrui o agente a nÃ£o repetir o build nem editar cÃ³digo para esse lock.
  - Falhas reais de cÃ³digo, como erro TypeScript, continuam no caminho normal de repair.
- **EvidÃªncia:** `pnpm.cmd --filter @kova/harness test -- environment-error.test.ts` PASS (14 testes); `pnpm.cmd --filter @kova/agent test -- tools.test.ts` PASS (160 testes); `pnpm.cmd --filter @kova/shared build` PASS; `pnpm.cmd --filter @kova/harness build` PASS; `pnpm.cmd --filter @kova/agent build` PASS.

---

## Trilha visual obrigatÃ³ria â€” Kova com referÃªncia Antigravity 2.0

Esta trilha nÃ£o Ã© "polish opcional". Para competir com Antigravity, Codex, Claude Code e Cursor, o desktop precisa parecer um ambiente de trabalho moderno, focado e confiÃ¡vel. A referÃªncia Ã© Antigravity 2.0, mas a identidade visual deve continuar Kova: escuro, tÃ©cnico, ciano/azul como acento, denso sem parecer apertado.

### 27. Repaginar shell principal, sidebar e composer âœ… RESOLVIDO

- **Onde:** `apps/electron/src/renderer/src/App.tsx`, `apps/electron/src/renderer/src/components/ChatArea.tsx`, `apps/electron/src/renderer/src/components/FilesViewer.tsx`, `apps/electron/src/renderer/src/components/TitleBar.tsx`, `apps/electron/src/renderer/src/components/StatusBar.tsx`, `apps/electron/src/renderer/src/components/Sidebar.tsx`, `apps/electron/src/renderer/src/styles/global.css`.
- **Sintoma original:** UI funcional, mas com cara de painel interno. Sidebar direita/espaÃ§os laterais nÃ£o competiam com o padrÃ£o atual de Antigravity/Codex.
- **Fix aplicado:**
  - Shell principal com Ã¡rea central mais focada (`kova-workbench`, `kova-main-stage`, `kova-chat-column`).
  - Composer dockado embaixo, largura controlada e visual mais premium (`kova-composer-dock`, `kova-composer-column`).
  - `/chat` deixou de aparecer como modo principal; modos visÃ­veis ficam mais prÃ³ximos do fluxo real (`code`, `plan`, `review`), preservando compatibilidade interna.
  - Sidebar recebeu limpeza visual e melhor separaÃ§Ã£o de projetos/conversas.
  - Painel direito fixo `Run` foi descartado: `HarnessDashboard.tsx` removido e CSS legado `.kova-run-panel`/`.kova-phase`/`.kova-layer` eliminado.
  - Processo do agente aparece em `RunControlOverlay` flutuante acima do composer, com estado `plan/coding`, resumo de checks/arquivos/eventos e botÃµes `Review`, `Approve/Apply`, `Pause`, `Reject`.
  - Plano detalhado saiu do fluxo de mensagens e virou lista interna do overlay, com minimizar/expandir, etapa ativa, progresso e lista resumida de execuÃ§Ã£o.
  - SaÃ­da de comando/harness aparece no chat via `CommandOutputPanel`, alimentada por `ExecutionEvent` real (`tool_call`, `command_output`, `harness_line`, `validation_completed`), nÃ£o por mock visual.
  - Activity/timeline do agente aparece no chat tambÃ©m apÃ³s o run terminar, aproximando Kova do fluxo Antigravity/Codex.
  - Status bar nÃ£o tem mais botÃ£o `Run`; decisÃµes ficam no chat e no review real.
- **Fora deste item:** QA visual em janela real continua obrigatÃ³rio em #29 antes de declarar o redesign inteiro como 100%.
- **EvidÃªncia:** `rg` nÃ£o encontra mais `HarnessDashboard`, `kova-run-panel`, `kova-phase` ou `kova-layer` em `apps/electron/src/renderer/src`; typecheck/test/build do Electron passaram.

### 28. Redesenhar Review / Overview / Project Analysis âœ… RESOLVIDO

- **Onde:** painÃ©is laterais e componentes de resultado/review no renderer.
- **Sintoma original:** A referÃªncia Antigravity mostra review/overview como Ã¡rea de trabalho integrada. No Kova, esses painÃ©is pareciam anexos tÃ©cnicos e nÃ£o um fluxo claro de decisÃ£o.
- **Fix aplicado:**
  - `Overview` legado foi removido do painel lateral; o overview operacional agora vive no chat, acima da conversa, com dados reais do run.
  - `Review` ficou dedicado ao diff/preview, aberto pelo Ã­cone superior ou pelo botÃ£o `Review N` no resumo do chat, e agora pode ser redimensionado puxando a divisÃ³ria esquerda.
  - `FilesViewer` foi refeito para lista de arquivos + editor de diff/preview, sem checkboxes por linha. Durante execuÃ§Ã£o ele Ã© explicitamente read-only; aÃ§Ãµes de include/exclude/apply sÃ³ aparecem quando o estado permite aplicar.
  - BotÃµes de apply/recusa saÃ­ram do painel antigo: `Apply`, `Pause` e `Reject` ficam no resumo central; `Apply selected` aplica a seleÃ§Ã£o do review quando o run estÃ¡ em review aplicÃ¡vel.
  - Cards de resultado do chat trocaram cards grandes por uma lista compacta de arquivos alterados, sem reintroduzir a lateral antiga.
- **Refinamento aplicado depois da crÃ­tica visual:** review ganhou busca de arquivos, contadores reais de `+/-` por arquivo e no cabeÃ§alho, lista sem aparÃªncia de checkbox/card antigo, diff com trilho sutil por linha adicionada/removida, e preview memoizado para nÃ£o recalcular diffs pesados a cada render.
- **Fora deste item:** QA visual real segue em #29 antes de declarar a trilha visual inteira como 100%.
- **EvidÃªncia:** `pnpm.cmd --filter @kova/electron exec tsc -p tsconfig.json --noEmit` PASS; `pnpm.cmd --filter @kova/electron test` PASS; `pnpm.cmd --filter @kova/electron build` PASS.

### 29. Criar QA visual obrigatÃ³rio antes de fechar redesign ðŸŸ  ABERTO

- **Onde:** `apps/electron`, fluxo local de dev/build.
- **Sintoma:** Sem screenshot/QA manual, a UI pode compilar e ainda estar desalinhada, quebrada em telas menores ou visualmente fraca.
- **Fix proposto:**
  - Rodar janela Electron real apÃ³s mudanÃ§as visuais relevantes.
  - Capturar screenshots desktop e largura menor.
  - Conferir: texto sem overflow, composer sem sobrepor conteÃºdo, sidebar navegÃ¡vel, review legÃ­vel, contraste adequado.
  - Registrar evidÃªncia no item visual antes de marcar `âœ… RESOLVIDO`.
- **EsforÃ§o:** 0.5 dia por rodada grande de visual.

---

## Paridade enterprise com Claude Code / Codex / OpenCode

### 30. Suporte MCP (Model Context Protocol) ðŸ”´ CONGELADO ATÃ‰ MOTOR 100%

- **Onde:** novo cliente em `packages/agent` ou package dedicado; wiring no Electron/CLI para carregar servidores configurados.
- **Sintoma:** Kova fica limitado Ã s tools internas. NÃ£o conecta GitHub, Linear, Postgres, browser, docs internos ou ferramentas enterprise por protocolo padrÃ£o.
- **Fix proposto:**
  - ConfiguraÃ§Ã£o de servidores MCP por projeto e global.
  - Cliente MCP com lifecycle seguro: start, list tools, call tool, stop.
  - Tools MCP entram no catÃ¡logo do agente com permissÃµes e auditoria.
  - Renderer mostra quais servidores/tools estÃ£o ativos.
- **CritÃ©rio de aceite:** teste com servidor MCP fake cobrindo descoberta + chamada de tool; fluxo manual com pelo menos um servidor real.
- **EsforÃ§o:** 2-3 dias para versÃ£o mÃ­nima segura.

### 31. Skills via slash commands ðŸŸ  CONGELADO ATÃ‰ MOTOR 100%

- **Onde:** parser de slash commands, prompt/session context e armazenamento `.kova/skills` ou equivalente.
- **Sintoma:** Kova nÃ£o tem habilidades persistentes invocÃ¡veis como Claude Code. UsuÃ¡rio repete instruÃ§Ãµes de projeto e workflows.
- **Fix proposto:**
  - Skill com frontmatter (`name`, `description`, `when_to_use`) e corpo markdown.
  - `/skills` lista, `/skill <nome>` aplica, slash palette mostra skills relevantes.
  - Skills entram como contexto explÃ­cito, nÃ£o como mÃ¡gica escondida.
- **CritÃ©rio de aceite:** skill fake em teste altera o contexto enviado ao agente e aparece na UI/CLI.
- **EsforÃ§o:** 1-2 dias.

### 32. Background jobs / processos longos ðŸŸ  CONGELADO ATÃ‰ MOTOR 100%

- **Onde:** `packages/agent/src/tools.ts`, terminal manager, execution events e UI.
- **Sintoma:** Dev servers, watchers e comandos longos precisam de `run_interactive_command` ou bloqueiam o fluxo. Concorrentes deixam inspecionar processos em background.
- **Fix proposto:**
  - `run_background_command` com job id, stdout/stderr incremental e comandos `list/read/stop`.
  - UI com painel de jobs ativos.
  - Limites de tempo, working directory e cleanup ao fechar projeto.
- **CritÃ©rio de aceite:** teste cria job fake, lÃª saÃ­da e encerra sem processo Ã³rfÃ£o.
- **EsforÃ§o:** 1-2 dias.

### 33. HistÃ³rico ramificado de sessÃµes ðŸŸ  CONGELADO ATÃ‰ MOTOR 100%

- **Onde:** persistÃªncia de sessÃµes, `useSessionPersistence`, modelo de conversa e sidebar.
- **Sintoma:** UsuÃ¡rio nÃ£o consegue voltar a uma mensagem anterior e tentar outra direÃ§Ã£o sem perder a trilha atual.
- **Fix proposto:**
  - Modelo de sessÃ£o com `parentMessageId`/branch id.
  - UI para criar branch a partir de uma mensagem.
  - Sidebar mostra branches por projeto de forma compacta.
- **CritÃ©rio de aceite:** teste de persistÃªncia prova duas branches com ancestral comum e mensagens independentes.
- **EsforÃ§o:** 1-2 dias.

### 34. SemÃ¢ntica de modos precisa ficar compatÃ­vel com concorrentes ðŸŸ¡ PARCIAL

- **Onde:** `apps/electron/src/renderer/src/components/ChatArea.tsx`, session mode, slash commands e prompts.
- **Sintoma original:** "modo chat" como modo primÃ¡rio confundia o produto. Concorrentes tratam conversa como base e deixam `plan`/`review` como aÃ§Ãµes/estados, nÃ£o como um terceiro modo equivalente.
- **Fix aplicado atÃ© agora:** `/chat` nÃ£o aparece mais como modo principal na UI; modos visÃ­veis foram reduzidos para `code`, `plan`, `review`, mantendo compatibilidade interna.
- **Ainda falta para fechar 100%:**
  - Definir linguagem final: se `code` vira `agent`, `worktree`, `build` ou outro termo Kova.
  - Garantir que prompts, session persistence, telemetry e UI falem a mesma lÃ­ngua.
  - Testar transiÃ§Ãµes: conversa normal â†’ plano â†’ execuÃ§Ã£o â†’ review â†’ follow-up.
- **CritÃ©rio de aceite:** testes de roteamento/session mode + QA manual de uma conversa real sem ambiguidades.
- **EsforÃ§o restante:** 0.5-1 dia.

### 35. Hooks de automaÃ§Ã£o do agente ðŸŸ  CONGELADO ATÃ‰ MOTOR 100%

- **Onde:** execution events, application/git checkpoint e configuraÃ§Ã£o por projeto.
- **Sintoma:** Kova ainda nÃ£o permite hooks como `PostToolUse`, `PreApply`, `PostApply` ou `PreCommit`, comuns em workflows avanÃ§ados de agentes.
- **Fix proposto:**
  - Arquivo de configuraÃ§Ã£o seguro para hooks por projeto.
  - Eventos suportados com payload estÃ¡vel e documentado.
  - ExecuÃ§Ã£o com timeout, logs e opÃ§Ã£o de bloquear apenas hooks marcados como obrigatÃ³rios.
  - UI/CLI mostrando hooks executados e falhas.
- **CritÃ©rio de aceite:** teste cobre hook fake em `PostApply` e falha controlada sem corromper apply/git checkpoint.
- **EsforÃ§o:** 1 dia.

---

## Pergunta-guia para qualquer fix

> **O que prova que isso estÃ¡ correto?**

Sem evidÃªncia â€” nÃ£o estÃ¡ pronto. NÃ£o fechar item sem teste passando + comando executado.
