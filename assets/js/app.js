/* ──────────────────────────────────────────────────────────────
   Finance Tracker — Interaction Logic
   Form validation · Toggle password · Haptics · Ripple
   ────────────────────────────────────────────────────────────── */

'use strict';

(function indexBoot() {
  if (typeof FTSession === 'undefined') return;
  if (!FTSession.isLoggedIn()) return;
  if (FTSession.isOnboardingDone()) window.location.replace('/pages/home.html');
  else window.location.replace('/pages/onboarding.html');
})();

// ── Helpers ──────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function haptic(type = 'light') {
  if (navigator.vibrate) {
    const patterns = { light: [10], medium: [20], error: [20, 50, 20] };
    navigator.vibrate(patterns[type] || [10]);
  }
}

function showError(fieldId, errorId, msg) {
  const field = $(fieldId);
  const error = $(errorId);
  field.classList.add('error');
  field.classList.remove('success');
  error.textContent = msg;
  error.classList.add('visible');
  field.closest('.field-group')?.classList.add('shake');
  setTimeout(() => field.closest('.field-group')?.classList.remove('shake'), 420);
}

function clearError(fieldId, errorId) {
  const field = $(fieldId);
  const error = $(errorId);
  field.classList.remove('error');
  error.classList.remove('visible');
}

function markSuccess(fieldId) {
  const field = $(fieldId);
  field.classList.remove('error');
  field.classList.add('success');
}

// ── Password visibility toggle ─────────────────────────────
const toggleBtn = $('toggle-password');
const passwordInput = $('password');
const eyeIcon = $('eye-icon');

const eyeOpen = `
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
  <circle cx="12" cy="12" r="3"/>`;

const eyeClosed = `
  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
  <line x1="1" y1="1" x2="23" y2="23"/>`;

toggleBtn.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  eyeIcon.innerHTML = isHidden ? eyeClosed : eyeOpen;
  toggleBtn.setAttribute('aria-label', isHidden ? 'Ocultar senha' : 'Mostrar senha');
  haptic('light');
});

// ── Inline validation ──────────────────────────────────────
$('email').addEventListener('blur', () => {
  const val = $('email').value;
  if (!val) return clearError('email', 'email-error');
  if (!isEmail(val)) {
    showError('email', 'email-error', 'Digite um e-mail válido.');
    haptic('light');
  } else {
    clearError('email', 'email-error');
    markSuccess('email');
  }
});
$('email').addEventListener('input', () => {
  if ($('email').classList.contains('error') && isEmail($('email').value)) {
    clearError('email', 'email-error');
    markSuccess('email');
  }
});

$('password').addEventListener('blur', () => {
  const val = $('password').value;
  if (!val) return clearError('password', 'password-error');
  if (val.length < 6) {
    showError('password', 'password-error', 'Mínimo de 6 caracteres.');
    haptic('light');
  } else {
    clearError('password', 'password-error');
    markSuccess('password');
  }
});
$('password').addEventListener('input', () => {
  if ($('password').classList.contains('error') && $('password').value.length >= 6) {
    clearError('password', 'password-error');
    markSuccess('password');
  }
});

// ── Ripple effect ──────────────────────────────────────────
function addRipple(btn, e) {
  btn.classList.remove('ripple');
  void btn.offsetWidth; // reflow
  const rect = btn.getBoundingClientRect();
  const style = btn.style;
  style.setProperty('--rx', `${e.clientX - rect.left}px`);
  style.setProperty('--ry', `${e.clientY - rect.top}px`);
  btn.classList.add('ripple');
}

$('btn-signin').addEventListener('click', (e) => addRipple($('btn-signin'), e));

// ── Form submit ────────────────────────────────────────────
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = $('email').value.trim();
  const password = $('password').value;
  let valid = true;

  if (!email) {
    showError('email', 'email-error', 'O e-mail é obrigatório.');
    valid = false;
  } else if (!isEmail(email)) {
    showError('email', 'email-error', 'Digite um e-mail válido.');
    valid = false;
  }

  if (!password) {
    showError('password', 'password-error', 'A senha é obrigatória.');
    valid = false;
  } else if (password.length < 6) {
    showError('password', 'password-error', 'Mínimo de 6 caracteres.');
    valid = false;
  }

  if (!valid) { haptic('error'); return; }

  const prev = typeof FTSession !== 'undefined' ? FTSession.parseUser() : null;
  if (prev && prev.email === email && prev.passwordDemo && password !== prev.passwordDemo) {
    showError('password', 'password-error', 'Senha incorreta.');
    haptic('error');
    return;
  }

  // Loading state
  const btn = $('btn-signin');
  btn.classList.add('loading');
  btn.disabled = true;
  haptic('medium');

  await new Promise((res) => setTimeout(res, 900));

  const dest = FTSession.completeLogin(email, { passwordDemo: password });
  btn.classList.remove('loading');
  btn.disabled = false;
  btn.querySelector('.btn-text').textContent = 'Bem-vindo! ✓';
  haptic('medium');
  window.location.href = dest.href;
});

// ── Google button ──────────────────────────────────────────
$('btn-google').addEventListener('click', () => {
  haptic('light');
  const email = $('email').value.trim();
  if (!isEmail(email)) {
    showError('email', 'email-error', 'Informe um e-mail válido para continuar.');
    haptic('error');
    return;
  }
  clearError('email', 'email-error');
  markSuccess('email');
  const dest = FTSession.completeLogin(email, { google: true });
  window.location.href = dest.href;
});

// ── Biometric hint ─────────────────────────────────────────
document.querySelector('.biometric-hint')?.addEventListener('click', () => {
  haptic('medium');
  // TODO: trigger WebAuthn / platform biometric
});

// ── Links ──────────────────────────────────────────────────
$('forgot-link').addEventListener('click', (e) => {
  e.preventDefault();
  haptic('light');
  alert('Redefinição de senha — em breve!');
});

// ── Dynamic Island pulse on focus ──────────────────────────
document.querySelectorAll('.field-input').forEach((input) => {
  input.addEventListener('focus', () => {
    const di = document.querySelector('.dynamic-island');
    if (!di) return;
    di.style.width = '200px';
    di.style.borderRadius = '26px';
  });
  input.addEventListener('blur', () => {
    const di = document.querySelector('.dynamic-island');
    if (!di) return;
    di.style.width = '';
    di.style.borderRadius = '';
  });
});
