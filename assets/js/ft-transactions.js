/**
 * Gastos (apenas saídas) em localStorage — ft_transactions
 */
(function (global) {
  'use strict';

  var KEY = 'ft_transactions';

  var CATEGORY_META = {
    food: { label: 'Alimentação', icon: '🍔', stroke: '#10B981' },
    shopping: { label: 'Compras', icon: '🛍️', stroke: '#6C63FF' },
    transport: { label: 'Transporte', icon: '🚗', stroke: '#3B82F6' },
    subscriptions: { label: 'Assinaturas', icon: '📱', stroke: '#8B5CF6' },
    services: { label: 'Serviços', icon: '⚙️', stroke: '#F59E0B' },
    other: { label: 'Outros', icon: '📌', stroke: '#94A3B8' }
  };

  var PAYMENT_LABELS = {
    pix: 'Pix',
    dinheiro: 'Dinheiro',
    debito: 'Débito',
    credito: 'Crédito',
    credito_parcelado: 'Crédito parcelado'
  };

  function nowIso() {
    return new Date().toISOString();
  }

  function loadRaw() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : null;
    } catch (e) {
      return null;
    }
  }

  function saveAll(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function migrateDropIncome(list) {
    return list.filter(function (t) {
      return t.type !== 'income';
    });
  }

  function guessCategory(name) {
    var n = String(name || '').toLowerCase();
    if (/ifood|uber\s*eats|padaria|mercado|supermercado|restaurante|café|cafe|alimenta|comida/.test(n)) return 'food';
    if (/apple|amazon|magazine|shopping|loja|store|mercado\s+livre/.test(n)) return 'shopping';
    if (/spotify|netflix|assinatura|prime|disney|hbo|paramount/.test(n)) return 'subscriptions';
    if (/uber(?!\s*eats)|99|taxi|metro|ônibus|onibus|combust[ií]vel|posto|estaciona/.test(n)) return 'transport';
    if (/luz|água|agua|internet|telefone|condom[ií]nio|servi[cç]o/.test(n)) return 'services';
    return 'other';
  }

  function ensureTransaction(t) {
    var inst = Math.max(1, Math.round(Number(t.installments)) || 1);
    if ((t.paymentMethod || 'pix') !== 'credito_parcelado') inst = 1;
    var idx = Math.max(1, Math.round(Number(t.installmentIndex)) || 1);
    if (idx > inst) idx = inst;
    var cat = t.category && CATEGORY_META[t.category] ? t.category : guessCategory(t.name);
    var loc = t.location != null && String(t.location).trim() !== '' ? String(t.location).trim() : String(t.name || '').trim();
    return {
      id: t.id,
      name: String(t.name || '').trim(),
      location: loc,
      amountCents: Math.max(0, Math.round(Number(t.amountCents) || 0)),
      type: t.type || 'expense',
      paymentMethod: t.paymentMethod || 'pix',
      category: cat,
      installments: inst,
      installmentIndex: idx,
      cardId: t.cardId || null,
      at: t.at || nowIso()
    };
  }

  function seedIfEmpty() {
    var existing = loadRaw();
    if (existing && existing.length) {
      var m = migrateDropIncome(existing);
      if (m.length !== existing.length) saveAll(m);
      return;
    }
    var d = new Date();
    var y = d.getFullYear();
    var mo = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var seed = [
      {
        id: 'tx_seed_1',
        name: 'Apple Store',
        location: 'Shopping Morumbi',
        amountCents: 29900,
        type: 'expense',
        category: 'shopping',
        paymentMethod: 'credito_parcelado',
        installments: 12,
        installmentIndex: 1,
        at: y + '-' + mo + '-' + day + 'T14:32:00'
      },
      {
        id: 'tx_seed_3',
        name: 'iFood',
        location: 'App iFood',
        amountCents: 7850,
        type: 'expense',
        category: 'food',
        paymentMethod: 'pix',
        installments: 1,
        installmentIndex: 1,
        at: y + '-' + mo + '-30T20:15:00'
      },
      {
        id: 'tx_seed_4',
        name: 'Spotify',
        location: 'Assinatura digital',
        amountCents: 2190,
        type: 'expense',
        category: 'subscriptions',
        paymentMethod: 'credito',
        installments: 1,
        installmentIndex: 1,
        at: y + '-' + mo + '-28T12:00:00'
      }
    ];
    saveAll(seed);
  }

  function getAll() {
    seedIfEmpty();
    return migrateDropIncome(loadRaw() || []).map(ensureTransaction);
  }

  /** Soma dos gastos (expense) no mês corrente (calendário local) */
  function monthExpenseTotalCents() {
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    return getAll().reduce(function (acc, t) {
      if (t.type !== 'expense') return acc;
      var d = new Date(t.at);
      if (d.getFullYear() === y && d.getMonth() === m) return acc + (t.amountCents || 0);
      return acc;
    }, 0);
  }

  function atToMs(iso) {
    var ms = new Date(iso).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }

  /** Limites do mês local (início 00:00 primeiro dia, fim último ms do último dia). */
  function monthRangeMs(year, monthIndex0) {
    var from = new Date(year, monthIndex0, 1, 0, 0, 0, 0).getTime();
    var to = new Date(year, monthIndex0 + 1, 0, 23, 59, 59, 999).getTime();
    return { fromMs: from, toMs: to };
  }

  /** Intervalo inclusive por strings yyyy-mm-dd (local). */
  function customRangeMs(fromYmd, toYmd) {
    if (!fromYmd || !toYmd) return { fromMs: null, toMs: null };
    var a = fromYmd.split('-');
    var b = toYmd.split('-');
    if (a.length < 3 || b.length < 3) return { fromMs: null, toMs: null };
    var from = new Date(Number(a[0]), Number(a[1]) - 1, Number(a[2]), 0, 0, 0, 0).getTime();
    var to = new Date(Number(b[0]), Number(b[1]) - 1, Number(b[2]), 23, 59, 59, 999).getTime();
    if (from > to) {
      var tmp = from;
      from = new Date(Number(b[0]), Number(b[1]) - 1, Number(b[2]), 0, 0, 0, 0).getTime();
      to = new Date(Number(a[0]), Number(a[1]) - 1, Number(a[2]), 23, 59, 59, 999).getTime();
    }
    return { fromMs: from, toMs: to };
  }

  /**
   * Um passe O(n). Lista já normalizada (getAll).
   * opts: { fromMs?, toMs?, paymentMethod? } — paymentMethod 'all' ou chave PAYMENT_LABELS.
   */
  function filterTransactions(list, opts) {
    opts = opts || {};
    var fromMs = opts.fromMs;
    var toMs = opts.toMs;
    var pay = opts.paymentMethod || 'all';
    var out = [];
    var i;
    var len = list.length;
    for (i = 0; i < len; i++) {
      var t = list[i];
      if (t.type && t.type !== 'expense') continue;
      var ms = atToMs(t.at);
      if (fromMs != null && ms < fromMs) continue;
      if (toMs != null && ms > toMs) continue;
      if (pay !== 'all' && (t.paymentMethod || 'pix') !== pay) continue;
      out.push(t);
    }
    return out;
  }

  function sortByAtDesc(arr) {
    return arr.slice().sort(function (a, b) {
      return atToMs(b.at) - atToMs(a.at);
    });
  }

  function categoryMeta(slug) {
    return CATEGORY_META[slug] || CATEGORY_META.other;
  }

  function paymentLabel(key) {
    return PAYMENT_LABELS[key] || key || '—';
  }

  function add(item) {
    var list = loadRaw() || [];
    list = migrateDropIncome(list);
    var inst = item.installments != null ? Math.max(1, Math.round(Number(item.installments))) : 1;
    if ((item.paymentMethod || 'pix') !== 'credito_parcelado') inst = 1;
    var idx = item.installmentIndex != null ? Math.max(1, Math.round(Number(item.installmentIndex))) : 1;
    if (idx > inst) idx = inst;
    list.unshift({
      id: 'tx_' + Date.now(),
      name: String(item.name || '').trim(),
      location: item.location != null ? String(item.location).trim() : '',
      amountCents: Math.max(0, Math.round(Number(item.amountCents) || 0)),
      type: 'expense',
      paymentMethod: item.paymentMethod || 'pix',
      cardId: item.cardId || null,
      installments: inst,
      installmentIndex: idx,
      category: item.category && CATEGORY_META[item.category] ? item.category : guessCategory(item.name),
      at: item.at || nowIso()
    });
    saveAll(list);
    return getAll();
  }

  function remove(id) {
    var list = migrateDropIncome(loadRaw() || []).filter(function (t) {
      return t.id !== id;
    });
    saveAll(list);
    return getAll();
  }

  global.FTTransactions = {
    KEY: KEY,
    getAll: getAll,
    add: add,
    remove: remove,
    seedIfEmpty: seedIfEmpty,
    monthExpenseTotalCents: monthExpenseTotalCents,
    filterTransactions: filterTransactions,
    sortByAtDesc: sortByAtDesc,
    monthRangeMs: monthRangeMs,
    customRangeMs: customRangeMs,
    categoryMeta: categoryMeta,
    paymentLabel: paymentLabel,
    CATEGORY_META: CATEGORY_META,
    PAYMENT_LABELS: PAYMENT_LABELS
  };
})(typeof window !== 'undefined' ? window : globalThis);
