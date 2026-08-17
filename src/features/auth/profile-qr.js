/**
 * UI — exibir e escanear QR de amizade
 * @author Rickson.Hirata
 */
(function () {
  'use strict';

  if (typeof FTQR === 'undefined') return;

  const $ = (id) => document.getElementById(id);

  let lastFocusEl = null;
  let scanner = null;
  let scanHandled = false;

  const REASON_MSG = {
    invalid_payload: 'QR Code inválido. Use o código de um amigo do app.',
    self: 'Este QR Code é o seu. Peça o código de outra pessoa.',
    not_found: 'Usuário não encontrado no catálogo demo.',
    already_friend: 'Esta pessoa já está na sua lista.',
  };

  function haptic(type) {
    if (!navigator.vibrate) return;
    const p = { light: [8], medium: [18], error: [20, 50, 20], success: [12, 40, 12] };
    navigator.vibrate(p[type] || [8]);
  }

  function restoreFocus() {
    if (lastFocusEl && typeof lastFocusEl.focus === 'function') {
      const tag = String(lastFocusEl.tagName || '').toLowerCase();
      if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
        lastFocusEl.focus();
      }
    }
  }

  function openSheet(id) {
    const el = $(id);
    if (!el) return;
    lastFocusEl = document.activeElement;
    if (window.FTSheet) {
      FTSheet.open(el);
    } else {
      el.classList.add('ft-sheet--open');
      el.setAttribute('aria-hidden', 'false');
    }
  }

  function closeSheet(id, force) {
    const el = $(id);
    if (!el) return;
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (window.FTSheet) {
      FTSheet.close(el, !!force);
      return;
    }
    el.classList.remove('ft-sheet--open', 'open');
    el.setAttribute('aria-hidden', 'true');
    restoreFocus();
  }

  function setScanStatus(text, isError) {
    const el = $('qr-scan-status');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('is-error', !!isError);
  }

  async function stopScanner() {
    if (!scanner) return;
    try {
      const state = scanner.getState();
      if (state === 2 /* SCANNING */) {
        await scanner.stop();
      }
    } catch (e) {
      /* ignore */
    }
    try {
      await scanner.clear();
    } catch (e) {
      /* ignore */
    }
    scanner = null;
    scanHandled = false;
  }

  function notifyFriendsChanged() {
    if (typeof window.FTProfileQR !== 'undefined' && typeof FTProfileQR.onFriendsChanged === 'function') {
      FTProfileQR.onFriendsChanged();
    }
    window.dispatchEvent(new CustomEvent('ft-friends-changed'));
  }

  function handleScanPayload(raw) {
    const parsed = FTQR.parsePayload(raw);
    if (!parsed) {
      setScanStatus(REASON_MSG.invalid_payload, true);
      haptic('error');
      scanHandled = false;
      return;
    }

    if (typeof FTFriends === 'undefined' || !FTFriends.addFriendFromQr) {
      setScanStatus('Módulo de amigos indisponível.', true);
      haptic('error');
      scanHandled = false;
      return;
    }

    const result = FTFriends.addFriendFromQr(parsed);
    if (!result.ok) {
      let msg = REASON_MSG[result.reason] || 'Não foi possível adicionar.';
      if (result.reason === 'already_friend' && result.name) {
        msg = result.name + ' já está na sua lista.';
      }
      setScanStatus(msg, true);
      haptic('error');
      setTimeout(function () {
        scanHandled = false;
        setScanStatus('Aponte a câmera para o QR Code do seu amigo.');
      }, 2200);
      return;
    }

    haptic('success');
    setScanStatus((result.name || 'Amigo') + ' adicionado!');
    notifyFriendsChanged();

    setTimeout(function () {
      closeScanModal();
      const friendsSheet = $('friends-modal');
      if (friendsSheet && !friendsSheet.classList.contains('open')) {
        openSheet('friends-modal');
      }
    }, 900);
  }

  async function startScanner() {
    const hostId = 'qr-reader';
    const host = $(hostId);
    if (!host) return;

    const bridge = window.FTQRBridge;
    if (!bridge || !bridge.Html5Qrcode) {
      setScanStatus('Leitor QR indisponível. Rode npm run www:prepare.', true);
      return;
    }

    await stopScanner();
    setScanStatus('Aponte a câmera para o QR Code do seu amigo.');
    scanHandled = false;

    scanner = new bridge.Html5Qrcode(hostId);

    const config = {
      fps: 10,
      qrbox: function (viewW, viewH) {
        const size = Math.min(viewW, viewH, 260) * 0.72;
        return { width: Math.floor(size), height: Math.floor(size) };
      },
      aspectRatio: 1,
    };

    try {
      await scanner.start(
        { facingMode: 'environment' },
        config,
        function (decodedText) {
          if (scanHandled) return;
          scanHandled = true;
          handleScanPayload(decodedText);
        },
        function () {
          /* frame sem QR — silencioso */
        }
      );
    } catch (err) {
      setScanStatus(
        'Não foi possível abrir a câmera. Verifique a permissão ou use HTTPS.',
        true
      );
      haptic('error');
      console.warn('[Profile QR]', err);
    }
  }

  async function openShowModal() {
    haptic('light');
    const canvas = $('profile-qr-canvas');
    const handleEl = $('profile-qr-handle');
    const payload = FTQR.payloadFromSession();

    if (!payload) {
      alert('Complete seu @usuário e #id no perfil antes de gerar o QR Code.');
      return;
    }

    if (handleEl) {
      const user = typeof FTSession !== 'undefined' ? FTSession.parseUser() : null;
      handleEl.textContent = FTQR.displayHandle({
        username: user && user.username,
        tag: user && user.tag,
      });
    }

    if (canvas) {
      try {
        await FTQR.renderToCanvas(canvas, payload);
      } catch (e) {
        console.warn('[Profile QR] render', e);
        alert('Erro ao gerar QR Code.');
        return;
      }
    }

    openSheet('profile-qr-modal');
  }

  function closeShowModal() {
    closeSheet('profile-qr-modal');
  }

  async function openScanModal() {
    haptic('light');
    openSheet('friend-qr-scan-modal');
    setTimeout(function () {
      startScanner();
    }, 320);
  }

  async function closeScanModal() {
    await stopScanner();
    setScanStatus('');
    closeSheet('friend-qr-scan-modal', true);
  }

  $('show-qr-btn')?.addEventListener('click', function () {
    openShowModal();
  });

  $('friends-scan-btn')?.addEventListener('click', function () {
    openScanModal();
  });

  if (window.FTSheet) {
    FTSheet.register($('profile-qr-modal'), { onClose: restoreFocus });
    FTSheet.register($('friend-qr-scan-modal'), {
      canClose: function () {
        return !scanHandled;
      },
      onClose: function () {
        stopScanner();
        restoreFocus();
      },
    });
  }

  window.FTProfileQR = {
    openShow: openShowModal,
    openScan: openScanModal,
    closeScan: closeScanModal,
    onFriendsChanged: null,
  };
})();
