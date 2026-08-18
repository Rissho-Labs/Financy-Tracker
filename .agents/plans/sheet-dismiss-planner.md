# Planner — Dismiss de sheets (X, seta, voltar nativo, swipe-down)

> Handoff: `@.agents/HANDOFF.md` · Branch: `cursor/sheet-dismiss-ce42`

## Objetivo

Controlador partilhado `FTSheet` para todos os `.ft-sheet`: pilha in-memory, botão voltar Android (`@capacitor/app`), header com seta + X, swipe-down para fechar, tap no backdrop.

## Contrato de gestos

| Gesto | Efeito |
|---|---|
| Seta | Só se `stack.length > 1`. Fecha o topo (`pop`). |
| X | `dismissAll()` — fecha toda a pilha da página. |
| Voltar nativo / Escape | Igual à seta; sem sheet → `App.minimizeApp()`. |
| Swipe down (handle/chrome) | Follow-finger; ≥25% altura ou flick → `pop`. |
| Tap backdrop | `pop()` no sheet do topo. |
| Modos Manual/QR/Arquivo dentro de `#expense-sheet` | Não são pilha. |

## Arquitetura

- [`src/shared/js/ft-sheet.js`](../src/shared/js/ft-sheet.js) — `window.FTSheet`
- [`src/core/ft-app.bundle.js`](../src/core/ft-app.bundle.js) — `window.__FT_APP__` (`@capacitor/app`)
- Classe única de aberto: `ft-sheet--open`
- `register(el, { onOpen, onClose, canClose, lockBody })`

## Fases

1. **Fundação** — FTSheet + back + 3 alvos QA (gasto, cartão, avisos)
2. **1b** — perfil, scan, gastos (pilha scan sobre gasto)
3. **Chrome** — seta + X no HTML; remover Cancelar/Fechar full-width
4. **Swipe** — drag no handle/chrome
5. **QA** — cap:sync, S10e, HANDOFF

## Não regressar

Nav/FOUC, `.bottom-nav` absolute, `.cc-form-row2` @360px, carrossel de tabs.
