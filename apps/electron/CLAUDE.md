# apps/electron — UI Electron + Vite + React

> Última revisão: maio 2026. Sincronizado com o código real.

---

## Estrutura de arquivos

```
src/main/
  index.ts            → entry point, cria BrowserWindow, registra IPC handlers
  ipc-handlers.ts     → KovaSettings, todos os handlers IPC, TerminalManager.setWebContents()
  engine-manager.ts   → EngineManager class (4 modos de sessão)
  at-refs.ts          → resolveAtRefs, shouldShortCircuitDeniedRefs, deniedRefsMessage
  session-prompts.ts  → chatOnlyPrompt, reviewOnlyPrompt, planOnlyPrompt,
                        inferRunMode, parsePlanResult, KovaRunMode
  session-utils.ts    → buildContextEngine, contextBudgetFor, contextBuildOptions,
                        contextEventPayload, createReasoningEmitter,
                        estimateMessagesTokens, buildFallbackTask, toRelative
  terminal-manager.ts → TerminalManager (PTY via @lydell/node-pty)

src/preload/
  index.ts            → contextBridge: expõe window.kova ao renderer

src/renderer/src/
  App.tsx             → estado global + hooks (useEngineEvents, useSessionPersistence)
  hooks/
    useEngineEvents.ts      → todos os listeners IPC de ExecutionEvent
    useSessionPersistence.ts → autosave de sessões
  components/
    ChatArea.tsx       → chat unificado (sem seletor de modo visível)
    HarnessDashboard.tsx
    Sidebar.tsx + MemoryPanel.tsx
    TerminalPanel.tsx  → xterm.js + dialog de aprovação PTY
    ActivityFeed.tsx
    ...
  styles/global.css   → design tokens
```

---

## Contrato window.kova (preload → renderer)

### Chamadas (renderer → main)
```typescript
window.kova.sendMessage(message, history, params)
window.kova.pause() / abort() / forceApply()
window.kova.getSettings() / saveSettings(settings)
window.kova.openFolder() / listDir(dir)
window.kova.readFile(path) / writeFile(path, content)
window.kova.detectModel(url)
// Terminal / PTY
window.kova.terminalOpen(id, command, cwd)
window.kova.terminalInput(id, data)
window.kova.terminalResize(id, cols, rows)
window.kova.terminalKill(id)
window.kova.terminalApprove(id, approved)
// Memory
window.kova.getPendingLearnings(root)
window.kova.getContradictedLearnings(root)
// Sessions
window.kova.listSessions(root) / saveSession(root, session) / deleteSession(root, id)
```

### Eventos (main → renderer)
```typescript
window.kova.onStateUpdate(cb)        // ExecutionState mudou
window.kova.onTaskStructured(cb)     // TaskDefinition definida
window.kova.onExecutionEvent(cb)     // ExecutionEvent (todos os tipos)
window.kova.onChatResponse(cb)       // resposta final de texto (legado)
window.kova.onError(cb)              // erro irrecuperável
window.kova.onModelDetected(cb)      // modelo local detectado
window.kova.onTerminalData(cb)       // dados de PTY: (id, data)
window.kova.onTerminalStarted(cb)    // sessão PTY iniciada: (id, command, cwd)
window.kova.onTerminalExit(cb)       // sessão PTY encerrada: (id, exitCode)
window.kova.onInteractiveRequest(cb) // agente pede PTY: (id, command, reason)
```

---

## Estado central (App.tsx)

```typescript
export interface AppState {
  projectRoot: string | null
  task: TaskDefinition | null
  executionState: ExecutionState | null
  settings: KovaSettings | null
  messages: ChatMessage[]
  executionEvents: ExecutionEvent[]   // cap: 200
  streamingText: string
  reasoning: ReasoningState
  isThinking: boolean
  showSettings: boolean
  showDiff: boolean
  activeModel: string | null
  modelConnected: boolean
  openFilePath: string | null
  fileRefreshKey: number              // incrementado para atualizar sidebar
  sessionId: string | null
  sessionUsage: SessionUsage
  queuedMessages: QueuedMessage[]
  activeMode: ChatMode                // 'patch' | 'plan' | 'review' | 'chat'
  terminalSessions: TerminalSessionInfo[]
  pendingApproval: PendingApproval | null
}
```

**Default de modo:** `activeMode: 'patch'` (unified — modelo decide se escreve ou só conversa).

---

