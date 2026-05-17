import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { normalizeCommandInvocation, runCommandInvocation } from '@kova/shared'
import { runTestsLayer } from '../src/layers/tests'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'kova-command-runner-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('safe command normalization', () => {
  it('converts "cd app && command" into structured cwd', () => {
    mkdirSync(join(root, 'app'))
    writeFileSync(join(root, 'app', 'go.mod'), 'module example.com/app\n', 'utf-8')

    const result = normalizeCommandInvocation({
      command: 'cd app && go test ./... -v',
      workspaceRoot: root,
      kind: 'test',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.command).toBe('go test ./... -v')
      expect(result.cwd).toBe(join(root, 'app'))
    }
  })

  it('converts "cd app; command" into structured cwd', () => {
    mkdirSync(join(root, 'app'))
    writeFileSync(join(root, 'app', 'package.json'), '{"scripts":{"test":"node --version"}}', 'utf-8')

    const result = normalizeCommandInvocation({
      command: 'cd app; npm run test',
      workspaceRoot: root,
      kind: 'test',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.command).toBe('npm run test')
      expect(result.cwd).toBe(join(root, 'app'))
    }
  })

  it('blocks cwd outside the workspace', () => {
    const result = normalizeCommandInvocation({
      command: 'node --version',
      workspaceRoot: root,
      cwd: '..',
      kind: 'test',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('outside the allowed workspace')
  })

  it('blocks path traversal through cd', () => {
    const result = normalizeCommandInvocation({
      command: 'cd ../outside && node --version',
      workspaceRoot: root,
      kind: 'test',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('outside the allowed workspace')
  })

  it('blocks arbitrary pipe and redirection', () => {
    const pipe = normalizeCommandInvocation({ command: 'node --version | cat', workspaceRoot: root, kind: 'test' })
    const redirect = normalizeCommandInvocation({ command: 'node --version > out.txt', workspaceRoot: root, kind: 'test' })

    expect(pipe.ok).toBe(false)
    expect(redirect.ok).toBe(false)
  })

  it('keeps dangerous commands blocked', () => {
    const result = normalizeCommandInvocation({ command: 'rm -rf /', workspaceRoot: root, kind: 'test' })
    expect(result.ok).toBe(false)
  })

  it('fails manifest-required validation with a clear message', () => {
    const result = normalizeCommandInvocation({ command: 'go test ./... -v', workspaceRoot: root, kind: 'test' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('manifest/build file')
  })
})

// ─── manifest validation: bootstrap subcommands + staged buffer awareness ───

describe('manifest validation — bootstrap subcommands (init/new) bypass the check', () => {
  it('allows "npm init -y" in an empty folder (creates the manifest itself)', () => {
    const result = normalizeCommandInvocation({ command: 'npm init -y', workspaceRoot: root, kind: 'run' })
    expect(result.ok).toBe(true)
  })

  it('allows "pnpm init" in an empty folder', () => {
    const result = normalizeCommandInvocation({ command: 'pnpm init', workspaceRoot: root, kind: 'run' })
    expect(result.ok).toBe(true)
  })

  it('allows "yarn init -y" in an empty folder', () => {
    const result = normalizeCommandInvocation({ command: 'yarn init -y', workspaceRoot: root, kind: 'run' })
    expect(result.ok).toBe(true)
  })

  it('allows "bun init -y" in an empty folder', () => {
    const result = normalizeCommandInvocation({ command: 'bun init -y', workspaceRoot: root, kind: 'run' })
    expect(result.ok).toBe(true)
  })

  it('allows "cargo init" in an empty folder', () => {
    const result = normalizeCommandInvocation({ command: 'cargo init', workspaceRoot: root, kind: 'run' })
    expect(result.ok).toBe(true)
  })

  it('allows "cargo new my-app" in an empty folder', () => {
    const result = normalizeCommandInvocation({ command: 'cargo new my-app', workspaceRoot: root, kind: 'run' })
    expect(result.ok).toBe(true)
  })

  it('allows "go mod init example.com/app" in an empty folder', () => {
    const result = normalizeCommandInvocation({ command: 'go mod init example.com/app', workspaceRoot: root, kind: 'run' })
    expect(result.ok).toBe(true)
  })

  it('allows "dotnet new console" in an empty folder', () => {
    const result = normalizeCommandInvocation({ command: 'dotnet new console', workspaceRoot: root, kind: 'run' })
    expect(result.ok).toBe(true)
  })

  it('still blocks "npm test" without a manifest', () => {
    const result = normalizeCommandInvocation({ command: 'npm test', workspaceRoot: root, kind: 'test' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain('manifest/build file')
  })

  it('still blocks "go test ./..." without a manifest', () => {
    const result = normalizeCommandInvocation({ command: 'go test ./...', workspaceRoot: root, kind: 'test' })
    expect(result.ok).toBe(false)
  })
})

describe('manifest validation — additionalManifests (staged buffer aware)', () => {
  it('passes when the agent staged package.json in the same iteration (additionalManifests)', () => {
    const result = normalizeCommandInvocation({
      command: 'npm install',
      workspaceRoot: root,
      kind: 'run',
      additionalManifests: ['package.json'],
    })
    expect(result.ok).toBe(true)
  })

  it('passes when staged manifest is in the resolved cwd subfolder', () => {
    mkdirSync(join(root, 'app'))
    const result = normalizeCommandInvocation({
      command: 'cd app && pnpm test',
      workspaceRoot: root,
      kind: 'test',
      additionalManifests: ['app/package.json'],
    })
    expect(result.ok).toBe(true)
  })

  it('also accepts go.mod / Cargo.toml / pyproject.toml from staged buffer', () => {
    expect(normalizeCommandInvocation({
      command: 'go test ./...', workspaceRoot: root, kind: 'test',
      additionalManifests: ['go.mod'],
    }).ok).toBe(true)
    expect(normalizeCommandInvocation({
      command: 'cargo test', workspaceRoot: root, kind: 'test',
      additionalManifests: ['Cargo.toml'],
    }).ok).toBe(true)
    expect(normalizeCommandInvocation({
      command: 'poetry install', workspaceRoot: root, kind: 'run',
      additionalManifests: ['pyproject.toml'],
    }).ok).toBe(true)
  })

  it('still blocks when additionalManifests is empty and disk has no manifest', () => {
    const result = normalizeCommandInvocation({
      command: 'npm test',
      workspaceRoot: root,
      kind: 'test',
      additionalManifests: [],
    })
    expect(result.ok).toBe(false)
  })

  it('still blocks when additionalManifests lists irrelevant files', () => {
    const result = normalizeCommandInvocation({
      command: 'npm test',
      workspaceRoot: root,
      kind: 'test',
      additionalManifests: ['src/index.ts', 'README.md'],
    })
    expect(result.ok).toBe(false)
  })
})

describe('structured command execution', () => {
  it('captures stdout and stderr separately', async () => {
    const result = await runCommandInvocation({
      command: 'node -e "console.log(\'out\'); console.error(\'err\')"',
      workspaceRoot: root,
      kind: 'test',
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout.trim()).toBe('out')
    expect(result.stderr.trim()).toBe('err')
  })

  it('runs tests in the requested cwd', async () => {
    mkdirSync(join(root, 'app'))
    writeFileSync(join(root, 'app', 'check-cwd.js'), 'console.log(process.cwd())', 'utf-8')

    const result = await runTestsLayer({
      command: 'node check-cwd.js',
      projectRoot: root,
      cwd: 'app',
    })

    expect(result.passed).toBe(true)
    expect(result.cwd).toBe(join(root, 'app'))
    expect(result.stdout?.trim()).toBe(join(root, 'app'))
  })
})
