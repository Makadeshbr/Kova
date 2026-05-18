# Kova — Pendências Enterprise

> Última auditoria: 2026-05-18
> Origem: auditoria pós-refatoração maio/2026 (commit `8eb9389f` resolveu 9 contratos críticos de roteamento, chat informado, anti-hallucination, gating de bare-blocks, structureTask resiliente, provider sentinel, frontend stack-agnostic, e cleanup).
>
> Este arquivo lista o que **ainda não foi corrigido** para Kova alcançar paridade enterprise com Claude Code, Cursor e Codex.
> Identidade do produto: `KOVA.md`. Arquitetura: `ARCHITECTURE.md`. Estado por package: `ROADMAP.md`.

---

## Como ler este documento

Cada item tem:
- **Onde** — arquivo e linha aproximada
- **Sintoma** — o que o usuário vê (ou veria) hoje
- **Causa raiz** — por que existe
- **Fix proposto** — direção, não código pronto
- **Impacto** — quem é afetado e em que cenário
- **Esforço** — estimativa em tardes/dias

Prioridade: 🔴 Crítico → 🟠 Alto → 🟡 Médio → 🟢 Baixo.

---

## 🔴 Crítico — segurança e confiabilidade básica

### 1. API keys em plain-text no disco

- **Onde:** `apps/electron/src/main/ipc-handlers.ts:65-79` (`getSettingsInternal`)
- **Sintoma:** Chaves de todos os providers (`anthropicKey`, `openaiKey`, `kimiKey`, `deepseekKey`, `openrouterKey`, `geminiKey`, `xaiKey`, `nvidiaKey`, `openaiCompatibleKey`) ficam em `JSON.stringify` puro em `app.getPath('userData')/kova-settings.json`.
- **Causa raiz:** Persistência via `writeFileSync(p, JSON.stringify(settings))` sem encriptação.
- **Fix proposto:**
  - Usar `electron.safeStorage.encryptString` ao salvar campos `*Key`
  - `decryptString` ao ler
  - Migration única: detectar arquivo legado plain-text na primeira execução, encriptar in-place, gravar marker de versão
  - `safeStorage` requer `app.whenReady()` — adicionar guard
- **Impacto:** Qualquer processo com acesso ao userData (malware, sync de backup naive, dump de filesystem) lê todas as chaves. Cursor e Claude Code desktop usam keychain do SO.
- **Esforço:** 1 tarde.

### 2. `apps/electron/out/` committado no repositório

- **Onde:** `git ls-files apps/electron/out` retorna 8 arquivos (`main/index.js`, `preload/index.js`, `renderer/index.html`, assets bundlados).
- **Sintoma:** Cada `pnpm build` polui o diff com milhares de linhas. Devs em paralelo geram merge conflict em bundles minificados. Repo cresce exponencialmente.
- **Causa raiz:** `.gitignore` linha 7 lista `/out*/` (apenas raiz) — não vê `apps/electron/out/`.
- **Fix proposto:**
  - Adicionar `apps/*/out/` ao `.gitignore`
  - `git rm --cached -r apps/electron/out`
  - Commit single-purpose com mensagem clara
- **Impacto:** Todo o time. Já gerou o ruído visto no commit `8eb9389f`.
- **Esforço:** 30 minutos.

### 3. IPC sem rate-limit nem timeout

- **Onde:** `apps/electron/src/main/ipc-handlers.ts:115-128` (`kova:send-message`, `kova:detect-model`, `kova:read-file`, etc.)
- **Sintoma:** Handlers validam shape via `ipc-security.ts` mas não têm rate-limit. Um renderer comprometido (XSS via conteúdo refletido em prompt) pode floodar o main. `manager.sendMessage` pode ficar in flight indefinidamente sem o renderer saber.
- **Causa raiz:** Nenhum middleware de throttling. Nenhum timeout no handler — só dentro de `run_command` (2min).
- **Fix proposto:**
  - Token bucket por IPC channel (ex.: 10 req/s para `kova:send-message`, 30/s para `read-file`)
  - Timeout configurável no handler com `Promise.race` contra `AbortSignal.timeout(N)`
  - Logar tentativas que ultrapassam o bucket
- **Impacto:** Surface de ataque + UX em renderer travado.
- **Esforço:** 1 dia.

### 4. `sandbox: false` no BrowserWindow

- **Onde:** `apps/electron/src/main/index.ts:23-25`
- **Sintoma:** `contextIsolation: true` e `nodeIntegration: false` mitigam, mas com `sandbox: false` o preload roda com node primitives — qualquer bug no preload é escalation direta para acesso de filesystem total.
- **Causa raiz:** Sandbox foi desabilitado provavelmente por algum require Node-only no preload. Não há comentário justificando.
- **Fix proposto:**
  - Ligar `sandbox: true`
  - Mover qualquer chamada Node-only do preload para handlers IPC no main
  - Validar que `contextBridge.exposeInMainWorld` continua funcionando
