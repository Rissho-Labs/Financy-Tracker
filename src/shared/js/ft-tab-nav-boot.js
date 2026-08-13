/**
 * Marca abas com data-ft-tabs ANTES do paint (script sync no <head>).
 * Evita o salto do .nav-item.active expandindo e depois colapsando no carousel.
 */
(function () {
  'use strict';
  try {
    if (sessionStorage.getItem('ft-carousel') === '0') return;
    if (sessionStorage.getItem('ft-carousel') === '1') {
      document.documentElement.setAttribute('data-ft-tabs', '1');
      return;
    }
  } catch (e) { /* ignore */ }
  var host = (typeof location !== 'undefined' && location.hostname) || '';
  var ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  if (host === 'localhost' || host === '127.0.0.1') {
    document.documentElement.setAttribute('data-ft-tabs', '1');
    return;
  }
  if (/Capacitor/i.test(ua) || /; wv\)/.test(ua)) {
    document.documentElement.setAttribute('data-ft-tabs', '1');
    return;
  }
  try {
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches) {
      document.documentElement.setAttribute('data-ft-tabs', '1');
    }
  } catch (e2) { /* ignore */ }
})();
