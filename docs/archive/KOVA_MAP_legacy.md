# Kova — Mapa Completo do Sistema

> Este arquivo descreve o Kova em seu estado ideal de 100%.
> É o norte de produto. Use para orientar decisões de arquitetura e priorização.
> Estado atual de cada componente está em `KOVA_ROADMAP.md`.

---

## O que é o Kova

Kova é um **sistema de engenharia guiado por harness**. Ele edita arquivos, conversa sobre código e executa ferramentas — mas faz isso sob **contrato, validação independente e evidência verificável**.

O diferencial não é restringir o que o modelo faz. É garantir que o resultado seja verificável, revertível e auditável.

```
LLM propõe.
Harness valida.
Testes confirmam.
Diff prova.
Usuário decide.
Sem evidência verificável — a tarefa não está concluída.
```

Diferencial central frente a Claude Code, Codex e OpenCode:

| Capacidade | Concorrentes | Kova |
|---|---|---|
| Edição de código | Sim | Sim |
| Validação independente | Não | Sim — harness com Evidence Score |
| Rollback com checkpoint | Não | Sim |
| Multi-provider auditável | Parcial | Sim — sem mascaramento |
| Memória com promoção | Não | Sim |
| Staging isolado antes de apply | Não | Roadmap |
| Contrato de execução explícito | Não | Sim |
| Evals do loop completo | Não | Sim |

---

## Diagrama de arquitetura — Kova a 100%

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SURFACE LAYER                                  │
│                                                                             │
│   ┌──────────────────────────┐      ┌──────────────────────────────────┐   │
│   │     apps/electron        │      │         apps/cli                  │   │
│   │  Electron + React + IPC  │      │   CLI standalone (kova command)   │   │
│   │                          │      │                                   │   │
│   │  Componentes:            │      │  Modos:                          │   │
│   │  • ChatArea              │      │  • chat (conversa)               │   │
│   │  • TerminalPanel (PTY)   │      │  • plan (somente leitura)        │   │
│   │  • HarnessDashboard      │      │  • patch (execução completa)     │   │
│   │  • FilesViewer (diff)    │      │  • review (somente leitura)      │   │
│   │  • MemoryPanel           │      │                                   │   │
│   │  • ProjectFiles          │      │  Saída:                          │   │
│   │  • AgentStream           │      │  • stream de tokens em tempo real │   │
│   │  • ModelPicker           │      │  • harness summary               │   │
│   │  • StatusBar             │      │  • decisão + diff                │   │
│   └──────────────┬───────────┘      └──────────────┬───────────────────┘   │
│                  │ IPC (contextBridge)              │ STDIN/STDOUT           │
└──────────────────┼──────────────────────────────────┼─────────────────────-─┘
                   │                                  │
