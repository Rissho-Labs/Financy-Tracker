/* eslint-disable */
'use strict';

(function () {
  const $ = (id) => document.getElementById(id);

  function show(id) {
    const el = $(id);
    if (el) { el.classList.remove('rp-state--hidden'); }
  }
  function hide(id) {
    const el = $(id);
    if (el) { el.classList.add('rp-state--hidden'); }
  }
  function showErr(fieldId, errId, msg) {
    const f = $(fieldId), e = $(errId);
    if (f) { f.classList.add('error'); f.classList.remove('success'); }
    if (e) { e.textContent = msg; e.style.opacity = '1'; e.style.transform = 'translateY(0)'; }
  }
  function clearErr(fieldId, errId) {
    const f = $(fieldId), e = $(errId);
    if (f) f.classList.remove('error');
    if (e) { e.textContent = ''; e.style.opacity = '0'; }
  }
  function markOk(fieldId) {
    const f = $(fieldId);
    if (f) { f.classList.remove('error'); f.classList.add('success'); }
  }
  function haptic(t) {
    if (navigator.vibrate) {
      navigator.vibrate({ light: [8], medium: [18], error: [20, 50, 20] }[t] || [8]);
    }
  }

  // Indicador de força da senha
  function getStrength(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  }
  const strengthLabels  = ['', 'Fraca', 'Regular', 'Boa', 'Forte'];
  const strengthClasses = ['', 'weak', 'fair', 'good', 'strong'];

  $('rp-password').addEventListener('input', () => {
    const pw = $('rp-password').value;
    const score = pw ? getStrength(pw) : 0;
    const lbl = $('rp-strength-label');
    for (let i = 1; i <= 4; i++) {
      const bar = $(`rp-sbar-${i}`);
      if (bar) bar.className = 'strength-bar' + (i <= score ? ' ' + strengthClasses[score] : '');
    }
    if (lbl) {
      lbl.textContent = pw ? strengthLabels[score] : '';
      lbl.className = 'strength-label' + (pw ? ' ' + strengthClasses[score] : '');
    }
  });

  // Toggles de olho
  function setupEye(inputId, btnId, iconId) {
    const inp = $(inputId), btn = $(btnId), icon = $(iconId);
    if (!btn) return;
    const open   = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
    const closed = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
    btn.addEventListener('click', () => {
      const hidden = inp.type === 'password';
      inp.type = hidden ? 'text' : 'password';
      if (icon) icon.innerHTML = hidden ? closed : open;
      btn.setAttribute('aria-label', hidden ? 'Ocultar senha' : 'Mostrar senha');
    });
  }
  setupEye('rp-password', 'rp-toggle-pw', 'rp-eye');
  setupEye('rp-confirm',  'rp-toggle-cf', 'rp-eye-cf');

  // ── Inicialização: ler oobCode da URL ──
  async function init() {
    const params = new URLSearchParams(window.location.search || '');
    const mode    = params.get('mode');
    const oobCode = params.get('oobCode');

    if (mode !== 'resetPassword' || !oobCode) {
      hide('rp-loading');
      show('rp-invalid');
      const msg = $('rp-invalid-msg');
      if (msg) msg.textContent = 'Link inválido. Solicite uma nova recuperação de senha.';
      return;
    }

    if (typeof FTFirebase === 'undefined' || !FTFirebase.verifyResetCode) {
      hide('rp-loading');
      show('rp-invalid');
      const msg = $('rp-invalid-msg');
      if (msg) msg.textContent = 'Firebase não carregado. Tente reabrir o link no navegador.';
      return;
    }

    try {
      const email = await FTFirebase.verifyResetCode(oobCode);
      hide('rp-loading');
      show('rp-form-wrap');
      const label = $('rp-email-label');
      if (label && email) label.textContent = `Conta: ${email}`;
      setupForm(oobCode);
    } catch (err) {
      hide('rp-loading');
      show('rp-invalid');
      const code = err && err.code ? String(err.code) : '';
      const msg  = $('rp-invalid-msg');
      if (msg) {
        if (code === 'auth/expired-action-code') {
          msg.textContent = 'Este link expirou. Solicite uma nova recuperação de senha.';
        } else if (code === 'auth/invalid-action-code') {
          msg.textContent = 'Link inválido ou já utilizado. Solicite um novo.';
        } else {
          msg.textContent = 'Não foi possível verificar o link. Solicite um novo.';
        }
      }
    }
  }

  function setupForm(oobCode) {
    const form = $('rp-form');
    if (!form) return;

    // Validação em tempo real
    $('rp-password').addEventListener('blur', () => {
      const v = $('rp-password').value;
      if (!v) showErr('rp-password', 'rp-pw-error', 'Digite a nova senha.');
      else if (v.length < 8) showErr('rp-password', 'rp-pw-error', 'Mínimo 8 caracteres.');
      else { clearErr('rp-password', 'rp-pw-error'); markOk('rp-password'); }
    });
    $('rp-confirm').addEventListener('blur', () => {
      const v  = $('rp-confirm').value;
      const pw = $('rp-password').value;
      if (!v) showErr('rp-confirm', 'rp-cf-error', 'Confirme a senha.');
      else if (v !== pw) showErr('rp-confirm', 'rp-cf-error', 'Senhas não coincidem.');
      else { clearErr('rp-confirm', 'rp-cf-error'); markOk('rp-confirm'); }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pw  = $('rp-password').value;
      const cpw = $('rp-confirm').value;
      let valid = true;

      if (!pw || pw.length < 8) { showErr('rp-password', 'rp-pw-error', 'Mínimo 8 caracteres.'); valid = false; }
      else clearErr('rp-password', 'rp-pw-error');

      if (!cpw) { showErr('rp-confirm', 'rp-cf-error', 'Confirme a senha.'); valid = false; }
      else if (cpw !== pw) { showErr('rp-confirm', 'rp-cf-error', 'Senhas não coincidem.'); valid = false; }
      else clearErr('rp-confirm', 'rp-cf-error');

      if (!valid) { haptic('error'); return; }

      const btn = $('rp-btn-submit');
      btn.classList.add('loading');
      btn.disabled = true;
      haptic('medium');

      try {
        await FTFirebase.applyNewPassword(oobCode, pw);
        hide('rp-form-wrap');
        show('rp-success');
        haptic('medium');
        // Redireciona automaticamente após 4 s
        setTimeout(() => { window.location.href = FTRoutes.login; }, 4000);
      } catch (err) {
        const code = err && err.code ? String(err.code) : '';
        let msg = 'Não foi possível salvar. Tente novamente.';
        if (code === 'auth/expired-action-code') {
          msg = 'O link expirou. Solicite uma nova recuperação de senha.';
        } else if (code === 'auth/weak-password') {
          msg = 'Senha muito fraca. Use pelo menos 6 caracteres com letras e números.';
        } else if (code === 'auth/invalid-action-code') {
          msg = 'Link inválido ou já usado. Solicite um novo.';
        }
        showErr('rp-password', 'rp-pw-error', msg);
        haptic('error');
        btn.classList.remove('loading');
        btn.disabled = false;
      }
    });
  }

  init();
})();
