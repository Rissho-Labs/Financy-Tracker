# Handoff — Finance Tracker (mobile tabs / nav / profile)

> Use this file at the start of a new chat: `@.agents/HANDOFF.md`  
> Thread desta sessão (Cartões + sheets + avisos): transcript `bcf97787-87c1-4b52-b442-cefe8e0d39d8`  
> Thread anterior (nav/FOUC): `fe53c0f2-abc3-4f06-85ce-f8b903b080c6`  
> Repo: `https://github.com/Rissho-Labs/Financy-Tracker.git` · package `com.financetracker.app`

## Snapshot para o próximo chat (2026-08-17)

- **Branch integrada:** `cursor/sheet-dismiss-ce42` = sheet dismiss (FTSheet) + merge de `docs/cards-visual-planner` (Home/Cartões/Avisos do colega).
- **Planner Cartões:** `.agents/plans/cards-visual-planner.md` — **completo** (Fases 1–5 + 4.1).
- **Planner sheets dismiss:** `.agents/plans/sheet-dismiss-planner.md` — **implementado** nesta branch.
- **Planner sheets full-bleed:** `.agents/plans/sheet-fullbleed-planner.md` — **completo**.
- **Não regressar:** nav/FOUC (tabela "Done" abaixo); não reintroduzir `@media (max-width: 360px)` a colapsar `.cc-form-row2` (S10e ~360dp).
- **QA no S10e:** `npm run android:live` (USB, recarrega sozinho) ou `npm run android:install` (APK empacotado).

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
| Sheet dismiss UX | `FTSheet` controller: pilha, voltar nativo (`@capacitor/app`), chrome seta+X, swipe-down, backdrop | `ft-sheet.js`, `ft-app.bundle.js`, `global.css`, all `.ft-sheet` pages · branch `cursor/sheet-dismiss-ce42` |

## Do NOT touch (regression traps)

- Bottom-nav position: keep **absolute**; do not switch to `relative` to “fix” layout
- Do not restore text labels that expand the pill over neighbors
- Do not remove early identity / expenses hydrate or min-height locks that prevent FOUC
- Prefer not to HTML-prefetch adjacent tabs (caused jumps before)
- Avoid casual edits to settled-indicator / thumb drag split in carousel CSS/JS

## Device / build

- Device used: Samsung S10e (`SM-G970F`, serial `RQ8M30DX3BV`)
- `JAVA_HOME` = Android Studio JBR (`C:\Program Files\Android\Android Studio\jbr`)
- `ANDROID_HOME` / adb = `%LOCALAPPDATA%\Android\Sdk`
- **Live USB (preferido em sessão de QA):** `npm run android:live`
  - Sobe `www/` em `http://127.0.0.1:5050`, faz `adb reverse`, instala com `cap run -l`
  - Editar `src/` → a WebView recarrega sozinha (~1s). Plugins nativos (câmara, back, bio) continuam os do APK.
  - Mudança nativa (`android/`, novo plugin Capacitor): parar e voltar a correr `android:live` (ou `android:install`).
  - Ctrl+C pára o servidor. Depois disso a app no telemóvel fica sem página até `npm run android:live` de novo **ou** `npm run android:install` (volta ao APK empacotado, funciona offline).
- **One-shot empacotado:** `npm run android:install` (`cap:sync` + `installDebug` + relançar)
- **After every UI/feature implementation in a session:** `android:live` se já estiver a correr (grava e o telemóvel atualiza); senão `android:install`
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

Planners concluídos: `.agents/plans/cards-visual-planner.md`, `.agents/plans/sheet-fullbleed-planner.md`, `.agents/plans/sheet-dismiss-planner.md` (FTSheet + back + chrome + swipe).

Planner concluído (branch separada): `.agents/plans/launcher-shortcuts-planner.md` — Fases 1–5 em `feature/launcher-shortcuts-phase3`, ainda não mergeada.

**Avisos — polish visual + badge dinâmica:** `localStorage.ft_notif_read_ids`; conteúdo ainda mock. Próxima fase: avisos reais (orçamento/meta/cartão).

## Still open / next likely tasks

1. **Device QA (S10e)**: `npm run android:live` — validar FTSheet + Home/Cartões integrados (live-reload USB)
2. **PR** `cursor/sheet-dismiss-ce42` → `main` (inclui merge do trabalho do colega)
3. **Merge atalho launcher**: `feature/launcher-shortcuts-phase3` → `main` (quando pronto)
4. **Avisos: dados reais** — ligar painel a orçamento/meta/cartão
5. **Invite hosting**: `firebase deploy --only hosting`
6. **Storage rules**: `firebase login` then `npm run deploy:rules`
7. Qualquer feature nova: tratar a tabela "Done" (nav/FOUC) como intacta

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
