export const EXT_COLOR: Record<string, string> = {
  go: '#00ADD8', ts: '#3178C6', tsx: '#61DAFB', js: '#F7DF1E', jsx: '#61DAFB',
  py: '#3776AB', rs: '#CE422B', java: '#ED8B00', cs: '#239120', rb: '#CC342D',
  php: '#777BB4', swift: '#FA7343', kt: '#7F52FF', cpp: '#004283', c: '#A8B9CC',
  json: '#5DCAA5', yaml: '#E5C07B', yml: '#E5C07B', toml: '#9C4121',
  md: '#7F77DD', html: '#E44D26', css: '#264DE4', sh: '#89E051', bash: '#89E051',
  mod: '#00ADD8', sum: '#00ADD8', sql: '#CC2927', lock: '#5DCAA5',
}

export const EXT_LANG: Record<string, string> = {
  go: 'Go', ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
  py: 'Python', rs: 'Rust', java: 'Java', cs: 'C#', rb: 'Ruby',
  php: 'PHP', swift: 'Swift', kt: 'Kotlin', cpp: 'C++', c: 'C',
  json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML',
  md: 'Markdown', html: 'HTML', css: 'CSS', sh: 'Shell', bash: 'Shell',
  sql: 'SQL', mod: 'Go mod', sum: 'Go sum', lock: 'Lockfile',
}

const SPECIAL_FILES: Record<string, { label: string; color: string }> = {
  dockerfile: { label: 'DOC', color: '#2496ED' },
  makefile: { label: 'MK', color: '#427819' },
  '.gitignore': { label: 'GIT', color: '#F05032' },
  '.gitattributes': { label: 'GIT', color: '#F05032' },
  '.env': { label: 'ENV', color: '#89E051' },
  '.envrc': { label: 'ENV', color: '#89E051' },
  'cargo.toml': { label: 'CARG', color: '#CE422B' },
  'cargo.lock': { label: 'LOCK', color: '#CE422B' },
  'go.sum': { label: 'SUM', color: '#00ADD8' },
  'package.json': { label: 'PKG', color: '#F7DF1E' },
  'tsconfig.json': { label: 'TSC', color: '#3178C6' },
}

export function fileIconInfo(name: string): { label: string; color: string } {
  const lower = name.toLowerCase()
  const special = SPECIAL_FILES[lower]
  if (special) return special
  if (lower.startsWith('.env')) return { label: 'ENV', color: '#89E051' }
  const e = lower.split('.').at(-1) ?? ''
  if (!e || e === lower) return { label: '?', color: 'var(--text-3)' }
  return {
    label: e.toUpperCase().slice(0, 3),
    color: EXT_COLOR[e] ?? 'var(--text-3)',
  }
}

export function getExt(path: string): string {
  const name = path.replace(/\\/g, '/').split('/').at(-1) ?? ''
  return name.split('.').at(-1)?.toLowerCase() ?? ''
}

export function getFileName(path: string): string {
  return path.replace(/\\/g, '/').split('/').at(-1) ?? path
}

export function getFolder(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : ''
}
