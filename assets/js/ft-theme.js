(function () {
  'use strict';

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
    if (meta) meta.setAttribute('content', m === 'light' ? '#f4f4f8' : '#0a0a0f');
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
