# Kova — Roadmap para Produção

> Atualizado: maio 2026
> Diagrama completo do sistema em `KOVA_MAP.md`.
> Problemas conhecidos detalhados em `KNOWN_ISSUES.md`.

---

## Onde estamos — Resumo executivo

```
Componente                  Estado          Confiança
─────────────────────────── ─────────────── ────────────
@kova/shared — tipos        ✅ Completo      Alta
@kova/adapters — 14 stacks  ✅ Completo      Alta
@kova/harness — 6 layers    ✅ Completo      Alta
@kova/orchestrator          ✅ Completo      Alta
@kova/decision              ✅ Completo      Alta
@kova/agent — 2 providers   ✅ Completo      Alta
@kova/context — JIT         ✅ Completo      Alta
@kova/application           ✅ Completo      Alta
@kova/memory                ✅ Completo      Alta
@kova/execution             ✅ Completo      Alta
@kova/evals — 61+ casos     ✅ Completo      Média (sem live evals contínuos)
apps/electron               ✅ Funcional     Média (sem testes PTY)
apps/cli                    ✅ Funcional     Média
IPC security                ✅ Completo      Alta
AbortSignal (ponta-a-ponta) ✅ Completo      Alta
Review Gate real            ✅ Completo      Média (semantic só TS/Go)
ExecutionContract           ✅ Completo      Alta
Streaming de eventos        ✅ Completo      Alta
Multi-provider auditável    ✅ Completo      Alta (125 testes, fallback E2E coberto)
Staging de escrita isolado  ✅ Completo      Alta (116 testes, 0 regressões)
Semantic review 13 linguagens✅ Completo      Alta (88 testes, 45 em review-gate)
Testes PTY/TerminalManager  ✅ Completo      Alta (31 testes, 7 grupos, mock sem native)
Evals streaming interrompido✅ Completo      Alta (bug SSE corrigido + 18 testes)
Histórico longo (revisão)   ✅ Completo      Alta (maxMessages guard, 28 testes)
─────────────────────────── ─────────────── ────────────
run_command staged files    ⚠️ Parcial       Baixa (vê disco original, harness é autoritativo)
Evals streaming interrompido❌ Falta         —
Dogfooding de prompts       ⚠️ Mínimo        Baixa
Histórico longo (revisão)   ⚠️ Parcial       Baixa
```

---

## Etapas até 100% para produção

### Etapa 1 — Segurança operacional (crítico)

**Staging de escrita isolado** ✅ CONCLUÍDO

Implementado em `packages/agent/src/tools.ts`. Todas as escritas e deleções ficam em buffer em memória. O disco do projeto nunca é tocado durante o agent loop. `ApplicationEngine.apply()` permanece o único ponto de escrita real no disco.

Evidência:
- 116 testes em `@kova/agent` (56 novos em `tools.test.ts`), 0 falhas
- 0 regressões em `@kova/execution`, `@kova/orchestrator`, `@kova/decision`
- Invariante testada: `existsSync(join(projectRoot, path))` retorna false após write_file

---

**AbortSignal no ExecutionEngine → agent.execute()** ✅ JÁ IMPLEMENTADO

Verificado em `packages/execution/src/execution-engine.ts` linha 267: `signal: this.abortController.signal` está presente nos `agentOptions` passados para `agent.execute()`. O item no memory file estava desatualizado.

---

### Etapa 2 — Qualidade de validação

**Semantic review global — todas as 13 linguagens do Kova** ✅ CONCLUÍDO

Implementado em `packages/decision/src/review-gate.ts`. Extractors para todas as linguagens suportadas pelos adapters: TypeScript/JS (AST), Go, Python, Rust, Java, Kotlin, Ruby, PHP, Swift, Dart, C#, C/C++.

Evidência: 88 testes em `@kova/decision` (45 em review-gate.test.ts), 0 falhas, build limpo.

---

**Evals de streaming interrompido** ✅ CONCLUÍDO

