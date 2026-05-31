/* ──────────────────────────────────────────────────────────────
   Finance Tracker — Interaction Logic
   Form validation · Toggle password · Haptics · Ripple
   ────────────────────────────────────────────────────────────── */

'use strict';

(function indexBoot() {
  async function boot() {
    // Não auto-dispara biometria se o usuário acabou de fazer logout manualmente
    const justLoggedOut = sessionStorage.getItem('ft_just_logged_out') === '1';
    if (justLoggedOut) {
      sessionStorage.removeItem('ft_just_logged_out');
    }

    if (typeof FTAuth !== 'undefined') {
      if (!justLoggedOut && FTAuth.tryBiometricOnLaunch) {
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

const authContainer = () => $('auth-container');

function showAuthStep2() {
  const el = authContainer();
  if (el) {
    el.classList.add('show-step-2');
    el.setAttribute('data-step', '2');
  }
  const s1 = document.querySelector('.step-1');
  const s2 = document.querySelector('.step-2');
  if (s1) s1.setAttribute('aria-hidden', 'true');
  if (s2) s2.setAttribute('aria-hidden', 'false');
}

function showAuthStep1() {
  const el = authContainer();
  if (el) {
    el.classList.remove('show-step-2');
    el.setAttribute('data-step', '1');
  }
  const s1 = document.querySelector('.step-1');
  const s2 = document.querySelector('.step-2');
  if (s1) s1.setAttribute('aria-hidden', 'false');
  if (s2) s2.setAttribute('aria-hidden', 'true');
}

function isOnAuthStep2() {
  return authContainer()?.classList.contains('show-step-2');
}

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
        'Este e-mail já tem senha. Continue e digite a senha abaixo para vincular o Google.'
      );
      const btnText = $('btn-signin')?.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Vincular e entrar';
    }
  } catch (e) {}
})();

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
  if (window._ftForgotPasswordOpen) return;

  // Pergunta sobre biometria SOMENTE se o usuário fez logout antes
  // (flag ft_bio_ask_on_login é setado apenas no logout)
  const askBio = localStorage.getItem('ft_bio_ask_on_login') === '1';

  if (askBio && typeof FTAuth !== 'undefined') {
    try {
      const isNativeApp = !!(window.Capacitor?.isNativePlatform?.());
      const hasPending   = !!(FTAuth.getBiometricPending?.());
      if (isNativeApp && hasPending && FTAuth.isBiometricAvailableOnDevice) {
        const available = await FTAuth.isBiometricAvailableOnDevice();
        if (available) {
          localStorage.removeItem('ft_bio_ask_on_login');
          if (typeof FTAuth !== 'undefined' && FTAuth.recordLastLogin && email) {
            await FTAuth.recordLastLogin(email);
          }
          window.location.href = FTRoutes.biometric + '?from=login';
          return;
        }
      }
    } catch (e) { /* ignora erros de detecção */ }
    // Se não conseguiu verificar biometria, limpa o flag para não ficar preso
    localStorage.removeItem('ft_bio_ask_on_login');
  }

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

if (toggleBtn && passwordInput && eyeIcon) {
  toggleBtn.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    eyeIcon.innerHTML = isHidden ? eyeClosed : eyeOpen;
    toggleBtn.setAttribute('aria-label', isHidden ? 'Ocultar senha' : 'Mostrar senha');
    haptic('light');
  });
}

// ── E-mail: validação e step 1 → 2 ───────────────────────
const emailInput = $('email');
if (emailInput) {
  emailInput.addEventListener('blur', () => {
    const val = emailInput.value.trim();
    if (!val) return clearError('email', 'email-error');
    if (!isEmail(val)) {
      showError('email', 'email-error', 'Digite um e-mail válido.');
      haptic('light');
    } else {
      clearError('email', 'email-error');
      markSuccess('email');
    }
  });
  emailInput.addEventListener('input', () => {
    if (emailInput.classList.contains('error') && isEmail(emailInput.value)) {
      clearError('email', 'email-error');
      markSuccess('email');
    }
  });
  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      $('btn-continue-email')?.click();
    }
  });
}

function goToPasswordStep() {
  const mail = ($('email')?.value || '').trim();
  if (!mail) {
    showError('email', 'email-error', 'O e-mail é obrigatório.');
    haptic('error');
    return false;
  }
  if (!isEmail(mail)) {
    showError('email', 'email-error', 'Digite um e-mail válido.');
    haptic('error');
    return false;
  }
  const display = $('user-email-display');
  if (display) display.textContent = mail;
  clearError('email', 'email-error');
  markSuccess('email');
  showAuthStep2();
  haptic('medium');
  setTimeout(() => $('password')?.focus(), 320);
  return true;
}

$('btn-continue-email')?.addEventListener('click', () => {
  goToPasswordStep();
});

