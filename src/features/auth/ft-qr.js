/**
 * QR Code de perfil / amizades — payload e render
 * @author Rickson.Hirata
 */
(function (global) {
  'use strict';

  var SCHEME = 'ft-friend://v1';

  function normalizeUsername(u) {
    return String(u || '')
      .trim()
      .toLowerCase()
      .replace(/^@/, '');
  }

  function normalizeTag(t) {
    return String(t || '')
      .trim()
      .replace(/^#/, '');
  }

  /**
   * Payload estável por perfil (@user + #tag).
   */
  function buildPayload(user) {
    if (!user) return '';
    var u = normalizeUsername(user.username);
    var t = normalizeTag(user.tag);
    if (!u || !t) return '';
    return SCHEME + '?u=' + encodeURIComponent(u) + '&t=' + encodeURIComponent(t);
  }

  function parsePayload(raw) {
    var text = String(raw || '').trim();
    if (!text) return null;

    try {
      if (text.indexOf(SCHEME) === 0) {
        var url = new URL(text);
        var u = normalizeUsername(url.searchParams.get('u'));
        var t = normalizeTag(url.searchParams.get('t'));
        if (u && t) return { username: u, tag: t };
      }
    } catch (e) {
      /* fallback abaixo */
    }

    var m = text.match(/@?([a-z0-9._-]+)\s*#(\d{4})/i);
    if (m) {
      return { username: normalizeUsername(m[1]), tag: normalizeTag(m[2]) };
    }

    return null;
  }

  function renderToCanvas(canvas, payload) {
    if (!canvas || !payload) return Promise.reject(new Error('invalid_canvas'));
    var bridge = global.FTQRBridge;
    if (!bridge || !bridge.QRCode) return Promise.reject(new Error('qr_lib_missing'));

    return bridge.QRCode.toCanvas(canvas, payload, {
      width: 220,
      margin: 2,
      color: { dark: '#0a0a0f', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  }

  function displayHandle(parsed) {
    if (!parsed) return '';
    return '@' + parsed.username + ' #' + parsed.tag;
  }

  global.FTQR = {
    SCHEME: SCHEME,
    buildPayload: buildPayload,
    parsePayload: parsePayload,
    renderToCanvas: renderToCanvas,
    displayHandle: displayHandle,
    payloadFromSession: function () {
      if (typeof global.FTSession === 'undefined' || !FTSession.parseUser) return '';
      return buildPayload(FTSession.parseUser());
    },
  };
})(typeof window !== 'undefined' ? window : global);
