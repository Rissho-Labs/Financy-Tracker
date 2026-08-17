# Planner — Cartões: identidade visual + UX do formulário

> Feature: tela **Cartões** (`src/features/cards/`) — corrigir o carrossel, reformular o formulário "Novo cartão" e dar identidade visual real (banco + bandeira + cor) aos cartões, inspirado nas capturas do Mercado Pago.
> Handoff: `@.agents/HANDOFF.md` · Fase 1 (este ficheiro): só especificação. Sem código da feature.

## Objetivo

A tela Cartões hoje mostra cartões genéricos (gradiente por bandeira, sem banco). O pedido junta 5 ideias em torno de **identificação visual** e **usabilidade do formulário**, usando o app do Mercado Pago como referência de padrão (skins reais por banco/bandeira, carrossel com preview simétrico dos dois lados).

## Como funciona hoje (reutilizar)

- Dados do cartão: `FTCards` (`src/features/cards/ft-cards.js`) — `{ id, name, holderName, last4, brand, closingDay, dueDay }`, sessão apenas (`SESSION_ONLY = true`). `brand` ∈ `visa | master | elo | amex | other`, sem campo de banco.
- Cor do cartão: `GRADIENTS` em `ft-cards.js` — um gradiente fixo **por bandeira** (não por banco).
- Logo da bandeira: `FTCardBrands.brandMarkup()` (`ft-card-brands.js`) — SVG inline por `brand` (badge branco com texto, exceto Mastercard com os círculos reais).
- Carrossel: `cards.js` (`setActiveCard`, `bindCarouselEvents`, `renderCardsCarousel`) — cartões em `.cc-track`, `active` no centro; vizinhos deslocados via `transform`/`opacity` calculados em `setActiveCard`. **Só desloca para a direita** (`i > index`); para a esquerda (`i < index`) usa sempre o mesmo deslocamento fixo fora de tela (`cardTransform(-320, 0.9)`, opacity `0`) — por isso o cartão anterior nunca "espia" à esquerda como o próximo espia à direita.
- Formulário "Novo cartão" (`#add-card-modal` em `cards.html`): labels `<label class="field-label">` fixas acima de cada campo (padrão atual do app, igual a outros formulários de sheet) + `<select id="cc-add-brand">` com as 4 bandeiras + "Outra" (sem input de texto livre quando "Outra").
- Campos de dia: `cc-add-close-day` / `cc-add-due-day`, `placeholder="Ex: 15"` / `"Ex: 22"`, validados por `FTCards.normalizeDay`.

## As 5 ideias (mapeadas em fases)

| # | Pedido do utilizador | Fase |
|---|---|---|
| 1 | Campo de texto para digitar a bandeira quando escolher "Outras" | **Fase 3** |
| 2 | Exemplo dos campos de dia: prefixo "Todo dia" + o utilizador digita só o número (ex.: 15); e **todos** os títulos de campo (ex.: "Nome do cartão") viram *placeholder dentro do campo*, que desaparece ao focar/digitar | **Fase 4** |
| 3 | Skins reais: desenho do banco, ícone da bandeira certo, cor correspondente — identidade visual tipo cartões reais atuais | **Fase 5** |
| 4 | Substituir campo "Nome no cartão" por "Apelido" | **Fase 4** (mesmo formulário) |
| 5 | Carrossel: 1º cartão mostra o 2º "espiando" à direita, mas o 2º ativo não mostra o 1º "espiando" à esquerda — padronizar simetria (como no Mercado Pago) | **Fase 2** |

Ordem escolhida: começar pelo bug isolado do carrossel (Fase 2, menor risco/escopo), depois o formulário (Fases 3–4, só UI/UX, sem mudar o desenho do cartão), e por fim a maior mudança — identidade visual por banco (Fase 5), que estende o modelo de dados.

## Fase 2 — Carrossel: simetria esquerda/direita

**Sintoma:** com o 1º cartão ativo, o 2º cartão aparece parcialmente visível à direita (deslocado, escalado, opacidade parcial). Com o 2º cartão ativo, o 1º cartão **não** aparece à esquerda da mesma forma — ele é escondido (fora de tela, opacidade 0).

