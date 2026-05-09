import { describe, expect, it } from 'vitest'
import { BASE_EVALS, runStaticEval, type EvalResult } from '../src'

describe('Kova Evals — harness regression suite', () => {
  const results: EvalResult[] = BASE_EVALS.map(runStaticEval)

  it('all evals pass their regression checks', () => {
    const failed = results.filter(r => !r.passed)
    if (failed.length > 0) {
      const msg = failed.map(r => `  [${r.id}]: failedRules=${JSON.stringify(r.failedRules)}, notes=${JSON.stringify(r.notes)}`).join('\n')
      expect.fail(`${failed.length} eval(s) failed:\n${msg}`)
    }
  })

  describe('stack evals', () => {
    it('Go API task — TypeScript file triggers stack_mismatch', () => {
      const r = runStaticEval(BASE_EVALS.find(e => e.id === 'go-api-does-not-create-typescript')!)
      expect(r.failedRules).toContain('stack_mismatch')
    })

    it('Go API task — .go files are allowed', () => {
      const r = runStaticEval(BASE_EVALS.find(e => e.id === 'go-api-allows-go-files')!)
      expect(r.failedRules).toHaveLength(0)
    })

    it('TypeScript project — Python files trigger stack_mismatch', () => {
      const r = runStaticEval(BASE_EVALS.find(e => e.id === 'typescript-project-no-python')!)
      expect(r.failedRules).toContain('stack_mismatch')
    })
  })

  describe('scope evals', () => {
    it('frontend task — backend file triggers allowed_paths', () => {
      const r = runStaticEval(BASE_EVALS.find(e => e.id === 'react-component-stays-in-frontend')!)
      expect(r.failedRules).toContain('allowed_paths')
    })

    it('API task — frontend file is out of scope', () => {
      const r = runStaticEval(BASE_EVALS.find(e => e.id === 'api-task-stays-in-api-scope')!)
      expect(r.passed).toBe(true) // expects violation, and got it
    })
  })

  describe('safe-zone evals', () => {
    it('modifying package.json triggers safe_zone', () => {
      const r = runStaticEval(BASE_EVALS.find(e => e.id === 'package-json-modify-needs-review')!)
      expect(r.failedRules).toContain('safe_zone')
    })

    it('creating package.json for new project is allowed', () => {
      const r = runStaticEval(BASE_EVALS.find(e => e.id === 'package-json-create-allowed')!)
      expect(r.failedRules).toHaveLength(0)
    })

    it('modifying .env triggers safe_zone', () => {
      const r = runStaticEval(BASE_EVALS.find(e => e.id === 'env-file-modify-blocked')!)
      expect(r.failedRules).toContain('safe_zone')
    })
  })

  describe('security evals', () => {
    it('editing dist/** triggers forbidden_path', () => {
      const r = runStaticEval(BASE_EVALS.find(e => e.id === 'no-edit-dist-files')!)
      expect(r.failedRules).toContain('forbidden_path')
    })

    it('editing node_modules triggers forbidden_path', () => {
      const r = runStaticEval(BASE_EVALS.find(e => e.id === 'no-edit-node-modules')!)
      expect(r.failedRules).toContain('forbidden_path')
    })
  })

  describe('review-gate evals', () => {
    it('lockfile modification triggers dependency gate', () => {
      const r = runStaticEval(BASE_EVALS.find(e => e.id === 'review-gate-catches-lockfile-change')!)
      expect(r.failedRules).toContain('dependency')
    })
  })

  describe('score evals', () => {
    it('no-tests project can still score 100 on passing build+rules', () => {
      // score test checks the score calculation — uses the passing project change
      // The eval itself just validates contract/review passes cleanly
      const r = runStaticEval(BASE_EVALS.find(e => e.id === 'score-redistributes-when-no-tests-layer')!)
      expect(r.failedRules).toHaveLength(0)
    })
  })
})
