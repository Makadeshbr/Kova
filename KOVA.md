# Kova — Norte de Produto

> Última revisão: maio 2026. Este arquivo descreve **o que Kova é**.
> Para a arquitetura técnica, ver `ARCHITECTURE.md`.
> Para o que falta entregar, ver `ROADMAP.md`.

---

## O que Kova é, em uma frase

**Um agente de codificação compatível com Claude Code, com aplicação atômica via git, multi-provider robusto e attachments com vision em todos os providers suportados.**

---

## Posicionamento

Kova **não compete inventando uma filosofia oposta** ao Claude Code, Codex ou Cursor. Compete entregando o mesmo modelo mental do CC com diferenciais reais no que o usuário sente:

| Capacidade | Claude Code | Cursor | Kova |
|---|---|---|---|
| Streaming de arquivo (file aparece live) | ✅ | ✅ | ✅ |
| Tool calls inline visíveis | ✅ | ✅ | ✅ |
| Attachment de imagem/arquivo + paste/drag-drop | ✅ | ✅ | ✅ |
| Apply atômico com git checkpoint automático | ❌ | ❌ | ✅ |
| Multi-provider nativo (Anthropic, OpenAI, Gemini, Grok, DeepSeek, Kimi, OpenRouter, NVIDIA, Ollama, LM Studio, OpenAI-compatible) | parcial | parcial | ✅ |
| Vision em todos os providers compatíveis (detecção automática per-model) | parcial | parcial | ✅ |
| Harness informativo opcional (build/test/lint reportados, nunca bloqueiam) | ❌ | ❌ | ✅ |
| Rollback de iteração via git revert | manual | manual | comando |
| Open-source desktop com Electron | ❌ | ❌ | ✅ |

---

## Princípios de produto

1. **CC-paridade por padrão.** Quando o CC faz X em situação Y, Kova faz X em situação Y. Sem invenções.
2. **Apply atômico é o diferencial silencioso.** Cada iteração bem-sucedida vira um commit git automático. Voltar = `git revert`. Não precisa staging area, não precisa "Apply" manual.
3. **Multi-provider é primeira classe.** Trocar modelo no meio de uma conversa não pode degradar UX. Vision automática quando o modelo suporta.
4. **Harness é informativo, não bloqueante.** O usuário decide se a violação importa, não o sistema.
5. **Sem gambiarra.** Single source of truth para qualquer regra. Tipos compartilhados em `@kova/shared`. Duplicação é débito técnico, não escolha.

---

## O que Kova **não** é

- Não é um harness-first opinionado que bloqueia o agente em nome de "validação independente". Essa direção foi abandonada porque mata UX em scaffolding.
- Não é um clone enxuto estilo Pi (Earendil) — Kova tem opiniões fortes sobre git checkpoint, UI Electron e harness informativo.
- Não é uma ferramenta de revisão de código (esse caso de uso é apoiado pelo modo `/review`, mas não é o produto principal).

---

## Comportamento canônico (CC-paridade explícita)

**Quando o usuário pede "crie um projeto X":**
1. Agente streama files diretamente pro disco conforme write_file é chamado
2. Sidebar atualiza file por file em tempo real
3. Ao fim da iteração, git commit cobre todos os arquivos
4. Sem gate de validação. Sem decisão "auto_apply vs suggest". Sem score.

**Quando o usuário pede "modifique X":**
1. Agente lê arquivos relevantes (com cache de contexto)
2. Aplica edits via `edit_file` (literal old → new)
3. Disk se atualiza imediatamente (creates streams; modifies no fim atomicamente)
4. Harness opcionalmente roda build/test/lint e reporta resultado **sem bloquear**
5. Git commit atômico cobre a iteração
6. Usuário vê warnings de harness se houver; decide se aplica fix

**Quando o usuário pede "instale dependências e rode servidor":**
1. Agente chama `run_command` para `npm install` (stdout streama no chat)
2. Agente chama `run_interactive_command` para `npm run dev` (terminal panel abre)
3. Usuário interage com o servidor diretamente

---

## Casos onde Kova **deve** divergir do CC

Apenas onde a divergência é objetivamente melhor:

- **Git commit por iteração** — CC não faz; Kova faz (rollback trivial)
- **Vision per-model detection** — CC bloqueia para todos os modelos não-Anthropic; Kova suporta Gemini/GPT-4o/Grok-4/etc.
- **Status indicator contextual** — CC mostra "thinking..."; Kova mostra "Editing src/App.tsx, Header.tsx (2/8 files)"
- **Multi-provider sem trocar app** — CC é fixo no Anthropic

---

## Pergunta-guia para qualquer decisão futura

```
O Claude Code faria isso?
  Se sim → Kova faz igual.
  Se não → tem motivo objetivo (atomic apply, multi-provider, vision)?
    Se sim → diverge com clareza, documenta em ROADMAP.md.
    Se não → não diverge.
```

Nunca diverja por estética ou "porque é melhor em teoria". Sempre por motivo concreto.