## EngineManager — fluxo sendMessage()

```
sendMessage(message, history, params)
    ↓ resolveAtRefs — detecta @refs
    ↓ buildProvider / tryFallbackProvider
    ↓ emit provider_session_start (com providerMeta)
    ↓ inferRunMode(message, params.mode)
    │
    ├─ 'chat'   → runChatSession()
    │              ContextEngine + runAgentLoop(tools=[], maxTurns=1)
    │
    ├─ 'review' → runReviewSession()
    │              ContextEngine + runAgentLoop(READ_ONLY_TOOLS, maxTurns=20)
    │
    ├─ 'plan'   → runPlanSession()
    │              ContextEngine + runAgentLoop(READ_ONLY_TOOLS, maxTurns=8)
    │              parsePlanResult(output.thought) → PlanResultMessage
    │
    └─ 'patch'  → buildPatchTask → runUnifiedSession → ExecutionEngine
                  Agent com ALL_TOOLS + interactiveRunner injetado
                  repair loop, harness, decision, apply, memory.recordFromIteration
```

**inferRunMode:**
- `params.mode` explícito sempre vence
- `/plan` no início da mensagem → 'plan'
- `/review` no início → 'review'
- sem modo → 'patch' (padrão)

---

## ContextEngine — uso por modo

| Modo | Usa ContextEngine? | Onde |
|------|--------------------|------|
| chat | ✅ (condicional — só na primeira mensagem da sessão) | runChatSession |
| review | ✅ | runReviewSession |
| plan | ✅ | runPlanSession |
| patch | ✅ (via ExecutionEngine por iteração) | ExecutionEngine.runIteration() |

O cache `contextEngineCache` em EngineManager reutiliza instâncias por `projectRoot`.

---

## Componentes críticos

### ChatArea.tsx
- Interface unificada — sem seletor de modo visível ao usuário
- Pills `/plan` e `/review` no compositor para ativar modos alternativos
- Slash palette ao digitar `/`
- `TaskResultCard` aparece após harness completar com mudanças de arquivo
- `streamingText` → flushed em `stream_end` como mensagem de chat

### TerminalPanel.tsx
- Painel inferior deslizante com xterm.js
- Dialog de aprovação antes de abrir PTY (kova:interactive-request)
- Tab bar quando múltiplas sessões PTY ativas
- Escuta `kova:terminal-data`, envia `kova:terminal-input`

### MemoryPanel.tsx
- Exibido no rodapé do Sidebar quando há learnings pendentes ou contraditados
- Learnings em revisão: amarelo (`needs_review`)
- Learnings contraditados: vermelho (`contradictions > 0`)

---

## Design tokens (global.css — valores reais)

```css
--bg-0: #090F12    --bg-1: #0E1417    --bg-2: #161D1F    --bg-3: #1A2123
--bg-hover: rgba(255,255,255,0.04)
--bg-active: rgba(255,255,255,0.07)

--cyan: #A4E6FF        --cyan-dim: rgba(164,230,255,0.15)
--amber: #FEB127       --amber-dim: rgba(254,177,39,0.14)
--teal: #B7EAFF        --teal-dim: rgba(183,234,255,0.12)
--purple: #B9C8DE      --purple-dim: rgba(185,200,222,0.12)
--red: #FFB4AB         --red-dim: rgba(255,180,171,0.12)
--yellow: #FFD59C      --yellow-dim: rgba(255,213,156,0.12)

--text-1: #DDE3E7   --text-2: #BBC9CF   --text-3: #859399
--text-ghost: #3C494E

--border: rgba(133,147,153,0.3)
--border-focus: rgba(164,230,255,0.5)

--font-ui: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
--font-mono: "JetBrains Mono", "Menlo", "Consolas", "Courier New", monospace
```

---

## Regras de UI

- **Nunca hardcodar cores** — usar variáveis CSS acima
- Não usar emoji como ícone funcional
- Preservar identidade visual escura
- Componentes > 400 linhas devem ser divididos
- Não criar estado local se já existe no AppState
- Hooks extraídos: `useEngineEvents.ts` (IPC), `useSessionPersistence.ts` (autosave)

---

## O que NÃO criar nesta app

- Lógica de harness → `@kova/orchestrator`
- Lógica de decisão → `@kova/decision`
- Persistência de learnings → `@kova/memory`
- Novos packages dentro de `apps/`
- Lógica de tool execution → `@kova/agent`
