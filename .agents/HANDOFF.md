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

Planner concluído: `.agents/plans/launcher-shortcuts-planner.md` — **Fases 1–5 feitas** (atalho launcher «Novo gasto», query `method`, pending cross-redirect, gate biométrico em sessão quente). Vive na branch `feature/launcher-shortcuts-phase3`, ainda não mergeada em `main` (ver secção de colaboração abaixo).

Planner ativo: `.agents/plans/cards-visual-planner.md` (Fase 1 feita — spec; Fase 2 feita — simetria do carrossel; Fase 3 feita — bandeira "Outra" com texto livre, commit `f8b8831`; Fase 4 feita — "Apelido", placeholder-only, prefixo "Todo dia", validação inline, commit `18245ae`; **Fase 5 feita** — identidade por banco: `FTCards.banks` (catálogo fechado Nubank/Inter/Mercado Pago/C6/Itaú/Bradesco/Santander/Caixa/BB → cor/gradiente, sem logotipo, decisão de risco de marca registada tomada no ROTEAMENTO) + `bank`/`bankLabel` em `normalizeCard`; novo `<select id="cc-add-bank">` + campo condicional "Outro" no form (mesmo padrão placeholder-only/toggle da Fase 3/4); nome do banco em texto no topo do cartão (`cardTopHtml`, substitui o ícone de chip genérico quando há banco), bandeira continua no rodapé sem conflito; classes `.cc-card--bank-*` em `cards.css` (base + scoped `html.ft-cards`, precedência sobre a cor da bandeira); bandeiras (Visa/Master/Elo/Amex) mantiveram os SVGs custom atuais — decisão de não trocar por lib externa, app é offline/Capacitor; validado no browser (Nubank com gradiente roxo + texto, banco "Outro" com fallback de cor por bandeira, sem regressão nas Fases 3-4) + `cap:sync`/`assembleDebug` OK; **Fase 4.1 feita** — ajuste pós-QA nos campos de dia: label visível "Fechamento"/"Vencimento" acima de cada `.cc-day-field` (excepção pontual ao placeholder-only, só nesses dois campos; `aria-labelledby` a apontar para o novo `<span id="cc-add-close-label">`/`<span id="cc-add-due-label">`), e correção da centralização vertical do texto digitado em `.cc-day-input` via técnica `height`/`line-height` iguais (38px, dentro do campo de 40px com borda) em vez de padding assimétrico — validado no browser com medição precisa via CDP (offset do centro ≈0.01px) e confirmado no S10e físico após `cap:sync`+`installDebug`; sem regressão nos outros campos (Apelido/Final do número/Banco/Bandeira continuam placeholder-only)). Planner de Cartões **completo (Fases 1-5 + 4.1)**.

Planner concluído: `.agents/plans/sheet-fullbleed-planner.md` — `.ft-sheet__panel` (`src/styles/global.css`) passou de `width: 90%` centrado + borda nos 4 lados para `width: 100%`/`left:0`/`right:0` full-bleed + `border-top` apenas (sides/bottom sem borda, cantos de cima continuam arredondados); `transform` de abertura trocado de `translate(-50%, ...)` para `translateY(...)`. Mudança centralizada num único ficheiro — aplica-se automaticamente a todos os sheets (Novo cartão, Novo gasto, Escanear gasto, Avisos, Amigos/QR/Alterar senha). Validado no browser (geometria via CDP em 3 modais) e no S10e físico.

