/**
 * Probe de debug para testes no dispositivo (Capacitor / localhost).
 * Emite eventos estruturados no console com prefixo [FTProbe] (visível no adb logcat).
 * Não registra senhas nem valores de campos type=password.
 * @author Rickson.Hirata
 */
(function (global) {
  'use strict';

  if (global.__FT_PROBE__) return;
  global.__FT_PROBE__ = true;

  var SEQ = 0;
  var START = Date.now();

  function enabled() {
    try {
      if (global.sessionStorage && sessionStorage.getItem('ft-debug') === '0') return false;
      if (global.sessionStorage && sessionStorage.getItem('ft-debug') === '1') return true;
    } catch (e) { /* ignore */ }
    var host = (global.location && location.hostname) || '';
    var ua = (global.navigator && navigator.userAgent) || '';
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (/Capacitor/i.test(ua) || /; wv\)/.test(ua)) return true;
    return false;
  }

  if (!enabled()) return;

  function redact(val) {
    if (val == null) return val;
    var s = String(val);
    if (s.length > 160) return s.slice(0, 160) + '…';
    return s;
  }

  function elInfo(el) {
    if (!el || el.nodeType !== 1) return null;
    var tag = (el.tagName || '').toLowerCase();
    var info = { tag: tag };
    if (el.id) info.id = el.id;
    if (el.className && typeof el.className === 'string') {
      info.class = el.className.trim().split(/\s+/).slice(0, 6).join(' ');
    }
    if (el.getAttribute) {
      var role = el.getAttribute('role');
      var aria = el.getAttribute('aria-label');
      var name = el.getAttribute('name');
      var type = el.getAttribute('type');
      var href = el.getAttribute('href');
      if (role) info.role = role;
      if (aria) info.aria = redact(aria);
      if (name) info.name = name;
      if (type) info.type = type;
      if (href) info.href = redact(href);
    }
    var text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
    if (text) info.text = redact(text.slice(0, 80));
    return info;
  }

  function emit(kind, data) {
    SEQ += 1;
    var payload = {
      n: SEQ,
      t: Date.now() - START,
      kind: kind,
      path: (global.location && (location.pathname + location.search)) || '',
      data: data || {},
    };
    try {
      console.log('[FTProbe]', JSON.stringify(payload));
    } catch (e) {
      console.log('[FTProbe]', kind);
    }
  }

  emit('probe_start', {
    href: String(global.location && location.href),
    ua: redact((global.navigator && navigator.userAgent) || ''),
    build: global.__FT_BUILD__ || null,
  });

  global.addEventListener(
    'error',
    function (ev) {
      emit('error', {
        message: redact(ev.message || (ev.error && ev.error.message)),
        source: redact(ev.filename || ''),
        line: ev.lineno || 0,
        col: ev.colno || 0,
      });
    },
    true
  );

  global.addEventListener('unhandledrejection', function (ev) {
    var reason = ev.reason;
    emit('unhandledrejection', {
      message: redact(reason && reason.message ? reason.message : reason),
    });
  });

  document.addEventListener(
    'click',
    function (ev) {
      var t = ev.target;
      if (t && t.nodeType === 3) t = t.parentElement;
      emit('click', {
        x: Math.round(ev.clientX || 0),
        y: Math.round(ev.clientY || 0),
        el: elInfo(t),
        closestBtn: elInfo(t && t.closest ? t.closest('button,a,[role="button"],.nav-item') : null),
      });
    },
    true
  );

  document.addEventListener(
    'submit',
    function (ev) {
      emit('submit', { el: elInfo(ev.target) });
    },
    true
  );

  document.addEventListener(
    'change',
    function (ev) {
      var el = ev.target;
      if (!el || el.nodeType !== 1) return;
      var type = (el.getAttribute('type') || '').toLowerCase();
      var tag = (el.tagName || '').toLowerCase();
      var value = null;
      if (type === 'password') value = '***';
      else if (tag === 'select') value = redact(el.value);
      else if (type === 'checkbox' || type === 'radio') value = !!el.checked;
      else if (tag === 'input' || tag === 'textarea') value = redact(el.value);
      emit('change', { el: elInfo(el), value: value });
    },
    true
  );

  var lastPath = (global.location && location.pathname) || '';
  setInterval(function () {
    var p = (global.location && location.pathname + location.search) || '';
    if (p !== lastPath) {
      emit('navigate', { from: lastPath, to: p });
      lastPath = p;
    }
  }, 400);

  document.addEventListener('visibilitychange', function () {
    emit('visibility', { state: document.visibilityState });
  });

  if (typeof global.fetch === 'function') {
    var rawFetch = global.fetch.bind(global);
    global.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : input && input.url;
      var method = (init && init.method) || 'GET';
      var t0 = Date.now();
      return rawFetch(input, init).then(
        function (res) {
          emit('fetch', {
            method: method,
            url: redact(url),
            status: res.status,
            ok: res.ok,
            ms: Date.now() - t0,
          });
          return res;
        },
        function (err) {
          emit('fetch_error', {
            method: method,
            url: redact(url),
            message: redact(err && err.message),
            ms: Date.now() - t0,
          });
          throw err;
        }
      );
    };
  }

  var levels = ['log', 'info', 'warn', 'error'];
  levels.forEach(function (level) {
    var orig = console[level] && console[level].bind(console);
    if (!orig) return;
    console[level] = function () {
      try {
        var args = Array.prototype.slice.call(arguments);
        if (!(args[0] && String(args[0]).indexOf('[FTProbe]') === 0)) {
          emit('console_' + level, {
            args: args.map(function (a) {
              var s;
              if (typeof a === 'string') s = a;
              else {
                try {
                  s = JSON.stringify(a);
                } catch (e) {
                  s = String(a);
                }
              }
              s = String(s || '');
              s = s.replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"***"');
              s = s.replace(/password[=:]\s*[^\s&,}]+/gi, 'password=***');
              return redact(s);
            }).slice(0, 4),
          });
        }
      } catch (e) { /* ignore */ }
      return orig.apply(console, arguments);
    };
  });

  global.FTProbe = {
    emit: emit,
    mark: function (label, data) {
      emit('mark', { label: label, data: data || {} });
    },
  };

  emit('probe_ready', { ok: true });
})(typeof window !== 'undefined' ? window : globalThis);
