import { execFileSync } from 'node:child_process'

export function stagedFiles(cwd: string): string[] {
  try {
    const output = execFileSync('git', ['diff', '--name-only', '--cached'], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return output.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  } catch {
    return []
  }
}
