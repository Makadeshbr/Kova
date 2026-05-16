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
  it('classifies an empty project without inventing a stack or commands', () => {
    const root = setup({})

    const profile = buildProjectProfile(root)

    expect(profile.projectKind).toBe('empty')
    expect(profile.traits).toContain('no_validation')
    expect(profile.languages).toEqual([])
    expect(profile.validations).toEqual([])
    expect(profile.observations).toContain('Project is empty; no stack or validation command was inferred.')
    expect(profile.risks.map(item => item.kind)).toContain('no_validation')
  })

  it('keeps a generic project useful when no known stack is detected', () => {
    const root = setup({
      'docs/notes.txt': 'manual process',
      'README.md': 'Run `make test` before shipping.',
    })

    const profile = buildProjectProfile(root)

    expect(profile.projectKind).toBe('generic_unknown')
    expect(profile.traits).toEqual(expect.arrayContaining(['has_validation', 'partial_validation']))
    expect(profile.languages).toEqual([])
    expect(profile.testCommands).toEqual([
      expect.objectContaining({ command: 'make test', source: 'readme', safeToRun: true }),
    ])
    expect(profile.validations).toEqual([
      expect.objectContaining({ kind: 'test', command: 'make test', source: 'readme' }),
    ])
  })

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
      '.github/workflows/ci.yml': 'name: ci\njobs:\n  test:\n    steps:\n      - run: go test ./cmd/api',
      'Dockerfile': 'FROM node:20',
      'Makefile': 'test:\n\tgo test ./...\nlint:\n\tgo vet ./...',
      '.env': 'SECRET=real',
      'go.mod': 'module example.com/api',
      'cmd/api/main.go': 'package main',
      'src/main.ts': 'export const ok = true',
    })

    const profile = buildProjectProfile(root)

    expect(profile.projectKind).toBe('monorepo')
    expect(profile.traits).toEqual(expect.arrayContaining([
      'multi_stack',
      'has_ci',
      'has_containers',
      'has_task_runners',
      'has_sensitive_files',
      'has_validation',
    ]))
    expect(profile.languages.map(item => item.name)).toContain('go')
    expect(profile.languages.map(item => item.name)).toContain('typescript')
    expect(profile.packageManagers[0].name).toBe('pnpm')
    expect(profile.frameworks.map(item => item.name)).toContain('react')
    expect(profile.buildCommands.map(item => item.command)).toContain('pnpm run build')
    expect(profile.buildCommands.map(item => item.command)).toContain('pnpm --dir apps/web run build')
    expect(profile.testCommands.map(item => item.command)).toContain('go test ./...')
    expect(profile.testCommands.some(item => item.command === 'go test ./cmd/api' && item.source === 'ci')).toBe(true)
    expect(profile.lintCommands.map(item => item.command)).toContain('make lint')
    expect(profile.workspaces.map(item => item.path)).toContain('apps/web')
    expect(profile.validations.some(item => item.kind === 'typecheck' && item.scope === 'apps/web')).toBe(true)
    expect(profile.ci.map(item => item.path)).toContain('.github/workflows/ci.yml')
    expect(profile.containers.map(item => item.path)).toContain('Dockerfile')
    expect(profile.taskRunners.map(item => item.path)).toContain('Makefile')
    expect(profile.sensitiveFiles.map(item => item.path)).toContain('.env')
    expect(profile.risks.map(item => item.kind)).toContain('sensitive_files')
    expect(profile.risks.map(item => item.kind)).toContain('multi_stack')
    expect(profile.observations).toContain('CI configuration detected.')
    expect(profile.observations).toContain('Container configuration detected.')
    expect(profile.entrypoints).toContain('cmd/api/main.go')
    expect(profile.confidence).toBeGreaterThan(0.5)
  })

  it('detects task runner commands without treating them as executed validation', () => {
    const root = setup({
      'Taskfile.yml': 'version: "3"\ntasks:\n  build:\n    cmds: ["echo build"]\n  typecheck:\n    cmds: ["echo check"]',
      'justfile': 'test:\n  echo test\nlint:\n  echo lint',
    })

    const profile = buildProjectProfile(root)

    expect(profile.projectKind).toBe('generic_unknown')
    expect(profile.traits).toEqual(expect.arrayContaining(['has_task_runners', 'has_validation']))
    expect(profile.buildCommands).toContainEqual(expect.objectContaining({ command: 'task build', source: 'taskfile' }))
    expect(profile.typecheckCommands).toContainEqual(expect.objectContaining({ command: 'task typecheck', source: 'taskfile' }))
    expect(profile.testCommands).toContainEqual(expect.objectContaining({ command: 'just test', source: 'taskfile' }))
    expect(profile.lintCommands).toContainEqual(expect.objectContaining({ command: 'just lint', source: 'taskfile' }))
    expect(profile.validations.every(item => item.available)).toBe(true)
  })

  it('detects sensitive files but ignores env examples', () => {
    const root = setup({
      '.env': 'TOKEN=real',
      '.env.local': 'TOKEN=real',
      '.env.example': 'TOKEN=example',
      'deploy/secret.key': 'real',
    })

    const profile = buildProjectProfile(root)

    expect(profile.sensitiveFiles.map(item => item.path)).toEqual([
      '.env',
      '.env.local',
      'deploy/secret.key',
    ])
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
