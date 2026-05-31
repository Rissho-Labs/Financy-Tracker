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
  }

  const $ = (id) => document.getElementById(id);
  function haptic(type = 'light') {
    if (navigator.vibrate) {
      const p = { light: [8], medium: [18], strong: [30] };
      navigator.vibrate(p[type] || [8]);
    }
  }

  (function clock() {
    const el = $('status-clock');
    if (!el) return;
    const t = () => (el.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    t();
    setInterval(t, 10000);
  })();

  /** Post-DB: replace implementations to call APIs / OCR pipeline. */
  window.FTGastoHooks = {
    beforeOpenScan: async () => {},
    afterScanParsed: async (_payload) => {},
    beforeFilePick: async () => {},
    afterFileParsed: async (_payload) => {},
  };

  const sidebarRoot = $('gasto-sidebar-root');
  const sidebarFab = $('gasto-fab');
  const sidebarPanel = $('gasto-sidebar-panel');
  const scrollEl = $('gasto-scroll');
  let scrollLockTop = 0;

  function openSidebar() {
    if (!sidebarRoot || sidebarRoot.classList.contains('is-open')) return;
    sidebarRoot.classList.add('is-open');
    sidebarRoot.setAttribute('aria-hidden', 'false');
    sidebarFab?.setAttribute('aria-expanded', 'true');
    sidebarFab?.classList.add('is-hidden');
    if (scrollEl) {
      scrollLockTop = scrollEl.scrollTop;
      scrollEl.style.overflow = 'hidden';
      scrollEl.style.touchAction = 'none';
    }
    if (window.matchMedia('(pointer: fine)').matches) {
      requestAnimationFrame(() => {
        $('gasto-name')?.focus({ preventScroll: true });
      });
    }
    haptic('light');
  }

  function closeSidebar() {
    if (!sidebarRoot || !sidebarRoot.classList.contains('is-open')) return;
    sidebarRoot.classList.remove('is-open');
    sidebarRoot.setAttribute('aria-hidden', 'true');
    sidebarFab?.setAttribute('aria-expanded', 'false');
    sidebarFab?.classList.remove('is-hidden');
    if (scrollEl) {
      scrollEl.style.overflow = '';
      scrollEl.style.touchAction = '';
      scrollEl.scrollTop = scrollLockTop;
    }
  }

  sidebarFab?.addEventListener('click', (e) => {
    e.preventDefault();
    openSidebar();
  });
  $('gasto-sidebar-backdrop')?.addEventListener('click', closeSidebar);
  $('gasto-sidebar-close')?.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebarRoot?.classList.contains('is-open')) {
      e.preventDefault();
      closeSidebar();
    }
  });

  try {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('sheet') === '1') {
      requestAnimationFrame(() => openSidebar());
    }
  } catch (_) {}

  const fmtBRL = (cents) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  const fmtWhen = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  function parseCents(str) {
    const n = parseFloat(String(str).trim().replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : NaN;
  }

  const svgOut = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tx-stroke)" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M19 9H5a2 2 0 0 0 0 4h14a2 2 0 0 1 0 4H6"/></svg>`;

  function renderList() {
    const ul = $('gasto-list');
    const empty = $('gasto-empty');
    if (!ul) return;
    const list = typeof FTTransactions !== 'undefined' ? FTTransactions.getAll() : [];
    ul.innerHTML = '';
    if (!list.length) {
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    list.forEach((t) => {
      const li = document.createElement('li');
      li.className = 'tx-item tx-item-row';

      let extraInfo = '';
      if (t.paymentMethod === 'credito_parcelado') extraInfo = ` • ${t.installments}x no Crédito`;
      else if (t.paymentMethod === 'credito') extraInfo = ' • Crédito';
      else if (t.paymentMethod === 'pix') extraInfo = ' • Pix';

      li.innerHTML =
        '<div class="tx-icon-wrap" style="--tx-color:#6C63FF20;--tx-stroke:#6C63FF;">' +
        svgOut +
        '</div><div class="tx-info"><span class="tx-name"></span><span class="tx-date" style="font-size:11px; opacity:0.7"></span></div>' +
        '<span class="tx-amount negative">- ' +
        fmtBRL(t.amountCents) +
        '</span>' +
        '<button type="button" class="tx-item-remove" data-rm="' +
        t.id +
        '" aria-label="Remover"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';

      li.querySelector('.tx-name').textContent = t.name;
      li.querySelector('.tx-date').textContent = fmtWhen(t.at) + extraInfo;
      ul.appendChild(li);
    });
    ul.querySelectorAll('[data-rm]').forEach((b) => {
      b.addEventListener('click', () => {
        haptic();
        FTTransactions.remove(b.getAttribute('data-rm'));
        renderList();
      });
    });
  }

  // ── Entry Methods Tabs ──
  const methodBtns = document.querySelectorAll('.entry-method-btn');
  methodBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      haptic();
      methodBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const method = btn.getAttribute('data-method');
      document.querySelectorAll('.entry-wrap').forEach((w) => w.classList.remove('active'));
      $(`gasto-${method}-wrap`)?.classList.add('active');
    });
  });

  // ── Payment Methods ──
  let selectedPayment = 'pix';
  const payBtns = document.querySelectorAll('.pay-btn');
  const cardWrap = $('card-select-wrap');
  const instWrap = $('installments-wrap');

  payBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      haptic();
      payBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPayment = btn.getAttribute('data-pay');

      if (selectedPayment === 'credito' || selectedPayment === 'credito_parcelado') {
        cardWrap.classList.remove('hidden');
      } else {
        cardWrap.classList.add('hidden');
      }

      if (selectedPayment === 'credito_parcelado') {
        instWrap.classList.remove('hidden');
        sidebarRoot?.classList.add('is-parcelado');
      } else {
        instWrap.classList.add('hidden');
        sidebarRoot?.classList.remove('is-parcelado');
      }
    });
  });

  // ── Populate Cards ──
  const cardSelect = $('gasto-card');
  if (cardSelect && typeof FTCards !== 'undefined') {
    const cards = FTCards.getAll();
    cardSelect.innerHTML = '';
    if (cards.length === 0) {
      cardSelect.innerHTML = '<option value="">Sem cartões cadastrados</option>';
    } else {
      cards.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (final ${c.last4})`;
        cardSelect.appendChild(opt);
      });
    }
  }

  // ── Manual Form Submit ──
  $('gasto-add-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('gasto-name').value.trim();
    const cents = parseCents($('gasto-amount').value);
    const cardId = cardSelect?.value || '';
    const installments = $('gasto-installments')?.value || 1;

    if (!name || !Number.isFinite(cents)) {
      haptic('strong');
      return;
    }
    if ((selectedPayment === 'credito' || selectedPayment === 'credito_parcelado') && !cardId) {
      alert('Por favor, selecione ou cadastre um cartão de crédito.');
      return;
    }

    haptic('medium');
    FTTransactions.add({
      name,
      amountCents: cents,
      paymentMethod: selectedPayment,
      cardId: cardId,
      installments: installments,
    });

    $('gasto-name').value = '';
    $('gasto-amount').value = '';
    if ($('gasto-installments')) $('gasto-installments').value = 2;
    renderList();
    closeSidebar();
  });

  // ── Mock Scanners / file (hooks fire for future DB pipeline) ──
  async function simulateScanFill(name, val) {
    openSidebar();
    setTimeout(async () => {
      document.querySelector('.entry-method-btn[data-method="manual"]')?.click();
      $('gasto-name').value = name;
      $('gasto-amount').value = val;
      $('gasto-amount').focus({ preventScroll: true });
      haptic('medium');
      try {
        await window.FTGastoHooks.afterScanParsed({ name, amountDisplay: val });
      } catch (_) {}
    }, 0);
  }

  $('simulate-qr-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    haptic();
    try {
      await window.FTGastoHooks.beforeOpenScan();
    } catch (_) {}
    const btn = e.currentTarget;
    const oldText = btn.textContent;
    btn.textContent = 'Lendo...';
    btn.style.opacity = 0.7;
    setTimeout(() => {
      btn.textContent = oldText;
      btn.style.opacity = 1;
      simulateScanFill('Nota Fiscal (Supermercado)', '254,90');
    }, 1200);
  });

  $('gasto-file-picker-btn')?.addEventListener('click', async () => {
    try {
      await window.FTGastoHooks.beforeFilePick();
    } catch (_) {}
    $('gasto-file-input')?.click();
  });

  $('gasto-file-input')?.addEventListener('change', async (e) => {
    const input = e.target;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const fileWrap = $('gasto-file-wrap');
    const p = fileWrap?.querySelector('p');
    const oldText = p?.textContent;
    if (p) p.textContent = 'Processando arquivo: ' + file.name;
    haptic();
    try {
      await window.FTGastoHooks.afterFileParsed({ fileName: file.name, file });
    } catch (_) {}
    setTimeout(() => {
      if (p && oldText !== undefined) p.textContent = oldText;
      input.value = '';
      simulateScanFill('Importado do Arquivo', '109,50');
    }, 1500);
  });

  renderList();
})();
