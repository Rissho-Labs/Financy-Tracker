/**
 * Consentimento LGPD — processamento de imagens em APIs de IA (DeepSeek / ML Kit)
 * @author Rickson.Hirata
 */
(function (global) {
  'use strict';

  var KEY = 'ft_ai_scan_consent_v1';
  var overlayId = 'ft-ai-consent-overlay';

  function hasConsent() {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function setConsent(accepted) {
    try {
      if (accepted) localStorage.setItem(KEY, '1');
      else localStorage.removeItem(KEY);
    } catch (e) { /* ignore */ }
  }

  function removeOverlay() {
    var el = document.getElementById(overlayId);
    if (el) el.remove();
  }

  /**
   * Exibe modal de consentimento. Resolve true se aceito, false se recusado.
   * @returns {Promise<boolean>}
   */
  function requestConsent() {
    if (hasConsent()) return Promise.resolve(true);

    return new Promise(function (resolve) {
      removeOverlay();

      var overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.className = 'ai-consent-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'ai-consent-title');
      overlay.innerHTML =
        '<div class="ai-consent-sheet">' +
        '  <h2 id="ai-consent-title" class="ai-consent-title">Processamento de imagens</h2>' +
        '  <p class="ai-consent-text">Para ler notas fiscais, o Finance Tracker pode enviar <strong>imagens ou PDFs</strong> ' +
        'a serviços de IA (DeepSeek) e reconhecimento local (ML Kit). Nenhum dado biométrico é enviado.</p>' +
        '  <p class="ai-consent-text ai-consent-text--muted">Você pode revogar nas configurações do perfil. ' +
        'Consulte nossa política de privacidade para detalhes sobre retenção e base legal (LGPD).</p>' +
        '  <label class="ai-consent-check">' +
        '    <input type="checkbox" id="ai-consent-check" />' +
        '    <span>Li e autorizo o processamento das imagens para registro automático de gastos.</span>' +
        '  </label>' +
        '  <div class="ai-consent-actions">' +
        '    <button type="button" class="ai-consent-btn ai-consent-btn--ghost" data-action="deny">Não autorizar</button>' +
        '    <button type="button" class="ai-consent-btn ai-consent-btn--primary" data-action="accept" disabled>Autorizar</button>' +
        '  </div>' +
        '</div>';

      document.body.appendChild(overlay);

      var check = overlay.querySelector('#ai-consent-check');
      var acceptBtn = overlay.querySelector('[data-action="accept"]');

      check.addEventListener('change', function () {
        acceptBtn.disabled = !check.checked;
      });

      overlay.addEventListener('click', function (e) {
        var action = e.target.closest('[data-action]');
        if (!action) return;
        if (action.dataset.action === 'accept' && check.checked) {
          setConsent(true);
          removeOverlay();
          resolve(true);
        } else if (action.dataset.action === 'deny') {
          setConsent(false);
          removeOverlay();
          resolve(false);
        }
      });
    });
  }

  global.FTAiConsent = {
    hasConsent: hasConsent,
    setConsent: setConsent,
    requestConsent: requestConsent,
    revoke: function () { setConsent(false); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
