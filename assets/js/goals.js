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

  const $ = (id) => document.getElementById(id);
  function haptic() {
    if (navigator.vibrate) navigator.vibrate(10);
  }

  (function clock() {
    const el = $('status-clock');
    if (!el) return;
    const tick = () => {
      el.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };
    tick();
    setInterval(tick, 10000);
  })();

  const fmtBRL = (cents) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  function parseMoney(str) {
    const n = parseFloat(String(str || '').replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : NaN;
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR');
  }

  function render() {
    const host = $('goals-list-section');
    if (!host) return;
    const goals = FTGoals.getAll();
    if (!goals.length) {
      host.innerHTML =
        '<p class="goals-intro" style="padding-top:8px;">Nenhuma meta ainda — use o formulário acima.</p>';
      return;
    }
    host.innerHTML = goals
      .map(function (g) {
        const badge =
          g.source === 'onboarding'
            ? '<span class="goal-card__badge">Do onboarding</span>'
            : '<span class="goal-card__badge">Sua meta</span>';
        const titleEsc = String(g.name).replace(/&/g, '&amp;').replace(/</g, '&lt;');
        return (
          '<article class="goal-card" data-id="' +
          g.id +
          '">' +
          '<div class="goal-card__top"><div>' +
          badge +
          '<h2 class="goal-card__title">' +
          titleEsc +
          '</h2>' +
          '<p class="goal-card__meta">' +
          fmtDate(g.start) +
          ' → ' +
          fmtDate(g.end) +
          '</p></div>' +
          '<div class="goal-card__amt">' +
          fmtBRL(g.targetCents || 0) +
          '</div></div>' +
          '<div class="goal-card__actions">' +
          '<button type="button" class="goal-btn-edit" data-id="' +
          g.id +
          '">Editar</button>' +
          '<button type="button" class="goal-btn-del" data-id="' +
          g.id +
          '">Excluir</button>' +
          '</div></article>'
        );
      })
      .join('');

    host.querySelectorAll('.goal-btn-edit').forEach((btn) => {
      btn.addEventListener('click', () => openEdit(btn.getAttribute('data-id')));
    });
    host.querySelectorAll('.goal-btn-del').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (confirm('Excluir esta meta?')) {
          FTGoals.remove(btn.getAttribute('data-id'));
          haptic();
          render();
        }
      });
    });
  }

  function openEdit(id) {
    const g = FTGoals.getAll().find((x) => x.id === id);
    if (!g) return;
    const root = $('goal-edit-root');
    const startVal = g.start && g.start.length >= 10 ? g.start.slice(0, 10) : '';
    const endVal = g.end && g.end.length >= 10 ? g.end.slice(0, 10) : '';
    root.innerHTML =
      '<div class="goal-edit-backdrop open" id="ged-bk"><div class="goal-edit-modal" role="dialog">' +
      '<h2 style="margin:0 0 12px;font-size:18px;">Editar meta</h2>' +
      '<div class="tx-field"><label>Nome</label><input id="ged-name" value="' +
      String(g.name).replace(/"/g, '&quot;') +
      '" /></div>' +
      '<div class="tx-field"><label>Valor alvo (R$)</label><input id="ged-val" value="' +
      (g.targetCents / 100).toFixed(2).replace('.', ',') +
      '" inputmode="decimal" /></div>' +
      '<div class="goal-row2"><div class="tx-field"><label>Início</label><input id="ged-start" type="date" value="' +
      startVal +
      '" /></div>' +
      '<div class="tx-field"><label>Conclusão</label><input id="ged-end" type="date" value="' +
      endVal +
      '" /></div></div>' +
      '<button type="button" class="goal-submit" id="ged-save">Salvar</button>' +
      '<button type="button" class="ft-sheet__close" style="margin-top:10px" id="ged-cancel">Cancelar</button>' +
      '</div></div>';
    const close = () => {
      root.innerHTML = '';
    };
    $('ged-bk').addEventListener('click', (e) => {
      if (e.target.id === 'ged-bk') close();
    });
    $('ged-cancel').addEventListener('click', close);
    $('ged-save').addEventListener('click', () => {
      const name = $('ged-name').value.trim();
      const cents = parseMoney($('ged-val').value);
      const st = $('ged-start').value;
      const en = $('ged-end').value;
      if (!name || !Number.isFinite(cents) || !st || !en) return;
      FTGoals.upsert({ id, name, targetCents: cents, start: st, end: en, source: g.source });
      haptic();
      close();
      render();
    });
  }

  $('goal-add-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('g-name').value.trim();
    const cents = parseMoney($('g-val').value);
    const st = $('g-start').value;
    const en = $('g-end').value;
    if (!name || !Number.isFinite(cents) || !st || !en) {
      haptic();
      return;
    }
    if (en < st) {
      alert('Data de conclusão deve ser após o início.');
      return;
    }
    FTGoals.upsert({ name, targetCents: cents, start: st, end: en, source: 'user' });
    $('g-name').value = '';
    $('g-val').value = '';
    haptic();
    render();
  });

  (function defaultDates() {
    const t0 = new Date();
    const t1 = new Date(t0.getTime());
    t1.setMonth(t1.getMonth() + 6);
    const dayStr = t0.toISOString().split('T')[0];
    const gs = $('g-start');
    const ge = $('g-end');
    if (gs) {
      gs.min = dayStr;
      if (!gs.value) gs.value = dayStr;
    }
    if (ge) {
      ge.min = gs?.value || dayStr;
      if (!ge.value) ge.value = t1.toISOString().split('T')[0];
    }
    gs?.addEventListener('change', () => {
      if (ge && gs.value) ge.min = gs.value;
    });
  })();

  render();

  if (window.FTNotifications) {
    FTNotifications.bind('#notification-btn');
  }
})();
