import type { ExecutionEvent } from '../types'

export function serverActivityLabel(event: ExecutionEvent): string | null {
  if (event.type !== 'server_starting' && event.type !== 'server_ready' && event.type !== 'server_failed') return null
  const command = String(event.toolInput?.command ?? event.serverSession?.command ?? 'server')
  if (event.type === 'server_ready') {
    return event.serverSession?.url ? `Server ready at ${event.serverSession.url}` : `Server ready: ${command}`
  }
  if (event.type === 'server_failed') return `Server needs attention: ${command}`
  return `Starting server: ${command}`
}

export function eventIsBlocking(event: ExecutionEvent): boolean {
  return event.type === 'blocked'
    || event.type === 'server_failed'
    || (event.type === 'tool_result' && /^Blocked:|^Error:/i.test(event.message ?? ''))
}
