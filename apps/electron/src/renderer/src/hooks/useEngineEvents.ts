import { useEffect } from 'react'
import type { ExecutionEvent, ExecutionState, TaskDefinition } from '../types'
import type { AppState, ChatMessage } from '../app-state'
import type { StructuredAgentMessage } from '@kova/shared'
import { structuredMessageToHistoryText } from '../../../main/history-utils'
import { createChatMessageId } from '../lib/message-ids'

type SetState = React.Dispatch<React.SetStateAction<AppState>>

const _EMPTY_REASONING: AppState['reasoning'] = {
  active: false, text: '', startedAt: null, endedAt: null,
}

export function historyTextForStreamEnd(streamingText: string, structured?: StructuredAgentMessage): string {
  if (structured) return structuredMessageToHistoryText(structured)
  return streamingText.trim()
}

/**
 * Wires all Electron IPC subscriptions into AppState.
 * Extracted from App.tsx to keep the main component below ~300 lines.
 * `setState` from useState is stable — safe to use as a dependency.
 */
export function useEngineEvents(setState: SetState): void {
  useEffect(() => {
    window.kova.getSettings().then(s => {
      setState(prev => ({ ...prev, settings: s }))
      const provider = s.defaultProvider
      const url = provider === 'ollama' ? s.ollamaUrl
        : (provider === 'lmstudio' || provider === 'openai-compatible') ? s.compatibleUrl
        : null
      if (url) {
        window.kova.detectModel(url).then(m => {
          if (m) setState(prev => ({ ...prev, activeModel: m, modelConnected: true }))
        })
      }
    })

    const unsubs = [
      window.kova.onStateUpdate((executionState: ExecutionState) =>
        setState(prev => {
          const finished = ['completed', 'failed', 'paused'].includes(executionState.status)
          const shouldRefresh = ['validating', 'applying', 'completed', 'paused', 'failed'].includes(executionState.status)
            && !['validating', 'applying', 'completed', 'paused', 'failed'].includes(prev.executionState?.status ?? '')
          return {
            ...prev, executionState,
            isThinking: finished ? false : prev.isThinking,
            reasoning: finished ? _EMPTY_REASONING : prev.reasoning,
            fileRefreshKey: shouldRefresh ? prev.fileRefreshKey + 1 : prev.fileRefreshKey,
          }
        })
      ),
      window.kova.onTaskStructured((task: TaskDefinition) => setState(prev => ({ ...prev, task }))),
      window.kova.onError((msg: string) => setState(prev => ({
        ...prev, isThinking: false, reasoning: _EMPTY_REASONING,
        messages: [...prev.messages, { id: createChatMessageId('assistant'), role: 'assistant' as const, content: msg, isTask: false }],
      }))),
      window.kova.onModelDetected((model: string) => setState(prev => ({ ...prev, activeModel: model, modelConnected: true }))),
      window.kova.onChatResponse((msg: string) => setState(prev => {
        const last = prev.messages[prev.messages.length - 1]
        if (last?.role === 'assistant' && last.content.trim() === msg.trim()) {
          return { ...prev, isThinking: false, reasoning: _EMPTY_REASONING }
        }
        return {
          ...prev, isThinking: false, reasoning: _EMPTY_REASONING,
          messages: [...prev.messages, { id: createChatMessageId('assistant'), role: 'assistant' as const, content: msg, isTask: false }],
        }
      })),
      window.kova.onExecutionEvent((event: ExecutionEvent) => setState(prev => {
        if (event.type === 'context_loaded' && event.context) {
          return {
            ...prev,
            sessionUsage: {
              contextTokens: event.context.tokensUsed,
              completionTokens: prev.sessionUsage.completionTokens,
              cacheReadInputTokens: prev.sessionUsage.cacheReadInputTokens ?? 0,
              cacheCreationInputTokens: prev.sessionUsage.cacheCreationInputTokens ?? 0,
              contextFiles: event.context.files,
              selectedFiles: event.context.selectedFiles ?? [],
              blockedFiles: event.context.blockedFiles ?? [],
              rejectedFiles: event.context.rejectedFiles ?? [],
              contextWarnings: event.context.warnings ?? [],
              learningsCount: event.context.learningsCount ?? 0,
              maxContextTokens: event.context.maxTokens ?? null,
            },
            executionEvents: [...prev.executionEvents, event].slice(-200),
          }
        }
        if (event.type === 'token_usage') {
          const usageEvent = event as typeof event & {
            usage?: { cacheReadInputTokens?: number; cacheCreationInputTokens?: number }
            cacheReadInputTokens?: number
            cacheCreationInputTokens?: number
          }
          return {
            ...prev,
            sessionUsage: {
              ...prev.sessionUsage,
              completionTokens: prev.sessionUsage.completionTokens + (event.tokensUsed ?? 0),
              cacheReadInputTokens: (prev.sessionUsage.cacheReadInputTokens ?? 0) + (usageEvent.cacheReadInputTokens ?? usageEvent.usage?.cacheReadInputTokens ?? 0),
              cacheCreationInputTokens: (prev.sessionUsage.cacheCreationInputTokens ?? 0) + (usageEvent.cacheCreationInputTokens ?? usageEvent.usage?.cacheCreationInputTokens ?? 0),
            },
            executionEvents: [...prev.executionEvents, event].slice(-200),
          }
        }
        if (event.type === 'token' && event.token) {
          return {
            ...prev,
            reasoning: { ...prev.reasoning, active: false, endedAt: Date.now() },
            streamingText: prev.streamingText + event.token,
            executionEvents: [...prev.executionEvents, event].slice(-160),
          }
        }
        if (event.type === 'reasoning_start') {
          return {
            ...prev,
            reasoning: {
              active: true,
              text: prev.reasoning.text,
              startedAt: prev.reasoning.active ? prev.reasoning.startedAt : Date.now(),
              endedAt: null,
            },
            executionEvents: [...prev.executionEvents, event].slice(-160),
          }
        }
        if (event.type === 'reasoning_delta' && event.reasoning) {
          return {
            ...prev,
            reasoning: {
              active: true,
              text: (prev.reasoning.text + event.reasoning).slice(-4_000),
              startedAt: prev.reasoning.startedAt ?? Date.now(),
              endedAt: null,
            },
            executionEvents: [...prev.executionEvents, event].slice(-160),
          }
        }
        if (event.type === 'reasoning_end') {
          return {
            ...prev,
            reasoning: { ...prev.reasoning, active: false, endedAt: Date.now() },
            executionEvents: [...prev.executionEvents, event].slice(-160),
          }
        }
        if (event.type === 'provider_error') {
          return {
            ...prev,
            streamingText: '',
            reasoning: _EMPTY_REASONING,
            isThinking: false,
            executionState: null,
            executionEvents: [...prev.executionEvents, event].slice(-200),
          }
        }
        if (event.type === 'provider_session_start') {
          // Captured in executionEvents so ActivityFeed can display provider/model resolution
          return {
            ...prev,
            executionEvents: [...prev.executionEvents, event].slice(-200),
          }
        }
        if (event.type === 'stream_end') {
          const structured = event.structuredMessage
          const historyText = historyTextForStreamEnd(prev.streamingText, structured)
          const assistantMsg: ChatMessage = {
            id: createChatMessageId('assistant'),
            role: 'assistant',
            content: historyText,
            isTask: !!structured,
            structured,
            mode: event.mode === 'plan' ? 'plan' : event.mode === 'review' ? 'review' : event.mode === 'unified' || event.mode === 'code' || event.mode === 'fix' ? 'patch' : undefined,
          }
          const newMessages = historyText || structured
            ? [...prev.messages, assistantMsg]
            : prev.messages
          return {
            ...prev, streamingText: '', reasoning: _EMPTY_REASONING, isThinking: false,
            messages: newMessages,
            executionEvents: [...prev.executionEvents, event].slice(-160),
          }
        }
        if (event.type === 'proof_pack' && event.proofPack) {
          return {
            ...prev,
            executionState: prev.executionState
              ? { ...prev.executionState, proofPack: event.proofPack }
              : prev.executionState,
            executionEvents: [...prev.executionEvents, event].slice(-200),
          }
        }
        // FIX-018: agent updated the multi-step todo list. Full replacement.
        if (event.type === 'todos_updated') {
          return {
            ...prev,
            todos: event.todos ?? [],
            executionEvents: [...prev.executionEvents, event].slice(-200),
          }
        }
        const isFileMutation = event.type === 'tool_call' && (event.toolName === 'write_file' || event.toolName === 'delete_file')
        const shouldRefresh = isFileMutation || event.type === 'file_mutation' || event.type === 'apply_completed'
        return {
          ...prev,
          executionEvents: [...prev.executionEvents, event].slice(-200),
          fileRefreshKey: shouldRefresh ? prev.fileRefreshKey + 1 : prev.fileRefreshKey,
        }
      })),
    ]
    return () => unsubs.forEach(u => u())
  // setState is stable — intentionally no other deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setState])
}
