# Kova — Roadmap & Estado

> Última revisão: maio 2026.
> Identidade do produto em `KOVA.md`. Arquitetura em `ARCHITECTURE.md`.
>
> Este arquivo lista: (1) o que está pronto, (2) o que falta para atingir o norte, (3) pendências de alinhamento entre código e docs.

---

## Estado por package

| Package | Estado | Confiança |
|---|---|---|
| `@kova/shared` | Pronto. Subpath `browser-safe` para renderer. | Alta |
| `@kova/adapters` | 14 stacks. | Alta |
| `@kova/agent` | 2 providers (Anthropic, OpenAI-compat). Tools completos. Vision via shared. | Alta |
| `@kova/context` | JIT com cache TTL. | Alta |
| `@kova/orchestrator` | Workspace isolado. 6 layers. | Alta |
| `@kova/harness` | Camadas operacionais. | Alta |
| `@kova/decision` | Score + decide + review gate. Constants exportadas. | Alta |
| `@kova/application` | Apply atômico + git checkpoint + rollback. | Alta |
| `@kova/memory` | Promoção de learnings. | Alta |
| `@kova/execution` | Loop multi-iteração. Scaffolding bypass + pure-create auto_apply. | Alta |
| `@kova/evals` | 46 testes, 7 live evals. Sem ganchos de provider real. | Média |
| `@kova/observability` | Traces básicas. | Média |
| `apps/electron` | UI completa com attachments, streaming, contextual status. | Alta |
| `apps/cli` | Funcional. Sem testes de fluxo completo. | Média |

**Métricas atuais:**
- Tests: ~1340 verdes em 16 packages/apps
- Builds: limpos
- Cobertura de attachments: 15 testes round-trip por provider
- Vision detection: 11 testes cobrindo todas famílias

---

## O que **falta para atingir o norte de produto** (`KOVA.md`)

Listado por impacto. Cada item explica: o que falta, por quê, esforço estimado.

### Prioridade alta — alinhamento de código com norte

#### 1. Harness em modify mode: tornar fully informative (não bloqueante)

**O que:** `@kova/decision/decision-engine.ts` ainda retorna `reject` em modify quando `firstFailedValidationLayer` detecta build/test falhando. Norte (`KOVA.md`) diz "harness informativo, nunca bloqueia".

**Por quê:** Decisão recente de "CC parity total" implica que o usuário decide se a violação importa, não o sistema.

**Mudança técnica:**
- `decide()` deve retornar `suggest` (ou `auto_apply` se score ≥ 90) mesmo com layers falhando.
- Warnings de harness viram findings de `ReviewGateResult` (visíveis no HarnessDashboard).
- Botão "Apply anyway" no banner quando há warnings.
- Remover loop de reparo automático — agente repara apenas se usuário pedir explicitamente.

**Esforço:** ~3-4h + ajustar ~10 testes que esperam reject.

---

#### 2. MCP support (Model Context Protocol)

**O que:** Permitir conectar servidores MCP (Linear, GitHub, Postgres, filesystem, etc.) para o agente consumir como tools dinâmicas.

**Por quê:** CC, Cursor, Codex todos têm. É expectativa de mercado.

**Esforço:** ~1.5-2 dias para implementação básica (carregar manifesto, expor tools, segurança).

---

#### 3. Skills (Agent Skills standard)

**O que:** Sistema de skills user-defined invocáveis via slash, com frontmatter de descrição e quando-usar. Detalhado em conversa anterior; usuário escolheu adiar.

**Esforço:** ~1-1.5 dias.

---

### Prioridade média

#### 4. Tree-based session history

**O que:** Inspirado no Pi (Earendil). Permitir branching da conversa — voltar a um ponto e tentar outra abordagem. JSONL com refs de parent.

**Esforço:** ~1 dia.

#### 5. Background bash processes

**O que:** `run_command` pode lançar processo de longa duração com job ID; usuário inspeciona stdout depois. Hoje só `run_interactive_command` cobre dev servers.

**Esforço:** ~6-8h.

