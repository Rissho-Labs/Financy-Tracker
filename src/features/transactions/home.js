/* ──────────────────────────────────────────────────────────────
   Finance Tracker — Home Screen Logic
   Wallet interactions · Card cycling · Clock · Haptics
   ────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  if (typeof FTSession !== 'undefined') {
    if (!FTSession.isLoggedIn()) {
      window.location.replace(FTRoutes.login);
      return;
    }
    if (!FTSession.isOnboardingDone()) {
      window.location.replace(FTRoutes.onboarding);
      return;
    }
    const __u = FTSession.parseUser();
    if (__u && __u.name) {
      const nameEl = document.getElementById('home-user-name') || document.querySelector('.user-name');
      if (nameEl && nameEl.textContent !== __u.name) nameEl.textContent = __u.name;
      const parts = String(__u.name).trim().split(/\s+/);
      let initials = '?';
      if (parts.length > 1) initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      else if (parts[0]) initials = parts[0][0].toUpperCase();
      const av = document.getElementById('header-avatar-initials');
      if (av && av.textContent !== initials) av.textContent = initials;
      const photoUrl = __u.photoURL || __u.photoUrl || '';
      const imgEl = document.getElementById('header-avatar-img');
      if (imgEl && photoUrl) {
        if (imgEl.src !== photoUrl) imgEl.src = photoUrl;
        imgEl.alt = __u.name;
        imgEl.classList.remove('hidden');
        if (av) av.style.display = 'none';
      }
    }
  }

// ── Helpers ──────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
function haptic(type = 'light') {
  if (navigator.vibrate) {
    const p = { light: [8], medium: [18], strong: [30] };
    navigator.vibrate(p[type] || [8]);
  }
}

// ── Live clock ────────────────────────────────────────────────
function updateClock() {
  const el = $('status-clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
updateClock();
setInterval(updateClock, 10_000);

// ── Dynamic greeting ──────────────────────────────────────────
(function setGreeting() {
  const h = new Date().getHours();
  const greetingEl = $('greeting-label');
  if (!greetingEl) return;
  if (h < 12) greetingEl.textContent = 'Bom dia';
  else if (h < 18) greetingEl.textContent = 'Boa tarde';
  else greetingEl.textContent = 'Boa noite';
})();

// ── Balance hide/show toggle (persiste entre tabs) ────────────
const BALANCE_VISIBLE_KEY = 'ft_balance_visible';
const eyeWallet = $('eye-wallet');
const eyeOpenSVG = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
const eyeClosedSVG = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;

function readBalanceVisible() {
  try {
    return localStorage.getItem(BALANCE_VISIBLE_KEY) !== '0';
  } catch (e) {
    return true;
  }
}

function writeBalanceVisible(visible) {
  try {
    localStorage.setItem(BALANCE_VISIBLE_KEY, visible ? '1' : '0');
  } catch (e) { /* noop */ }
}

function applyBalanceVisibility(visible) {
  const balEl = $('wallet-balance');
  balEl?.classList.toggle('hidden', !visible);
  ['wallet-expense-val', 'wallet-budget-val'].forEach(function (id) {
    $(id)?.classList.toggle('hidden', !visible);
  });
  if (eyeWallet) eyeWallet.innerHTML = visible ? eyeOpenSVG : eyeClosedSVG;
  const btn = $('wallet-hide-btn');
  if (btn) btn.setAttribute('aria-label', visible ? 'Ocultar valor' : 'Mostrar valor');
  if (btn) btn.setAttribute('aria-pressed', visible ? 'false' : 'true');
}

let balanceVisible = readBalanceVisible();
applyBalanceVisibility(balanceVisible);

$('wallet-hide-btn')?.addEventListener('click', () => {
  balanceVisible = !balanceVisible;
  writeBalanceVisible(balanceVisible);
  applyBalanceVisibility(balanceVisible);
  haptic('light');
});

