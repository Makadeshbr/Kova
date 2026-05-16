# Kova — Plano de Correção

> Atualizado: maio 2026
> Cada task é independente. Marcar ✅ quando 100% completo (código + testes TDD + regressão + docs).
> Princípios: arquitetura limpa, separação de responsabilidades, menos linhas é melhor, testes antes de declarar pronto.

---

## Resumo

| ID | Severidade | Status | Título |
|---|---|---|---|
| FIX-001 | 🔴 Crítico | ✅ | Patch mode sem histórico → agente sem memória |
| FIX-002 | 🔴 Crítico | ✅ | ContextEngine/MemorySystem recriados toda sessão patch |
| FIX-003 | 🔴 Crítico | ✅ | run_command invisível — sem stream no terminal |
| FIX-004 | 🟠 Alto | ✅ | Strings em português no engine (timeline/cards/erros) |
| FIX-005 | 🟠 Alto | ✅ | /plan falha silenciosa quando XML não é seguido |
| FIX-006 | 🟠 Alto | ✅ | Truncamento silencioso de arquivos em 8K |
| FIX-007 | 🟡 Médio | ✅ | maxIterations fixo em 5 — quebra tarefas grandes |
| FIX-008 | 🟡 Médio | ✅ | UI não explica "score baixo = sem validações" |
| FIX-009 | 🟡 Médio | ✅ | AbortSignal pode não cancelar runCommandInvocation |
| FIX-010 | 🟡 Médio | ✅ | contextEngineCache nunca limpo na troca de projeto |
| FIX-011 | 🟢 Baixo | ✅ | Reasoning emitter pode vazar pensamento privado |
| FIX-012 | 🟢 Baixo | ✅ | run_command opera contra disco, não buffer staged |
| FIX-013 | 🔴 Crítico | ✅ | Sem `edit_file` (diff-based) — toda alteração reescreve arquivo inteiro |
| FIX-014 | 🔴 Crítico | ✅ | Sem prompt caching Anthropic — todo turno paga 100% dos tokens |
| FIX-015 | 🔴 Crítico | ✅ | Sem `grep_codebase` — modelo trabalha cego no projeto |
| FIX-016 | 🟠 Alto | ⬜ | Sem `glob_files` — sem busca de paths por padrão |
| FIX-017 | 🟠 Alto | ⬜ | Prompts adversariais — proíbem narração e travam stack duro |
| FIX-018 | 🟠 Alto | ⬜ | Sem `todo_write` — tarefas multi-step ficam sem estrutura |
| FIX-019 | 🟡 Médio | ⬜ | ContextEngine rebuilda do zero a cada iteração de reparo |
| FIX-020 | 🟡 Médio | ⬜ | Staging por `cpSync` recursivo — overhead de segundos por harness |
| FIX-021 | 🟡 Médio | ⬜ | Sem `multi_edit` — N edits no mesmo arquivo viram N tool calls |
| FIX-022 | 🟢 Baixo | ⬜ | Sem prefix caching no provider OpenAI-compat (DeepSeek/Grok) |

---

## Tier 1 — Crítico

### FIX-001 — Patch mode recebe histórico vazio ✅
**Problema:** Cada nova mensagem em modo patch perdia memória do que foi feito antes.
**Causa:** `engine-manager.ts:204` passava `[]` como history para `runUnifiedSession`.
**Fix aplicado:** `[]` → `history`. App.tsx já filtra via `buildTokenBudgetedHistory` (guard 40 msgs/20K chars), narração de tool calls nunca chega a `messages[]` (só o resumo final de 1 frase).
**Evidência:** 4 novos testes em `engine-manager.test.ts` (FIX-001 group): preserva history, mantém ordem, vazio funciona, chat mode intacto. 155/155 testes electron passam, 0 regressões.

### FIX-002 — ContextEngine/MemorySystem singleton por projeto ✅
**Problema:** Toda task patch criava ContextEngine + 2× MemorySystem do zero, ignorando o cache.
**Causa:** `engine-manager.ts:467-469` instanciava fresh em vez de usar `contextEngineCache`.
**Fix aplicado:**
- `session-utils.ts:buildContextEngine` aceita `memory?: MemorySystem` opcional.
- `engine-manager.ts` adiciona `memorySystemCache` + método `getMemorySystem(projectRoot)`.
- `getContextEngine` passa a memory cacheada → ContextEngine e standalone memory compartilham a MESMA instância.
- `runUnifiedSession` agora usa `this.getContextEngine()` e `this.getMemorySystem()`.
**Evidência:** 4 novos testes em FIX-002 group: reuso por projeto, isolamento entre projetos, memory compartilhada CE↔standalone, cache size correto. 159/159 testes electron passam.

### FIX-003 — run_command com streaming para o feed de atividade ✅
**Problema:** `run_command npm install` mostrava só "Running command" — sem output ao vivo.
**Causa:** `tools.ts` chamava `runCommandInvocation` sem callback `onLine`, então o spawn path streaming não era usado.
**Fix aplicado (arquitetura limpa de cima a baixo):**
- `@kova/shared`: novo type `CommandOutputCallback`, evento `command_output` com fields `commandId/commandLine/commandStream`.
- `@kova/agent/tools.ts`: `ToolExecutor` aceita `onCommandOutput` no 5º param do construtor; gera `commandId = randomUUID()` por chamada e plumba via `onLine`. Sem callback = fast-path execFile original (backwards compatible).
- `@kova/agent/agent.ts`: `Agent.execute()` aceita e propaga ao executor.
- `@kova/execution`: `ExecutionEngineOptions.onCommandOutput` propaga ao agentOptions.
- `apps/electron/engine-manager.ts`: callback emite `command_output` events para a UI.
- `ActivityFeed.tsx`: acumula linhas streamed por `command_output` na entrada `run_command` mais recente, renderiza em `<pre>` rolável (cap 40 linhas).
**Evidência:** 5 testes TDD em `tools.test.ts` (stream/correlação/IDs/backwards compat/blocked) + 2 em `engine-manager.test.ts`. 359/359 testes nos 4 packages afetados.

