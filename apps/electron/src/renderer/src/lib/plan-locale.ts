export type PlanLocale = 'pt-BR' | 'en'

export function detectPlanLocale(text: string): PlanLocale {
  if (/[áàâãéêíóôõúç]/i.test(text)) return 'pt-BR'
  const normalized = text.toLowerCase()
  if (/\b(crie|criar|implemente|landing|pagina|página|barbearia|secao|seção|faq|localizacao|localização)\b/.test(normalized)) {
    return 'pt-BR'
  }
  return 'en'
}

export function planCardLabels(locale: PlanLocale): {
  title: string
  objective: string
  files: string
  steps: string
  validation: string
  risk: string
  footer: string
  riskLabel: (risk: 'low' | 'medium' | 'high') => string
} {
  if (locale === 'pt-BR') {
    return {
      title: 'Plano de implementação',
      objective: 'Objetivo',
      files: 'Arquivos afetados',
      steps: 'Passos',
      validation: 'Validação',
      risk: 'Risco',
      footer: "Plano gerado (somente leitura). Envie 'implemente' ou faça um pedido direto para executar.",
      riskLabel: risk => ({ low: 'baixo', medium: 'médio', high: 'alto' })[risk],
    }
  }
  return {
    title: 'Implementation plan',
    objective: 'Objective',
    files: 'Affected files',
    steps: 'Steps',
    validation: 'Validation',
    risk: 'Risk',
    footer: "Plan generated (read-only). Send 'implement' or make a direct request to execute.",
    riskLabel: risk => risk,
  }
}
