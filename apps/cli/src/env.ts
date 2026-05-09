import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export function loadProjectEnv(projectRoot: string): void {
  for (const file of ['.env', '.env.local']) {
    loadEnvFile(join(projectRoot, file))
  }
}

function loadEnvFile(file: string): void {
  if (!existsSync(file)) return
  const lines = readFileSync(file, 'utf-8').split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key] !== undefined) continue
    process.env[key] = unquote(rawValue.trim())
  }
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}
