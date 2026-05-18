import type { PlanResultMessage } from '@kova/shared'

export type KovaRunMode = 'chat' | 'plan' | 'patch' | 'review'

export function chatOnlyPrompt(stack: string): string {
  return `You are a senior software engineer answering questions about this project.
Stack adapter: ${stack}.

Behavior:
- Answer directly. Never introduce yourself, list capabilities, or use emojis.
- Reply in the same language the user writes in. Keep replies concise.
- For greetings, reply naturally in one short sentence like a colleague would.
- Use provided file context when present. If a file reference was denied, say why briefly.
- If conversation history says files were changed/applied, treat that as the real workspace state.

Tools available in this mode (read-only — no file writes, no shell commands):
- read_file — inspect a file before answering when the answer depends on its contents.
- list_files — list a directory to orient the user.
- grep_codebase — locate a symbol, usage, or pattern. ALWAYS prefer this over describing where something "should" be.
- glob_files — list files matching a glob.

How to use tools:
- Use a tool when the user's question depends on actual code state. Don't guess.
- Don't call tools for greetings, definitions, or general "how does X work" questions.
- A short sentence before a tool call is fine. Avoid long monologues.

When the user asks you to BUILD, CREATE, MODIFY, or RUN something:
- You are in read-only mode and cannot do that here.
- Briefly say so in one sentence and suggest they rephrase as a direct request
  ("crie X", "adicione Y", "rode Z") — Kova will route that to the implementation engine.

Do not resume older tasks unless the user explicitly asks.`
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

/**
 * Mode resolution — Claude Code / Cursor / Codex parity.
 *
 * Mode is a SESSION property, not inferred per-message. The renderer pins a
 * mode (default 'patch') and only changes it on explicit slash commands.
 * Follow-up questions in a patch session stay in patch mode — the agent
 * has tools and decides via tool use whether to read, answer, or write.
 *
 * Resolution order (first match wins):
 *
 *   1. Slash prefix in the message text (`/plan`, `/review`, `/chat`)
 *      — always wins; lets users override the pinned mode for a single turn.
 *   2. Explicit `params.mode` from the UI — respects the pinned mode the
 *      renderer is showing.
 *   3. Default — `patch` (unified, all tools). This is the safe choice for
 *      everything except read-only modes, because the agent decides via
 *      tools and prompt whether to write files or just respond.
 *
 * The prior `isConversationalMessage` heuristic that routed questions to
 * chat-mode is no longer used here — it caused follow-ups to lose tool
 * access exactly when context-grounded answers were needed.
 */
export function resolveRunMode(message: string, explicit?: KovaRunMode): KovaRunMode {
  const trimmed = message.trim()
  if (/^\/plan(\s|$)/i.test(trimmed))   return 'plan'
  if (/^\/review(\s|$)/i.test(trimmed)) return 'review'
  if (/^\/chat(\s|$)/i.test(trimmed))   return 'chat'
  if (explicit === 'plan' || explicit === 'review' || explicit === 'chat') return explicit
  return 'patch'
}

/** @deprecated Kept for tests of the old contract — use {@link resolveRunMode}. */
export function inferRunMode(message: string, explicit?: KovaRunMode): KovaRunMode {
  return resolveRunMode(message, explicit)
}

/**
 * Best-effort detection of "the user is just chatting" — not used for mode
 * routing anymore (mode is sticky). Still exported because other parts of
 * the system (e.g. memory ranking, telemetry) may want a soft signal of
 * conversational vs implementation intent.
 *
 * Conservative: returns true only for unambiguous greetings, affirmations,
 * meta-instructions, and definitional questions with no engineering noun.
 */
export function isConversationalMessage(message: string): boolean {
  const normalized = normalizeText(message)
  if (!normalized) return false

  if (EXACT_CHAT_PHRASES.has(normalized)) return true

  // Meta-instructions about HOW to respond (language, tone, behavior).
  // Never a code task even when phrased as an imperative.
  if (META_INSTRUCTION_REGEX.test(normalized)) return true

  // Action verbs and repo paths are unambiguous engineering signals — always
  // patch. Checked before the definitional gate so "what should I change in
  // src/auth.ts?" routes to patch even though it starts with "what".
  if (ACTION_VERB_REGEX.test(normalized)) return false
  if (REPO_PATH_REGEX.test(normalized)) return false

  // Definitional questions ("o que é REST?", "what is OAuth?") are pure
  // curiosity even when they name an engineering concept. They route to
  // chat regardless of any deliverable noun that follows.
  if (DEFINITIONAL_QUESTION_REGEX.test(normalized)) return true

  // Named deliverable without action verb ("um componente novo",
  // "an endpoint for payments") → patch. The model decides via tools.
  if (DELIVERABLE_NOUN_REGEX.test(normalized)) return false

  // Pure questions / explanation requests with no engineering signal → chat.
  if (QUESTION_STARTER_REGEX.test(normalized)) return true
  if (EXPLANATION_REQUEST_REGEX.test(normalized)) return true
  if (normalized.endsWith('?')) return true

  // Greeting prefix + short tail ("Oi, tudo bem?", "Hello there").
  if (GREETING_PREFIX_REGEX.test(normalized) && normalized.length < 30) return true

  // Anything else short and unstructured.
  return normalized.length < 12
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

const EXACT_CHAT_PHRASES = new Set([
  'oi', 'ola', 'opa', 'hello', 'hi', 'hey', 'yo', 'eai', 'e ai',
  'bom dia', 'boa tarde', 'boa noite', 'good morning', 'good afternoon', 'good evening',
  'obrigado', 'obrigada', 'thanks', 'thank you', 'valeu',
  'entendi', 'ok', 'okay', 'sim', 'nao', 'no', 'yes', 'certo', 'perfeito', 'legal',
  'nao entendi', 'pode repetir', 'tudo bem', 'beleza',
])

// Language / tone / persona meta-instructions — never engineering work.
const META_INSTRUCTION_REGEX = new RegExp([
  // "responde em portugues", "answer in english"
  `^(?:responde|responda|me responde|fala|fale|me fala|escreve|escreva|`,
  `answer|respond|reply|speak|write|talk)\\s+(?:em|in|usando|using|com|de forma|de modo)\\b`,
  '|',
  // bare "em portugues" / "in english" anywhere
  `\\b(?:em portugues|em ingles|em espanhol|em frances|em italiano|em alemao|`,
  `in english|in portuguese|in spanish|in french|in italian|in german)\\b`,
  '|',
  // persona / tone changes
  `^(?:seja|seja mais|aja como|se comporte|be more|be a|act as|`,
  `use (?:formal|informal|simple|technical))\\b`,
  '|',
  // language switch
  `^(?:muda (?:o idioma|para|de idioma)|switch (?:language|to)|change (?:language|to))\\b`,
].join(''))

// Pure question starters — only routed to chat when no engineering signal
// is present (engineering check runs FIRST).
const QUESTION_STARTER_REGEX =
  /^(?:como|o que|oque|pra que|para que|por que|porque|quando|onde|quem|qual|quais|me diz|me fala|me explica|what|how|why|when|where|who|which)\b/

// Definitional questions — "o que é X", "what is X", "para que serve X".
// Pure curiosity even when X is a known engineering term (REST, OAuth, GraphQL).
// Routed to chat so the model gives a concept explanation instead of trying
// to scaffold a project around the noun.
const DEFINITIONAL_QUESTION_REGEX =
  /^(?:o que (?:e|eh)\b|que (?:e|eh)\b|what(?:'?s| is| are| does)\b|whats\b|para que serve\b|qual a (?:diferenca|definicao|funcao)\b)/

const EXPLANATION_REQUEST_REGEX =
  /^(?:explique|explica|explain|descreva|describe|resuma|resume|me conte|conta|summarize|tldr|tl;dr)\b/

const GREETING_PREFIX_REGEX =
  /^(?:oi|ola|opa|hello|hi|hey|bom dia|boa tarde|boa noite|good (?:morning|afternoon|evening))(?:[\s,!.?]|$)/

/**
 * Detects whether a message names an engineering deliverable OR an action verb
 * a coding agent should perform. When true, the message is routed to patch
 * (full tool access) regardless of question form.
 *
 * Catches three families:
 *   1. Action verbs in imperative, infinitive, and 3rd-person present forms
 *      (Portuguese + English): "crie / criar / cria / create".
 *   2. Engineering deliverables: page, component, endpoint, function, …
 *   3. Repo path/file shape: "src/foo.ts", "apps/electron/...", "main.go".
 *
 * Globally enterprise-shaped: not tied to a single stack. Covers TS/JS, Go,
 * Python, Rust, Java, mobile (Swift/Kotlin/Dart), and infra (Docker/CI).
 */
export function looksLikeEngineeringTask(text: string): boolean {
  const lowered = text.toLowerCase()
  if (ACTION_VERB_REGEX.test(lowered)) return true
  if (DELIVERABLE_NOUN_REGEX.test(lowered)) return true
  if (REPO_PATH_REGEX.test(lowered)) return true
  return false
}

// Action verbs — Portuguese (imperative + infinitive + present + 1st person
// singular) + English. Stems use `[aeio]r?` so "crie", "cria", "crio", and
// "criar" all match. False positives push to patch — the safer default for
// an agent with tools — so the regex is intentionally permissive.
const ACTION_VERB_REGEX = new RegExp(
  '\\b(?:' + [
    // pt-BR — write/create
    'cri[aeio]r?', 'ger[aeio]r?', 'gere', 'gera', 'escrev[aeio]r?', 'escreve',
    'adicion[aeio]r?', 'inclu[aio]r?',
    // pt-BR — modify
    'alter[aeio]r?', 'mud[aeio]r?', 'modific[aeio]r?', 'edit[aeio]r?',
    'refator[aeio]r?', 'reescrev[aeio]r?', 'atualiz[aeio]r?',
    // pt-BR — fix
    'corrig[ieo]r?', 'corrij[ao]', 'consert[aeio]r?', 'resolv[aeio]r?', 'arrum[aeio]r?',
    'ajust[aeio]r?', 'debug(?:a|o|ar|ue)', 'depur[aeio]r?',
    // pt-BR — remove / move
    'remov[aeio]r?', 'apag[aeio]r?', 'delet[aeio]r?', 'exclu[aio]r?',
    'mov[aeio]r?', 'renome[aio]r?', 'extra[ieo]r?',
    // pt-BR — run / install / build
    'rod[aeio]r?', 'execut[aeio]r?', 'instal[aeio]r?', 'build', 'compil[aeio]r?',
    'test[aeio]r?', 'valid[aeio]r?', 'verific[aeio]r?', 'check?[aeio]?r?', 'analis[aeio]r?',
    'configur[aeio]r?', 'otimiz[aeio]r?', 'melhor[aeio]r?',
    // pt-BR — show / list (read-with-intent)
    'mostr[aeio]r?', 'list[aeio]r?', 'lei[aeio]r?', 'le[r]?', 'busc[aeio]r?', 'procur[aeio]r?',
    // pt-BR — implement / do
    'implement[aeio]r?', 'faze[r]?', 'fa[cç][aeio]r?', 'fa[cç]o',
    // pt-BR — deploy / migrate / convert
    'deploy[aeio]r?', 'migr[aeio]r?', 'migre', 'convert[aeio]r?',
    // English
    'create', 'creates', 'creating', 'created',
    'add', 'adds', 'adding', 'added',
    'fix', 'fixes', 'fixing', 'fixed',
    'update', 'updates', 'updating', 'updated',
    'implement', 'implements', 'implementing', 'implemented',
    'refactor', 'refactors', 'refactoring', 'refactored',
    'remove', 'removes', 'removing', 'removed',
    'delete', 'deletes', 'deleting', 'deleted',
    'move', 'moves', 'moving', 'moved',
    'rename', 'renames', 'renaming', 'renamed',
    'optimize', 'optimise', 'optimizes', 'optimising',
    'install', 'installs', 'installing', 'installed',
    'run', 'runs', 'running',
    'build', 'builds', 'building', 'built',
    'generate', 'generates', 'generating', 'generated',
    'write', 'writes', 'writing', 'wrote',
    'read', 'reads', 'reading',
    'show', 'shows', 'list', 'lists', 'listing',
    'edit', 'edits', 'editing',
    'change', 'changes', 'changing', 'changed',
    'modify', 'modifies', 'modifying', 'modified',
    'review', 'apply', 'revert', 'rollback', 'merge', 'split',
    'migrate', 'migrates', 'migrating', 'migrated',
    'convert', 'converts', 'converting', 'converted',
    'extract', 'extracts', 'extracting', 'extracted',
    'deploy', 'deploys', 'deploying', 'deployed',
    'test', 'tests', 'testing', 'tested',
    'check', 'checks', 'checking', 'checked',
    'verify', 'verifies', 'verifying', 'verified',
    'analyze', 'analyse', 'analyzes', 'analysing',
    'configure', 'configures', 'configuring', 'configured',
    'debug', 'debugs', 'debugging', 'debugged',
    'scaffold', 'scaffolds', 'scaffolding',
    'bootstrap', 'bootstraps', 'bootstrapping',
    'init', 'initialize', 'initialise', 'initializing',
    'set up', 'setup', 'set-up',
  ].join('|') + ')\\b',
)

// Engineering deliverables — when one of these is named, treat it as
// a thing the agent should build / inspect / change.
const DELIVERABLE_NOUN_REGEX = new RegExp(
  '\\b(?:' + [
    // pages / sites
    'landing', 'site', 'website', 'pagina', 'page', 'home', 'homepage',
    'frontend', 'backend', 'fullstack', 'app', 'webapp', 'mobile app',
    // UI parts
    'componente', 'component', 'modal', 'dialog', 'card', 'hero', 'cta',
    'header', 'footer', 'nav', 'navbar', 'menu', 'sidebar', 'tab', 'tabs',
    'botao', 'button', 'form', 'input', 'dropdown', 'select', 'tooltip',
    'tabela', 'table', 'lista', 'list', 'grid', 'gallery', 'carousel',
    'banner', 'badge', 'avatar', 'spinner', 'toast', 'snackbar', 'drawer',
    // backend parts
    'api', 'endpoint', 'rota', 'route', 'router', 'controller', 'handler',
    'middleware', 'service', 'servico', 'worker', 'job', 'cron',
    'queue', 'webhook', 'rpc', 'graphql', 'rest', 'grpc',
    // data
    'schema', 'model', 'entity', 'repository', 'dao', 'dto', 'migration',
    'seed', 'tabela', 'table', 'campo', 'field', 'coluna', 'column',
    'banco', 'database', 'index', 'indice', 'query', 'view', 'trigger',
    // language constructs
    'funcao', 'function', 'metodo', 'method', 'classe', 'class', 'modulo', 'module',
    'interface', 'type', 'enum', 'trait', 'struct', 'protocol', 'mixin',
    'hook', 'provider', 'adapter', 'factory',
    // files / structure
    'arquivo', 'file', 'pasta', 'folder', 'diretorio', 'directory',
    'package', 'pacote', 'crate', 'gem',
    // tests
    'teste', 'test', 'spec', 'unit test', 'e2e', 'integration test',
    // infra / tooling
    'docker', 'dockerfile', 'kubernetes', 'k8s', 'helm', 'terraform',
    'ci', 'cd', 'pipeline', 'workflow', 'github action', 'gitlab ci',
    'monorepo', 'workspace', 'turborepo', 'nx',
    // problems
    'bug', 'erro', 'error', 'crash', 'memory leak', 'race condition',
    'flaky', 'timeout', 'regressao', 'regression',
    // features
    'feature', 'funcionalidade', 'fluxo', 'flow', 'pipeline', 'integracao', 'integration',
    'auth', 'login', 'signup', 'logout', 'session', 'oauth', 'sso',
    'pagamento', 'payment', 'checkout', 'cart', 'carrinho',
    'dashboard', 'admin', 'painel', 'profile', 'perfil', 'settings',
    'config', 'env', 'envvar',
  ].join('|') + ')\\b',
)

// Repo-shaped paths: "src/foo.ts", "apps/electron/...", "main.go", "Dockerfile".
const REPO_PATH_REGEX =
  /(?:\b(?:src|apps|packages|tests?|specs?|lib|cmd|internal|pkg|cmd|service|services|components?|pages|routes|app)\/|\b[A-Za-z0-9_-]+\.(?:ts|tsx|js|jsx|mjs|cjs|css|scss|html|json|md|mdx|yml|yaml|toml|go|py|rs|java|kt|kts|cs|rb|php|swift|dart|vue|svelte|sql|sh|bat|ps1|dockerfile)\b)/i

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
