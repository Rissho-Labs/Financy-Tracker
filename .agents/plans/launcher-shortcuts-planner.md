# Planner — Atalhos de launcher (Novo gasto)

> Feature: long-press no ícone do app → **Novo gasto** → sheet da Home (manual / escanear / arquivo), com **gate biométrico**.  
> Handoff: `@.agents/HANDOFF.md` · package `com.financetracker.app`  
> Fase 1 (este ficheiro): só especificação. Sem código da feature.

## Objetivo

Acelerar o registo de um gasto **sem passar pela Home**. O utilizador segura o ícone no launcher (Android; iOS depois), toca em **Novo gasto**, desbloqueia com a biometria já cadastrada no dispositivo, e cai no mesmo sheet `#expense-sheet` (Manual / Escanear / Arquivo).

Isto **não** grava gasto fora do processo do app. O menu do long-press é do **sistema** (sem biometria). A segurança aplica-se **depois** do toque no atalho.

## Decisão de produto (MVP)

| Item | Decisão |
|------|---------|
| Quantos atalhos | **Um:** «Novo gasto». Abre o sheet com as 3 opções visíveis (como o FAB). |
| Atalhos extra (Manual / Escanear / Arquivo) | Fora do MVP. Deep links por método ficam prontos para uma fase posterior. |
| iOS Quick Actions | **Nota apenas** nesta feature; implementar quando houver target iOS. |
| Biometria | Obrigatória para **abrir o sheet via atalho**. Sem biometria ativa → login normal; **nunca** mostrar o formulário sem sessão autenticada. |

## Como funciona hoje (reutilizar)

- Sheet: `#expense-sheet` em `src/features/transactions/home.html` — métodos `manual` / `qr` / `file`.
- Abertura: `openExpenseSheet()` em `home.js` (FAB). Sempre força `manual` no click.
- Query já existente: `?expense=1` em `home.js` (`bootHomeReceiptUi`) abre o sheet e faz `history.replaceState` para limpar a URL.
- Sem sessão: `home.js` faz `location.replace(FTRoutes.login)` **antes** de ler `?expense=1` se `!FTSession.isLoggedIn()` — o query **perde-se** hoje. O planner tem de corrigir isso na Fase 3.
- Biometria: `@capgo/capacitor-native-biometric` via `ft-auth.js` / `ft-biometric.bundle.js`. Login já chama `FTAuth.tryBiometricOnLaunch()` em `app.js`. Flag `ft_biometric_enabled`. Toggle no Perfil (`#bio-toggle`).
- Deep link de convite já no manifest: `ft-friend://v1` — padrão a espelhar, **sem** misturar hosts.

## Contrato de deep link

Base (Capacitor Android): `https://localhost` (`capacitor.config.json` → `server.hostname`).

| Uso | URL |
|-----|-----|
| MVP (sheet com 3 métodos, default manual) | `/features/transactions/home.html?expense=1` |
| Método explícito (Fase 3 + futuro) | `?expense=1&method=manual` \| `qr` \| `file` |
| Esquema nativo (opcional, alinhado a `ft-friend`) | `ft-expense://new?method=manual` (mesmo destino web) |

Valores de `method` inválidos → tratar como `manual`.  
Após abrir o sheet, limpar a query (`replaceState`) como já faz `?expense=1`.

Persistência **antes** de qualquer redirect de auth:

- `sessionStorage.ft_pending_expense` = `{ "v": 1, "method": "manual"|"qr"|"file" }`
- Gravar **antes** de `home.js` mandar para login.
- Consumir uma vez após login/biometria com sucesso; apagar se o utilizador cancelar a bio ou fechar o login sem entrar.

## Gate biométrico (obrigatório no atalho)

O launcher **não** pede digital. O app pede **ao tratar o intent**.

| Situação | Comportamento |
|----------|----------------|
| Biometria ativa (`shouldOfferAutoBiometricOnLaunch` / credenciais no Keystore) + verificação OK | Restaurar sessão se preciso → Home → abrir sheet (`method` pendente). |
| Biometria ativa + cancelar / falhar | **Não** abrir o sheet. Ficar no login (ou ecrã bloqueado). Manter ou limpar pending conforme UX: preferir **limpar** pending para não abrir o gasto na próxima abertura “normal”. |
| Biometria desligada ou sem credenciais | Login e-mail/Google. Depois do login com sucesso, se pending existir → abrir sheet. Não saltar o login. |
| Sessão Firebase ainda quente + bio ativa | Mesmo assim **verificar identidade** (`verifyIdentity` / `tryNativeBiometricLogin`) antes de mostrar o sheet. Atalho ≠ atalho sem cadeado. |
| Onboarding incompleto | Depois da bio/login, respeitar `FTRoutes.onboarding`; **não** abrir o sheet até o onboarding estar feito. Guardar pending e retomar na primeira Home. |

Não transmitir templates biométricos. Continuar só Keystore on-device (`FTAuth` / NativeBiometric).

`tryBiometricOnLaunch()` hoje faz `location.replace(dest.href)` **sem** query. Fase 3 deve anexar `?expense=1&method=…` **ou** reler `ft_pending_expense` na Home.

