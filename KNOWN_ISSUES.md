# Kova — Problemas Conhecidos e Próximos Passos

Última atualização: maio 2026

## Problemas corrigidos

### ~~1. abort() não cancela runSession() em andamento~~ ✅ FIXED (hotfix 1 + hotfix 2)
**Fix original**: `runSession()` propaga o `signal` do `AbortController` para o provider.
**Fix hotfix 2 (enterprise-grade)**:
- `ToolExecutor` recebe `signal?: AbortSignal` no construtor e passa ao `execAsync` — processos filhos são terminados no abort.
- Novo guard `if (signal?.aborted) return` ANTES de iniciar o harness (evita validação desnecessária).
- `onChatResponse` é suprimido quando `signal.aborted === true` — usuário não vê mensagem de erro confusa ao abortar.

### ~~2. isThinking pode ficar preso em true~~ ✅ FIXED (hotfix 1 + hotfix 2)
**Fix original**: `runSession()` tem `try/finally` — `stream_end` sempre emitido.
**Fix hotfix 2**:
- `runUnifiedSession()` agora rastreia `stream_end` via handler interceptor e emite defensivamente se o engine crashar antes de emitir.
- `EngineManager` aceita `ProviderFactory` no construtor para injeção de dependência (testabilidade).

### ~~3. executionEvents não reseta entre sessões~~ ✅ FIXED
**Fix aplicado**: `handleOpenFolder()` em `App.tsx` reseta `executionEvents`, `executionState`, `task`, `isThinking`, `streamingText` e `showDiff` ao trocar de projeto.

### ~~4. Harness retorna score 100 se nenhum comando está configurado~~ ✅ FIXED (hotfix 1 + hotfix 2)
**Fix hotfix 2 (real fix)**:
- `pipeline.ts`: camada sintética agora é injetada com `skipped: true` para não inflacionar o score.
- `HarnessResult` recebe `validationConfidence: 'none' | 'partial' | 'full'` e `skippedLayers?: string[]`.
- `decide()` captura `validationConfidence === 'none'` e força score 75 → `suggest` (nunca `auto_apply` sem validação real).
- Separação clara: `calculateScore()` retorna 100 para layers vazias quando o agent não fez mudanças (comportamento correto); `decide()` protege via `validationConfidence`.

### ~~5. Zero testes automatizados~~ ✅ FIXED + EXPANDIDO (hotfix 2)
**Estado atual**: 49 arquivos de teste em 14 packages. `pnpm -r run test` → **todas as tasks passam**, cobrindo:
- Score calculation, decision engine, review gate (existentes)
- **NOVO**: Abort signal em `ToolExecutor` — processo filho é terminado no abort
- **NOVO**: `validationConfidence` — none/partial/full com casos específicos de cobertura
- **NOVO**: `decide()` com sem validação — nunca auto_apply quando validationConfidence: none
- **NOVO**: `EngineManager` — stream_end exatamente uma vez, abort sem mensagem de erro, provider not configured

## Regression Tests Added (hotfix 2)

| Arquivo | Cenários cobertos |
|---------|------------------|
| `packages/agent/__tests__/abort-signal.test.ts` | ToolExecutor com sinal abortado, processo filho terminado, segurança mantida |
| `packages/harness/__tests__/validation-confidence.test.ts` | none/partial/full, skippedLayers, score 75 sem validação |
| `packages/decision/__tests__/no-validation-decide.test.ts` | validationConfidence:none → suggest; sem validationConfidence → auto_apply (correto) |
| `apps/electron/__tests__/engine-manager.test.ts` | stream_end ×1, abort sem erro, provider null, estado pós-abort |

## Limitações de design conhecidas


### Context window — preload bruto
`runSession()` despeja até 60KB de contexto. Modelos com janela menor podem falhar.
**Plano**: integrar `ContextEngine` com budget de tokens.

### Prompt quality
O prompt funcional não foi testado em volume. Refinamento iterativo necessário.

## Limitações de design conhecidas

### runSession() é single-agent
O caminho principal não usa `ContextEngine`. O modelo recebe o contexto via preload de arquivos brutos. Isso significa que em projetos grandes, o contexto pode exceder o limite do provider ou incluir arquivos irrelevantes.
**Plano**: integrar `ContextEngine.buildContext()` em `runSession()` gradualmente.

### Repair loop alimenta erros em texto plano
O prompt de reparo usa `harnessResult.layers[].errors[].message`. Se o modelo não entender o formato dos erros, o reparo falha silenciosamente.
**Melhoria**: incluir `decision.feedback[].instruction` que já é formatado para o modelo.

### /plan usa ExecutionEngine separado
O caminho `/plan` usa `ExecutionEngine` com `ContextEngine` e `MemorySystem`. O caminho principal (`runSession`) não usa `ContextEngine`. Isso cria inconsistência: `/plan` tem contexto melhor que o caminho padrão.
**Plano**: unificar quando `ContextEngine` for testado e estável.

## Backlog técnico (não-prioritário agora)

- [ ] Evals automatizados por stack (Go, Python, TypeScript)
- [ ] Streaming do reasoning do modelo visível ao usuário  
- [ ] UI de revisão de diff interativa (aprovar/rejeitar linha por linha)
- [ ] Provider protocol harness (testes de round-trip por provider)
- [ ] Fallback auditável de provider (registrar quando fallback acontece)
- [ ] Configuração de safe zones via UI
- [ ] Histórico de sessões persistido
- [ ] Multi-provider paralelo (enviar para dois providers, usar o melhor)
