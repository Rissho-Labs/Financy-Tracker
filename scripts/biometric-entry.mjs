/**
 * Entry for esbuild — Capgo NativeBiometric + Capacitor core (bundled into www).
 */
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

export async function tryNativeBiometricLogin(server) {
  try {
    const res = await NativeBiometric.isAvailable({ useFallback: true });
    if (!res.isAvailable && !res.deviceIsSecure) {
      return { ok: false, reason: 'unavailable' };
    }
    await NativeBiometric.verifyIdentity({
      reason: 'Confirmar acesso ao Finance Tracker',
      title: 'Entrar',
      subtitle: '',
      description: '',
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
  await NativeBiometric.setCredentials({
    server,
    username: email,
    password: password || '',
  });
}
