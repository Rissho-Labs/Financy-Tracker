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

  requestAnimationFrame(function () {
    nav.classList.add('is-interactive');
  });

  nav.addEventListener('click', function (e) {
    var item = e.target.closest('.nav-item');
    if (!item || !item.id) return;

    var key = ROUTE_BY_ID[item.id];
    if (!key || typeof FTRoutes === 'undefined' || !FTRoutes[key]) return;

    var dest = FTRoutes[key];
    if (window.location.pathname === dest) return;

    e.preventDefault();
    if (window.FTTabCarousel && typeof FTTabCarousel.goTo === 'function') {
      if (FTTabCarousel.goTo(key)) return;
    }
    try {
      sessionStorage.setItem('ft-tab-nav', '1');
    } catch (err) { /* ignore */ }
    window.location.href = dest;
  });
})();
