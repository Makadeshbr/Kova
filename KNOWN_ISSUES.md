# Kova — Problemas Conhecidos e Estado Atual

Última atualização: maio 2026

---

## Histórico de problemas corrigidos

### ✅ Staging de escrita isolado — disco nunca tocado durante agent loop
**Problema:** `ToolExecutor` escrevia arquivos direto no `projectRoot` durante cada iteração do agente. Watchers como Vite HMR e nodemon viam código quebrado antes do harness validar.
**Fix:** Todas as escritas e deleções ficam em buffer em memória (`Map<string, string | null>`). O disco do projeto nunca é alterado durante o loop do agente. `readFile` lê do buffer primeiro, depois do disco. `listFiles` mescla listagem do disco com o buffer (staged creates aparecem, staged deletes somem). `rollbackWrites` limpa o buffer sem precisar restaurar disco. O `HarnessOrchestrator` já criava seu próprio staging isolado via `FileChange[]` — continua sem mudança. `ApplicationEngine.apply()` é o único ponto de escrita real no disco.
**Trade-off consciente:** `run_command` durante o agent loop ainda executa no `projectRoot` (arquivos originais do disco). O agente pode receber resultados de build/test contra código original. Isso é aceitável porque o harness é o validador autoritativo — o resultado de `run_command` é auto-verificação auxiliar.
**Arquivos alterados:** `packages/agent/src/tools.ts`, `packages/agent/__tests__/tools.test.ts`
**Evidência:** 116 testes passando (`@kova/agent`), 0 regressões em `@kova/execution`, `@kova/orchestrator`, `@kova/decision`.

### ✅ abort() não cancelava sessão em andamento
**Fix:** Signal propagado para provider + ToolExecutor + guard antes do harness.
**Fix 2:** `this.paused = true` quando autoApply=false e decisão auto_apply — evita re-execução infinita.

### ✅ isThinking podia ficar preso em true
**Fix:** `try/finally` garante que `stream_end` é sempre emitido.
`runUnifiedSession` rastreia stream_end e emite defensivamente se o engine crashar.

### ✅ executionEvents não resetava entre sessões
**Fix:** `handleOpenFolder()` reseta todos os campos de estado ao trocar de projeto.

### ✅ Harness retornava score 100 sem validação configurada
**Fix:** `validationConfidence: 'none'` força score máximo 75 (suggest). `decide()` nunca chama auto_apply sem validação real.

### ✅ autoApply=false causava "Máximo de tentativas atingido" mesmo com score 97
**Fix:** Quando decisão é `auto_apply` mas `autoApply=false`, seta `this.paused = true` para encerrar o loop.

### ✅ Review mode não mostrava resposta na UI
**Fix:** `maxTurns` aumentado de 8 para 20. Fallback: `output.thought` emitido via `token` se nenhum token foi recebido.

### ✅ Code blocks em chat/review tinham botões Apply/Diff/Explain não funcionais
**Fix:** Removidos. Botão copiar com `navigator.clipboard` adicionado.

### ✅ Review gate com falso positivo em criação de arquivos novos
**Fix:** Condição verifica se todos os changes são `create` — nesse caso não exige test file alterado.

### ✅ py_compile rodando em arquivos de checkpoint (.kova/)
**Fix:** `.kova` adicionado ao skip list do `collectPythonFiles`.

### ✅ Histórico de sessão truncado em 10 mensagens fixas
**Fix:** Budget de tokens (~20k chars) com `buildTokenBudgetedHistory`.

### ✅ ContextEngine e MemorySystem recriados em cada sessão
**Fix:** Cache por `projectRoot` em `EngineManager.contextEngineCache`.

### ✅ Segurança IPC — sem validação de origem ou payload
**Fix:** `ipc-security.ts` — origin validation via `senderFrame.url`, sanitize com maxLength em todos os handlers, `contextIsolation: true`, `nodeIntegration: false`, CSP via `onHeadersReceived`.

### ✅ Review Gate sem camadas reais
**Fix:** `packages/decision/src/review-gate.ts` — 4 camadas: `universalPolicyLayer` (generated/dependency/safe-zone/scope), `semanticAdapterLayer` (AST TypeScript + regex Go), `riskPolicyLayer` (API pública sem teste), `harnessCriticalLayer` (build/typecheck/tests/security).

