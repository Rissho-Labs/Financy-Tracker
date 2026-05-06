/**
 * Sessão local (MVP) — ft_user + ft_onboarding_done
 * Sem backend; dados em localStorage.
 */
(function (global) {
  'use strict';

  var KEY_USER = 'ft_user';
  var KEY_ONBOARD = 'ft_onboarding_done';

  function parseUser() {
    try {
      var raw = localStorage.getItem(KEY_USER);
      if (!raw) return null;
      var u = JSON.parse(raw);
      if (!u || typeof u !== 'object' || !u.email) return null;
      return u;
    } catch (e) {
      return null;
    }
  }

  function saveUser(u) {
    localStorage.setItem(KEY_USER, JSON.stringify(u));
  }

  function isLoggedIn() {
    return parseUser() !== null;
  }

  function isOnboardingDone() {
    return localStorage.getItem(KEY_ONBOARD) === '1';
  }

  function setOnboardingDone() {
    localStorage.setItem(KEY_ONBOARD, '1');
  }

  function clearAll() {
    localStorage.removeItem(KEY_USER);
    localStorage.removeItem(KEY_ONBOARD);
    localStorage.removeItem('ft_transactions');
    localStorage.removeItem('ft_goals');
    localStorage.removeItem('ft_onboarding_goal_dismissed');
    localStorage.removeItem('ft_cards');
  }

  function defaultUsername(email) {
    var s = String(email.split('@')[0] || 'user').replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (s.length < 3) s = (s + 'usr').slice(0, 12);
    return s;
  }

  function defaultDisplayName(email) {
    var local = String(email.split('@')[0] || '');
    var parts = local.split(/[._-]+/).filter(Boolean);
    if (!parts.length) return 'Utilizador';
    return parts
      .map(function (p) {
        return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Após login/password ou Google (demo): grava utilizador e devolve destino relativo à pasta pages/ ou raiz.
   * @param {string} email
   * @param {{ google?: boolean }} [opts]
   * @returns {{ href: string }} href é relativo ao index (ex: pages/home.html) ou pages/onboarding.html
   */
  function completeLogin(email, opts) {
    opts = opts || {};
    var trimmed = String(email || '').trim();
    var prev = parseUser();
    var u = Object.assign({}, prev || {}, {
      email: trimmed,
      name: (prev && prev.name) || defaultDisplayName(trimmed),
      username: (prev && prev.username) || defaultUsername(trimmed),
      lastLogin: new Date().toISOString()
    });
    if (opts.google) u.authProvider = 'google';
    else u.authProvider = 'password';
    if (opts.passwordDemo) u.passwordDemo = opts.passwordDemo;
    saveUser(u);
    // Raiz do servidor (serve www/) — válido a partir de / ou /pages/*
    var href = isOnboardingDone() ? '/pages/home.html' : '/pages/onboarding.html';
    return { href: href };
  }

  global.FTSession = {
    KEY_USER: KEY_USER,
    KEY_ONBOARD: KEY_ONBOARD,
    parseUser: parseUser,
    saveUser: saveUser,
    isLoggedIn: isLoggedIn,
    isOnboardingDone: isOnboardingDone,
    setOnboardingDone: setOnboardingDone,
    clearAll: clearAll,
    completeLogin: completeLogin,
    defaultDisplayName: defaultDisplayName,
    defaultUsername: defaultUsername
  };
})(typeof window !== 'undefined' ? window : globalThis);
