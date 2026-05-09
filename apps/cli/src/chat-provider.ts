import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { resolveLlmSettings } from './llm-settings'

export interface ChatReplyResult {
  ok: boolean
  text: string
  reason?: string
}

export async function generateChatReply(message: string, context: { cwd: string; sessionContext?: string }): Promise<ChatReplyResult> {
  const settings = resolveLlmSettings()
  if (!settings.provider) {
    return { ok: false, text: '', reason: 'No provider configured. Run /connect or /login first.' }
  }
  if (settings.provider === 'ollama' && !settings.baseUrl) {
    return { ok: false, text: '', reason: 'Ollama is configured, but no base URL is set.' }
  }
  if (settings.provider !== 'ollama' && !settings.apiKey) {
    return { ok: false, text: '', reason: `${settings.provider} is configured, but no credential is available.` }
  }

  try {
    if (settings.provider === 'anthropic') return await anthropicReply(message, context, settings.apiKey!, settings.model)
    return await openAICompatibleReply(message, context, {
      apiKey: settings.apiKey,
      baseUrl: settings.baseUrl ?? defaultBaseUrl(settings.provider),
      model: settings.model ?? defaultModel(settings.provider),
    })
  } catch (error) {
    return {
      ok: false,
      text: '',
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}

async function openAICompatibleReply(
  message: string,
  context: { cwd: string; sessionContext?: string },
  settings: { apiKey?: string; baseUrl?: string; model?: string },
): Promise<ChatReplyResult> {
  if (!settings.baseUrl || !settings.model) {
    return { ok: false, text: '', reason: 'Provider base URL or model is missing.' }
  }

  const response = await fetch(`${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'system', content: systemPrompt(context) },
        { role: 'user', content: message },
      ],
      max_tokens: 2000,
    }),
  })
  if (!response.ok) throw new Error(`Model request failed: ${response.status} ${await response.text()}`)
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const text = json.choices?.[0]?.message?.content?.trim()
  return text ? { ok: true, text } : { ok: false, text: '', reason: 'Model returned an empty response.' }
}

async function anthropicReply(
  message: string,
  context: { cwd: string; sessionContext?: string },
  apiKey: string,
  model = 'claude-sonnet-4-6',
): Promise<ChatReplyResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: systemPrompt(context),
      messages: [{ role: 'user', content: message }],
    }),
  })
  if (!response.ok) throw new Error(`Model request failed: ${response.status} ${await response.text()}`)
  const json = await response.json() as { content?: Array<{ type?: string; text?: string }> }
  const text = json.content?.filter(part => part.type === 'text').map(part => part.text ?? '').join('\n').trim()
  return text ? { ok: true, text } : { ok: false, text: '', reason: 'Model returned an empty response.' }
}

function systemPrompt(context: { cwd: string; sessionContext?: string }): string {
  const projectFiles = listProjectFiles(context.cwd)
  return [
    'You are Kova, a senior coding assistant inside a terminal environment.',
    'You have full awareness of the project structure listed below.',
    'Answer questions about the code, architecture, and project with precision.',
    'If the user asks you to edit, create, or modify files, tell them to type their request as a task directly — the agent loop will handle it with real tools.',
    'Do not claim to have run commands or modified files unless explicitly shown.',
    '',
    `Project directory: ${context.cwd}`,
    projectFiles ? `\nProject structure:\n${projectFiles}` : '',
    context.sessionContext ? `\nRecent session context:\n${context.sessionContext}` : '',
  ].filter(Boolean).join('\n')
}

// Build a concise project tree (max 2 levels deep, skip node_modules/dist/out/.git)
function listProjectFiles(cwd: string): string {
  const SKIP = new Set(['node_modules', 'dist', 'out', '.git', '.next', '__pycache__', 'target', 'build', '.kova'])
  const MAX_ENTRIES = 80
  const lines: string[] = []

  function walk(dir: string, prefix: string, depth: number): void {
    if (depth > 2 || lines.length >= MAX_ENTRIES) return
    let entries: string[]
    try { entries = readdirSync(dir) } catch { return }
    const filtered = entries.filter(e => !SKIP.has(e) && !e.startsWith('.'))
    for (const entry of filtered) {
      if (lines.length >= MAX_ENTRIES) { lines.push(`${prefix}...`); return }
      const full = join(dir, entry)
      try {
        if (statSync(full).isDirectory()) {
          lines.push(`${prefix}${entry}/`)
          walk(full, `${prefix}  `, depth + 1)
        } else {
          lines.push(`${prefix}${entry}`)
        }
      } catch { /* skip inaccessible */ }
    }
  }

  walk(cwd, '  ', 0)
  return lines.join('\n')
}

function defaultBaseUrl(provider: string): string | undefined {
  if (provider === 'openai') return 'https://api.openai.com/v1'
  if (provider === 'deepseek') return 'https://api.deepseek.com'
  if (provider === 'kimi') return 'https://api.moonshot.ai/v1'
  if (provider === 'openrouter') return 'https://openrouter.ai/api/v1'
  if (provider === 'ollama') return 'http://localhost:11434/v1'
  return undefined
}

function defaultModel(provider: string): string | undefined {
  if (provider === 'openai') return 'gpt-4.1'
  if (provider === 'deepseek') return 'deepseek-v4-flash'
  if (provider === 'kimi') return 'kimi-k2.5'
  if (provider === 'openrouter') return 'anthropic/claude-sonnet-4.5'
  if (provider === 'ollama') return 'qwen2.5-coder:7b'
  return undefined
}