#### 6. Hooks (`PostToolUse`, `PreCommit`, etc.)

**O que:** Comandos shell user-defined que rodam em eventos. CC tem.

**Esforço:** ~1 dia.

#### 7. Multi-arquivo edit suggestion mode

**O que:** Agente propõe diff em vários arquivos como visualização revisável antes de aplicar. Cursor tem.

**Esforço:** ~1-1.5 dias (parcial — `FilesViewer` já existe, falta wire de "proposta vs aplicação").

#### 8. `.kovaignore`

**O que:** Excluir paths do ContextEngine. Hoje exclusão é hardcoded (`.git`, `node_modules`, etc.).

**Esforço:** ~3-4h.

---

### Prioridade baixa (polimento)

#### 9. Print/JSON mode na CLI

**O que:** `kova -p "query"` para scripting (Pi-style).

#### 10. RPC stdin/stdout

**O que:** Integração com clientes não-Node.

#### 11. Live evals com providers reais

**O que:** Hoje `@kova/evals/live-evals.test.ts` usa MockAgentProvider. Adicionar suite opcional contra Anthropic/OpenAI real (gated por env var, executada manualmente).

---

## Pendências de alinhamento código ↔ docs

Itens onde a documentação recém-consolidada diz X mas o código diz Y. Lista para fechar.

| Doc afirma | Código atual | Item de roadmap |
|---|---|---|
| Harness informativo, nunca bloqueia (KOVA.md) | `decide()` ainda retorna reject em modify com layer falhando | #1 acima |
| Multi-provider primeira classe | OK | — |
| Vision automática per-model | OK (via `@kova/shared/model-vision`) | — |
| Git commit por iteração | OK em ApplicationEngine | — |
| Sem gambiarra / single source of truth | OK após cleanup recente | — |
| Streaming creates aparecem live | OK em `tools.ts` writeFile | — |

---

## Decisões tomadas (registro histórico curto)

**Por que abandonamos "harness-first opinionado":**

Originalmente Kova queria ser "diferente de CC" via validação independente. Em prática, isso bloqueava UX em scaffolding (criar projeto novo) — caso de uso #1. Decisão de produto: paridade com CC + diferenciais reais (atomic apply, multi-provider, vision). Harness vira informativo.

**Por que git commit por iteração e não staging area:**

Staging area duplicava conceito que git já resolve. Commit atômico permite `git revert` natural, mantém histórico legível, integra com ferramentas existentes.

**Por que Electron desktop e não web puro:**

Acesso a filesystem local, PTY para dev servers, IPC seguro, distribuição offline. Web puro exigiria backend separado.

**Por que multi-provider em vez de fechar no Claude:**

Diferencial competitivo claro. Custo de implementação aceitável (`@kova/agent` já tem 2 adapters; novos seguem o padrão OpenAI-compatible para 80% dos casos).

---

## Arquivos arquivados

Em `docs/archive/`:
- `KOVA_FIX_PLAN_legacy.md` — plano de fixes de auditoria antiga (executados)
- `KOVA_MAP_legacy.md` — versão antiga do norte de produto (substituída por `KOVA.md`)
- `KOVA_ROADMAP_legacy.md` — versão antiga deste arquivo
- `KNOWN_ISSUES_legacy.md` — issues antigos (resolvidos ou agora em "pendências de alinhamento")
- `EVENT_CONTRACT_legacy.md` — contratos de eventos (movido para `packages/shared/CLAUDE.md`)

Não são canônicos. Mantidos para histórico/auditoria.

---

## Como atualizar este arquivo

Quando você:
- **Conclui** um item de prioridade alta/média/baixa → mover para "Estado por package" se for capacidade nova, ou apagar.
- **Decide** mudar o norte → atualizar `KOVA.md` primeiro, depois adicionar item em "Pendências de alinhamento código ↔ docs".
- **Adiciona** capacidade nova não listada → criar item em prioridade apropriada com escopo + esforço estimado.

Nada de "TODO" sem dono e escopo. Nada de duplicar texto que está em `ARCHITECTURE.md` ou `KOVA.md`.
