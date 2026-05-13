import type { PlanResultMessage } from '@kova/shared'

export type KovaRunMode = 'chat' | 'plan' | 'patch' | 'review'

export function chatOnlyPrompt(stack: string): string {
  return `You are Kova, a senior software engineering assistant.
Stack adapter: ${stack}.

This is Chat Mode:
- Reply in text only.
- Do not call tools.
- Use provided referenced files and project context if present.
- If a referenced file was denied, explain the security reason briefly.
- Do not carry out older tasks unless the user explicitly asks for them again.

Respond in the language the user writes in.`
}

export function reviewOnlyPrompt(stack: string): string {
  return `You are Kova in Review Mode, a read-only senior code reviewer.
Stack adapter: ${stack}.

Allowed behavior:
- You may inspect files with read_file and list_files.
- You must not edit, create, delete, apply patches, or run shell commands.
- Focus on concrete findings, risks, missing validation, and next steps.
- Do not carry out older tasks unless the user explicitly asks for them again.

Respond in the user's language.`
}

export function planOnlyPrompt(stack: string): string {
  return `You are Kova in Plan Mode, a read-only senior engineering planner.
Stack adapter: ${stack}.

Allowed behavior:
- You may inspect files with read_file and list_files.
- You must not edit, create, delete, apply patches, or run shell commands.
- Use existing project structure, instructions, and local conventions as the source of truth.
- Prefer a small, safe implementation plan over broad refactors.

Respond with ONLY the following XML structure:
<plan_result>
  <objective>What the task requires and why</objective>
  <files>
    <file path="path/to/file.ext" reason="Why this file needs to change" />
  </files>
  <approach>Step-by-step implementation strategy</approach>
  <validations>
    <command>Validation commands to run later</command>
  </validations>
  <risk>low</risk> <!-- Must be: low, medium, or high -->
</plan_result>`
}

export function inferRunMode(message: string, explicit?: KovaRunMode): KovaRunMode {
  // Explicit mode always wins — UI sends 'plan', 'review', or 'patch'; code may send 'chat'
  if (explicit && explicit !== 'patch') return explicit
  // Slash command prefixes in message text
  if (/^\/plan(\s|$)/i.test(message.trim()))   return 'plan'
  if (/^\/review(\s|$)/i.test(message.trim())) return 'review'
  // Default: unified patch — model decides whether to write files or just respond
  if (isConversationalMessage(message)) return 'chat'
  return 'patch'
}

export function isConversationalMessage(message: string): boolean {
  const normalized = normalizeText(message)
  const greetings = new Set([
    'oi', 'ola', 'opa', 'hello', 'hi', 'hey',
    'bom dia', 'boa tarde', 'boa noite',
    'obrigado', 'obrigada', 'thanks', 'valeu',
  ])
  if (greetings.has(normalized)) return true
  if (looksLikeEngineeringTask(normalized)) return false
  if (/^(oi|ola|opa|hello|hi|hey|bom dia|boa tarde|boa noite)([\s,!.?]|$)/.test(normalized)) return true
  return normalized.length > 0 && normalized.length < 8
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function looksLikeEngineeringTask(text: string): boolean {
  return /(adicione|corrija|implemente|crie|altere|refatore|teste|valide|remova|delete|mova|renomeie|atualize|otimize|resolva|analise|verifique|configure|instale|execute|rode|builde|faca|faz|melhore|ajuste|arrume|mostre|liste|leia|escreva|gere|extraia|converta|migre|depure|debugue|fix|add|create|update|implement|refactor|remove|move|rename|optimize|resolve|analyze|verify|configure|install|run|build|generate|extract|convert|migrate|debug|deploy|test|write|read|show|list|edit|change|modify|check|review|apply|revert|rollback|merge|split|set|bug|erro|error|feature|endpoint|funcao|function|metodo|method|classe|class|modulo|module|arquivo|file|api|rota|route|pagina|page|componente|component|servico|service|banco|database|tabela|table|campo|field|coluna|indice|index|query|schema|model|controller|handler|middleware|hook|provider|adapter|factory|repository|entity|dto|interface|type|enum|const|var|import|export|package|depend|config|env|docker|ci|cd|pipeline|deploy|src\/|apps\/|packages\/|tests\/|spec\/|lib\/|cmd\/|internal\/|\.\w{1,5}$)/.test(text)
}

export function parsePlanResult(text: string, originalObjective: string): PlanResultMessage | null {
  const xmlMatch = text.match(/<plan_result>([\s\S]*?)<\/plan_result>/i)
  if (!xmlMatch) return null
  const xml = xmlMatch[1]

  const objective = xml.match(/<objective>([\s\S]*?)<\/objective>/i)?.[1]?.trim() ?? originalObjective
  const approach = xml.match(/<approach>([\s\S]*?)<\/approach>/i)?.[1]?.trim() ?? ''
  const riskRaw = xml.match(/<risk>([\s\S]*?)<\/risk>/i)?.[1]?.trim().toLowerCase() ?? 'medium'
  const risk: 'low' | 'medium' | 'high' = riskRaw === 'low' || riskRaw === 'high' ? riskRaw : 'medium'

  const filesSection = xml.match(/<files>([\s\S]*?)<\/files>/i)?.[1] ?? ''
  const files: Array<{ path: string; reason: string }> = []
  for (const match of filesSection.matchAll(/<file\s+path="([^"]+)"\s+reason="([^"]*)"/gi)) {
    files.push({ path: match[1], reason: match[2] })
  }

  const validationsSection = xml.match(/<validations>([\s\S]*?)<\/validations>/i)?.[1] ?? ''
  const validations: string[] = []
  for (const match of validationsSection.matchAll(/<command>([\s\S]*?)<\/command>/gi)) {
    const cmd = match[1].trim()
    if (cmd) validations.push(cmd)
  }

  return { kind: 'plan_result', objective, files, approach, validations, risk }
}
