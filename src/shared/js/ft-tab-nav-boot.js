/**
 * Marca abas com data-ft-tabs + CSS crítico ANTES do paint.
 * - Evita expand do .nav-item.active (home.css)
 * - Mantém .bottom-nav absolute com altura fixa (sem safe-area no padding)
 */
(function () {
  'use strict';

  function enable() {
    var root = document.documentElement;
    root.setAttribute('data-ft-tabs', '1');
    if (document.getElementById('ft-tab-nav-critical')) return;
    var style = document.createElement('style');
    style.id = 'ft-tab-nav-critical';
    style.textContent =
      /* NÃO position:relative — absolute vem do home.css; relative = salto do contorno */
      'html[data-ft-tabs] .bottom-nav{isolation:isolate;box-sizing:border-box!important;' +
      'width:min(350px,calc(100% - 40px))!important;height:58px!important;' +
      'min-height:58px!important;max-height:58px!important;padding:7px 12px!important;' +
      'bottom:calc(18px + env(safe-area-inset-bottom,0px))!important;gap:0!important;' +
      'transition:none!important;' +
      '--ft-nav-pill-size:44px;--ft-nav-pill-bg:rgba(255,255,255,.14);--ft-nav-pill-shadow:none}' +
      'html.ft-ios[data-theme=light][data-ft-tabs] .bottom-nav,' +
      'html[data-theme=light][data-ft-tabs] .bottom-nav{' +
      '--ft-nav-pill-bg:rgba(0,0,0,.08)}' +
      'html:not(.ft-ios)[data-ft-tabs] .bottom-nav{' +
      '--ft-nav-pill-bg:linear-gradient(145deg,rgba(196,181,253,.92) 0%,rgba(139,92,246,.88) 45%,rgba(109,40,217,.9) 100%);' +
      '--ft-nav-pill-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 2px 10px rgba(109,40,217,.28)}' +
      'html:not(.ft-ios)[data-theme=light][data-ft-tabs] .bottom-nav{' +
      '--ft-nav-pill-bg:var(--accent-purple-metal,#7c3aed)}' +
      'html[data-ft-tabs] .bottom-nav .nav-item{' +
      'position:relative;z-index:1;isolation:isolate;flex:1 1 0!important;gap:0!important;' +
      'height:44px!important;min-height:44px!important;max-height:44px!important;padding:0!important;' +
      'min-width:0!important;max-width:none!important;' +
      'background:transparent!important;box-shadow:none!important;' +
      'backdrop-filter:none!important;-webkit-backdrop-filter:none!important;' +
      'transition:color .15s ease!important}' +
      'html[data-ft-tabs] .bottom-nav .nav-item>span{display:none!important}' +
      'html[data-ft-tabs] .bottom-nav .nav-item svg{position:relative;z-index:1}' +
      'html[data-ft-tabs] .bottom-nav .nav-item.active{' +
      'background:transparent!important;box-shadow:none!important;color:#fff;flex:1 1 0!important}' +
      'html[data-theme=light][data-ft-tabs] .bottom-nav .nav-item.active{color:#111}' +
      'html[data-ft-tabs] .bottom-nav .nav-item.active::before{' +
      'content:"";position:absolute;left:50%;top:50%;' +
      'width:var(--ft-nav-pill-size);height:var(--ft-nav-pill-size);' +
      'margin-left:calc(var(--ft-nav-pill-size)/-2);margin-top:calc(var(--ft-nav-pill-size)/-2);' +
      'border-radius:999px;background:var(--ft-nav-pill-bg);box-shadow:var(--ft-nav-pill-shadow);' +
      'z-index:0;pointer-events:none}';
    (document.head || root).appendChild(style);
  }

  try {
    if (sessionStorage.getItem('ft-carousel') === '0') return;
    if (sessionStorage.getItem('ft-carousel') === '1') {
      enable();
      return;
    }
  } catch (e) { /* ignore */ }

  var host = (typeof location !== 'undefined' && location.hostname) || '';
  var ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  if (host === 'localhost' || host === '127.0.0.1') {
    enable();
    return;
  }
  if (/Capacitor/i.test(ua) || /; wv\)/.test(ua)) {
    enable();
    return;
  }
  try {
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches) enable();
  } catch (e2) { /* ignore */ }
})();
