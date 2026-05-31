/**
 * Parser de recibos/notas brasileiras.
 * Recebe texto bruto do ML Kit OCR e retorna { name, amountCents, category }.
 */
(function (global) {
  'use strict';

  // Palavras-chave de totais encontrados em cupons fiscais brasileiros
  var TOTAL_PATTERNS = [
    /total\s+a?\s*pagar[:\s]+R?\$?\s*([\d.,]+)/i,
    /valor\s+total[:\s]+R?\$?\s*([\d.,]+)/i,
    /total\s+geral[:\s]+R?\$?\s*([\d.,]+)/i,
    /total[:\s]+R?\$?\s*([\d.,]+)/i,
    /vl\s*total[:\s]+R?\$?\s*([\d.,]+)/i,
    /\bTOTAL\b.*?R?\$?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i,
  ];

  // Padrões que NÃO são o total (subtotal, descontos etc.)
  var IGNORE_TOTAL = /desconto|subtotal|troco|dinheiro|cartao|cartão|taxa|acrescimo|acréscimo/i;

  // Categorias por palavras-chave no nome do estabelecimento ou itens
  var CATEGORY_KEYWORDS = {
    food:          /supermercado|mercado|padaria|acougue|açougue|hortifruti|restaurante|lanchonete|ifood|pizza|burger|cafe|café|bar |bistro|sushi|pizza|sorvete|doce|confeitaria|panificadora/i,
    transport:     /posto|combustivel|combustível|gasolina|etanol|diesel|uber|99|taxi|táxi|estacionamento|pedágio|pedagio|auto\s*peças|autopeças/i,
    subscriptions: /netflix|spotify|amazon|disney|hbo|paramount|globo\s*play|apple|youtube|prime/i,
    shopping:      /magazine|lojas|loja|shopping|americanas|renner|riachuelo|c&a|zara|hm|h&m|marisa|pernambucanas|shein|temu/i,
    services:      /farmácia|farmacia|drogaria|droga|hospital|clinica|clínica|dentist|médico|medico|laboratório|laboratorio|academia|salão|salao|barbearia/i,
  };

  function parseBRLtoCents(raw) {
    if (!raw) return NaN;
    var s = String(raw).trim();
    // Ex: "1.234,56" → 123456 | "234,56" → 23456 | "234.56" → 23456
    if (/^\d{1,3}(\.\d{3})+(,\d{2})?$/.test(s)) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (/^\d+(,\d{2})$/.test(s)) {
      s = s.replace(',', '.');
    }
    var n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(n * 100) : NaN;
  }

  function extractTotal(lines) {
    // 1ª passagem: procura padrões explícitos de total
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (IGNORE_TOTAL.test(line)) continue;
      for (var p = 0; p < TOTAL_PATTERNS.length; p++) {
        var m = line.match(TOTAL_PATTERNS[p]);
        if (m) {
          var cents = parseBRLtoCents(m[1]);
          if (!isNaN(cents) && cents > 0) return cents;
        }
      }
    }
    // 2ª passagem: maior valor numérico encontrado (heurística)
    var biggest = 0;
    var rValue = /R?\$?\s*([\d]{1,3}(?:[.,]\d{3})*[.,]\d{2})/g;
    var fullText = lines.join('\n');
    var match;
    while ((match = rValue.exec(fullText)) !== null) {
      var c = parseBRLtoCents(match[1]);
      if (!isNaN(c) && c > biggest) biggest = c;
    }
    return biggest > 0 ? biggest : NaN;
  }

  function extractName(lines) {
    // Nome do estabelecimento costuma estar nas primeiras linhas não-numéricas
    for (var i = 0; i < Math.min(6, lines.length); i++) {
      var line = lines[i].trim();
      // Pula linhas que são só números, datas, CNPJ ou vazias
      if (!line) continue;
      if (/^\d[\d.\/\-\s]*$/.test(line)) continue;
      if (/cnpj|cpf|ie:|insc/i.test(line)) continue;
      if (line.length < 3) continue;
      // Limpa caracteres estranhos mas preserva o texto
      var clean = line.replace(/[^a-záàâãéèêíïóôõöúüçñA-Z0-9\s&'.\-]/g, '').trim();
      if (clean.length >= 3) return clean;
    }
    return 'Gasto registrado por foto';
  }

  function extractCategory(text) {
    var t = text.toLowerCase();
    var cats = Object.keys(CATEGORY_KEYWORDS);
    for (var i = 0; i < cats.length; i++) {
      if (CATEGORY_KEYWORDS[cats[i]].test(t)) return cats[i];
    }
    return 'other';
  }

  function parse(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return { name: 'Gasto registrado por foto', amountCents: NaN, category: 'other' };
    }
    var lines = rawText.split(/\n|\r/).map(function (l) { return l.trim(); }).filter(Boolean);
    var amountCents = extractTotal(lines);
    var name = extractName(lines);
    var category = extractCategory(rawText);
    return { name: name, amountCents: amountCents, category: category };
  }

  global.FTReceiptParser = { parse: parse };

})(typeof window !== 'undefined' ? window : globalThis);
