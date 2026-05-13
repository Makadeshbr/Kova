import { describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy } from '../src/main/content-security-policy'

describe('buildContentSecurityPolicy', () => {
  it('allows Vite/React dev runtime scripts only in development', () => {
    const csp = buildContentSecurityPolicy(true)

    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'")
    expect(csp).toContain('ws://localhost:*')
    expect(csp).toContain('ws://127.0.0.1:*')
  })

  it('keeps production script policy strict', () => {
    const csp = buildContentSecurityPolicy(false)

    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain("'unsafe-eval'")
    expect(csp).not.toContain("'unsafe-inline' 'unsafe-eval'")
  })
})
