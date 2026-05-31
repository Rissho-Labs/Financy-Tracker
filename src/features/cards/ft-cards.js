/**
 * Cartões de crédito — cache de sessão (zerados ao reiniciar o app).
 * Quando o banco estiver pronto, altere SESSION_ONLY para false.
 */
(function (global) {
  'use strict';

  var KEY = 'ft_cards';
  var SESSION_FLAG = 'ft_app_session';
  var SESSION_ONLY = true;
  var _sessionMem = null;

  var GRADIENTS = {
    visa: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
    master: 'linear-gradient(135deg, #F97316, #EA580C)',
    elo: 'linear-gradient(135deg, #1F2937, #111827)',
    amex: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
    other: 'linear-gradient(135deg, #6366f1, #4338ca)'
  };

  function resetSessionStore() {
    _sessionMem = [];
    try {
      sessionStorage.removeItem(KEY);
      localStorage.removeItem(KEY);
    } catch (e) { /* ignore */ }
  }

  function beginNewAppSession() {
    resetSessionStore();
  }

  function isDemoSeed(card) {
    var id = String(card && card.id || '');
    return id === 'c1' || id === 'c2' || id === 'c3' || id.indexOf('card_seed_') === 0;
  }

  function clearDemoSeeds() {
    var list = load();
    if (!list.length) return;
    var filtered = list.filter(function (c) {
      return !isDemoSeed(c);
    });
    if (filtered.length !== list.length) save(filtered);
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

  function load() {
    if (SESSION_ONLY) {
      ensureAppSession();
      if (_sessionMem === null) {
        try {
          var raw = sessionStorage.getItem(KEY);
          _sessionMem = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(_sessionMem)) _sessionMem = [];
        } catch (e) {
          _sessionMem = [];
        }
      }
      return _sessionMem.slice();
    }
    try {
      var stored = localStorage.getItem(KEY);
      if (!stored) return [];
      var arr = JSON.parse(stored);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    if (SESSION_ONLY) {
      ensureAppSession();
      _sessionMem = (list || []).slice();
      try {
        sessionStorage.setItem(KEY, JSON.stringify(_sessionMem));
      } catch (e) { /* ignore */ }
      return;
    }
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  if (SESSION_ONLY) ensureAppSession();

  function normalizeDay(value) {
    var n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) return null;
    if (n > 31) return 31;
    return n;
  }

  function normalizeCard(card) {
    return {
      id: card.id,
      name: String(card.name || card.holderName || '').trim() || 'Meu cartão',
      holderName: String(card.holderName || card.name || '').trim() || 'Titular',
      last4: String(card.last4 || '').replace(/\D/g, '').slice(-4).padStart(4, '0'),
      brand: card.brand in GRADIENTS ? card.brand : 'other',
      closingDay: normalizeDay(card.closingDay),
      dueDay: normalizeDay(card.dueDay)
    };
  }

  function getAll() {
    clearDemoSeeds();
    return load().map(normalizeCard);
  }

  function add(card) {
    var list = getAll();
    var normalized = normalizeCard(Object.assign({}, card, {
      id: 'c_' + Date.now()
    }));
    list.push(normalized);
    save(list);
    return list;
  }

  global.FTCards = {
    getAll: getAll,
    add: add,
    normalizeDay: normalizeDay,
    normalizeCard: normalizeCard,
    gradients: GRADIENTS,
    resetSessionStore: resetSessionStore,
    beginNewAppSession: beginNewAppSession,
    clearDemoSeeds: clearDemoSeeds,
    isSessionOnly: function () { return SESSION_ONLY; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
