# AGENTS.md — Instruções para IA trabalhando no Kova

> Arquivo mestre. Se outro doc divergir, este vence.
> Para entender **o que Kova é**, leia `KOVA.md` antes.
> Para arquitetura técnica, leia `ARCHITECTURE.md`.
> Para estado atual e pendências, leia `ROADMAP.md`.

---

## Norte de produto (resumo de 30 segundos)

Kova é um agente compatível com **Codex** + diferenciais:
- Apply atômico via git checkpoint
- Multi-provider (11 providers, vision automática per-model)
- Harness informativo (nunca bloqueia)

Pergunta-guia para qualquer decisão: **"O Codex faria isso?"** Se sim, fazer igual. Se diverge, deve ter motivo objetivo (atomic apply, multi-provider, vision) documentado.

---

## Stack real

- Monorepo `pnpm` + `turbo`
- TypeScript com `tsup` (libs) e `electron-vite` (app)
- Testes em Vitest
- Apps: `apps/electron` (desktop), `apps/cli` (terminal)
- 14 packages em `packages/*` (ver `ARCHITECTURE.md`)

---

## Regras absolutas

### Nunca
- Inventar arquivo, import, tipo, módulo ou resultado de comando
- Afirmar que teste passou sem log real
- Declarar conclusão sem evidência verificável
- Criar dependência nova sem aprovação explícita
- Alterar `dist/**`, `out/**` ou `node_modules/**`
- Alterar lockfile sem tarefa de dependência
- Usar `any` em TypeScript novo
- Criar `default export` novo
- Catch silencioso
- Secrets / tokens em código
- Comando destrutivo sem autorização
- Mudar arquitetura global por uma tarefa pequena
- Trocar stack sem evidência do projeto
- Criar arquivos / frameworks / runtimes inexistentes sem motivo explícito
- Remover teste ou regra para fazer build passar
- Mascarar fallback de provider/modelo
- Duplicar lógica que poderia viver em `@kova/shared`

### Sempre
- Ler o código antes de editar
- Detectar a stack real do projeto antes de escolher comandos
- Preservar padrões existentes
- Manter patch pequeno; foco no escopo pedido
- Preferir `src/**` e `__tests__/**`
- Usar imports `@kova/*` entre packages (nunca relativo cross-package)
- Adicionar/ajustar teste quando há comportamento novo
- Reportar validações executadas e validações não executadas
- Revisar o próprio diff antes de concluir

---

## Padrões de código

- **TypeScript**: named exports, sem default novo, sem `any`, erro com contexto (nunca `throw 'string'`), early return.
- **Tamanho alvo**: core ≤200 linhas/arquivo, ≤40 linhas/função quando viável. UI React ≤400/80 quando justificado.
- **Testes**: Vitest, em `__tests__/`, nome descreve comportamento, prefere teste de comportamento a teste de detalhe interno.
- **Comentários**: só quando o "porquê" não está óbvio no código. Não comentar "o que" — o código diz.
- **Sem `dist/**` ou `out/**` em diffs.** Esses são gerados.

---

## Arquitetura — direção de dependências

```
shared → adapters / harness / agent / context / memory / application
       → orchestrator / decision / execution / kova-runner
       → apps/cli, apps/electron
```

- `@kova/shared` não importa de nenhum outro `@kova/*`. Se surgir circular, extrair contrato mínimo pra cá.
- `apps/*` consomem packages. Packages nunca dependem de apps.
- Quando renderer (browser) precisa de helper compartilhado, usa o subpath `@kova/shared/browser-safe` (curado, sem Node deps).

---

## Comportamento canônico do agente

### Scaffolding (todas as mudanças são create de arquivos novos)
1. Sem contrato gate (max_files, allowed_paths, stack_mismatch desativados)
2. Sem harness gate
3. `write_file` escreve direto no disco (file aparece live)
4. `decide()` retorna auto_apply
5. Git commit atômico ao fim