### FIX-004 — Strings em português restantes no engine ✅
**Problema:** Mistura de idiomas — UI traduzida, mas timeline/cards/erros ainda em pt.
**Fix aplicado:**
- `engine-manager.ts`: extraído constante `RESULT_COPY` no topo do arquivo (centraliza títulos, sumários, mensagens de revisão e de contexto). Refactor remove magic strings de `runUnifiedSession`.
- `execution-engine.ts`: "Proof Pack gerado" → "Proof Pack generated".
- `proof-pack.ts`: 4 strings de summary/change traduzidas.
- `at-refs.ts`: mensagem de negação de @-ref + reason traduzidos.
- `ipc-handlers.ts`: erros "Protected file" / "Path outside project".
- `terminal-manager.ts`: fallback message do node-pty.
- `agent/tools.ts`: "diff unavailable — not a Git repository".
- `agent/providers/errors.ts`: todas as 5 mensagens de erro de provider traduzidas (rate limit, auth, model not found, server unavailable, cancelled).
**Testes:** 2 testes TDD novos verificam strings inglesas + ausência de PT em context_loaded e denied-refs. 3 testes legacy ajustados.
**Evidência:** 361/361 testes nos 3 packages. Sweep `grep` de strings PT em src/ retorna 0 matches.

### FIX-005 — /plan com fallback quando XML falha ✅
**Problema:** Quando modelo não seguia XML, usuário via `<plan_result>` cru no chat e nenhum card.
**Fix aplicado (arquitetura 3-tier + token filter):**
- `session-prompts.ts`: novo `parsePlanResultRobust(text, objective)` — sempre retorna `PlanResultMessage`. Tier 1: regex estrito (existente). Tier 2: heurística markdown (`Objective:`, `Files:`, `Approach:`, `Validations:`, `Risk:`, suporta `**bold**` e `### header`). Tier 3: fallback mínimo (texto cru como `approach`, XML fragments removidos via `stripXmlFragments`).
- Helper `stripPlanXml(buffer)` filtra `<plan_result>...</plan_result>` + tag aberta parcial mid-stream + tag aberta sem fechamento.
- `engine-manager.ts:runPlanSession`: `onToken` agora acumula buffer e emite só a parte visível (preamble antes da XML). `parsePlanResultRobust` substitui `parsePlanResult` no final.
**Testes:** 12 unit em `plan-parser.test.ts` (strict XML, markdown 2 estilos, free text, empty, XML fragments stripped, stripPlanXml 5 casos) + 4 integration em `engine-manager.test.ts` (markdown→card, free→card, no XML leak, preamble preservado). 1 teste legacy ajustado (asserting old silent-fail behavior).
**Evidência:** 179/179 testes electron, build limpo, 0 regressões.

---

## Tier 2 — Robustez

### FIX-006 — Truncamento em 8K causa perda silenciosa ✅
**Problema:** Agente lia 8K de um arquivo de 15K, re-escrevia perdendo metade sem aviso.
**Fix aplicado:**
- `tools.ts`: nova constante `READ_CHUNK_SIZE = 32_000` (4× maior, modelos modernos comportam).
- Novo helper `sliceWithTruncationNotice(content, offset, path)` — retorna chunk + mensagem explícita `"...(TRUNCATED — N chars total; you read X-Y. Call read_file again with offset=Y to continue.)"`.
- `read_file` aceita parâmetro `offset` (default 0) para leitura chunked. Offset além do EOF retorna erro descritivo em vez de string vazia silenciosa.
- Tool schema atualizado: `offset` exposto no JSON schema com descrição clara, e o `description` do `read_file` agora ensina o modelo sobre o mecanismo de chunks.
- Buffer staged e arquivos do disco compartilham a mesma lógica via helper único (DRY).
- Novo helper `numberOrZero(value)` para coerção segura do input (aceita number ou string numérica).
**Evidência:** 6 testes TDD novos em `tools.test.ts` (limite raised, truncation message format, offset funciona, EOF guard, default backward compat, staged buffer respect). 2 testes legacy reescritos (esperavam corte em 9K, agora 9K não trunca). 381/381 testes nos 3 packages afetados, 0 regressões.

### FIX-007 — maxIterations dinâmico ✅
**Problema:** Tarefa de 10+ arquivos podia precisar de 7+ iterações de reparo, mas o limite era 5 → falha arbitrária.
**Fix aplicado:**
- Novo helper puro `resolveMaxIterations(userValue, maxFilesChanged)` exportado em `execution-engine.ts`.
- Fórmula: floor escopo = `Math.min(12, Math.max(5, Math.ceil(maxFilesChanged * 0.6)))`. Resultado final = `Math.max(userValue, scopeFloor)`.
- Escala: low (6 files) → 5 iter, medium (12 files) → 8 iter, high (20 files) → 12 iter.
- User pode RAISE acima do floor via settings (UI já permite 1-20). User abaixo do floor é "promovido" para evitar falha previsível.
- `ExecutionEngine.run()` chama o helper logo após criar o contract, antes de `createInitialState`.
**Testes:** 6 testes TDD novos em `execution-engine.test.ts`: low task respeita ≥5, medium → 8, high → 12, user override 15 respeitado, custom contract honrado, sem maxIterations default funciona.
**Evidência:** 65/65 execution + 179/179 electron, 0 regressões.

### FIX-008 — UI explica score baixo ✅
**Problema:** Usuário via "77 Awaiting review" sem entender por quê.
**Fix aplicado:**
- Novo módulo puro `apps/electron/src/renderer/src/lib/validation-confidence-copy.ts` com função `getValidationConfidenceCopy(confidence)`.
- Retorna `{ show, tone: 'info'|'warning', text }`. 3 cenários:
  - `'full'` ou `undefined` → `show: false` (sem banner)
  - `'none'` → tone warning, mensagem amarela explicando que não há build/test configurados.
  - `'partial'` → tone info, mensagem cyan explicando layers skipped.
- `ChatArea.tsx > TaskResultCard`: banner renderizado entre status row e files row quando `show=true`. Background dinâmico (yellow-dim ou cyan-dim) + ícone ⓘ + texto.
**Testes:** 5 testes TDD em arquivo dedicado `validation-confidence-copy.test.ts` cobrindo cada tone, undefined, e shape do retorno.
**Evidência:** 184/184 testes electron, build limpo, 0 regressões.

