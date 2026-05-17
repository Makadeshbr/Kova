# @kova/agent — Agente e Providers

## O que é
Executa o modelo de linguagem com tool calling. Abstrai diferenças entre providers. Gerencia o loop de tool calls até o modelo parar de chamar ferramentas.

## O que NÃO é
- Não decide o que fazer com o output (isso é `@kova/decision`)
- Não valida o código gerado (isso é `@kova/orchestrator`)
- Não aplica arquivos em disco (isso é `@kova/application`)
- Não constrói contexto de projeto (isso é `@kova/context`)

## API pública

### Agent.execute()
```typescript
agent.execute(task, context, mode, options?) → Promise<AgentOutput>
```
- `mode = 'unified'` para single-shot (EngineManager.runSession)
- `mode = 'fix'` para repair iterations
- `mode = 'plan'` / `mode = 'code'` para pipeline separado (ExecutionEngine)
- O `ToolExecutor` é criado internamente — não reutilizar entre iterações

### ToolExecutor
```typescript
new ToolExecutor(projectRoot)  // nova instância por iteração
executor.execute(name, input)  // executa tool e registra FileChange
executor.getChanges()          // retorna mudanças acumuladas
```
**CRÍTICO**: criar nova instância por iteração de agente. Reutilizar entre iterações acumula mudanças erradas.

## Tools disponíveis

### AGENT_TOOLS (escrita + leitura)
| Tool | Parâmetros | Efeito |
|------|-----------|--------|
| write_file | path, content | Cria arquivo novo ou reescreve totalmente. Para mudanças cirúrgicas, prefira `edit_file`. |
| edit_file | path, old_string, new_string, replace_all? | Substitui literal exato no arquivo (FIX-013). Valida unicidade: 0 matches → erro; >1 matches sem `replace_all` → erro. Trabalha em buffer staged; tipo de FileChange preservado (create permanece create se editado na mesma sessão). |
| grep_codebase | pattern, path?, glob?, type?, output_mode?, case_insensitive?, head_limit? | Busca em arquivos do projeto (FIX-015). Engine: ripgrep se disponível, JS fallback (fast-glob + RegExp) caso contrário. `output_mode`: `files_with_matches` (default), `content`, `count`. Ignora `node_modules`, `dist`, `out`, `.turbo`, `.git`, `coverage`, `.kova` por padrão. Respeita staged buffer via `withStagedFilesOnDisk` — vê arquivos recém-escritos pelo agente. Também read-only (plan/review). |
| glob_files | pattern, path?, head_limit? | Lista arquivos do projeto por glob (FIX-016). Engine: fast-glob. Paths normalizados com forward slash. Ordenação mtime descendente (mais recente primeiro) com desempate lexicográfico. Default head_limit 100, ceiling 500. Ignora mesmas dirs do grep_codebase. Respeita staged buffer (vê writes/deletes pendentes). Não segue symlinks. Também read-only (plan/review). |
| todo_write | todos | Multi-step todo list (FIX-018). Substitui a lista inteira por chamada (sem merge). Cada item: `{ content (imperativo), activeForm (gerúndio), status: pending\|in_progress\|completed }`. Apenas um item pode estar `in_progress` simultaneamente — valida e rejeita 2+. Estado vive em `ToolExecutor.todos` e persiste entre iterações via `initialTodos` (ExecutionEngine mantém a lista da sessão). Emite evento `todos_updated` (full snapshot) na ExecutionEvent stream. Read-only — não muta arquivos. |
| read_file | path | Lê arquivo (registra FileChange type='modify' only se escreveu antes) |
| delete_file | path | Remove arquivo |
| list_files | dir? | Lista diretório |
| run_command | command | Executa comando arbitrário (política permissiva — bloqueia só padrões perigosos). |

**Ordem de preferência para alterar código existente:** `edit_file` (1ª escolha) → `write_file` (rewrite completo) → `delete_file` (remover).

### READ_ONLY_TOOLS
`read_file`, `list_files`, `grep_codebase`, `glob_files` e `todo_write`. Usar em modos `plan` e `review`.

