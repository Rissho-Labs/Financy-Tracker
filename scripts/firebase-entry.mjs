/**
 * Bundle Firebase Auth + Firestore para o WebView (Capacitor).
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithCredential,
  linkWithCredential,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  getAdditionalUserInfo,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

function getCfg() {
  if (typeof window === 'undefined') return null;
  return window.FTFIREBASE_CONFIG || null;
}

function isConfigured(cfg) {
  if (!cfg || !cfg.apiKey || !cfg.projectId) return false;
  const appId = String(cfg.appId || '');
  return appId.length > 8 && !appId.includes('REPLACE');
}

let app = null;
let auth = null;
let db = null;
let storage = null;
let fns = null;
let ready = false;

function init() {
  const cfg = getCfg();
  if (!isConfigured(cfg)) {
    ready = false;
    return false;
  }
  try {
    app = initializeApp(cfg);
    try {
      auth = initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      });
    } catch (e) {
      auth = getAuth(app);
    }
    db = getFirestore(app);
    try {
      storage = getStorage(app);
    } catch (storageErr) {
      storage = null;
    }
    fns = getFunctions(app, 'southamerica-east1');
    ready = true;
    return true;
  } catch (e) {
    console.warn('[FTFirebase] init failed', e);
    ready = false;
    return false;
  }
}

function mapAuthError(err) {
  const code = err && err.code ? String(err.code) : '';
  const map = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-disabled': 'Conta desativada.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/google-credential-failed':
      'Google autorizou, mas o app não sincronizou. Rode npm run cap:sync e reinstale o app.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres).',
    'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.',
    'auth/network-request-failed': 'Sem conexão. Verifique a internet.',
    'auth/popup-closed-by-user': 'Login com Google cancelado.',
    'auth/popup-blocked': 'Não foi possível abrir a janela do Google. Tente de novo.',
    'auth/cancelled-popup-request': 'Aguarde e tente novamente.',
    'auth/account-exists-with-different-credential':
      'Este e-mail já está cadastrado com outro método (ex.: senha).',
    'auth/missing-google-client-id':
      'Login Google no celular precisa do ID do cliente Web no firebase-config.js (Firebase → Authentication → Google).',
    'auth/unauthorized-domain':
      'Domínio não autorizado. No Firebase, adicione localhost em Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed':
      'Login com Google desativado. Ative o provedor Google no Firebase Authentication.',
    'auth/internal-error': 'Erro interno. Tente de novo em instantes.',
    'auth/web-storage-unsupported':
      'Armazenamento bloqueado no app. Atualize o WebView ou reinstale o app.',
    'auth/firebase-not-ready': 'Firebase não carregou. Reinstale o app ou verifique a internet.',
    'permission-denied':
      'Sem permissão no Firestore. No Console → Firestore → Regras, publique o arquivo firestore.rules e confira se o banco é (default).',
    'auth/native-google-failed':
      'Não foi possível abrir o Google no app. Confira SHA-1 no Firebase, rode npm run cap:sync e reinstale.',
    'auth/native-google-no-token': 'Google não devolveu token. Verifique SHA-1 e google-services.json no Firebase.',
  };
  if (!code && err && err.message) {
    const msg = String(err.message);
    if (msg === 'missing_google_web_client_id' || msg.includes('google_web_client')) {
      return map['auth/missing-google-client-id'];
    }
    if (msg === 'gsi_load_failed') {
      return 'Não foi possível carregar o Google. Verifique a internet.';
    }
    if (msg === 'firebase_not_ready') return map['auth/firebase-not-ready'];
  }
  if (code) console.warn('[FTFirebase] auth error', code, err && err.message);
  return map[code] || 'Não foi possível concluir. Tente novamente.';
}

function isNativeCapacitor() {
  try {
    const cap = typeof window !== 'undefined' && window.Capacitor;
    return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  } catch (_) {
    return false;
  }
}

function normalizeEmailKey(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function normalizeUsernameKey(username) {
  return String(username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

function packGoogleResult(result) {
  if (!result || !result.user) return null;
  const info = getAdditionalUserInfo(result);
  const googleCred =
    result.credential && result.credential.idToken
      ? {
          idToken: result.credential.idToken,
          accessToken: result.credential.accessToken || null,
        }
      : null;
  return {
    user: result.user,
    isNewUser: !!(info && info.isNewUser),
    credential: result,
    googleCredential: googleCred,
  };
}

function googleCredentialFromError(err) {
  try {
    return GoogleAuthProvider.credentialFromError(err);
  } catch (_) {
    return null;
  }
}

let gsiLoadPromise = null;

function hasGoogleWebClientId(cfg) {
  const id = String((cfg && cfg.googleWebClientId) || '').trim();
  return id.length > 20 && id.includes('.apps.googleusercontent.com');
}

function loadGoogleGsi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no_window'));
  if (window.google && window.google.accounts && window.google.accounts.oauth2) {
    return Promise.resolve();
  }
  if (gsiLoadPromise) return gsiLoadPromise;
  gsiLoadPromise = new Promise(function (resolve, reject) {
    const existing = document.querySelector('script[data-ft-gsi]');
    if (existing) {
      existing.addEventListener('load', function () {
        resolve();
      });
      existing.addEventListener('error', function () {
        reject(new Error('gsi_load_failed'));
      });
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.dataset.ftGsi = '1';
    s.onload = function () {
      resolve();
    };
    s.onerror = function () {
      reject(new Error('gsi_load_failed'));
    };
    document.head.appendChild(s);
  });
  return gsiLoadPromise;
}

function signInWithGoogleAccessToken(webClientId) {
  return loadGoogleGsi().then(function () {
    return new Promise(function (resolve, reject) {
      var settled = false;
      function finish(fn, val) {
        if (settled) return;
        settled = true;
        fn(val);
      }
      try {
        var client = window.google.accounts.oauth2.initTokenClient({
          client_id: webClientId,
          scope:
            'openid email profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          callback: async function (tokenResponse) {
            if (tokenResponse.error) {
              var err = new Error(tokenResponse.error);
              err.code =
                tokenResponse.error === 'access_denied'
                  ? 'auth/popup-closed-by-user'
                  : 'auth/' + tokenResponse.error;
              finish(reject, err);
              return;
            }
            try {
              var cred = GoogleAuthProvider.credential(null, tokenResponse.access_token);
              var result = await signInWithCredential(auth, cred);
              finish(resolve, packGoogleResult(result));
            } catch (e) {
              finish(reject, e);
            }
          },
        });
        client.requestAccessToken({ prompt: 'select_account' });
      } catch (e) {
        finish(reject, e);
      }
    });
  });
}

async function waitForNativeGoogleApi(maxMs) {
  const limit = maxMs || 4000;
  const start = Date.now();
  while (Date.now() - start < limit) {
    const api =
      typeof window !== 'undefined' ? window.__FT_NATIVE_GOOGLE_AUTH__ : null;
    if (api && typeof api.signIn === 'function') return api;
    await new Promise(function (r) {
      setTimeout(r, 40);
    });
  }
  return null;
}

async function signInWithIdToken(idToken) {
  if (!ready || !auth || !idToken) return null;
  const cred = GoogleAuthProvider.credential(String(idToken));
  return packGoogleResult(await signInWithCredential(auth, cred));
}

async function signInWithGoogleNativeBridge() {
  const api = await waitForNativeGoogleApi();
  if (!api) return null;

  const native = await api.signIn();
  const cred = GoogleAuthProvider.credential(native.idToken, native.accessToken || undefined);
  let result;
  try {
    result = await signInWithCredential(auth, cred);
  } catch (credErr) {
    const credCode = credErr && credErr.code ? String(credErr.code) : '';
    if (credCode === 'auth/account-exists-with-different-credential') {
      const pending = googleCredentialFromError(credErr) || cred;
      credErr.pendingGoogleCredential = {
        idToken: (pending && pending.idToken) || native.idToken,
        accessToken: (pending && pending.accessToken) || native.accessToken || null,
      };
      throw credErr;
    }
    if (auth.currentUser && auth.currentUser.email) {
      result = { user: auth.currentUser };
    } else if (credCode === 'auth/invalid-credential' || credCode === 'auth/credential-already-in-use') {
      const err = new Error('google_credential_sync_failed');
      err.code = 'auth/google-credential-failed';
      throw err;
    } else {
      throw credErr;
    }
  }
  const packed = packGoogleResult(result);
  if (packed && native && typeof native.isNewUser === 'boolean') {
    packed.isNewUser = native.isNewUser;
  }
  if (packed && !packed.googleCredential && native.idToken) {
    packed.googleCredential = {
      idToken: native.idToken,
      accessToken: native.accessToken || null,
    };
  }
  return packed;
}

async function signInWithGoogle() {
  if (!ready || !auth) throw new Error('firebase_not_ready');
  const cfg = getCfg() || {};
  const webClientId = hasGoogleWebClientId(cfg);

  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });

  if (isNativeCapacitor()) {
    try {
      const nativeResult = await signInWithGoogleNativeBridge();
      if (nativeResult && nativeResult.user) return nativeResult;
    } catch (nativeErr) {
      const nativeCode = nativeErr && nativeErr.code ? String(nativeErr.code) : '';
      console.warn('[FTFirebase] Google native', nativeCode, nativeErr);
      if (
        nativeCode === 'auth/popup-closed-by-user' ||
        nativeCode === 'auth/cancelled' ||
        (nativeErr && nativeErr.message && String(nativeErr.message).includes('cancel'))
      ) {
        throw nativeErr;
      }
    }

    if (webClientId) {
      try {
        return await signInWithGoogleAccessToken(String(cfg.googleWebClientId).trim());
      } catch (gsiErr) {
        const gsiCode = gsiErr && gsiErr.code ? String(gsiErr.code) : '';
        console.warn('[FTFirebase] Google GIS fallback', gsiCode, gsiErr);
        if (gsiCode === 'auth/popup-closed-by-user') throw gsiErr;
      }
    }

    const err = new Error('native_google_failed');
    err.code = 'auth/native-google-failed';
    throw err;
  }

  try {
    return packGoogleResult(await signInWithPopup(auth, provider));
  } catch (err) {
    const code = err && err.code ? String(err.code) : '';
    if (code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      return null;
    }
    if (code === 'auth/popup-closed-by-user') throw err;
    throw err;
  }
}

async function handleGoogleRedirectResult() {
  if (!ready || !auth) return null;
  try {
    return packGoogleResult(await getRedirectResult(auth));
  } catch (err) {
    if (err && err.code === 'auth/no-auth-event') return null;
    throw err;
  }
}

async function getSignInMethods(email) {
  if (!ready || !auth) return [];
  return fetchSignInMethodsForEmail(auth, String(email).trim());
}

function waitForAuthReady() {
  return waitForAuthUser(8000);
}

function waitForAuthUser(maxMs) {
  if (!ready || !auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  const limit = typeof maxMs === 'number' ? maxMs : 8000;
  return new Promise(function (resolve) {
    let settled = false;
    function finish(user) {
      if (settled) return;
      settled = true;
      unsub();
      clearTimeout(timer);
      resolve(user || null);
    }
    const unsub = onAuthStateChanged(auth, function (user) {
      if (user) finish(user);
    });
    const timer = setTimeout(function () {
      finish(auth.currentUser || null);
    }, limit);
  });
}

async function signInEmailPassword(email, password) {
  if (!ready || !auth) throw new Error('firebase_not_ready');
  return signInWithEmailAndPassword(auth, String(email).trim(), password);
}

async function registerEmailPassword(email, password, displayName) {
  if (!ready || !auth) throw new Error('firebase_not_ready');
  const cred = await createUserWithEmailAndPassword(auth, String(email).trim(), password);
  if (displayName && cred.user) {
    try {
      await updateProfile(cred.user, { displayName: String(displayName).trim() });
    } catch (_) {
      /* optional */
    }
  }
  return cred;
}

