/**
 * Plugins nativos Capacitor expostos para app.js / Firebase bundle.
 */
import {
  tryNativeBiometricLogin,
  saveNativeBiometricCredentials,
  deleteNativeBiometricCredentials,
  hasStoredCredentials,
  getStoredBiometricEmail,
  isNativeBiometricAvailable,
} from './ft-biometric.bundle.js';
import {
  signInWithGoogleNative,
  restoreNativeSessionForEmail,
} from './ft-native-google.bundle.js';

globalThis.__FT_NATIVE_BIOMETRIC__ = {
  tryNativeBiometricLogin,
  saveNativeBiometricCredentials,
  deleteNativeBiometricCredentials,
  hasStoredCredentials,
  getStoredBiometricEmail,
  isNativeBiometricAvailable,
};

globalThis.__FT_NATIVE_GOOGLE_AUTH__ = {
  signIn: signInWithGoogleNative,
  restoreNativeSessionForEmail,
};
