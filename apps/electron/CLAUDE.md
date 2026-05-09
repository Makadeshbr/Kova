# apps/electron — UI Electron + Vite + React

## Estrutura
```
src/main/          → processo principal Electron (Node.js)
  index.ts         → entry point, cria BrowserWindow
  ipc-handlers.ts  → registra handlers IPC, expõe window.kova API
  engine-manager.ts → EngineManager: toda a lógica de sessão do agente

src/preload/
  index.ts         → contextBridge: expõe window.kova ao renderer

src/renderer/src/  → React + Vite (browser context)
  App.tsx          → estado global da aplicação
  components/      → componentes React
  styles/          → CSS variables (design tokens)
```

## Contrato do window.kova (preload → renderer)

### Chamadas (renderer → main)
```typescript
window.kova.sendMessage(message, history, params)
window.kova.pause()
window.kova.abort()
window.kova.forceApply()
window.kova.getSettings() / saveSettings(settings)
window.kova.openFolder()
window.kova.listDir(dir)
window.kova.readFile(path) / writeFile(path, content)
window.kova.detectModel(url)
```

### Eventos (main → renderer, retornam unsubscribe)
```typescript
window.kova.onStateUpdate(cb)       // ExecutionState mudou
window.kova.onTaskStructured(cb)    // TaskDefinition definida
window.kova.onExecutionEvent(cb)    // ExecutionEvent (token, tool_call, etc.)
window.kova.onChatResponse(cb)      // resposta final de texto
window.kova.onError(cb)             // erro irrecuperável
window.kova.onModelDetected(cb)     // modelo local detectado
```

## Estado central (App.tsx)

```typescript
interface AppState {
  projectRoot: string | null
  task: TaskDefinition | null
  executionState: ExecutionState | null
  settings: KovaSettings | null
  messages: ChatMessage[]        // histórico de chat
  executionEvents: ExecutionEvent[]  // eventos ao vivo (cap: 200)
  streamingText: string          // tokens acumulando
  isThinking: boolean            // aguardando resposta do modelo
  activeModel: string | null
  modelConnected: boolean
  openFilePath: string | null
  fileRefreshKey: number         // incrementado para atualizar sidebar
}
```

### Quando cada flag muda
| Flag | Set true | Set false |
|------|----------|-----------|
| `isThinking` | `handleSend()` | `stream_end` event, `onChatResponse`, `onError`, `onStateUpdate` (finished) |
| `isRunning` | derivado: `executionState && !finished` | derivado automaticamente |
| `streamingText` | `token` event (append) | `stream_end` event (flush → message) |

## Componentes críticos

### ChatArea.tsx
- **NÃO mostrar `ExecutionBubble` antigo** — foi removido. Usar `TaskResultCard`.
- `showLive = (isRunning || isThinking) && !hasTaskResult` — live feed e streaming
- `hasTaskResult = executionState?.iterationHistory?.at(-1)?.changes.length > 0`
- `TaskResultCard` aparece após harness completar com mudanças de arquivo

### FileCard.tsx
- Recebe `FileChange` com `before` para diff correto
- `defaultOpen={changes.length === 1}` — abre automaticamente se só um arquivo

### ProjectFiles.tsx
- Recebe `refreshKey` e chama `listDir()` quando muda
- `changedPaths: Set<string>` para highlight de arquivos modificados

## Variáveis CSS (design tokens)
```css
--bg-1: #0D0F14      --bg-2: #0A0C10      --bg-3: #08090D
--amber: #C17A2E     --teal: #5DCAA5      --red: #E24B4A
--yellow: #E5C07B    --purple: #7F77DD
--text-1: #E8E8EB    --text-2: #8A8890    --text-3: #606068
--font-mono: Menlo/Consolas/Courier New
```

## Regras de UI
- Nunca hardcodar cores — usar variáveis CSS
- Não usar emoji como ícone funcional
- Preservar identidade visual escura
- Componentes grandes (> 400 linhas) devem ser divididos
- Não criar estado local se já existe no AppState

## EngineManager (main process)

### Fluxo sendMessage()
1. Aborta engine anterior se existir
2. Builda provider
3. Se `/plan` → `runUnifiedSession()` com `ExecutionEngine`
4. Else → `runSession()` (loop direto com repair)

### runSession() — caminho principal
- Única instância de `ToolExecutor` por iteração
- Emite `stream_end` apenas na primeira iteração (evitar mensagens duplicadas)
- Repair loop: alimenta `decision.feedback` + erros do harness de volta ao modelo
- Constrói `ExecutionState` manualmente para atualizar a UI via `onUpdate`

### Proibido em engine-manager.ts
- Classificação de intenção por regex (foi removida — o modelo decide)
- Chamar `buildProjectContext()` de forma síncrona (`readFileSync` em loop)
- Silent catch no harness — sempre emitir o erro real

## O que NÃO criar nesta app
- Lógica de harness (fica em @kova/orchestrator)
- Lógica de decisão (fica em @kova/decision)
- Persistência de learnings (fica em @kova/memory)
- Novos packages dentro de apps/
