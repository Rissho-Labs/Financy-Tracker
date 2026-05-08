/* ──────────────────────────────────────────────────────────────
   Finance Tracker — Home Screen Logic
   Wallet interactions · Card cycling · Clock · Haptics
   ────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  if (typeof FTSession !== 'undefined') {
    if (!FTSession.isLoggedIn()) {
      window.location.replace('../index.html');
      return;
    }
    if (!FTSession.isOnboardingDone()) {
      window.location.replace('onboarding.html');
      return;
    }
    const __u = FTSession.parseUser();
    if (__u && __u.name) {
      const nameEl = document.querySelector('.user-name');
      if (nameEl) nameEl.textContent = __u.name;
      const parts = String(__u.name).trim().split(/\s+/);
      let initials = '?';
      if (parts.length > 1) initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      else if (parts[0]) initials = parts[0][0].toUpperCase();
      const av = document.querySelector('.avatar-initials');
      if (av) av.textContent = initials;
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
  if (h < 12) greetingEl.textContent = 'Bom dia 👋';
  else if (h < 18) greetingEl.textContent = 'Boa tarde 👋';
  else greetingEl.textContent = 'Boa noite 👋';
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
  if (eyeWallet) eyeWallet.innerHTML = balanceVisible ? eyeOpenSVG : eyeClosedSVG;
  haptic('light');
});

// ── Card stack (single render source + swipe) ─
const cards = [
  {
    panelTitle: 'Visão Geral - Todas as Despesas',
    ariaLabel: 'Visão Geral',
    name: 'Visão Geral',
    balance: 'Todas as despesas',
    surface: true,
  },
  {
    panelTitle: 'Negócios',
    ariaLabel: 'Cartão Negócios',
    name: 'Negócios',
    balance: 'R$ 8.580,23',
    colorA: '#059669',
    colorB: '#10B981',
  },
  {
    panelTitle: 'Reserva',
    ariaLabel: 'Cartão Reserva',
    name: 'Reserva',
    balance: 'R$ 9.841,52',
    colorA: '#EA580C',
    colorB: '#F59E0B',
  },
];
let activeCard = 0;

function renderCardStack() {
  const stackEl = $('cards-stack');
  if (!stackEl) return;
  stackEl.innerHTML = cards
    .map((card, i) => {
      const innerClass = card.surface ? 'card-peek-inner card-peek-inner--surface' : 'card-peek-inner';
      const styleAttr = card.surface ? '' : ` style="--card-color-a:${card.colorA};--card-color-b:${card.colorB};"`;
      return (
        `<div class="card-peek" id="peek-${i}" data-index="${i}" role="listitem" tabindex="0" aria-label="${card.ariaLabel}">` +
        `<div class="${innerClass}"${styleAttr}>` +
        '<span class="peek-chip" aria-hidden="true"></span>' +
        `<div class="peek-meta"><span class="peek-name">${card.name}</span><span class="peek-balance">${card.balance}</span></div>` +
        '<div class="peek-brand" aria-hidden="true"><svg width="36" height="24" viewBox="0 0 54 36"><circle cx="21" cy="18" r="15" fill="rgba(255,255,255,0.25)"/><circle cx="33" cy="18" r="15" fill="rgba(255,255,255,0.15)"/></svg></div>' +
        '</div></div>'
      );
    })
    .join('');
}

function setActiveCard(index, silent) {
  activeCard = Math.max(0, Math.min(cards.length - 1, index));
  document.querySelectorAll('.card-peek').forEach((el, i) => {
    el.classList.toggle('active-card', i === activeCard);
  });
  const titleEl = $('wallet-panel-title');
  if (titleEl && cards[activeCard]) titleEl.textContent = cards[activeCard].panelTitle;
  if (!silent) haptic('light');
}

renderCardStack();
const stack = $('cards-stack');
stack?.addEventListener('click', (e) => {
  const peek = e.target.closest('.card-peek');
  if (!peek) return;
  setActiveCard(Number(peek.dataset.index));
});
stack?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const peek = e.target.closest('.card-peek');
  if (!peek || !stack.contains(peek)) return;
  e.preventDefault();
  setActiveCard(Number(peek.dataset.index));
});

setActiveCard(0, true);

(function setupCardSwipe() {
  const wallet = $('wallet-outer');
  if (!wallet) return;
  let sx = 0;
  let sy = 0;
  let tracking = false;

  function onStart(e) {
    const t = e.touches && e.touches[0];
    if (!t) return;
    sx = t.clientX;
    sy = t.clientY;
    tracking = true;
  }
  function onEnd(e) {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    const threshold = 44;
    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 0.85) return;
    if (dx < 0 && activeCard < cards.length - 1) setActiveCard(activeCard + 1);
    else if (dx > 0 && activeCard > 0) setActiveCard(activeCard - 1);
  }
  wallet.addEventListener('touchstart', onStart, { passive: true });
  wallet.addEventListener('touchend', onEnd, { passive: true });
})();

// ── Dynamic Island pulse on card interaction ──────────────────
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

// ── Bottom nav (single delegated listener) ────────────────────
document.querySelector('.bottom-nav')?.addEventListener('click', (e) => {
  const item = e.target.closest('.nav-item');
  if (!item) return;
  document.querySelectorAll('.bottom-nav .nav-item').forEach((b) => {
    b.classList.remove('active');
    b.removeAttribute('aria-current');
  });
  item.classList.add('active');
  item.setAttribute('aria-current', 'page');
  haptic('light');
  pulseDynamicIsland();
});

if (window.FTNotifications) {
  FTNotifications.bind('#notification-btn');
}

// ── Avatar button ─────────────────────────────────────────────
$('avatar-btn')?.addEventListener('click', () => {
  haptic('light');
  window.location.href = 'profile.html';
});

function openExpenseSheet() {
  const sh = $('expense-sheet');
  if (!sh) return;
  haptic('medium');
  sh.classList.add('ft-sheet--open');
  sh.setAttribute('aria-hidden', 'false');
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
}
$('expense-sheet-bg')?.addEventListener('click', closeExpenseSheet);
$('home-exp-cancel')?.addEventListener('click', closeExpenseSheet);
$('home-exp-cancel-qr')?.addEventListener('click', closeExpenseSheet);
$('home-exp-cancel-file')?.addEventListener('click', closeExpenseSheet);
$('add-card-btn')?.addEventListener('click', openExpenseSheet);
$('action-expense')?.addEventListener('click', openExpenseSheet);

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
  });
});

function fillExpenseFromSource(name, valueDisplay) {
  document.querySelector('.entry-method-btn[data-method="manual"]')?.click();
  const nameEl = $('home-exp-name');
  const amtEl = $('home-exp-amt');
  if (nameEl) nameEl.value = name;
  if (amtEl) amtEl.value = valueDisplay;
}

$('home-simulate-qr-btn')?.addEventListener('click', (e) => {
  e.preventDefault();
  const btn = e.currentTarget;
  const oldText = btn.textContent;
  btn.textContent = 'Lendo...';
  btn.style.opacity = '0.7';
  haptic('medium');
  setTimeout(() => {
    btn.textContent = oldText;
    btn.style.opacity = '1';
    fillExpenseFromSource('Nota Fiscal (Supermercado)', '254,90');
  }, 1200);
});

$('home-file-picker-btn')?.addEventListener('click', () => {
  $('home-file-input')?.click();
});

$('home-file-input')?.addEventListener('change', (e) => {
  const input = e.target;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  const help = $('home-file-help');
  const prev = help?.textContent || '';
  if (help) help.textContent = `Processando arquivo: ${file.name}`;
  haptic('light');
  setTimeout(() => {
    if (help) help.textContent = prev;
    input.value = '';
    fillExpenseFromSource('Importado do Arquivo', '109,50');
  }, 1200);
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
    if (selectedPayment === 'credito' || selectedPayment === 'credito_parcelado') {
      homeCardWrap?.classList.remove('hidden');
    } else {
      homeCardWrap?.classList.add('hidden');
    }
    if (selectedPayment === 'credito_parcelado') {
      homeInstallmentsWrap?.classList.remove('hidden');
    } else {
      homeInstallmentsWrap?.classList.add('hidden');
    }
  });
});

$('home-expense-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('home-exp-name')?.value?.trim();
  const raw = $('home-exp-amt')?.value;
  const cardId = homeCardSelect?.value || '';
  const installments = Number($('home-exp-installments')?.value || 1);
  const n = parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
  const cents = Number.isFinite(n) && n > 0 ? Math.round(n * 100) : NaN;
  if (!name || !Number.isFinite(cents)) {
    haptic('strong');
    return;
  }
  if ((selectedPayment === 'credito' || selectedPayment === 'credito_parcelado') && !cardId) {
    alert('Selecione um cartão para lançamentos no crédito.');
    haptic('strong');
    return;
  }
  if (typeof FTTransactions !== 'undefined') {
    FTTransactions.add({
      name,
      amountCents: cents,
      paymentMethod: selectedPayment,
      cardId,
      installments: selectedPayment === 'credito_parcelado' ? installments : 1,
    });
  }
  $('home-exp-name').value = '';
  $('home-exp-amt').value = '';
  if ($('home-exp-installments')) $('home-exp-installments').value = 2;
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
  window.location.href = 'history.html';
});

// ── Transaction rows & stat card (delegated; list innerHTML refreshes) ─
document.querySelector('.transactions-section')?.addEventListener('click', (e) => {
  if (e.target.closest('.tx-item')) haptic('light');
});
document.querySelector('.stats-section')?.addEventListener('click', (e) => {
  if (e.target.closest('.stat-card')) haptic('light');
});

const svgGasto = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tx-stroke)" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M19 9H5a2 2 0 0 0 0 4h14a2 2 0 0 1 0 4H6"/></svg>`;

window.__ftSyncHome = function syncHomeData() {
  if (typeof FTTransactions === 'undefined') return;
  const fmtBRL = (cents) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  const fmtWhen = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  FTTransactions.seedIfEmpty();
  const monthSpend = FTTransactions.monthExpenseTotalCents();
  const wb = $('wallet-balance');
  if (wb) wb.textContent = fmtBRL(monthSpend);
  const st = $('stat-month-spend');
  if (st) st.textContent = fmtBRL(monthSpend);

  let budgetReais = 3000;
  try {
    const u = typeof FTSession !== 'undefined' ? FTSession.parseUser() : null;
    if (u && typeof u.budget === 'number') budgetReais = u.budget;
  } catch (e) {}
  const budgetCents = Math.round(budgetReais * 100);
  const pct = budgetCents > 0 ? Math.min(999, Math.round((monthSpend / budgetCents) * 100)) : 0;
  const pctEl = $('wallet-pct-val');
  if (pctEl) pctEl.textContent = pct + '%';
  const sb = $('stats-budget-hint');
  if (sb) sb.textContent = 'Orçamento mensal: ' + fmtBRL(budgetCents);

  const pctStat = $('stat-budget-pct');
  if (pctStat) pctStat.textContent = pct + '%';

  const ul = document.querySelector('.transactions-section ul.tx-list');
  if (ul) {
    const rows = FTTransactions.getAll()
      .slice(0, 4)
      .map((t) => {
        const wrap = '--tx-color:#6366f124;--tx-stroke:#818cf8;';
        const nameEsc = String(t.name).replace(/&/g, '&amp;').replace(/</g, '&lt;');
        return `<li class="tx-item" role="listitem"><div class="tx-icon-wrap" style="${wrap}">${svgGasto}</div><div class="tx-info"><span class="tx-name">${nameEsc}</span><span class="tx-date">${fmtWhen(t.at)}</span></div><span class="tx-amount negative">- ${fmtBRL(t.amountCents)}</span></li>`;
      })
      .join('');
    ul.innerHTML = rows;
  }
};
window.__ftSyncHome();

// ── Entrance stagger animation ────────────────────────────────
// Adds a subtle scale-in on cards after load
window.addEventListener('load', () => {
  document.querySelectorAll('.card-peek').forEach((el, i) => {
    el.style.transitionDelay = `${0.15 + i * 0.07}s`;
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
        el.style.opacity = '1';
        el.style.transform = '';
        setTimeout(() => {
          el.style.transition = '';
          el.style.transitionDelay = '';
        }, 800);
      });
    });
  });
});

})();