┌──────────────────▼──────────────────────────────────▼───────────────────────┐
│                          RUNNER / ENGINE LAYER                               │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                        EngineManager                                 │  │
│   │                    (apps/electron/main)                              │  │
│   │                                                                      │  │
│   │  Modos de sessão:                                                    │  │
│   │  • runChatSession()    → Agent read-only, 1 turn, sem tools         │  │
│   │  • runPlanSession()    → Agent read-only, READ_ONLY_TOOLS, 8 turns  │  │
│   │  • runReviewSession()  → Agent read-only, READ_ONLY_TOOLS, 20 turns │  │
│   │  • runUnifiedSession() → ExecutionEngine (patch completo)           │  │
│   │                                                                      │  │
│   │  Responsabilidades:                                                  │  │
│   │  • Gerenciar AbortController por sessão                             │  │
│   │  • Emitir ExecutionEvents para IPC                                  │  │
│   │  • Resolver provider disponível                                      │  │
│   │  • Cache de ContextEngine e MemorySystem por projectRoot            │  │
│   └──────────────────────────────┬───────────────────────────────────────┘  │
│                                  │                                           │
│   ┌──────────────────────────────▼───────────────────────────────────────┐  │
│   │                       ExecutionEngine                                │  │
│   │                      (@kova/execution)                               │  │
│   │                                                                      │  │
│   │  Loop multi-iteração (máx 5):                                        │  │
│   │                                                                      │  │
│   │  [structuring] → [planning*] → [coding] → [validating]              │  │
│   │       → [deciding] → [applying | paused | failed]                   │  │
│   │                                                                      │  │
│   │  *planning só se skipPlan=false                                      │  │
│   │                                                                      │  │
│   │  Emite ExecutionEvent a cada mudança de estado:                     │  │
│   │  contract_created, agent_started, token, tool_call, tool_result,    │  │
│   │  validation_started, validation_completed, decision_made,           │  │
│   │  apply_started, apply_completed, stream_end                         │  │
│   │                                                                      │  │
│   │  Controla:                                                           │  │
│   │  • pause() / resume() / abort() / forceApply()                      │  │
│   │  • ExecutionContract — valida mudanças contra contrato antes de     │  │
│   │    aplicar (stack mismatch, paths proibidos, scope)                 │  │
│   │  • ProofPack — gera evidência auditável por iteração                │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           CORE PACKAGES                                      │
│                                                                              │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐    │
│   │  @kova/context  │  │   @kova/agent   │  │   @kova/orchestrator    │    │
│   │                 │  │                 │  │                         │    │
│   │ Monta contexto  │  │ Executa LLM com │  │ Cria staging workspace  │    │
│   │ JIT para o      │  │ tool calling e  │  │ em /tmp, copia arquivos,│    │
│   │ agente:         │  │ streaming real  │  │ escreve mudanças,       │    │
│   │                 │  │                 │  │ executa harness pipeline │    │
│   │ • Grep por      │  │ Providers:      │  │                         │    │
│   │   objetivo      │  │ • Anthropic     │  │ → retorna OrchestratorR │    │
│   │ • Grafo de deps │  │ • OpenAI-compat │  │   (HarnessResult +      │    │
│   │ • RULES.md      │  │   (DeepSeek,    │  │    FileChanges)         │    │
│   │ • Arquivos de   │  │   Grok, local)  │  │                         │    │
│   │   erro          │  │                 │  │ Score penalty para:     │    │
│   │ • Learnings da  │  │ Tools:          │  │ • patch grande          │    │
│   │   memória       │  │ • write_file    │  │ • arquivo sensível      │    │
│   │ • Budget 40k    │  │ • read_file     │  │ • código sem teste      │    │
│   │   tokens        │  │ • delete_file   │  │                         │    │
│   │                 │  │ • list_files    │  └─────────────────────────┘    │
│   │ Relevância:     │  │ • run_command   │                                  │
│   │ rules > target  │  │                 │  ┌─────────────────────────┐    │
│   │ > error >       │  │ Timeout: 8 min  │  │    @kova/harness        │    │
│   │ learning >      │  │ Max turns: 10   │  │                         │    │
│   │ indirect_dep    │  │ AbortSignal ✓   │  │ Pipeline de validação:  │    │
│   └─────────────────┘  └─────────────────┘  │                         │    │
│                                             │ Layer    Weight  Fail   │    │
│   ┌─────────────────┐  ┌─────────────────┐  │ build      20   hard   │    │
│   │  @kova/decision │  │ @kova/application│  │ typecheck  15   hard   │    │
│   │                 │  │                 │  │ tests      30   soft   │    │
│   │ Decide baseado  │  │ Aplica mudanças  │  │ security   15   critical│   │
│   │ no Evidence     │  │ em disco com    │  │ rules      10   soft   │    │
│   │ Score:          │  │ segurança:      │  │ lint       10   soft   │    │
│   │                 │  │                 │  │                         │    │
│   │ score ≥ 90 →    │  │ • Detecção de   │  │ Safe zones no staging:  │    │
│   │   auto_apply    │  │   safe zones    │  │ • .env*                 │    │
│   │ score ≥ 70 →    │  │ • Checkpoint    │  │ • lockfiles             │    │
│   │   suggest       │  │   em .tar.gz    │  │ • package.json          │    │
│   │ score < 70 →    │  │ • Detecção de   │  │ • .github/**            │    │
│   │   reject        │  │   alteração     │  │ • docker-compose*       │    │
│   │ human_req →     │  │   externa       │  │ • config/**             │    │
│   │   pausa         │  │ • Rollback      │  │                         │    │
│   │                 │  │   se apply      │  │ validationConfidence:   │    │
│   │ Review Gate:    │  │   falhar        │  │ none   → score ≤ 55    │    │
│   │ • Safe zones    │  │                 │  │ partial → score ≤ 85   │    │
│   │ • Secrets       │  │ Diff hunk       │  │ full    → score livre   │    │
│   │ • Scope excessivo│ │ selection:      │  │                         │    │
│   │ • Arqs. gerados │  │ • Por arquivo   │  └─────────────────────────┘    │
│   │ • Dep nova      │  │ • Por hunk      │                                  │
│   │ • Stagnação     │  └─────────────────┘                                  │
│   │   (4+ erros =)  │                                                       │
│   │   human_required│  ┌─────────────────┐  ┌─────────────────────────┐    │
│   └─────────────────┘  │  @kova/memory   │  │   @kova/adapters        │    │
│                        │                 │  │                         │    │
│                        │ Learnings:      │  │ Detecta stack do projeto│    │
│                        │ • experimental  │  │ e resolve comandos:     │    │
│                        │ • verified      │  │                         │    │
│                        │ • canonical     │  │ Ordem:                  │    │
│                        │                 │  │ Flutter → Swift → .NET  │    │
│                        │ Promoção:       │  │ → Gradle → Maven →      │    │
│                        │ 3+ evidências → │  │ Rust → Go → Python →    │    │
│                        │ verified        │  │ Ruby → PHP → C++ →      │    │
│                        │                 │  │ TypeScript → C →        │    │
│                        │ Anti-drift:     │  │ Generic                 │    │
│                        │ • Contradições  │  │                         │    │
│                        │ • Fingerprint   │  │ 14 adapters             │    │
│                        │   de stack      │  │                         │    │
│                        │                 │  │ Resolve: build, test,   │    │
│                        │ Limites:        │  │ lint, format por projeto │   │
│                        │ 200/projeto     │  └─────────────────────────┘    │
│                        │ 500/global      │                                  │
│                        └─────────────────┘                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                         FOUNDATION LAYER                                     │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         @kova/shared                                │   │
│   │                                                                     │   │
│   │  Tipos sem dependências externas. Todo package importa daqui.       │   │
│   │                                                                     │   │
│   │  TaskDefinition • HarnessResult • LayerResult • EvidenceScoreBreakdown  │
│   │  DecisionResult • DecisionContext • ExecutionState • ExecutionEvent  │   │
│   │  FileChange • Learning • IterationRecord • ExecutionContract        │   │
│   │  AgentMode • AgentOutput • AgentContext • AgentMessage              │   │
│   │  ProofPack • DiffReviewSelection • KovaMetrics                     │   │
│   │                                                                     │   │
│   │  normalizeCommandInvocation() • runCommandInvocation()             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────┐   ┌──────────────────────┐                        │
│   │  @kova/observability │   │    @kova/project     │                        │
│   │                     │   │                      │                        │
│   │  Traces e métricas  │   │  Scan do projeto:    │                        │
│   │  de execução        │   │  • findProjectRoot   │                        │
│   │  (KovaMetrics,      │   │  • buildProjectProfile│                       │
│   │  ExecutionTrace)    │   │  • loadHarnessConfig  │                       │
│   └─────────────────────┘   │  • detecta monorepo  │                        │
│                             └──────────────────────┘                        │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                          QUALITY LAYER                                       │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │                         @kova/evals                                │    │
│   │                                                                    │    │
│   │  Suite versionada de casos de teste do loop completo do agente:    │    │
│   │                                                                    │    │
│   │  Categoria          Casos                                          │    │
│   │  ─────────────────  ─────────────────────────────────────────────  │    │
│   │  Stack mismatch     Go não cria .ts; TypeScript não cria .py       │    │
│   │  Scope              frontend task não toca backend                 │    │
│   │  Safe zones         package.json → suggest; .env → human_required  │    │
│   │  Security           dist/*, node_modules/ bloqueados              │    │
│   │  Repair loop        score < 70 → nova iteração com feedback        │    │
│   │  Review mode        sem escrita de arquivo                         │    │
│   │  Multi-turn         contexto e erros preservados                  │    │
│   │  Provider fallback  provider/modelo real registrado               │    │
│   │  Secret hardcoded   security → score 0                            │    │
│   │  Score distribution sem test layer → score ≤ 85                   │    │
│   │                                                                    │    │
│   │  Tipos:                                                            │    │
│   │  • Static evals — sem agente (testam harness + decision + gate)    │    │
│   │  • Live evals   — com ExecutionEngine real                         │    │
│   │  • Dogfood cases — 7 tarefas versionadas com golden output         │    │
│   └────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de dados completo — Kova a 100%

```
Usuário → Surface (Electron/CLI)
    │
    ▼
EngineManager
    │
    ├─ chat/plan/review → Agent (READ_ONLY_TOOLS) → resposta streaming
    │
    └─ patch → ExecutionEngine
                    │
                    ├─ 1. structureTask (via LLM) → TaskDefinition + ExecutionContract
                    │
                    ├─ 2. ContextEngine.buildContext()
                    │       └─ grep + deps + learnings + error files → AgentContext
                    │
                    ├─ 3. Agent.execute() [modo unified]
                    │       └─ LLM + AGENT_TOOLS → FileChange[] + thought
                    │           • write_file, read_file, run_command, list_files, delete_file
                    │           • ToolExecutor rastreia FileChange com diff + before
                    │
                    ├─ 4. ExecutionContract.validate(changes)
                    │       └─ stack mismatch, forbidden paths, scope → reject se violado
                    │
                    ├─ 5. [ROADMAP] Staging isolado
                    │       └─ Escreve mudanças em worktree git ou tmpdir ANTES de aplicar
                    │          Harness valida sobre staging, não sobre projectRoot
                    │
                    ├─ 6. HarnessOrchestrator.run(changes)
                    │       └─ Cria /tmp/kova-validate-* → copia projeto → escreve changes
                    │          Executa layers → retorna HarnessResult + Evidence Score
                    │
                    ├─ 7. DecisionEngine.decide(harnessResult, history)
                    │       └─ Review Gate + score → auto_apply | suggest | reject | human_required
                    │
                    ├─ 8. ApplicationEngine.apply(changes) [se auto_apply]
                    │       └─ Checkpoint → verifica safe zones → escreve em disco → rollback se falhar
                    │
                    └─ 9. MemorySystem.recordFromIteration() [se auto_apply]
                            └─ Extrai learnings → promoção → anti-drift
```

---

## Provider Protocol — como deve funcionar a 100%

```
Chamada de modelo → ProviderAdapter
                        │
                        ├─ Normaliza mensagens para formato do provider
                        ├─ Normaliza tool_call / tool_result para contrato Kova
                        ├─ Normaliza erros (rate_limit, auth_failed, context_length, ...)
                        ├─ Preserva campos de multi-turn (tool_use_id, role, etc.)
                        ├─ Registra: provider_solicitado, modelo_solicitado,
                        │           provider_executado, modelo_executado
                        ├─ Registra fallback/retry quando ocorrem
                        └─ Nunca mascara output de um modelo como se fosse de outro

Providers a 100%:
├─ Anthropic (claude-*) — streaming SSE + tool_use + tool_result + reasoning privado
├─ OpenAI-compatible (DeepSeek, Grok, local) — SSE + function_call + reasoning_content
├─ [Roadmap] Google Gemini
└─ [Roadmap] Ollama local (protocolo OpenAI-compatible)
```

---

## Modelo de eventos — ExecutionEvent

Todo evento emitido pelo sistema segue o contrato definido em `@kova/shared/EVENT_CONTRACT.md`.

Eventos críticos:
```
provider_session_start   — com providerMeta (modelo solicitado vs executado, fallback)
contract_created         — ExecutionContract com stack, paths, gates
context_loaded           — tokens estimados, arquivos incluídos
agent_started            — iteração atual, modo
token                    — chunk de texto do modelo
tool_call                — nome da tool + input
tool_result              — saída da tool
harness_layer_start      — nome da layer + comando
harness_line             — stdout/stderr em tempo real do subprocess
validation_started       — início do pipeline
validation_completed     — HarnessResult completo
decision_made            — DecisionResult com score e motivo
apply_started            — início do apply
apply_completed          — checkpointId + arquivos escritos
stream_end               — sempre emitido, mesmo em crash (invariante)
proof_pack               — evidência auditável da iteração
```

---

## Direção de dependências

```
@kova/shared
    └─── @kova/adapters, @kova/harness, @kova/agent, @kova/context,
         @kova/memory, @kova/application, @kova/project, @kova/observability
              └─── @kova/orchestrator, @kova/decision
                        └─── @kova/execution
                                  └─── apps/cli, apps/electron, @kova/kova-runner
```

Regra: packages não dependem de apps. shared não depende de nenhum package.

---

## O que o Kova NÃO é

- Não é um chat com comandos de terminal.
- Não é um IDE com plugin de AI.
- Não é um wrapper de API com UX bonita.

É um sistema de engenharia que torna a saída de qualquer modelo verificável,
revertível e auditável, independente de stack, provider e modelo.
