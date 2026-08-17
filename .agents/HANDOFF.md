# Handoff — Finance Tracker (mobile tabs / nav / profile)

> Use this file at the start of a new chat: `@.agents/HANDOFF.md`  
> Full prior thread (searchable): agent transcript `fe53c0f2-abc3-4f06-85ce-f8b903b080c6`  
> Repo: `https://github.com/Rissho-Labs/Financy-Tracker.git` · package `com.financetracker.app`

## Goal of recent work

Stabilize Android tab UX (Home / Cards / Goals / Profile): kill menu/content jumps (FOUC), then share-profile + align cross-tab spacing — **without regressing nav geometry**.

## Done (keep intact)

| Area | What | Key files / commits |
|------|------|---------------------|
| Tab carousel | Icon-only bottom nav, 44px pill, settled indicator via CSS `::before`, JS thumb only while dragging | `ft-tab-carousel.css/js`, early `ft-tab-nav-boot.js` · `fc65b95`…`1db0c3c` |
| Nav geometry | `.bottom-nav` stays **absolute** (not `relative` — relative grew outline upward); fixed height 58px; safe-area on `bottom` only | · `e1140b2` |
| Identity FOUC | Early hydrate username/`@user`/`#tag`; stable expenses empty/list min-heights | home/profile scripts + CSS · `57aa75f` |
| Share profile | Native `navigator.share` (+ clipboard fallback); invite URL `https://financy-4d5f7.web.app/invite?u=&t=`; landing + `ft-friend://` deep link | `ft-qr.js`, `profile.js`, `invite.html`, `firebase.json`, AndroidManifest · `573deb0` |
| Avatar photo | Tap avatar/camera → system image picker; compress JPEG; local `ft_user` + Storage `avatars/{uid}/profile.jpg` + Auth/Firestore when online | `profile.js/html/css`, `firebase-entry.mjs`, `storage.rules` |
| Spacing | Tokens `--home-content-top: 4px`, `--home-scroll-spacer: 118px` shared across Home/Cards/Goals/Profile; Profile `padding-top: 0` on `.profile-scroll` | `home.css`, `cards.css`, `goals.css`, `profile.css` |
| Type scale | Shared `--home-page-title` (28), `--home-section-title` (20), `--home-label-size` (13), `--home-body-size` (14), `--home-meta-size` (12), `--home-icon-btn` (38); notif icons 20×20 @ 1.8; greeting without emoji | `home.css` (ft-ios) + tab CSS |
| Header bell | Home bell `align-self: flex-start`; Cards order `+` then bell (trailing edge) | `home.css`, `cards.html` |
| Keyboard UX | No autofocus on sheets/modals; integer fields `inputmode="numeric"` + `pattern="[0-9]*"`; money `inputmode="decimal"` | · `5b05831` |
| Balance hide | Preference `localStorage.ft_balance_visible` (`0`/`1`); early hydrate + persist across tab navigations | `home.html`, `home.js` · `43f5373` |
| Sheet dismiss UX | `FTSheet` controller: pilha, voltar nativo (`@capacitor/app`), chrome seta+X, swipe-down, backdrop | `ft-sheet.js`, `ft-app.bundle.js`, `global.css`, all `.ft-sheet` pages · branch `cursor/sheet-dismiss-ce42` |

## Do NOT touch (regression traps)

- Bottom-nav position: keep **absolute**; do not switch to `relative` to “fix” layout
- Do not restore text labels that expand the pill over neighbors
- Do not remove early identity / expenses hydrate or min-height locks that prevent FOUC
- Prefer not to HTML-prefetch adjacent tabs (caused jumps before)
- Avoid casual edits to settled-indicator / thumb drag split in carousel CSS/JS

## Device / build

- Device used: Samsung S10e (`SM-G970F`)
- `JAVA_HOME` = Android Studio JBR (`C:\Program Files\Android\Android Studio\jbr`)
- `ANDROID_HOME` / adb = `%LOCALAPPDATA%\Android\Sdk`
- Flow: `npm run cap:sync` → `android/gradlew.bat installDebug`
- **After every UI/feature implementation in a session:** run the flow above and install on the USB-connected device (do not wait for the user to ask)

## Workflow — ROTEAMENTO → modelo → AÇÃO

User preference for new work: **do not jump straight into implementation**.

1. **Ideia** (linguagem natural)
2. Se não houver planner da mudança → criar/atualizar um `.md` de fases (sem implementar)
3. **ROTEAMENTO** (Auto): classificar a fase e recomendar modelo **e effort**
4. Utilizador **seleciona o modelo** no picker (e effort: low/medium/high)
5. **AÇÃO** só dessa fase, de preferência em **chat novo** se o contexto da thread estiver alto
6. Repetir 3–5 para as fases seguintes

Contexto / economia Claude: `@.agents/claude-context.md`  
(122% = o Cursor já está a cortar contexto; a AÇÃO deve ir para um chat novo. Limite do slider ≤ janela do modelo; Fase 2 XML → effort medium/low.)

Auto escolhe **um modelo por mensagem**; não muda a meio da resposta. Por isso fases = prompts separados.

### Prompt canónico de ROTEAMENTO (colar no início da fase)

```text
Modo: ROTEAMENTO (não executar código, não editar ficheiros).

Lê @.agents/HANDOFF.md e, se existir, o planner desta mudança.
Interpreta a tarefa abaixo e responde APENAS com:

1) Tipo de tarefa (ex.: image gen / UI CSS / implementação / arquitetura / debug)
2) Modelo recomendado (entre os que tenho habilitados) + 1 frase do porquê
3) Alternativa (2º melhor)
4) Effort sugerido (low / medium / high) + se deve ser chat novo
5) Prompt curto pronto para eu colar na FASE DE AÇÃO

Se não existir planner para esta mudança: primeiro propõe o caminho do ficheiro
e o índice das fases (sem implementar). Só depois recomendas o modelo da Fase 1.

Tarefa / fase:
<descreve aqui>
```

Planners de feature (quando existirem): preferir `.agents/plans/<feature>-planner.md`.

Planner ativo: `.agents/plans/sheet-dismiss-planner.md` — **implementado** (FTSheet + back + chrome + swipe).

## Still open / next likely tasks

1. **Device QA (S10e)**: `npm run cap:sync` → `installDebug` → validar voltar nativo, swipe, pilha scan/gasto e amigos/QR
2. **Launcher shortcuts** — Fase 2: `shortcuts.xml` + intent (ver planner launcher)
3. **Visual QA on device**: confirm type scale + spacing + balance-hide persist after tab switches
4. **Invite hosting**: public invite links need `firebase deploy --only hosting`
5. **Storage rules**: `firebase login` then `npm run deploy:rules`
6. **Avisos modal**: still demo mock — connect real budget/goal/card alerts when resumed
7. Any new feature work should treat the frozen chrome table above as intact unless the user asks to change nav/FOUC again

## How next chat should start

Prompts prontos (Fase 2/3/4 launcher): `@.agents/chat-start.md` — **copia o bloco, não faças `@` desse ficheiro no chat de AÇÃO** (evita contexto extra). No chat novo: `@` só HANDOFF + planner.

```text
Continue from @.agents/HANDOFF.md
Do not regress tab nav / FOUC fixes listed there.
Seguir workflow ROTEAMENTO → modelo → AÇÃO (prompt canónico no handoff).
Current focus: <ideia ou fase>
```

Optional deeper context: ask the agent to search prior conversation / transcript `fe53c0f2-abc3-4f06-85ce-f8b903b080c6` only for specifics — prefer this handoff over dumping the full chat (avoids context wear).