async function ensureAuthForFirestore(expectedUid) {
  const user = await waitForAuthUser(8000);
  if (!user) {
    const err = new Error('no_user');
    err.code = 'auth/no-current-user';
    throw err;
  }
  if (expectedUid && String(user.uid) !== String(expectedUid)) {
    const err = new Error('auth_uid_mismatch');
    err.code = 'auth/uid-mismatch';
    throw err;
  }
  try {
    await user.getIdToken(true);
  } catch (_) {
    /* token refresh optional */
  }
  return user;
}

async function saveUserProfile(uid, data) {
  if (!ready || !db) throw new Error('firebase_not_ready');
  const id = String(uid);
  await ensureAuthForFirestore(id);
  const payload = Object.assign({}, data || {}, {
    updatedAt: serverTimestamp(),
  });
  try {
    await setDoc(doc(db, 'users', id), payload, { merge: true });
  } catch (usersErr) {
    const code = usersErr && usersErr.code ? String(usersErr.code) : '';
    console.error('[FTFirebase] save users/' + id, code, usersErr);
    throw usersErr;
  }
  const emailKey = normalizeEmailKey(payload.email || data?.email);
  if (emailKey) {
    try {
      await setDoc(
        doc(db, 'userEmails', emailKey),
        {
          uid: id,
          email: payload.email || data.email,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (indexErr) {
      console.warn('[FTFirebase] userEmails index skipped', emailKey, indexErr);
    }
  }
  const usernameKey = normalizeUsernameKey(payload.username || data?.username);
  if (usernameKey) {
    try {
      await setDoc(
        doc(db, 'userNames', usernameKey),
        {
          uid: id,
          username: payload.username || data.username,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (indexErr) {
      console.warn('[FTFirebase] userNames index skipped', usernameKey, indexErr);
    }
  }
}

async function findUidByEmail(email) {
  if (!ready || !db) return null;
  const emailKey = normalizeEmailKey(email);
  if (!emailKey) return null;
  const snap = await getDoc(doc(db, 'userEmails', emailKey));
  return snap.exists() && snap.data().uid ? String(snap.data().uid) : null;
}

async function findUidByUsername(username) {
  if (!ready || !db) return null;
  const usernameKey = normalizeUsernameKey(username);
  if (!usernameKey) return null;
  const snap = await getDoc(doc(db, 'userNames', usernameKey));
  return snap.exists() && snap.data().uid ? String(snap.data().uid) : null;
}

async function isEmailRegistered(email, exceptUid) {
  if (!ready || !auth) return false;
  const mail = String(email || '').trim();
  if (!mail) return false;
  const methods = await getSignInMethods(mail);
  if (!methods || methods.length === 0) {
    const uid = await findUidByEmail(mail).catch(function () {
      return null;
    });
    if (!uid) return false;
    return exceptUid ? String(uid) !== String(exceptUid) : true;
  }
  if (!exceptUid) return true;
  const cur = auth.currentUser;
  if (
    cur &&
    cur.uid === exceptUid &&
    cur.email &&
    cur.email.toLowerCase() === mail.toLowerCase()
  ) {
    return false;
  }
  const uid = await findUidByEmail(mail).catch(function () {
    return null;
  });
  if (uid && String(uid) !== String(exceptUid)) return true;
  return methods.length > 0;
}

async function isUsernameTaken(username, exceptUid) {
  if (!ready || !db) return false;
  const uid = await findUidByUsername(username);
  if (!uid) return false;
  return exceptUid ? String(uid) !== String(exceptUid) : true;
}

async function linkPasswordToCurrentUser(password) {
  if (!ready || !auth || !auth.currentUser) throw new Error('no_user');
  const email = auth.currentUser.email;
  if (!email) throw new Error('no_email');
  const cred = EmailAuthProvider.credential(email, password);
  try {
    return await linkWithCredential(auth.currentUser, cred);
  } catch (linkErr) {
    const code = linkErr && linkErr.code ? String(linkErr.code) : '';
    if (code === 'auth/provider-already-linked' || code === 'auth/credential-already-in-use') {
      return { user: auth.currentUser };
    }
    throw linkErr;
  }
}

async function signInPasswordAndLinkGoogle(email, password, googleCred) {
  if (!ready || !auth) throw new Error('firebase_not_ready');
  const mail = String(email).trim();
  const userCred = await signInWithEmailAndPassword(auth, mail, password);
  if (googleCred && googleCred.idToken) {
    const gCred = GoogleAuthProvider.credential(
      googleCred.idToken,
      googleCred.accessToken || undefined
    );
    try {
      await linkWithCredential(userCred.user, gCred);
    } catch (linkErr) {
      const code = linkErr && linkErr.code ? String(linkErr.code) : '';
      if (code !== 'auth/provider-already-linked' && code !== 'auth/credential-already-in-use') {
        throw linkErr;
      }
    }
  }
  return userCred;
}

async function loadUserProfile(uid) {
  if (!ready || !db) return null;
  const snap = await getDoc(doc(db, 'users', String(uid)));
  return snap.exists() ? snap.data() : null;
}

// ── Redefinição de senha por código OTP ─────────────────────

function otpEmailKey(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._]/g, '_');
}

/** Gera código de 6 dígitos, armazena no Firestore e retorna o código. */
async function generateOtpCode(email) {
  if (!ready || !db) throw new Error('firebase_not_ready');
  const mail = String(email || '').trim().toLowerCase();
  if (!mail) throw new Error('missing_email');

  const code      = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos
  const key       = otpEmailKey(mail);

  await setDoc(doc(db, 'passwordResetCodes', key), {
    email: mail,
    code,
    expiresAt,
    used: false,
    createdAt: serverTimestamp(),
  });

  return code;
}

/** Chama a Cloud Function para verificar o código e alterar a senha. */
async function callApplyPasswordReset(email, code, newPassword) {
  if (!ready || !fns) throw new Error('firebase_not_ready');
  const fn = httpsCallable(fns, 'applyPasswordReset');
  await fn({
    email:       String(email).trim().toLowerCase(),
    code:        String(code).trim(),
    newPassword: String(newPassword),
  });
}

// ── Redefinição por link (legacy / fallback) ──────────────────
async function sendResetEmail(email) {
  if (!ready || !auth) throw new Error('firebase_not_ready');
  const mail = String(email || '').trim();
  if (!mail) throw new Error('missing_email');
  const actionCodeSettings = {
    url: `https://financy-4d5f7.web.app/pages/reset-password.html`,
    handleCodeInApp: false,
  };
  await sendPasswordResetEmail(auth, mail, actionCodeSettings);
}

async function verifyResetCode(oobCode) {
  if (!ready || !auth) throw new Error('firebase_not_ready');
  return verifyPasswordResetCode(auth, oobCode);
}

async function applyNewPassword(oobCode, newPassword) {
  if (!ready || !auth) throw new Error('firebase_not_ready');
  await confirmPasswordReset(auth, oobCode, newPassword);
}

// ── Transações por utilizador ────────────────────────────────

async function addTransaction(uid, tx) {
  if (!ready || !db) throw new Error('firebase_not_ready');
  const txId = String(tx.id);
  const payload = Object.assign({}, tx, { syncedAt: serverTimestamp() });
  await setDoc(doc(db, 'users', String(uid), 'transactions', txId), payload);
}

async function loadTransactions(uid) {
  if (!ready || !db) return [];
  const snap = await getDocs(
    query(collection(db, 'users', String(uid), 'transactions'), orderBy('at', 'desc'))
  );
  return snap.docs.map(function (d) { return d.data(); });
}

async function deleteTransaction(uid, txId) {
  if (!ready || !db) throw new Error('firebase_not_ready');
  await deleteDoc(doc(db, 'users', String(uid), 'transactions', String(txId)));
}

async function updateTransaction(uid, tx) {
  if (!ready || !db) throw new Error('firebase_not_ready');
  const txId = String(tx.id);
  const payload = Object.assign({}, tx, { syncedAt: serverTimestamp() });
  await setDoc(doc(db, 'users', String(uid), 'transactions', txId), payload, { merge: true });
}

async function uploadReceiptImage(uid, txId, dataUrl) {
  if (!ready || !storage) throw new Error('storage_not_ready');
  const path = 'receipts/' + String(uid) + '/' + String(txId) + '.jpg';
  const storageRef = ref(storage, path);
  await uploadString(storageRef, dataUrl, 'data_url');
  return getDownloadURL(storageRef);
}

async function callAnalyzeReceipt(ocrText, imageBase64) {
  if (!ready || !fns) throw new Error('firebase_not_ready');
  const fn = httpsCallable(fns, 'analyzeReceipt');
  const result = await fn({
    ocrText: ocrText || '',
    imageBase64: imageBase64 || '',
  });
  return result && result.data ? result.data : null;
}

function watchAuth(cb) {
  if (!ready || !auth) return function () {};
  return onAuthStateChanged(auth, cb);
}

init();

const api = {
  init,
  isReady: () => ready,
  isConfigured: () => isConfigured(getCfg()),
  mapAuthError,
  getAuth: () => auth,
  getCurrentUser: () => (auth ? auth.currentUser : null),
  signInEmailPassword,
  registerEmailPassword,
  signOut: () => (auth ? signOut(auth) : Promise.resolve()),
  signInWithGoogle,
  signInWithIdToken,
  handleGoogleRedirectResult,
  getSignInMethods,
  waitForAuthReady,
  waitForAuthUser,
  saveUserProfile,
  loadUserProfile,
  findUidByEmail,
  findUidByUsername,
  isEmailRegistered,
  isUsernameTaken,
  linkPasswordToCurrentUser,
  signInPasswordAndLinkGoogle,
  googleCredentialFromError,
  watchAuth,
  sendResetEmail,
  verifyResetCode,
  applyNewPassword,
  generateOtpCode,
  callApplyPasswordReset,
  addTransaction,
  updateTransaction,
  loadTransactions,
  deleteTransaction,
  uploadReceiptImage,
  callAnalyzeReceipt,
};

if (typeof window !== 'undefined') {
  window.FTFirebase = api;
}

