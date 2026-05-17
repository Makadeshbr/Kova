export interface FloatingResultCardState {
  hasResult: boolean
  showLive: boolean
  hasStructuredTaskResult: boolean
  lastMessageRole?: 'user' | 'assistant' | 'system'
}

export function shouldRenderFloatingResultCard(state: FloatingResultCardState): boolean {
  return state.hasResult
    && !state.showLive
    && !state.hasStructuredTaskResult
    && state.lastMessageRole !== 'user'
}
