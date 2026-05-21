/**
 * Entry for esbuild — Capgo NativeBiometric + Capacitor core (bundled into www).
 */
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

export async function isNativeBiometricAvailable() {
  try {
    const res = await NativeBiometric.isAvailable({ useFallback: true });
    return !!(res.isAvailable || res.deviceIsSecure);
  } catch (_) {
    return false;
  }
}

export async function hasStoredCredentials(server) {
  try {
    const creds = await NativeBiometric.getCredentials({ server });
    return !!(creds && creds.username);
  } catch (_) {
    return false;
  }
}

/** E-mail guardado no Keychain/Keystore (sem pedir biometria). */
export async function getStoredBiometricEmail(server) {
  try {
    const creds = await NativeBiometric.getCredentials({ server });
    if (!creds || !creds.username) return null;
    return String(creds.username).trim();
  } catch (_) {
    return null;
  }
}

export async function verifyBiometricIdentity(opts) {
  const o = opts || {};
  await NativeBiometric.verifyIdentity({
    reason: o.reason || 'Confirmar identidade',
    title: o.title || 'Finance Tracker',
    subtitle: o.subtitle || '',
    description: o.description || '',
  });
}

export async function tryNativeBiometricLogin(server) {
  try {
    const res = await NativeBiometric.isAvailable({ useFallback: true });
    if (!res.isAvailable && !res.deviceIsSecure) {
      return { ok: false, reason: 'unavailable' };
    }
    await verifyBiometricIdentity({
      reason: 'Use sua biometria para entrar no Finance Tracker',
      title: 'Entrar',
    });
    const creds = await NativeBiometric.getCredentials({ server });
    if (!creds || !creds.username) {
      return { ok: false, reason: 'no-credentials' };
    }
    return {
      ok: true,
      email: creds.username,
      password: creds.password || '',
    };
  } catch (e) {
    return { ok: false, reason: e && e.message ? e.message : String(e) };
  }
}

export async function saveNativeBiometricCredentials(server, email, password) {
  const available = await isNativeBiometricAvailable();
  if (!available) {
    const err = new Error('biometrics_unavailable');
    err.code = 'bio/unavailable';
    throw err;
  }
  await verifyBiometricIdentity({
    reason: 'Confirme para ativar o login com biometria',
    title: 'Ativar biometria',
    subtitle: 'Finance Tracker',
  });
  await NativeBiometric.setCredentials({
    server,
    username: String(email).trim(),
    password: password || '',
  });
}

export async function deleteNativeBiometricCredentials(server) {
  try {
    await NativeBiometric.deleteCredentials({ server });
  } catch (_) {
    /* já vazio */
  }
}
