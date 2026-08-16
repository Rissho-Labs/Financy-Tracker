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

  /** Catálogo banco → cor/gradiente + nome de exibição (sem logotipos de terceiros). */
  var BANKS = {
    nubank: { label: 'Nubank', gradient: 'linear-gradient(135deg, #A653FF, #7A1FD1)' },
    inter: { label: 'Inter', gradient: 'linear-gradient(135deg, #FF8C3D, #FF6B00)' },
    mercadopago: { label: 'Mercado Pago', gradient: 'linear-gradient(135deg, #1E3A5F, #08131F)' },
    c6: { label: 'C6 Bank', gradient: 'linear-gradient(135deg, #3D3D3D, #121212)' },
    itau: { label: 'Itaú', gradient: 'linear-gradient(135deg, #FF9433, #EC7000)' },
    bradesco: { label: 'Bradesco', gradient: 'linear-gradient(135deg, #E4002B, #8C0019)' },
    santander: { label: 'Santander', gradient: 'linear-gradient(135deg, #EC0000, #900000)' },
    caixa: { label: 'Caixa', gradient: 'linear-gradient(135deg, #1E6FD9, #0B3B87)' },
    bb: { label: 'Banco do Brasil', gradient: 'linear-gradient(135deg, #FFD100, #003087)' }
  };

  function normalizeBank(value) {
    if (value && BANKS[value]) return value;
    if (value === 'other') return 'other';
    return '';
  }

  /** Nome a exibir no cartão: nome do catálogo, ou o texto livre quando bank === 'other'. */
  function bankDisplayLabel(card) {
    if (!card) return '';
    if (card.bank && BANKS[card.bank]) return BANKS[card.bank].label;
    if (card.bank === 'other') return String(card.bankLabel || '').trim();
    return '';
  }

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
    var brand = card.brand in GRADIENTS ? card.brand : 'other';
    var bank = normalizeBank(card.bank);
    return {
      id: card.id,
      name: String(card.name || card.holderName || '').trim() || 'Meu cartão',
      holderName: String(card.holderName || card.name || '').trim() || 'Titular',
      last4: String(card.last4 || '').replace(/\D/g, '').slice(-4).padStart(4, '0'),
      brand: brand,
      brandLabel: brand === 'other' ? String(card.brandLabel || '').trim().slice(0, 20) : '',
      bank: bank,
      bankLabel: bank === 'other' ? String(card.bankLabel || '').trim().slice(0, 24) : '',
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
    normalizeBank: normalizeBank,
    bankDisplayLabel: bankDisplayLabel,
    gradients: GRADIENTS,
    banks: BANKS,
    resetSessionStore: resetSessionStore,
    beginNewAppSession: beginNewAppSession,
    clearDemoSeeds: clearDemoSeeds,
    isSessionOnly: function () { return SESSION_ONLY; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