## Android — App Shortcuts (Fase 2)

API 25+ (S10e / One UI e launchers atuais). Atalhos **estáticos** bastam para o MVP.

Ficheiros prováveis:

- `android/app/src/main/res/xml/shortcuts.xml` — um shortcut `id="new_expense"`, short/long label «Novo gasto», ícone (drawable simples, não gerar asset de marca nesta fase).
- `android/app/src/main/AndroidManifest.xml` — `<meta-data android:name="android.app.shortcuts" android:resource="@xml/shortcuts" />` na `MainActivity` (já `singleTask` + `MAIN/LAUNCHER`).
- `android/app/src/main/res/values/strings.xml` — labels.
- Intent: `VIEW` para `MainActivity` com `android:data` = URL Capacitor da Home + `?expense=1` (e, se estável no WebView, `&method=manual`).

`MainActivity.java`: só tocar se o intent não chegar ao WebView (Capacitor costuma aplicar a URL). Preferir **não** alterar o `SecureChromeClient`. `launchMode=singleTask`: se o app já estiver aberto, o intent tem de atualizar a URL / disparar o pending (Fase 3 — `appUrlOpen` ou `resume` + query).

Não mudar `ft-friend://`. Não mudar geometria da nav.

## Web — abrir o sheet (Fase 3)

Ficheiros prováveis:

- `src/features/transactions/home.js` — alargar `bootHomeReceiptUi`: ler `expense` + `method`; persistir pending **antes** do redirect de login; após sessão OK, `openExpenseSheet()` e ativar o botão `data-method` (hoje o open força sempre manual).
- `src/core/ft-auth.js` e/ou `src/app/app.js` — após bio OK, não perder pending; não abrir Home “limpa” se houver atalho.
- Opcional: `src/core/ft-routes.js` helper `expenseSheetUrl(method)`.
- Não prefetch de tabs. Não mexer em `ft-tab-carousel.js` / CSS do pill / `.bottom-nav` `absolute`.

Teclado: manter a regra atual (sem autofocus ao abrir o sheet).

## iOS (adiado)

Quando existir projeto iOS: `UIApplicationShortcutItems` no `Info.plist` + o mesmo query/`ft-expense`. Fora das fases 2–4 deste ciclo Android.

## O que não mexer (regressão)

Do handoff — tratar como chrome congelado:

- `.bottom-nav` **absolute**, altura 58px, safe-area só em `bottom`
- Sem labels de texto no pill da nav
- Hydrate early de identidade / expenses / `ft_balance_visible`
- Sem HTML-prefetch de tabs adjacentes
- Split settled-indicator CSS vs thumb JS no carousel
- Tokens `--home-content-top` / `--home-scroll-spacer`

## Fases

| Fase | Tipo | O quê | Ficheiros |
|------|------|--------|-----------|
| **1** | Arquitetura | Este planner | `.agents/plans/launcher-shortcuts-planner.md` |
| **2** | Implementação nativa | Shortcut estático + intent | `shortcuts.xml`, `AndroidManifest.xml`, `strings.xml`, drawable do ícone do atalho |
| **3** | Implementação web + auth | Query `method`, pending em `sessionStorage`, gate bio, sheet no método certo, app já em foreground | `home.js`, `ft-auth.js` e/ou `app.js`; `MainActivity` só se o intent falhar |
| **4** | QA dispositivo | `npm run cap:sync` → `android/gradlew.bat installDebug` | — |

Depois de cada fase de código: instalar no USB (handoff).

## Critério de aceite

Dispositivo de teste: **Samsung SM-G970F (S10e)**. Comportamento deve ser o de **App Shortcuts padrão**, portanto válido noutros Android 7.1+ com launcher compatível (Pixel, One UI, etc.).

1. Segurar o ícone **Finance Tracker** no launcher → aparece **Novo gasto**.
2. Com biometria ativa: toque no atalho → prompt nativo de digital/rosto → **só então** Home com `#expense-sheet` aberto (Manual / Escanear / Arquivo). Nav e FOUC inalterados.
3. Cancelar ou falhar a bio → **não** se vê o formulário de gasto.
4. Biometria desligada → ecrã de login; após login com sucesso, sheet abre (pending). Sem login, sheet não abre.
5. App já em memória (`singleTask`): segundo toque no atalho ainda pede bio (se ativa) e abre o sheet, sem duplicar activities.
6. Atalho não parte o deep link `ft-friend://` nem o fluxo de convite.
7. Teclado não sobe sozinho ao abrir o sheet.

## ROTEAMENTO sugerido (próximas fases)

- **Fase 2:** implementação (Android XML/intent) → Claude Sonnet, **effort medium/low**, **chat novo** se a thread de planeamento já estiver pesada. Alternativa: GPT-5.x.
- **Fase 3:** implementação + auth/debug de sessão → Claude Opus **effort high** se o gate bio/pending se complicar; senão Sonnet medium. Chat novo.
- **Fase 4:** QA / debug em dispositivo → Sonnet medium.

Ver `@.agents/claude-context.md`. Não implementar código até o utilizador colar o prompt de **AÇÃO da Fase 2**.
