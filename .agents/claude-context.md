# Claude + Cursor — contexto, effort e economia

Guia para o workflow ROTEAMENTO → modelo → AÇÃO.  
Não anexar este ficheiro inteiro em todos os chats: o handoff aponta para cá.

## O que significa 122% de contexto

O pedido **ainda corre**. Não “rebenta” o limite do modelo.

O Cursor monta um pacote (histórico + regras + `@` ficheiros + tools + *thinking*). Se esse pacote for **maior** que a janela útil do modelo, mostra **>100%** e **corta ou resume** o excesso (quase sempre o início da conversa e ficheiros menos citados).

Efeitos:

- A resposta sai, mas o modelo pode **esquecer** decisões antigas desta thread
- Ficheiros longos podem entrar **truncados**
- *Effort high* piora: o raciocínio interno **também ocupa** a janela

**122% é mau para qualidade nesta thread, não é um crash.** Ação: **chat novo** para a AÇÃO, com `@` só do necessário.

## Limite 300k vs janela real

O slider de contexto no Cursor é um **teto teu**, não um upgrade mágico.

| Peça | Papel |
|------|--------|
| Janela do modelo | Teto duro (ex.: Sonnet ~200k tokens em muitos SKUs; alguns modos Max/1M se a UI o disser) |
| Limite 300k no Cursor | “Tenta incluir até X”; se o modelo for menor, **sempre** vais ver compressão |
| Effort high | Mais tokens de *thinking* **dentro** da mesma janela |

Se o Sonnet 5 neste picker for 200k e o limite estiver em 300k, o Cursor pode **preparar** ~300k e depois **esmagar** para caber — daí percentagens >100%.

**Ajuste prático:** põe o limite **igual ou um pouco abaixo** da janela anunciada do modelo (ex. 180–200k para Sonnet 200k). Não uses 300k “por segurança”.

## Effort (low / medium / high)

| Effort | Quando | Custo / contexto |
|--------|--------|-------------------|
| Low | XML, strings, atalho estático, typo, commit | Barato; pouco *thinking* |
| Medium | JS de uma feature, CSS, deep link simples | Default |
| High | Arquitetura, auth/bio, bugs de sessão, FOUC/nav | Caro; enche a janela depressa |

Fase 2 (shortcuts.xml) → **medium ou low**.  
Fase 3 (bio + pending + sheet) → **high** só nessa fase, **chat novo**.

## Família Claude (hoje e o que vier)

Nomes mudam; a **função** mantém-se. Quando a Anthropic lançar Sonnet/Opus/Haiku novos, mapeia assim:

| Papel | Exemplos | Janela típica* | Usar para | Evitar |
|-------|----------|----------------|-----------|--------|
| **Haiku** | Haiku 4.x / sucessor “fast” | ~200k | Classificar, resumos, diffs pequenos | Auth, nav, planner estrutural |
| **Sonnet** | Sonnet 4.x / 5 / sucessor “daily” | ~200k (às vezes Max maior) | Quase todo o código (XML, JS, CSS) | Threads longas + high + 10 ficheiros `@` |
| **Opus** | Opus 4.x / 5 / sucessor “frontier” | ~200k | Planner, gate biométrico, bugs cruzados | Atalho XML, rename, “só um drawable” |

\*Confirma na UI do modelo (“200k” / “1M” / Max). Se for 1M, podes subir o slider; **mesmo assim** chats curtos rendem mais.

Regra estável: **modelo mais fraco que ainda faz o trabalho bem**. Economia = Haiku/Sonnet + effort baixo + chat curto, não “Opus em tudo”.

## Como não estourar o contexto (checklist)

1. **1 fase = 1 chat de AÇÃO** (ROTEAMENTO pode ficar no Auto; AÇÃO noutro chat ou no mesmo só se o % estiver <60%).
2. `@` só: `HANDOFF.md` + **o planner da feature** + os 2–4 ficheiros da fase. Não `@` a pasta `src/` nem bundles (`ft-firebase.bundle.js`, etc.).
3. Não colar o prompt de ROTEAMENTO **duplicado**. Não colar o planner inteiro se já está em `@`.
4. Não pedir “lê o transcript completo”.
5. Se o indicador passar **~80%**: termina o turno, **novo chat**, cola o prompt de AÇÃO + `@` dos ficheiros.
6. Se já estiver **>100%**: não continues a implementar nessa thread — a qualidade cai.

## Encaixe no workflow

```
Ideia
  → ROTEAMENTO (Auto, effort low/medium)     [barato]
  → se não há planner: AÇÃO Fase 1 (Opus, high, chat limpo)
  → ROTEAMENTO Fase N
  → AÇÃO Fase N (Sonnet medium; Opus high só se o planner disser)
       chat novo se contexto >80%
  → cap:sync + installDebug
```

Prompt de AÇÃO deve listar ficheiros, não “lê o projeto todo”.
