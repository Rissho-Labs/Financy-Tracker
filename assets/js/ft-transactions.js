/**
 * Gastos (apenas saídas) em localStorage — ft_transactions
 */
(function (global) {
  'use strict';

  var KEY = 'ft_transactions';

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

  /** Remove lançamentos antigos que eram "receita" (migração) */
  function migrateDropIncome(list) {
    return list.filter(function (t) {
      return t.type !== 'income';
    });
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
      { id: 'tx_seed_1', name: 'Apple Store', amountCents: 29900, type: 'expense', at: y + '-' + mo + '-' + day + 'T14:32:00' },
      { id: 'tx_seed_3', name: 'iFood', amountCents: 7850, type: 'expense', at: y + '-' + mo + '-30T20:15:00' },
      { id: 'tx_seed_4', name: 'Spotify', amountCents: 2190, type: 'expense', at: y + '-' + mo + '-28T12:00:00' }
    ];
    saveAll(seed);
  }

  function getAll() {
    seedIfEmpty();
    return migrateDropIncome(loadRaw() || []);
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

  function add(item) {
    var list = getAll();
    list.unshift({
      id: 'tx_' + Date.now(),
      name: String(item.name || '').trim(),
      amountCents: Math.max(0, Math.round(Number(item.amountCents) || 0)),
      type: 'expense',
      paymentMethod: item.paymentMethod || 'pix',
      cardId: item.cardId || null,
      installments: item.installments ? Math.max(1, Number(item.installments)) : 1,
      at: item.at || nowIso()
    });
    saveAll(list);
    return list;
  }

  function remove(id) {
    var list = getAll().filter(function (t) {
      return t.id !== id;
    });
    saveAll(list);
    return list;
  }

  global.FTTransactions = {
    KEY: KEY,
    getAll: getAll,
    add: add,
    remove: remove,
    seedIfEmpty: seedIfEmpty,
    monthExpenseTotalCents: monthExpenseTotalCents
  };
})(typeof window !== 'undefined' ? window : globalThis);
