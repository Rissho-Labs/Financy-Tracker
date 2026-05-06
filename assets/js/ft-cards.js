(function (global) {
  'use strict';

  var KEY = 'ft_cards';

  var GRADIENTS = {
    visa: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
    master: 'linear-gradient(135deg, #F97316, #EA580C)',
    elo: 'linear-gradient(135deg, #1F2937, #111827)',
    amex: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
    other: 'linear-gradient(135deg, #6366f1, #4338ca)'
  };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : null;
    } catch (e) {
      return null;
    }
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function seedIfEmpty() {
    if (load()) return;
    save([
      { id: 'c1', holderName: 'Titular', last4: '4321', brand: 'visa' },
      { id: 'c2', holderName: 'Titular', last4: '9087', brand: 'master' },
      { id: 'c3', holderName: 'Titular', last4: '1122', brand: 'elo' }
    ]);
  }

  function getAll() {
    seedIfEmpty();
    return load() || [];
  }

  function add(card) {
    var list = getAll();
    list.push({
      id: 'c_' + Date.now(),
      holderName: String(card.holderName || '').trim() || 'Titular',
      last4: String(card.last4 || '').replace(/\D/g, '').slice(-4).padStart(4, '0'),
      brand: card.brand in GRADIENTS ? card.brand : 'other'
    });
    save(list);
    return list;
  }

  global.FTCards = {
    getAll: getAll,
    add: add,
    gradients: GRADIENTS
  };
})(typeof window !== 'undefined' ? window : globalThis);
