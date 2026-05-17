import type { PlanResultMessage } from '@kova/shared'

export type KovaRunMode = 'chat' | 'plan' | 'patch' | 'review'

export function chatOnlyPrompt(stack: string): string {
  return `You are a senior software engineer helping with this project.
Stack: ${stack}.

Rules:
- Answer directly. Never introduce yourself, never list your capabilities, never say your name.
- No emojis. No bullet-point capability lists. No "OBS:" disclaimers. No marketing phrases.
- If the user says "oi", "hi", or similar — just reply naturally in one short sentence, like a colleague would.
- If asked what you can do, answer briefly and concretely based on the project context.
- Use provided file context when present. If a file reference was denied, say why briefly.
- You are running inside the Kova desktop app with project workspace access during implementation tasks. If conversation history says files were changed or applied, treat that as real workspace state. Never claim you cannot create or modify files after Kova already applied a task.
- Do not resume older tasks unless the user explicitly asks.
- Respond in the same language the user writes in.`
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
  return `You are Kova in Plan Mode, a read-only senior engineering planner. Output a concrete implementation plan.
Stack: ${stack}.

WORKFLOW:
1. Use read_file/list_files ONLY when the provided project context contains relevant files that must be inspected.
2. If the project context says "(no relevant code files found)", assume a blank project and produce a plan immediately. Do not call tools to confirm emptiness.
3. For self-contained creation requests, produce a concrete implementation plan from the request. Do not narrate exploration.
4. Never modify files, never run shell commands.
5. End with the XML <plan_result> block - no other final text.

OUTPUT CONTRACT (mandatory):
Your final message must contain EXACTLY ONE <plan_result>...</plan_result> block.
Do NOT include any preamble, exploration text, "let me check...", or commentary.
Start your final message directly with <plan_result> and end with </plan_result>.

EVERY <plan_result> MUST INCLUDE:
- <objective>: 1 sentence describing what will be built and why
- <files>: 1-N <file> entries, each with concrete path AND reason. NEVER empty.
- <approach>: numbered steps (1. 2. 3.) describing the implementation order. NEVER vague.
- <validations>: 1-N <command> entries the user can run to verify. Use stack-appropriate commands.
- <risk>: low | medium | high - based on scope and reversibility

EXAMPLE for "create landing page for barbershop":
<plan_result>
  <objective>Build a static landing page for a barbershop with hero, services, and contact sections.</objective>
  <files>
    <file path="index.html" reason="Semantic HTML structure with header, hero, services, contact, footer" />
    <file path="style.css" reason="Layout, typography, color palette, responsive grid" />
    <file path="script.js" reason="Smooth-scroll navigation and contact form validation" />
  </files>
  <approach>1. Scaffold semantic HTML5 layout in index.html with sectioned content. 2. Define design tokens (colors, fonts, spacing) and component styles in style.css using CSS Grid/Flex. 3. Wire smooth-scroll and form validation in script.js. 4. Verify locally by opening index.html in a browser.</approach>
  <validations>
    <command>npx http-server . -p 8080</command>
  </validations>
  <risk>low</risk>
</plan_result>

EXAMPLE for "add login flow to existing React app":
<plan_result>
  <objective>Add email/password login flow with session persistence to the existing React app.</objective>
  <files>
    <file path="src/auth/login-form.tsx" reason="New form component with controlled inputs and submit handler" />
    <file path="src/auth/session.ts" reason="LocalStorage session helpers (read, write, clear)" />
    <file path="src/App.tsx" reason="Add login route and protected-route wrapper" />
  </files>
  <approach>1. Create session.ts with typed helpers. 2. Build LoginForm component with controlled state. 3. Add /login route in App.tsx and gate other routes behind a session check. 4. Add unit tests for session helpers.</approach>
  <validations>
    <command>pnpm test src/auth</command>
    <command>pnpm typecheck</command>
  </validations>
  <risk>medium</risk>
</plan_result>

Now produce the plan for the user's request. Respond with ONLY the <plan_result> XML - no preamble, no exploration text.`
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

  // Exact short responses and greetings — always chat
  const exact = new Set([
    'oi', 'ola', 'opa', 'hello', 'hi', 'hey',
    'bom dia', 'boa tarde', 'boa noite',
    'obrigado', 'obrigada', 'thanks', 'valeu',
    'entendi', 'ok', 'sim', 'nao', 'certo', 'perfeito', 'legal',
    'nao entendi', 'pode repetir',
  ])
  if (exact.has(normalized)) return true

  // Question starters — checked BEFORE engineering-task gate so that
  // "Como posso testar?", "Pra que serve isso?", "O que aconteceu?" all
  // route to chat instead of patch.
  if (/^(como|o que|oque|pra que|para que|por que|porque|quando|onde|quem|qual|quais|me diz|me fala|me explica|what|how|why|when|where|who|which)\b/.test(normalized)) return true

  // Explanation requests — also always chat
  if (/^(explique|explica|explain|explica|descreva|describe|resuma|resume|me conte|conta|summarize)\b/.test(normalized)) return true

  // Meta-instructions about HOW to respond (language, tone, behavior) — NEVER a code task
  // "responde em portugues", "fala em ingles", "respond in english", "use formal language", etc.
  if (/^(responde|responda|me responde|fala|fale|me fala|escreve|escreva|answer|respond|reply|speak|write|talk)\s+(em|in|usando|using|com|de forma|de modo)\b/.test(normalized)) return true
  if (/\b(em portugues|em ingles|em espanhol|in english|in portuguese|in spanish|in french|em frances)\b/.test(normalized)) return true
  if (/^(seja|seja mais|aja como|se comporte|be more|be a|act as|use (formal|informal|simple|technical))\b/.test(normalized)) return true
  if (/^(muda (o idioma|para|de idioma)|switch (language|to)|change (language|to))\b/.test(normalized)) return true

  // Messages ending with "?" are questions (user wants info, not action)
  // UNLESS they start with a clear imperative verb.
  if (normalized.endsWith('?')) {
    const imperativeStart = /^(crie|adicione|corrija|implemente|altere|refatore|remova|delete|mova|atualize|configure|instale|execute|rode|gere|escreva|migre|cria|adiciona|corrige|implementa|fix|add|create|update|implement|remove|optimize|install|run|build|generate|write|migrate)\b/
    if (!imperativeStart.test(normalized)) return true
  }

  // Engineering task check: if it looks like a task, keep patch mode
  if (looksLikeEngineeringTask(normalized)) return false

  // Greeting prefix (e.g. "Oi, como vai?")
  if (/^(oi|ola|opa|hello|hi|hey|bom dia|boa tarde|boa noite)([\s,!.?]|$)/.test(normalized)) return true

  // Short non-task messages
  return normalized.length > 0 && normalized.length < 12
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

// ─── FIX-005: Robust 3-tier plan parser ──────────────────────────────────────
// Tier 1: strict XML (above)
// Tier 2: markdown headers heuristic (Objective:, Files:, Approach:, etc.)
// Tier 3: minimal fallback — full thought as approach, never returns null
// This guarantees /plan always produces a structured card, even when the model
// ignores the XML format requested by planOnlyPrompt.

const SECTION_PATTERNS = {
  objective: /(?:^|\n)\s*(?:\*\*|#{1,4}\s*)?\s*objective\s*:?\s*\*?\*?\s*\n?([\s\S]*?)(?=(?:\n\s*(?:\*\*|#{1,4}\s*)?(?:files?|approach|validations?|risk|criteria)\s*:?)|$)/i,
  files: /(?:^|\n)\s*(?:\*\*|#{1,4}\s*)?\s*files?\s*:?\s*\*?\*?\s*\n?([\s\S]*?)(?=(?:\n\s*(?:\*\*|#{1,4}\s*)?(?:objective|approach|validations?|risk|criteria)\s*:?)|$)/i,
  approach: /(?:^|\n)\s*(?:\*\*|#{1,4}\s*)?\s*approach\s*:?\s*\*?\*?\s*\n?([\s\S]*?)(?=(?:\n\s*(?:\*\*|#{1,4}\s*)?(?:objective|files?|validations?|risk|criteria)\s*:?)|$)/i,
  validations: /(?:^|\n)\s*(?:\*\*|#{1,4}\s*)?\s*validations?\s*:?\s*\*?\*?\s*\n?([\s\S]*?)(?=(?:\n\s*(?:\*\*|#{1,4}\s*)?(?:objective|files?|approach|risk|criteria)\s*:?)|$)/i,
  risk: /(?:^|\n)\s*(?:\*\*|#{1,4}\s*)?\s*risk\s*:?\s*\*?\*?\s*([\s\S]*?)(?=(?:\n\s*(?:\*\*|#{1,4}\s*)?(?:objective|files?|approach|validations?|criteria)\s*:?)|$)/i,
} as const

function parsePlanResultFromMarkdown(text: string, originalObjective: string): PlanResultMessage | null {
  // Require at least 2 of the 5 well-known sections to consider this a structured plan.
  const matches = {
    objective: text.match(SECTION_PATTERNS.objective)?.[1]?.trim() ?? '',
    files: text.match(SECTION_PATTERNS.files)?.[1]?.trim() ?? '',
    approach: text.match(SECTION_PATTERNS.approach)?.[1]?.trim() ?? '',
    validations: text.match(SECTION_PATTERNS.validations)?.[1]?.trim() ?? '',
    risk: text.match(SECTION_PATTERNS.risk)?.[1]?.trim() ?? '',
  }
  const sectionCount = Object.values(matches).filter(Boolean).length
  if (sectionCount < 2) return null

  // Files: extract paths from bullet lines (`- src/foo.ts: reason` or `- src/foo.ts — reason` or just `- src/foo.ts`)
  const files: Array<{ path: string; reason: string }> = []
  for (const rawLine of matches.files.split('\n')) {
    const line = rawLine.replace(/^[-*•]\s+/, '').trim()
    if (!line) continue
    const sepMatch = line.match(/^([^\s:—–-]+(?:\.[a-z0-9]+)?)\s*[:—–-]\s*(.+)$/i)
    if (sepMatch) {
      files.push({ path: sepMatch[1].trim(), reason: sepMatch[2].trim() })
    } else if (/[/.\\]/.test(line)) {
      files.push({ path: line, reason: '' })
    }
  }

  // Validations: bullet lines → commands
  const validations: string[] = []
  for (const rawLine of matches.validations.split('\n')) {
    const line = rawLine.replace(/^[-*•]\s+/, '').trim()
    if (line) validations.push(line)
  }

  const riskRaw = matches.risk.toLowerCase()
  const risk: 'low' | 'medium' | 'high' = riskRaw.includes('low') ? 'low' : riskRaw.includes('high') ? 'high' : 'medium'

  return {
    kind: 'plan_result',
    objective: matches.objective || originalObjective,
    files,
    approach: matches.approach,
    validations,
    risk,
  }
}

/**
 * Removes any XML fragments (`<plan_result>...</plan_result>` and lingering tags)
 * from a text so the minimal-fallback approach field stays clean.
 */
function stripXmlFragments(text: string): string {
  return text
    .replace(/<plan_result>[\s\S]*?<\/plan_result>/gi, '')
    .replace(/<\/?[a-z_]+(?:\s+[^>]*)?>/gi, '')
    .trim()
}

function cleanPlanningNarration(text: string): string {
  return stripXmlFragments(text)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^let me\b/i.test(line))
    .filter(line => !/^i('| a)?ll\s+(check|explore|inspect)\b/i.test(line))
    .filter(line => !/^the project (directory )?is empty\b/i.test(line))
    .filter(line => !/^the project is a blank slate\b/i.test(line))
    .join('\n')
    .trim()
}

function isStaticLandingRequest(objective: string): boolean {
  const normalized = objective.toLowerCase()
  return /\b(landing|site|website|pagina|p[aá]gina|hero|servi[cç]os?|contato|contact|barbearia|barber)\b/.test(normalized)
}

function buildStaticLandingFallback(originalObjective: string): PlanResultMessage {
  const steps = [
    'Create the HTML structure with accessible landmarks and clear content sections.',
    'Style the page with a polished responsive layout, strong first viewport, service cards, and contact area.',
    'Add minimal JavaScript only for useful interactions that improve the landing page.',
    'Verify the static page in a browser and check mobile sizing.',
  ]
  return {
    kind: 'plan_result',
    objective: originalObjective,
    files: [
      { path: 'index.html', reason: 'Semantic page structure with header, hero, services, contact section, and footer.' },
      { path: 'styles.css', reason: 'Responsive visual system: layout, typography, colors, spacing, and mobile behavior.' },
      { path: 'script.js', reason: 'Small client-side interactions such as smooth scrolling and contact form feedback.' },
    ],
    approach: steps.map((step, index) => `${index + 1}. ${step}`).join(' '),
    validations: ['python -m http.server 8080'],
    risk: 'low',
  }
}

/**
 * Always returns a valid PlanResultMessage. Tries strict XML → markdown → minimal fallback.
 * Use this when the user must always see a card, even if the model ignored the XML format.
 */
export function parsePlanResultRobust(text: string, originalObjective: string): PlanResultMessage {
  const strict = parsePlanResult(text, originalObjective)
  if (strict) return strict

  const markdown = parsePlanResultFromMarkdown(text, originalObjective)
  if (markdown) return markdown

  if (isStaticLandingRequest(originalObjective)) {
    return buildStaticLandingFallback(originalObjective)
  }

  const cleaned = cleanPlanningNarration(text)

  // Minimal fallback: never leave the user without a card
  return {
    kind: 'plan_result',
    objective: originalObjective,
    files: [],
    approach: cleaned || 'Prepare a concrete implementation plan from the request, then validate the affected behavior.',
    validations: [],
    risk: 'medium',
  }
}

/**
 * Streaming helper: strips `<plan_result>...</plan_result>` (and a partial open tag
 * at the end of the buffer) so raw XML is never shown as chat tokens. Used by the
 * token suppression filter in runPlanSession.
 */
export function stripPlanXml(buffer: string): string {
  let out = buffer.replace(/<plan_result>[\s\S]*?<\/plan_result>/gi, '')
  // If a partial opening tag remains at the tail, drop from `<` to the end.
  // Conservative: any `<` followed by letters at end-of-string is treated as a partial tag.
  const partialIdx = out.search(/<[a-z_]*$/i)
  if (partialIdx >= 0) out = out.slice(0, partialIdx)
  // Also drop everything from an unclosed `<plan_result>` onwards.
  const unclosedIdx = out.search(/<plan_result\b/i)
  if (unclosedIdx >= 0) out = out.slice(0, unclosedIdx)
  return out
}
