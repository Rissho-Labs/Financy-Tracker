/**
 * Sessão local (MVP) — ft_user + ft_onboarding_done
 * Sem backend; dados em localStorage.
 */
(function (global) {
  'use strict';

  var KEY_USER = 'ft_user';
  var KEY_ONBOARD = 'ft_onboarding_done';

  /** Server id for @capgo/capacitor-native-biometric Keychain/Keystore (match app id). */
  var BIOMETRIC_SERVER = 'com.financetracker.app';

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

  function getGoogleClientId() {
    if (typeof document === 'undefined') return '';
    var m = document.querySelector('meta[name="google-signin-client_id"]');
    return ((m && m.getAttribute('content')) || '').trim();
  }

  /**
   * OAuth 2 token + userinfo (GIS). Requires script accounts.google.com/gsi/client + meta client_id.
   * @param {(email: string) => void} onEmail
   * @param {(err: Error) => void} onErr
   */
  function requestGoogleAccessTokenThenEmail(onEmail, onErr) {
    var clientId = getGoogleClientId();
    if (!clientId) {
      onErr(new Error('missing_client_id'));
      return;
    }
    var g = global.google;
    if (!g || !g.accounts || !g.accounts.oauth2) {
      onErr(new Error('gsi_not_loaded'));
      return;
    }
    var client = g.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope:
        'openid email profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      callback: function (tr) {
        if (tr && tr.error) {
          onErr(new Error(String(tr.error)));
          return;
        }
        var token = tr && tr.access_token;
        if (!token) {
          onErr(new Error('no_token'));
          return;
        }
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: 'Bearer ' + token },
        })
          .then(function (r) {
            if (!r.ok) throw new Error('userinfo_' + r.status);
            return r.json();
          })
          .then(function (info) {
            if (!info || !info.email) {
              onErr(new Error('no_email'));
              return;
            }
            onEmail(String(info.email).trim());
          })
          .catch(function (e) {
            onErr(e instanceof Error ? e : new Error(String(e)));
          });
      },
    });
    client.requestAccessToken({ prompt: 'select_account consent' });
  }

  global.FTSession = {
    KEY_USER: KEY_USER,
    KEY_ONBOARD: KEY_ONBOARD,
    BIOMETRIC_SERVER: BIOMETRIC_SERVER,
    parseUser: parseUser,
    saveUser: saveUser,
    isLoggedIn: isLoggedIn,
    isOnboardingDone: isOnboardingDone,
    setOnboardingDone: setOnboardingDone,
    clearAll: clearAll,
    completeLogin: completeLogin,
    defaultDisplayName: defaultDisplayName,
    defaultUsername: defaultUsername,
    getGoogleClientId: getGoogleClientId,
    requestGoogleAccessTokenThenEmail: requestGoogleAccessTokenThenEmail
  };
})(typeof window !== 'undefined' ? window : globalThis);
