/**
 * Leitura de notas via DeepSeek (Cloud Function ou chave local em deepseek-config.js).
 * Fallback: ML Kit OCR + FTReceiptParser.
 */
(function (global) {
  'use strict';

  var RECEIPT_SYSTEM =
    'Você extrai dados de documentos de gasto brasileiros: notas fiscais, cupons, boletos, contas (água, luz, telefone), ' +
    'DAS MEI, DARF, GPS, guias de arrecadação do Simples Nacional, comprovantes de pagamento tributário e PGDAS-D. ' +
    'Responda SOMENTE JSON: {"isValidReceipt":true,"establishment":"","date":"YYYY-MM-DD","time":"HH:MM","amountCents":0,"paymentMethod":"pix|dinheiro|debito|credito|credito_parcelado|","installments":1,"category":"food|shopping|transport|subscriptions|services|other|""}. ' +
    'Para DAS MEI use establishment como "DAS MEI" ou "Simples Nacional (MEI)" e category "services". ' +
    'amountCents = valor total do documento em centavos (ex: R$ 75,90 → 7590). ' +
    'Use isValidReceipt:true para DAS, boletos e guias tributárias válidas. ' +
    'Use isValidReceipt:false apenas se NÃO for documento financeiro (selfie, paisagem, meme, tela irrelevante).';

  function getLocalApiKey() {
    try {
      if (global.FTDEEPSEEK && global.FTDEEPSEEK.apiKey) {
        return String(global.FTDEEPSEEK.apiKey).trim();
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  function parseJsonContent(content) {
    if (!content) return null;
    var text = String(content).trim();
    var fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) text = fence[1].trim();
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return emptyResult();
    var pay = String(raw.paymentMethod || '').toLowerCase();
    var validPay = ['pix', 'dinheiro', 'debito', 'credito', 'credito_parcelado'];
    if (validPay.indexOf(pay) === -1) pay = '';
    var inst = Math.max(1, Math.round(Number(raw.installments) || 1));
    if (pay !== 'credito_parcelado') inst = 1;
    var cats = ['food', 'shopping', 'transport', 'subscriptions', 'services', 'other'];
    var cat = String(raw.category || '').toLowerCase();
    if (cats.indexOf(cat) === -1) cat = '';
    return {
      isValidReceipt: raw.isValidReceipt !== false,
      establishment: String(raw.establishment || raw.name || '').trim(),
      date: String(raw.date || '').trim(),
      time: String(raw.time || '').trim(),
      amountCents: Math.max(0, Math.round(Number(raw.amountCents) || 0)),
      paymentMethod: pay,
      installments: inst,
      category: cat,
      provider: 'deepseek',
    };
  }

  function emptyResult() {
    return {
      isValidReceipt: false,
      establishment: '',
      date: '',
      time: '',
      amountCents: 0,
      paymentMethod: '',
      installments: 1,
      category: '',
      provider: 'none',
    };
  }

  function fromLegacyParser(ocrText) {
    if (typeof global.FTReceiptParser === 'undefined') return emptyResult();
    var p = global.FTReceiptParser.parse(ocrText || '');
    return {
      isValidReceipt: !!(p.amountCents > 0 && p.name && p.name.indexOf('escaneamento') < 0),
      establishment: p.name || '',
      date: '',
      time: '',
      amountCents: Number.isFinite(p.amountCents) ? p.amountCents : 0,
      paymentMethod: '',
      installments: 1,
      category: p.category || '',
      provider: 'mlkit',
    };
  }

  function buildAtIso(dateStr, timeStr) {
    if (!dateStr) return new Date().toISOString();
    var time = timeStr && /^\d{1,2}:\d{2}/.test(timeStr) ? timeStr : '12:00';
    var parts = dateStr.split('-');
    if (parts.length < 3) return new Date().toISOString();
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]),
      Number(time.split(':')[0]), Number(time.split(':')[1] || 0));
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  async function callDeepSeekDirect(apiKey, ocrText, imageBase64, imageMime) {
    var mime = imageMime || 'image/jpeg';
    var userContent;
    var hint = 'Extraia os dados deste documento de gasto brasileiro (nota, boleto, DAS MEI, conta ou comprovante).\nTexto/OCR:\n' + (ocrText || '(vazio)');

    if (imageBase64 && mime.indexOf('image/') === 0) {
      userContent = [
        { type: 'text', text: hint },
        { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + imageBase64 } },
      ];
    } else {
      userContent = hint;
    }

    var res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: RECEIPT_SYSTEM },
          { role: 'user', content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 512,
      }),
    });

    if (!res.ok) throw new Error('deepseek_http_' + res.status);
    var data = await res.json();
    var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return normalize(parseJsonContent(content));
  }

  async function analyze(ocrText, imageBase64, imageMime) {
    if (typeof global.FTFirebase !== 'undefined' &&
        typeof global.FTFirebase.callAnalyzeReceipt === 'function' &&
        typeof global.FTFirebase.isReady === 'function' &&
        global.FTFirebase.isReady()) {
      try {
        var cloud = await global.FTFirebase.callAnalyzeReceipt(ocrText || '', imageBase64 || '');
        if (cloud) return normalize(cloud);
      } catch (e) {
        console.warn('[DeepSeekReceipt] Cloud Function failed', e.message || e);
      }
    }

    var apiKey = getLocalApiKey();
    if (apiKey) {
      try {
        return await callDeepSeekDirect(apiKey, ocrText, imageBase64, imageMime);
      } catch (e) {
        console.warn('[DeepSeekReceipt] Direct API failed', e.message || e);
      }
    }

    return fromLegacyParser(ocrText);
  }

  global.FTDeepSeekReceipt = {
    analyze: analyze,
    buildAtIso: buildAtIso,
    normalize: normalize,
    emptyResult: emptyResult,
  };
})(typeof window !== 'undefined' ? window : globalThis);
