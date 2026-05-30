/**
 * Bundle do plugin ML Kit Text Recognition para o WebView (Capacitor).
 * Expõe window.FTMlKit com o método detectText.
 */
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';

if (typeof window !== 'undefined') {
  window.FTMlKit = CapacitorPluginMlKitTextRecognition;
}
