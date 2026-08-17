# Handoff — Finance Tracker (mobile tabs / nav / profile)

> Use this file at the start of a new chat: `@.agents/HANDOFF.md`  
> Thread desta sessão (Cartões + sheets + avisos): transcript `bcf97787-87c1-4b52-b442-cefe8e0d39d8`  
> Thread anterior (nav/FOUC): `fe53c0f2-abc3-4f06-85ce-f8b903b080c6`  
> Repo: `https://github.com/Rissho-Labs/Financy-Tracker.git` · package `com.financetracker.app`

## Snapshot para o próximo chat (2026-08-17)

- **Branch:** `docs/cards-visual-planner` — working tree limpa; **9+ commits à frente de `origin`** (fazer `git push` antes de outro membro continuar). HEAD recente: `3846d26` (placeholder Banco/Bandeira).
- **Planner Cartões:** `.agents/plans/cards-visual-planner.md` — **completo** (Fases 1–5 + 4.1) + polish pós-QA do form (layout compacto, dia 1–31 em tempo real, "Selecione..." em Banco/Bandeira).
- **Planner sheets:** `.agents/plans/sheet-fullbleed-planner.md` — **completo**.
- **Não regressar:** nav/FOUC (tabela "Done" abaixo); não reintroduzir `@media (max-width: 360px)` a colapsar `.cc-form-row2` (S10e é ~360dp — isso empilhava os campos no dispositivo real).
- **QA no S10e:** após `installDebug`, fazer `adb shell am force-stop com.financetracker.app` e relançar — o WebView pode mostrar assets antigos se o app ficou em segundo plano.

## Goal of recent work

Tela Cartões (identidade visual + UX do form "Novo cartão") e polish partilhado de sheets/avisos — **sem regressar nav geometry / FOUC**.

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
- Flow: `npm run cap:sync` → `android/gradlew.bat installDebug` → `adb shell am force-stop com.financetracker.app` → relançar
- **After every UI/feature implementation in a session:** run the flow above and install on the USB-connected device (do not wait for the user to ask)
- PowerShell: usar `;` em vez de `&&` entre comandos; heredoc `<<'EOF'` não funciona — usar ficheiro `-F` para commit messages

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

Planner concluído: `.agents/plans/launcher-shortcuts-planner.md` — **Fases 1–5 feitas** (atalho launcher «Novo gasto», query `method`, pending cross-redirect, gate biométrico em sessão quente). Vive na branch `feature/launcher-shortcuts-phase3`, ainda não mergeada em `main` (ver secção de colaboração abaixo).

Planner concluído: `.agents/plans/cards-visual-planner.md` — Fases 1–5 + 4.1 feitas nesta branch. Commits: Fase 2 `9b4d564`; Fase 3 `f8b8831`; Fase 4 `18245ae`; Fase 5 `a680e4d`; Fase 4.1 `a98e219`. Pós-QA do form (mesma branch): layout compacto Apelido+Final lado a lado `abb653b` (não repor `@media (max-width: 360px)` em `.cc-form-row2`); dia 1–31 em tempo real `0484686` (`restrictDayInput` em `cards.js`; bissexto já em `daysInMonth`/`fmtNextCycleDate`); placeholder "Selecione o banco/bandeira" `3846d26` (sem pré-seleção Nubank/Visa; erro inline `#cc-add-bank-hint`/`#cc-add-brand-hint`). Identidade por banco: `FTCards.banks` + `bank`/`bankLabel`; sem logotipos oficiais (risco de marca). Bandeiras Visa/Master/Elo/Amex = SVGs atuais.

Planner concluído: `.agents/plans/sheet-fullbleed-planner.md` — `.ft-sheet__panel` full-bleed (`width: 100%`, `border-top` só, `translateY`), commit `45b5fa5`. Aplica-se a todos os sheets.

**Avisos — polish visual feito, conteúdo ainda mock:** `102436f` — badge dinâmica via `localStorage.ft_notif_read_ids`; 3 itens demo em `notification-panel.js`. Próxima fase (não iniciada): avisos reais (orçamento/meta/cartão).

## Still open / next likely tasks

1. **Push desta branch** `docs/cards-visual-planner` (vários commits só locais) e, se o trabalho de Cartões estiver pronto para `main`, abrir PR
2. **Merge da branch do atalho**: PR `feature/launcher-shortcuts-phase3` → `main`
3. **Avisos: dados reais** — ligar o painel a orçamento/meta/cartão (visual polish já feito)
4. **Invite hosting**: `firebase deploy --only hosting` (placeholders Play/App Store)
5. **Storage rules**: `firebase login` then `npm run deploy:rules` (avatar na nuvem)
6. Qualquer feature nova: tratar a tabela "Done" (nav/FOUC) como intacta a menos que o utilizador peça para mexer nisso

## Colaboração — mais de uma pessoa a partir de agora

O projeto passou a ter mais gente a trabalhar nele em paralelo (ex.: branch `feature/amigos-e-metas` já existe no remoto, de outro membro). Regras para não pisarmos trabalho uns dos outros:

- **Nunca commitar direto em `main`.** Cada fase/feature vive na sua branch (`feature/<nome>`); abrir PR para `main` antes de merge.
- **`git fetch` / `git pull` no início de cada sessão** antes de criar branch nova ou continuar uma existente — outro membro pode ter avançado `main` ou a própria feature branch entretanto.
- **Uma branch por feature/planner**, não por chat. Se retomares um planner numa sessão nova, `git checkout` a branch já existente em vez de criar outra.
- **Este `HANDOFF.md` é estado partilhado.** Ao terminar uma sessão com progresso relevante, atualiza a tabela "Done" e a secção "Still open" e comita — outro membro (ou chat) pode continuar a partir daqui sem reler o histórico todo.
- **Push no fim de cada fase concluída**, não só commit local — trabalho que só existe localmente não existe para o resto do grupo.
- Conflitos prováveis: `home.html`/`home.js` (vários fluxos tocam neles), `AndroidManifest.xml`, `strings.xml`. Avisar antes de tocar em áreas que outra branch também esteja a mexer.

## How next chat should start

Prompts prontos (Fase 2/3/4 launcher): `@.agents/chat-start.md` — **copia o bloco, não faças `@` desse ficheiro no chat de AÇÃO** (evita contexto extra). No chat novo: `@` só HANDOFF + planner.

```text
Continue from @.agents/HANDOFF.md
Do not regress tab nav / FOUC fixes listed there.
Seguir workflow ROTEAMENTO → modelo → AÇÃO (prompt canónico no handoff).
Current focus: <ideia ou fase>
```

Optional deeper context: search transcript `bcf97787-87c1-4b52-b442-cefe8e0d39d8` (esta sessão) or `fe53c0f2-abc3-4f06-85ce-f8b903b080c6` (nav/FOUC) only for specifics — prefer this handoff over dumping the full chat.