Bug corrigido: `reader.read()` loop em `OpenAICompatibleProvider.streamingTurn()` não normalizava erros de rede. Fix: try/catch/finally com `normalizeProviderError` + `reader.releaseLock()`.

18 testes em `packages/agent/__tests__/streaming-interruption.test.ts`:
- SSE mid-read throws → KovaProviderError(provider_unavailable, recoverable)
- Chunk boundary split → buffer acumula corretamente
- Malformed JSON chunk → skip silencioso
- Premature close → partial response sem erro
- Tool call args split across events → assembled corretamente
- tool_call_id preservado do stream incremental
- Anthropic finalMessage() throws → normalized
- State isolation: disco nunca tocado após falha

Evidência: 134 testes `@kova/agent`, 0 falhas, build limpo.

---

### Etapa 3 — Cobertura de evals end-to-end

**Evals de fallback de provider end-to-end** ✅ CONCLUÍDO

Implementado em `apps/electron/__tests__/provider-fallback-e2e.test.ts`. 19 testes cobrindo:
- `tryFallbackProvider` path de sucesso com settings injetadas via `vi.mock`
- Guards: auth não recuperável, abort, fallback circular, factory falha, sem config
- EngineManager E2E: rate_limit → fallback → `provider_session_start` com `fallback:true` + providers corretos + stream_end exatamente uma vez
- unavailable → fallback; fallback também falha → error reportado corretamente

Evidência: 105 testes em `@kova/electron`, 0 falhas.

---

**Testes do TerminalManager / PTY** ✅ CONCLUÍDO

31 testes em `apps/electron/__tests__/terminal-manager.test.ts` (7 grupos):
- PTY null: isAvailable, runInteractive e openTerminal sem pty
- Session lifecycle: exit natural, kill(), duplo kill idempotente, múltiplos data events
- Concurrent sessions: dois PTY simultâneos e isolados
- Ops resilientes: writeInput/resize/kill/approveInteractive em sessão inexistente
- Approval edge cases: timeout 60s (fake timers), dois approvals simultâneos, no-op no segundo approve, sem webContents
- Payloads IPC exatos: interactive-request, terminal-started, terminal-data, terminal-exit

CI: FakePtyProcess mock — sem node-pty real. Evidência: 125 testes `@kova/electron`, 0 falhas.

---

### Etapa 4 — Polimento de produto

**Dogfooding de prompts**

Estado atual: prompts funcionam, mas não foram submetidos a volume real de tarefas diversas. Refinamento dependente de uso contínuo.

O que falta:
- Pipeline de dogfooding: registrar tarefa real → score → decisão → satisfação
- Identificar padrões de falha de prompt (task mal estruturada, contexto insuficiente, etc.)
- Ajustar `MODE_PROMPTS` e `SYSTEM_PROMPT` com base em evidência real

Critério de conclusão:
- 20+ tarefas reais executadas e pontuadas
- Score médio ≥ 75 em tarefas de patch sem intervenção humana
- Casos de falha documentados com causa raiz

---

**Histórico longo — degradação de contexto** ✅ CONCLUÍDO

`buildTokenBudgetedHistory` extraída de `App.tsx` para `apps/electron/src/main/history-utils.ts`. Guard `maxMessages=40` adicionado: 60 mensagens curtas (600 chars < 20k budget) eram todas incluídas antes; agora apenas as últimas 40.

App.tsx: importa do módulo centralizado, passa `{ taskOnly }` em vez de filtrar externamente.

28 testes em `apps/electron/__tests__/history-utils.test.ts` cobrindo todos os critérios. 153 testes `@kova/electron`, 0 falhas.

---

**UX de estado paused — revisão de diff interativa**

Estado atual: `DiffReviewSelection` com checkboxes por arquivo e por hunk já existe. UX ainda pode melhorar visibilidade do estado "aguardando revisão".

O que falta:
- Estado `paused` claramente visível na StatusBar e no ChatArea
- Indicação do score e motivo da pausa para o usuário
- Botão "Aplicar seleção" que passa DiffReviewSelection para `forceApply()`

