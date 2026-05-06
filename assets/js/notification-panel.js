(function () {
  'use strict';

  window.FTNotifications = {
    open: function () {
      var p = document.getElementById('ft-notif-sheet');
      if (!p) return;
      p.classList.add('ft-sheet--open');
      p.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    },
    close: function () {
      var p = document.getElementById('ft-notif-sheet');
      if (!p) return;
      p.classList.remove('ft-sheet--open');
      p.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    },
    mountIfNeeded: function () {
      if (document.getElementById('ft-notif-sheet')) return;
      var host = document.querySelector('.phone-frame') || document.body;
      var el = document.createElement('div');
      el.id = 'ft-notif-sheet';
      el.className = 'ft-sheet';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML =
        '<div class="ft-sheet__backdrop" tabindex="-1"></div>' +
        '<div class="ft-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="ft-notif-title">' +
        '<div class="ft-sheet__handle"></div>' +
        '<h2 class="ft-sheet__title" id="ft-notif-title">Avisos</h2>' +
        '<ul class="ft-notif-list">' +
        '<li class="ft-notif-item"><span class="ft-notif-dot"></span><div><strong>Lembrete de orçamento</strong><p>Falta 1 semana para fechar o mês — reveja seus gastos fixos.</p><span class="ft-notif-time">Hoje</span></div></li>' +
        '<li class="ft-notif-item"><span class="ft-notif-dot ft-notif-dot--info"></span><div><strong>Meta em dia</strong><p>Continue assim para atingir seu objetivo.</p><span class="ft-notif-time">Ontem</span></div></li>' +
        '<li class="ft-notif-item"><span class="ft-notif-dot ft-notif-dot--muted"></span><div><strong>Sistema</strong><p>Modo demonstração — notificações reais depois do backend.</p><span class="ft-notif-time">—</span></div></li>' +
        '</ul>' +
        '<button type="button" class="ft-sheet__close" id="ft-notif-close">Fechar</button>' +
        '</div>';
      host.appendChild(el);
      el.querySelector('.ft-sheet__backdrop').addEventListener('click', function () {
        window.FTNotifications.close();
      });
      el.querySelector('#ft-notif-close').addEventListener('click', function () {
        window.FTNotifications.close();
      });
    },
    bind: function (btnSelector) {
      this.mountIfNeeded();
      var btn = typeof btnSelector === 'string' ? document.querySelector(btnSelector) : btnSelector;
      if (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          window.FTNotifications.open();
        });
      }
    }
  };
})();