- **Impacto:** Defesa em profundidade. Claude Code desktop e Cursor rodam com sandbox on.
- **Esforço:** 1 tarde (depende do que tem no preload).

---

## 🟠 Alto — degrada experiência sob carga real

### 5. Sem retry/backoff em chamadas de provider

- **Onde:** `packages/agent/src/providers/anthropic.ts`, `packages/agent/src/providers/openai-compatible.ts`. `packages/agent/src/providers/errors.ts:69` (`isRecoverableProviderError`) existe mas só é consumido por `tryFallbackProvider`.
- **Sintoma:** Um hiccup de rede / 429 / 503 quebra a sessão inteira. Em runs longos com Kimi/DeepSeek isso é comum.
- **Causa raiz:** `generate` e `runAgentLoop` chamam o SDK direto sem wrapper de retry.
- **Fix proposto:**
  - Wrapper `withRetry(provider, { retries: 3, backoffMs: [500, 2000, 8000] })`
  - Aplicar em `generate` e dentro do loop SSE
  - Respeitar header `Retry-After` quando presente
  - Cancelar retries imediatamente se `AbortSignal` disparar
- **Impacto:** Confiabilidade percebida sob latência real de internet.
- **Esforço:** 2 dias (inclui testes determinísticos com fake-timers).

### 6. Sem tracking persistente de token / custo

- **Onde:** `ProviderResponse.tokensUsed` viaja por 44 arquivos. `SessionUsage` no `AppState` zera ao reiniciar.
- **Sintoma:** Usuário não sabe quanto gastou. Cursor mostra "$0.42 used this session".
- **Causa raiz:** Não há ledger persistente nem agregação por sessão/projeto/dia.
- **Fix proposto:**
  - Adicionar `usage-ledger.ts` em `packages/observability`
  - Flush por iteração para `.kova/usage/YYYY-MM.jsonl` (uma linha por turn)
  - Painel no Settings: total por provider × modelo × período
  - Tabela de preços per-model atualizável via `model-catalog.ts`
- **Impacto:** Trust + governance para uso enterprise.
- **Esforço:** 2 dias.

### 7. Sem crash recovery / autosave de iteração

- **Onde:** `packages/execution/src/state.ts` — `ExecutionState` em memória. `useSessionPersistence` (renderer) salva conversa, não o estado mid-flight.
- **Sintoma:** Crash do main process durante iteração → perde tudo o que foi gerado nessa iteração.
- **Causa raiz:** Snapshot só acontece no apply final, não por iteração.
- **Fix proposto:**
  - Snapshot do `ExecutionState` após cada iteração em `.kova/sessions/<id>/state-iter-<N>.json`
  - Flag `resumeFrom` no `StartTaskParams`
  - UI: se detectar sessão pendente ao abrir projeto, oferecer "retomar"
- **Impacto:** Usuário não perde 5 minutos de geração por um crash.
- **Esforço:** 1.5 dias.

### 8. Cancelamento cooperativo incompleto em tools longas

- **Onde:** `packages/agent/src/tools.ts` — `run_command` tem timeout, `grep_codebase`/`glob_files`/`read_file` não checam `AbortSignal` no meio.
- **Sintoma:** Usuário aperta abort, mas o tool em flight continua mais 5-10s antes de parar.
- **Causa raiz:** Signal é propagado para o provider mas não para todos os tools internos.
- **Fix proposto:**
  - Propagar `signal` para todos os tools
  - Em loops > 100 iter (travessia de árvore de arquivos, regex em arquivos grandes), checar `signal.aborted` periodicamente
  - Throw `AbortError` quando disparar
- **Impacto:** UX de abort responsivo.
- **Esforço:** 1 tarde.

---

## 🟡 Médio — gaps de produto

### 9. Zero testes E2E / smoke

- **Onde:** Repo inteiro. Nenhum `playwright`, `spectron`, ou similar.
- **Sintoma:** O bug que originou esta auditoria (chat respondendo email off-topic) era integração ponta-a-ponta — não teria sido pego pelos 1450 unit tests.
- **Causa raiz:** Cobertura é só unitária + integração de packages.
- **Fix proposto:**
  - Adicionar Playwright para Electron
  - 5 cenários mínimos:
    1. Landing scaffold do zero (Kimi K2.6) — verifica que arquivos aparecem
    2. Edit em arquivo existente — verifica diff e apply
    3. Pergunta de chat ("o que é REST?") — verifica que vai pro chat-mode
    4. `/plan` — verifica que retorna PlanResultMessage
    5. Abort mid-run — verifica que tudo para limpo
  - Rodar no CI em paralelo (matrix por provider mockado)
- **Impacto:** Previne regressão do tipo que custou esta auditoria.
- **Esforço:** 2 dias.

### 10. `KovaSettings` sem schema de validação

