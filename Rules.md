# Rules.md — Kova: Guia mestre para IA desenvolvedora

> Leia este arquivo antes de qualquer código.
> Em conflito com CLAUDE.md: CLAUDE.md vence para padrões de código TypeScript; este arquivo vence para arquitetura, comportamento do produto e prioridades.

---

## 1. O que o Kova é

Kova é um **harness de engenharia para LLMs** — local e remota, qualquer stack.

O Kova **deve** funcionar como Claude Code, OpenCode e Codex: criar arquivos, editar código, conversar sobre o projeto. O diferencial não é restringir essas capacidades — é adicioná-las com validação independente, rollback e evidência real.

**Princípio:**
```
LLM propõe. Harness valida. Testes confirmam. Diff prova. Usuário decide.
Sem evidência verificável, a tarefa não está concluída.
```

---

## 2. Arquitetura atual

| Package | Responsabilidade |
|---|---|
| `@kova/shared` | Tipos globais: TaskDefinition, HarnessResult, ExecutionContract, ExecutionEvent, etc. |
| `@kova/agent` | Tool calling real: write_file, read_file, run_command, list_files, delete_file |
| `@kova/harness` | Layers: build → tests → lint → security → rules |
| `@kova/orchestrator` | Executa pipeline de layers sobre arquivos gerados |
| `@kova/execution` | ExecutionEngine + TSL + ExecutionContract + loop multi-iteração |
| `@kova/decision` | Score, feedback, ReviewGate, decisão: auto_apply/suggest/reject/human_required |
| `@kova/application` | Aplica mudanças + checkpoint + rollback automático |
| `@kova/context` | Grafo de dependências, grep search, budget de tokens JIT |
| `@kova/memory` | Learnings: record, query, promote, anti-drift |
| `@kova/adapters` | Detecção de stack (Go, Python, Node, Rust, Java, Ruby, PHP...) |
| `@kova/kova-runner` | Runner Node.js invocado pelo CLI e Electron |
| `apps/cli` | CLI: kova run, validate, chat, sessions, providers |
| `apps/electron` | GUI desktop: harness dashboard, file viewer, chat, diff viewer |

**Fluxo real hoje:**
```
kova run "task"
  → TSL (LLM): texto → TaskDefinition (com fallback se LLM falhar)
  → ExecutionContract: limita paths, stack, comandos, safe zones
  → Agent: list_files → write_file → run_command → corrige em loop
  → HarnessOrchestrator: build → tests → rules → security → lint
  → ReviewGate: verifica escopo, dependências, safe zones, testes
  → Decision: score + decision (auto_apply / suggest / reject / human_required)
  → ApplicationEngine: checkpoint → apply (ou rollback automático)
```

---

## 3. Regras críticas de comportamento

**O Kova NÃO PODE:**
- Bloquear criação de arquivos novos (package.json, go.mod, main.go) — safe zones só protegem MODIFICAÇÕES
- Retornar `blocked()` quando o TSL falha — deve usar tarefa mínima e continuar o loop
- Considerar task concluída sem evidência (arquivos criados + resultado do harness)
- Mascarar erro de provider ou fallback de modelo
- Aceitar como pronto se build ou testes falharam

**O ToolExecutor DEVE:**
- Criar diretórios automaticamente (mkdirSync recursive)
- Registrar `before` = conteúdo original antes da primeira escrita (para diff e detectExternalChange)
- Executar comandos apenas via allowlist
- Bloquear path traversal e escrita fora do projectRoot

**O ExecutionContract DEVE:**
- Bloquear apenas paths PROIBIDOS (node_modules, dist, .git) para qualquer tipo de mudança
- Bloquear safe zone apenas para MODIFY (não para CREATE)
- Gerar allowedPaths = ['**'] quando affectedFiles está vazio (novo projeto)

---

## 4. O que ainda NÃO está construído

