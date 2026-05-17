# Kova — Arquitetura

> Última revisão: maio 2026.
> Identidade do produto em `KOVA.md`. Pendências em `ROADMAP.md`.
> Instruções para IA em `CLAUDE.md`.

---

## Visão geral

Monorepo TypeScript com `pnpm` + `turbo`. Dois apps consomem 14 packages.

```
apps/
  electron/      Desktop GUI (Vite + React + Electron)
  cli/           Terminal CLI

packages/
  shared/        Tipos e contratos. Sem deps internas.
  adapters/      Detecção de stack (14 stacks).
  harness/       Layers de validação (build, typecheck, tests, rules, security, lint).
  orchestrator/  Coordena layers + workspace isolado para validação.
  decision/      Score + decide() + review gate.
  agent/         Providers (Anthropic, OpenAI-compatible) + tools + prompts.
  context/       Context pack JIT (grep + grafo + memory).
  memory/        Learnings persistidos.
  application/   Apply atômico + git checkpoint + rollback.
  execution/     Loop multi-iteração (ExecutionEngine).
  evals/         Suite de evals reproduzível.
  observability/ Traces.
  project/       ProjectProfile builder.
  kova-runner/   Runner usado pela CLI.
```

**Direção de dependências:**

```
shared → todos
adapters / harness / agent / context / memory / application → orchestrator / decision / execution / kova-runner → apps
```

`@kova/shared` nunca importa de outro `@kova/*`. Se surgir circular, extrair pra cá.

---

## Fluxo de uma mensagem do usuário

```
Renderer (ChatArea)
  → sendMessage IPC (com attachments)
  → main process: EngineManager.sendMessage
    → inferRunMode (chat | review | plan | patch)
    │
    ├─ chat   → runChatSession (tools = [], maxTurns = 1)
    ├─ review → runReviewSession (READ_ONLY_TOOLS, maxTurns = 20)
    ├─ plan   → runPlanSession (READ_ONLY_TOOLS, maxTurns = 8)
    └─ patch  → runUnifiedSession → ExecutionEngine
                  ↓
            Agent.execute (todos os tools)
                  ↓
            Loop multi-iteração:
              1. ContextEngine.buildContext (cached por turn)
              2. Provider.runAgentLoop (streaming + tool calls)
                 - write_file (creates streamam disk; modifies buffered)
                 - edit_file, delete_file, read_file, list_files, etc.
              3. validateOutput:
                 - Pure-create scaffolding → bypass harness (sintético pass)
                 - Modify → orchestrator roda harness em workspace isolado
              4. decide() → auto_apply | suggest | reject | human_required
              5. Se auto_apply → ApplicationEngine.apply
                 - Safe zones bloqueadas (modify de .env, lockfile, etc.)
                 - Detecta mudança externa
                 - Cria checkpoint git
                 - Escreve files
                 - Commit
                 - Rollback se falhar
              6. Memory.recordFromIteration (best-effort)
```

---

## Estados da ExecutionState

```
structuring → planning → coding → validating → deciding → applying
                                                    ↘
                                                     paused | completed | failed
```

A UI no `apps/electron` depende de cada string exata. Não alterar sem atualizar componentes (HarnessDashboard, StatusBar, ChatArea, status-context.ts).

Mapping para o usuário:
- `paused` com `changes` → "X files ready to apply" + botão Apply
- `paused` sem changes → human_required (precisa decisão)
- `completed` → git commit feito
- `failed` → hard fail real (build broken, score 0)

---

## Comportamento canônico — duas fases

### Scaffolding (todas mudanças são `type:create` + `before:undefined`)

Bypassa contrato e harness. CC parity.

- `validateContractChanges` retorna apenas violações em `forbiddenPaths` + credenciais (.env*) + cap de 150 arquivos.
- `validateOutput` retorna pass sintético sem rodar orchestrator.
- `decide()` retorna auto_apply com score lifted para 90.
- `write_file` escreve direto no disco; sidebar refresha imediatamente.
- ApplicationEngine.apply faz idempotent write + git commit.

### Modify (qualquer change tem `before` definido)

Contrato + harness rodam.

- `validateContractChanges` enforça max_files_changed (15/30/60 por impact), allowed_paths, stack_mismatch.
- Orchestrator clona projectRoot pra workspace isolado, aplica changes, roda layers configurados.
- Harness reporta resultado mas **deve ser informativo** (ver ROADMAP — mudança pendente: tornar warnings não-bloqueantes).
- ApplicationEngine.apply faz atomic write + git commit.

---

## Camadas do harness

| Layer | Quando roda | Hard fail? |
|---|---|---|
| `build` | Sempre que detectado | ❌ (vai virar informativo) |
| `typecheck` | Quando há tsconfig | ❌ |
| `tests` | Quando há test runner | ❌ |
| `rules` | Sempre (contract validation) | Apenas forbidden_path/credential |
| `security` | Modo full | ❌ |
| `lint` | Modo full | ❌ |

Modos: `fast` (rules+lint), `standard` (build+tests+rules), `full` (todos).

**Score** calculado em `@kova/decision/score.ts`. Pesos adaptativos quando layers são skipped.

**Pendência:** hoje `decide()` ainda pode retornar `reject` em modify com layers falhando. Norte (KOVA.md) diz "informativo, nunca bloqueia". Alinhamento de código pendente — ver `ROADMAP.md`.

---

## Apply atômico

`@kova/application/CodeApplicationEngine.apply`:

