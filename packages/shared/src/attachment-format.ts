import type { Attachment } from './types'

/**
 * Inlines a non-image attachment as a delimited text block so it reaches
 * providers that don't accept document parts natively. Text attachments are
 * base64-decoded and truncated to a safe size; binary types fall back to a
 * placeholder so the model knows something was attached but its content is
 * unavailable in plaintext.
 *
 * Shared by every provider adapter — single source of truth for the wire
 * format of "attachment-as-text" so behaviour stays consistent across
 * Anthropic, OpenAI-compatible, and any future provider.
 */
const MAX_INLINED_TEXT_CHARS = 50_000

export function formatTextAttachment(att: Attachment): string {
  const decoded = att.kind === 'text'
    ? Buffer.from(att.base64, 'base64').toString('utf-8').slice(0, MAX_INLINED_TEXT_CHARS)
    : `[binary file content omitted — ${att.sizeBytes} bytes, ${att.mimeType}]`
  return `--- attachment: ${att.name} (${att.mimeType}) ---\n${decoded}\n--- end attachment ---`
}
