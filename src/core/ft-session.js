/**
 * Sessão — ft_user + ft_onboarding_done (cache local)
 * Com Firebase configurado: Auth + perfil em Firestore.
 */
(function (global) {
  'use strict';

  var KEY_USER = 'ft_user';
  var KEY_ONBOARD = 'ft_onboarding_done';

  /** Server id for @capgo/capacitor-native-biometric Keychain/Keystore (match app id). */
  var BIOMETRIC_SERVER = 'com.financetracker.app';

  function isDevAutologin() {
    if (typeof window === 'undefined') return false;
    try {
      var params = new URLSearchParams(window.location.search || '');
      if (params.get('dev') === '1') return true;
      return localStorage.getItem('ft_dev_autologin') === '1';
    } catch (e) {
      return false;
    }
  }

  function sanitizeUser(u) {
    if (!u || typeof u !== 'object') return u;
    // Nunca persistir senha em texto puro no cache local.
    if (Object.prototype.hasOwnProperty.call(u, 'passwordDemo')) {
      delete u.passwordDemo;
    }
    if (Object.prototype.hasOwnProperty.call(u, 'password')) {
      delete u.password;
    }
    return u;
  }

  function parseUser() {
    try {
      var raw = localStorage.getItem(KEY_USER);
      if (!raw) return null;
      var u = JSON.parse(raw);
      if (!u || typeof u !== 'object' || !u.email) return null;
      var cleaned = sanitizeUser(u);
      // Migração: remove senha antiga gravada em claro.
      if (raw.indexOf('passwordDemo') >= 0 || raw.indexOf('"password"') >= 0) {
        try {
          localStorage.setItem(KEY_USER, JSON.stringify(cleaned));
        } catch (e) { /* ignore */ }
      }
      return cleaned;
    } catch (e) {
      return null;
    }
  }

  function saveUser(u) {
    localStorage.setItem(KEY_USER, JSON.stringify(sanitizeUser(Object.assign({}, u || {}))));
  }

  /** Hash one-way para modo demo offline (não substitui Firebase Auth). */
  function hashDemoSecret(value) {
    var s = 'ft-demo-v1|' + String(value || '');
    var h = 2166136261;
    var i;
    for (i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  async function hashDemoSecretStrong(value) {
    try {
      if (global.crypto && crypto.subtle && typeof TextEncoder !== 'undefined') {
        var data = new TextEncoder().encode('ft-demo-v1|' + String(value || ''));
        var buf = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buf))
          .map(function (b) {
            return ('0' + b.toString(16)).slice(-2);
          })
          .join('');
      }
    } catch (e) { /* fallback */ }
    return hashDemoSecret(value);
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

  if (isDevAutologin()) {
    if (!parseUser()) {
      saveUser({
        email: 'dev@financetracker.app',
        name: 'Dev',
        username: 'dev',
        lastLogin: new Date().toISOString(),
        authProvider: 'dev'
      });
    }
    if (!isOnboardingDone()) setOnboardingDone();
  }

  function usesFirebase() {
    var fb = global.FTFirebase;
    return !!(fb && typeof fb.isReady === 'function' && fb.isReady());
  }

  function usesFirebaseConfigured() {
    var fb = global.FTFirebase;
    return !!(fb && typeof fb.isConfigured === 'function' && fb.isConfigured());
  }

  /** Só remove utilizador em cache (mantém onboarding e dados locais). */
  function clearLoginCache() {
    localStorage.removeItem(KEY_USER);
  }

  function clearAll() {
    localStorage.removeItem(KEY_USER);
    localStorage.removeItem(KEY_ONBOARD);
    localStorage.removeItem('ft_goals');
    localStorage.removeItem('ft_onboarding_goal_dismissed');
    if (global.FTStorage && typeof global.FTStorage.purgeEphemeral === 'function') {
      global.FTStorage.purgeEphemeral();
    } else {
      localStorage.removeItem('ft_transactions');
      localStorage.removeItem('ft_cards');
      try {
        sessionStorage.removeItem('ft_transactions');
        sessionStorage.removeItem('ft_cards');
        sessionStorage.removeItem('ft_app_session');
      } catch (e) { /* ignore */ }
    }
  }

  function logout() {
    // Limpa biometria diretamente no localStorage — funciona mesmo sem FTAuth nesta página
    try { localStorage.removeItem('ft_biometric_enabled'); } catch (e) {}
    try { sessionStorage.removeItem('ft_biometric_pending'); } catch (e) {}
    // Flag persistente: sinaliza que no próximo login deve perguntar sobre biometria
    try { localStorage.setItem('ft_bio_ask_on_login', '1'); } catch (e) {}

    // Limpeza completa (keychain nativo) se FTAuth estiver disponível
    var clearBio = (global.FTAuth && typeof FTAuth.clearBiometricLogin === 'function')
      ? FTAuth.clearBiometricLogin().catch(function () {})
      : Promise.resolve();

    var keepFirebase = Promise.resolve(false);

    return Promise.all([clearBio, Promise.resolve(keepFirebase)]).then(function (results) {
      var keep = results[1];
      if (usesFirebase() && !keep) {
        return global.FTFirebase.signOut().catch(function () {}).then(clearAll);
      }
      clearAll();
      return Promise.resolve();
    });
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
   * Após login/password ou Google: grava utilizador e devolve destino (FTRoutes).
   * @param {string} email
   * @param {{ google?: boolean }} [opts]
   * @returns {{ href: string }}
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
    // Nunca gravar senha em claro — mesmo no fluxo demo offline.
    if (opts.passwordDemoHash) u.passwordDemoHash = opts.passwordDemoHash;
    saveUser(u);
    if (global.FTStorage && typeof global.FTStorage.purgeEphemeral === 'function') {
      global.FTStorage.purgeEphemeral();
    }
    if (global.FTAuth && FTAuth.recordLastLogin) {
      FTAuth.recordLastLogin(trimmed);
    }
    // Rotas absolutas — válidas a partir de qualquer página em www/
    var href = isOnboardingDone() ? FTRoutes.home : FTRoutes.onboarding;
    return { href: href };
  }

  /**
   * Após Firebase Auth — sincroniza perfil local + destino.
   * @param {import('firebase/auth').User} fbUser
   * @param {{ name?: string, username?: string }} [extra]
   */
  function completeLoginFromFirebase(fbUser, extra) {
    extra = extra || {};
    var email = String((fbUser && fbUser.email) || '').trim();
    if (!email) throw new Error('no_email');

    var profilePromise = extra.skipProfileLoad
      ? Promise.resolve(null)
      : global.FTFirebase.loadUserProfile(fbUser.uid).catch(function () {
          return null;
        });

    return profilePromise.then(function (profile) {
        var registrationDone =
          extra.registrationComplete === true ||
          (profile && profile.registrationComplete === true);
        var prev = parseUser();
        var u = Object.assign({}, profile || {}, {
          uid: fbUser.uid,
          email: email,
          name:
            extra.name ||
            (profile && profile.name) ||
            (fbUser.displayName && String(fbUser.displayName).trim()) ||
            defaultDisplayName(email),
          username:
            extra.username ||
            (profile && profile.username) ||
            defaultUsername(email),
          lastLogin: new Date().toISOString(),
          registrationComplete: registrationDone,
          authProvider:
            extra.authProvider ||
            (fbUser.providerData &&
            fbUser.providerData.some(function (p) {
              return p && p.providerId === 'google.com';
            })
              ? 'google'
              : 'firebase'),
          photoURL:
            extra.photoURL ||
            (profile && (profile.photoURL || profile.photoUrl)) ||
            (fbUser.photoURL && String(fbUser.photoURL)) ||
            (prev && (prev.photoURL || prev.photoUrl)) ||
            '',
        });
        if (profile && profile.onboardingComplete) setOnboardingDone();
        saveUser(u);

        if (!registrationDone) {
          try {
            sessionStorage.setItem(
              'ft_google_pending',
              JSON.stringify({
                uid: fbUser.uid,
                email: email,
                name: u.name,
              })
            );
          } catch (e) {}
          return { href: FTRoutes.register + '?from=google', user: u };
        }

        var href = isOnboardingDone() ? FTRoutes.home : FTRoutes.onboarding;
        var out = { href: href, user: u };
        if (global.FTAuth && FTAuth.recordLastLogin) {
          FTAuth.recordLastLogin(email);
        }
        return out;
      });
  }

  function isBiometricEnabled() {
    try {
      return localStorage.getItem('ft_biometric_enabled') === '1';
    } catch (e) {
      return false;
    }
  }

  function setBiometricEnabled(on) {
    try {
      if (on) localStorage.setItem('ft_biometric_enabled', '1');
      else localStorage.removeItem('ft_biometric_enabled');
    } catch (e) {}
  }

  function persistProfileToCloud(data) {
    var u = parseUser();
    if (!usesFirebase() || !u || !u.uid) return Promise.resolve();
    return global.FTFirebase.saveUserProfile(u.uid, data || {});
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
    clearLoginCache: clearLoginCache,
    logout: logout,
    usesFirebase: usesFirebase,
    usesFirebaseConfigured: usesFirebaseConfigured,
    completeLogin: completeLogin,
    completeLoginFromFirebase: completeLoginFromFirebase,
    persistProfileToCloud: persistProfileToCloud,
    isBiometricEnabled: isBiometricEnabled,
    setBiometricEnabled: setBiometricEnabled,
    defaultDisplayName: defaultDisplayName,
    defaultUsername: defaultUsername,
    getGoogleClientId: getGoogleClientId,
    requestGoogleAccessTokenThenEmail: requestGoogleAccessTokenThenEmail,
    hashDemoSecretStrong: hashDemoSecretStrong,
  };
})(typeof window !== 'undefined' ? window : globalThis);
