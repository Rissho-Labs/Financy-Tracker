/**
 * Modal de escaneamento de gastos (QR, código de barras, nota)
 * @author Rickson.Hirata
 */
(function (global) {
  'use strict';

  var MODAL_ID = 'expense-scan-modal';
  var READER_ID = 'expense-qr-reader';

  var scanner = null;
  var scanHandled = false;
  var lastFocusEl = null;
  var onCloseCb = null;
  var currentFacingMode = 'user';

  function $(id) {
    return document.getElementById(id);
  }

  function haptic(type) {
    if (!navigator.vibrate) return;
    var p = { light: [8], medium: [18], error: [20, 50, 20], success: [12, 40, 12] };
    navigator.vibrate(p[type] || [8]);
  }

  function isMobileDevice() {
    return (
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && window.innerWidth < 900)
    );
  }

  function defaultFacingMode() {
    return isMobileDevice() ? 'environment' : 'user';
  }

  function setStatus(text, isError) {
    var el = $('expense-scan-status');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('is-error', !!isError);
  }

  function setControlsBusy(busy) {
    var cap = $('expense-scan-capture-btn');
    var flip = $('expense-scan-flip-btn');
    var closeBtn = $('expense-scan-close');
    if (cap) cap.disabled = !!busy;
    if (flip) flip.disabled = !!busy;
    if (closeBtn) closeBtn.disabled = !!busy;
  }

  function captureVideoFrame() {
    var host = $(READER_ID);
    if (!host) return null;
    var video = host.querySelector('video');
    if (!video || !video.videoWidth) return null;
    var canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.88);
  }

  async function stopScanner() {
    if (!scanner) return;
    try {
      var state = scanner.getState();
      if (state === 2) await scanner.stop();
    } catch (e) {
      /* ignore */
    }
    try {
      await scanner.clear();
    } catch (e) {
      /* ignore */
    }
    scanner = null;
    scanHandled = false;
  }

  function openSheet() {
    var el = $(MODAL_ID);
    if (!el) return;
    lastFocusEl = document.activeElement;
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }

  function closeSheet() {
    var el = $(MODAL_ID);
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    if (lastFocusEl && typeof lastFocusEl.focus === 'function') {
      lastFocusEl.focus();
    }
  }

  function retryScan() {
    scanHandled = false;
    setControlsBusy(false);
    setStatus('Aponte para QR, código de barras ou capture a nota.');
    startScanner();
  }

  async function finishWithCapture(dataUrl, scanText) {
    if (!dataUrl || typeof FTReceiptFlow === 'undefined') {
      setStatus('Não foi possível capturar a imagem.', true);
      scanHandled = false;
      return;
    }

    await stopScanner();
    setControlsBusy(true);
    setStatus('');

    var result = await FTReceiptFlow.processCapture(dataUrl, scanText || '', {
      source: 'escanear',
      onClosePanels: function () {
        if (typeof global.__ftCloseExpenseSheet === 'function') global.__ftCloseExpenseSheet();
      },
      onSynced: function () {
        if (typeof global.__ftSyncHome === 'function') global.__ftSyncHome();
      },
      onHaptic: haptic,
      onRetry: retryScan,
    });

    setControlsBusy(false);

    if (result && result.ok) {
      haptic('success');
      await close({ success: true });
      return;
    }

    if (result && result.reason === 'consent_denied') {
      setStatus('Consentimento necessário para usar IA.', true);
      scanHandled = false;
      startScanner();
      return;
    }

    if (result && result.reason === 'invalid_receipt') {
      /* modal de erro já exibido; aguarda "Tentar novamente" */
      return;
    }

    haptic('error');
    scanHandled = false;
    retryScan();
  }

  async function handleDecodedText(text) {
    if (scanHandled) return;
    scanHandled = true;
    haptic('medium');
    var frame = captureVideoFrame();
    await finishWithCapture(frame, text);
  }

  async function handleManualCapture() {
    if (scanHandled) return;
    scanHandled = true;
    haptic('medium');
    var frame = captureVideoFrame();
    if (!frame) {
      setStatus('Aguarde a câmera iniciar.', true);
      scanHandled = false;
      return;
    }
    await finishWithCapture(frame, '');
  }

  function supportedFormats() {
    var bridge = global.FTQRBridge;
    if (!bridge || !bridge.Html5QrcodeSupportedFormats) return undefined;
    var F = bridge.Html5QrcodeSupportedFormats;
    return [
      F.QR_CODE,
      F.CODE_128,
      F.CODE_39,
      F.EAN_13,
      F.EAN_8,
      F.ITF,
      F.UPC_A,
      F.UPC_E,
      F.PDF_417,
      F.DATA_MATRIX,
    ];
  }

  async function startScanner(isRetry) {
    var bridge = global.FTQRBridge;
    if (!bridge || !bridge.Html5Qrcode) {
      setStatus('Leitor indisponível. Rode npm run www:prepare.', true);
      return;
    }

    await stopScanner();
    setStatus('Aponte para QR, código de barras ou capture a nota.');
    scanHandled = false;
    setControlsBusy(false);

    var formats = supportedFormats();
    scanner = formats
      ? new bridge.Html5Qrcode(READER_ID, { formatsToSupport: formats, verbose: false })
      : new bridge.Html5Qrcode(READER_ID);

    var config = {
      fps: 10,
      qrbox: function (viewW, viewH) {
        var size = Math.min(viewW, viewH, 280) * 0.72;
        return { width: Math.floor(size), height: Math.floor(size) };
      },
      aspectRatio: 1,
    };

    try {
      await scanner.start(
        { facingMode: currentFacingMode },
        config,
        function (decodedText) {
          handleDecodedText(decodedText);
        },
        function () {
          /* frame sem código */
        }
      );
    } catch (err) {
      console.warn('[ExpenseScan]', err);
      if (!isRetry && currentFacingMode === 'environment') {
        currentFacingMode = 'user';
        setStatus('Usando câmera frontal. Toque em virar câmera se precisar.');
        return startScanner(true);
      }
      setStatus('Não foi possível abrir a câmera. Verifique permissão ou HTTPS.', true);
      haptic('error');
    }
  }

  async function flipCamera() {
    if (scanHandled) return;
    haptic('light');
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    setStatus('Virando câmera…');
    await startScanner();
  }

  function bindBackdrop() {
    var sheet = $(MODAL_ID);
    if (!sheet || sheet.dataset.bound) return;
    sheet.dataset.bound = '1';

    sheet.querySelectorAll('[data-close]').forEach(function (node) {
      node.addEventListener('click', function () {
        if (scanHandled) return;
        close({});
      });
    });

    sheet.addEventListener('click', function (e) {
      if (scanHandled) return;
      if (e.target === sheet || e.target.classList.contains('ft-sheet__backdrop')) {
        close({});
      }
    });

    $('expense-scan-capture-btn')?.addEventListener('click', function () {
      handleManualCapture();
    });

    $('expense-scan-flip-btn')?.addEventListener('click', function () {
      flipCamera();
    });

    $('expense-scan-close')?.addEventListener('click', function () {
      if (scanHandled) return;
      close({});
    });
  }

  /**
   * @param {{ onClose?: function }} opts
   */
  async function open(opts) {
    opts = opts || {};
    onCloseCb = typeof opts.onClose === 'function' ? opts.onClose : null;
    currentFacingMode = defaultFacingMode();
    bindBackdrop();
    haptic('light');
    openSheet();
    setTimeout(function () {
      startScanner();
    }, 320);
  }

  async function close(result) {
    result = result || {};
    await stopScanner();
    setStatus('');
    setControlsBusy(false);
    closeSheet();
    if (onCloseCb) {
      onCloseCb(result);
      onCloseCb = null;
    }
  }

  global.FTExpenseScan = {
    open: open,
    close: close,
    flipCamera: flipCamera,
  };
})(typeof window !== 'undefined' ? window : global);