1. Aplica `DiffReviewSelection` se houver (filtra hunks aprovados)
2. Bloqueia safe zones em modify (não em create)
3. Detecta mudança externa no disco (proteção contra race)
4. Cria checkpoint Kova
5. `writeChanges` escreve disk
6. `GitHelper.commit` cria commit com paths + score
7. Retorna `checkpointId`: `git:<hash>` ou `kova:<id>`
8. Rollback automático em erro

`rollback(checkpointId)`:
- `git:<hash>` → `git revert`
- `kova:<id>` → restore via copy de safe checkpoint

---

## Multi-provider

**Source única**: `packages/agent/src/providers/model-catalog.ts` + `packages/shared/src/model-vision.ts`.

- 11 providers: Anthropic, OpenAI, Gemini, Grok (xAI), DeepSeek, Kimi (Moonshot), OpenRouter, NVIDIA, Ollama, LM Studio, OpenAI-compatible.
- `detectCapabilities(modelId)` retorna `{supportsToolCalls, contextTokenLimit, supportsPromptCaching, supportsVision}`.
- Vision detection compartilhada com renderer via `@kova/shared/browser-safe`.
- Fallback: configurar `fallbackProvider`/`fallbackModel` em settings. Auditável via evento `provider_session_start` (requested vs resolved).

Adapters implementados:
- `AnthropicProvider` — usa SDK oficial, prompt caching com `cache_control`, image blocks.
- `OpenAICompatibleProvider` — usa fetch direto, SSE streaming, multimodal via `image_url`.

---

## Attachments (vision/file)

**Tipos em `@kova/shared`**: `Attachment`, `AttachmentKind`, `AgentMessage.attachments`.

**Fluxo:**
```
ChatArea (+, drag-drop, paste)
  → File → base64 → Attachment[]
  → IPC sanitize (10MB/file, 50MB/msg, 12 max, mime allowlist)
  → AgentMessage.attachments
  → Provider adapter converte para formato nativo:
      Anthropic: image content block
      OpenAI:   image_url content part (data: URL)
      Não-imagem: formatTextAttachment (inline texto delimitado)
```

`Buffer.from(base64).slice(0, 50_000)` para texto. Binário inline com placeholder.

---

## IPC + Segurança (Electron)

`apps/electron/src/preload/index.ts` expõe `window.kova.*` via contextBridge.

Cada handler em `apps/electron/src/main/ipc-handlers.ts`:
1. `assertTrustedIpcSender(event)` — checa origem
2. Sanitize estruturado (`sanitizeStartTaskParams`, `sanitizeAttachments`, etc.)
3. Caps de tamanho enforced

Eventos main → renderer em `apps/electron/src/main/engine-manager.ts` via `this.emit()`. Tipos em `packages/shared/src/types.ts` (`ExecutionEvent`).

---

## Eventos críticos da `ExecutionEvent`

Tipos consumidos pela UI (não remover sem atualizar consumidores):

| type | Consumido por |
|---|---|
| `token` | ChatArea (acumula em streamingText) |
| `stream_end` | ChatArea (flush text → message) |
| `tool_call` | ActivityFeed (linha visível), Sidebar (refresh em write_file/delete_file) |
| `tool_result` | ActivityFeed (marca complete) |
| `command_output` | ActivityFeed (stdout live no chat) |
| `validation_started` / `validation_completed` | HarnessDashboard |
| `apply_started` / `apply_completed` | Sidebar (refresh final), HarnessDashboard |
| `decision_made` | HarnessDashboard |
| `state_changed` | tudo |
| `provider_session_start` | TitleBar + LiveFeed (audit trail) |
| `provider_error` | ChatArea (mensagem de erro) |
| `todos_updated` | TodoListCard |
| `context_loaded` | SessionUsage breakdown |

---

## Storage local

Não há banco. Persistência via filesystem:

- `.kova/checkpoints/` — Kova checkpoints (fallback se git falhar)
- `.kova/sessions/` — sessões salvas (autosave)
- `.kova/traces/` — traces de execução
- `.kova/harness.json` — config opcional de comandos de validação
- `.kova/learnings.json` — memory promovida
- `~/.kova/skills/` (pendente) — skills user-level

---

## Convenções de UI

Tokens em `apps/electron/src/renderer/src/styles/global.css`:

```css
--bg-0 --bg-1 --bg-2 --bg-3 (escuro)
--text-1 --text-2 --text-3 --text-ghost
--amber --cyan --teal --purple --red --yellow (com -dim variants)
--border --border-focus
--font-ui --font-mono
```

**Nunca hardcode cores.** Sem emoji funcional. Componentes >400 linhas devem ser divididos (exceção justificada em UI complexa).

---

## Onde está cada coisa (mapa rápido)

| Quer entender... | Olhe em |
|---|---|
| O loop de uma iteração | `packages/execution/src/execution-engine.ts` |
| Como o agente chama tools | `packages/agent/src/providers/*.ts` |
| Como o harness valida | `packages/orchestrator/src/orchestrator.ts` + `packages/harness/src/layers/*.ts` |
| Como decide auto_apply | `packages/decision/src/decision-engine.ts` |
| Como aplica atomicamente | `packages/application/src/application-engine.ts` |
| Como builda contexto | `packages/context/src/context-engine.ts` |
| Como sanitiza IPC | `apps/electron/src/main/ipc-security.ts` |
| Como o chat renderiza | `apps/electron/src/renderer/src/components/ChatArea.tsx` |
| Como sidebar atualiza | `apps/electron/src/renderer/src/components/ProjectFiles.tsx` + `useEngineEvents.ts` |

Cada package tem `CLAUDE.md` local com detalhes específicos.