| Prioridade | Feature | Package destino |
|---|---|---|
| 🔴 Alta | Streaming de output em tempo real | `@kova/agent` + `@kova/execution` + apps |
| 🔴 Alta | Evals automatizados (baterias de teste do agente) | `evals/` (novo) |
| 🟡 Média | Provider protocol harness (multi-turn robusto por provider) | `@kova/agent/providers` |
| 🟡 Média | Fallback auditável (registrar qual modelo executou) | `@kova/agent` + `kova-runner` |
| 🟢 Baixa | Adapters adicionais: Rust, Java, .NET, C++ | `@kova/adapters` |

---

## 5. Proibições absolutas para IA desenvolvendo o Kova

1. Criar arquivo fora de `packages/` ou `apps/` sem aprovação.
2. Adicionar dependência npm não listada no CLAUDE.md §9.
3. Criar dependência circular entre packages.
4. Lógica em `index.ts` — é só exportação pública.
5. `any` em TypeScript sem justificativa.
6. `catch` silencioso — sempre relançar com contexto.
7. Arquivo core > 200 linhas ou função > 40 linhas — quebrar.
8. Inventar import, tipo ou função sem verificar no codebase.
9. Enviar código com `// ...`, `TODO` ou `/* existing code */`.
10. Declarar task concluída sem testes passando.
11. Alterar `dist/**`, `out/**` ou `node_modules/**`.
12. Remover teste para fazer build passar.

---

## 6. Dependências entre packages

```
@kova/shared              ← raiz, sem dependências
@kova/adapters            ← depende de shared
@kova/harness             ← depende de shared, adapters
@kova/orchestrator        ← depende de shared, harness, adapters
@kova/decision            ← depende de shared, harness
@kova/agent               ← depende de shared
@kova/context             ← depende de shared, adapters, memory
@kova/memory              ← depende de shared
@kova/application         ← depende de shared
@kova/execution           ← depende de shared, agent, orchestrator, decision, application, context
@kova/observability       ← depende de shared
@kova/kova-runner         ← depende de tudo acima
apps/cli, apps/electron   ← consumidores, nunca o contrário
```

---

## 7. Harness — camadas e pesos

| Layer | Tipo | Peso no score |
|---|---|---|
| build | hard fail | 25 |
| tests | soft fail | 30 |
| rules | soft fail | 25 |
| security | critical = hard fail | 10 |
| lint | soft fail | 10 |

**Hard fail:** build falhou, security critical, forbidden path, safe zone sem permissão.

**Modos:**
- `fast`: rules + lint
- `standard`: build + tests + rules
- `full`: build + tests + rules + security + lint

---

## 8. Formato de resposta final para agentes

```
Concluído: [resumo].

Arquivos alterados:
- path/arquivo.ext — criado/modificado/removido

Validações:
- go test ./... — PASS
- npm run build — PASS

Decisão: auto_apply | suggest | reject | human_required

Observações:
- risco ou pendência, se houver
```

Se não concluiu:
```
Ainda não está pronto.

Falhou em: [etapa]
Erro: [erro real do stdout/stderr]
Próximo passo: [ação objetiva]
```

**Nunca**: "deve estar funcionando", "provavelmente correto", "não testei mas está ok".

---

## 9. Modelos locais (Qwen, Ollama, LM Studio)

Modelos locais frequentemente não geram JSON válido para o TSL ou não usam tool calls corretamente.

**O Kova lida com isso:**
- TSL falha → cria TaskDefinition mínima e continua o loop (nunca bloqueia)
- Modelo não usa tool calls → tenta extrair arquivos de XML (`<kova_file>`) e depois de texto (`**arquivo.ext:**`)
- Tool calls malformados → fallback automático para extração de texto

**Para modelos locais, o agente DEVE:**
- Quando tool calls não funcionam: usar formato XML obrigatório
- Cada arquivo em `<kova_file path="caminho/relativo.ext">conteúdo completo</kova_file>`
- Nunca descrever o que "faria" — sempre criar os arquivos

---

## 10. Frase guia

```
Kova não confia em texto bonito.
Kova confia em: contexto + contrato + ferramenta + diff + harness + checkpoint + evidência.

O que prova que isso está correto?
```