### Modify (qualquer change tem `before` definido)
1. Contrato verifica: forbidden_path, credenciais, max_files (limite alto)
2. Creates streamam pro disco; modifies ficam buffered
3. Harness roda como **informativo** — retorna warnings, não bloqueia
4. `decide()` retorna auto_apply mesmo com warnings; usuário pode ignorar
5. Git commit atômico ao fim

**Hard fails que ainda bloqueiam (não-negociáveis):**
- Credenciais em `.env*`
- Paths em `forbiddenPaths` (`node_modules`, `dist`, `out`, `.git`)
- Cap de segurança 150 arquivos em scaffolding (anti-runaway)

---

## Multi-provider

Suportados (ver `packages/agent/src/providers/model-catalog.ts`):
- Anthropic (Codex 3.5+, 4.x)
- OpenAI (GPT-4o, GPT-4.1, GPT-5.x)
- Gemini (2.5, 3.x)
- Grok (4, 4.1, 4-fast variants)
- DeepSeek (chat, reasoner, vl)
- Kimi (K2, K2.5, K2.6, K2.6-thinking)
- OpenRouter (proxy multi-modelo)
- NVIDIA
- Ollama / LM Studio / OpenAI-compatible (locais)

**Vision per-model**: source única em `@kova/shared/model-vision.ts`. Renderer importa via `@kova/shared/browser-safe`.

---

## Attachments

- Tipos em `@kova/shared`: `Attachment`, `AgentMessage.attachments`
- Per-attachment cap: 10 MB. Per-message cap: 50 MB. Max 12 anexos/turn.
- Sanitização server-side em `apps/electron/src/main/ipc-security.ts` (mime allowlist).
- Anthropic: convertido para `image` content block.
- OpenAI-compatible: convertido para `image_url` content part (data: URL).
- Não-imagem (texto/PDF): inlinado como texto delimitado via `formatTextAttachment` (em `@kova/shared`).

---

## Tools do agente

Definidas em `packages/agent/src/tools.ts`:

| Tool | Função |
|---|---|
| `write_file` | Cria/reescreve. Creates streamam ao disco; modifies buffered. |
| `edit_file` | Surgical (literal old_string → new_string). Preferido para modify. |
| `delete_file` | Remove. Streamed-create + delete na mesma turn limpa tudo. |
| `read_file` | Lê (respeita buffer + disco). |
| `list_files` | Lista dir. |
| `grep_codebase` | Busca regex (ripgrep ou JS fallback). Sempre prefere a `run_command grep/rg`. |
| `glob_files` | Lista por glob. Sempre prefere a `run_command find/ls`. |
| `todo_write` | Multi-step todo list, persiste entre iterações. |
| `run_command` | Build/test/lint/install/scripts (timeout 2min). |
| `run_interactive_command` | Servidores, REPLs, comandos que precisam PTY. |

Política de comando: blocklist permissiva (DANGEROUS_PATTERNS em `@kova/shared/command-runner.ts`). Modelo dos concorrentes.

---

## Quando trabalhar em uma tarefa

1. Leia os arquivos afetados.
2. Identifique package/app correto.
3. Detecte a stack real do projeto.
4. Defina o menor patch útil.
5. Edite apenas arquivos relacionados.
6. Escreva teste quando alterar comportamento.
7. Rode teste/build focado quando possível.
8. Se falhar, leia o erro real e corrija a menor causa.
9. Revise o diff antes de entregar.

---

## Formato de resposta final

```
Concluído: resumo curto.

Arquivos alterados:
- path

Validações:
- comando — PASS/FAIL ou NOT RUN (motivo)

Observações:
- risco ou pendência, se houver
```

Se não concluiu:

```
Ainda não está pronto.

Falhou em:
- comando ou etapa

Erro principal:
- resumo real

Próximo passo:
- ação objetiva
```

**Nunca:** "deve estar funcionando" / "provavelmente está certo" / "não testei mas está ok".

---

## Pergunta final obrigatória

```
O que prova que isso está correto?
```

Sem evidência → não está pronto.
