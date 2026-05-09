import { basename } from 'node:path'
import type { RuleProfile } from '@kova/shared'

const LOGIC: RuleProfile = {
  fileType: 'logic',
  functionSizeLimit: 40,
  fileSizeLimit: 200,
  nestingLimit: 2,
  cyclomaticLimit: 10,
  enforceNaming: true,
}

const UI: RuleProfile = {
  fileType: 'ui',
  functionSizeLimit: 80,
  fileSizeLimit: 400,
  nestingLimit: 4,
  cyclomaticLimit: 15,
  enforceNaming: false,
}

const TEST: RuleProfile = {
  fileType: 'test',
  functionSizeLimit: 60,
  fileSizeLimit: 300,
  nestingLimit: 3,
  cyclomaticLimit: 8,
  enforceNaming: false,
}

const CONFIG: RuleProfile = {
  fileType: 'config',
  functionSizeLimit: 100,
  fileSizeLimit: 500,
  nestingLimit: 5,
  cyclomaticLimit: 20,
  enforceNaming: false,
}

export function detectContext(filePath: string): RuleProfile {
  if (isTestFile(filePath)) return TEST
  if (isConfigFile(filePath)) return CONFIG
  if (isUIFile(filePath)) return UI
  return LOGIC
}

function isTestFile(path: string): boolean {
  return /\.(test|spec)\.[tj]sx?$/.test(path) || /__tests__[/\\]/.test(path)
}

function isConfigFile(path: string): boolean {
  const base = basename(path)
  return /\.(config)\.[cm]?[tj]sx?$/.test(path) ||
    /^\.env/.test(base) ||
    base === 'package.json' ||
    base === 'tsconfig.json'
}

function isUIFile(path: string): boolean {
  return /\.(tsx|jsx|vue|css|scss|less|html)$/.test(path)
}