### Política de comandos `run_command` — permissiva (blocklist)
Qualquer binário roda **a menos que** o comando case com um `DANGEROUS_PATTERNS` em `@kova/shared/command-runner.ts`. Mesmo modelo do Claude Code, Cursor e Codex. A camada de aprovação do usuário (`permissionPolicy.bash: 'allow' | 'ask' | 'deny'`) é o controle primário de segurança.

**O que SEMPRE bloqueia (DANGEROUS_PATTERNS):**
- Filesystem destrutivo: `rm -rf`, `rm -r`, `del /f`, `rd /s`, `rmdir /s`
- Privilégio: `sudo`, `runas`
- Permission wipe: `chmod -R`, `chmod 777`, `chmod 666`, `chown`
- Shell arbitrário: `bash|sh|zsh|fish|pwsh|powershell -c`, `eval`, `exec`
- Git destrutivo: `git push`, `git reset --hard`, `git clean -f`, `git force-`
- Remote shell / exfil: `ssh`, `scp`, `nc`, `netcat`, `ncat`, `telnet`
- Network fetch suspect: `curl https?://`, `wget https?://` (use libs do projeto, não shell raw)
- Fork bomb: `:(){`
- Publish: `npm|pnpm|yarn|cargo publish`
- Disco raw: `dd if=`, `mkfs.*`, `format c:`, `diskpart`, `fdisk`
- Power state: `shutdown`, `reboot`, `halt`, `poweroff`
- Auth wipe: `npm logout`, `gh auth logout`
- Composição de shell: pipes, `>`, `<`, `&&`, `||`, `;`, `&` (use cwd estruturado em vez de `cd app && cmd`)

**Interativos** (precisam TTY) bloqueados em `run_command` — agente deve usar `run_interactive_command`:
- `gh auth login`, `gh auth refresh`
- `npm/pnpm/yarn/bun login`, `npm/pnpm/yarn/bun adduser`
- `docker login`, `vercel login`, `netlify login`, `railway login`, `fly login`, `gcloud login`, `aws login`, `az login`

**Manifest gate** (FIX-CMD): comandos manifest-required (npm, pnpm, cargo, go, etc.) precisam de manifest no cwd, OU subcomando bootstrap (`init`, `new`, `create`, `mod init`, `archetype:generate`), OU manifesto no staged buffer da iteração atual.

## Providers

### AnthropicProvider
- `capabilities()` → `{ supportsToolCalls: true, contextTokenLimit: 180_000, supportsPromptCaching: true }`
- Quando `tools: []` e `onToken` fornecido: usa `messages.stream()` (NÃO `generate()`)
- Quando `tools: []` e sem `onToken`: usa `generate()` (sem streaming)
- Com tools: loop de até `maxTurns` gerenciando tool_use/tool_result
- **Prompt caching (FIX-014)**: `cache_control: { type: 'ephemeral' }` aplicado em 3 breakpoints por chamada via `anthropic-cache.ts`:
  1. system prompt (TextBlockParam[])
  2. último tool da lista
  3. último content block da última mensagem do histórico (avança a cada turno — incremental caching)
- `onUsageReport(ProviderUsageReport)` em `AgentLoopOptions` recebe `{cacheReadInputTokens, cacheCreationInputTokens, inputTokens, outputTokens}` por chamada.

### OpenAICompatibleProvider
- `capabilities()` → `supportsToolCalls` inferido pelo nome do modelo
- Suporta SSE streaming para todos os casos (inclusive `tools: []`)
- Preserva `reasoning_content` do DeepSeek thinking em multi-turn

## Invariantes críticos
- Nunca expor `reasoning_content` / pensamento privado do modelo para o usuário
- Registrar qual provider/modelo foi solicitado vs executado
- `onToken` chamado apenas para tokens de texto (não tool calls)
- `onToolCall` chamado antes de executar a tool
- `onToolResult` chamado após executar, com resultado real

## Dependências
Importa de: `@kova/shared` apenas. Não importa de outros `@kova/*`.