### ✅ Evals de agente — sem casos reais
**Fix:** `packages/evals/src/dogfood-cases.ts` — 7 casos versionados: TypeScript bugfix, Go backend, Python syntax, safe-zone, failing-test repair, fallback-provider, long multi-file task.

### ✅ Diff review sem interação real
**Fix:** `packages/application/src/diff-review.ts` (hunk IDs) + `apps/electron/src/renderer/src/components/FilesViewer.tsx` (checkboxes por arquivo e por hunk, seleção passada ao engine via `forceApply`).

### ✅ Invalidação de learnings passiva
**Fix:** `packages/memory/src/memory-system.ts` — `invalidateAgainstProject()` com fingerprint de linguagem/framework/PM, regras stack: e package_manager:, `anti-drift.ts` com pruning por contradição e idade.

### ✅ Provider error normalization não lia .status do SDK
**Fix:** `packages/agent/src/providers/errors.ts` — `normalizeProviderError` lê `(err as Record).status` diretamente, além de regex no texto. Testes Anthropic adicionados para 401/429/404 com `code`/`recoverable`/`provider` verificados.

---

## Limitações de design atuais

### run_command no agent loop executa contra arquivos originais do disco
**Estado atual:** `run_command` durante o agent loop executa no `projectRoot` real, não no buffer staged. Escritas do agente ficam em memória — o `run_command` vê o estado original do disco, não os arquivos que o agente escreveu na sessão.
**Impacto:** Agente pode receber resultado de build/test contra código antigo quando usa `run_command` para auto-verificar suas próprias mudanças. O harness resolve isso corretamente (usa `FileChange[]` com conteúdo do buffer). Auto-verificação via `run_command` é auxiliar, não autoritativa.
**Plano:** Staging dir com junction de `node_modules` para execução de run_command contra arquivos staged. Prioridade menor que os itens do backlog abaixo.

### Prompt quality não testada em volume
O sistema de prompts funciona mas não foi submetido a bateria real de tarefas diversas.
Refinamento iterativo depende de dogfooding contínuo.

### ✅ TerminalManager — cobertura completa com 31 testes
**Fix:** `apps/electron/__tests__/terminal-manager.test.ts` expandido de 11 para 31 testes em 7 grupos:
- PTY unavailable: `isAvailable`, `runInteractive` e `openTerminal` sem pty carregado
- Session lifecycle: remoção após exit natural, após kill(), dois kills (idempotente), múltiplos data events acumulam corretamente
- Concurrent sessions: dois PTY simultâneos são independentes
- Ops resilientes: writeInput/resize/kill/approveInteractive em sessão inexistente — no-op, sem crash
- Approval edge cases: timeout 60s auto-resolve como negado (fake timers), dois approvals simultâneos resolvidos independentemente, second approveInteractive é no-op, sem webContents → negado
- IPC event payloads: `kova:interactive-request`, `kova:terminal-started`, `kova:terminal-data`, `kova:terminal-exit` com campos corretos
**Evidência:** 125 testes em `@kova/electron`, 0 falhas.

### Fallback auditável — sem evals end-to-end
`provider_session_start` com `providerMeta.fallback` registra o fallback.
Falta: eval que confirma que o fluxo completo de retry → fallback → task concluída funciona end-to-end.

### ✅ Histórico longo — buildTokenBudgetedHistory extraída, testada e com guard de contagem
**Fix:** Função extraída de `App.tsx` para `apps/electron/src/main/history-utils.ts` (módulo puro e testável). `App.tsx` importa de lá e passa `{ taskOnly }` em vez de filtrar externamente.
**Melhorias:** Adicionado `maxMessages` (default 40) que previne degradação em sessões com muitas mensagens curtas que passariam pelo budget de chars. 60 mensagens × 10 chars = 600 < 20k budget → antes todas 60 eram incluídas; agora: apenas as últimas 40.
**Evidência:** 28 testes em `apps/electron/__tests__/history-utils.test.ts` cobrindo: defaults, char budget (exclusão de mais antigas, first-message bypass), count limit (sessão de 50+ mensagens), role filtering (system/tool excluídos), taskOnly mode, guards combinados, output shape.
153 testes em `@kova/electron`, 0 falhas.

