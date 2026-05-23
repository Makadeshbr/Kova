import type { ChatMode } from '../app-state'

export function shouldRenderPlanResultCard(messageMode: ChatMode | undefined, activeMode: ChatMode): boolean {
  return messageMode === 'plan' || (!messageMode && activeMode === 'plan')
}
