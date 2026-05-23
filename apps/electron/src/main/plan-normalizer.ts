import type { PlanResultMessage } from '@kova/shared'
import { isGenericPlanPlaceholder } from '@kova/shared'

export type PlanLocale = 'pt-BR' | 'en'

export interface NormalizePlanContext {
  objective: string
  contextFilePaths?: string[]
  locale?: PlanLocale
}

export function detectPlanLocale(text: string): PlanLocale {
  const normalized = text.toLowerCase()
  if (/[áàâãéêíóôõúç]/i.test(text)) return 'pt-BR'
  if (/\b(crie|criar|implemente|landing|pagina|página|barbearia|secao|seção|faq|localizacao|localização)\b/.test(normalized)) {
    return 'pt-BR'
  }
  return 'en'
}

export function normalizePlanResult(plan: PlanResultMessage, ctx: NormalizePlanContext): PlanResultMessage {
  const locale = ctx.locale ?? detectPlanLocale(ctx.objective)
  const contextFiles = filterContextFiles(ctx.contextFilePaths ?? [])
  const objective = sanitizeObjective(plan.objective, ctx.objective)
  const files = normalizeFiles(plan.files, objective, contextFiles, locale)
  const approach = normalizeApproach(plan.approach, objective, files, locale)
  const validations = normalizeValidations(plan.validations, locale)
  const risk = plan.risk ?? inferRisk(files, objective)

  return {
    kind: 'plan_result',
    objective,
    files,
    approach,
    validations,
    risk,
  }
}

function sanitizeObjective(objective: string, fallback: string): string {
  const trimmed = objective.trim()
  if (!trimmed || isGenericPlanPlaceholder(trimmed)) return fallback.trim() || trimmed
  return trimmed
}

function normalizeFiles(
  files: PlanResultMessage['files'],
  objective: string,
  contextFiles: string[],
  locale: PlanLocale,
): PlanResultMessage['files'] {
  const useful = files.filter(file =>
    file.path.trim()
    && !isGenericPlanPlaceholder(file.path)
    && !isGenericPlanPlaceholder(file.reason),
  )

  if (useful.length > 0) return useful

  if (contextFiles.length > 0) {
    return contextFiles.slice(0, 8).map(path => ({
      path,
      reason: locale === 'pt-BR'
        ? 'Arquivo relevante detectado no contexto do projeto.'
        : 'Relevant file detected from project context.',
    }))
  }

  if (isStaticLandingObjective(objective)) {
    return locale === 'pt-BR'
      ? [
        { path: 'index.html', reason: 'Estrutura semântica com hero, serviços, FAQ e contato.' },
        { path: 'styles.css', reason: 'Layout responsivo, tipografia e identidade visual.' },
        { path: 'script.js', reason: 'Interações leves como scroll suave e validação básica.' },
      ]
      : [
        { path: 'index.html', reason: 'Semantic structure with hero, services, FAQ, and contact.' },
        { path: 'styles.css', reason: 'Responsive layout, typography, and visual identity.' },
        { path: 'script.js', reason: 'Light interactions such as smooth scroll and basic validation.' },
      ]
  }

  return [{
    path: locale === 'pt-BR' ? 'src/' : 'src/',
    reason: locale === 'pt-BR'
      ? 'Definir arquivos concretos conforme o escopo da solicitação.'
      : 'Define concrete files according to the request scope.',
  }]
}

function normalizeApproach(
  approach: string,
  objective: string,
  files: PlanResultMessage['files'],
  locale: PlanLocale,
): string {
  const cleaned = approach.trim()
  if (cleaned && !isGenericPlanPlaceholder(cleaned)) {
    return cleaned
  }

  const fileList = files.map(file => file.path).join(', ')
  if (locale === 'pt-BR') {
    if (isStaticLandingObjective(objective)) {
      return [
        '1. Criar a estrutura HTML semântica em index.html com seções claras (hero, serviços, FAQ, contato).',
        '2. Implementar styles.css com layout responsivo, tipografia e hierarquia visual.',
        '3. Adicionar script.js apenas para interações úteis (scroll suave, FAQ/acordeão se necessário).',
        '4. Revisar copy, contraste e comportamento mobile antes de validar.',
      ].join(' ')
    }
    return [
      '1. Ler o contexto atual e confirmar arquivos afetados.',
      `2. Implementar a solicitação "${objective}" nos arquivos: ${fileList}.`,
      '3. Ajustar estilos/comportamento conforme o padrão do projeto.',
      '4. Validar com comando curto do projeto ou inspeção manual.',
    ].join(' ')
  }

  if (isStaticLandingObjective(objective)) {
    return [
      '1. Scaffold semantic HTML in index.html with hero, services, FAQ, and contact sections.',
      '2. Implement responsive styles.css with typography and visual hierarchy.',
      '3. Add script.js only for useful interactions (smooth scroll, FAQ accordion if needed).',
      '4. Review copy, contrast, and mobile behavior before validation.',
    ].join(' ')
  }

  return [
    '1. Inspect current context and confirm affected files.',
    `2. Implement "${objective}" across: ${fileList}.`,
    '3. Align styling/behavior with project conventions.',
    '4. Validate with a short project command or manual check.',
  ].join(' ')
}

function normalizeValidations(validations: string[], locale: PlanLocale): string[] {
  const useful = validations.filter(item => item.trim() && !isGenericPlanPlaceholder(item))
  if (useful.length > 0) return useful

  return locale === 'pt-BR'
    ? ['Abrir index.html no navegador e revisar layout/responsividade']
    : ['Open index.html in a browser and review layout/responsiveness']
}

function inferRisk(files: PlanResultMessage['files'], objective: string): PlanResultMessage['risk'] {
  if (isStaticLandingObjective(objective) && files.length <= 4) return 'low'
  if (files.length > 6) return 'medium'
  return 'medium'
}

function filterContextFiles(paths: string[]): string[] {
  const unique: string[] = []
  for (const raw of paths) {
    const path = raw.replace(/\\/g, '/').replace(/^\.\/+/, '')
    if (!path || path.startsWith('.kova/') || path.includes('/node_modules/')) continue
    if (unique.includes(path)) continue
    unique.push(path)
  }
  return unique
}

function isStaticLandingObjective(objective: string): boolean {
  const normalized = objective.toLowerCase()
  return /\b(landing|site|website|pagina|página|hero|barbearia|barber|faq)\b/.test(normalized)
}
