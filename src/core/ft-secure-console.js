/**
 * Redação de segredos no console — deve carregar o mais cedo possível.
 * Impede e-mail/senha (e campos secret/token) de irem para logcat / DevTools.
 * @author Rickson.Hirata
 */
(function (global) {
  'use strict';

  if (global.__FT_SECURE_CONSOLE__) return;
  global.__FT_SECURE_CONSOLE__ = true;

  var SENSITIVE_KEYS =
    /^(password|passwd|pwd|secret|token|idToken|refreshToken|accessToken|apiKey|authorization|credential|credentials)$/i;

  function scrubString(s) {
    s = String(s || '');
    s = s.replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"***"');
    s = s.replace(/"secret"\s*:\s*"[^"]*"/gi, '"secret":"***"');
    s = s.replace(/"token"\s*:\s*"[^"]*"/gi, '"token":"***"');
    s = s.replace(/"idToken"\s*:\s*"[^"]*"/gi, '"idToken":"***"');
    s = s.replace(/"refreshToken"\s*:\s*"[^"]*"/gi, '"refreshToken":"***"');
    s = s.replace(/"accessToken"\s*:\s*"[^"]*"/gi, '"accessToken":"***"');
    s = s.replace(/password[=:]\s*[^\s&,}]+/gi, 'password=***');
    return s;
  }

  function scrubValue(val, depth) {
    if (val == null) return val;
    if (depth > 4) return '[…]';
    var t = typeof val;
    if (t === 'string') return scrubString(val);
    if (t === 'number' || t === 'boolean') return val;
    if (t === 'function') return '[function]';
    if (val instanceof Error) {
      return { name: val.name, message: scrubString(val.message) };
    }
    if (Array.isArray(val)) {
      return val.slice(0, 20).map(function (x) {
        return scrubValue(x, depth + 1);
      });
    }
    if (t === 'object') {
      var out = {};
      var keys = Object.keys(val).slice(0, 40);
      var i;
      for (i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (SENSITIVE_KEYS.test(k)) out[k] = '***';
        else out[k] = scrubValue(val[k], depth + 1);
      }
      return out;
    }
    return scrubString(String(val));
  }

  function patchLevel(level) {
    var orig = console[level] && console[level].bind(console);
    if (!orig) return;
    console[level] = function () {
      var args = Array.prototype.slice.call(arguments).map(function (a) {
        return scrubValue(a, 0);
      });
      return orig.apply(console, args);
    };
  }

  ['log', 'info', 'debug', 'warn', 'error'].forEach(patchLevel);

  global.FTSecureLog = {
    scrub: function (v) {
      return scrubValue(v, 0);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
