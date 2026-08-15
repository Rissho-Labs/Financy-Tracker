/**
 * Orquestra login: Google → cadastro ou entrada; biometria ao abrir o app.
 *
 * SEGURANÇA BIOMÉTRICA (on-device only):
 * Credenciais ficam exclusivamente no Keychain/Keystore via Capacitor NativeBiometric.
 * Nenhum template, hash ou dado biométrico real é transmitido ao Firebase ou backend.
 * @author Rickson.Hirata
 */
(function (global) {
  'use strict';

  /** Conta Google / sem senha no Keychain: biometria só desbloqueia sessão Firebase. */
  var BIOMETRIC_GOOGLE = '__ft_google__';
  var BIOMETRIC_UNLOCK = '__ft_unlock__';

  function isBiometricUnlockSecret(secret) {
    return secret === BIOMETRIC_GOOGLE || secret === BIOMETRIC_UNLOCK;
  }

  function isStoredPasswordSecret(secret) {
    return !!secret && !isBiometricUnlockSecret(secret);
  }
  var KEY_BIO_ENABLED = 'ft_biometric_enabled';
  var KEY_BIO_PENDING = 'ft_biometric_pending';
  var KEY_GOOGLE_PENDING = 'ft_google_pending';
  var KEY_GOOGLE_LINK_PENDING = 'ft_google_link_pending';
  var KEY_LAST_LOGIN_EMAIL = 'ft_last_login_email';
  var KEY_PENDING_EXPENSE = 'ft_pending_expense';

  /**
   * Atalho «Novo gasto»: se a biometria for cancelada/falhar ao tratar o intent,
   * não deixamos o pedido pendente vivo para a próxima abertura "normal" do app.
   */
  function clearPendingExpenseShortcut() {
    try {
      sessionStorage.removeItem(KEY_PENDING_EXPENSE);
    } catch (e) {}
  }

  function usesFirebase() {
    return global.FTFirebase && FTFirebase.isReady && FTFirebase.isReady();
  }

  function isBiometricEnabled() {
    try {
      return localStorage.getItem(KEY_BIO_ENABLED) === '1';
    } catch (e) {
      return false;
    }
  }

  function setBiometricEnabled(on) {
    try {
      if (on) localStorage.setItem(KEY_BIO_ENABLED, '1');
      else localStorage.removeItem(KEY_BIO_ENABLED);
    } catch (e) {}
  }

  function isNative() {
    try {
      var cap = global.Capacitor;
      return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
    } catch (e) {
      return false;
    }
  }

  function getBiometricServer() {
    return (global.FTSession && FTSession.BIOMETRIC_SERVER) || 'com.financetracker.app';
  }

  function stageBiometricSetup(email, secret, provider) {
    try {
      var payload = {
        email: String(email || '').trim(),
        provider: provider === 'google' ? 'google' : 'password',
      };
      // Segredo só em memória de sessão curta; nunca logar este objeto.
      if (provider !== 'google') {
        payload.secret = String(secret || '');
      } else {
        payload.secret = BIOMETRIC_UNLOCK;
      }
      sessionStorage.setItem(KEY_BIO_PENDING, JSON.stringify(payload));
    } catch (e) {
      console.warn('[FTAuth] stage biometric', e && e.message ? e.message : 'error');
    }
  }

  function getBiometricPending() {
    try {
      var raw = sessionStorage.getItem(KEY_BIO_PENDING);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.email) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function clearBiometricPending() {
    try {
      sessionStorage.removeItem(KEY_BIO_PENDING);
    } catch (e) {}
  }

  function getLastLoginEmail() {
    try {
      return String(localStorage.getItem(KEY_LAST_LOGIN_EMAIL) || '').trim();
    } catch (e) {
      return '';
    }
  }

  function setLastLoginEmail(email) {
    try {
      var normalized = String(email || '').trim().toLowerCase();
      if (normalized) localStorage.setItem(KEY_LAST_LOGIN_EMAIL, normalized);
    } catch (e) {}
  }

  async function getStoredBiometricEmail() {
    if (!isNative()) return null;
    var api = global.__FT_NATIVE_BIOMETRIC__;
    if (!api || typeof api.getStoredBiometricEmail !== 'function') return null;
    try {
      return await api.getStoredBiometricEmail(getBiometricServer());
    } catch (e) {
      return null;
    }
  }

  /**
   * Biometria no celular é de uma conta só: alinha flag com último login vs e-mail no Keychain.
   */
  async function syncBiometricForLastAccount(email) {
    var last = String(email || '').trim().toLowerCase();
    if (!last) return;
    setLastLoginEmail(last);
    if (!isNative()) {
      setBiometricEnabled(false);
      return;
    }
    var stored = await getStoredBiometricEmail();
    if (!stored) {
      setBiometricEnabled(false);
      return;
    }
    if (stored.toLowerCase() !== last) {
      setBiometricEnabled(false);
      return;
    }
    var has = await hasBiometricCredentials();
    setBiometricEnabled(!!has);
  }

  function recordLastLogin(email) {
    return syncBiometricForLastAccount(email);
  }

  /**
   * Biometria automática ao abrir o app: só se a última conta logada tiver biometria neste aparelho.
   */
  /**
   * Com biometria ativa: mantém sessão Firebase ao sair para login direto (sem Google de novo).
   */
  async function shouldKeepFirebaseSessionOnLogout() {
    return shouldOfferAutoBiometricOnLaunch();
  }

  async function shouldOfferAutoBiometricOnLaunch() {
    if (!isNative()) return false;
    var last = getLastLoginEmail();
    if (!last) return false;
    if (!isBiometricEnabled()) return false;
    if (!(await hasBiometricCredentials())) {
      setBiometricEnabled(false);
      return false;
    }
    var stored = await getStoredBiometricEmail();
    if (!stored) {
      setBiometricEnabled(false);
      return false;
    }
    return stored.toLowerCase() === last.toLowerCase();
  }

  async function hasBiometricCredentials() {
    if (!isNative()) return false;
    var api = global.__FT_NATIVE_BIOMETRIC__;
    if (!api || typeof api.hasStoredCredentials !== 'function') return false;
    try {
      return await api.hasStoredCredentials(getBiometricServer());
    } catch (e) {
      return false;
    }
  }

  async function isBiometricAvailableOnDevice() {
    if (!isNative()) return false;
    var api = global.__FT_NATIVE_BIOMETRIC__;
    if (!api || typeof api.isNativeBiometricAvailable !== 'function') return false;
    try {
      return await api.isNativeBiometricAvailable();
    } catch (e) {
      return false;
    }
  }

  async function saveBiometricLogin(email, secret, provider) {
    if (!isNative()) return false;
    var api = global.__FT_NATIVE_BIOMETRIC__;
    if (!api || typeof api.saveNativeBiometricCredentials !== 'function') return false;
    var server = getBiometricServer();
    var pwd =
      provider === 'google' ? BIOMETRIC_UNLOCK : secret || '';
    if (!pwd && provider !== 'google') return false;
    try {
      var trimmed = String(email).trim();
      await api.saveNativeBiometricCredentials(server, trimmed, pwd);
      setLastLoginEmail(trimmed);
      setBiometricEnabled(true);
      clearBiometricPending();
      return true;
    } catch (e) {
      console.warn('[FTAuth] biometric save', e);
      return false;
    }
  }

  async function clearBiometricLogin() {
    setBiometricEnabled(false);
    clearBiometricPending();
    if (!isNative()) return;
    var api = global.__FT_NATIVE_BIOMETRIC__;
    if (api && typeof api.deleteNativeBiometricCredentials === 'function') {
      try {
        await api.deleteNativeBiometricCredentials(getBiometricServer());
      } catch (e) {
        console.warn('[FTAuth] biometric delete', e);
      }
    }
  }

  function shouldOfferBiometricSetup() {
    if (!isNative() || isBiometricEnabled()) return false;
    return !!getBiometricPending();
  }

  function getPostRegisterDestination() {
    if (!isNative()) {
      clearBiometricPending();
      return FTRoutes.onboarding;
    }
    if (shouldOfferBiometricSetup()) {
      return FTRoutes.biometric;
    }
    clearBiometricPending();
    return FTRoutes.onboarding;
  }

  function needsRegistration(profile, isNewUser) {
    if (isNewUser) return true;
    if (!profile) return true;
    return profile.registrationComplete !== true;
  }

  function savePendingGoogleLink(err) {
    try {
      var cred =
        (err && err.pendingGoogleCredential) ||
        (global.FTFirebase && FTFirebase.googleCredentialFromError
          ? FTFirebase.googleCredentialFromError(err)
          : null);
      if (!cred || !cred.idToken) return false;
      var email =
        (err && err.customData && err.customData.email) ||
        (err && err.email) ||
        '';
      sessionStorage.setItem(
        KEY_GOOGLE_LINK_PENDING,
        JSON.stringify({
          email: String(email).trim(),
          idToken: cred.idToken,
          accessToken: cred.accessToken || null,
        })
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  function getPendingGoogleLink() {
    try {
      var raw = sessionStorage.getItem(KEY_GOOGLE_LINK_PENDING);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clearPendingGoogleLink() {
    try {
      sessionStorage.removeItem(KEY_GOOGLE_LINK_PENDING);
    } catch (e) {}
  }

  async function linkPasswordWithPendingGoogle(email, password) {
    var pending = getPendingGoogleLink();
    var mail = String(email || (pending && pending.email) || '').trim();
    if (!mail || !password) throw new Error('missing_credentials');
    var cred = await FTFirebase.signInPasswordAndLinkGoogle(
      mail,
      password,
      pending || null
    );
    try {
      await FTFirebase.saveUserProfile(cred.user.uid, {
        email: mail,
        authProvider: 'google+password',
        authProviders: ['password', 'google'],
        registrationComplete: true,
        lastLogin: new Date().toISOString(),
      });
    } catch (saveErr) {
      console.warn('[FTAuth] profile after link', saveErr);
    }
    clearPendingGoogleLink();
    return FTSession.completeLoginFromFirebase(cred.user);
  }

  function hasPendingGoogleLink() {
    return !!getPendingGoogleLink();
  }

  function userHasPasswordProvider(user) {
    if (!user || !user.providerData) return false;
    for (var i = 0; i < user.providerData.length; i++) {
      if (user.providerData[i] && user.providerData[i].providerId === 'password') {
        return true;
      }
    }
    return false;
  }

  async function emailNeedsPasswordLink(email, user) {
    if (!email || !user) return false;
    if (userHasPasswordProvider(user)) return false;
    if (FTFirebase.findUidByEmail) {
      var existingUid = await FTFirebase.findUidByEmail(email).catch(function () {
        return null;
      });
      if (existingUid && existingUid !== user.uid) return true;
    }
    if (FTFirebase.getSignInMethods) {
      var methods = await FTFirebase.getSignInMethods(email).catch(function () {
        return [];
      });
      if (methods && methods.indexOf('password') >= 0) return true;
    }
    return false;
  }

  function stashPendingGoogleLink(email, googleCredential) {
    if (!googleCredential || !googleCredential.idToken) return;
    try {
      sessionStorage.setItem(
        KEY_GOOGLE_LINK_PENDING,
        JSON.stringify({
          email: String(email || '').trim(),
          idToken: googleCredential.idToken,
          accessToken: googleCredential.accessToken || null,
        })
      );
    } catch (e) {}
  }

  async function routeAfterGoogleSignIn(result) {
    if (!result || !result.user) throw new Error('no_user');
    var user = result.user;
    var email = String(user.email || '').trim();

    if (usesFirebase() && email && (await emailNeedsPasswordLink(email, user))) {
      stashPendingGoogleLink(email, result.googleCredential);
      await FTFirebase.signOut().catch(function () {});
      var linkErr = new Error('account_exists_password');
      linkErr.code = 'auth/account-exists-with-different-credential';
      linkErr.customData = { email: email };
      throw linkErr;
    }

    var profile = null;
    if (usesFirebase()) {
      profile = await FTFirebase.loadUserProfile(user.uid).catch(function () {
        return null;
      });
    }

    if (needsRegistration(profile, result.isNewUser)) {
      try {
        sessionStorage.setItem(
          KEY_GOOGLE_PENDING,
          JSON.stringify({
            uid: user.uid,
            email: user.email || '',
            name: (user.displayName && String(user.displayName).trim()) || '',
          })
        );
      } catch (e) {}
      return { href: FTRoutes.register + '?from=google', needsRegistration: true };
    }

    if (usesFirebase()) {
      try {
        var providers = ['google'];
        if (profile && profile.authProviders && profile.authProviders.length) {
          providers = profile.authProviders.slice();
          if (providers.indexOf('google') < 0) providers.push('google');
        } else if (profile && profile.authProvider === 'password') {
          providers.push('password');
        }
        if (userHasPasswordProvider(user) && providers.indexOf('password') < 0) {
          providers.push('password');
        }
        await FTFirebase.saveUserProfile(user.uid, {
          email: user.email,
          name:
            (profile && profile.name) ||
            (user.displayName && String(user.displayName).trim()) ||
            '',
          username: (profile && profile.username) || undefined,
          authProvider: providers.length > 1 ? 'google+password' : 'google',
          authProviders: providers,
          registrationComplete: true,
          lastLogin: new Date().toISOString(),
        });
      } catch (saveErr) {
        console.warn('[FTAuth] profile sync (login continua)', saveErr);
      }
    }

    if (!global.FTSession || !FTSession.completeLoginFromFirebase) {
      throw new Error('session_unavailable');
    }
    return FTSession.completeLoginFromFirebase(user);
  }

  async function tryRestoreFirebaseSessionForEmail(email) {
    var wanted = String(email || '').trim().toLowerCase();
    if (!wanted || !usesFirebase()) return null;

    var cur =
      (FTFirebase.waitForAuthUser && (await FTFirebase.waitForAuthUser(8000))) ||
      FTFirebase.getCurrentUser();
    if (cur && cur.email && cur.email.toLowerCase() === wanted) {
      return cur;
    }

    var nativeApi = global.__FT_NATIVE_GOOGLE_AUTH__;
    if (nativeApi && typeof nativeApi.restoreNativeSessionForEmail === 'function') {
      try {
        var native = await nativeApi.restoreNativeSessionForEmail(wanted);
        if (native && native.idToken && FTFirebase.signInWithIdToken) {
          var packed = await FTFirebase.signInWithIdToken(native.idToken);
          if (packed && packed.user && packed.user.email) {
            return packed.user;
          }
        }
      } catch (e) {
        console.warn('[FTAuth] native session restore', e);
      }
    }

    return null;
  }

  /**
   * Biometria = desbloqueio da última conta (Google ou e-mail).
   * Não abre seletor Google na biometria — só restaura sessão ou usa senha guardada.
   */
  async function completeBiometricLogin(email, secret) {
    var trimmed = String(email || '').trim();
    if (!trimmed) throw new Error('no_email');

    var user = await tryRestoreFirebaseSessionForEmail(trimmed);
    if (user) {
      return FTSession.completeLoginFromFirebase(user);
    }

    if (isStoredPasswordSecret(secret)) {
      var cred = await FTFirebase.signInEmailPassword(trimmed, secret);
      return FTSession.completeLoginFromFirebase(cred.user);
    }

    var err = new Error('biometric_session_expired');
    err.code = 'auth/biometric-session-expired';
    throw err;
  }

  function mapError(err) {
    if (
      err &&
      (err.message === 'google_session_required' ||
        err.message === 'biometric_session_expired' ||
        err.code === 'auth/biometric-session-expired')
    ) {
      return 'Sessão expirada. Entre com Google ou e-mail e senha uma vez; depois a biometria volta a funcionar.';
    }
    if (global.FTFirebase && typeof FTFirebase.mapAuthError === 'function') {
      var msg = FTFirebase.mapAuthError(err);
      if (msg.indexOf('Não foi possível concluir') === 0 && err && err.message) {
        var hint = String(err.message);
        if (hint === 'no_user') return 'Conta Google sem dados. Tente outra conta.';
        if (hint === 'no_email') return 'Google não retornou e-mail. Verifique permissões da conta.';
        if (hint === 'session_unavailable') return 'Erro interno do app. Feche e abra de novo.';
      }
      return msg;
    }
    return 'Não foi possível concluir.';
  }

  function handleGoogleAccountExists(err) {
    var email =
      (err && err.customData && err.customData.email) ||
      (err && err.email) ||
      '';
    savePendingGoogleLink(err);
    if (email) {
      try {
        sessionStorage.setItem('ft_login_email_hint', String(email));
      } catch (e) {}
    }
    return {
      code: 'account-exists-with-password',
      message:
        'Este e-mail já tem senha. Digite sua senha abaixo e toque em Entrar para vincular o Google à mesma conta.',
      email: email,
    };
  }

  async function trySessionRestore() {
    if (!usesFirebase() || !global.FTSession) return null;
    await FTFirebase.waitForAuthReady();
    var user = FTFirebase.getCurrentUser();
    if (!user || !user.email) return null;
    var profile = await FTFirebase.loadUserProfile(user.uid).catch(function () {
      return null;
    });
    if (needsRegistration(profile, false)) return null;
    return FTSession.completeLoginFromFirebase(user);
  }

  /**
   * Sem biometria ativa: não entra sozinho — limpa cache local e sessão Firebase na tela de login.
   */
  async function lockLoginScreenWithoutBiometric() {
    if (await shouldOfferAutoBiometricOnLaunch()) return false;
    if (global.FTSession && typeof FTSession.clearLoginCache === 'function') {
      FTSession.clearLoginCache();
    }
    if (usesFirebase()) {
      await FTFirebase.signOut().catch(function () {});
    }
    return true;
  }

  /**
   * Atalho «Novo gasto» com sessão já quente (não passou pelo login):
   * mesmo assim exige confirmação biométrica antes de abrir o sheet.
   * Cancelar/falhar resolve false — nunca rejeita.
   */
  async function verifyIdentityForShortcut() {
    if (!isNative()) return false;
    if (!isBiometricEnabled()) return false;
    if (!(await hasBiometricCredentials())) return false;

    var api = global.__FT_NATIVE_BIOMETRIC__;
    if (!api || typeof api.verifyIdentity !== 'function') return false;

    try {
      await api.verifyIdentity({
        reason: 'Confirme sua identidade para registrar um gasto',
        title: 'Novo gasto',
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async function tryBiometricOnLaunch() {
    if (!usesFirebase() || !global.FTSession) return false;
    if (global._ftForgotPasswordOpen) return false; // não interrompe fluxo de reset

    if (!(await shouldOfferAutoBiometricOnLaunch())) {
      return false;
    }

    var api = global.__FT_NATIVE_BIOMETRIC__;
    if (!api || typeof api.tryNativeBiometricLogin !== 'function') return false;

    var r = await api.tryNativeBiometricLogin(getBiometricServer());
    if (!r || !r.ok) {
      clearPendingExpenseShortcut();
      return false;
    }

    var email = String(r.email || '').trim();
    if (!email) {
      clearPendingExpenseShortcut();
      return false;
    }

    var last = getLastLoginEmail();
    if (!last || email.toLowerCase() !== last.toLowerCase()) {
      clearPendingExpenseShortcut();
      return false;
    }

    try {
      var dest = await completeBiometricLogin(email, r.password);
      if (dest && dest.href && !global._ftForgotPasswordOpen) {
        global.location.replace(dest.href);
        return true;
      }
    } catch (err) {
      console.warn('[FTAuth] biometric login', err);
      clearPendingExpenseShortcut();
    }
    return false;
  }

  async function startGoogleSignIn() {
    if (!usesFirebase()) {
      var err = new Error('firebase_not_ready');
      err.code = 'auth/firebase-not-ready';
      throw err;
    }
    return FTFirebase.signInWithGoogle();
  }

  global.FTAuth = {
    BIOMETRIC_GOOGLE: BIOMETRIC_GOOGLE,
    KEY_GOOGLE_PENDING: KEY_GOOGLE_PENDING,
    KEY_BIO_PENDING: KEY_BIO_PENDING,
    isBiometricEnabled: isBiometricEnabled,
    setBiometricEnabled: setBiometricEnabled,
    stageBiometricSetup: stageBiometricSetup,
    getBiometricPending: getBiometricPending,
    clearBiometricPending: clearBiometricPending,
    saveBiometricLogin: saveBiometricLogin,
    clearBiometricLogin: clearBiometricLogin,
    shouldOfferBiometricSetup: shouldOfferBiometricSetup,
    getPostRegisterDestination: getPostRegisterDestination,
    isBiometricAvailableOnDevice: isBiometricAvailableOnDevice,
    hasBiometricCredentials: hasBiometricCredentials,
    getLastLoginEmail: getLastLoginEmail,
    getStoredBiometricEmail: getStoredBiometricEmail,
    recordLastLogin: recordLastLogin,
    shouldOfferAutoBiometricOnLaunch: shouldOfferAutoBiometricOnLaunch,
    shouldKeepFirebaseSessionOnLogout: shouldKeepFirebaseSessionOnLogout,
    completeBiometricLogin: completeBiometricLogin,
    routeAfterGoogleSignIn: routeAfterGoogleSignIn,
    mapError: mapError,
    handleGoogleAccountExists: handleGoogleAccountExists,
    hasPendingGoogleLink: hasPendingGoogleLink,
    linkPasswordWithPendingGoogle: linkPasswordWithPendingGoogle,
    clearPendingGoogleLink: clearPendingGoogleLink,
    lockLoginScreenWithoutBiometric: lockLoginScreenWithoutBiometric,
    tryBiometricOnLaunch: tryBiometricOnLaunch,
    verifyIdentityForShortcut: verifyIdentityForShortcut,
    trySessionRestore: trySessionRestore,
    startGoogleSignIn: startGoogleSignIn,
    needsRegistration: needsRegistration,
  };
})(typeof window !== 'undefined' ? window : globalThis);
