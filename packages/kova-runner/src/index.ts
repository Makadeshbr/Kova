#!/usr/bin/env node
/**
 * Kova Runner — processo Node.js dedicado invocado pela IDE.
 *
 * Modo normal:  node dist/index.js --project-root="/path"
 * Speculative:  node dist/index.js --project-root="/path"
 *                                  --target-file="/path/to/file.ts"
 *                                  --proposed-file="/path/to/.kova/preview/file.ts"
 *
 * No modo Speculative:
 *   1. Salva conteúdo original do arquivo target
 *   2. Substitui pelo conteúdo proposto (temporário)
 *   3. Constrói FileChange[] real para rules/security analisarem o diff
 *   4. Roda harness pipeline completo
 *   5. SEMPRE restaura o original (try/finally)
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { detectStack, resolveCommands } from '@kova/adapters'
import { HarnessOrchestrator, createOrchestratorConfig } from '@kova/orchestrator'
import { decide, calculateScore } from '@kova/decision'
import type { HarnessError, FileChange } from '@kova/shared'
import { buildGraphOutput } from './graph-output'
import { runFullLoop, type FullLoopOutput, type FullLoopRequest } from './full-loop'

// Deve ser idêntico ao marker em kovaHarnessService.ts
const RESULT_MARKER = '__KOVA_HARNESS_RESULT_V1__:'
const GRAPH_RESULT_MARKER = '__KOVA_GRAPH_RESULT_V1__:'
const FULL_LOOP_RESULT_MARKER = '__KOVA_FULL_LOOP_RESULT_V1__:'
const FULL_LOOP_EVENT_MARKER = '__KOVA_FULL_LOOP_EVENT_V1__:'

interface RunnerArgs {
  projectRoot: string
  targetFile?: string
  proposedFile?: string
  taskFile?: string
  mode: 'validate' | 'graph' | 'full-loop'
}

interface SpeculativeState {
  originalContent: string
  proposedContent: string
}

interface RunnerOutput {
  passed: boolean
  score: number
  decision: 'auto_apply' | 'suggest' | 'reject' | 'human_required'
  reason: string
  errors: HarnessError[]
  buildCommand: string
  lintCommand: string
  speculative: boolean
}

function parseArgs(): RunnerArgs {
  const get = (flag: string) => process.argv.find(a => a.startsWith(`${flag}=`))?.replace(`${flag}=`, '')
  const projectRoot = get('--project-root')
  if (!projectRoot) {
    process.stderr.write('kova-runner: --project-root obrigatório\n')
    process.exit(2)
  }
  const modeArg = get('--mode')
  const mode = modeArg === 'graph' || modeArg === 'full-loop' ? modeArg : 'validate'
  return { projectRoot, targetFile: get('--target-file'), proposedFile: get('--proposed-file'), taskFile: get('--task-file'), mode }
}

function applySpeculative(targetFile: string, proposedFile: string): SpeculativeState | null {
  if (!existsSync(proposedFile) || !existsSync(targetFile)) return null
  const originalContent = readFileSync(targetFile, 'utf-8')
  const proposedContent = readFileSync(proposedFile, 'utf-8')
  mkdirSync(dirname(targetFile), { recursive: true })
  writeFileSync(targetFile, proposedContent, 'utf-8')
  return { originalContent, proposedContent }
}

function restoreSpeculative(targetFile: string, original: string): void {
  writeFileSync(targetFile, original, 'utf-8')
}

function cleanupProposed(proposedFile?: string): void {
  if (proposedFile && existsSync(proposedFile)) {
    try { unlinkSync(proposedFile) } catch { /* melhor esforço */ }
  }
}

// Constrói FileChange[] para que rules/security possam analisar o diff real
// Sem isso, passar [] torna as camadas de análise "cegas" ao código proposto
function buildChanges(targetFile: string | undefined, state: SpeculativeState | null): FileChange[] {
  if (!targetFile || !state) return []
  return [{
    path: targetFile,
    type: 'modify',
    diff: state.proposedContent,
    before: state.originalContent,
  }]
}

async function run(): Promise<void> {
  const { projectRoot, targetFile, proposedFile, taskFile, mode } = parseArgs()
  if (mode === 'graph') {
    const graph = await buildGraphOutput(projectRoot)
    process.stdout.write(`${GRAPH_RESULT_MARKER}${JSON.stringify(graph)}\n`)
    process.exit(0)
  }

  if (mode === 'full-loop') {
    const output = await runFullLoop(projectRoot, readFullLoopRequest(taskFile), event => {
      process.stdout.write(`${FULL_LOOP_EVENT_MARKER}${JSON.stringify(event)}\n`)
    })
    process.stdout.write(`${FULL_LOOP_RESULT_MARKER}${JSON.stringify(output)}\n`)
    process.exit(output.applied ? 0 : 1)
  }

  const commands = resolveCommands(detectStack(projectRoot), projectRoot)
  const config = createOrchestratorConfig(projectRoot, 1)

  const isSpeculative = Boolean(targetFile && proposedFile)
  let specState: SpeculativeState | null = null

  if (isSpeculative && targetFile && proposedFile) {
    specState = applySpeculative(targetFile, proposedFile)
  }

  const changes = buildChanges(targetFile, specState)

  // process.exit() dentro de try bypassa o finally — exitCode é definido aqui
  // e process.exit() só é chamado DEPOIS do finally garantir o restore
  let exitCode = 0

  try {
    const orchResult = await new HarnessOrchestrator().run(changes, config, 'standard')
    const harnessResult = orchResult.harnessResult
    const decision = decide(harnessResult, [])
    const score = calculateScore(harnessResult)

    const output: RunnerOutput = {
      passed: decision.decision === 'auto_apply' || decision.decision === 'suggest',
      score,
      decision: decision.decision,
      reason: decision.reason,
      errors: harnessResult.layers.flatMap(l => l.errors),
      buildCommand: commands.build,
      lintCommand: commands.lint,
      speculative: isSpeculative && specState !== null,
    }

    process.stdout.write(`${RESULT_MARKER}${JSON.stringify(output)}\n`)
    exitCode = output.passed ? 0 : 1
  } finally {
    // SEMPRE restaura o arquivo original — mesmo se o harness lançar exceção
    if (specState !== null && targetFile) {
      restoreSpeculative(targetFile, specState.originalContent)
    }
    cleanupProposed(proposedFile)
  }

  process.exit(exitCode)
}

function readFullLoopRequest(taskFile?: string): FullLoopRequest {
  if (!taskFile || !existsSync(taskFile)) {
    throw new Error('kova-runner: --task-file obrigatÃ³rio para --mode=full-loop')
  }
  return JSON.parse(readFileSync(taskFile, 'utf-8')) as FullLoopRequest
}

run().catch(err => {
  if (process.argv.some(a => a === '--mode=full-loop')) {
    const fallback: FullLoopOutput = {
      handled: false, applied: false, status: 'failed',
      reason: `kova-runner erro interno: ${err instanceof Error ? err.message : String(err)}`,
      score: 0, iterations: 0,
    }
    process.stdout.write(`${FULL_LOOP_RESULT_MARKER}${JSON.stringify(fallback)}\n`)
    process.exit(0)
  }

  const fallback: RunnerOutput = {
    passed: true, score: 0, decision: 'suggest',
    reason: `kova-runner erro interno: ${err instanceof Error ? err.message : String(err)}`,
    errors: [], buildCommand: '', lintCommand: '', speculative: false,
  }
  process.stdout.write(`${RESULT_MARKER}${JSON.stringify(fallback)}\n`)
  process.exit(0)
})
