import { execSync } from 'node:child_process'

export class GitHelper {
  constructor(private readonly cwd: string) {}

  isGitRepo(): boolean {
    try {
      // Verifica se estamos dentro de um repositório git
      execSync('git rev-parse --is-inside-work-tree', { cwd: this.cwd, stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }

  commit(files: string[], taskId: string, score: number): string | null {
    if (!this.isGitRepo()) return null
    
    try {
      // Adiciona apenas os arquivos que o Kova modificou
      for (const file of files) {
        execSync(`git add "${file}"`, { cwd: this.cwd, stdio: 'ignore' })
      }
      
      const msg = `Kova: Task ${taskId}\n\nHarness score: ${score}`
      execSync(`git commit -m "${msg}"`, { cwd: this.cwd, stdio: 'ignore' })
      
      // Retorna o hash do commit recém criado
      return execSync('git rev-parse HEAD', { cwd: this.cwd }).toString().trim()
    } catch (error) {
      console.warn('[GitHelper] Falha ao fazer commit:', error)
      return null
    }
  }

  revert(hash: string): boolean {
    if (!this.isGitRepo()) return false
    
    try {
      execSync(`git revert --no-edit ${hash}`, { cwd: this.cwd, stdio: 'ignore' })
      return true
    } catch (error) {
      console.warn(`[GitHelper] Falha ao reverter commit ${hash}:`, error)
      return false
    }
  }
}