**Causa:** em `setActiveCard` (`cards.js`), o `else if (i > index)` calcula um offset/escala/opacidade progressivos (efeito "espiar"), mas o `if (i < index)` usa sempre os mesmos valores fixos (`-320px`, escala `0.9`, opacidade `0`) — não há efeito de "espiar" para cartões antes do ativo.

**Correção esperada:** espelhar a lógica — cartão imediatamente anterior (`index - i === 1`) deve espiar à esquerda com o mesmo padrão de offset/escala/opacidade que o próximo espia à direita (valores em espelho, não necessariamente idênticos em pixel se o design pedir menos profundidade à esquerda — mas **visualmente simétrico** como nas capturas do Mercado Pago, onde ambos os vizinhos aparecem parcialmente atrás do cartão ativo). Aplicar o mesmo raciocínio ao `touchmove` (arrasto), que hoje também trata os dois lados de forma diferente.

**Não mexer:** dados do cartão, formulário, `ft-card-brands.js`, geometria da nav/tabs.

**Ficheiros:** `src/features/cards/cards.js` (`setActiveCard`, `bindCarouselEvents`), possivelmente `cards.css` se depender de classes de estado.

## Fase 3 — Bandeira "Outras": campo de texto livre

Quando o utilizador seleciona **"Outra"** no `<select id="cc-add-brand">`, mostrar um campo de texto (ex.: `#cc-add-brand-other`, inicialmente escondido) para digitar o nome da bandeira (ex.: "Hipercard", "Sorocred"). Esconder de novo se voltar a escolher uma bandeira conhecida.

- Persistir esse texto em `FTCards` — precisa de um novo campo, ex. `brandLabel` (só usado quando `brand === 'other'`), normalizado em `normalizeCard`.
- Exibição no cartão: quando `brand === 'other'` e houver `brandLabel`, usar esse texto no lugar do badge genérico "bandeira" (`FTCardBrands.brandMarkup`) — badge branco com o texto digitado (reaproveitar `textBadge()` de `ft-card-brands.js`, adaptando o texto).
- Validação leve (ex.: obrigatório se "Outra" selecionada, ou cair para "Outra bandeira" genérico se vazio — decidir no ROTEAMENTO/AÇÃO).

**Ficheiros:** `cards.html` (novo campo condicional), `cards.js` (toggle do campo, leitura no submit), `ft-cards.js` (`brandLabel` no modelo), `ft-card-brands.js` (badge dinâmico com texto customizado).

## Fase 4 — Formulário: "Apelido" + placeholder-only + "Todo dia"

Três mudanças de UX no mesmo formulário (`#add-card-modal`), sem tocar no desenho do cartão em si:

1. **Renomear campo:** label "Nome no cartão" → **"Apelido"** (o campo continua a mesma variável de dados por trás, ex. `card.name`/`holderName` — decidir no ROTEAMENTO se "Apelido" deve ser um campo novo e separado do nome do titular impresso no cartão, ou se substitui o único campo existente; hoje só há um campo de nome).
2. **Padrão placeholder-only:** em vez de `<label class="field-label">` visível acima do campo + input vazio, o texto do rótulo (ex.: "Apelido", "Final do número", "Bandeira") passa a viver **dentro** do próprio campo como `placeholder`, desaparecendo assim que o utilizador foca/digita — aplicar a **todos** os campos do formulário de cartão (Apelido, Final do número, Bandeira/campo de texto da Fase 3, Fechamento, Vencimento). Isto é uma mudança de padrão visual — confirmar se é só para este formulário ou também vale para outros forms do app (transações/metas) numa fase futura; **aqui, escopo = só formulário de cartão**.
3. **Campos de dia com prefixo "Todo dia":** em vez de rótulo "Fechamento da fatura" + placeholder "Ex: 15", mostrar visualmente um prefixo fixo **"Todo dia"** dentro/junto do campo, e o utilizador digita só o número (ex. `15`). Ex.: `[Todo dia] [ 15 ]` para fechamento, e mesmo padrão para vencimento (pode reaproveitar o rótulo "Vencimento" como contexto adicional, ou também virar "Todo dia" — decidir no ROTEAMENTO qual fica mais claro tendo os dois campos lado a lado).

