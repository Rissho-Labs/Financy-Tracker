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
  }

  var $ = function (id) {
    return document.getElementById(id);
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  var fmtBRL = function (cents) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  var fmtDate = function (iso) {
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  var fmtTime = function (iso) {
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  var state = {
    periodMode: 'month',
    payment: 'all'
  };

  function setMonthDefault() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var el = $('hist-month-input');
    if (el && !el.value) el.value = y + '-' + m;
    var from = $('hist-date-from');
    var to = $('hist-date-to');
    if (from && !from.value) from.value = y + '-' + m + '-01';
    if (to && !to.value) {
      var last = new Date(y, d.getMonth() + 1, 0).getDate();
      to.value = y + '-' + m + '-' + String(last).padStart(2, '0');
    }
  }

  function filterOptsFromUi() {
    var pay = state.payment;
    if (state.periodMode === 'month') {
      var mv = $('hist-month-input') && $('hist-month-input').value;
      if (!mv || mv.length < 7) return { paymentMethod: pay };
      var parts = mv.split('-');
      var yr = Number(parts[0]);
      var mo = Number(parts[1]) - 1;
      var r = FTTransactions.monthRangeMs(yr, mo);
      return { fromMs: r.fromMs, toMs: r.toMs, paymentMethod: pay };
    }
    var df = $('hist-date-from') && $('hist-date-from').value;
    var dt = $('hist-date-to') && $('hist-date-to').value;
    if (!df || !dt) {
      var now = new Date();
      var fb = FTTransactions.monthRangeMs(now.getFullYear(), now.getMonth());
      return { fromMs: fb.fromMs, toMs: fb.toMs, paymentMethod: pay };
    }
    var r2 = FTTransactions.customRangeMs(df, dt);
    return { fromMs: r2.fromMs, toMs: r2.toMs, paymentMethod: pay };
  }

  function buildListHtml(rows) {
    if (!rows.length) return '';
    var parts = new Array(rows.length);
    var i;
    for (i = 0; i < rows.length; i++) {
      var t = rows[i];
      var meta = FTTransactions.categoryMeta(t.category);
      var payLab = FTTransactions.paymentLabel(t.paymentMethod);
      var inst = t.installments > 1 ? esc(String(t.installmentIndex) + '/' + String(t.installments)) : '';
      var instHtml = inst
        ? '<span class="hist-install">' + inst + '</span>'
        : '<span class="hist-install hist-install--muted">À vista</span>';
      parts[i] =
        '<li class="hist-row" role="listitem" data-id="' +
        esc(t.id) +
        '" aria-label="' +
        esc(t.location) +
        ' — segure para ver relatório">' +
        '<div class="hist-row-icon" style="--hist-stroke:' +
        esc(meta.stroke) +
        '" aria-hidden="true">' +
        esc(meta.icon) +
        '</div>' +
        '<div class="hist-row-body">' +
        '<span class="hist-loc">' +
        esc(t.location) +
        '</span>' +
        '<span class="hist-cat">' +
        esc(meta.label) +
        '</span>' +
        '<span class="hist-meta-line">' +
        esc(fmtDate(t.at)) +
        ' · ' +
        esc(fmtTime(t.at)) +
        ' · ' +
        esc(payLab) +
        '</span>' +
        '</div>' +
        '<div class="hist-row-right">' +
        '<span class="hist-amt">' +
        esc(fmtBRL(t.amountCents)) +
        '</span>' +
        (t.hasReceiptReport ? '<span class="hist-install" style="color:#818cf8">Nota</span>' : '') +
        instHtml +
        '</div>' +
        '</li>';
    }
    return parts.join('');
  }

  function render() {
    if (typeof FTTransactions === 'undefined') return;
    FTTransactions.clearDemoSeeds();
    var all = FTTransactions.getAll();
    var opts = filterOptsFromUi();
    var filtered = FTTransactions.filterTransactions(all, opts);
    var sorted = FTTransactions.sortByAtDesc(filtered);

    var listEl = $('hist-list');
    var emptyEl = $('hist-empty');
    var sumEl = $('hist-summary');

    listEl.innerHTML = buildListHtml(sorted);

    var totalCents = 0;
    var j;
    for (j = 0; j < sorted.length; j++) totalCents += sorted[j].amountCents || 0;

    if (sumEl) {
      sumEl.textContent =
        sorted.length +
        (sorted.length === 1 ? ' transação' : ' transações') +
        ' · Total ' +
        fmtBRL(totalCents);
    }
    emptyEl.classList.toggle('hidden', sorted.length > 0);
    listEl.classList.toggle('hidden', sorted.length === 0);
  }

  (function clock() {
    var el = $('status-clock');
    if (!el) return;
    var tick = function () {
      el.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };
    tick();
    setInterval(tick, 10000);
  })();

  setMonthDefault();

  $('hist-period-month')?.addEventListener('click', function () {
    state.periodMode = 'month';
    $('hist-period-month').classList.add('active');
    $('hist-period-custom').classList.remove('active');
    $('hist-period-month').setAttribute('aria-selected', 'true');
    $('hist-period-custom').setAttribute('aria-selected', 'false');
    $('hist-panel-month').classList.remove('hidden');
    $('hist-panel-custom').classList.add('hidden');
    render();
  });

  $('hist-period-custom')?.addEventListener('click', function () {
    state.periodMode = 'custom';
    $('hist-period-custom').classList.add('active');
    $('hist-period-month').classList.remove('active');
    $('hist-period-custom').setAttribute('aria-selected', 'true');
    $('hist-period-month').setAttribute('aria-selected', 'false');
    $('hist-panel-month').classList.add('hidden');
    $('hist-panel-custom').classList.remove('hidden');
    render();
  });

  $('hist-pay-chips')?.addEventListener('click', function (e) {
    var btn = e.target.closest('.hist-chip');
    if (!btn) return;
    var pay = btn.getAttribute('data-pay');
    if (!pay) return;
    state.payment = pay;
    document.querySelectorAll('#hist-pay-chips .hist-chip').forEach(function (b) {
      b.classList.toggle('active', b === btn);
    });
    render();
  });

  $('hist-month-input')?.addEventListener('change', render);
  $('hist-date-from')?.addEventListener('change', render);
  $('hist-date-to')?.addEventListener('change', render);

  (function setupHistLongPress() {
    var listEl = $('hist-list');
    if (!listEl) return;

    var pressTimer = null;
    var pressTarget = null;
    var pressStartX = 0;
    var pressStartY = 0;

    function haptic(type) {
      if (navigator.vibrate) {
        var p = { light: [8], medium: [18], strong: [30] };
        navigator.vibrate(p[type] || [8]);
      }
    }

    function cancelPress() {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      if (pressTarget) {
        pressTarget.classList.remove('hist-row--pressing');
        pressTarget = null;
      }
    }

    function startPress(row, x, y) {
      cancelPress();
      pressTarget = row;
      pressStartX = x;
      pressStartY = y;
      row.classList.add('hist-row--pressing');
      pressTimer = setTimeout(function () {
        pressTimer = null;
        if (!pressTarget) return;
        var id = pressTarget.getAttribute('data-id');
        pressTarget.classList.remove('hist-row--pressing');
        pressTarget = null;
        if (id && typeof FTReceiptReport !== 'undefined') {
          var tx = typeof FTTransactions !== 'undefined' ? FTTransactions.getById(id) : null;
          if (tx && tx.hasReceiptReport) {
            haptic('medium');
            FTReceiptReport.open(id);
          }
        }
      }, 500);
    }

    function onMove(x, y) {
      if (!pressTimer || !pressTarget) return;
      var dx = Math.abs(x - pressStartX);
      var dy = Math.abs(y - pressStartY);
      if (dx > 12 || dy > 12) cancelPress();
    }

    listEl.addEventListener('touchstart', function (e) {
      var row = e.target.closest('.hist-row');
      if (!row || !listEl.contains(row)) return;
      var t = e.touches && e.touches[0];
      if (!t) return;
      startPress(row, t.clientX, t.clientY);
    }, { passive: true });

    listEl.addEventListener('touchmove', function (e) {
      var t = e.touches && e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    }, { passive: true });

    listEl.addEventListener('touchend', cancelPress, { passive: true });
    listEl.addEventListener('touchcancel', cancelPress, { passive: true });

    listEl.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      var row = e.target.closest('.hist-row');
      if (!row || !listEl.contains(row)) return;
      startPress(row, e.clientX, e.clientY);
    });

    listEl.addEventListener('mousemove', function (e) {
      onMove(e.clientX, e.clientY);
    });

    listEl.addEventListener('mouseup', cancelPress);
    listEl.addEventListener('mouseleave', cancelPress);
  })();

  window.__ftSyncHistory = render;

  (function syncHistoryFromFirestore() {
    var u = typeof FTSession !== 'undefined' ? FTSession.parseUser() : null;
    if (!u || !u.uid) return;
    if (typeof FTTransactions === 'undefined' || typeof FTTransactions.syncFromFirestore !== 'function') return;
    FTTransactions.clearDemoSeeds();
    FTTransactions.syncFromFirestore(u.uid).then(function () {
      render();
    });
  })();

  render();
})();
