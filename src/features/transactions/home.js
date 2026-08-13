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

// ── Balance hide/show toggle ──────────────────────────────────
let balanceVisible = true;
const eyeWallet = $('eye-wallet');
const eyeOpenSVG = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
const eyeClosedSVG = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;

$('wallet-hide-btn')?.addEventListener('click', () => {
  balanceVisible = !balanceVisible;
  const balEl = $('wallet-balance');
  balEl?.classList.toggle('hidden', !balanceVisible);
  ['wallet-expense-val', 'wallet-budget-val'].forEach(function (id) {
    $(id)?.classList.toggle('hidden', !balanceVisible);
  });
  if (eyeWallet) eyeWallet.innerHTML = balanceVisible ? eyeOpenSVG : eyeClosedSVG;
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

function openExpenseSheet() {
  const sh = $('expense-sheet');
  if (!sh) return;
  haptic('medium');
  sh.classList.add('ft-sheet--open');
  sh.setAttribute('aria-hidden', 'false');
  $('nav-fab')?.classList.add('is-hidden');
  document.querySelector('.entry-method-btn[data-method="manual"]')?.click();
}
function closeExpenseSheet() {
  const sh = $('expense-sheet');
  if (!sh) return;
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
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
$('expense-sheet-bg')?.addEventListener('click', closeExpenseSheet);
$('home-exp-cancel')?.addEventListener('click', closeExpenseSheet);
$('home-exp-cancel-qr')?.addEventListener('click', closeExpenseSheet);
$('home-exp-cancel-file')?.addEventListener('click', closeExpenseSheet);
$('nav-fab')?.addEventListener('click', openExpenseSheet);

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

const entryMethodBtns = document.querySelectorAll('#home-entry-methods-grid .entry-method-btn');
entryMethodBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    haptic('light');
    entryMethodBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const method = btn.getAttribute('data-method');
    ['manual', 'qr', 'file'].forEach((m) => {
      const wrap = $(`home-${m}-wrap`);
      if (!wrap) return;
      if (m === method) {
        wrap.classList.add('active');
      } else {
        wrap.classList.remove('active');
      }
    });
    if (method === 'qr') {
      openExpenseScan();
    }
  });
});

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
    FTTransactions.add({
      name,
      amountCents: cents,
      paymentMethod: payMethod,
      cardId,
      installments: payInstallments,
    });
  }
  $('home-exp-name').value = '';
  $('home-exp-amt').value = '';
  if ($('home-exp-installments')) $('home-exp-installments').value = '1';
  if (homeCardSelect) homeCardSelect.value = '';
  selectedPayment = 'pix';
  homePayBtns.forEach((b) => b.classList.remove('active'));
  document.querySelector('#home-payment-methods-grid .pay-btn[data-pay="pix"]')?.classList.add('active');
  homeCardWrap?.classList.add('hidden');
  homeInstallmentsWrap?.classList.add('hidden');
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
function clearDeleteMode() {
  document.querySelectorAll('.tx-item--delete-mode').forEach((el) => el.classList.remove('tx-item--delete-mode'));
}

(function setupTxInteractions() {
  const section = document.querySelector('.transactions-section');
  if (!section) return;

  let pressTimer = null;
  let pressTarget = null;
  let pressStartX = 0;
  let pressStartY = 0;

  function cancelPress() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (pressTarget) {
      pressTarget.classList.remove('tx-item--pressing');
      pressTarget = null;
    }
  }

  function startPress(item, x, y) {
    cancelPress();
    pressTarget = item;
    pressStartX = x;
    pressStartY = y;
    item.classList.add('tx-item--pressing');
    pressTimer = setTimeout(function () {
      pressTimer = null;
      if (!pressTarget) return;
      const el = pressTarget;
      const id = el.dataset.id;
      el.classList.remove('tx-item--pressing');
      pressTarget = null;
      if (!id || typeof FTTransactions === 'undefined') return;
      const tx = FTTransactions.getById(id);
      if (tx && tx.hasReceiptReport && typeof FTReceiptReport !== 'undefined') {
        clearDeleteMode();
        haptic('medium');
        FTReceiptReport.open(id);
        return;
      }
      clearDeleteMode();
      if (!el.classList.contains('tx-item--delete-mode')) {
        el.classList.add('tx-item--delete-mode');
        haptic('medium');
      }
    }, 500);
  }

  function onMove(x, y) {
    if (!pressTimer || !pressTarget) return;
    if (Math.abs(x - pressStartX) > 12 || Math.abs(y - pressStartY) > 12) cancelPress();
  }

  section.addEventListener('touchstart', function (e) {
    if (e.target.closest('.tx-delete-btn')) return;
    const item = e.target.closest('.tx-item');
    if (!item) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    startPress(item, t.clientX, t.clientY);
  }, { passive: true });

  section.addEventListener('touchmove', function (e) {
    const t = e.touches && e.touches[0];
    if (t) onMove(t.clientX, t.clientY);
  }, { passive: true });

  section.addEventListener('touchend', cancelPress, { passive: true });
  section.addEventListener('touchcancel', cancelPress, { passive: true });

  section.addEventListener('mousedown', function (e) {
    if (e.button !== 0 || e.target.closest('.tx-delete-btn')) return;
    const item = e.target.closest('.tx-item');
    if (!item) return;
    startPress(item, e.clientX, e.clientY);
  });

  section.addEventListener('mousemove', function (e) {
    onMove(e.clientX, e.clientY);
  });

  section.addEventListener('mouseup', cancelPress);
  section.addEventListener('mouseleave', cancelPress);

  section.addEventListener('click', function (e) {
    const delBtn = e.target.closest('.tx-delete-btn');
    if (delBtn) {
      const item = delBtn.closest('.tx-item');
      const id = item && item.dataset.id;
      if (id && typeof FTTransactions !== 'undefined') {
        haptic('strong');
        item.classList.add('tx-item--removing');
        setTimeout(function () {
          FTTransactions.remove(id);
          clearDeleteMode();
          if (typeof window.__ftSyncHome === 'function') window.__ftSyncHome();
        }, 220);
      }
      return;
    }
    if (!e.target.closest('.tx-item--delete-mode')) clearDeleteMode();
  });
})();

document.querySelector('.transactions-section')?.addEventListener('click', (e) => {
  if (e.target.closest('.tx-item')) haptic('light');
});

const svgGasto = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tx-stroke)" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M19 9H5a2 2 0 0 0 0 4h14a2 2 0 0 1 0 4H6"/></svg>`;
const svgTrash = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

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
        return `<li class="tx-item${receiptCls}" data-id="${t.id}" role="listitem"><div class="tx-icon-wrap" style="${wrap}">${svgGasto}</div><div class="tx-info"><span class="tx-name">${nameEsc}${badge}</span><span class="tx-date">${fmtWhen(t.at)}</span></div><span class="tx-amount negative">- ${fmtBRL(t.amountCents)}</span><button class="tx-delete-btn" aria-label="Excluir gasto" type="button">${svgTrash}</button></li>`;
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