**Ficheiros:** `cards.html` (estrutura dos campos + CSS de prefixo), `cards.css` (estilo placeholder-only + prefixo "Todo dia"), `cards.js` (se o texto "Apelido" afetar `buildCardHtml`/`buildPlaceholderCardHtml`).

### Reforço da Fase 4 — validação de "dia" conforme regra de calendário

Pedido extra do utilizador: os campos "Todo dia" (fechamento/vencimento) devem respeitar a regra real de dias por mês (fevereiro 28/29 num ano bissexto; abril/junho/setembro/novembro = 30; os restantes = 31) e avisar claramente quando o valor digitado for inválido.

- Hoje: `FTCards.normalizeDay` só garante `1 ≤ dia ≤ 31` (clamp em 31 se maior); o aviso é um `window.alert()` genérico em `cards.js` (`parseFormDay`) — quebra o padrão visual placeholder-only da Fase 4.
- Estes campos são **recorrentes** ("todo dia X", sem mês associado) — por isso não existe "dia inválido para o mês" no sentido estrito (dia 31 é válido como conceito, mesmo que em fevereiro caia no dia 28/29 naquele ciclo — comportamento já tratado em `fmtNextCycleDate`/`daysInMonth` na exibição da próxima fatura). A regra de validação de entrada continua sendo 1–31, mas o aviso deixa de ser `alert()`: passa a ser uma mensagem inline no próprio campo (ex.: reaproveitar `cc-field-hint` para mostrar erro em vez de dica estática, ou um pequeno texto vermelho abaixo do campo), coerente com o padrão placeholder-only.
- Opcional (decidir no ROTEAMENTO): aviso informativo (não bloqueante) quando o dia escolhido for > 28, avisando que em meses menores a fatura cai no último dia do mês — já é o comportamento real, só falta deixar isso explícito para o utilizador no momento do cadastro.

## Fase 4.1 — Ajuste pós-QA: labels visíveis + centralização nos campos de dia

> Feedback do utilizador após testar a Fase 4 no dispositivo: o prefixo "Todo dia" sozinho não deixa claro **qual** data é fechamento e qual é vencimento para quem não desenvolveu a feature — falta contexto. Além disso, o texto digitado dentro do campo não está centralizado verticalmente (fica um pouco acima do centro da caixa).

Isto é uma **excepção pontual** ao padrão placeholder-only da Fase 4 — vale só para os dois campos de dia, os demais campos do formulário (Apelido, Final do número, Banco, Bandeira) continuam sem label visível.

1. **Label visível acima de cada campo de dia:** reintroduzir um rótulo curto e visível encima de cada caixa "Todo dia" — "Fechamento" para `cc-add-close-day` e "Vencimento" (ou "Fatura", a confirmar no ROTEAMENTO) para `cc-add-due-day`. Os campos continuam **lado a lado** (já usam `.cc-form-row2`, grid de 2 colunas — isso não muda), o prefixo "Todo dia" + número continuam dentro da caixa como estão hoje; só falta o texto identificador acima.
2. **Centralização vertical do texto digitado:** corrigir `.cc-day-input`/`.cc-day-field` em `cards.css` (provavelmente `line-height`, `padding` ou `align-items` desalinhados entre o prefixo "Todo dia" e o número digitado) para o texto ficar centrado verticalmente na pill, igual ao prefixo.

**Ficheiros:** `cards.html` (novo texto de label acima de cada `.cc-form-field` da linha de dias), `cards.css` (label + correção de centralização vertical em `.cc-day-field`/`.cc-day-input`).

**Não mexer:** placeholder-only nos outros campos do form (Fase 4), toggle "Outra"/"Outro" (Fases 3/5), carrossel (Fase 2), identidade por banco (Fase 5), nav/FOUC.

## Fase 5 — Identidade visual real (banco + bandeira + cor)

Maior escopo das 5 ideias — estende o **modelo de dados** do cartão.

