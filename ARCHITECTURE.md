# Kova — Arquitetura Real (maio 2026)

## Fluxo de dados principal

```
Usuário digita mensagem
    ↓
apps/electron renderer (ChatArea.tsx)
    ↓ window.kova.sendMessage(message, history, params)
apps/electron main (ipc-handlers.ts → engine-manager.ts)
    ↓ EngineManager.sendMessage()
    │
    ├─ /plan? → runUnifiedSession → ExecutionEngine (multi-iteração com repair loop)
    │
    └─ else → runSession (session única, modelo decide)
                    ↓
              provider.runAgentLoop()   ← streams tokens via onToken
                    ↓
              executor.getChanges()
                    │
                    ├─ changes == 0 → stream_end → mensagem de chat, fim
                    │
                    └─ changes > 0 → HarnessOrchestrator.run()
                                          ↓
                                     decide(harnessResult)
                                          ↓
                                     auto_apply → CodeApplicationEngine.apply()
                                     suggest    → pausa para revisão
                                     reject     → repair loop (volta ao modelo com erros)
                                     human_required → para, pede intervenção
```

## Direção de dependências

```
@kova/shared (tipos e contratos — zero deps de outros packages)
    ↓
@kova/adapters   (detecta stack do projeto)
@kova/memory     (learnings por projeto/global)
    ↓
@kova/agent      (providers, tool executor, modos de agente)
@kova/context    (grep, grafo de dependências, budget de tokens)
@kova/orchestrator (camadas de harness: build, tests, rules, security, lint)
@kova/decision   (decide auto_apply/suggest/reject/human_required)
@kova/application (checkpoints, safe zones, apply/rollback)
    ↓
@kova/execution  (loop multi-iteração: compõe tudo acima)
@kova/kova-runner (CLI/IDE: usa execution diretamente)
    ↓
apps/electron    (UI Electron + Vite + React)
apps/cli         (CLI standalone)
```

**Regra**: nunca inverter esta direção. Packages não dependem de apps.

## Canais IPC (main ↔ renderer)

### Main → Renderer (eventos)
| Canal | Quando | Dado |
|-------|--------|------|
| `kova:state-update` | Estado do engine muda | `ExecutionState` |
| `kova:task-structured` | Task definida | `TaskDefinition` |
| `kova:execution-event` | Qualquer evento do loop | `ExecutionEvent` |
| `kova:chat-response` | Resposta final de texto | `string` |
| `kova:error` | Erro irrecuperável | `string` |
| `kova:model-detected` | Modelo local detectado | `string` |

### Renderer → Main (chamadas)
| Canal | Handler |
|-------|---------|
| `kova:send-message` | `EngineManager.sendMessage()` |
| `kova:pause` | `EngineManager.pause()` |
| `kova:abort` | `EngineManager.abort()` |
| `kova:force-apply` | `EngineManager.forceApply()` |

## Estados da UI (App.tsx)

```
Estado inicial: { isThinking: false, isRunning: false, executionState: null }

handleSend()
    → isThinking: true, executionState: null, executionEvents: [], streamingText: ''

onExecutionEvent (type: 'token')
    → streamingText += token

onExecutionEvent (type: 'stream_end')
    → streamingText → messages[], streamingText: '', isThinking: false

onStateUpdate (status: 'validating')
    → executionState set, isRunning: true

onStateUpdate (status: 'completed'|'failed'|'paused')
    → isRunning: false, isThinking: false
```

## Modos do harness

| Modo | Camadas |
|------|---------|
| fast | rules + lint |
| standard | build + tests + rules |
| full | build + tests + rules + security + lint |

## Scores do decision engine

| Score | Decisão |
|-------|---------|
| ≥ 90 | auto_apply |
| 70–89 | suggest |
| < 70 | reject |
| = 0 | reject (hard fail) |
| erro repetido 4x | human_required |
| regressão 3x | human_required |

## Safe zones (ApplicationEngine bloqueia por padrão)

`.env*`, lockfiles, `package.json`, `docker-compose*`, `.github/**`, `config/**`

## Providers suportados

| Provider | Classe | Streaming |
|----------|--------|-----------|
| anthropic | AnthropicProvider | ✓ messages.stream() |
| openai, deepseek, gemini, kimi, openrouter, ollama, lmstudio | OpenAICompatibleProvider | ✓ SSE |