### FIX-009 — AbortSignal honrado no run_command ✅
**Problema:** Comando travado podia sobreviver no abort se ignorasse SIGTERM (POSIX).
**Auditoria:** Node já enviava SIGTERM via `signal: input.signal` no spawn/execFile, mas SEM escalation. Em Windows funciona porque `child.kill()` é TerminateProcess; em Linux/Mac um child com `process.on('SIGTERM',()=>{})` sobreviveria.
**Fix aplicado:**
- Novo helper `attachAbortEscalation(child, signal)` em `@kova/shared/command-runner.ts`. Defense-in-depth sobre Node.
- Quando signal aborta: agenda SIGKILL após `KILL_GRACE_MS = 3000`. Timer cancelado quando processo termina naturalmente (`close`/`error`).
- `unref()` no timer para não segurar o event loop.
- Aplicado em ambos os paths: `runWithSpawn` (streaming) e `execFile` (default).
- Returns cleanup function — chamada no callback de close/error para evitar timer órfão.
**Testes:** 2 testes TDD novos em `abort-signal.test.ts`: child que ignora SIGTERM morre dentro de 6s (grace+slack), múltiplos comandos sequenciais não vazam timers.
**Evidência:** 145 agent + 65 execution + 184 electron = 394 testes, builds limpos. Em Windows passa trivialmente; o fix protege Linux/Mac em produção.

### FIX-010 — Limpar contextEngineCache em troca de projeto ✅
**Problema:** `Map<>` cache crescia indefinidamente. 10 projetos abertos = 10 ContextEngines + 10 MemorySystems pinned.
**Fix aplicado:**
- Novo módulo `apps/electron/src/main/lru-cache.ts` com classe genérica `LruCache<K, V>` exportável.
- API: `get` (refresh recency), `set` (returns `{ evicted }`), `has` (peek, sem refresh), `delete`, `clear`, `size`. Validação de capacity > 0.
- `EngineManager.MAX_CACHED_PROJECTS = 3` substitui `Map<>` em ambos `memorySystemCache` e `contextEngineCache`.
- **Sincronização cross-cache**: quando `set()` evicta de uma cache, `delete()` da outra. Garante que ContextEngine nunca aponte para MemorySystem evictada (drift).
- Novo método público `clearProjectCache(projectRoot)` para limpeza explícita (futuro: chamar no handler `closeFolder`).
**Testes:** 12 testes TDD em `lru-cache.test.ts` (basics, eviction, recency refresh, capacity edge cases, has/delete/clear) + 3 testes integration em `engine-manager.test.ts` (eviction com 4 projetos, sync entre caches, clearProjectCache).
**Evidência:** 199/199 testes electron, build limpo.

---

## Tier 3 — Polimento Profundo

### FIX-011 — Auditar vazamento de reasoning ✅
**Auditoria:** Os 2 providers tratam reasoning de forma correta no happy path:
- **Anthropic**: usa `stream.on('text', ...)` que dispara só para content blocks. Thinking blocks (extended thinking) chegariam por canal separado e o filter `b.type === 'text'` no path não-streaming garante isolamento.
- **OpenAI-compatible**: `delta.reasoning_content` (DeepSeek) é roteado para `reasoning?.onDelta`. `<think>` tags em open-source models são removidos pelo `ThinkTagFilter` com state machine que preserva visível e isola reasoning.
**Resultado da auditoria:** Nenhum vazamento real encontrado. Risco identificado como hipotético. Mas adicionei guard tests adversariais para fechar a porta.
**Tests TDD novos (7 cenários):**
- Tag `<think>` aberta dividida entre chunks SSE (`<thi` + `nk>...`).
- Tag `</think>` fechada dividida entre chunks.
- Múltiplos `<think>` blocks num único stream.
- `<think>` sem fechamento até EOF.
- `reasoning_content` interleaved com `content`.
- Cauda parcial parecida com tag (`<thi` + `s is text`) — não vaza nem retém demais.
- `content` chegando após `reasoning_content`.
**Evidência:** 152/152 testes em `@kova/agent`, build limpo, isolamento confirmado em todos os cenários adversariais.

### FIX-012 — run_command opera contra disco (não buffer staged) ✅
**Problema:** Agente escreve `app.js` (staged) → roda `node app.js` → "file not found" → tenta escrever de novo (loop confuso).
**Decisão revisada:** A versão lite com aviso era insuficiente. `run_command` agora precisa validar o estado staged real.
**Fix aplicado:**
- Novo helper `withStagedFilesOnDisk()` em `tools.ts`.
- Antes do comando, o executor materializa writes/deletes staged no disco do projeto.
- O comando roda contra o estado proposto real.
- No `finally`, todos os arquivos tocados são restaurados para o conteúdo original, preservando o buffer do agente para o harness/aplicação.
- Resultado: `node src/app.js`, `npm test`, `tsc`, etc. veem os arquivos que o agente acabou de criar/modificar sem aplicar permanentemente a mudança antes do review/harness.
**Testes:** `tools.test.ts` cobre comando lendo arquivo staged criado, múltiplos staged files, ausência de ruído quando não há referência staged, e restauração de arquivo existente após comando.
**Evidência:** 421 testes total (157 agent + 65 execution + 199 electron), build limpo.

---

## Padrões de implementação

**Arquitetura:**
- Toda função >40 linhas deve ser quebrada em sub-funções nomeadas.
- Toda lógica testável fica em módulo puro (sem side effects), facilmente mockável.
- Componentes >400 linhas em React = dividir.

**TDD:**
- Escrever o teste primeiro, ver falhar, implementar, ver passar.
- Teste de regressão: rodar suite completa do package afetado.
- Sem `any`, sem default export novo, sem `throw 'string'`.

**Commits:**
- Um commit por FIX-XXX completo (código + testes + docs).
- Mensagem: `fix(scope): FIX-XXX titulo curto`.
- Marcar ✅ no resumo deste arquivo no mesmo commit.