- Novo campo no formulário: **Banco** (ex.: select com bancos comuns — Nubank, Inter, Mercado Pago, C6, Itaú, Bradesco, Santander, Caixa, BB, "Outro" com texto livre) além da **Bandeira** já existente (Visa/Master/Elo/Amex/Outra).
- Catálogo banco → cor/gradiente + estilo de "skin" (ex.: Nubank = roxo, Inter = laranja, Mercado Pago = azul escuro degradê, Itaú = laranja, etc.) — inspirado nas capturas enviadas (cartão físico Mercado Pago preto com "MERCADO PAGO" em relevo, cartão Inter azul-acinzentado simples, virtuais com faixa "Crédito/Débito VIRTUAL").
- Ícone/logo da bandeira já existe (`ft-card-brands.js`) — mapear para o SVG certo por `brand`; garantir que o ícone do banco (novo) e o ícone da bandeira (já existente) aparecem juntos no cartão sem conflito visual (ex.: nome/logo do banco no topo, bandeira no rodapé — como nas capturas).
- `FTCards.normalizeCard` ganha `bank` (id do catálogo) e talvez `bankLabel` (texto livre se "Outro"); `GRADIENTS` deixa de ser só por `brand` e passa a resolver por `bank` (com fallback no gradiente por bandeira se banco não reconhecido/"Outro").
- Carrossel/detalhes (fatura, limite) continuam iguais — só a "skin" do cartão muda.

**Decisões a confirmar no ROTEAMENTO desta fase (não decidir agora):** lista fechada de bancos vs. só "nome do banco" livre + cor escolhida manualmente pelo utilizador (mais simples, sem manter catálogo); se os desenhos "reais" são recriados em CSS/SVG (sem usar logos de marca registada de terceiros — mesma cautela já usada no atalho do launcher, "sem asset de marca") ou só cores/gradientes fiéis + tipografia, sem reproduzir logotipos oficiais.

**Ficheiros:** `ft-cards.js` (modelo + catálogo de bancos), `ft-card-brands.js` (ajuste de composição), `cards.css` (novas classes de skin por banco), `cards.html`/`cards.js` (campo Banco no formulário).

## Fase 6 — Home/Gastos: "Data do pagamento" para lançamentos retroativos (adiada / backlog)

> Cross-feature: não é Cartões — vive em `src/features/transactions/` (Home / sheet de novo gasto). Registada aqui a pedido do utilizador; **sem ROTEAMENTO ainda** — só entra quando ele decidir avançar ("desenvolveremos depois").

**Objetivo:** hoje, ao registar um gasto, a data gravada (`ft-transactions.js` → campo `at`) é sempre "agora" (`nowIso()`). O utilizador quer poder **escolher a data em que o pagamento aconteceu de verdade** — podendo ser no mês atual, em meses/anos anteriores — para manter um histórico fiel de gastos já feitos. Caso de uso citado: apoio à declaração de Imposto de Renda (lançar retroativamente algo que já ocorreu, sem perder o registo por data real).

**Como deve funcionar:**

- Novo campo de data no formulário de novo gasto (`#expense-sheet`, `home.html`/`home.js`, ou no sheet lateral de `gastos.html` — confirmar qual é o formulário "oficial" hoje antes de implementar).
- Regra de calendário mundial (dia válido dentro do mês/ano escolhido — considerar ano bissexto para fevereiro; aqui já existe mês **e** ano, diferente do campo recorrente "Todo dia" dos cartões).
- **Limite superior:** não permitir data futura (só passado ou hoje) — a ser confirmado no ROTEAMENTO desta fase.
- **Limite inferior:** a definir (sem limite / ou até X anos atrás, por causa da relevância de IR — normalmente 5 anos). Decidir quando esta fase for aberta.
- Se o campo não for preenchido, manter o comportamento atual (data = agora).
- Não confundir com `receiptDate`/`receiptTime` (já existentes, vindos do OCR do comprovativo escaneado) — são conceitos próximos mas não necessariamente o mesmo campo; decidir no ROTEAMENTO se unificam ou ficam separados.

**Não mexer:** Cartões (Fases 2–5 acima), nav/FOUC, `ft-friend://`, atalho "Novo gasto" (planner `launcher-shortcuts-planner.md`).

**Ficheiros prováveis:** `src/features/transactions/home.js`/`home.html` (ou `gastos.js`/`gastos.html`), `src/features/transactions/ft-transactions.js` (`buildTxFromItem` passa a aceitar `at` explícito e validado).

## Fases

