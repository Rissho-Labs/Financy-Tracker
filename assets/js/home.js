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

// ── Fan/stack toggle ──────────────────────────────────────────
let fanned = false;
$('wallet-fan-btn')?.addEventListener('click', () => {
  fanned = !fanned;
  $('cards-stack')?.classList.toggle('fanned', fanned);
  haptic('light');
});

// ── Card cycling & dot indicators ────────────────────────────
const cards = [
  { name: 'Conta Principal', balance: 'R$ 4.820,00' },
  { name: 'Negócios',        balance: 'R$ 8.580,23' },
  { name: 'Reserva',         balance: 'R$ 9.841,52' },
];
let activeCard = 0;

function setActiveCard(index, animate = true) {
  activeCard = index;

  // Update peek classes
  document.querySelectorAll('.card-peek').forEach((el, i) => {
    el.classList.toggle('active-card', i === index);
  });

  // Update dots
  document.querySelectorAll('.card-dot').forEach((dot, i) => {
    const isActive = i === index;
    dot.classList.toggle('active', isActive);
    dot.setAttribute('aria-selected', String(isActive));
  });

  haptic('light');
}

// Dot clicks
document.querySelectorAll('.card-dot').forEach((dot) => {
  dot.addEventListener('click', () => {
    setActiveCard(Number(dot.dataset.dot));
  });
});

// Card peek clicks
document.querySelectorAll('.card-peek').forEach((card) => {
  card.addEventListener('click', () => {
    const idx = Number(card.dataset.index);
    setActiveCard(idx);
    // Bring tapped card to focus via CSS reordering via z-index bump
    card.style.transform = 'translateY(-6px)';
    setTimeout(() => { card.style.transform = ''; }, 400);
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      card.click();
    }
  });
});

// Set initial active
setActiveCard(0, false);

// ── Swipe gesture on wallet ────────────────────────────────────
(function setupSwipe() {
  const wallet = $('wallet-outer');
  if (!wallet) return;
  let startX = 0, isDragging = false;

  wallet.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  wallet.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && activeCard < cards.length - 1) setActiveCard(activeCard + 1);
    else if (dx > 0 && activeCard > 0) setActiveCard(activeCard - 1);
  }, { passive: true });
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

// ── Nav bar switching ─────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((b) => {
      b.classList.remove('active');
      b.removeAttribute('aria-current');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-current', 'page');
    haptic('light');
    pulseDynamicIsland();
  });
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
  document.body.style.overflow = 'hidden';
  $('home-exp-name')?.focus();
}
function closeExpenseSheet() {
  const sh = $('expense-sheet');
  if (!sh) return;
  sh.classList.remove('ft-sheet--open');
  sh.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
$('expense-sheet-bg')?.addEventListener('click', closeExpenseSheet);
$('home-exp-cancel')?.addEventListener('click', closeExpenseSheet);
$('add-card-btn')?.addEventListener('click', openExpenseSheet);
$('action-expense')?.addEventListener('click', openExpenseSheet);
$('home-expense-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('home-exp-name')?.value?.trim();
  const raw = $('home-exp-amt')?.value;
  const n = parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
  const cents = Number.isFinite(n) && n > 0 ? Math.round(n * 100) : NaN;
  if (!name || !Number.isFinite(cents)) {
    haptic('strong');
    return;
  }
  if (typeof FTTransactions !== 'undefined') FTTransactions.add({ name, amountCents: cents });
  $('home-exp-name').value = '';
  $('home-exp-amt').value = '';
  closeExpenseSheet();
  haptic('medium');
  if (typeof window.__ftSyncHome === 'function') window.__ftSyncHome();
});

// ── Ver todos os gastos ───────────────────────────────────────
$('see-all-btn')?.addEventListener('click', () => {
  haptic('light');
  window.location.href = 'gastos.html';
});

// ── Transaction items ─────────────────────────────────────────
document.querySelectorAll('.tx-item').forEach((item) => {
  item.addEventListener('click', () => haptic('light'));
});

// ── Stat cards ────────────────────────────────────────────────
document.querySelectorAll('.stat-card').forEach((card) => {
  card.addEventListener('click', () => haptic('light'));
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
