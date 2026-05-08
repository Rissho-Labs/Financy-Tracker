/**
 * Exposes bundled Capgo NativeBiometric helpers on globalThis for non-module app.js.
 */
import { tryNativeBiometricLogin, saveNativeBiometricCredentials } from './ft-biometric.bundle.js';

globalThis.__FT_NATIVE_BIOMETRIC__ = {
  tryNativeBiometricLogin,
  saveNativeBiometricCredentials,
};
