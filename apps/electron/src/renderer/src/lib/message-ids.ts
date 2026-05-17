let messageSeq = 0

export function createChatMessageId(prefix = 'msg'): string {
  messageSeq += 1
  return `${prefix}-${Date.now()}-${messageSeq}`
}