$('btn-back-email')?.addEventListener('click', () => {
  haptic('light');
  showAuthStep1();
  setTimeout(() => $('email')?.focus(), 280);
});

const passwordEl = $('password');
if (passwordEl) {
  passwordEl.addEventListener('blur', () => {
    const val = passwordEl.value;
    if (!val) return clearError('password', 'password-error');
    if (val.length < 6) {
      showError('password', 'password-error', 'Mínimo de 6 caracteres.');
      haptic('light');
    } else {
      clearError('password', 'password-error');
      markSuccess('password');
    }
  });
  passwordEl.addEventListener('input', () => {
    if (passwordEl.classList.contains('error') && passwordEl.value.length >= 6) {
      clearError('password', 'password-error');
      markSuccess('password');
    }
  });
}

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

$('btn-signin')?.addEventListener('click', (e) => addRipple($('btn-signin'), e));
$('btn-continue-email')?.addEventListener('click', (e) => addRipple($('btn-continue-email'), e));

// ── Form submit ────────────────────────────────────────────
$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!isOnAuthStep2()) {
    goToPasswordStep();
    return;
  }

  const email = ($('email')?.value || '').trim();
  const password = $('password').value;
  let valid = true;

  if (!email) {
    showAuthStep1();
    showError('email', 'email-error', 'O e-mail é obrigatório.');
    valid = false;
  } else if (!isEmail(email)) {
    showAuthStep1();
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
        // Prepara dados de biometria para oferecer setup logo após o login
        if (typeof FTAuth !== 'undefined' && FTAuth.stageBiometricSetup) {
          FTAuth.stageBiometricSetup(email, password, 'password');
        }
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
      // Prepara dados de biometria para setup Google
      const gEmail = String(result.user.email || '').trim();
      if (gEmail && typeof FTAuth !== 'undefined' && FTAuth.stageBiometricSetup) {
        FTAuth.stageBiometricSetup(gEmail, '', 'google');
      }
      await goAfterLogin(dest, gEmail);
      return;
    }
  } catch (err) {
    sessionStorage.removeItem('ft_google_redirect_pending');
    console.error('[Google login]', err && err.code, err && err.message, err);
    const code = err && err.code ? String(err.code) : '';
    if (code === 'auth/account-exists-with-different-credential' && FTAuth.handleGoogleAccountExists) {
      const info = FTAuth.handleGoogleAccountExists(err);
      if (info.email && $('email')) {
        $('email').value = info.email;
      }
      showGoogleError(
        info.message || 'Digite sua senha e toque em Vincular e entrar.'
      );
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

// ── Forgot-password modal (fluxo OTP) ──────────────────────
(function initForgotPassword() {
  const overlay    = $('forgot-overlay');
  if (!overlay) return;

  const sheet      = $('forgot-sheet');
  const steps      = {
    email: $('fp-step-email'),
    code:  $('fp-step-code'),
    newpw: $('fp-step-newpw'),
    done:  $('fp-step-done'),
  };

  // Inputs passo 1
  const fpEmail    = $('fp-email');
  const fpEmailErr = $('fp-email-error');
  const btnSend    = $('fp-btn-send');
  const btnCancel  = $('fp-btn-cancel');

  // Inputs passo 2
  const otpDigits  = Array.from(document.querySelectorAll('.fp-otp-digit'));
  const fpCodeDest = $('fp-code-dest');
  const fpCodeErr  = $('fp-code-error');
  const btnVerify  = $('fp-btn-verify');
  const btnResend  = $('fp-btn-resend');
  const btnBack1   = $('fp-btn-back1');

  // Inputs passo 3
  const fpNewpw    = $('fp-newpw');
  const fpConfirm  = $('fp-confirmpw');
  const fpPwErr    = $('fp-pw-error');
  const btnSave    = $('fp-btn-save');
  const btnBack2   = $('fp-btn-back2');

  // Passo 4
  const btnOk      = $('fp-btn-ok');

  // Estado interno
  let currentEmail = '';
  let verifiedCode = '';

  // ── Utilitários ──────────────────────────────────────────

  function showStep(name) {
    Object.entries(steps).forEach(([k, el]) => {
      el.classList.toggle('fp-step--hidden', k !== name);
    });
  }

  function openSheet(prefillEmail) {
    window._ftForgotPasswordOpen = true;   // bloqueia redirects de auth durante o fluxo
    showStep('email');
    currentEmail = '';
    verifiedCode = '';
    fpEmail.value = prefillEmail || '';
    clearError(fpEmail, fpEmailErr);
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('fp-open');
    setTimeout(() => fpEmail.focus(), 380);
  }

  function closeSheet() {
    window._ftForgotPasswordOpen = false;
    overlay.classList.remove('fp-open');
    overlay.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      showStep('email');
      resetBtn(btnSend);
      resetBtn(btnVerify);
      resetBtn(btnSave);
      fpEmail.value = '';
      fpNewpw.value = '';
      fpConfirm.value = '';
      otpDigits.forEach(d => { d.value = ''; d.classList.remove('filled'); });
      clearError(fpEmail, fpEmailErr);
      clearError(null, fpCodeErr);
      clearError(null, fpPwErr);
    }, 380);
  }

  function showErr(input, errEl, msg) {
    if (errEl) { errEl.textContent = msg; errEl.style.opacity = '1'; }
    if (input) input.classList.add('error');
  }

  function clearError(input, errEl) {
    if (errEl) { errEl.textContent = ''; errEl.style.opacity = '0'; }
    if (input) input.classList.remove('error');
  }

  function setLoading(btn, yes) {
    btn.classList.toggle('loading', yes);
    btn.disabled = yes;
  }

  function resetBtn(btn) {
    btn.classList.remove('loading');
    btn.disabled = false;
  }

  function getOtpValue() {
    return otpDigits.map(d => d.value.trim()).join('');
  }

  // ── EmailJS (envia código por e-mail) ────────────────────

  async function sendCodeEmail(email, code) {
    const cfg = window.FTFIREBASE_CONFIG || {};
    const { emailjsServiceId, emailjsTemplateId, emailjsPublicKey } = cfg;

    if (!emailjsServiceId || !emailjsTemplateId || !emailjsPublicKey) {
      // Modo dev: código no console para testar sem EmailJS
      console.info(
        `[FP-DEV] Código para ${email}: %c${code}`,
        'font-size:22px;font-weight:bold;color:#6C63FF'
      );
      return;
    }

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:      emailjsServiceId,
        template_id:     emailjsTemplateId,
        user_id:         emailjsPublicKey,
        template_params: {
          to_email: email,
          code,
          app_name: 'Finance Tracker',
          expiry:   '10 minutos',
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('[FP] EmailJS error:', text);
      throw new Error('emailjs_failed');
    }
  }

  // ── Passo 1: enviar código ───────────────────────────────

  async function handleSend() {
    const mail = fpEmail.value.trim();
    if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      showErr(fpEmail, fpEmailErr, 'Digite um e-mail válido.');
      haptic('error');
      return;
    }
    clearError(fpEmail, fpEmailErr);
    setLoading(btnSend, true);
    haptic('medium');

    try {
      if (typeof FTFirebase === 'undefined' || !FTFirebase.generateOtpCode) {
        throw new Error('firebase_not_ready');
      }
      const code = await FTFirebase.generateOtpCode(mail);
      await sendCodeEmail(mail, code);

      currentEmail = mail;
      fpCodeDest.textContent = mail;
      otpDigits.forEach(d => { d.value = ''; d.classList.remove('filled'); });
      clearError(null, fpCodeErr);
      showStep('code');
      haptic('medium');
      setTimeout(() => otpDigits[0].focus(), 300);
    } catch (err) {
      const code = err && err.code ? String(err.code) : '';
      let msg = 'Não foi possível enviar. Tente novamente.';
      if (code === 'auth/user-not-found' || err.message === 'email_not_found') {
        msg = 'E-mail não encontrado. Verifique e tente de novo.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Muitas tentativas. Aguarde alguns minutos.';
      } else if (err.message === 'firebase_not_ready') {
        msg = 'Firebase não iniciado. Reabra o app e tente.';
      } else if (err.message === 'emailjs_failed') {
        msg = 'Não foi possível enviar o e-mail. Verifique o EmailJS no firebase-config.js.';
      }
      showErr(fpEmail, fpEmailErr, msg);
      haptic('error');
    } finally {
      resetBtn(btnSend);
    }
  }

  // ── Passo 2: verificar código ────────────────────────────

  function handleVerify() {
    const otp = getOtpValue();
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      showErr(null, fpCodeErr, 'Digite todos os 6 dígitos do código.');
      haptic('error');
      otpDigits[0].focus();
      return;
    }
    clearError(null, fpCodeErr);
    verifiedCode = otp;
    fpNewpw.value = '';
    fpConfirm.value = '';
    clearError(null, fpPwErr);
    showStep('newpw');
    haptic('medium');
    setTimeout(() => fpNewpw.focus(), 300);
  }

  // ── Passo 3: salvar nova senha ───────────────────────────

  async function handleSave() {
    const pw1 = fpNewpw.value;
    const pw2 = fpConfirm.value;

    if (!pw1 || pw1.length < 6) {
      showErr(fpNewpw, fpPwErr, 'A senha precisa ter pelo menos 6 caracteres.');
      haptic('error');
      return;
    }
    if (pw1 !== pw2) {
      showErr(fpConfirm, fpPwErr, 'As senhas não coincidem.');
      haptic('error');
      return;
    }
    clearError(fpNewpw, fpPwErr);
    clearError(fpConfirm, null);
    setLoading(btnSave, true);
    haptic('medium');

    try {
      if (typeof FTFirebase === 'undefined' || !FTFirebase.callApplyPasswordReset) {
        throw new Error('firebase_not_ready');
      }
      await FTFirebase.callApplyPasswordReset(currentEmail, verifiedCode, pw1);
      showStep('done');
      haptic('success');
    } catch (err) {
      const errCode = err && err.code ? String(err.code) : '';
      const msg2    = err && err.message ? String(err.message) : '';
      console.warn('[FP] applyPasswordReset error', errCode, msg2);

      // Só usa fallback se a função realmente não existe
      if (errCode === 'functions/not-found' || msg2 === 'firebase_not_ready') {
        await handleFallbackResetLink();
        return;
      }

      let msg = 'Não foi possível alterar a senha. Tente novamente.';
      if (msg2.includes('code_invalid'))        msg = 'Código incorreto. Volte e verifique o e-mail.';
      else if (msg2.includes('code_expired'))   msg = 'Código expirado (10 min). Solicite um novo.';
      else if (msg2.includes('code_used'))      msg = 'Código já utilizado. Solicite um novo.';
      else if (msg2.includes('code_not_found')) msg = 'Código não encontrado. Solicite um novo.';
      else if (msg2.includes('weak_password'))  msg = 'Senha muito fraca (mínimo 6 caracteres).';
      else if (msg2.includes('user_not_found')) msg = 'E-mail não encontrado no sistema.';
      showErr(null, fpPwErr, msg);
      haptic('error');
    } finally {
      resetBtn(btnSave);
    }
  }

  async function handleFallbackResetLink() {
    // Sem Cloud Function: envia link de redefinição padrão do Firebase
    try {
      if (FTFirebase.sendResetEmail) await FTFirebase.sendResetEmail(currentEmail);
    } catch (_) { /* ignora — link pode já ter sido enviado antes */ }
    // Vai para tela de sucesso com mensagem adaptada
    $('fp-step-done').querySelector('.fp-title').textContent = 'Código confirmado!';
    $('fp-step-done').querySelector('.fp-desc').textContent =
      'Enviamos um link para ' + currentEmail + '. Clique nele para criar a nova senha.';
    showStep('done');
    haptic('medium');
    resetBtn(btnSave);
  }

  // ── OTP: auto-avançar entre caixas ──────────────────────

  otpDigits.forEach((input, i) => {
    input.addEventListener('input', () => {
      const v = input.value.replace(/\D/g, '');
      input.value = v ? v[0] : '';
      input.classList.toggle('filled', !!input.value);
      if (input.value && i < otpDigits.length - 1) {
        otpDigits[i + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) {
        otpDigits[i - 1].focus();
        otpDigits[i - 1].value = '';
        otpDigits[i - 1].classList.remove('filled');
      }
      if (e.key === 'Enter') { e.preventDefault(); btnVerify.click(); }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      pasted.split('').slice(0, 6).forEach((ch, idx) => {
        if (otpDigits[idx]) {
          otpDigits[idx].value = ch;
          otpDigits[idx].classList.add('filled');
        }
      });
      const nextEmpty = otpDigits.findIndex(d => !d.value);
      (otpDigits[nextEmpty] || otpDigits[5]).focus();
    });
  });

  // ── Eventos ─────────────────────────────────────────────

  $('forgot-link').addEventListener('click', (e) => {
    e.preventDefault();
    haptic('light');
    openSheet(($('email')?.value || '').trim());
  });

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSheet(); });

  btnCancel.addEventListener('click', () => { haptic('light'); closeSheet(); });
  btnOk.addEventListener('click',     () => { haptic('light'); closeSheet(); });
  btnBack1.addEventListener('click',  () => { haptic('light'); showStep('email'); });
  btnBack2.addEventListener('click',  () => { haptic('light'); showStep('code'); });

  btnResend.addEventListener('click', async () => {
    haptic('light');
    showStep('email');
    setTimeout(() => btnSend.click(), 100);
  });

  btnSend.addEventListener('click',   () => handleSend());
  btnVerify.addEventListener('click', () => handleVerify());
  btnSave.addEventListener('click',   () => handleSave());

  fpEmail.addEventListener('keydown',   (e) => { if (e.key === 'Enter') { e.preventDefault(); btnSend.click(); } });
  fpNewpw.addEventListener('keydown',   (e) => { if (e.key === 'Enter') { e.preventDefault(); fpConfirm.focus(); } });
  fpConfirm.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); btnSave.click(); } });

  // Olhinho das senhas
  document.querySelectorAll('.field-eye[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Esconder senha' : 'Mostrar senha');
    });
  });
})();

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
