import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildProjectProfile,
  findProjectRoot,
  loadHarnessProjectConfig,
  loadProjectInstructions,
} from '../src/project-scanner'

let tmp: string | null = null

function setup(files: Record<string, string>): string {
  tmp = mkdtempSync(join(tmpdir(), 'kova-project-'))
  for (const [path, content] of Object.entries(files)) {
    const full = join(tmp, path)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, content, 'utf-8')
  }
  return tmp
}

afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true })
  tmp = null
})

describe('buildProjectProfile', () => {
  it('detects a multi-stack project with command candidates', () => {
    const root = setup({
      'package.json': JSON.stringify({
        workspaces: ['apps/*', 'packages/*'],
        scripts: { build: 'tsc', test: 'vitest run', lint: 'eslint .' },
        dependencies: { react: '^19.0.0' },
      }),
      'pnpm-lock.yaml': '',
      'apps/web/package.json': JSON.stringify({
        name: '@demo/web',
        scripts: { build: 'vite build', test: 'vitest run', typecheck: 'tsc --noEmit' },
      }),
      '.github/workflows/ci.yml': 'name: ci',
      'Dockerfile': 'FROM node:20',
      'Makefile': 'test:\n\tgo test ./...',
      '.env': 'SECRET=real',
      'go.mod': 'module example.com/api',
      'cmd/api/main.go': 'package main',
      'src/main.ts': 'export const ok = true',
    })

    const profile = buildProjectProfile(root)

    expect(profile.languages.map(item => item.name)).toContain('go')
    expect(profile.languages.map(item => item.name)).toContain('typescript')
    expect(profile.packageManagers[0].name).toBe('pnpm')
    expect(profile.frameworks.map(item => item.name)).toContain('react')
    expect(profile.buildCommands.map(item => item.command)).toContain('pnpm run build')
    expect(profile.buildCommands.map(item => item.command)).toContain('pnpm --dir apps/web run build')
    expect(profile.testCommands.map(item => item.command)).toContain('go test ./...')
    expect(profile.workspaces.map(item => item.path)).toContain('apps/web')
    expect(profile.validations.some(item => item.kind === 'typecheck' && item.scope === 'apps/web')).toBe(true)
    expect(profile.ci.map(item => item.path)).toContain('.github/workflows/ci.yml')
    expect(profile.containers.map(item => item.path)).toContain('Dockerfile')
    expect(profile.taskRunners.map(item => item.path)).toContain('Makefile')
    expect(profile.sensitiveFiles.map(item => item.path)).toContain('.env')
    expect(profile.risks.map(item => item.kind)).toContain('sensitive_files')
    expect(profile.entrypoints).toContain('cmd/api/main.go')
    expect(profile.confidence).toBeGreaterThan(0.5)
  })
})

describe('loadProjectInstructions', () => {
  it('loads KOVA, AGENTS, CLAUDE, RULES and .kova/rules in priority order', () => {
    const root = setup({
      'KOVA.md': 'kova',
      'AGENTS.md': 'agents',
      'CLAUDE.md': 'claude',
      'RULES.md': 'rules',
      '.kova/rules/security.md': 'security',
    })

    const instructions = loadProjectInstructions(root)

    expect(instructions.map(item => item.path)).toEqual([
      'KOVA.md',
      'AGENTS.md',
      'CLAUDE.md',
      'RULES.md',
      '.kova/rules/security.md',
    ])
  })
})

describe('findProjectRoot', () => {
  it('walks up until it finds a project marker', () => {
    const root = setup({ 'go.mod': 'module x', 'nested/app/main.go': 'package main' })

    expect(findProjectRoot(join(root, 'nested', 'app'))).toBe(root)
  })
})

describe('loadHarnessProjectConfig', () => {
  it('loads .kova/harness.json when present', () => {
    const root = setup({
      '.kova/harness.json': JSON.stringify({
        validation: { build: ['make build'], test: 'auto' },
        policy: { requireRealValidationForAutoApply: true },
      }),
    })

    expect(loadHarnessProjectConfig(root)?.validation?.build).toEqual(['make build'])
  })
})
