(function () {
  'use strict';

  /* Troca de aba: evita re-animar o phone-frame (efeito de “pulo” no desktop) */
  try {
    if (sessionStorage.getItem('ft-tab-nav')) {
      document.documentElement.classList.add('ft-instant-enter');
      sessionStorage.removeItem('ft-tab-nav');
    }
  } catch (e) { /* ignore */ }

  var KEY = 'ft_theme';

  function get() {
    return localStorage.getItem(KEY) || 'dark';
  }

  function set(mode) {
    var m = mode === 'light' ? 'light' : 'dark';
    localStorage.setItem(KEY, m);
    apply();
  }

  function apply() {
    var m = get();
    document.documentElement.setAttribute('data-theme', m);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var ios = document.documentElement.classList.contains('ft-ios');
      var dark = ios ? '#0c0c0e' : '#0e0e14';
      var light = ios ? '#f2f2f7' : '#e8e8ee';
      meta.setAttribute('content', m === 'light' ? light : dark);
    }
  }

  function syncToggle() {
    var el = document.getElementById('dark-mode-toggle');
    if (!el) return;
    el.checked = get() === 'dark';
    el.addEventListener('change', function () {
      set(el.checked ? 'dark' : 'light');
    });
  }

  apply();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncToggle);
  } else {
    syncToggle();
  }

  window.FTTheme = { get: get, set: set, apply: apply };
})();
