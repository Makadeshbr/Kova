import type { AgentMessage, TaskDefinition } from '@kova/shared'

export interface TaskStructuringLLM {
  generate(messages: AgentMessage[], options?: { system?: string; maxTokens?: number }): Promise<{ thought: string }>
}

export interface TaskStructuringProject {
  id?: string
  root: string
  stackAdapter: string
  affectedFiles: string[]
  context?: string
  llm: TaskStructuringLLM
}

export type TaskStructuringResult =
  | { valid: true; task: TaskDefinition }
  | { valid: false; reason: string; suggestions: string[] }

interface LLMTaskJson {
  objective: unknown
  constraints: unknown
  nonGoals: unknown
  validationCriteria: unknown
  type: unknown
  impact: unknown
}

const VALID_TYPES = ['feature', 'bugfix', 'refactor', 'test', 'docs'] as const
const VALID_IMPACTS = ['low', 'medium', 'high'] as const

export async function structureTask(
  input: string,
  project: TaskStructuringProject,
): Promise<TaskStructuringResult> {
  if (isVagueInput(input)) {
    return invalid('input_vago', vagueSuggestions(project))
  }

  const first = await requestJson(project.llm, buildMessages(input, project))
  const parsed = parseTaskJson(first.thought)
  const task = parsed ? buildTask(parsed, input, project) : null
  if (task) return validateTask(task)

  const retry = await requestJson(project.llm, repairMessages(input, first.thought))
  const repaired = parseTaskJson(retry.thought)
  const repairedTask = repaired ? buildTask(repaired, input, project) : null
  if (repairedTask) return validateTask(repairedTask)

  return invalid('JSON malformado: failed_to_structure', [])
}

function buildMessages(input: string, project: TaskStructuringProject): AgentMessage[] {
  return [{
    role: 'user',
    content: [
      `User input: ${input}`,
      `Project root: ${project.root}`,
      `Stack: ${project.stackAdapter}`,
      `Affected files: ${project.affectedFiles.join(', ') || 'unknown'}`,
      project.context ? `Context:\n${project.context}` : '',
      'Return only JSON.',
    ].filter(Boolean).join('\n'),
  }]
}

function repairMessages(input: string, previous: string): AgentMessage[] {
  return [{
    role: 'user',
    content: [
      'The previous response was not valid task JSON.',
      `User input: ${input}`,
      `Previous response:\n${previous}`,
      'Return only valid JSON with objective, constraints, nonGoals, validationCriteria, type and impact.',
    ].join('\n'),
  }]
}

async function requestJson(
  llm: TaskStructuringLLM,
  messages: AgentMessage[],
): Promise<{ thought: string }> {
  return llm.generate(messages, { system: systemPrompt(), maxTokens: 1200 })
}

function systemPrompt(): string {
  return [
    'You are Kova Task Structuring Layer.',
    'Convert the user request into a JSON object for an autonomous coding agent.',
    'Schema: {"objective": string, "constraints": string[], "nonGoals": string[], "validationCriteria": string[], "type": "feature"|"bugfix"|"refactor"|"test"|"docs", "impact": "low"|"medium"|"high"}',
    'Respond ONLY with the JSON object. No markdown, no explanation.',
    'If uncertain about any field, use sensible defaults.',
  ].join(' ')
}

function parseTaskJson(raw: string): LLMTaskJson | null {
  const json = extractJson(raw)
  if (!json) return null
  try {
    const parsed = JSON.parse(json) as LLMTaskJson
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function extractJson(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match?.[1]?.trim()) return match[1].trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : null
}

function buildTask(
  parsed: LLMTaskJson,
  input: string,
  project: TaskStructuringProject,
): TaskDefinition | null {
  if (typeof parsed.objective !== 'string') return null
  if (!isStringArray(parsed.validationCriteria)) return null

  return {
    id: project.id ?? `task-${Date.now()}`,
    objective: parsed.objective.trim(),
    constraints: toStringArray(parsed.constraints),
    nonGoals: toStringArray(parsed.nonGoals),
    validationCriteria: parsed.validationCriteria.map(v => v.trim()).filter(Boolean),
    type: pickType(parsed.type),
    impact: inferImpact(input, parsed, project),
    affectedFiles: project.affectedFiles,
    stackAdapter: project.stackAdapter,
  }
}

function validateTask(task: TaskDefinition): TaskStructuringResult {
  if (!task.objective || task.objective.length < 10) {
    return invalid('Objetivo insuficiente', ['Inclua o resultado esperado da mudança.'])
  }
  if (task.validationCriteria.length === 0) {
    return invalid('Critérios ausentes', ['Inclua pelo menos um critério verificável de validação.'])
  }
  return { valid: true, task }
}

function inferImpact(
  input: string,
  parsed: LLMTaskJson,
  project: TaskStructuringProject,
): TaskDefinition['impact'] {
  const text = `${input} ${parsed.objective} ${project.affectedFiles.join(' ')}`.toLowerCase()
  if (isDocsTask(text, parsed)) return 'low'
  if (/(auth|login|senha|password|token|secret|security|seguran)/.test(text)) return 'high'
  return VALID_IMPACTS.includes(parsed.impact as TaskDefinition['impact'])
    ? parsed.impact as TaskDefinition['impact']
    : 'medium'
}

function isDocsTask(text: string, parsed: LLMTaskJson): boolean {
  return parsed.type === 'docs' || /(docs|documenta|readme|coment[aá]rio|markdown)/.test(text)
}

function isVagueInput(input: string): boolean {
  const words = input.trim().split(/\s+/).filter(Boolean)
  if (words.length < 3) return true
  return /^(melhore|ajuste|arrume|fa[cç]a|resolver|fix|improve)$/i.test(input.trim())
}

function vagueSuggestions(project: TaskStructuringProject): string[] {
  const file = project.affectedFiles[0] ? ` em ${project.affectedFiles[0]}` : ''
  return [`Descreva o objetivo concreto${file} e como validar o resultado.`]
}

function invalid(reason: string, suggestions: string[]): TaskStructuringResult {
  return { valid: false, reason, suggestions }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === 'string')
}

function toStringArray(value: unknown): string[] {
  return isStringArray(value) ? value.map(v => v.trim()).filter(Boolean) : []
}

function pickType(value: unknown): TaskDefinition['type'] {
  return VALID_TYPES.includes(value as TaskDefinition['type'])
    ? value as TaskDefinition['type']
    : 'feature'
}
