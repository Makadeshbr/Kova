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
| write_file | path, content | Cria ou sobrescreve arquivo |
| read_file | path | Lê arquivo (registra FileChange type='modify' only se escreveu antes) |
| delete_file | path | Remove arquivo |
| list_files | dir? | Lista diretório |
| run_command | command | Executa comando da allowlist |

### READ_ONLY_TOOLS
Apenas `read_file` e `list_files`. Usar em modos `plan` e `review`.

### Allowlist de comandos run_command
go, npm/npx, python/pip, cargo, mvn/gradle, dotnet, ruby/gem/rake, composer, swift, flutter, dart, gcc/g++, tsc, git (status/log/diff apenas), ls/find/head/tail, biome/eslint/prettier

**Bloqueados**: rm -rf, sudo, chmod, curl|bash, wget|bash, bash -c, eval, git push/reset/clean, ssh, scp, powershell iex, format, del /f

## Providers

### AnthropicProvider
- `capabilities()` → `{ supportsToolCalls: true, contextTokenLimit: 180_000 }`
- Quando `tools: []` e `onToken` fornecido: usa `messages.stream()` (NÃO `generate()`)
- Quando `tools: []` e sem `onToken`: usa `generate()` (sem streaming)
- Com tools: loop de até `maxTurns` gerenciando tool_use/tool_result

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
