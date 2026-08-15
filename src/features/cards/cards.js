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
  function haptic(t = 'light') {
    if (navigator.vibrate) {
      const p = { light: [8], medium: [18], error: [20, 50, 20] };
      navigator.vibrate(p[t] || [8]);
    }
  }

  (function clock() {
    const el = $('status-clock');
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  })();

  function fmtBRL(cents) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);
  }

  function fmtWhen(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function cardIdAtIndex(index) {
    var card = cardAtIndex(index);
    return card ? card.id : null;
  }

  function cardAtIndex(index) {
    if (typeof FTCards === 'undefined') return null;
    var list = FTCards.getAll();
    return list[index] || null;
  }

  function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  /** Próxima ocorrência do dia no ciclo (ex: 15 → "15 jun."). */
  function fmtNextCycleDate(dayOfMonth) {
    var day = typeof FTCards !== 'undefined' && FTCards.normalizeDay
      ? FTCards.normalizeDay(dayOfMonth)
      : parseInt(dayOfMonth, 10);
    if (!day || day < 1 || day > 31) return '—';
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    if (now.getDate() > day) {
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
    var safeDay = Math.min(day, daysInMonth(y, m));
    var date = new Date(y, m, safeDay);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  function setInvoiceDates(card) {
    var closeEl = $('cc-close-date-val');
    var dueEl = $('cc-due-date-val');
    if (closeEl) closeEl.textContent = card ? fmtNextCycleDate(card.closingDay) : '—';
    if (dueEl) dueEl.textContent = card ? fmtNextCycleDate(card.dueDay) : '—';
  }

  function creditTxForCard(cardId) {
    if (!cardId || typeof FTTransactions === 'undefined') return [];
    return FTTransactions.getAll().filter(function (t) {
      const pay = t.paymentMethod || '';
      return t.cardId === cardId && (pay === 'credito' || pay === 'credito_parcelado');
    });
  }

  function renderCardInvoiceList(cardId) {
    const ul = $('cc-tx-list');
    const emptyEl = $('cc-tx-empty');
    if (!ul) return;
    const rows = creditTxForCard(cardId);
    if (!rows.length) {
      ul.innerHTML = '';
      ul.classList.add('hidden');
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    ul.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    ul.innerHTML = rows.map(function (t) {
      const nameEsc = String(t.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const inst = t.installments > 1
        ? '<span class="tx-installments">' + t.installmentIndex + '/' + t.installments + '</span>'
        : '<span class="tx-installments">1/1</span>';
      return (
        '<li class="tx-item" role="listitem">' +
        '<div class="tx-icon-wrap tx-icon--warn">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tx-stroke)" stroke-width="2" stroke-linecap="round"><path d="M3 2h13l4 4v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/></svg>' +
        '</div>' +
        '<div class="tx-info"><span class="tx-name">' + nameEsc + '</span><span class="tx-date">' + fmtWhen(t.at) + '</span></div>' +
        '<div class="tx-amount-wrap"><span class="tx-amount negative">' + fmtBRL(t.amountCents) + '</span>' + inst + '</div>' +
        '</li>'
      );
    }).join('');
  }

  function updateCCDetails(index) {
    const card = cardAtIndex(index);
    const cardId = card ? card.id : null;
    const rows = creditTxForCard(cardId);
    const totalCents = rows.reduce(function (acc, t) { return acc + (t.amountCents || 0); }, 0);

    if ($('cc-invoice-amount')) $('cc-invoice-amount').textContent = fmtBRL(totalCents);
    if ($('cc-limit-available')) $('cc-limit-available').textContent = '—';
    if ($('cc-limit-fill')) $('cc-limit-fill').style.width = totalCents > 0 ? '12%' : '0%';

    setInvoiceDates(card);

    renderCardInvoiceList(cardId);
  }

  const CARD_ICONS =
    '<div class="cc-card-top">' +
    '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>' +
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2" stroke-linecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>' +
    '</div>';

  function brandMarkup(brand, brandLabel) {
    if (typeof FTCardBrands !== 'undefined' && FTCardBrands.brandMarkup) {
      return FTCardBrands.brandMarkup(brand, undefined, brandLabel);
    }
    return (
      '<div class="cc-card-brand" aria-hidden="true">' +
      '<svg width="36" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5">' +
      '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div>'
    );
  }

  function brandCssClass(brand) {
    if (brand === 'visa') return 'cc-card--visa';
    if (brand === 'master') return 'cc-card--master';
    if (brand === 'elo') return 'cc-card--elo';
    if (brand === 'amex') return 'cc-card--amex';
    return 'cc-card--other';
  }

  function buildPlaceholderCardHtml() {
    var holder = 'Seu nome';
    try {
      var userStr = localStorage.getItem('ft_user');
      if (userStr) {
        var user = JSON.parse(userStr);
        if (user && user.name) holder = user.name;
      }
    } catch (e) { /* ignore */ }
    var holderEsc = holder.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return (
      '<div class="cc-card cc-card--placeholder cc-card--other active" id="cc-placeholder" data-index="0" role="listitem">' +
      '<div class="cc-card-inner">' +
      CARD_ICONS +
      '<div class="cc-card-middle"><span class="cc-card-name cc-card-name--muted">' + holderEsc + '</span></div>' +
      '<div class="cc-card-bottom"><span class="cc-card-number cc-card-number--muted">**** **** **** ----</span>' + brandMarkup('other') + '</div>' +
      '</div></div>'
    );
  }

  function buildCardHtml(card, index, isActive) {
    const holder = card.holderName || 'Titular';
    const last4 = card.last4 || '0000';
    const holderEsc = holder.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return (
      '<div class="cc-card ' + brandCssClass(card.brand) + (isActive ? ' active' : '') + '" id="cc-' + index + '" data-index="' + index + '" role="listitem">' +
      '<div class="cc-card-inner">' +
      CARD_ICONS +
      '<div class="cc-card-middle"><span class="cc-card-name">' + holderEsc + '</span></div>' +
      '<div class="cc-card-bottom"><span class="cc-card-number">**** **** **** ' + last4 + '</span>' + brandMarkup(card.brand, card.brandLabel) + '</div>' +
      '</div></div>'
    );
  }

  let cards = [];
  let dots = [];
  let currentIndex = 0;
  let startX = 0;
  let isDragging = false;
  let carouselBound = false;

  function cardTransform(offsetPx, scale) {
    return 'translateX(calc(-50% + ' + offsetPx + 'px)) scale(' + scale + ')';
  }

  function setActiveCard(index) {
    if (!cards.length) return;
    if (index < 0 || index >= cards.length) return;

    cards.forEach(function (c, i) {
      c.classList.remove('active');
      c.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease';
      if (dots[i]) {
        dots[i].classList.remove('active');
        dots[i].setAttribute('aria-selected', 'false');
      }
    });

    cards[index].classList.add('active');
    if (dots[index]) {
      dots[index].classList.add('active');
      dots[index].setAttribute('aria-selected', 'true');
    }

    cards.forEach(function (c, i) {
      if (i < index) {
        const dist = index - i;
        const offset = -dist * 35;
        const scale = 1 - (dist * 0.08);
        c.style.transform = cardTransform(offset, scale);
        c.style.zIndex = String(i);
        c.style.opacity = String(1 - (dist * 0.2));
        c.style.pointerEvents = 'none';
      } else if (i > index) {
        const offset = (i - index) * 35;
        const scale = 1 - ((i - index) * 0.08);
        c.style.transform = cardTransform(offset, scale);
        c.style.zIndex = String(cards.length - i);
        c.style.opacity = String(1 - ((i - index) * 0.2));
        c.style.pointerEvents = 'none';
      } else {
        c.style.transform = cardTransform(0, 1);
        c.style.zIndex = '10';
        c.style.opacity = '1';
        c.style.pointerEvents = 'auto';
      }
    });

    currentIndex = index;
    updateCCDetails(index);
    haptic('light');
  }

  function bindCarouselEvents() {
    const track = $('cc-track');
    if (!track || carouselBound) return;
    carouselBound = true;

    track.addEventListener('touchstart', function (e) {
      if (!cards.length) return;
      startX = e.touches[0].clientX;
      isDragging = true;
      cards.forEach(function (c) { c.style.transition = 'none'; });
    }, { passive: true });

    track.addEventListener('touchmove', function (e) {
      if (!isDragging || !cards.length) return;
      const deltaX = e.touches[0].clientX - startX;
      const activeCard = cards[currentIndex];
      if (deltaX < 0 && currentIndex < cards.length - 1) {
        activeCard.style.transform = cardTransform(deltaX, 1);
        const nextCard = cards[currentIndex + 1];
        const progress = Math.min(Math.abs(deltaX) / window.innerWidth, 1);
        const offset = 35 - (35 * progress);
        const scale = 0.92 + (0.08 * progress);
        nextCard.style.transform = cardTransform(offset, scale);
        nextCard.style.opacity = String(0.8 + (0.2 * progress));
      } else if (deltaX > 0 && currentIndex > 0) {
        activeCard.style.transform = cardTransform(deltaX, 1);
        const prevCard = cards[currentIndex - 1];
        const progress = Math.min(Math.abs(deltaX) / window.innerWidth, 1);
        const offset = -(35 - (35 * progress));
        const scale = 0.92 + (0.08 * progress);
        prevCard.style.transform = cardTransform(offset, scale);
        prevCard.style.opacity = String(0.8 + (0.2 * progress));
      }
    }, { passive: true });

    track.addEventListener('touchend', function (e) {
      if (!isDragging) return;
      isDragging = false;
      const deltaX = e.changedTouches[0].clientX - startX;
      cards.forEach(function (c) {
        c.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease';
      });
      if (deltaX < -50 && currentIndex < cards.length - 1) setActiveCard(currentIndex + 1);
      else if (deltaX > 50 && currentIndex > 0) setActiveCard(currentIndex - 1);
      else setActiveCard(currentIndex);
    }, { passive: true });
  }

  function renderCardsCarousel(activeIndex) {
    const track = $('cc-track');
    const dotHost = $('cc-dots');
    const emptyState = $('cc-empty-state');
    const detailsWrap = $('cc-details-wrap');
    const carousel = $('cc-carousel');
    if (!track || typeof FTCards === 'undefined') return;

    const list = FTCards.getAll();
    carouselBound = false;

    if (!list.length) {
      track.innerHTML = buildPlaceholderCardHtml();
      if (dotHost) {
        dotHost.innerHTML = '';
        dotHost.classList.add('hidden');
        dotHost.setAttribute('aria-hidden', 'true');
      }
      emptyState?.classList.remove('hidden');
      detailsWrap?.classList.remove('hidden');
      cards = Array.from(track.querySelectorAll('.cc-card'));
      dots = [];
      currentIndex = 0;
      if (cards[0]) {
        cards[0].style.transform = cardTransform(0, 1);
        cards[0].style.opacity = '1';
        cards[0].style.zIndex = '10';
      }
      renderCardInvoiceList(null);
      if ($('cc-invoice-amount')) $('cc-invoice-amount').textContent = fmtBRL(0);
      if ($('cc-limit-available')) $('cc-limit-available').textContent = '—';
      if ($('cc-limit-fill')) $('cc-limit-fill').style.width = '0%';
      setInvoiceDates(null);
      return;
    }

    emptyState?.classList.add('hidden');
    detailsWrap?.classList.remove('hidden');
    if (dotHost) {
      dotHost.classList.remove('hidden');
      dotHost.setAttribute('aria-hidden', 'false');
    }

    const idx = typeof activeIndex === 'number'
      ? Math.max(0, Math.min(list.length - 1, activeIndex))
      : 0;

    track.innerHTML = list.map(function (c, i) { return buildCardHtml(c, i, i === idx); }).join('');
    if (dotHost) {
      dotHost.innerHTML = list.map(function (_, i) {
        return '<button type="button" class="card-dot' + (i === idx ? ' active' : '') + '" data-dot="' + i + '" aria-label="Cartão ' + (i + 1) + '"></button>';
      }).join('');
    }

    cards = Array.from(track.querySelectorAll('.cc-card'));
    dots = dotHost ? Array.from(dotHost.querySelectorAll('.card-dot')) : [];

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        const i = parseInt(dot.dataset.dot, 10);
        if (i !== currentIndex) setActiveCard(i);
      });
    });

    bindCarouselEvents();
    setActiveCard(idx);
  }

  function clearAddCardForm() {
    ['cc-add-name', 'cc-add-last4', 'cc-add-close-day', 'cc-add-due-day', 'cc-add-brand-other'].forEach(function (id) {
      var el = $(id);
      if (el) el.value = '';
    });
    var brandEl = $('cc-add-brand');
    if (brandEl) brandEl.value = 'visa';
    updateBrandOtherField();
  }

  function updateBrandOtherField() {
    var brandEl = $('cc-add-brand');
    var otherWrap = $('cc-add-brand-other-wrap');
    var isOther = brandEl && brandEl.value === 'other';
    if (otherWrap) otherWrap.classList.toggle('hidden', !isOther);
    if (!isOther) {
      var otherInput = $('cc-add-brand-other');
      if (otherInput) otherInput.value = '';
    }
  }

  $('cc-add-brand')?.addEventListener('change', updateBrandOtherField);

  function parseFormDay(inputId, label) {
    var raw = ($(inputId)?.value || '').trim();
    var day = typeof FTCards !== 'undefined' && FTCards.normalizeDay
      ? FTCards.normalizeDay(raw)
      : parseInt(raw, 10);
    if (!day) {
      alert('Informe o dia de ' + label + ' (1 a 31).');
      return null;
    }
    return day;
  }

  function openAddCardModal() {
    const modal = $('add-card-modal');
    if (!modal) return;
    clearAddCardForm();
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  document.querySelector('.add-card-btn-top')?.addEventListener('click', openAddCardModal);
  $('cc-add-first-btn')?.addEventListener('click', openAddCardModal);

  const modal = $('add-card-modal');
  $('cc-add-cancel')?.addEventListener('click', function () {
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
  });
  modal?.addEventListener('click', function (e) {
    if (e.target === modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  });
  $('cc-add-save')?.addEventListener('click', function () {
    const name = ($('cc-add-name')?.value || '').trim() || 'Titular';
    const last4 = ($('cc-add-last4')?.value || '').replace(/\D/g, '').slice(-4);
    if (last4.length !== 4) {
      alert('Informe os 4 últimos dígitos.');
      return;
    }
    const closingDay = parseFormDay('cc-add-close-day', 'fechamento');
    if (closingDay == null) return;
    const dueDay = parseFormDay('cc-add-due-day', 'vencimento');
    if (dueDay == null) return;
    const brand = $('cc-add-brand')?.value || 'other';
    let brandLabel = '';
    if (brand === 'other') {
      brandLabel = ($('cc-add-brand-other')?.value || '').trim();
      if (!brandLabel) {
        alert('Informe o nome da bandeira.');
        return;
      }
    }
    const prevCount = FTCards.getAll().length;
    FTCards.add({
      holderName: name,
      name: name,
      last4: last4,
      brand: brand,
      brandLabel: brandLabel,
      closingDay: closingDay,
      dueDay: dueDay
    });
    clearAddCardForm();
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    renderCardsCarousel(prevCount);
    haptic('medium');
  });

  if (window.FTNotifications) FTNotifications.bind('#notification-btn');

  renderCardsCarousel(0);
})();
