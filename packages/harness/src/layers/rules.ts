import { join, extname } from 'node:path'
import type { LayerResult, HarnessError, HarnessWarning, FileChange, RuleProfile } from '@kova/shared'
import { parseTsFile, getFunctionViolations } from './ast-utils'

export interface RulesLayerConfig {
  changes: FileChange[]
  projectRoot: string
  adapter?: string
  profile?: Partial<RuleProfile>
}

interface ForbiddenRule {
  pattern: RegExp
  message: string
  severity: HarnessError['severity']
  adapters?: string[]
}

const FORBIDDEN: ForbiddenRule[] = [
  { pattern: /:\s*any\b/, message: "Uso de 'any' viola tipagem estrita", severity: 'high', adapters: ['typescript'] },
  { pattern: /^export default\b/, message: 'Default export proibido — use named exports', severity: 'medium', adapters: ['typescript'] },
  { pattern: /catch\s*\(\w*\)\s*\{\s*\}/, message: 'Catch silencioso proibido', severity: 'high', adapters: ['typescript', 'javascript'] },
]

const UI_EXTS = new Set(['.tsx', '.jsx', '.vue', '.css', '.scss'])

function buildProfile(filePath: string, override?: Partial<RuleProfile>): RuleProfile {
  const isUI = UI_EXTS.has(extname(filePath))
  return {
    fileType: isUI ? 'ui' : 'logic',
    functionSizeLimit: isUI ? 80 : 40,
    fileSizeLimit: isUI ? 400 : 200,
    nestingLimit: isUI ? 4 : 2,
    cyclomaticLimit: isUI ? 15 : 10,
    enforceNaming: !isUI,
    ...override,
  }
}

export async function runRulesLayer(
  config: RulesLayerConfig,
  _rulesContent: string,
): Promise<LayerResult> {
  const errors: HarnessError[] = []
  const warnings: HarnessWarning[] = []

  for (const change of config.changes) {
    if (change.type === 'delete') continue

    // Forbidden patterns — verifica apenas linhas adicionadas no diff
    const added = extractAddedLines(change.diff)
    errors.push(...checkForbidden(added, change.path, config.adapter))

    // AST analysis — lê arquivo do disco (harness roda após aplicação)
    if (isTsFile(change.path)) {
      const profile = buildProfile(change.path, config.profile)
      const sf = parseTsFile(join(config.projectRoot, change.path))
      if (sf) {
        errors.push(...getFunctionViolations(sf, change.path, profile))
      }
    }
  }

  return { name: 'rules', passed: errors.length === 0, errors, warnings, duration: 0, skipped: false }
}

function isTsFile(path: string): boolean {
  return ['.ts', '.tsx'].includes(extname(path))
}

function extractAddedLines(diff: string): string[] {
  return diff.split('\n')
    .filter(l => l.startsWith('+') && !l.startsWith('+++'))
    .map(l => l.slice(1))
}

function checkForbidden(lines: string[], file: string, adapter?: string): HarnessError[] {
  const errors: HarnessError[] = []
  const active = FORBIDDEN.filter(r => !r.adapters || !adapter || r.adapters.includes(adapter))
  for (const [idx, line] of lines.entries()) {
    for (const rule of active) {
      if (rule.pattern.test(line)) {
        errors.push({
          layer: 'rules', type: 'architecture', severity: rule.severity,
          fixable: false, message: rule.message, humanMessage: rule.message,
          file, line: idx + 1,
        })
      }
    }
  }
  return errors
}
