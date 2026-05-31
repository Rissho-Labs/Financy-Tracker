/**
 * Bundle: qrcode + html5-qrcode para o app
 */
import QRCode from 'qrcode';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

if (typeof window !== 'undefined') {
  window.FTQRBridge = { QRCode, Html5Qrcode, Html5QrcodeSupportedFormats };
}