- **Onde:** `apps/electron/src/main/ipc-handlers.ts:69` (`getSettingsInternal`).
- **Sintoma:** Arquivo corrompido (`maxIterations: "five"`, `permissionMode: "wrong-value"`) passa direto pelo `JSON.parse + spread`, quebra runtime depois.
- **Causa raiz:** `JSON.parse` + spread sem validation.
- **Fix proposto:**
  - Schema zod em `packages/shared/src/settings-schema.ts`
  - `safeParse` por campo (fallback granular, não pelo objeto inteiro)
  - Logar campos rejeitados sem derrubar o app
- **Impacto:** Robustez contra arquivo corrompido / downgrade entre versões.
- **Esforço:** 1 tarde.

### 11. Logger não estruturado

- **Onde:** `apps/electron/src/main/*` — só 4 `console.*` em todo o main (boa disciplina), mas isso significa zero observabilidade quando o usuário reporta bug.
- **Sintoma:** Não há timestamps, níveis, ou rotação. Bug reports vêm sem log de produção.
- **Causa raiz:** Sem logger configurado.
- **Fix proposto:**
  - `pino` ou logger próprio em `packages/observability`
  - Escrever em `.kova/logs/main.log` (rotação diária, retém 7 dias)
  - Comando IPC `kova:export-logs` para gerar zip do `.kova/logs/`
  - Logger respeita level configurável (`info` padrão, `debug` opt-in)
- **Impacto:** Suporte e debugging viáveis.
- **Esforço:** 1 dia.

### 12. Sem auto-updater

- **Onde:** N/A — `electron-updater` não está nas dependências.
- **Sintoma:** Usuário fica em versão buggada até manualmente trocar.
- **Causa raiz:** Updater nunca foi configurado.
- **Fix proposto:**
  - `electron-updater` com canal `latest` em GitHub Release
  - UI: notificação não-intrusiva quando há update disponível
  - Mecanismo de rollback (manter versão anterior por N dias)
- **Impacto:** Distribuição contínua sem fricção.
- **Esforço:** 1.5 dias (inclui configurar release pipeline).

### 13. Sem internacionalização

- **Onde:** Prompts (`apps/electron/src/main/session-prompts.ts`), UI (`apps/electron/src/renderer/src/components/*`).
- **Sintoma:** pt-BR e EN misturados sem proper i18n.
- **Causa raiz:** Strings hardcoded.
- **Fix proposto:**
  - `react-i18next` no renderer
  - LLM prompts ficam em EN com variável `outputLanguage` (modelo entende melhor EN e responde no idioma do usuário)
  - Detector automático baseado em locale do SO
- **Impacto:** Produto multi-tenant precisa de i18n proper.
- **Esforço:** 3 dias.

---

## 🟢 Baixo — polish

### 14. Inconsistência de logging em `terminal-manager.ts`

- **Onde:** `apps/electron/src/main/terminal-manager.ts:3` ainda tem `console.error`.
- **Sintoma:** Inconsistência com o resto do main que já usa event bus.
- **Fix proposto:** Substituir por evento via event bus quando o logger estruturado (#11) existir.
- **Esforço:** 10 minutos (após #11).

### 15. Auditar mudanças não revisadas em `terminal-manager.test.ts`

- **Onde:** `apps/electron/__tests__/terminal-manager.test.ts` apareceu modificado no commit `8eb9389f` mas as mudanças não foram parte do escopo direto da refatoração.
- **Fix proposto:** Diff side-by-side contra `1fe315a6` para confirmar intenção.
- **Esforço:** 15 minutos.

### 16. Duplicação `PRESET_URLS` / `PRESET_MODELS`

- **Onde:** `apps/electron/src/main/provider-resolver.ts:20-42`.
- **Sintoma:** Duplica o catálogo de `@kova/agent`.
- **Causa raiz:** `PROVIDER_DEFAULTS` é importado mas re-empacotado em `PRESET_URLS` / `PRESET_MODELS`.
- **Fix proposto:**
  - Consumir diretamente `PROVIDER_DEFAULTS[name].baseUrl` / `.defaultModel`
  - Remover as constantes intermediárias
  - Único override que sobra: env vars de NVIDIA/Ollama
- **Esforço:** 30 minutos.

---

## Roadmap sugerido

| Sprint | Itens | Justificativa |
|--------|-------|---------------|
| 1 (1 semana) | #1, #2, #4, #16 | Segurança + cleanup imediato |
| 2 (1 semana) | #5, #7, #8 | Confiabilidade percebida sob uso real |
| 3 (1 semana) | #9, #10, #11 | Robustez + observabilidade |
| 4 (2 semanas) | #6, #12, #13 | Governance + distribuição + multi-tenant |

Sprints 1+2 já posicionam Kova em paridade funcional com Cursor / Claude Code para uso individual. Sprints 3+4 são para venda enterprise.

---

## Pergunta-guia para qualquer fix

> **O que prova que isso está correto?**

Sem evidência — não está pronto. Não fechar item sem teste passando + comando executado.