// ── Dynamic Island pulse on nav interaction ───────────────────
const di = $('dynamic-island');
function pulseDynamicIsland() {
  if (!di) return;
  di.style.width = '180px';
  di.style.borderRadius = '24px';
  setTimeout(() => {
    di.style.width = '';
    di.style.borderRadius = '';
  }, 600);
}

if (window.FTNotifications) {
  FTNotifications.bind('#notification-btn');
}

function openExpenseSheet(method) {
  const sh = $('expense-sheet');
  if (!sh) return;
  haptic('medium');
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }
  if (window.FTSheet) {
    FTSheet.open(sh);
  } else {
    sh.classList.add('ft-sheet--open');
    sh.setAttribute('aria-hidden', 'false');
    $('nav-fab')?.classList.add('is-hidden');
  }
  switchEntryMethod(method || 'manual');
}
function closeExpenseSheet() {
  const sh = $('expense-sheet');
  if (!sh) return;
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }
  if (window.FTSheet) {
    FTSheet.close(sh);
    return;
  }
  sh.classList.remove('ft-sheet--open');
  sh.setAttribute('aria-hidden', 'true');
  $('nav-fab')?.classList.remove('is-hidden');
  const filePreview = $('home-file-preview');
  const fileHelp = $('home-file-help');
  if (filePreview) { filePreview.src = ''; filePreview.classList.add('hidden'); }
  if (fileHelp) fileHelp.textContent = 'JPG, PNG, WEBP, GIF, BMP, TIFF, HEIC ou PDF — leitura automática pela IA.';
  resetFilePickerBtn();
}
if (window.FTSheet && $('expense-sheet')) {
  FTSheet.register($('expense-sheet'), {
    onOpen: function () {
      $('nav-fab')?.classList.add('is-hidden');
    },
    onClose: function () {
      $('nav-fab')?.classList.remove('is-hidden');
      const filePreview = $('home-file-preview');
      const fileHelp = $('home-file-help');
      if (filePreview) { filePreview.src = ''; filePreview.classList.add('hidden'); }
      if (fileHelp) fileHelp.textContent = 'JPG, PNG, WEBP, GIF, BMP, TIFF, HEIC ou PDF — leitura automática pela IA.';
      resetFilePickerBtn();
    },
  });
}

// ── FAB: menu rápido (Manual / Escanear / Arquivo) ──────────────
const fabBtn = $('nav-fab');
const fabMenu = $('fab-menu');
const fabBackdrop = $('fab-backdrop');

function openFabMenu() {
  fabMenu?.classList.add('is-open');
  fabMenu?.setAttribute('aria-hidden', 'false');
  fabBackdrop?.classList.add('is-open');
  fabBtn?.classList.add('is-open');
  fabBtn?.setAttribute('aria-expanded', 'true');
  haptic('light');
}
function closeFabMenu() {
  fabMenu?.classList.remove('is-open');
  fabMenu?.setAttribute('aria-hidden', 'true');
  fabBackdrop?.classList.remove('is-open');
  fabBtn?.classList.remove('is-open');
  fabBtn?.setAttribute('aria-expanded', 'false');
}
function toggleFabMenu() {
  if (fabMenu?.classList.contains('is-open')) closeFabMenu();
  else openFabMenu();
}

fabBtn?.addEventListener('click', toggleFabMenu);
fabBackdrop?.addEventListener('click', closeFabMenu);
$('fab-btn-manual')?.addEventListener('click', () => {
  closeFabMenu();
  resetExpenseFormFields();
  openExpenseSheet('manual');
});
$('fab-btn-qr')?.addEventListener('click', () => {
  closeFabMenu();
  resetExpenseFormFields();
  openExpenseSheet('qr');
});
$('fab-btn-file')?.addEventListener('click', () => {
  closeFabMenu();
  resetExpenseFormFields();
  openExpenseSheet('file');
});

function openExpenseScan() {
  if (typeof FTExpenseScan === 'undefined') {
    alert('Leitor de câmera indisponível.');
    return;
  }
  FTExpenseScan.open({
    onClose: function (result) {
      if (result && result.success) {
        /* sheet fechado pelo FTReceiptFlow.onClosePanels */
      }
    },
  });
}

