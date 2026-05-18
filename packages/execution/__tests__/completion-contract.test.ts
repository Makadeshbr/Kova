import { describe, expect, it } from 'vitest'
import type { FileChange, TaskDefinition } from '@kova/shared'
import { buildCompletionProof, inferCompletionRequirements } from '../src/completion-contract'

function task(objective: string): TaskDefinition {
  return {
    id: 't-completion',
    objective,
    constraints: [],
    nonGoals: [],
    validationCriteria: [],
    type: 'feature',
    impact: 'medium',
    affectedFiles: [],
    stackAdapter: 'typescript',
  }
}

function proof(objective: string, changes: FileChange[] = [], thought = '') {
  return buildCompletionProof(task(objective), changes, {
    toolCalls: [],
    toolResults: [],
    events: [],
  }, thought)
}

describe('completion contract', () => {
  it('does not treat prompt prose like etc.Use as required files', () => {
    const objective = [
      'crie uma landing page moderna,de festas de aniversario,onde tem festa na caixa,arco decorativo e etc.Use stack moderna',
      '## SKILL: Frontend Cinematic Specialist',
      '## Arquitetura proposta 3. Código pronto de produção 4. Dicas de animação e performance',
    ].join(' ')

    const requirements = inferCompletionRequirements(objective)

    expect(requirements.map(req => req.value)).not.toContain('etc.Use')
    expect(requirements.filter(req => req.kind === 'file')).toHaveLength(0)
  })

  it('requires explicitly requested install and dev server commands', () => {
    const requirements = inferCompletionRequirements('rode npm install para mim e npm run dev')

    expect(requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'command', value: 'npm install' }),
      expect.objectContaining({ kind: 'dev_server', value: 'npm run dev' }),
    ]))
  })

  it('fails requested dev server proof until a ready persistent session exists', () => {
    const incomplete = proof('crie a landing page e rode npm run dev')
    expect(incomplete.items).toContainEqual(expect.objectContaining({
      satisfied: false,
      blocking: true,
      reason: expect.stringContaining('no ready persistent session'),
    }))

    const complete = buildCompletionProof(task('crie a landing page e rode npm run dev'), [], {
      toolCalls: [{ name: 'run_interactive_command', input: { command: 'npm run dev' } }],
      toolResults: [{ name: 'run_interactive_command', result: 'Persistent command started (term-1) ready=true url=http://localhost:5173 port=5173' }],
      events: [],
    }, '')

    expect(complete.items).toContainEqual(expect.objectContaining({
      satisfied: true,
      evidence: expect.stringContaining('localhost:5173'),
    }))
  })

  it('does not accept dev server output as ready when the tool result says ready=false', () => {
    const result = buildCompletionProof(task('crie a landing page e rode npm run dev'), [], {
      toolCalls: [{ name: 'run_interactive_command', input: { command: 'npm run dev' } }],
      toolResults: [{
        name: 'run_interactive_command',
        result: [
          'Persistent command started in Kova terminal (term-1). ready=false url=http://localhost:5174/ port=5174 diagnostics=readiness_probe_failed',
          'Output:',
          'VITE ready in 300 ms',
          'Local: http://localhost:5174/',
        ].join('\n'),
      }],
      events: [],
    }, '')

    expect(result.serverSessions).toContainEqual(expect.objectContaining({
      ready: false,
      url: 'http://localhost:5174/',
      diagnostics: expect.arrayContaining(['readiness_probe_failed']),
    }))
    expect(result.items).toContainEqual(expect.objectContaining({
      satisfied: false,
      reason: expect.stringContaining('no ready persistent session'),
    }))
  })

  it('penalizes validation claims without a matching validation command', () => {
    const result = proof('implemente a feature', [], 'Rodei build e validei tudo.')

    expect(result.requirements).toContainEqual(expect.objectContaining({ kind: 'validation' }))
    expect(result.items).toContainEqual(expect.objectContaining({
      satisfied: false,
      blocking: true,
      reason: expect.stringContaining('no validation command ran'),
    }))
  })

  it('requires landing page artifacts to have real structure, styling, responsiveness and substance', () => {
    const weak = proof('crie uma landing page moderna de jogos', [
      { path: 'index.html', type: 'create', diff: '<h1>Jogos</h1>' },
      { path: 'style.css', type: 'create', diff: 'body{font-family:sans-serif}' },
      { path: 'main.js', type: 'create', diff: 'console.log("ok")' },
    ])

    expect(weak.requirements).toContainEqual(expect.objectContaining({ kind: 'artifact_quality' }))
    expect(weak.items).toContainEqual(expect.objectContaining({
      satisfied: false,
      blocking: true,
      reason: expect.stringContaining('too incomplete'),
    }))

    const strong = proof('crie uma landing page moderna de jogos', [
      {
        path: 'index.html',
        type: 'create',
        diff: `
          <header><nav><a>Games</a><button class="btn cta">Jogar agora</button></nav></header>
          <main>
            <section class="hero"><h1>Arcade Nexus</h1><p>Uma landing page de jogos moderna com torneios, rankings e comunidade.</p><a class="cta">Explore os jogos</a></section>
            <section class="features"><article>Biblioteca premium</article><article>Cloud saves</article><article>Eventos ao vivo</article></section>
            <section class="beneficios"><article>Performance competitiva</article><article>Times e missões</article><article>Recompensas diárias</article></section>
            <section class="depoimentos"><article>Jogadores profissionais aprovam a experiência.</article></section>
          </main>
          <footer>Arcade Nexus</footer>
        `,
      },
      {
        path: 'style.css',
        type: 'create',
        diff: `
          :root { --bg: #06070b; --panel: #141827; --accent: #46f0a3; --hot: #ffcf66; }
          body { margin: 0; min-height: 100vh; color: white; background: var(--bg); font-family: Inter, system-ui, sans-serif; }
          header { position: sticky; top: 0; backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,.12); }
          nav, section, footer { width: min(1120px, calc(100% - 32px)); margin: 0 auto; }
          nav { display: flex; justify-content: space-between; align-items: center; min-height: 72px; }
          .hero { min-height: 72vh; display: grid; align-content: center; gap: 24px; }
          .hero h1 { font-size: clamp(3rem, 8vw, 7rem); line-height: .9; }
          .features, .beneficios, .depoimentos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; padding: 72px 0; }
          article { min-height: 180px; padding: 28px; border: 1px solid rgba(255,255,255,.14); background: var(--panel); }
          .btn, .cta { display: inline-flex; align-items: center; justify-content: center; padding: 14px 20px; background: var(--accent); color: #06120d; }
          @media (max-width: 760px) { .features, .beneficios, .depoimentos { grid-template-columns: 1fr; } nav { flex-wrap: wrap; } }
        `,
      },
    ])

    expect(strong.items).toContainEqual(expect.objectContaining({
      requirementId: 'artifact_quality:frontend_landing_page',
      satisfied: true,
    }))
  })

  /**
   * Enterprise-stack parity: the heuristic must accept output from modern
   * frameworks where responsive intent is expressed via Tailwind utilities,
   * styled-components, or framework media-query hooks — not raw `@media`.
   * The previous implementation rejected valid Tailwind landings.
   */
  it('accepts a Tailwind/Next.js landing as a valid frontend artifact', () => {
    const tailwindLanding = proof('crie uma landing page moderna para barbearia', [
      {
        path: 'app/page.tsx',
        type: 'create',
        diff: `
          import { Button } from "@/components/ui/button"
          export default function Page() {
            return (
              <main className="min-h-screen bg-zinc-950 text-white">
                <header className="sticky top-0 backdrop-blur border-b border-white/10">
                  <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
                    <a className="text-lg font-semibold">BarberKova</a>
                    <Button className="cta">Agendar</Button>
                  </nav>
                </header>
                <section className="hero mx-auto max-w-6xl px-6 py-24 md:py-32 grid gap-6">
                  <h1 className="text-5xl md:text-7xl font-bold leading-tight">Corte impecável, atendimento premium.</h1>
                  <p className="text-zinc-300 max-w-2xl">Studio de barbearia em São Paulo com agendamento online, fila inteligente e fidelidade.</p>
                  <a className="cta inline-flex items-center justify-center rounded-md bg-amber-400 text-zinc-900 px-6 py-3">Saiba mais</a>
                </section>
                <section className="services mx-auto max-w-6xl grid gap-6 md:grid-cols-3 px-6 py-16">
                  <article className="rounded-xl border border-white/10 p-6">Cortes clássicos com finalização precisa.</article>
                  <article className="rounded-xl border border-white/10 p-6">Barba modelada, hidratação e relaxamento.</article>
                  <article className="rounded-xl border border-white/10 p-6">Pacotes para noivo, executivos e fidelidade.</article>
                </section>
                <section className="features mx-auto max-w-6xl grid gap-6 md:grid-cols-2 px-6 py-16">
                  <article className="p-6 border border-white/10">Agendamento online com confirmação automática.</article>
                  <article className="p-6 border border-white/10">Programa de pontos e benefícios exclusivos.</article>
                </section>
                <section className="testimonials mx-auto max-w-6xl px-6 py-16">
                  <article className="text-zinc-300">"Melhor experiência de barbearia que já tive." — Cliente fiel</article>
                </section>
                <footer className="border-t border-white/10 mx-auto max-w-6xl px-6 py-10">BarberKova © 2026</footer>
              </main>
            )
          }
        `,
      },
    ])

    const item = tailwindLanding.items.find(it => it.requirementId === 'artifact_quality:frontend_landing_page')
    expect(item).toBeDefined()
    expect(item?.satisfied).toBe(true)
  })

  it('rejects empty/throwaway frontend output even when filenames look right', () => {
    const empty = proof('crie uma landing page moderna', [
      { path: 'index.html', type: 'create', diff: '<!DOCTYPE html><html><body>TODO</body></html>' },
    ])
    const item = empty.items.find(it => it.requirementId === 'artifact_quality:frontend_landing_page')
    expect(item?.satisfied).toBe(false)
    expect(item?.reason).toMatch(/too incomplete/i)
  })
})