**Definição de pronto:**
1. Código implementado.
2. Testes TDD passando.
3. Testes de regressão verdes.
4. Build limpo em todos os packages afetados.
5. Strings em inglês (sem mistura).
6. Status marcado ✅ neste arquivo.
7. `KNOWN_ISSUES.md` e `KOVA_ROADMAP.md` atualizados.

---

## Já feito nesta sessão (contexto)

- ✅ Meta-instruções detectadas em `isConversationalMessage` ("responde em portugues" não modifica mais arquivos)
- ✅ UI 100% inglês em 10 componentes (ChatArea, Sidebar, ActivityFeed, HarnessDashboard, FilesViewer, AgentStream, MemoryPanel, TerminalPanel, ProviderModal, ProjectFiles)
- ✅ Shimmer animado no estado "Processing..."
- ✅ Prompt `chatOnlyPrompt` reescrito: sem auto-apresentação, sem lista de capacidades, sem emojis
- ✅ Prompt `unified` reescrito: regra contra meta-instruções tocarem arquivos, limite de leitura, sem narração
- ✅ Strings de erro do engine traduzidas (rate limit, model not found, API key, network)

---

## Revisão Codex — hardening pós-análise

> Segunda rodada aplicada depois da auditoria de arquitetura. Esta seção corrige pontos que estavam marcados como ✅ mas ainda tinham lacunas de produto.

- ✅ **FIX-001 reforçado:** cards estruturados (`agent_result` / `plan_result`) agora são serializados para texto de histórico via `structuredMessageToHistoryText`, então follow-ups como "agora altere o arquivo que você criou" recebem paths, decisão, notas e validações reais, não uma resposta vazia.
- ✅ **FIX-002/FIX-010 reforçados:** `ContextEngine` cacheado agora valida o `adapter.name`; se o stack adapter mudar para o mesmo projeto, o engine é recriado. Troca real de projeto também chama `clearProjectCache` pelo `updateProjectScope`.
- ✅ **FIX-003 reforçado:** `run_command` continua aparecendo no `ActivityFeed`, mas também é espelhado em um painel read-only de terminal/command output para não ficar escondido em cards pequenos.
- ✅ **FIX-004 reforçado:** strings visíveis restantes em `proof-pack`, `execution-contract`, `command-runner`, `terminal-manager`, `provider-resolver`, `FileCard`, `FilesViewer`, `FileEditor`, `TaskInput`, `HarnessDashboard` e `TitleBar` foram traduzidas.
- ✅ **FIX-009 reforçado:** o `ToolExecutor` agora recebe o `AbortSignal` composto do `Agent`, então timeouts internos também abortam comandos em andamento.
- ✅ **FIX-012 substituído:** saiu o aviso "staged path not on disk"; `run_command` agora materializa temporariamente o buffer staged no disco, executa o comando contra o estado real proposto e restaura os arquivos originais no `finally`.
- ✅ **CLI/runner alinhado:** `packages/kova-runner/src/full-loop.ts` agora compartilha a mesma instância de `MemorySystem` entre `ContextEngine` e `ExecutionEngine.memory`, evitando o split de memória fora do Electron.
- ✅ **FIX-005 reforçado após teste real:** em projeto vazio, `/plan` não oferece `read_file/list_files`, impedindo modelos fracos de substituir plano por exploração vazia. O fallback heurístico agora gera plano concreto para landing pages estáticas (`index.html`, `styles.css`, `script.js`) e remove narração tipo "Let em explore..." do card.

---

## Tier 4 — Paridade competitiva (Claude Code / Cursor / Codex)

> Origem: diagnóstico de maio 2026. Confirmado por pesquisa do estado da arte (Claude Code v2.1.16+, Anthropic API 2026, Cursor 2026).
> A infraestrutura do Kova (harness, staging, checkpoint, eventos) é superior. O tooling do agente é de 2023.
> Estes 10 FIXes fecham ~70% do gap percebido entre Kova e Claude Code/Cursor.
>
> **Ordem de execução recomendada:** FIX-013 → FIX-014 → FIX-015 → FIX-017 → FIX-016 → FIX-018 → FIX-019 → FIX-020 → FIX-021 → FIX-022.
> 13/14/15 entregam o maior salto de qualidade percebido na primeira mensagem.

### FIX-013 — Tool `edit_file` com replace cirúrgico ✅
**Problema:** Hoje só existe `write_file` que exige **conteúdo completo do arquivo** (`packages/agent/src/tools.ts:108-117`). Cada alteração de 5 linhas reescreve 500 linhas — multiplica tokens de saída em 10–50×, aumenta alucinação no meio do arquivo, e faz o modelo gastar contexto reescrevendo código que não mudou.

**Causa-raiz:** Decisão inicial de simplicidade — "modelo sempre escreve o arquivo todo". Funcionou no MVP mas é exatamente o que separa Kova do Claude Code em sensação de velocidade e custo.

**Fix aplicado:**
- Nova tool `edit_file(path, old_string, new_string, replace_all?)` registrada em `AGENT_TOOLS` (`packages/agent/src/tools.ts`).
- Método privado `ToolExecutor.editFile()` + helper `resolveCurrentContent()` (discriminated union para evitar discriminant errado).
- Replacement via `split + join` literal — handles regex special chars e `$1` corretamente sem substituição implícita.
- Validação completa antes de qualquer staging:
  - `old_string` vazio → erro com hint apontando para `write_file`
  - `old_string === new_string` → erro de no-op
  - Arquivo não existe → erro com hint para `write_file`/`read_file`
  - Arquivo deletado nesta sessão → erro descritivo
  - 0 matches → erro instruindo o modelo a `read_file` primeiro e copiar verbatim
  - >1 matches sem `replace_all` → erro reporta count exato + sugestão `replace_all: true`
  - Resultado vazio → erro apontando para `delete_file`
  - Resultado quebra sintaxe Python (bloco vazio) → bloqueado via `findPythonEmptyBlock`