function switchEntryMethod(method) {
  haptic('light');
  ['manual', 'qr', 'file'].forEach((m) => {
    $(`home-${m}-wrap`)?.classList.toggle('active', m === method);
  });
  if (method === 'qr') {
    openExpenseScan();
  }
}

$('home-open-scan-btn')?.addEventListener('click', () => {
  haptic('medium');
  openExpenseScan();
});

function resetFilePickerBtn() {
  const btn = $('home-file-picker-btn');
  if (!btn) return;
  btn.textContent = 'Escolher Arquivo';
  btn.disabled = false;
  btn.style.opacity = '1';
}

function setFilePickerBusy(busy, label) {
  const btn = $('home-file-picker-btn');
  if (!btn) return;
  btn.disabled = !!busy;
  btn.style.opacity = busy ? '0.75' : '1';
  if (label) btn.textContent = label;
}

function showFilePreview(dataUrl, isImage) {
  const img = $('home-file-preview');
  const help = $('home-file-help');
  if (isImage && img) {
    img.src = dataUrl;
    img.classList.remove('hidden');
  } else if (img) {
    img.src = '';
    img.classList.add('hidden');
  }
  if (help) help.textContent = 'Analisando nota com IA…';
}

$('home-file-picker-btn')?.addEventListener('click', () => {
  $('home-file-input')?.click();
});

$('home-file-input')?.addEventListener('change', async (e) => {
  const input = e.target;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  input.value = '';

  if (typeof FTReceiptFlow === 'undefined') {
    alert('Módulo de leitura indisponível.');
    return;
  }

  if (typeof FTReceiptFlow !== 'undefined' && !FTReceiptFlow.isAllowedReceiptFile(file)) {
    alert(FTReceiptFlow.invalidReceiptTypeMessage());
    haptic('strong');
    return;
  }

  setFilePickerBusy(true, 'Analisando nota…');
  haptic('medium');

  if (
    typeof FTReceiptFlow !== 'undefined' &&
    FTReceiptFlow.isReceiptImageFile(file) &&
    typeof FTReceiptFlow.readFileAsDataUrl === 'function'
  ) {
    try {
      const dataUrl = await FTReceiptFlow.readFileAsDataUrl(file);
      showFilePreview(dataUrl, true);
    } catch (_) { /* ignore */ }
  }

  const result = await FTReceiptFlow.processFile(file, {
    source: 'arquivo',
    onClosePanels: closeExpenseSheet,
    onSynced: () => { if (typeof window.__ftSyncHome === 'function') window.__ftSyncHome(); },
    onHaptic: haptic,
  });

  resetFilePickerBtn();
  if (result && result.ok && !result.redirected) {
    /* modal de sucesso exibido pelo FTReceiptFlow */
  }
});

let selectedPayment = 'pix';
const homePayBtns = document.querySelectorAll('#home-payment-methods-grid .pay-btn');
const homeCardWrap = $('home-card-select-wrap');
const homeInstallmentsWrap = $('home-installments-wrap');
const homeCardSelect = $('home-exp-card');

