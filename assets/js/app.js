/* ──────────────────────────────────────────────────────────────
   Finance Tracker — Interaction Logic
   Form validation · Toggle password · Haptics · Ripple
   ────────────────────────────────────────────────────────────── */

'use strict';

(function indexBoot() {
  async function boot() {
    if (typeof FTAuth !== 'undefined') {
      if (FTAuth.tryBiometricOnLaunch) {
        const handled = await FTAuth.tryBiometricOnLaunch();
        if (handled) return;
      }
      if (FTAuth.lockLoginScreenWithoutBiometric) {
        await FTAuth.lockLoginScreenWithoutBiometric();
      }
    }
    /* Sem biometria: fica na tela de login (não redireciona por ft_user ou sessão Firebase). */
  }
  boot();
})();

// ── Helpers ──────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

(function applyEmailHint() {
  try {
    const hint = sessionStorage.getItem('ft_login_email_hint');
    if (hint && $('email')) {
      $('email').value = hint;
      sessionStorage.removeItem('ft_login_email_hint');
    }
    if (
      typeof FTAuth !== 'undefined' &&
      FTAuth.hasPendingGoogleLink &&
      FTAuth.hasPendingGoogleLink()
    ) {
      showGoogleError(
        'Este e-mail já tem senha. Digite a senha abaixo e toque em Entrar para vincular o Google.'
      );
      const btnText = $('btn-signin')?.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Vincular e entrar';
    }
  } catch (e) {}
})();
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function haptic(type = 'light') {
  if (navigator.vibrate) {
    const patterns = { light: [10], medium: [20], error: [20, 50, 20] };
    navigator.vibrate(patterns[type] || [10]);
  }
}

function showGoogleError(msg) {
  const el = $('google-error');
  if (!el) return;
  if (msg) {
    el.textContent = msg;
    el.classList.add('visible');
  } else {
    el.textContent = '';
    el.classList.remove('visible');
  }
}

function clearGoogleError() {
  showGoogleError('');
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

async function goAfterLogin(dest, email) {
  if (typeof FTAuth !== 'undefined' && FTAuth.recordLastLogin && email) {
    await FTAuth.recordLastLogin(email);
  }
  window.location.href = dest.href;
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
  void btn.offsetWidth;
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

  const email = $('email').value.trim();
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

  if (!valid) {
    haptic('error');
    return;
  }

  const btn = $('btn-signin');
  btn.classList.add('loading');
  btn.disabled = true;
  haptic('medium');

  try {
    let dest;
    if (typeof FTSession !== 'undefined' && FTSession.usesFirebase && FTSession.usesFirebase()) {
      if (FTAuth.hasPendingGoogleLink && FTAuth.hasPendingGoogleLink()) {
        dest = await FTAuth.linkPasswordWithPendingGoogle(email, password);
        FTAuth.clearPendingGoogleLink && FTAuth.clearPendingGoogleLink();
      } else {
        const cred = await globalThis.FTFirebase.signInEmailPassword(email, password);
        dest = await FTSession.completeLoginFromFirebase(cred.user);
      }
    } else {
      const prev = typeof FTSession !== 'undefined' ? FTSession.parseUser() : null;
      if (prev && prev.email === email && prev.passwordDemo && password !== prev.passwordDemo) {
        showError('password', 'password-error', 'Senha incorreta.');
        haptic('error');
        return;
      }
      await new Promise((res) => setTimeout(res, 900));
      dest = FTSession.completeLogin(email, { passwordDemo: password });
    }

    btn.querySelector('.btn-text').textContent = 'Bem-vindo! ✓';
    haptic('medium');
    await goAfterLogin(dest, email);
  } catch (err) {
    const msg =
      typeof FTAuth !== 'undefined' ? FTAuth.mapError(err) : 'Não foi possível entrar.';
    showError('password', 'password-error', msg);
    haptic('error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

// ── Google button ───────────────────────────────────────────
$('btn-google').addEventListener('click', async () => {
  haptic('light');
  const btn = $('btn-google');
  clearGoogleError();

  if (!(typeof FTSession !== 'undefined' && FTSession.usesFirebase && FTSession.usesFirebase())) {
    showGoogleError('Login com Google indisponível. Ative o provedor Google no Firebase.');
    haptic('error');
    return;
  }

  btn.disabled = true;
  btn.style.opacity = '0.7';
  try {
    sessionStorage.setItem('ft_google_redirect_pending', '1');
    const result = await FTAuth.startGoogleSignIn();
    if (result && result.user) {
      sessionStorage.removeItem('ft_google_redirect_pending');
      const dest = await FTAuth.routeAfterGoogleSignIn(result);
      haptic('medium');
      window.location.href = dest.href;
      return;
    }
  } catch (err) {
    sessionStorage.removeItem('ft_google_redirect_pending');
    console.error('[Google login]', err && err.code, err && err.message, err);
    const code = err && err.code ? String(err.code) : '';
    if (code === 'auth/account-exists-with-different-credential' && FTAuth.handleGoogleAccountExists) {
      const info = FTAuth.handleGoogleAccountExists(err);
      if ($('email') && info.email) $('email').value = info.email;
      showGoogleError(info.message || 'Digite sua senha e toque em Entrar para vincular o Google.');
      const btnText = $('btn-signin')?.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Vincular e entrar';
    } else {
      showGoogleError(FTAuth.mapError(err));
    }
    haptic('error');
  } finally {
    btn.disabled = false;
    btn.style.opacity = '';
  }
});

// ── Biometric hint (manual) ─────────────────────────────────
(function initBiometricHint() {
  const hint = document.querySelector('.biometric-hint');
  if (!hint) return;

  async function refreshHint() {
    if (typeof FTAuth === 'undefined' || !FTAuth.shouldOfferAutoBiometricOnLaunch) {
      hint.hidden = true;
      return;
    }
    hint.hidden = !(await FTAuth.shouldOfferAutoBiometricOnLaunch());
  }

  refreshHint();

  hint.addEventListener('click', async () => {
    haptic('medium');
    if (!(await FTAuth.shouldOfferAutoBiometricOnLaunch())) {
      showGoogleError('Biometria disponível só para a última conta que a ativou neste aparelho.');
      haptic('error');
      return;
    }
    const api = globalThis.__FT_NATIVE_BIOMETRIC__;
    if (!api || typeof api.tryNativeBiometricLogin !== 'function') return;

    const server = FTSession.BIOMETRIC_SERVER || 'com.financetracker.app';
    const r = await api.tryNativeBiometricLogin(server);
    if (!r || !r.ok) {
      haptic('error');
      return;
    }

    const email = String(r.email || '').trim();
    if (!isEmail(email)) {
      haptic('error');
      return;
    }

    try {
      const dest = await FTAuth.completeBiometricLogin(email, r.password);
      haptic('medium');
      await goAfterLogin(dest, email);
    } catch (err) {
      showGoogleError(FTAuth.mapError(err));
      haptic('error');
    }
  });
})();

// ── Links ──────────────────────────────────────────────────
$('forgot-link').addEventListener('click', (e) => {
  e.preventDefault();
  haptic('light');
  const email = $('email').value.trim();
  if (!isEmail(email)) {
    showError('email', 'email-error', 'Informe o e-mail da conta para abrir recuperação.');
    $('email').focus();
    return;
  }
  clearError('email', 'email-error');
  const recoveryUrl =
    'https://accounts.google.com/v3/signin/recoveryidentifier?Email=' +
    encodeURIComponent(email) +
    '&flowName=GlifWebSignIn&flowEntry=AccountRecovery';
  window.open(recoveryUrl, '_blank', 'noopener,noreferrer');
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
