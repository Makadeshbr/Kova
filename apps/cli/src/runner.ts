import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ExecutionEvent } from '@kova/shared'

const HARNESS_MARKER = '__KOVA_HARNESS_RESULT_V1__:'
const FULL_LOOP_MARKER = '__KOVA_FULL_LOOP_RESULT_V1__:'
const FULL_LOOP_EVENT_MARKER = '__KOVA_FULL_LOOP_EVENT_V1__:'

export interface RunnerHarnessOutput {
  passed: boolean
  score: number
  decision: string
  reason: string
  errors: Array<{ layer: string; message: string; file?: string }>
  buildCommand?: string
  lintCommand?: string
  speculative?: boolean
}

export interface RunnerFullLoopOutput {
  handled: boolean
  applied: boolean
  status: string
  reason: string
  score: number
  iterations: number
  checkpointId?: string
  decision?: string
  preview?: string
  changedFiles?: string[]
}

export interface RunFullLoopOptions {
  provider?: string
  apiKey?: string
  model?: string
  baseUrl?: string
  sessionContext?: string
  autoApply?: boolean
  onEvent?: (event: ExecutionEvent) => void
}

export async function runValidation(projectRoot: string): Promise<RunnerHarnessOutput> {
  const result = await runNode([resolveRunnerEntry(), `--project-root=${projectRoot}`], projectRoot)
  return parseMarkedJson(result.stdout, HARNESS_MARKER)
}

export async function runFullLoop(projectRoot: string, task: string, affectedFiles: string[] = [], options: RunFullLoopOptions = {}): Promise<RunnerFullLoopOutput> {
  const dir = mkdtempSync(join(tmpdir(), 'kova-cli-'))
  const taskFile = join(dir, 'task.json')
  writeFileSync(taskFile, JSON.stringify({
    objective: task,
    affectedFiles,
    maxIterations: 5,
    provider: options.provider,
    apiKey: options.apiKey,
    model: options.model,
    baseUrl: options.baseUrl,
    sessionContext: options.sessionContext,
    autoApply: options.autoApply,
  }), 'utf-8')
  try {
    const result = await runNode(
      [resolveRunnerEntry(), '--mode=full-loop', `--project-root=${projectRoot}`, `--task-file=${taskFile}`],
      projectRoot,
      line => {
        if (!line.startsWith(FULL_LOOP_EVENT_MARKER)) return
        options.onEvent?.(JSON.parse(line.slice(FULL_LOOP_EVENT_MARKER.length)) as ExecutionEvent)
      },
    )
    return parseMarkedJson(result.stdout, FULL_LOOP_MARKER)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

async function runNode(
  args: string[],
  cwd: string,
  onStdoutLine?: (line: string) => void,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, env: process.env, shell: false })
    let stdout = ''
    let stderr = ''
    let pending = ''

    child.stdout.on('data', chunk => {
      const text = String(chunk)
      stdout += text
      pending += text
      const lines = pending.split(/\r?\n/)
      pending = lines.pop() ?? ''
      for (const line of lines) onStdoutLine?.(line)
    })
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    child.on('error', reject)
    child.on('close', code => {
      if (pending) onStdoutLine?.(pending)
      resolve({ stdout, stderr, code: code ?? 0 })
    })
  })
}

function parseMarkedJson<T>(stdout: string, marker: string): T {
  const line = stdout.split(/\r?\n/).find(item => item.trimStart().startsWith(marker))
  if (!line) {
    throw new Error(`Runner output missing marker ${marker}`)
  }
  return JSON.parse(line.slice(line.indexOf(marker) + marker.length)) as T
}

function resolveRunnerEntry(): string {
  try {
    const packageEntry = fileURLToPath(import.meta.resolve('@kova/kova-runner'))
    return packageEntry.endsWith('dist/index.js')
      ? packageEntry
      : join(dirname(packageEntry), 'index.js')
  } catch {
    const local = findLocalRunner(dirname(fileURLToPath(import.meta.url)))
    if (local) return local
    throw new Error('Unable to resolve @kova/kova-runner. Build packages/kova-runner or install CLI dependencies.')
  }
}

function findLocalRunner(start: string): string | null {
  let current = start
  for (let i = 0; i < 8; i++) {
    const candidate = join(current, 'packages', 'kova-runner', 'dist', 'index.js')
    if (existsSync(candidate)) return candidate
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
  return null
}