if (homeCardSelect && typeof FTCards !== 'undefined') {
  const cardsDb = FTCards.getAll();
  homeCardSelect.innerHTML = '';
  if (!cardsDb.length) {
    homeCardSelect.innerHTML = '<option value="">Sem cartões cadastrados</option>';
  } else {
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = 'Selecione um cartão...';
    homeCardSelect.appendChild(ph);
    cardsDb.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (final ${c.last4})`;
      homeCardSelect.appendChild(opt);
    });
  }
}

homePayBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    haptic('light');
    homePayBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedPayment = btn.getAttribute('data-pay') || 'pix';
    var isCredit = selectedPayment === 'credito';
    homeCardWrap?.classList.toggle('hidden', !isCredit);
    homeInstallmentsWrap?.classList.toggle('hidden', !isCredit);
    if (isCredit && $('home-exp-installments') && !$('home-exp-installments').value) {
      $('home-exp-installments').value = '1';
    }
  });
});

let editingTxId = null;

function resetExpenseFormFields() {
  editingTxId = null;
  if ($('home-exp-name')) $('home-exp-name').value = '';
  if ($('home-exp-amt')) $('home-exp-amt').value = '';
  if ($('home-exp-installments')) $('home-exp-installments').value = '1';
  if (homeCardSelect) homeCardSelect.value = '';
  selectedPayment = 'pix';
  homePayBtns.forEach((b) => b.classList.remove('active'));
  document.querySelector('#home-payment-methods-grid .pay-btn[data-pay="pix"]')?.classList.add('active');
  homeCardWrap?.classList.add('hidden');
  homeInstallmentsWrap?.classList.add('hidden');
  const titleEl = $('exp-sheet-title');
  if (titleEl) titleEl.textContent = 'Novo gasto';
}

function openEditSheet(tx) {
  if (!tx) return;
  editingTxId = tx.id;
  if ($('home-exp-name')) $('home-exp-name').value = tx.name || '';
  if ($('home-exp-amt')) $('home-exp-amt').value = (tx.amountCents / 100).toFixed(2).replace('.', ',');
  const isCredit = tx.paymentMethod === 'credito' || tx.paymentMethod === 'credito_parcelado';
  selectedPayment = isCredit ? 'credito' : (tx.paymentMethod || 'pix');
  homePayBtns.forEach((b) => b.classList.toggle('active', b.getAttribute('data-pay') === selectedPayment));
  homeCardWrap?.classList.toggle('hidden', !isCredit);
  homeInstallmentsWrap?.classList.toggle('hidden', !isCredit);
  if (isCredit) {
    if (homeCardSelect) homeCardSelect.value = tx.cardId || '';
    if ($('home-exp-installments')) $('home-exp-installments').value = String(tx.installments > 1 ? tx.installments : 1);
  }
  const titleEl = $('exp-sheet-title');
  if (titleEl) titleEl.textContent = 'Editar gasto';
  openExpenseSheet('manual');
}

$('home-expense-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('home-exp-name')?.value?.trim();
  const raw = $('home-exp-amt')?.value;
  const cardId = homeCardSelect?.value || '';
  const installments = Math.max(1, Number($('home-exp-installments')?.value || 1));
  const n = parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
  const cents = Number.isFinite(n) && n > 0 ? Math.round(n * 100) : NaN;
  if (!name || !Number.isFinite(cents)) {
    haptic('strong');
    return;
  }
  if (selectedPayment === 'credito' && !cardId) {
    alert('Selecione um cartão para lançamentos no crédito.');
    haptic('strong');
    return;
  }
  var payMethod = selectedPayment;
  var payInstallments = 1;
  if (selectedPayment === 'credito') {
    payMethod = installments > 1 ? 'credito_parcelado' : 'credito';
    payInstallments = installments > 1 ? installments : 1;
  }
  if (typeof FTTransactions !== 'undefined') {
    const patch = {
      name,
      amountCents: cents,
      paymentMethod: payMethod,
      cardId: cardId || null,
      installments: payInstallments,
    };
    if (editingTxId) {
      FTTransactions.update(editingTxId, patch);
    } else {
      FTTransactions.add(patch);
    }
  }
  resetExpenseFormFields();
  closeExpenseSheet();
  haptic('medium');
  if (typeof window.__ftSyncHome === 'function') window.__ftSyncHome();
});

// ── Ver todos os gastos ───────────────────────────────────────
$('see-all-btn')?.addEventListener('click', () => {
  haptic('light');
  window.location.href = FTRoutes.history;
});

// ── Transaction rows & stat card ──────────────────────────────
const SWIPE_REVEAL = 46; // px — posição de repouso "aberta" (a pílula fica fora do cartão, só espiando por baixo)
const SWIPE_OPEN_THRESHOLD = 24; // px — arraste mínimo para decidir abrir/fechar ao soltar
const SWIPE_MAX_DRAG = 60; // px — limite de arraste ao vivo

function txItemState(item) {
  if (item.classList.contains('tx-item--open-delete')) return 'delete';
  if (item.classList.contains('tx-item--open-edit')) return 'edit';
  return 'closed';
}

function txItemOffset(item) {
  const s = txItemState(item);
  return s === 'delete' ? -SWIPE_REVEAL : s === 'edit' ? SWIPE_REVEAL : 0;
}

function setRowX(item, x, live) {
  const row = item.querySelector('.tx-row');
  if (!row) return;
  item.classList.toggle('tx-item--dragging', !!live);
  row.style.transform = `translateX(${x}px)`;
  const deleteAction = item.querySelector('.tx-swipe-action--delete');
  const editAction = item.querySelector('.tx-swipe-action--edit');
  const p = Math.min(1, Math.abs(x) / 24);
  if (deleteAction) {
    deleteAction.style.opacity = x < 0 ? String(p) : '0';
    deleteAction.classList.toggle('is-active', x <= -SWIPE_OPEN_THRESHOLD);
  }
  if (editAction) {
    editAction.style.opacity = x > 0 ? String(p) : '0';
    editAction.classList.toggle('is-active', x >= SWIPE_OPEN_THRESHOLD);
  }
}

function closeTxItem(item) {
  if (!item) return;
  item.classList.remove('tx-item--open-delete', 'tx-item--open-edit', 'tx-item--dragging');
  setRowX(item, 0, false);
}

function openTxItem(item, direction) {
  item.classList.toggle('tx-item--open-delete', direction === 'delete');
  item.classList.toggle('tx-item--open-edit', direction === 'edit');
  item.classList.remove('tx-item--dragging');
  setRowX(item, direction === 'delete' ? -SWIPE_REVEAL : SWIPE_REVEAL, false);
}

function closeOtherTxItems(except) {
  document.querySelectorAll('.tx-item--open-delete, .tx-item--open-edit').forEach((el) => {
    if (el !== except) closeTxItem(el);
  });
}

function deleteTxItem(item) {
  const id = item.dataset.id;
  if (!id || typeof FTTransactions === 'undefined') return;
  haptic('strong');
  item.classList.add('tx-item--removing');
  setTimeout(function () {
    FTTransactions.remove(id);
    if (typeof window.__ftSyncHome === 'function') window.__ftSyncHome();
  }, 220);
}

(function setupTxInteractions() {
  const section = document.querySelector('.transactions-section');
  if (!section) return;

  let activeItem = null;
  let baseOffset = 0;
  let startX = 0;
  let startY = 0;
  let swiping = false;
  let lastWasSwipe = false;

  function isActionLayer(target) {
    return !!target.closest('.tx-swipe-action');
  }

  function beginTrack(item, x, y) {
    closeOtherTxItems(item);
    activeItem = item;
    baseOffset = txItemOffset(item);
    startX = x;
    startY = y;
    swiping = false;
  }

  function onMove(x, y) {
    if (!activeItem) return;
    const dx = x - startX;
    const dy = y - startY;
    if (!swiping && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) swiping = true;
    if (!swiping) return;
    let next = baseOffset + dx;
    if (next > SWIPE_MAX_DRAG) next = SWIPE_MAX_DRAG;
    if (next < -SWIPE_MAX_DRAG) next = -SWIPE_MAX_DRAG;
    setRowX(activeItem, next, true);
  }

  function endTrack(x, y) {
    const item = activeItem;
    activeItem = null;
    if (!item) return;
    if (!swiping) return;
    swiping = false;
    lastWasSwipe = true;
    item.classList.remove('tx-item--dragging');
    const dx = x - startX;
    let finalX = baseOffset + dx;
    if (finalX > SWIPE_MAX_DRAG) finalX = SWIPE_MAX_DRAG;
    if (finalX < -SWIPE_MAX_DRAG) finalX = -SWIPE_MAX_DRAG;
    if (finalX <= -SWIPE_OPEN_THRESHOLD) {
      openTxItem(item, 'delete');
      haptic('medium');
    } else if (finalX >= SWIPE_OPEN_THRESHOLD) {
      openTxItem(item, 'edit');
      haptic('medium');
    } else {
      closeTxItem(item);
    }
  }

  section.addEventListener('touchstart', function (e) {
    if (isActionLayer(e.target)) return;
    const item = e.target.closest('.tx-item');
    if (!item) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    beginTrack(item, t.clientX, t.clientY);
  }, { passive: true });

  section.addEventListener('touchmove', function (e) {
    const t = e.touches && e.touches[0];
    if (t) onMove(t.clientX, t.clientY);
  }, { passive: true });

  section.addEventListener('touchend', function (e) {
    const t = e.changedTouches && e.changedTouches[0];
    endTrack(t ? t.clientX : startX, t ? t.clientY : startY);
  }, { passive: true });
  section.addEventListener('touchcancel', function () {
    if (activeItem) closeTxItem(activeItem);
    activeItem = null;
    swiping = false;
  }, { passive: true });

  section.addEventListener('mousedown', function (e) {
    if (e.button !== 0 || isActionLayer(e.target)) return;
    const item = e.target.closest('.tx-item');
    if (!item) return;
    beginTrack(item, e.clientX, e.clientY);
  });

  section.addEventListener('mousemove', function (e) {
    onMove(e.clientX, e.clientY);
  });

  section.addEventListener('mouseup', function (e) {
    endTrack(e.clientX, e.clientY);
  });
  section.addEventListener('mouseleave', function () {
    if (activeItem) closeTxItem(activeItem);
    activeItem = null;
    swiping = false;
  });

  section.addEventListener('click', function (e) {
    if (lastWasSwipe) { lastWasSwipe = false; return; }

    const deleteAction = e.target.closest('.tx-swipe-action--delete');
    if (deleteAction) {
      const item = deleteAction.closest('.tx-item');
      if (item) deleteTxItem(item);
      return;
    }

    const editAction = e.target.closest('.tx-swipe-action--edit');
    if (editAction) {
      const item = editAction.closest('.tx-item');
      const id = item && item.dataset.id;
      const tx = id && typeof FTTransactions !== 'undefined' ? FTTransactions.getById(id) : null;
      if (tx) {
        closeTxItem(item);
        haptic('light');
        openEditSheet(tx);
      }
      return;
    }

    const item = e.target.closest('.tx-item');
    if (!item) return;
    if (txItemState(item) !== 'closed') {
      closeTxItem(item);
      return;
    }
    const id = item.dataset.id;
    const tx = id && typeof FTTransactions !== 'undefined' ? FTTransactions.getById(id) : null;
    if (tx && tx.hasReceiptReport && typeof FTReceiptReport !== 'undefined') {
      haptic('medium');
      FTReceiptReport.open(id);
      return;
    }
    haptic('light');
  });
})();

const svgGasto = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tx-stroke)" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M19 9H5a2 2 0 0 0 0 4h14a2 2 0 0 1 0 4H6"/></svg>`;
const svgTrash = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const svgEdit = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;

window.__ftSyncHome = function syncHomeData() {
  if (typeof FTTransactions === 'undefined') return;
  const fmtBRL = (cents) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  const fmtWhen = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const monthSpend = FTTransactions.monthExpenseTotalCents();
  const wb = $('wallet-balance');
  if (wb) wb.textContent = fmtBRL(monthSpend);

  const expenseVal = $('wallet-expense-val');
  if (expenseVal) expenseVal.textContent = fmtBRL(monthSpend);

  let budgetReais = 3000;
  try {
    const u = typeof FTSession !== 'undefined' ? FTSession.parseUser() : null;
    if (u && typeof u.budget === 'number') budgetReais = u.budget;
  } catch (e) {}
  const budgetCents = Math.round(budgetReais * 100);
  const budgetEl = $('wallet-budget-val');
  if (budgetEl) budgetEl.textContent = fmtBRL(budgetCents);

  const pct = budgetCents > 0 ? Math.min(999, Math.round((monthSpend / budgetCents) * 100)) : 0;
  const pctEl = $('wallet-pct-val');
  if (pctEl) pctEl.textContent = pct + '%';
  const pctBadge = $('wallet-pct-badge');
  if (pctBadge) {
    pctBadge.classList.toggle('wallet-pct-pill--over', pct > 100);
  }

  const updatedEl = $('wallet-updated');
  if (updatedEl) {
    updatedEl.textContent = 'Atualizado em ' + new Date().toLocaleDateString('pt-BR');
  }

  const ul = document.querySelector('.transactions-section ul.tx-list');
  const emptyEl = $('home-tx-empty');
  if (ul) {
    const items = FTTransactions.getAll().slice(0, 4);
    const sig = items
      .map(function (t) {
        return String(t.id) + ':' + String(t.amountCents) + ':' + String(t.name || '') + ':' + (t.hasReceiptReport ? '1' : '0');
      })
      .join('|');
    const rows = items
      .map((t) => {
        const wrap = '--tx-color:#6366f124;--tx-stroke:#818cf8;';
        const nameEsc = String(t.name).replace(/&/g, '&amp;').replace(/</g, '&lt;');
        const receiptCls = t.hasReceiptReport ? ' tx-item--has-receipt' : '';
        const badge = t.hasReceiptReport ? '<span class="tx-receipt-badge" aria-hidden="true">· nota</span>' : '';
        return `<li class="tx-item${receiptCls}" data-id="${t.id}" role="listitem"><div class="tx-swipe-action tx-swipe-action--edit" aria-label="Editar gasto" role="button">${svgEdit}</div><div class="tx-swipe-action tx-swipe-action--delete" aria-label="Excluir gasto" role="button">${svgTrash}</div><div class="tx-row"><div class="tx-icon-wrap" style="${wrap}">${svgGasto}</div><div class="tx-info"><span class="tx-name">${nameEsc}${badge}</span><span class="tx-date">${fmtWhen(t.at)}</span></div><span class="tx-amount negative">- ${fmtBRL(t.amountCents)}</span></div></li>`;
      })
      .join('');
    /* Evita reflow se o hydrate inline já pintou o mesmo snapshot */
    if (ul.getAttribute('data-tx-sig') !== sig) {
      ul.innerHTML = rows;
      ul.setAttribute('data-tx-sig', sig);
    }
    if (emptyEl) emptyEl.classList.toggle('hidden', items.length > 0);
    ul.classList.toggle('hidden', items.length === 0);
    const hintEl = $('home-tx-hint');
    if (hintEl) {
      const hasReceipt = items.some(function (t) { return t.hasReceiptReport; });
      hintEl.classList.toggle('hidden', !hasReceipt);
    }
  }
};
window.__ftSyncHome();

// Sincroniza do Firestore e atualiza o total se houver dados novos
(function () {
  var u = typeof FTSession !== 'undefined' ? FTSession.parseUser() : null;
  if (!u || !u.uid) return;
  if (typeof FTTransactions === 'undefined' || typeof FTTransactions.syncFromFirestore !== 'function') return;
  FTTransactions.clearDemoSeeds();
  FTTransactions.syncFromFirestore(u.uid).then(function () {
    if (typeof window.__ftSyncHome === 'function') window.__ftSyncHome();
  });
})();

window.__ftOpenExpenseSheet = openExpenseSheet;
window.__ftCloseExpenseSheet = closeExpenseSheet;
window.__ftReturnToHomeView = function () {
  return false;
};

(function bootHomeReceiptUi() {
  try {
    if (sessionStorage.getItem('ft_show_receipt_success') === '1') {
      sessionStorage.removeItem('ft_show_receipt_success');
      setTimeout(function () {
        if (typeof FTReceiptReport !== 'undefined') {
          FTReceiptReport.showSuccess('Registo feito');
        }
      }, 350);
    }
    var sp = new URLSearchParams(window.location.search);
    if (sp.get('expense') === '1') {
      history.replaceState({}, '', window.location.pathname + window.location.hash);
      requestAnimationFrame(openExpenseSheet);
    }
  } catch (_) {}
})();

})();
