/**
 * QR Code / convite de perfil — payload, URL pública e share
 * @author Rickson.Hirata
 */
(function (global) {
  'use strict';

  var SCHEME = 'ft-friend://v1';
  /** Origem pública (Firebase Hosting) — links partilháveis fora do WebView */
  var PUBLIC_ORIGIN = 'https://financy-4d5f7.web.app';
  var PLAY_STORE =
    'https://play.google.com/store/apps/details?id=com.financetracker.app';
  /** Placeholder até publicar na App Store */
  var APP_STORE = PUBLIC_ORIGIN + '/invite';

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
   * Payload estável por perfil (@user + #tag) — QR / deep link nativo.
   */
  function buildPayload(user) {
    if (!user) return '';
    var u = normalizeUsername(user.username);
    var t = normalizeTag(user.tag);
    if (!u || !t) return '';
    return SCHEME + '?u=' + encodeURIComponent(u) + '&t=' + encodeURIComponent(t);
  }

  /** Link HTTPS para WhatsApp / redes (abre landing → app ou loja). */
  function buildInviteUrl(user) {
    if (!user) return '';
    var u = normalizeUsername(user.username);
    var t = normalizeTag(user.tag);
    if (!u || !t) return '';
    return (
      PUBLIC_ORIGIN +
      '/invite?u=' +
      encodeURIComponent(u) +
      '&t=' +
      encodeURIComponent(t)
    );
  }

  function buildShareText(user) {
    var u = normalizeUsername(user && user.username);
    var t = normalizeTag(user && user.tag);
    var handle = u && t ? '@' + u + ' #' + t : '';
    var name = String((user && user.name) || '').trim();
    var line1 = name
      ? name.split(/\s+/)[0] + ' te convidou no Finance Tracker.'
      : 'Conecte-se comigo no Finance Tracker.';
    var line2 = 'Vamos dividir contas juntos?';
    var url = buildInviteUrl(user);
    var parts = [line1, line2];
    if (handle) parts.push('', handle);
    if (url) parts.push('', url);
    return parts.join('\n');
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

    try {
      if (/^https?:\/\//i.test(text) && /[?&]u=/.test(text)) {
        var web = new URL(text);
        var wu = normalizeUsername(web.searchParams.get('u'));
        var wt = normalizeTag(web.searchParams.get('t'));
        if (wu && wt) return { username: wu, tag: wt };
      }
    } catch (e2) {
      /* ignore */
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

  /**
   * Abre a folha nativa de partilha (WhatsApp, etc.).
   * Fallback: copia o texto para a área de transferência.
   */
  function shareProfile(user) {
    var text = buildShareText(user);
    var url = buildInviteUrl(user);
    if (!text || !url) {
      return Promise.reject(new Error('share_missing_profile'));
    }

    var shareData = {
      title: 'Finance Tracker',
      text: text,
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      return navigator
        .share(shareData)
        .then(function () {
          return { ok: true, method: 'share' };
        })
        .catch(function (err) {
          if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
            return { ok: false, cancelled: true };
          }
          return copyShareFallback(text);
        });
    }

    return copyShareFallback(text);
  }

  function copyShareFallback(text) {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {
      return navigator.clipboard.writeText(text).then(function () {
        return { ok: true, method: 'clipboard', copied: true };
      });
    }
    return Promise.reject(new Error('share_unavailable'));
  }

  global.FTQR = {
    SCHEME: SCHEME,
    PUBLIC_ORIGIN: PUBLIC_ORIGIN,
    PLAY_STORE: PLAY_STORE,
    APP_STORE: APP_STORE,
    buildPayload: buildPayload,
    buildInviteUrl: buildInviteUrl,
    buildShareText: buildShareText,
    parsePayload: parsePayload,
    renderToCanvas: renderToCanvas,
    displayHandle: displayHandle,
    shareProfile: shareProfile,
    payloadFromSession: function () {
      if (typeof global.FTSession === 'undefined' || !FTSession.parseUser) return '';
      return buildPayload(FTSession.parseUser());
    },
  };
})(typeof window !== 'undefined' ? window : global);