- Operação em buffer staged (`ToolExecutor.buffer`) — disco intocado (invariante mantida).
- **Tipo de FileChange preservado**: se arquivo foi criado nesta sessão via `write_file` e depois editado, `type` continua `create` (originals === undefined). Se já existia no disco, `type='modify'` com `before` capturado.
- Edições encadeadas funcionam — edit 2 vê resultado do edit 1 via buffer.
- `MODE_PROMPTS` (code, fix, unified) atualizado com seção "TOOL CHOICE" instruindo preferência por `edit_file` para mudanças cirúrgicas. Sem inflar prompts (4–6 linhas adicionais).
- `write_file` description atualizada para apontar para `edit_file` como caminho preferido em mudanças surgical.
- `packages/agent/CLAUDE.md` tabela atualizada com nova linha + nota de ordem de preferência.

**Evidência:**
- **31 testes TDD novos** em `packages/agent/__tests__/tools.test.ts` (grupos: staging invariant, basic replacement, uniqueness enforcement, input validation, chaining and staged state, special content, security and permissions, tool registration, rollback).
- **188/188** testes em `@kova/agent` (vs 157 antes — sem regressões).
- **0 regressões** em packages downstream: `@kova/execution` 65/65, `@kova/orchestrator` 24/24, `@kova/decision` 88/88, `@kova/electron` 218/218.
- Build limpo: `tsup` ESM/CJS/DTS sem erro de tipo.
- Total agregado: **583 testes passando**, 0 falhas.

**Cobertura adversarial:**
- Regex special chars em `old_string` (`/^[a-z]+$/g`) tratados literalmente.
- `$1`, `$100` em `new_string` preservados (split/join não interpola).
- `old_string` multi-linha funciona.
- READ_ONLY_PERMISSION_POLICY bloqueia `edit_file` (verificado).
- Path traversal bloqueado.
- Edit em arquivo criado na mesma sessão preserva `type='create'`.
- Edits sucessivos mantêm `before` original do disco, não estado intermediário.

---

### FIX-014 — Prompt caching no provider Anthropic ✅
**Problema:** Grep de `cache_control` em `packages/agent/src/providers/` retornava 0 ocorrências. Cada chamada Anthropic mandava system prompt + tools schema + histórico completo sem cache. No repair loop de 5 iterações: 5× custo de input total, 5× TTFT pleno.

