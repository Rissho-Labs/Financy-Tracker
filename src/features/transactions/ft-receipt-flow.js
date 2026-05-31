/**
 * Pipeline compartilhado: OCR + DeepSeek → transação + relatório
 * @author Rickson.Hirata
 */
(function (global) {
  'use strict';

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function (e) { resolve(e.target.result); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  /** MIME e extensões aceitos para comprovantes */
  var ALLOWED_RECEIPT_MIME = {
    'image/jpeg': true,
    'image/png': true,
    'image/webp': true,
    'image/gif': true,
    'image/bmp': true,
    'image/x-ms-bmp': true,
    'image/tiff': true,
    'image/heic': true,
    'image/heif': true,
    'application/pdf': true,
  };

  var ALLOWED_RECEIPT_EXT = {
    jpg: true,
    jpeg: true,
    png: true,
    webp: true,
    gif: true,
    bmp: true,
    tif: true,
    tiff: true,
    heic: true,
    heif: true,
    pdf: true,
  };

  var RECEIPT_ACCEPT_ATTR =
    '.pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,' +
    'application/pdf,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/tiff,image/heic,image/heif';

  function receiptFileExtension(name) {
    var m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
  }

  function normalizeReceiptMime(file) {
    if (!file) return '';
    var mime = String(file.type || '').toLowerCase().split(';')[0].trim();
    if (mime === 'image/jpg') return 'image/jpeg';
    if (mime === 'application/x-pdf') return 'application/pdf';
    return mime;
  }

  function isAllowedReceiptFile(file) {
    if (!file) return false;
    var mime = normalizeReceiptMime(file);
    if (mime && ALLOWED_RECEIPT_MIME[mime]) return true;
    var ext = receiptFileExtension(file.name);
    return !!(ext && ALLOWED_RECEIPT_EXT[ext]);
  }

  function isReceiptImageFile(file) {
    if (!file || !isAllowedReceiptFile(file)) return false;
    var mime = normalizeReceiptMime(file);
    if (mime.indexOf('image/') === 0) return true;
    var ext = receiptFileExtension(file.name);
    return ext !== 'pdf';
  }

  function isReceiptPdfFile(file) {
    if (!file || !isAllowedReceiptFile(file)) return false;
    var mime = normalizeReceiptMime(file);
    if (mime === 'application/pdf') return true;
    return receiptFileExtension(file.name) === 'pdf';
  }

  function invalidReceiptTypeMessage() {
    return (
      'Formato não permitido.\n\n' +
      'Envie apenas: JPG, PNG, WEBP, GIF, BMP, TIFF, HEIC ou PDF.'
    );
  }

  function rejectInvalidReceiptFile() {
    alert(invalidReceiptTypeMessage());
    return { ok: false, reason: 'invalid_type' };
  }

  function showAnalyzing(previewUrl) {
    if (typeof FTReceiptReport !== 'undefined' && FTReceiptReport.showAnalyzing) {
      FTReceiptReport.showAnalyzing(previewUrl);
    }
  }

  function hideAnalyzing() {
    if (typeof FTReceiptReport !== 'undefined' && FTReceiptReport.hideAnalyzing) {
      FTReceiptReport.hideAnalyzing();
    }
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function withTimeout(promise, ms, fallback) {
    return Promise.race([
      promise,
      delay(ms).then(function () {
        return fallback;
      }),
    ]);
  }

  function dataUrlByteLength(dataUrl) {
    if (!dataUrl) return 0;
    var b64 = String(dataUrl).split(',')[1] || '';
    return Math.floor((b64.length * 3) / 4);
  }

  async function uploadReceiptIfPossible(txId, dataUrl) {
    var local = { receiptImageUrl: null, receiptImageData: dataUrl };

    try {
      var u = typeof FTSession !== 'undefined' ? FTSession.parseUser() : null;
      if (!u || !u.uid) return local;
      if (
        typeof FTFirebase === 'undefined' ||
        !FTFirebase.isReady ||
        !FTFirebase.isReady() ||
        typeof FTFirebase.uploadReceiptImage !== 'function'
      ) {
        return local;
      }

      // PDFs/imagens grandes podem travar o Storage — limite ~2,5 MB
      if (dataUrlByteLength(dataUrl) > 2.5 * 1024 * 1024) {
        console.warn('[ReceiptFlow upload] arquivo grande — guardando só no dispositivo');
        return local;
      }

      var url = await withTimeout(
        FTFirebase.uploadReceiptImage(u.uid, txId, dataUrl),
        10000,
        null
      );
      if (url) return { receiptImageUrl: url, receiptImageData: dataUrl };
    } catch (e) {
      console.warn('[ReceiptFlow upload]', e.message || e);
    }
    return local;
  }

  function uploadReceiptInBackground(txId, dataUrl) {
    uploadReceiptIfPossible(txId, dataUrl).then(function (images) {
      if (
        !images ||
        !images.receiptImageUrl ||
        typeof FTTransactions === 'undefined' ||
        typeof FTTransactions.update !== 'function'
      ) {
        return;
      }
      FTTransactions.update(txId, { receiptImageUrl: images.receiptImageUrl });
    }).catch(function () { /* noop */ });
  }

  async function createTransactionFromReceipt(dataUrl, parsed, fallbackName) {
    if (typeof FTTransactions === 'undefined') return null;
    var txId = 'tx_' + Date.now();
    var at =
      typeof FTDeepSeekReceipt !== 'undefined'
        ? FTDeepSeekReceipt.buildAtIso(parsed.date, parsed.time)
        : new Date().toISOString();
    var name = parsed.establishment || fallbackName || 'Gasto registrado por nota';
    var pay = parsed.paymentMethod || '';
    var inst = pay === 'credito_parcelado' ? Math.max(2, parsed.installments || 2) : 1;

    // Guarda já com imagem local — upload na nuvem não bloqueia a UI
    var localImage = dataUrl;
    if (dataUrlByteLength(dataUrl) > 900 * 1024) {
      localImage = null;
    }

    FTTransactions.add({
      id: txId,
      name: name,
      location: name,
      amountCents: parsed.amountCents || 0,
      paymentMethod: pay,
      installments: inst,
      category: parsed.category || undefined,
      at: at,
      receiptDate: parsed.date || '',
      receiptTime: parsed.time || '',
      hasReceiptReport: true,
      receiptImageUrl: null,
      receiptImageData: localImage,
      ocrProvider: parsed.provider || 'deepseek',
    });

    uploadReceiptInBackground(txId, dataUrl);

    return txId;
  }

  async function runOcrOnImage(dataUrl) {
    var base64 = (dataUrl.split(',')[1] || '').trim();
    if (!base64) return '';
    try {
      var plugin = global.FTMlKit;
      if (plugin && typeof plugin.detectText === 'function') {
        var result = await plugin.detectText({ base64Image: base64 });
        return (result && result.text) || '';
      }
    } catch (err) {
      console.warn('[ReceiptFlow OCR]', err.message || err);
    }
    return '';
  }

  async function analyzeReceipt(rawText, base64, mime) {
    try {
      if (typeof FTDeepSeekReceipt !== 'undefined') {
        return await FTDeepSeekReceipt.analyze(rawText, base64, mime);
      }
      if (typeof FTReceiptParser !== 'undefined') {
        var legacy = FTReceiptParser.parse(rawText);
        return {
          isValidReceipt: Number.isFinite(legacy.amountCents) && legacy.amountCents > 0,
          establishment: legacy.name,
          date: '',
          time: '',
          amountCents: legacy.amountCents,
          paymentMethod: '',
          installments: 1,
          category: legacy.category,
          provider: 'mlkit',
        };
      }
    } catch (err) {
      console.warn('[ReceiptFlow DeepSeek]', err.message || err);
    }
    return {
      isValidReceipt: false,
      establishment: '',
      date: '',
      time: '',
      amountCents: 0,
      paymentMethod: '',
      installments: 1,
      category: '',
      provider: 'none',
    };
  }

  function fallbackNameForSource(source) {
    if (source === 'escanear') return 'Gasto registrado por escaneamento';
    if (source === 'arquivo') return 'Gasto registrado por arquivo';
    return 'Gasto registrado por nota';
  }

  function buildFileHint(file) {
    if (!file) return '';
    var parts = [];
    if (file.name) parts.push('Arquivo: ' + file.name);
    var name = String(file.name || '').toLowerCase();
    if (/das|mei|simples|pgdas|darf|gps|boleto|guia|arrecad/i.test(name)) {
      parts.push('Tipo provável: guia de arrecadação / DAS MEI / tributo');
    }
    return parts.join('\n');
  }

  function mimeFromDataUrl(dataUrl) {
    var m = String(dataUrl || '').match(/^data:([^;]+);/);
    return m ? m[1] : 'image/jpeg';
  }

  function isPdfDataUrl(dataUrl) {
    if (typeof FTPdfBridge !== 'undefined' && FTPdfBridge.isPdfDataUrl) {
      return FTPdfBridge.isPdfDataUrl(dataUrl);
    }
    return String(dataUrl || '').indexOf('data:application/pdf') === 0;
  }

  async function prepareDocumentForAi(dataUrl, scanText) {
    var visionDataUrl = dataUrl;
    var rawText = scanText ? scanText + '\n' : '';
    var base64 = '';
    var mime = mimeFromDataUrl(dataUrl);

    if (isPdfDataUrl(dataUrl)) {
      rawText += 'Formato: PDF\n';
      if (typeof FTPdfBridge !== 'undefined') {
        try {
          var pdfText = await FTPdfBridge.extractText(dataUrl);
          if (pdfText) rawText += pdfText + '\n';
          visionDataUrl = await FTPdfBridge.renderFirstPage(dataUrl);
          mime = 'image/jpeg';
          base64 = (visionDataUrl.split(',')[1] || '').trim();
          rawText += await runOcrOnImage(visionDataUrl);
        } catch (err) {
          console.warn('[ReceiptFlow PDF]', err.message || err);
          rawText += '(Não foi possível ler o PDF automaticamente.)\n';
        }
      } else {
        rawText += '(Leitor PDF indisponível — use imagem ou screenshot do DAS.)\n';
      }
    } else {
      base64 = (String(dataUrl || '').split(',')[1] || '').trim();
      if (mime.indexOf('image/') === 0) {
        rawText += await runOcrOnImage(dataUrl);
      }
    }

    if (!base64 && visionDataUrl && visionDataUrl.indexOf('data:image') === 0) {
      base64 = (visionDataUrl.split(',')[1] || '').trim();
      mime = mimeFromDataUrl(visionDataUrl);
    }

    return { rawText: rawText, base64: base64, mime: mime, visionDataUrl: visionDataUrl };
  }

  function isTaxDocumentHint(text, parsed) {
    var est = parsed && parsed.establishment ? parsed.establishment : '';
    var t = (String(text || '') + ' ' + est).toLowerCase();
    return /das|mei|simples\s*nacional|darf|gps|guia\s*de\s*arrecada|documento\s*de\s*arrecada|pgdas|tributo|receita\s*federal|pgfn|inss|prefeitura\s*municipal/.test(t);
  }

  function isGenericFallbackName(name) {
    var n = String(name || '').toLowerCase();
    return (
      n.indexOf('gasto registrado') >= 0 ||
      n.indexOf('escaneamento') >= 0 ||
      n.indexOf('arquivo') >= 0 ||
      n.indexOf('nota') >= 0 && n.length < 28
    );
  }

  function validateParsed(parsed, scanText, rawText) {
    if (!parsed) return false;
    if (parsed.isValidReceipt === false) return false;

    var taxDoc = isTaxDocumentHint(rawText + '\n' + scanText, parsed);

    if (parsed.amountCents > 0 && taxDoc) {
      return true;
    }

    if (parsed.amountCents > 0 && !isGenericFallbackName(parsed.establishment)) {
      return true;
    }

    if (parsed.amountCents > 0 && scanText) {
      return true;
    }

    if (scanText && String(scanText).length > 6 && parsed.establishment && !isGenericFallbackName(parsed.establishment)) {
      return true;
    }

    if (parsed.provider === 'mlkit' && parsed.amountCents > 0) {
      return true;
    }

    if (rawText && rawText.length > 40 && parsed.amountCents > 0) {
      return true;
    }

    return false;
  }

  function setProgressTarget(pct) {
    if (typeof FTReceiptReport !== 'undefined' && FTReceiptReport.setAnalyzeProgressTarget) {
      FTReceiptReport.setAnalyzeProgressTarget(pct);
    }
  }

  async function notifyDone(opts) {
    if (typeof FTReceiptReport !== 'undefined' && FTReceiptReport.completeAnalyzeProgress) {
      setProgressTarget(100);
      await FTReceiptReport.completeAnalyzeProgress();
    }

    hideAnalyzing();

    if (opts && typeof opts.onClosePanels === 'function') {
      opts.onClosePanels();
    }
    if (opts && typeof opts.onSynced === 'function') opts.onSynced();
    if (typeof global.__ftSyncHome === 'function') global.__ftSyncHome();
    global.dispatchEvent(new CustomEvent('ft-transactions-changed'));

    var redirected = false;
    if (typeof global.__ftReturnToHomeView === 'function') {
      redirected = global.__ftReturnToHomeView() === true;
    }
    if (redirected) return { ok: true, redirected: true };

    if (typeof FTReceiptReport !== 'undefined') {
      FTReceiptReport.showSuccess('Registo feito', function () {
        if (opts && typeof opts.onHaptic === 'function') opts.onHaptic('light');
      });
    } else if (opts && typeof opts.onHaptic === 'function') {
      opts.onHaptic('medium');
    }
    return { ok: true };
  }

  function notifyRejected(opts) {
    hideAnalyzing();
    if (typeof FTReceiptReport !== 'undefined' && FTReceiptReport.showAnalyzeError) {
      FTReceiptReport.showAnalyzeError(opts && opts.onRetry);
    } else {
      alert('Não foi possível registrar o seu gasto. Tente novamente.');
      if (opts && typeof opts.onRetry === 'function') opts.onRetry();
    }
    if (opts && typeof opts.onHaptic === 'function') opts.onHaptic('error');
  }

  async function processReceiptData(dataUrl, scanText, opts) {
    opts = opts || {};
    var source = opts.source || 'escanear';
    var preview = dataUrl && String(dataUrl).indexOf('data:image') === 0 ? dataUrl : null;

    showAnalyzing(preview);
    setProgressTarget(8);

    try {
      var doc = await prepareDocumentForAi(dataUrl, scanText);
      setProgressTarget(38);

      var parsed = await analyzeReceipt(doc.rawText, doc.base64, doc.mime);
      setProgressTarget(72);

      if (!validateParsed(parsed, scanText, doc.rawText)) {
        notifyRejected(opts);
        return { ok: false, reason: 'invalid_receipt' };
      }

      setProgressTarget(88);
      var fallback = fallbackNameForSource(source);
      var storeUrl = doc.visionDataUrl || dataUrl;
      await createTransactionFromReceipt(storeUrl, parsed, fallback);
      setProgressTarget(96);

      return await notifyDone(opts);
    } catch (err) {
      console.warn('[ReceiptFlow]', err);
      notifyRejected(opts);
      return { ok: false, reason: 'error' };
    }
  }

  /**
   * Processa captura da câmera (QR, código de barras ou foto da nota).
   */
  async function processCapture(dataUrl, scanText, opts) {
    opts = opts || {};

    if (typeof FTAiConsent !== 'undefined') {
      var allowed = await FTAiConsent.requestConsent();
      if (!allowed) return { ok: false, reason: 'consent_denied' };
    }

    if (!dataUrl) {
      return { ok: false, reason: 'no_image' };
    }

    return processReceiptData(dataUrl, scanText || '', opts);
  }

  /**
   * Processa arquivo (PDF ou imagem) selecionado pelo usuário.
   */
  async function processFile(file, opts) {
    opts = opts || {};
    var source = opts.source || 'arquivo';

    if (typeof FTAiConsent !== 'undefined') {
      var allowed = await FTAiConsent.requestConsent();
      if (!allowed) return { ok: false, reason: 'consent_denied' };
    }

    if (!isAllowedReceiptFile(file)) {
      return rejectInvalidReceiptFile();
    }

    var dataUrl;
    try {
      dataUrl = await readFileAsDataUrl(file);
    } catch (e) {
      alert('Não foi possível ler o arquivo.');
      return { ok: false, reason: 'read_error' };
    }

    return processReceiptData(dataUrl, buildFileHint(file), opts);
  }

  global.FTReceiptFlow = {
    processFile: processFile,
    processCapture: processCapture,
    readFileAsDataUrl: readFileAsDataUrl,
    validateParsed: validateParsed,
    buildFileHint: buildFileHint,
    isAllowedReceiptFile: isAllowedReceiptFile,
    isReceiptImageFile: isReceiptImageFile,
    isReceiptPdfFile: isReceiptPdfFile,
    invalidReceiptTypeMessage: invalidReceiptTypeMessage,
    RECEIPT_ACCEPT_ATTR: RECEIPT_ACCEPT_ATTR,
  };
})(typeof window !== 'undefined' ? window : global);
