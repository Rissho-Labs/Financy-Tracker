/**
 * Metas / objetivos — mescla onboarding (ft_user.goal) + lista ft_goals
 */
(function (global) {
  'use strict';

  var KEY = 'ft_goals';

  function loadRaw() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveAll(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function uid() {
    return 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  /** Garante que o objetivo do onboarding apareça como card */
  function syncFromOnboarding() {
    try {
      if (localStorage.getItem('ft_onboarding_goal_dismissed') === '1') return;
      var raw = localStorage.getItem('ft_user');
      if (!raw) return;
      var u = JSON.parse(raw);
      if (!u || !u.goal || !u.goal.name) return;
      var list = loadRaw();
      var exists = list.some(function (g) {
        return g.source === 'onboarding';
      });
      if (exists) return;
      var valReais = Number(u.goal.value || 0);
      list.unshift({
        id: uid(),
        source: 'onboarding',
        name: u.goal.name,
        targetCents: Math.round(valReais * 100) || 0,
        start: u.goal.start || '',
        end: u.goal.end || '',
        createdAt: u.completedAt || new Date().toISOString()
      });
      saveAll(list);
    } catch (e) {}
  }

  function getAll() {
    syncFromOnboarding();
    return loadRaw();
  }

  function upsert(goal) {
    syncFromOnboarding();
    var list = loadRaw();
    var id = goal.id;
    if (id) {
      list = list.map(function (g) {
        return g.id === id ? Object.assign({}, g, goal) : g;
      });
    } else {
      list.unshift(
        Object.assign(
          {
            id: uid(),
            source: 'user',
            createdAt: new Date().toISOString()
          },
          goal
        )
      );
    }
    saveAll(list);
    return list;
  }

  function remove(id) {
    var list = loadRaw();
    var g = list.find(function (x) {
      return x.id === id;
    });
    if (g && g.source === 'onboarding') localStorage.setItem('ft_onboarding_goal_dismissed', '1');
    list = list.filter(function (x) {
      return x.id !== id;
    });
    saveAll(list);
    return list;
  }

  global.FTGoals = {
    KEY: KEY,
    getAll: getAll,
    upsert: upsert,
    remove: remove,
    syncFromOnboarding: syncFromOnboarding
  };
})(typeof window !== 'undefined' ? window : globalThis);
