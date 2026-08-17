(function () {
  'use strict';

  var STORAGE_KEY = 'ft_notif_read_ids';
  var MOCK_ITEMS = [
    { id: 'budget-week', dotClass: '', title: 'Lembrete de orçamento', body: 'Falta 1 semana para fechar o mês — reveja seus gastos fixos.', time: 'Hoje' },
    { id: 'goal-ontrack', dotClass: 'ft-notif-dot--info', title: 'Meta em dia', body: 'Continue assim para atingir seu objetivo.', time: 'Ontem' },
    { id: 'system-demo', dotClass: 'ft-notif-dot--muted', title: 'Sistema', body: 'Modo demonstração — notificações reais depois do backend.', time: '—' }
  ];

  var CHROME =
    '<div class="ft-sheet__handle" aria-hidden="true"></div>' +
    '<div class="ft-sheet__chrome">' +
    '<button type="button" class="ft-sheet__back" hidden aria-label="Voltar">' +
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>' +
    '</button>' +
    '<h2 class="ft-sheet__title" id="ft-notif-title">Avisos</h2>' +
    '<button type="button" class="ft-sheet__x" aria-label="Fechar">' +
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
    '</button>' +
    '</div>';

  function getSheet() {
    return document.getElementById('ft-notif-sheet');
  }

  function readIds() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function markAllRead() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_ITEMS.map(function (it) { return it.id; })));
    } catch (e) { /* ignore quota/private-mode errors */ }
  }

  function unreadCount() {
    var read = readIds();
    return MOCK_ITEMS.reduce(function (n, it) {
      return n + (read.indexOf(it.id) === -1 ? 1 : 0);
    }, 0);
  }

  function renderBadge(btn) {
    if (!btn) return;
    var count = unreadCount();
    var badge = btn.querySelector('.notif-badge');
    if (count <= 0) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'notif-badge';
      btn.appendChild(badge);
    }
    badge.textContent = String(count);
    badge.setAttribute('aria-label', count + (count === 1 ? ' nova notificação' : ' novas notificações'));
  }

  function renderList() {
    var read = readIds();
    if (!MOCK_ITEMS.length) {
      return '<div class="ft-notif-empty"><p>Nenhum aviso por aqui.</p></div>';
    }
    return '<ul class="ft-notif-list">' + MOCK_ITEMS.map(function (it, i) {
      var isUnread = read.indexOf(it.id) === -1;
      return '<li class="ft-notif-item' + (isUnread ? ' ft-notif-item--unread' : '') + '" style="animation-delay:' + (i * 45) + 'ms">' +
        '<span class="ft-notif-dot ' + it.dotClass + '"></span>' +
        '<div><strong>' + it.title + '</strong><p>' + it.body + '</p><span class="ft-notif-time">' + it.time + '</span></div>' +
        '</li>';
    }).join('') + '</ul>';
  }

  window.FTNotifications = {
    open: function () {
      var p = getSheet();
      if (!p) return;
      markAllRead();
      renderBadge(document.querySelector('#notification-btn'));
      var list = p.querySelector('.ft-notif-body');
      if (list) list.innerHTML = renderList();
      if (window.FTSheet) {
        FTSheet.open(p);
      } else {
        p.classList.add('ft-sheet--open');
        p.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    },
    close: function () {
      var p = getSheet();
      if (!p) return;
      if (window.FTSheet) {
        FTSheet.close(p);
      } else {
        p.classList.remove('ft-sheet--open');
        p.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    },
    mountIfNeeded: function () {
      if (getSheet()) return;
      var host = document.querySelector('.phone-frame') || document.body;
      var el = document.createElement('div');
      el.id = 'ft-notif-sheet';
      el.className = 'ft-sheet';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML =
        '<div class="ft-sheet__backdrop" tabindex="-1"></div>' +
        '<div class="ft-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="ft-notif-title">' +
        CHROME +
        '<div class="ft-notif-body">' + renderList() + '</div>' +
        '</div>';
      host.appendChild(el);
      if (window.FTSheet) {
        FTSheet.register(el, { lockBody: true });
      }
    },
    bind: function (btnSelector) {
      this.mountIfNeeded();
      var btn = typeof btnSelector === 'string' ? document.querySelector(btnSelector) : btnSelector;
      if (btn) {
        renderBadge(btn);
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          window.FTNotifications.open();
        });
      }
    },
  };
})();