| Fase | Tipo | O quê | Ficheiros |
|------|------|--------|-----------|
| **1** | Arquitetura | Este planner | `.agents/plans/cards-visual-planner.md` |
| **2** | Bug fix / UI | Simetria do carrossel (peek esquerda = peek direita) | `cards.js` |
| **3** | Implementação UI + dados | Bandeira "Outra" → texto livre | `cards.html`, `cards.js`, `ft-cards.js`, `ft-card-brands.js` |
| **4** | UX do formulário | "Apelido", placeholder-only, prefixo "Todo dia" | `cards.html`, `cards.css`, `cards.js` |
| **4.1** ✅ | Ajuste pós-QA | Label visível (Fechamento/Vencimento) + centralização vertical nos campos de dia | `cards.html`, `cards.css` |
| **5** | Modelo de dados + visual | Identidade por banco (skin real) | `ft-cards.js`, `ft-card-brands.js`, `cards.css`, `cards.html`, `cards.js` |
| **6** | Cross-feature, **adiada** | Home/Gastos: campo "Data do pagamento" retroativo | `home.js`/`home.html` ou `gastos.js`/`gastos.html`, `ft-transactions.js` |

Depois de cada fase: validar no browser (não depende de nativo/Capacitor — Cartões é 100% web/session storage) e, se fizer sentido, `cap:sync` + instalar no USB para conferir em tamanho real.

## Critério de aceite

1. Com 2+ cartões, o cartão ativo mostra **ambos** os vizinhos parcialmente visíveis (quando existirem), em padrão simétrico esquerda/direita — não só à direita.
2. Selecionar "Outra" bandeira revela um campo de texto; o texto digitado aparece no badge da bandeira no cartão.
3. Formulário de cartão: nenhum `<label>` fixo acima dos campos (**excepto os dois campos de dia da Fase 4.1**, que precisam de rótulo visível "Fechamento"/"Vencimento" para não ficarem ambíguos) — os demais mostram o rótulo como placeholder que desaparece ao digitar; campo antes chamado "Nome no cartão" agora diz "Apelido"; campos de dia mostram label + "Todo dia" + número, texto centralizado verticalmente na caixa.
4. Cada cartão exibe uma identidade visual reconhecível (cor/estilo por banco escolhido), com o ícone da bandeira correta no rodapé — sem usar logotipos de marca de terceiros (recriação própria, como já feito para bandeiras).
5. Nenhuma regressão em: fatura/limite/datas do cartão ativo, lista de lançamentos, nav/FOUC, `ft-friend://`, atalho "Novo gasto".
6. Campos "Todo dia" (fechamento/vencimento) recusam valores fora de 1–31 com aviso inline (não `alert()`), coerente com o padrão placeholder-only.
7. (Fase 6, quando aberta) Um gasto pode ser registado com data no passado; datas futuras são recusadas com aviso; a fatura/relatórios que dependem de `at` continuam corretos com a nova data.

## ROTEAMENTO sugerido (próximas fases)

- **Fase 2:** bug fix isolado em JS/CSS → Sonnet, **effort low/medium**. Pode continuar na mesma thread se o contexto ainda estiver baixo.
- **Fase 3:** pequeno campo condicional + 1 novo dado no modelo → Sonnet, **effort medium**.
- **Fase 4:** só UI/UX (CSS + pequenos ajustes JS/HTML), sem lógica nova → Sonnet, **effort low/medium**.
- **Fase 4.1:** ajuste pontual de 2 campos (label + CSS de centralização) → Sonnet, **effort low**. Pode continuar na mesma thread se o contexto ainda estiver baixo.
- **Fase 5:** maior escopo (novo campo de dados, catálogo de bancos, composição visual) → Sonnet **effort medium/high** ou Opus se o catálogo/design ficar complexo; considerar **chat novo**.
- **Fase 6 (Home — data retroativa):** **adiada**, sem ROTEAMENTO ainda. Quando o utilizador pedir para avançar: provavelmente Sonnet **effort medium** (novo campo + validação de calendário), mas confirmar primeiro qual formulário é o "oficial" (`home.js` vs `gastos.js`) antes de rotear — pode exigir uma mini-investigação prévia.

Ver `@.agents/claude-context.md`. Não implementar código até o utilizador colar o prompt de **AÇÃO** de cada fase.
