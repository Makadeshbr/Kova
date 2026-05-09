import type { CliContext } from '../index'
import { hasFlag, readOption } from '../args'
import { stagedFiles } from '../git'
import { runValidation } from '../runner'
import { printHarnessResult } from '../ui/harness-display'

export async function validateCommand(args: string[], context: CliContext): Promise<number> {
  const mode = readOption(args, '--mode', 'standard')
  const staged = hasFlag(args, '--staged')
  if (staged) {
    const files = stagedFiles(context.cwd)
    console.log(files.length > 0 ? `Staged files: ${files.join(', ')}` : 'No staged files detected.')
  }

  const result = await runValidation(context.cwd)
  console.log(`Mode: ${mode}`)
  printHarnessResult(result)
  return result.passed ? 0 : 1
}
