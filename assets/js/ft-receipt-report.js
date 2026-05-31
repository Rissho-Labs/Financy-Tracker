/**
 * UI "Exibir" — relatório de compra por nota fiscal + overlay de sucesso.
 */
(function (global) {
  'use strict';

  var currentTxId = null;
  var editMode = false;
  var injected = false;

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function fmtBRL(cents) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  }

  function haptic(type) {
    if (navigator.vibrate) {
      var p = { light: [8], medium: [18], strong: [30] };
      navigator.vibrate(p[type] || [8]);
    }
  }

  function injectDom() {
    if (injected || !document.body) return;
    injected = true;

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div id="ft-success-overlay" class="ft-success-overlay" aria-hidden="true" role="dialog" aria-label="Sucesso">' +
      '  <div class="ft-success-card">' +
      '    <div class="ft-success-check" aria-hidden="true">' +
      '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
      '        <polyline points="20 6 9 17 4 12"/>' +
      '      </svg>' +
      '    </div>' +
      '    <p class="ft-success-title" id="ft-success-title">Registro concluído!</p>' +
      '    <p class="ft-success-hint">Toque em qualquer lugar para continuar</p>' +
      '  </div>' +
      '</div>' +
      '<div id="receipt-lightbox" class="receipt-lightbox" aria-hidden="true">' +
      '  <img id="receipt-lightbox-img" src="" alt="Nota fiscal ampliada" />' +
      '</div>' +
      '<div id="receipt-report-sheet" class="receipt-report-modal" aria-hidden="true">' +
      '  <div class="receipt-report-backdrop" id="receipt-report-bg"></div>' +
      '  <div class="receipt-report-dialog" role="dialog" aria-labelledby="receipt-report-title">' +
      '    <header class="receipt-report-header">' +
      '      <h2 class="receipt-report-title" id="receipt-report-title">Relatório</h2>' +
      '      <button type="button" class="receipt-report-close-x" id="rr-btn-close-x" aria-label="Fechar relatório">' +
      '        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '      </button>' +
      '    </header>' +
      '    <div class="receipt-report-scroll">' +
      '      <div class="receipt-report-body">' +
      '        <div class="receipt-field"><label for="rr-establishment">Estabelecimento</label>' +
      '          <input id="rr-establishment" type="text" disabled maxlength="120" autocomplete="off" /></div>' +
      '        <div class="receipt-field"><label for="rr-date">Data</label>' +
      '          <input id="rr-date" type="date" disabled /></div>' +
      '        <div class="receipt-field"><label for="rr-time">Hora</label>' +
      '          <input id="rr-time" type="time" disabled /></div>' +
      '        <div class="receipt-field"><label for="rr-amount">Valor pago (R$)</label>' +
      '          <input id="rr-amount" type="text" inputmode="decimal" disabled placeholder="0,00" /></div>' +
      '        <div class="receipt-field"><label for="rr-payment">Forma de pagamento</label>' +
      '          <select id="rr-payment" disabled>' +
      '            <option value="">—</option>' +
      '            <option value="pix">Pix</option>' +
      '            <option value="dinheiro">Dinheiro</option>' +
      '            <option value="debito">Débito</option>' +
      '            <option value="credito">Crédito à vista</option>' +
      '            <option value="credito_parcelado">Crédito parcelado</option>' +
      '          </select></div>' +
      '        <div class="receipt-field receipt-installments-row hidden" id="rr-installments-wrap">' +
      '          <label for="rr-installments">Parcelas</label>' +
      '          <input id="rr-installments" type="number" min="2" max="24" disabled value="2" /></div>' +
      '        <div class="receipt-actions">' +
      '          <button type="button" class="receipt-btn-edit" id="rr-btn-edit">Editar</button>' +
      '          <button type="button" class="tx-add-btn hidden" id="rr-btn-save">Salvar</button>' +
      '        </div>' +
      '        <div class="receipt-attachment-section">' +
      '          <span class="receipt-attachment-label">Comprovante</span>' +
      '          <div class="receipt-photo-wrap receipt-photo-wrap--empty" id="receipt-photo-wrap">' +
      '            <span id="receipt-photo-empty">Sem arquivo ou foto</span>' +
      '            <img id="receipt-photo-img" src="" alt="Comprovante do gasto" style="display:none;" />' +
      '            <span class="receipt-photo-zoom-hint hidden" id="receipt-photo-hint">Toque para ampliar</span>' +
      '          </div>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(wrap);

    $('ft-success-overlay')?.addEventListener('click', function () {
      hideSuccess();
    });

    $('receipt-report-bg')?.addEventListener('click', close);
    $('rr-btn-close-x')?.addEventListener('click', close);
    $('rr-btn-edit')?.addEventListener('click', enterEdit);
    $('rr-btn-save')?.addEventListener('click', saveEdit);
    $('receipt-photo-wrap')?.addEventListener('click', openLightbox);
    $('receipt-lightbox')?.addEventListener('click', closeLightbox);

    $('rr-payment')?.addEventListener('change', function () {
      toggleInstallmentsField($('rr-payment').value);
    });

    var fields = ['rr-establishment', 'rr-date', 'rr-time', 'rr-amount', 'rr-payment', 'rr-installments'];
    fields.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', function () { refreshFieldStyles(); });
      el.addEventListener('change', function () { refreshFieldStyles(); });
    });
  }

  function toggleInstallmentsField(pay) {
    var wrap = $('rr-installments-wrap');
    if (!wrap) return;
    wrap.classList.toggle('hidden', pay !== 'credito_parcelado');
  }

  function refreshFieldStyles() {
    var ids = ['rr-establishment', 'rr-date', 'rr-time', 'rr-amount', 'rr-payment', 'rr-installments'];
    ids.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      var val = (el.value || '').trim();
      el.classList.toggle('receipt-input--filled', val !== '');
      el.classList.toggle('receipt-input--empty', val === '');
    });
  }

  function setFieldsLocked(locked) {
    editMode = !locked;
    var ids = ['rr-establishment', 'rr-date', 'rr-time', 'rr-amount', 'rr-payment', 'rr-installments'];
    ids.forEach(function (id) {
      var el = $(id);
      if (el) el.disabled = locked;
    });
    $('rr-btn-edit')?.classList.toggle('hidden', !locked);
    $('rr-btn-save')?.classList.toggle('hidden', locked);
    refreshFieldStyles();
  }

  function centsToDisplay(cents) {
    if (!Number.isFinite(cents) || cents <= 0) return '';
    return (cents / 100).toFixed(2).replace('.', ',');
  }

  function displayToCents(raw) {
    var n = parseFloat(String(raw || '').replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
  }

  function dateFromTx(t) {
    if (t.receiptDate) return t.receiptDate;
    var d = new Date(t.at);
    if (Number.isNaN(d.getTime())) return '';
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function timeFromTx(t) {
    if (t.receiptTime) return t.receiptTime.length === 5 ? t.receiptTime : t.receiptTime.slice(0, 5);
    var d = new Date(t.at);
    if (Number.isNaN(d.getTime())) return '';
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function buildAtFromFields(dateStr, timeStr) {
    if (!dateStr) return new Date().toISOString();
    var time = timeStr || '12:00';
    var p = dateStr.split('-');
    var tp = time.split(':');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), Number(tp[0] || 0), Number(tp[1] || 0));
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  function populateForm(t) {
    var img = $('receipt-photo-img');
    var empty = $('receipt-photo-empty');
    var hint = $('receipt-photo-hint');
    var wrap = $('receipt-photo-wrap');
    var src = t.receiptImageUrl || t.receiptImageData || '';

    if (src && img) {
      img.src = src;
      img.style.display = 'block';
      if (empty) empty.style.display = 'none';
      if (hint) hint.classList.remove('hidden');
      wrap?.classList.remove('receipt-photo-wrap--empty');
    } else {
      if (img) { img.src = ''; img.style.display = 'none'; }
      if (empty) empty.style.display = '';
      if (hint) hint.classList.add('hidden');
      wrap?.classList.add('receipt-photo-wrap--empty');
    }

    if ($('rr-establishment')) $('rr-establishment').value = t.name || t.location || '';
    if ($('rr-date')) $('rr-date').value = dateFromTx(t);
    if ($('rr-time')) $('rr-time').value = timeFromTx(t);
    if ($('rr-amount')) $('rr-amount').value = centsToDisplay(t.amountCents);
    if ($('rr-payment')) $('rr-payment').value = t.paymentMethod || '';
    if ($('rr-installments')) $('rr-installments').value = String(t.installments > 1 ? t.installments : 2);
    toggleInstallmentsField(t.paymentMethod || '');
    refreshFieldStyles();
  }

  function enterEdit() {
    haptic('light');
    setFieldsLocked(false);
  }

  function saveEdit() {
    if (!currentTxId || typeof FTTransactions === 'undefined') return;
    var pay = $('rr-payment')?.value || '';
    var inst = pay === 'credito_parcelado' ? Math.max(2, Number($('rr-installments')?.value || 2)) : 1;
    var name = $('rr-establishment')?.value?.trim() || '';
    var cents = displayToCents($('rr-amount')?.value);
    var dateStr = $('rr-date')?.value || '';
    var timeStr = $('rr-time')?.value || '';

    FTTransactions.update(currentTxId, {
      name: name || 'Gasto registrado',
      location: name,
      amountCents: cents,
      paymentMethod: pay || 'pix',
      installments: inst,
      receiptDate: dateStr,
      receiptTime: timeStr,
      at: buildAtFromFields(dateStr, timeStr),
      hasReceiptReport: true,
    });

    haptic('medium');
    setFieldsLocked(true);
    if (typeof global.__ftSyncHome === 'function') global.__ftSyncHome();
    if (typeof global.__ftSyncHistory === 'function') global.__ftSyncHistory();
  }

  function openLightbox() {
    var t = currentTxId && typeof FTTransactions !== 'undefined' ? FTTransactions.getById(currentTxId) : null;
    if (!t) return;
    var src = t.receiptImageUrl || t.receiptImageData;
    if (!src) return;
    var lb = $('receipt-lightbox');
    var img = $('receipt-lightbox-img');
    if (img) img.src = src;
    lb?.classList.add('receipt-lightbox--open');
    lb?.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    $('receipt-lightbox')?.classList.remove('receipt-lightbox--open');
    $('receipt-lightbox')?.setAttribute('aria-hidden', 'true');
  }

  var successDismissCb = null;

  function showSuccess(title, onDismiss) {
    injectDom();
    successDismissCb = typeof onDismiss === 'function' ? onDismiss : null;
    var el = $('ft-success-overlay');
    var titleEl = $('ft-success-title');
    if (titleEl && title) titleEl.textContent = title;
    el?.classList.add('ft-success-overlay--open');
    el?.setAttribute('aria-hidden', 'false');
    haptic('medium');
  }

  function hideSuccess() {
    var el = $('ft-success-overlay');
    el?.classList.remove('ft-success-overlay--open');
    el?.setAttribute('aria-hidden', 'true');
    if (successDismissCb) {
      var cb = successDismissCb;
      successDismissCb = null;
      cb();
    }
  }

  function open(txId) {
    if (typeof FTTransactions === 'undefined') return;
    var t = FTTransactions.getById(txId);
    if (!t) return;
    injectDom();
    currentTxId = txId;
    populateForm(t);
    setFieldsLocked(true);
    closeLightbox();
    var sh = $('receipt-report-sheet');
    sh?.classList.add('receipt-report-modal--open');
    sh?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('receipt-report-open');
    var scrollEl = sh?.querySelector('.receipt-report-scroll');
    if (scrollEl) scrollEl.scrollTop = 0;
    haptic('medium');
  }

  function close() {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    $('receipt-report-sheet')?.classList.remove('receipt-report-modal--open');
    $('receipt-report-sheet')?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('receipt-report-open');
    currentTxId = null;
    setFieldsLocked(true);
  }

  function init() {
    injectDom();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.FTReceiptReport = {
    showSuccess: showSuccess,
    hideSuccess: hideSuccess,
    open: open,
    close: close,
    init: init,
  };
})(typeof window !== 'undefined' ? window : globalThis);
