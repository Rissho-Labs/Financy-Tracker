# Planner — Sheets/modais "full-bleed" (sem borda lateral/inferior)

> **Status: concluído.** Implementado em `src/styles/global.css` (`.ft-sheet__panel`), validado no browser (3 modais: Novo cartão, Novo gasto, Avisos — geometria confirmada via CDP) e no S10e físico após `cap:sync` + `installDebug`.

> Feature: componente partilhado `.ft-sheet` / `.ft-sheet__panel` (`src/styles/global.css`) — usado por **todos** os modais em bottom-sheet do app (Novo cartão, Novo gasto, Escanear gasto, Avisos/notificações, Amigos, QR, Alterar senha, etc.). Mudança de estilo centralizada, sem duplicar CSS por tela.
> Handoff: `@.agents/HANDOFF.md` · Este ficheiro: só especificação. Sem código.

## Objetivo

Hoje os modais em sheet (ex.: "Novo cartão") aparecem como um cartão flutuante **centrado e com margem visível dos dois lados e por baixo** — dá a impressão de um "cartão pequeno" em vez de parecer parte do próprio ecrã do telemóvel. O pedido é que o painel do modal **ocupe toda a largura e chegue até ao fundo do ecrã real** (sem borda visível nas laterais nem em baixo), mantendo apenas o arredondamento e a borda visível **em cima** (as duas "quinas" superiores) — como se o modal fosse uma extensão do próprio ecrã, não um cartão sobreposto.

Isto deve valer **para todos os modais do tipo sheet do app** (é pedido explícito do utilizador), porque todos partilham a mesma classe `.ft-sheet__panel`.

## Como funciona hoje (reutilizar)

- `.ft-sheet` (`src/styles/global.css:617`): overlay `position: absolute; inset: 0` dentro de `.phone-frame` (que em mobile real — media query `max-width: 430px` — já ocupa `width: 100%; height: 100dvh`, ou seja, o ecrã inteiro do telemóvel). Não precisa mudar.
- `.ft-sheet__backdrop` (`global.css:631`): `inset: 0`, escurece o fundo. Não precisa mudar.
- `.ft-sheet__panel` (`global.css:638`) — **é aqui que está o comportamento a corrigir**:
  - `width: 90%; left: 50%; transform: translate(-50%, ...)` → cria a margem lateral visível (5% de cada lado).
  - `border: 1px solid var(--border-bright)` → contorna o painel nos 4 lados, incluindo a linha visível em baixo e nas laterais.
  - `border-radius: 20px 20px 0 0` → **isto já está certo** (só os cantos de cima são arredondados); não precisa mudar.
  - `bottom: 0` → já encosta no fundo do `.ft-sheet` (ecrã), mas a borda de 1px em baixo continua visível.
- Usado por (todos herdam do mesmo CSS-base, ficheiros só adicionam padding/conteúdo interno, não redefinem largura/borda):
  - `#add-card-modal` (`cards.html`) — "Novo cartão"
  - `#expense-sheet` (`home.html`) — "Novo gasto"
  - `#expense-scan-modal` (`home.html`/`ft-expense-scan.js`) — "Escanear gasto"
  - Painel de avisos/notificações (`notification-panel.js`)
  - `#pw-modal`, sheets de amigos/QR (`profile.html`) — "Amigos", "Adicionar amigo", "Perfil do amigo", QR, "Alterar senha"
  - Modais em `gastos.html`
- Tema claro (`html[data-theme="light"] .ft-sheet__panel`) e variantes por tela (`html.ft-profile .ft-sheet__panel`, etc.) só mudam cor de fundo/borda — não largura/posição; continuam a herdar a nova geometria automaticamente.

## O que muda

1. **Largura full-bleed:** `.ft-sheet__panel` passa de `width: 90%` centrado para `width: 100%` encostado nas duas laterais do ecrã (`left: 0`, sem `translateX(-50%)` — a animação de entrada usa só `translateY`).
2. **Borda só em cima:** trocar o `border: 1px solid var(--border-bright)` (4 lados) por borda **apenas no topo** (`border-top: 1px solid var(--border-bright)`), removendo a linha visível nas laterais e no fundo. Cantos de cima continuam arredondados (`border-radius: 20px 20px 0 0`), fundo/laterais ficam retos e "colados" ao ecrã.
3. **Padding interno inalterado nas laterais** (mantém `padding: 12px 20px 24px` + `padding-bottom` com `env(safe-area-inset-bottom)`) — o conteúdo continua com respiro do próprio ecrã; só o "cartão" visual (fundo + borda) é que passa a ir até à borda física do telemóvel.
4. **Sem duplicação por tela:** a mudança é 100% em `.ft-sheet__panel` (base, `global.css`) — nenhum ficheiro de feature (`cards.css`, `home.css`, `profile.css`, etc.) precisa de alteração, porque nenhum deles redefine `width`/`border`/`left` do painel (confirmado por grep).
5. **Não muda:** `.ft-sheet`, `.ft-sheet__backdrop`, `border-radius` dos cantos de cima, z-index, transições de abertura/fecho, conteúdo interno de cada modal, `#expense-sheet` (altura fixa `min(78vh, 620px)` continua igual), regra especial `#add-card-modal .ft-sheet__backdrop, #pw-modal .ft-sheet__backdrop { pointer-events: none; }`.

## Ficheiros

- `src/styles/global.css` — única alteração necessária (`.ft-sheet__panel`, `.ft-sheet.ft-sheet--open .ft-sheet__panel`, `.ft-sheet.open .ft-sheet__panel` — ajustar o `transform` de `translate(-50%, 100%)`/`translate(-50%, 0)` para `translateY(100%)`/`translateY(0)`).

## Critério de aceite

1. No modal "Novo cartão" (e em qualquer outro sheet do app), o painel encosta nas duas bordas laterais do ecrã real (sem margem/gap visível) e no fundo (sem linha de borda visível ali).
2. Só existe borda/contorno visível **no topo** do painel, acompanhando os dois cantos arredondados.
3. Testado visualmente em pelo menos: "Novo cartão", painel de "Avisos", "Novo gasto" — sem regressão de layout interno (botões, inputs, grid de métodos de pagamento, etc. continuam a caber e a alinhar corretamente com a largura maior).
4. Tema claro e escuro continuam corretos (a borda de topo usa a mesma variável de cor já usada hoje).
5. Sem regressão na animação de abertura/fecho (slide-up ainda suave, sem "saltos" horizontais).
6. Sem regressão em nav/FOUC, carrossel de Cartões, ou qualquer lógica de dados — mudança é puramente visual/CSS.

## ROTEAMENTO sugerido

Mudança pequena e centralizada (poucas linhas em `global.css`, sem lógica), mas com **superfície de impacto ampla** (todos os modais do app) — por isso vale testar em pelo menos 3 telas diferentes antes de dar como concluído.

- **Fase única:** ajuste CSS em `.ft-sheet__panel` (largura full-bleed + borda só no topo) → Sonnet, **effort low**. Pode continuar na mesma thread.
- Validar no browser em 3 modais (Novo cartão, Avisos, Novo gasto) e depois `cap:sync` + `installDebug` no S10e para confirmar em tamanho real (bordas de tela física, safe-area).
