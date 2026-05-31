/**
 * Navegação do menu inferior — rotas absolutas via FTRoutes
 * @author Rickson.Hirata
 */
(function () {
  'use strict';

  var ROUTE_BY_ID = {
    'nav-home': 'home',
    'nav-wallet': 'cards',
    'nav-tx': 'goals',
    'nav-profile': 'profile',
  };

  var nav = document.querySelector('.bottom-nav');
  if (!nav) return;

  nav.addEventListener('click', function (e) {
    var item = e.target.closest('.nav-item');
    if (!item || !item.id) return;

    var key = ROUTE_BY_ID[item.id];
    if (!key || typeof FTRoutes === 'undefined' || !FTRoutes[key]) return;

    e.preventDefault();
    window.location.href = FTRoutes[key];
  });
})();