**Novo cartão — limite real de dia (1–31) em tempo real:** `restrictDayInput()` em `cards.js`, ligado ao `input` de `cc-add-close-day`/`cc-add-due-day` — nunca deixa formar um número de 2 dígitos fora de 1–31 (ex.: "9"+"9" fica em "9", não vira "99"); guarda o último valor válido em `el.dataset.ccLastValidDay` e reverte a esse valor quando o novo dígito ultrapassaria 31. Não mexe em `FTCards.normalizeDay` (mantém o clamp defensivo a 31 para outros caminhos que não passem pelo input). Fora do escopo (decidido com o utilizador): não há campo de mês nestes dois campos — são "dia do mês" recorrente (ex. "Todo dia 15"), não uma data fixa; a exceção de ano bissexto já era tratada à parte em `daysInMonth()`/`fmtNextCycleDate()` (usa `Math.min(dia, diasNoMês)` ao calcular a próxima ocorrência exibida no card). Validado no browser (99→9, 35→3, 31→31, 05→05 nos dois campos) e no S10e físico.

**Novo cartão — layout compacto (Apelido+Final e Fechamento+Vencimento lado a lado):** `cc-add-name`/`cc-add-last4` passaram a ficar no mesmo `.cc-form-row2` (mesmo grid de 2 colunas já usado por Fechamento/Vencimento) em `cards.html`, para caber tudo (incl. botões "Adicionar"/"Cancelar") sem scroll em qualquer tamanho de tela. **Bug real encontrado no S10e:** havia um `@media (max-width: 360px) { .cc-form-row2 { grid-template-columns: 1fr } }` em `cards.css` que colapsava para 1 coluna exatamente na largura CSS do S10e (~360dp) — por isso o dispositivo mostrava os campos empilhados mesmo com o APK já atualizado (não era cache; `pm clear` + force-stop não resolveram, só a remoção do breakpoint resolveu). Breakpoint removido; validado no browser emulando 360px e 320px (2 telas pequenas) e no S10e físico após `cap:sync`+`installDebug`+force-stop/relaunch.

**Avisos — polimento visual (mock ainda intacto):** `notification-panel.js` deixou de renderizar `.notif-badge` com números fixos e inconsistentes por tela (home=3, goals=2, profile=1, cards=nenhum) — agora `unreadCount()`/`markAllRead()` calculam o real "não lido" via `localStorage.ft_notif_read_ids` (array de ids dos 3 itens mock), e a badge é injetada/removida dinamicamente em `bind()`/`open()`; removidos os `<span class="notif-badge">…</span>` hardcoded de `home.html`/`goals.html`/`profile.html`. Adicionado estado vazio (`.ft-notif-empty`, ainda sem uso real pois os 3 itens mock continuam fixos), animação de entrada por item (`ftNotifItemIn`, stagger via `animation-delay`) e ponto (`.ft-notif-dot`) esmaecido quando o item já foi lido vs. destacado quando não lido — tudo em `global.css`. Conteúdo dos 3 avisos continua mock (não foi tocado o modelo de dados/backend — isso é a próxima fase, "Avisos: dados reais", ainda não iniciada). Validado no browser (badge aparece/desaparece corretamente, persiste entre reload e entre telas) e no S10e físico.

## Still open / next likely tasks

1. **Merge da branch do atalho**: abrir/rever PR `feature/launcher-shortcuts-phase3` → `main` (ver colaboração)
2. **Cartões — identidade visual + UX do form**: Fases 3–5 do planner ativo (Fase 2 — carrossel simétrico — já feita; falta bandeira "Outra" com texto, "Apelido"/placeholder-only/"Todo dia", skins por banco)
3. **Visual QA on device**: confirm type scale + spacing + balance-hide persist after tab switches
4. **Invite hosting**: public invite links need `firebase deploy --only hosting` (placeholders: Play/App Store URLs)
5. **Storage rules**: `firebase login` then `npm run deploy:rules` so avatar upload syncs to cloud
6. **Avisos modal**: visual polish done (dynamic badge, animation, read/unread dot); content still demo mock — wire to real data (budget/goal alerts) when resumed
7. Any new feature work should treat the frozen chrome table above as intact unless the user asks to change nav/FOUC again

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

Optional deeper context: ask the agent to search prior conversation / transcript `fe53c0f2-abc3-4f06-85ce-f8b903b080c6` only for specifics — prefer this handoff over dumping the full chat (avoids context wear).
