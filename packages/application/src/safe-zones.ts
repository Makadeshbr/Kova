export interface SafeZoneConfig {
  patterns: string[]
  allowOverride: boolean
}

// Safe zones: secrets and lock files that should never be auto-modified by the agent.
// Keep this list minimal — overly broad safe zones break legitimate agent workflows.
const DEFAULT_PATTERNS = [
  // Secrets — never touch
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  '*.cert',
  '*.p12',
  '*.pfx',
  // Lock files — managed by package managers, not by hand
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'Cargo.lock',
  'poetry.lock',
  'Gemfile.lock',
  'composer.lock',
  'go.sum',
  // CI/CD pipelines — high-risk changes
  '.github/**',
]

export function isSafeZone(filePath: string, config?: Partial<SafeZoneConfig>): boolean {
  const patterns = config?.patterns ?? DEFAULT_PATTERNS
  const normalized = filePath.replace(/\\/g, '/')
  return patterns.some(pattern => matchGlob(normalized, pattern))
}

function matchGlob(filePath: string, pattern: string): boolean {
  if (filePath === pattern) return true

  // Escape regex special chars except * (handled as glob)
  const regexStr = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\x00')      // placeholder for **
    .replace(/\*/g, '[^/]+')       // * = one path segment
    .replace(/\x00/g, '.+')        // ** = any depth

  try {
    return new RegExp(`^${regexStr}$`).test(filePath)
  } catch {
    return false
  }
}
