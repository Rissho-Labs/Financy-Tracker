/**
 * Gastos (apenas saídas).
 * SESSION_ONLY: dados só na sessão atual — zerados a cada reload/start do app.
 * Quando o banco estiver pronto, altere SESSION_ONLY para false.
 */
(function (global) {
  'use strict';

  var KEY = 'ft_transactions';
  var SESSION_FLAG = 'ft_app_session';
  /** true = temporário (sessão); false = localStorage + Firestore */
  var SESSION_ONLY = true;
  var _sessionMem = null;

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

  function resetSessionStore() {
    _sessionMem = [];
    try {
      sessionStorage.removeItem(KEY);
      sessionStorage.removeItem(SESSION_FLAG);
      localStorage.removeItem(KEY);
    } catch (e) { /* ignore */ }
  }

  function beginNewAppSession() {
    resetSessionStore();
  }

  function ensureAppSession() {
    if (!SESSION_ONLY) return;
    try {
      localStorage.removeItem(KEY);
      if (!sessionStorage.getItem(SESSION_FLAG)) {
        sessionStorage.removeItem(KEY);
        _sessionMem = [];
        sessionStorage.setItem(SESSION_FLAG, '1');
      }
    } catch (e) {
      _sessionMem = [];
    }
  }

  function loadRaw() {
    if (SESSION_ONLY) {
      ensureAppSession();
      if (_sessionMem === null) {
        try {
          var sessionRaw = sessionStorage.getItem(KEY);
          _sessionMem = sessionRaw ? JSON.parse(sessionRaw) : [];
          if (!Array.isArray(_sessionMem)) _sessionMem = [];
        } catch (e) {
          _sessionMem = [];
        }
      }
      return _sessionMem.slice();
    }
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
    if (SESSION_ONLY) {
      ensureAppSession();
      _sessionMem = migrateDropIncome(list || []).slice();
      try {
        sessionStorage.setItem(KEY, JSON.stringify(_sessionMem));
      } catch (e) { /* ignore */ }
      return;
    }
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  if (SESSION_ONLY) ensureAppSession();

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
    var pay = t.paymentMethod != null ? String(t.paymentMethod) : 'pix';
    if (pay === '' && !t.hasReceiptReport) pay = 'pix';
    var inst = Math.max(1, Math.round(Number(t.installments)) || 1);
    if (pay !== 'credito_parcelado') inst = 1;
    var idx = Math.max(1, Math.round(Number(t.installmentIndex)) || 1);
    if (idx > inst) idx = inst;
    var cat = t.category && CATEGORY_META[t.category] ? t.category : guessCategory(t.name);
    var loc = t.location != null && String(t.location).trim() !== '' ? String(t.location).trim() : String(t.name || '').trim();
    var hasReceipt = !!(t.hasReceiptReport || t.receiptImageUrl || t.receiptImageData);
    return {
      id: t.id,
      name: String(t.name || '').trim(),
      location: loc,
      amountCents: Math.max(0, Math.round(Number(t.amountCents) || 0)),
      type: t.type || 'expense',
      paymentMethod: pay,
      category: cat,
      installments: inst,
      installmentIndex: idx,
      cardId: t.cardId || null,
      at: t.at || nowIso(),
      hasReceiptReport: hasReceipt,
      receiptImageUrl: t.receiptImageUrl || null,
      receiptImageData: t.receiptImageData || null,
      receiptDate: t.receiptDate != null ? String(t.receiptDate) : '',
      receiptTime: t.receiptTime != null ? String(t.receiptTime) : '',
      ocrProvider: t.ocrProvider || null
    };
  }

  function isDemoSeed(t) {
    return !!(t && String(t.id || '').startsWith('tx_seed_'));
  }

  /** Remove transações de demonstração (Apple Store, iFood, etc.) do cache local. */
  function clearDemoSeeds() {
    var list = loadRaw();
    if (!list || !list.length) return;
    var filtered = list.filter(function (t) {
      return !isDemoSeed(t);
    });
    if (filtered.length !== list.length) saveAll(filtered);
  }

  function getAll() {
    clearDemoSeeds();
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
    if (!key) return '—';
    return PAYMENT_LABELS[key] || key || '—';
  }

  function _currentUid() {
    try {
      var u = (typeof FTSession !== 'undefined') ? FTSession.parseUser() : null;
      return (u && u.uid) ? String(u.uid) : null;
    } catch (e) { return null; }
  }

  function _firebaseReady() {
    try {
      return typeof FTFirebase !== 'undefined' && typeof FTFirebase.isReady === 'function' && FTFirebase.isReady();
    } catch (e) { return false; }
  }

  function getById(id) {
    var list = getAll();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function buildTxFromItem(item) {
    var inst = item.installments != null ? Math.max(1, Math.round(Number(item.installments))) : 1;
    if ((item.paymentMethod || 'pix') !== 'credito_parcelado') inst = 1;
    var idx = item.installmentIndex != null ? Math.max(1, Math.round(Number(item.installmentIndex))) : 1;
    if (idx > inst) idx = inst;
    return {
      id: item.id || ('tx_' + Date.now()),
      name: String(item.name || '').trim(),
      location: item.location != null ? String(item.location).trim() : '',
      amountCents: Math.max(0, Math.round(Number(item.amountCents) || 0)),
      type: 'expense',
      paymentMethod: item.paymentMethod || 'pix',
      cardId: item.cardId || null,
      installments: inst,
      installmentIndex: idx,
      category: item.category && CATEGORY_META[item.category] ? item.category : guessCategory(item.name),
      at: item.at || nowIso(),
      hasReceiptReport: !!item.hasReceiptReport,
      receiptImageUrl: item.receiptImageUrl || null,
      receiptImageData: item.receiptImageData || null,
      receiptDate: item.receiptDate != null ? String(item.receiptDate) : '',
      receiptTime: item.receiptTime != null ? String(item.receiptTime) : '',
      ocrProvider: item.ocrProvider || null
    };
  }

  function _syncTx(uid, tx, method) {
    if (SESSION_ONLY) return;
    if (!uid || !_firebaseReady()) return;
    var fn = method === 'update' ? FTFirebase.updateTransaction : FTFirebase.addTransaction;
    var payload = Object.assign({}, tx);
    delete payload.receiptImageData;
    fn(uid, payload).catch(function (e) {
      console.warn('[FTTransactions] Firestore ' + method + ' failed', e);
    });
  }

  function add(item) {
    var list = loadRaw() || [];
    list = migrateDropIncome(list);
    var newTx = buildTxFromItem(item);
    if (!item.id) newTx.id = 'tx_' + Date.now();
    list.unshift(newTx);
    saveAll(list);

    var uid = _currentUid();
    if (uid) _syncTx(uid, newTx, 'add');

    return getAll();
  }

  function update(id, patch) {
    var list = migrateDropIncome(loadRaw() || []);
    var found = false;
    var updated = null;
    list = list.map(function (t) {
      if (t.id !== id) return t;
      found = true;
      updated = ensureTransaction(Object.assign({}, t, patch, { id: t.id }));
      return updated;
    });
    if (!found) return getAll();
    saveAll(list);

    var uid = _currentUid();
    if (uid && updated) _syncTx(uid, updated, 'update');

    return getAll();
  }

  function remove(id) {
    var list = migrateDropIncome(loadRaw() || []).filter(function (t) {
      return t.id !== id;
    });
    saveAll(list);

    var uid = _currentUid();
    if (uid && !SESSION_ONLY && _firebaseReady()) {
      FTFirebase.deleteTransaction(uid, id).catch(function (e) {
        console.warn('[FTTransactions] Firestore delete failed', e);
      });
    }

    return getAll();
  }

  function syncFromFirestore(uid) {
    if (SESSION_ONLY) return Promise.resolve(false);
    if (!uid || !_firebaseReady()) return Promise.resolve(false);
    return FTFirebase.loadTransactions(uid).then(function (rows) {
      if (!Array.isArray(rows)) return false;
      clearDemoSeeds();
      var localList = migrateDropIncome(loadRaw() || []).filter(function (t) {
        return !isDemoSeed(t);
      });
      if (rows.length === 0) {
        saveAll(localList);
        return true;
      }
      var firestoreIds = {};
      rows.forEach(function (r) { if (r && r.id) firestoreIds[r.id] = true; });
      var localOnly = localList.filter(function (t) { return !firestoreIds[t.id]; });
      saveAll(rows.concat(localOnly));
      return true;
    }).catch(function (e) {
      console.warn('[FTTransactions] syncFromFirestore failed', e);
      return false;
    });
  }

  global.FTTransactions = {
    KEY: KEY,
    getAll: getAll,
    getById: getById,
    add: add,
    update: update,
    remove: remove,
    syncFromFirestore: syncFromFirestore,
    clearDemoSeeds: clearDemoSeeds,
    resetSessionStore: resetSessionStore,
    beginNewAppSession: beginNewAppSession,
    isSessionOnly: function () { return SESSION_ONLY; },
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
