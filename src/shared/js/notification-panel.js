(function () {
  'use strict';

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

  window.FTNotifications = {
    open: function () {
      var p = getSheet();
      if (!p || !window.FTSheet) return;
      FTSheet.open(p);
    },
    close: function () {
      var p = getSheet();
      if (!p || !window.FTSheet) return;
      FTSheet.close(p);
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
        '<ul class="ft-notif-list">' +
        '<li class="ft-notif-item"><span class="ft-notif-dot"></span><div><strong>Lembrete de orçamento</strong><p>Falta 1 semana para fechar o mês — reveja seus gastos fixos.</p><span class="ft-notif-time">Hoje</span></div></li>' +
        '<li class="ft-notif-item"><span class="ft-notif-dot ft-notif-dot--info"></span><div><strong>Meta em dia</strong><p>Continue assim para atingir seu objetivo.</p><span class="ft-notif-time">Ontem</span></div></li>' +
        '<li class="ft-notif-item"><span class="ft-notif-dot ft-notif-dot--muted"></span><div><strong>Sistema</strong><p>Modo demonstração — notificações reais depois do backend.</p><span class="ft-notif-time">—</span></div></li>' +
        '</ul>' +
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
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          window.FTNotifications.open();
        });
      }
    },
  };
})();