Critério de conclusão:
- Usuário consegue fazer revisão hunk-a-hunk sem abrir logs
- Score e motivo da decisão são legíveis sem scroll

---

### Etapa 5 — Expansão e produção real

**Providers adicionais**

- Google Gemini (protocolo próprio)
- Ollama local (protocolo OpenAI-compatible — parcialmente coberto já)
- Matrizes de compatibilidade por provider/modelo (campos suportados, limites de contexto, tool call format)

**Adapters de stack**

- Semantic review para Python, Rust, Java (Etapa 2 cobre isso)
- Adapters adicionais: Zig, Elixir, Haskell (baixa prioridade)
- Testes de mismatch de stack para todas as 14 linguagens (hoje testado para TS, Go, Python)

**Distribuição**

- Empacotamento do Electron para Windows/Mac/Linux (electron-builder já presente)
- Release pipeline documentado
- CLI publicado como npm package (`kova` global)
- Versão mínima do Node.js documentada e verificada

---

## O que NÃO está no roadmap

Estes itens foram considerados e descartados:

| Item | Motivo |
|---|---|
| Integração com IDE (VS Code, JetBrains) | Fora do escopo atual; CLI + Electron cobrem os casos de uso |
| Servidor web / API REST pública | Kova é local por design |
| Database de projetos | Memory local é suficiente; cloud sync é produto separado |
| Multi-agent / swarm | Complexity não justificada pelo benefício atual |

---

## Critério global de "pronto para produção"

Uma versão do Kova está pronta para produção quando:

1. Staging de escrita isolado está implementado — disco do usuário nunca vê estado intermediário quebrado.
2. AbortSignal passa para `agent.execute()` — cancel é limpo, sem processo zombie.
3. 3+ evals de streaming interrompido passam — provider instável não corrompe estado.
4. Evals de fallback end-to-end passam — provider fallback é auditável, não silencioso.
5. Testes de PTY passam em CI — terminal funciona de forma previsível.
6. Score médio ≥ 75 em 20+ tarefas de dogfooding real.
7. Empacotamento funcional para pelo menos Windows e macOS.
8. README de instalação e primeiro uso validado por pessoa nova ao projeto.

---

## Limpeza necessária (remanescentes do fork Void)

Os arquivos abaixo são remanescentes do fork Void e devem ser removidos:

```
.tmp/                          — dados de sessão VSCode do Void (gitignored, lixo em disco)
.vscode/cglicenses.schema.json — schema do sistema de licença do build do Void
.vscode/launch.json            — configs de debug do Void (Gulp, Attach to Extension Host)
.vscode/tasks.json             — tasks do Void (hygiene, smoke test, etc.)
.vscode/extensions.json        — recomendações de extensões VSCode para dev de extensão
Rules.md                       — duplicata parcial do CLAUDE.md, causa conflito para IA
```

E no `.gitignore`, remover padrões do Void que não existem no projeto:
```
src/vs/workbench/contrib/void/browser/react/out/**
src/vs/workbench/contrib/void/browser/react/src2/**
/cli/target
/cli/openssl
/.profile-oss
vscode.lsif
vscode.db
/extensions/**/out/
extensions/**/dist/
```

`KOVA.md` na raiz pode ser mantido como entrada para ferramentas AI (é útil), mas deve ser revisado para remover referências desatualizadas.

`VisualRefrencia/referenciavisual.md` deve ser mantido — é referência de design visual ativa.

---

## Índice de documentos do projeto

| Arquivo | Propósito |
|---|---|
| `CLAUDE.md` | Regras mestras para qualquer IA — sempre lido primeiro |
| `KOVA_MAP.md` | Diagrama completo do sistema em seu auge |
| `KOVA_ROADMAP.md` | Estado atual + etapas para 100% (este arquivo) |
| `ARCHITECTURE.md` | Fluxo de dados e estados da UI — referência técnica |
| `EVENT_CONTRACT.md` | Contrato de todos os ExecutionEvents |
| `KNOWN_ISSUES.md` | Problemas conhecidos e limitações de design |
| `README.md` | Apresentação pública do projeto |
