/**
 * Google Sign-In nativo + restauração de sessão (para biometria sem abrir Google de novo).
 */
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

export async function signInWithGoogleNative() {
  const result = await FirebaseAuthentication.signInWithGoogle({
    skipNativeAuth: false,
  });
  const cred = result && result.credential;
  if (!cred || !cred.idToken) {
    const err = new Error('native_google_no_token');
    err.code = 'auth/native-google-no-token';
    throw err;
  }
  return {
    idToken: cred.idToken,
    accessToken: cred.accessToken || null,
    isNewUser: !!(result.additionalUserInfo && result.additionalUserInfo.isNewUser),
  };
}

/** Restaura sessão nativa Firebase (se ainda válida) para sincronizar com o SDK JS. */
export async function restoreNativeSessionForEmail(email) {
  const wanted = String(email || '').trim().toLowerCase();
  if (!wanted) return null;
  try {
    const { user } = await FirebaseAuthentication.getCurrentUser();
    if (!user || !user.email) return null;
    if (String(user.email).trim().toLowerCase() !== wanted) return null;
    const { token } = await FirebaseAuthentication.getIdToken({ forceRefresh: false });
    if (!token) return null;
    return { idToken: token, email: user.email };
  } catch (_) {
    return null;
  }
}