### ✅ Semantic review global — todas as 13 linguagens do Kova
`extractPublicApi` e `isSemanticSourcePath` cobrem todas as linguagens suportadas pelos adapters:
- TypeScript/JS: AST real via `typescript`
- Go: regex para símbolos maiúsculos
- Python: `def`/`class` sem `_`, params obrigatórios (exclui self/cls/variadic/default)
- Rust: `pub fn`/`pub struct`/`pub enum`/`pub trait` — exclui `pub(crate)` e `pub(super)`
- Java: `public` classes/interfaces/methods
- Kotlin: `fun`/`class` sem `private`/`protected`/`internal`
- Ruby: state-machine de visibilidade (`private`/`public` como switches de linha), `def`/`class`
- PHP: `public function` em classes + funções top-level
- Swift: `public`/`open func`/`class`/`struct`/`enum`/`protocol`/`actor`
- Dart: convenção `_` prefix = privado para `class` e funções top-level
- C#: `public [modifiers] ReturnType Name(` — classes, interfaces, structs
- C/C++: classes/structs globais + funções não-`static` em arquivo de header
**Evidência:** 88 testes em `@kova/decision` (45 em review-gate.test.ts), 0 falhas.

### ✅ Evals end-to-end de fallback de provider
**Fix:** `apps/electron/__tests__/provider-fallback-e2e.test.ts` — 19 testes cobrindo:
- `tryFallbackProvider` path de sucesso (mocked settings via `vi.mock`): rate_limit → fallback, unavailable → fallback, fallbackReason com nome dos dois providers, fallbackModel forwarded, guard conditions (auth não recuperável, abort, fallback circular, factory falha, sem configuração)
- `EngineManager` E2E: rate_limit → fallback → `provider_session_start` com `fallback:true` + `requestedProvider`/`resolvedProvider` corretos + `stream_end` exatamente uma vez; unavailable → fallback; auth error → sem fallback; fallback também falha → error reportado; sessão consecutiva não tem stickiness de fallback.
**Evidência:** 105 testes em `@kova/electron`, 0 falhas.

### ✅ Evals de streaming interrompido — bug corrigido + 18 testes
**Bug corrigido:** `OpenAICompatibleProvider.streamingTurn()` em `openai-compatible.ts` — o loop `reader.read()` não estava envolto em try-catch. Erros de rede durante SSE propagavam como `TypeError` raw em vez de `KovaProviderError` normalizado. Fix: loop envolto em `try/catch/finally` com `normalizeProviderError` e `reader.releaseLock()`.
**Novos testes:** `packages/agent/__tests__/streaming-interruption.test.ts` — 18 testes em 5 grupos:
- SSE stream interruption mid-read: `reader.read()` throws → `KovaProviderError(provider_unavailable, recoverable)`, `provider='openai-compatible'`, tokens parciais já entregues, sem chunks iniciais
- SSE chunk boundary: linha SSE dividida entre chunks → buffer acumula corretamente; JSON malformado → skip silencioso; close prematuro → resposta parcial sem erro; stream vazio → sem crash; múltiplos deltas concatenados
- SSE tool call streaming: args divididos em múltiplos eventos → montados corretamente; `tool_call_id` preservado do stream incremental; `reasoning_content` não vaza como token
- Anthropic streaming: `stream.finalMessage()` throws → KovaProviderError; rate_limit, auth, tokens parciais antes do erro
- State isolation: nenhum write vaza ao disco após falha de stream (invariante de buffer em memória)

---

## Backlog técnico prioritário

- [x] Staging de escrita isolado — ToolExecutor usa buffer em memória, disco nunca tocado
- [x] Semantic review global — todas as 13 linguagens dos adapters
- [x] Evals end-to-end de fallback de provider — 19 testes E2E com settings injetadas
- [x] Testes TerminalManager/PTY — 31 testes (lifecycle, concurrent, approval, payloads)
- [x] Evals streaming interrompido — bug SSE reader corrigido + 18 testes em 5 grupos
- [x] Histórico longo — history-utils.ts extraída, maxMessages guard, 28 testes
- [ ] Testes unitários para TerminalManager / PTY
- [ ] Evals de streaming interrompido por provider
- [ ] run_command staged — agente vê arquivos originais durante loop (harness é autoritativo)
- [ ] Dogfooding contínuo para refinamento de prompts