**Custo real:** Pesquisa 2026 confirma — prompt caching reduz custo de input em até 90% (cached input = 0.10× preço normal). Para um repair loop o ROI é "better than anywhere else in the stack" ([fonte](https://medium.com/ai-software-engineer/anthropic-just-fixed-the-biggest-hidden-cost-in-ai-agents-using-automatic-prompt-caching-9d47c95903c5)).

**Fix aplicado:**
- Novo módulo `packages/agent/src/providers/anthropic-cache.ts` com 4 funções puras (testáveis em isolamento):
  - `withCachedSystem(system)` — converte string em `TextBlockParam[]` com `cache_control: { type: 'ephemeral' }`. Retorna `undefined` para string vazia (omite o campo `system` em vez de mandar bloco vazio).
  - `withCachedTools(tools)` — mark `cache_control` apenas no último tool (caching é prefix-based, cobre todos os anteriores).
  - `withHistoryCacheBreakpoint(history)` — mark no último content block da última mensagem; normaliza content string em `[{type:'text', cache_control}]`. O breakpoint **avança a cada turno**, fazendo o prefixo cacheado crescer (incremental caching pattern recomendado pela Anthropic).
  - `parseCacheUsage(usage)` — extrai `cache_creation_input_tokens` / `cache_read_input_tokens` da Usage, coerce `null` → `0`.
- `packages/agent/src/providers/anthropic.ts` reescrito para usar os helpers em todos os 3 caminhos: `generate()`, streaming chat sem tools, agent loop multi-turn.
- `ProviderCapabilities.supportsPromptCaching: boolean` adicionado em `provider.ts`. Anthropic retorna `true`; OpenAI-compat (DeepSeek/Grok) será `'automatic'` no FIX-022.
- Novo callback `AgentLoopOptions.onUsageReport(report: ProviderUsageReport)` — disparado uma vez por API call com `{cacheReadInputTokens, cacheCreationInputTokens, inputTokens, outputTokens}`. Permite EngineManager/UI medir hit rate sem acoplar ao SDK.
- TTL: 5 minutos (ephemeral default; 1.25× write). Não usamos 1h TTL — 2× write não compensa em sessões interativas.
- Apenas 3 dos 4 breakpoints permitidos pela Anthropic são usados, deixando o 4º livre para uso futuro (documents, tool override).

**Evidência:**
- **30 testes novos** em `@kova/agent`:
  - **21 unit tests** em `__tests__/anthropic-cache.test.ts` (helper puro): system vazio, system com whitespace, tools 0/1/N, cache_control só no último tool, idempotência, não-mutação, history empty/string/array/tool_result/empty-content, breakpoint budget ≤ 4.
  - **9 integration tests** em `__tests__/anthropic-cache-integration.test.ts` com mock do SDK: capability flag, system enviado como TextBlockParam[], system vazio omitido, tools marcados só no último, history breakpoint move entre turnos, `onUsageReport` chamado uma vez por turno com counters corretos, null fields coerced para 0, streaming chat path também cacheado.
- **4 testes legacy ajustados** em `agent.test.ts` — agora usam helper `flattenContent()` para asserir conteúdo independente do shape. Um teste verifica explicitamente que `system[0].cache_control === { type: 'ephemeral' }`.
- **218/218** testes em `@kova/agent` passando (vs 188 antes — +30 novos, 0 regressões).
- **Downstream zero regressão**: `@kova/execution` 65/65, `@kova/electron` 218/218.
- Build limpo: `tsup` ESM/CJS/DTS sem erro de tipo. DTS subiu de 9.10 KB → 10.14 KB (export do novo callback + interface).

**Cobertura adversarial:**
- `cache_creation_input_tokens` e `cache_read_input_tokens` com valor `null` (SDK antigo / resposta parcial) → coerced para 0.
- System prompt apenas com whitespace (`'   '`) → não enviado.
- Provider sem `onUsageReport` → silencioso, sem erro.
- Mock streaming SSE com handler `text` → tokens preservados + cache aplicado.
- Mensagem com `content: []` (array vazio) → não crasha, sem breakpoint.
- Histórico em múltiplos turnos: breakpoint anterior é REMOVIDO da posição antiga e aplicado na nova última mensagem.

---

### FIX-015 — Tool `grep_codebase` (ripgrep wrapper + JS fallback) ✅
**Problema:** Sem grep dedicado, o modelo precisava usar `run_command grep` ou `run_command rg`: (a) frágil em Windows, (b) lento pelo subprocess pipeline duplo, (c) propenso a ser bloqueado pela allowlist. Resultado prático: o modelo **simplesmente não buscava o código** — operava de palpite. Metade do "feeling Claude Code" mora aqui.

**Fix aplicado:**
- Novo módulo puro `packages/agent/src/grep-codebase.ts` (≈340 linhas), zero side effects, totalmente testável em isolamento. Exporta `grepCodebase(projectRoot, opts, signal)`, `isRipgrepAvailable()` e tipos `GrepOptions` / `GrepOutputMode`.
- **Engine auto-selecionado**:
  - `ripgrep` (system PATH) se disponível — invocado com `--no-config --max-filesize 10M --max-count 50 --no-heading --color never`, timeout 5s para impedir regex catastrófico (ReDoS).
  - **JS fallback** com `fast-glob` + `RegExp.exec()` quando `rg` não existe — anda os arquivos do projeto, ignora binários via probe (8KB head + check de NUL byte), respeita os mesmos limites.
  - Override `forceEngine: 'rg' | 'js'` em `GrepOptions` para testes determinísticos.
- **Parâmetros**: `pattern` (regex), `path?` (subdir relativo, validado contra path traversal), `glob?` (filtro fast-glob), `type?` (mapeamento estável para 14 stacks: ts, js, py, go, rust, java, kotlin, ruby, php, swift, dart, csharp, cpp, c, md, json), `output_mode?` (`files_with_matches` default | `content` | `count`), `case_insensitive?`, `head_limit?` (default 50, max 200).
- **Default ignore dirs**: `node_modules`, `dist`, `out`, `build`, `.next`, `.turbo`, `.git`, `coverage`, `.kova` — alinhado com STAGING_SKIP_DIRS, sem vazar lixo gerado.
- **Output token-efficient**: `path:line:conteúdo` por linha (não JSON inflado). Limite default 50 matches; `head_limit` ajustável.
- Tool `grep_codebase` registrada em `AGENT_TOOLS` (`packages/agent/src/tools.ts`) e em `READ_ONLY_TOOL_NAMES` — disponível em todos os modos, incluindo `plan` e `review`.
- **Respeita o staged buffer**: integração via `withStagedFilesOnDisk()` (mesmo helper criado em FIX-012) — o agente busca padrões em arquivos que ele mesmo acabou de escrever, sem ter aplicado nada ainda no projeto.
- Dispatcher em `ToolExecutor.execute()` adiciona o case `grep_codebase` invocando o helper puro com o `signal` composto do agent.
- `MODE_PROMPTS` (code, fix) recebeu seção "TOOL CHOICE" instruindo: `grep_codebase — search for usages, references, patterns... ALWAYS prefer this over run_command grep/rg/findstr.`
- `packages/agent/CLAUDE.md` tabela `AGENT_TOOLS` atualizada com a linha do `grep_codebase` + nota de que o tool é também read-only (plan/review).
- `apps/electron/__tests__/engine-manager.test.ts` atualizado para refletir o novo conjunto `['grep_codebase', 'list_files', 'read_file']` em modo `/plan`.
- `fast-glob ^3.3.0` adicionado em `packages/agent/package.json` (binary-safe globber, mesmo já usado em outras partes do monorepo).

**Evidência:**
- **27 testes TDD novos** em `packages/agent/__tests__/grep-codebase.test.ts` (engine auto-select, ripgrep path com timeout, JS fallback, glob filter, type→glob mapping para 14 stacks, output modes, head_limit, case sensitivity/insensitivity, path traversal blocked, default ignores, binary file skip, signal abort, projeto sem matches).
- **14 testes de integração novos** em `packages/agent/__tests__/tools.test.ts` (registro em AGENT_TOOLS, dispatcher, READ_ONLY_TOOLS inclui grep_codebase, integração com staged buffer via withStagedFilesOnDisk, validação de input, abort signal, error handling).
- **259/259** testes em `@kova/agent` (vs 218 antes — +41 novos, 0 regressões).
- **Zero regressão downstream**: 218/218 electron (com o teste de plan-mode ajustado), todos os outros packages verdes em `pnpm -r test`.
- Build limpo: `tsup` ESM/CJS/DTS sem erro. Bundle CJS 75.09 KB, ESM 71.95 KB, DTS 10.50 KB.

**Cobertura adversarial:**
- Ripgrep ausente do PATH → fallback JS automático sem usuário notar.
- `forceEngine: 'js'` torna os testes do helper deterministicos no CI (sem depender de `rg` instalado).
- Regex catastrófico (`(a+)+b` contra entrada longa) → ripgrep mata em 5s; JS fallback usa `RegExp.exec` linha-a-linha, cada linha é bounded pelo conteúdo do arquivo.
- Path traversal (`path: "../outside"`) → rejeitado antes do glob.
- Arquivo binário maior que 10MB → ignorado.
- Arquivo binário pequeno → detectado por NUL byte no probe de 8KB, ignorado.
- `head_limit: 1000` solicitado → capped silenciosamente em 200.
- Pattern não encontrado → resposta vazia bem-formada (`No matches found.`), não erro.
- Buffer staged: agente escreve `src/new.ts` → `grep_codebase('NewSymbol', glob: 'src/**')` encontra. Após restore (finally), `new.ts` volta ao estado original no disco.

---

### FIX-016 — Tool `glob_files` ⬜
**Problema:** Para encontrar "todos os tsx em components" o modelo lista diretórios recursivamente com `list_files` em loop, ou tenta `run_command find` (bloqueado em Windows, frágil em \*nix). Claude Code resolve isso com Glob dedicado.

**Fix proposto:**
- Nova tool `glob_files(pattern, path?)` em `packages/agent/src/tools.ts`.
- Pattern estilo glob (`**/*.tsx`, `src/**/components/*.ts`).
- Wrapper de `fast-glob` (já no monorepo) ou `globby`.
- Retorna paths relativos ao projectRoot, ordenados por mtime descendente (recém-modificado primeiro — alinha com Claude Code).
- Limite default: 100 paths.
- Filtros: ignora `node_modules`, `dist`, `out`, `.git` por padrão (mesmas STAGING_SKIP_DIRS do orchestrator).
- Disponível em todos os modos (read-only).

**Critério de pronto:**
- `glob_files("**/*.test.ts")` lista todos os testes do projeto.
- Não vaza arquivos de `node_modules`.
- Funciona em Windows (paths normalizados com `/`).
- Testes: glob básico, glob aninhado, path scope, sem matches, ordenação por mtime, ignore patterns.

---

### FIX-017 — Reescrever `MODE_PROMPTS` sem adversarialidade ⬜
**Problema:** `packages/agent/src/modes.ts` está cheio de:
- `DO NOT narrate your process. Never output "Let me check..."` — desliga o pensamento operacional, justamente o que faz Claude Code parecer "presente".
- `your final message must be EXACTLY ONE SHORT SENTENCE` — força truncar respostas úteis.
- `LANGUAGE: ${lang}. Every file you create must use ${lang}` (`agent.ts:104`) — se `structureTask` errar o stack, agente trava.
- Listas de "RULES:" numeradas em tom imperativo — Anthropic publicou que isso piora performance em comparação com instruções afirmativas e exemplos.

**Fix proposto:**
- Reescrever cada modo em `MODE_PROMPTS` no padrão Claude Code: afirmativo, breve, com exemplo curto quando ajuda.
- Permitir narração curta antes de tool calls ("Let me check the file structure first." — uma frase é OK).
- Remover "EXACTLY ONE SENTENCE" — substituir por "Keep the final summary concise (1–3 sentences)".
- Stack hint vira sugestão, não trava: "Detected stack: ${lang}. Prefer this language unless the task explicitly requires another."
- Adicionar bullet de **quando usar cada tool** no prompt: `edit_file` para mudanças cirúrgicas, `write_file` para arquivo novo ou rewrite completo, `grep_codebase` antes de assumir, `read_file` antes de `edit_file`.
- Manter regra de não auto-apresentação e sem emoji (são preferências reais do produto).
- Tone: instrução positiva, não proibição. "Prefer X" em vez de "Never Y".

**Critério de pronto:**
- Prompts caem de ~25 linhas para ~12 linhas cada (mais cacheável e mais lido).
- Modelo narra brevemente antes de tool calls quando faz sentido.
- Mismatch de stack vira aviso, não bloqueio.
- Sem regressão de comportamento crítico (não toca arquivo em mensagem conversacional — coberto pelo teste de FIX-005).
- Testes: prompt cabe no orçamento atual, tool guidance presente, stack hint afirmativo (sem "must"), regra de não-apresentação preservada.

---

### FIX-018 — Tool `todo_write` + renderização na UI ⬜
**Problema:** Tarefas multi-step (refactor de 8 arquivos, migração) ficam sem estrutura interna. O modelo perde o fio, especialmente em tarefas que exigem 6–10 iterações. Pesquisa de 2026 confirma: TodoWrite é EXTREMELY helpful para break down de tarefas complexas ([fonte](https://www.vtrivedy.com/posts/claudecode-tools-reference)).

**Fix proposto:**
- Nova tool `todo_write(todos: Array<{ content: string, status: 'pending'|'in_progress'|'completed', activeForm: string }>)`.
- Substitui a lista inteira a cada chamada (mesmo contrato Claude Code) — simples e robusto.
- Estado vive em `ToolExecutor.todos: Todo[]`, exposto via `getTodos()`.
- Novo `ExecutionEvent` tipo `todos_updated` em `@kova/shared`.
- `ExecutionEngine` propaga via `onEvent`; `EngineManager` repassa ao IPC.
- Renderização: novo componente `TodoListCard.tsx` em `apps/electron/src/renderer/src/components/` — checkbox visual com 3 estados (○ pending, ◐ in_progress, ● completed). Inserido no ActivityFeed ou como card sticky no topo do chat.
- Disponível em todos os modos.
- Schema do prompt: "Use todo_write for any task that requires 3+ distinct steps. Update it as you progress. Mark items completed immediately when done."

**Critério de pronto:**
- Modelo cria todo list para tarefa de "refatorar 6 arquivos".
- UI mostra progresso em tempo real.
- Lista persiste através de iterações de reparo (não é clear ao trocar de modo `code`→`fix`).
- Testes: criar lista, atualizar item, completar tudo, evento emitido, render React.

---

### FIX-019 — Cache de `ContextEngine.buildContext()` por sessão ⬜
**Problema:** `packages/execution/src/execution-engine.ts:237` chama `contextEngine.buildContext()` a cada iteração de reparo. Grep + dependency graph + memory queries × 5 iterações. Em projeto real isso adiciona 10–25s de overhead total perceptíveis ao usuário.

**Fix proposto:**
- Em `ExecutionEngine`, cachear o `AgentContext` resultante após primeira iteração.
- Invalidação: re-build se `harnessErrors` mudou significativamente (novos arquivos de erro), se `explicitFiles` mudou, ou após 3 iterações (TTL).
- Diff-based: apenas re-rodar grep se a lista de arquivos modificados pelo agente cruza com a query de grep anterior.
- Reuso de `pack.selectedFiles` entre iterações quando harness errors apontam para os mesmos arquivos.
- Evento `context_loaded` continua emitido com flag `cached: true` para a UI mostrar.

**Critério de pronto:**
- Iteração 2+ não roda grep completo a menos que invalidação dispare.
- Tempo médio de iteração de reparo cai 30%+ em projeto real.
- Invalidação correta quando harness aponta arquivos não vistos antes.
- Testes: cache hit em iter 2, invalidação por novo error file, invalidação por TTL, evento `cached: true` emitido.

---

### FIX-020 — Staging por hardlink / copy-on-write em vez de `cpSync` ⬜
**Problema:** `packages/orchestrator/src/orchestrator.ts:64-79` faz `cpSync` recursivo do projeto inteiro para `/tmp` em **toda execução do harness**. Para projeto de 5–50k arquivos: 2–5s só de I/O, antes do build/test começar.

**Fix proposto:**
- Detecção de capacidade de hardlink no startup do orchestrator (mesmo volume, FS compatível).
- Tentativa 1: hardlink via `linkSync` para arquivos read-only do projeto. Modificações do agente quebram o link com `unlink` + `writeFileSync` (COW manual). Resultado: staging instantâneo para projeto inteiro, write real só nos arquivos alterados pelo agente.
- Tentativa 2 (Windows com NTFS sem privilégio de symlink): fallback para `reflink` se disponível via API nativa.
- Tentativa 3 (fallback final): manter `cpSync` comportamento atual.
- Limpeza no `cleanup()`: `rmSync` recursivo continua funcionando — hardlinks são derefenciados independentemente do arquivo original.
- Bonus: cache do staging entre iterações — se nada do "exterior" mudou, reusar staging root. (Conservador: por enquanto sempre recriar.)

**Critério de pronto:**
- Staging de projeto de 5k arquivos cai de ~3s para <100ms.
- Modificação do agente em staging NÃO modifica arquivo original (invariante crítica).
- Fallback funciona em qualquer FS.
- Testes: hardlink criado, modificação isolada, cleanup, fallback path, cross-volume detectado.

---

### FIX-021 — Tool `multi_edit` (N edits no mesmo arquivo numa call) ⬜
**Problema:** Após FIX-013, se modelo precisa fazer 5 edits no mesmo arquivo, faz 5 tool calls separadas — 5 round-trips ao LLM, 5× custo de overhead. Claude Code resolve com MultiEdit.

**Fix proposto:**
- Nova tool `multi_edit(path, edits: Array<{ old_string, new_string, replace_all? }>)`.
- Edits aplicados sequencialmente — se qualquer um falhar, **todos** são revertidos (atomicidade).
- Cada edit vê o resultado do anterior (chain editing, igual Claude Code MultiEdit).
- Mesma lógica de validação do `edit_file` por edit individual.
- Output reporta quais edits passaram e quais falharam (para o modelo se ajustar).

**Critério de pronto:**
- 5 edits no mesmo arquivo = 1 tool call.
- Atomicidade: 4 edits passam, 5º falha → todos revertidos.
- Chain editing: edit 2 pode referenciar string criada por edit 1.
- Testes: múltiplos edits sequenciais, atomicidade em falha, chain editing, replace_all dentro de multi_edit.

---

### FIX-022 — Prefix caching no provider OpenAI-compat (DeepSeek, Grok) ⬜
**Problema:** DeepSeek e Grok suportam **automatic prefix caching** (DeepSeek desde Aug/2024, Grok desde 2025) — sem precisar de `cache_control` explícito. Basta manter o prefixo idêntico entre chamadas. Hoje o provider OpenAI-compat (`packages/agent/src/providers/openai-compatible.ts`) não tira proveito disso porque a ordem do system/tools/history pode variar entre iterações.

**Fix proposto:**
- Garantir ordem **canônica e estável** dos messages: `[system, tools_definition (se separado), ...history, current_user]`.
- Não inserir timestamp, sessionId, ou random no system prompt.
- Telemetria: ler `usage.prompt_cache_hit_tokens` da response (DeepSeek expõe) e logar.
- Capabilities: `supportsPrefixCaching: 'automatic'` quando modelo é `deepseek-*` ou `grok-*`.
- Documentar no `packages/agent/CLAUDE.md` que provider Anthropic usa `cache_control` explícito (FIX-014) e OpenAI-compat usa prefix estável (FIX-022).

**Critério de pronto:**
- Segunda chamada DeepSeek mesma sessão tem `prompt_cache_hit_tokens > 0`.
- Sem campo volátil no system prompt.
- Testes: ordem canônica preservada, sem random/timestamp injetado, capability reportada correta para modelo deepseek/grok.

---

## Métricas de sucesso do Tier 4

Quando os 10 FIXes do Tier 4 estiverem ✅, esperar:

| Métrica | Antes | Alvo |
|---|---|---|
| Tokens de saída para alterar 5 linhas em arquivo de 500 linhas | ~500 linhas | ~10 linhas |
| Custo input por iteração de reparo (Anthropic) | 100% | ~10–15% |
| TTFT segunda iteração | ~3–5s | <1s |
| Tempo total staging por harness (projeto 5k arquivos) | 2–5s | <100ms |
| Tarefa multi-step com lista de progresso visível | ❌ | ✅ |
| Modelo procura código antes de assumir | raro | default |
| Sensação "tá pensando comigo" | baixa | alta |

Definição de "produção competitiva": uma tarefa real de patch de complexidade média (3 arquivos, ~50 linhas de mudança total, build verde) leva ≤2× o tempo do Claude Code rodando a mesma tarefa no mesmo modelo.

Sources (estado da arte):
- [Claude Code Built-in Tools Reference](https://www.vtrivedy.com/posts/claudecode-tools-reference)
- [Claude Code Tools — Tools reference](https://code.claude.com/docs/en/tools-reference)
- [The Edit Tool: Precise Replacements](https://repovive.com/roadmaps/claude-code/core-tools-workflows/the-edit-tool-precise-replacements)
- [Anthropic Prompt Caching 2026](https://aicheckerhub.com/anthropic-prompt-caching-2026-cost-latency-guide)
- [Anthropic Automatic Prompt Caching for AI Agents](https://medium.com/ai-software-engineer/anthropic-just-fixed-the-biggest-hidden-cost-in-ai-agents-using-automatic-prompt-caching-9d47c95903c5)
- [Replace Is All You Need (Claude's surgical edits)](https://medium.com/@rquintino/replace-is-all-you-need-the-surprisingly-simple-technique-behind-claudes-new-lightning-fast-b5ae18c3c113)
