# Abrir um chat novo (colar e ir)

Não anexes este ficheiro **e** o handoff **e** o planner **e** o guia de contexto no mesmo `@`.  
Para AÇÃO: só **HANDOFF + planner da feature**. O resto o agente lê se precisa.

## Antes de colar (Cursor)

1. **Chat novo** (não continues uma thread >80% / >100%).
2. **Modelo** no picker (não deixes Auto na AÇÃO se o ROTEAMENTO já escolheu Sonnet/Opus).
3. **Effort:** low = XML/strings; medium = JS/CSS; high = auth/bio/arquitetura.
4. **Limite de contexto:** igual ou um pouco abaixo da janela do modelo na UI (ex. 180–200k se for 200k). Não 300k “por segurança”.
5. No `@`: só os ficheiros listados no prompt. Nunca a pasta `src/` nem bundles.

---

## Agora — Fase 2 (atalho Android)

Planner já existe. **Não** faças ROTEAMENTO outra vez.

| Picker | Valor |
|--------|--------|
| Modelo | Claude Sonnet (thinking) |
| Effort | Medium (ou Low) |
| Contexto | ≤ janela do Sonnet (não 300k) |

**Primeira mensagem (colar tal como está):**

```text
Modo: AÇÃO — só Fase 2.

Lê @.agents/HANDOFF.md e @.agents/plans/launcher-shortcuts-planner.md
Não leias transcripts. Não anexes o repo inteiro.

Implementa APENAS o atalho estático Android «Novo gasto»:
- shortcuts.xml (id new_expense)
- meta-data android.app.shortcuts na MainActivity
- strings.xml
- drawable simples (sem asset de marca)
- intent VIEW → https://localhost/features/transactions/home.html?expense=1

NÃO nesta fase: sessionStorage, biometria, openExpenseSheet, home.js, ft-auth.js, iOS, nav/FOUC.
Não mexas em ft-friend:// nem no chrome congelado do handoff.

No fim: npm run cap:sync e android/gradlew.bat installDebug no USB.
```

Quando o atalho aparecer no long-press do ícone, **fecha este chat** e abre outro para a Fase 3.

---

## A seguir — Fase 3 (sheet + bio + pending)

Chat **novo**. Sonnet medium; Opus + high só se o gate bio falhar.

```text
Modo: AÇÃO — só Fase 3.

Lê @.agents/HANDOFF.md e @.agents/plans/launcher-shortcuts-planner.md
Não leias transcripts. Não anexes o repo inteiro.

Implementa query method, sessionStorage.ft_pending_expense, gate biométrico ao tratar o atalho, e abrir #expense-sheet no método certo.
Não mexas em nav/FOUC, ft-friend://, nem no XML do atalho salvo bug.

No fim: cap:sync + installDebug no USB.
```

---

## Depois — Fase 4 (QA no S10e)

Chat **novo**. Sonnet, effort medium.

```text
Modo: AÇÃO — só Fase 4 (QA).

Lê o critério de aceite em @.agents/plans/launcher-shortcuts-planner.md
Confirma no dispositivo o long-press «Novo gasto» e o gate bio. Corrige só o que falhar.
Não refatores nav/FOUC.
```

---

## Se começares uma feature nova (ainda sem planner)

Chat novo, **Auto**, effort low/medium. Cola o prompt canónico de ROTEAMENTO que está no `HANDOFF.md` (não o dupliques aqui).
