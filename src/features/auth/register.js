(function () {
  'use strict';

  if (typeof FTSession !== 'undefined' && FTSession.isLoggedIn() && FTSession.isOnboardingDone()) {
    window.location.replace(FTRoutes.home);
    return;
  }

const $ = (id) => document.getElementById(id);
let isGoogleRegister = false;

(function initGoogleRegisterMode() {
  const params = new URLSearchParams(window.location.search || '');
  if (params.get('from') !== 'google') return;
  let pending = null;
  try {
    pending = JSON.parse(sessionStorage.getItem('ft_google_pending') || 'null');
  } catch (e) {}
  if (!pending || !pending.email) {
    window.location.replace(FTRoutes.login);
    return;
  }
  isGoogleRegister = true;
  const title = document.querySelector('.card-title');
  const sub = document.querySelector('.card-subtitle');
  if (title) title.textContent = 'Complete seu cadastro';
  if (sub) {
    sub.innerHTML =
      '<span class="dot">●</span> Conta Google — complete os dados. Opcional: crie uma senha para entrar com e-mail também.';
  }
  const em = $('reg-email');
  if (em) {
    em.value = pending.email;
    em.readOnly = true;
  }
  if (pending.name && $('full-name')) $('full-name').value = pending.name;
  const pw = $('register-password-section');
  if (pw) {
    pw.style.display = '';
    pw.classList.add('google-password-optional');
  }
  const regPw = $('reg-password');
  const confirmPw = $('confirm-password');
  if (regPw) {
    regPw.removeAttribute('required');
    regPw.placeholder = 'Opcional — para entrar com e-mail depois';
  }
  if (confirmPw) {
    confirmPw.removeAttribute('required');
    confirmPw.placeholder = 'Repita a senha (se criou acima)';
  }
  const gp = $('btn-google-register');
  if (gp) gp.style.display = 'none';
  const divider = document.querySelector('.divider');
  if (divider) divider.style.display = 'none';
  const btn = $('btn-register');
  if (btn && btn.querySelector('.btn-text')) btn.querySelector('.btn-text').textContent = 'Continuar';
})();
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const RESERVED_USERNAMES = new Set(['admin','root','finance','tracker','test','suporte','support','financy']);
let usernameAvailable = null;
let emailAvailable = null;
let usernameCheckGen = 0;
let emailCheckGen = 0;

function usesFirebaseRegister() {
  return typeof FTSession !== 'undefined' && FTSession.usesFirebase && FTSession.usesFirebase();
}

function getRegisterExceptUid() {
  if (!isGoogleRegister || !globalThis.FTFirebase) return null;
  const u = FTFirebase.getCurrentUser();
  return u && u.uid ? u.uid : null;
}

function haptic(t='light') { if(navigator.vibrate){const p={light:[8],medium:[18],error:[20,50,20]};navigator.vibrate(p[t]||[8]);} }

function setUsernameStatus(taken, checking) {
  const status = $('username-status');
  const val = $('username').value.trim();
  if (!status) return;
  status.className = 'field-status';
  if (checking) {
    status.innerHTML = '';
    status.className = 'field-status checking';
    return;
  }
  if (val.length < 3) return;
  status.innerHTML = taken
    ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
    : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  status.className = 'field-status ' + (taken ? 'taken' : 'available');
}

async function checkUsernameInDb(username) {
  const val = String(username || '').trim();
  const key = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (val.length < 3 || key.length < 3) {
    usernameAvailable = null;
    return null;
  }
  if (RESERVED_USERNAMES.has(key)) {
    usernameAvailable = false;
    return false;
  }
  if (!usesFirebaseRegister() || !globalThis.FTFirebase.isUsernameTaken) {
    usernameAvailable = true;
    return true;
  }
  const exceptUid = getRegisterExceptUid();
  const taken = await FTFirebase.isUsernameTaken(val, exceptUid);
  usernameAvailable = !taken;
  return usernameAvailable;
}

async function checkEmailInDb(email) {
  const val = String(email || '').trim();
  if (!isEmail(val)) {
    emailAvailable = null;
    return null;
  }
  if (isGoogleRegister) {
    emailAvailable = true;
    return true;
  }
  if (!usesFirebaseRegister() || !globalThis.FTFirebase.isEmailRegistered) {
    emailAvailable = true;
    return true;
  }
  const taken = await FTFirebase.isEmailRegistered(val, null);
  emailAvailable = !taken;
  return emailAvailable;
}

// Clock
(function(){const el=$('status-clock');if(!el)return;const n=new Date();el.textContent=n.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});})();

// Password toggles
function setupEyeToggle(inputId, btnId, iconId) {
  const inp = $(inputId), btn = $(btnId), icon = $(iconId);
  if(!btn) return;
  const open  = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  const closed = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
  btn.addEventListener('click',()=>{
    const hidden = inp.type==='password';
    inp.type = hidden ? 'text' : 'password';
    if(icon) icon.innerHTML = hidden ? closed : open;
    btn.setAttribute('aria-label', hidden ? 'Ocultar' : 'Mostrar');
    haptic('light');
  });
}
setupEyeToggle('reg-password','toggle-reg-password','eye-reg');
setupEyeToggle('confirm-password','toggle-confirm','eye-confirm');

// Password strength
function getStrength(pw) {
  let score = 0;
  if(pw.length >= 8) score++;
  if(/[A-Z]/.test(pw)) score++;
  if(/[0-9]/.test(pw)) score++;
  if(/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
const strengthLabels = ['', 'Fraca', 'Regular', 'Boa', 'Forte'];
const strengthClasses = ['', 'weak', 'fair', 'good', 'strong'];

$('reg-password').addEventListener('input', () => {
  const pw = $('reg-password').value;
  const score = pw ? getStrength(pw) : 0;
  const lbl = $('strength-label');
  for(let i=1;i<=4;i++){
    const bar = $(`sbar-${i}`);
    bar.className = 'strength-bar' + (i<=score ? ' '+strengthClasses[score] : '');
  }
  lbl.textContent = pw ? strengthLabels[score] : '';
  lbl.className = 'strength-label' + (pw ? ' '+strengthClasses[score] : '');
});

// Username availability (Firestore)
let usernameTimer;
$('username').addEventListener('input', () => {
  clearTimeout(usernameTimer);
  const val = $('username').value.trim();
  usernameAvailable = null;
  setUsernameStatus(false, false);
  if (val.length < 3) {
    clearErr('username', 'username-error');
    return;
  }
  const gen = ++usernameCheckGen;
  usernameTimer = setTimeout(async () => {
    setUsernameStatus(false, true);
    try {
      const ok = await checkUsernameInDb(val);
      if (gen !== usernameCheckGen) return;
      setUsernameStatus(!ok, false);
      if (!ok) {
        showErr('username', 'username-error', 'Este nome de usuário já está em uso.');
      } else {
        clearErr('username', 'username-error');
        markOk('username');
      }
    } catch (e) {
      if (gen !== usernameCheckGen) return;
      setUsernameStatus(false, false);
      console.warn('[register] username check', e);
    }
  }, 500);
});

$('username').addEventListener('blur', async () => {
  const val = $('username').value.trim();
  if (val.length < 3) {
    showErr('username', 'username-error', 'Mínimo 3 caracteres (letras, números ou _).');
    return;
  }
  const ok = await checkUsernameInDb(val);
  setUsernameStatus(!ok, false);
  if (!ok) showErr('username', 'username-error', 'Este nome de usuário já está em uso.');
  else { clearErr('username', 'username-error'); markOk('username'); }
});

// Inline validation helpers
function showErr(fieldId, errId, msg) {
  const f=$(fieldId), e=$(errId);
  if(!f||!e) return;
  f.classList.add('error'); f.classList.remove('success');
  e.textContent=msg; e.classList.add('visible');
  f.closest('.field-group')?.classList.add('shake');
  setTimeout(()=>f.closest('.field-group')?.classList.remove('shake'),420);
}
function clearErr(fieldId, errId) {
  const f=$(fieldId), e=$(errId);
  if(!f||!e) return;
  f.classList.remove('error'); e.classList.remove('visible');
}
function markOk(fieldId) { const f=$(fieldId); f?.classList.remove('error'); f?.classList.add('success'); }

// Blur validations
$('full-name').addEventListener('blur',()=>{
  const v=$('full-name').value.trim();
  if(!v) showErr('full-name','name-error','Nome é obrigatório.');
  else if(v.split(' ').length<2) showErr('full-name','name-error','Informe nome e sobrenome.');
  else { clearErr('full-name','name-error'); markOk('full-name'); }
});
let emailTimer;
$('reg-email').addEventListener('input', () => {
  if (isGoogleRegister) return;
  clearTimeout(emailTimer);
  emailAvailable = null;
  const v = $('reg-email').value.trim();
  if (!v || !isEmail(v)) return;
  const gen = ++emailCheckGen;
  emailTimer = setTimeout(async () => {
    try {
      const ok = await checkEmailInDb(v);
      if (gen !== emailCheckGen) return;
      if (!ok) showErr('reg-email', 'reg-email-error', 'Este e-mail já está cadastrado.');
      else { clearErr('reg-email', 'reg-email-error'); markOk('reg-email'); }
    } catch (e) {
      console.warn('[register] email check', e);
    }
  }, 500);
});

$('reg-email').addEventListener('blur', async () => {
  const v = $('reg-email').value.trim();
  if (!v) {
    showErr('reg-email', 'reg-email-error', 'E-mail é obrigatório.');
    return;
  }
  if (!isEmail(v)) {
    showErr('reg-email', 'reg-email-error', 'E-mail inválido.');
    return;
  }
  if (isGoogleRegister) {
    clearErr('reg-email', 'reg-email-error');
    markOk('reg-email');
    return;
  }
  const ok = await checkEmailInDb(v);
  if (!ok) showErr('reg-email', 'reg-email-error', 'Este e-mail já está cadastrado.');
  else { clearErr('reg-email', 'reg-email-error'); markOk('reg-email'); }
});
$('reg-password').addEventListener('blur',()=>{
  const v=$('reg-password').value;
  if(!v) showErr('reg-password','reg-password-error','Senha é obrigatória.');
  else if(v.length<8) showErr('reg-password','reg-password-error','Mínimo de 8 caracteres.');
  else { clearErr('reg-password','reg-password-error'); markOk('reg-password'); }
});
$('confirm-password').addEventListener('blur',()=>{
  const v=$('confirm-password').value;
  const pw=$('reg-password').value;
  if(!v) showErr('confirm-password','confirm-error','Confirme sua senha.');
  else if(v!==pw) showErr('confirm-password','confirm-error','Senhas não coincidem.');
  else { clearErr('confirm-password','confirm-error'); markOk('confirm-password'); }
});

// Submit
$('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('full-name').value.trim();
  const user = $('username').value.trim();
  const email = $('reg-email').value.trim();
  const pw = $('reg-password').value;
  const cpw = $('confirm-password').value;
  const terms = $('terms').checked;
  let valid = true;

  if(!name || name.split(' ').length<2)          { showErr('full-name','name-error','Nome completo obrigatório.'); valid=false; }
  if(!user || user.length<3)                      { showErr('username','username-error','Usuário inválido.'); valid=false; }
  if(!isEmail(email))                             { showErr('reg-email','reg-email-error','E-mail inválido.'); valid=false; }
  if (!isGoogleRegister) {
    if(pw.length<8)                                 { showErr('reg-password','reg-password-error','Mínimo 8 caracteres.'); valid=false; }
    if(pw!==cpw)                                    { showErr('confirm-password','confirm-error','Senhas não coincidem.'); valid=false; }
  } else if (pw || cpw) {
    if (pw.length < 8)                              { showErr('reg-password','reg-password-error','Senha: mínimo 8 caracteres.'); valid=false; }
    else if (pw !== cpw)                            { showErr('confirm-password','confirm-error','Senhas não coincidem.'); valid=false; }
  }
  if(!terms)                                      { $('terms-error').textContent='Aceite os termos.'; $('terms-error').classList.add('visible'); valid=false; }
  else                                            { $('terms-error').classList.remove('visible'); }

  if(!valid){ haptic('error'); return; }

  const btn = $('btn-register');
  btn.classList.add('loading'); btn.disabled=true;
  haptic('medium');

  try {
    if (usesFirebaseRegister()) {
      const exceptUid = getRegisterExceptUid();
      const userTaken = await FTFirebase.isUsernameTaken(user, exceptUid);
      if (userTaken) {
        showErr('username', 'username-error', 'Este nome de usuário já está em uso.');
        usernameAvailable = false;
        haptic('error');
        return;
      }
      if (!isGoogleRegister) {
        const emailTaken = await FTFirebase.isEmailRegistered(email, null);
        if (emailTaken) {
          showErr('reg-email', 'reg-email-error', 'Este e-mail já está cadastrado.');
          emailAvailable = false;
          haptic('error');
          return;
        }
      }
    }

    if (typeof FTSession !== 'undefined' && FTSession.usesFirebase && FTSession.usesFirebase()) {
      if (isGoogleRegister) {
        const fbUser = FTFirebase.getCurrentUser();
        if (!fbUser || !fbUser.uid) {
          showErr('reg-email', 'reg-email-error', 'Sessão Google expirada. Volte e entre com Google de novo.');
          return;
        }
        var authProvider = 'google';
        var authProviders = ['google'];
        var hasPassword = pw.length >= 8 && pw === cpw;
        await FTFirebase.saveUserProfile(fbUser.uid, {
          name,
          username: user,
          email,
          authProvider: hasPassword ? 'google+password' : authProvider,
          authProviders: hasPassword ? ['google', 'password'] : authProviders,
          registrationComplete: true,
          firstLogin: true,
          onboardingComplete: false,
        });
        if (hasPassword) {
          await FTFirebase.linkPasswordToCurrentUser(pw);
          authProvider = 'google+password';
          authProviders.push('password');
          try {
            await FTFirebase.saveUserProfile(fbUser.uid, {
              authProvider: authProvider,
              authProviders: authProviders,
            });
          } catch (syncErr) {
            console.warn('[register] profile sync after link', syncErr);
          }
        }
        sessionStorage.removeItem('ft_google_pending');
        await FTSession.completeLoginFromFirebase(fbUser, {
          name,
          username: user,
          registrationComplete: true,
          authProvider: authProvider,
          skipProfileLoad: true,
        });
        if (typeof FTAuth !== 'undefined' && FTAuth.stageBiometricSetup) {
          var bioSecret = pw.length >= 8 ? pw : FTAuth.BIOMETRIC_UNLOCK;
          var bioProvider = pw.length >= 8 ? 'password' : 'google';
          FTAuth.stageBiometricSetup(email, bioSecret, bioProvider);
        }
      } else {
        const cred = await globalThis.FTFirebase.registerEmailPassword(email, pw, name);
        await globalThis.FTFirebase.saveUserProfile(cred.user.uid, {
          name,
          username: user,
          email,
          authProvider: 'password',
          authProviders: ['password'],
          registrationComplete: true,
          firstLogin: true,
          onboardingComplete: false,
        });
        await FTSession.completeLoginFromFirebase(cred.user, {
          name,
          username: user,
          registrationComplete: true,
          authProvider: 'password',
          skipProfileLoad: true,
        });
        if (typeof FTAuth !== 'undefined' && FTAuth.stageBiometricSetup) {
          FTAuth.stageBiometricSetup(email, pw, 'password');
        }
      }
    } else {
      await new Promise((r) => setTimeout(r, 1500));
      const demoHash =
        typeof FTSession.hashDemoSecretStrong === 'function'
          ? await FTSession.hashDemoSecretStrong(pw)
          : undefined;
      localStorage.setItem(
        'ft_user',
        JSON.stringify({
          name,
          username: user,
          email,
          firstLogin: true,
          passwordDemoHash: demoHash,
          authProvider: 'password',
        })
      );
    }
    var next =
      typeof FTAuth !== 'undefined' && FTAuth.getPostRegisterDestination
        ? FTAuth.getPostRegisterDestination()
        : FTRoutes.onboarding;
    window.location.href = next;
  } catch (err) {
    const code = err && err.code ? String(err.code) : '';
    const fbUser =
      globalThis.FTFirebase && typeof FTFirebase.getCurrentUser === 'function'
        ? FTFirebase.getCurrentUser()
        : null;
    if (
      code === 'permission-denied' &&
      fbUser &&
      fbUser.email &&
      typeof FTSession !== 'undefined' &&
      FTSession.completeLoginFromFirebase
    ) {
      try {
        await FTSession.completeLoginFromFirebase(fbUser, {
          name,
          username: user,
          email: fbUser.email,
          registrationComplete: true,
          authProvider: isGoogleRegister ? 'google' : 'password',
          skipProfileLoad: true,
        });
        sessionStorage.removeItem('ft_google_pending');
        if (typeof FTAuth !== 'undefined' && FTAuth.stageBiometricSetup) {
          const bioSecret = pw.length >= 8 ? pw : FTAuth.BIOMETRIC_UNLOCK;
          const bioProvider = pw.length >= 8 ? 'password' : isGoogleRegister ? 'google' : 'password';
          FTAuth.stageBiometricSetup(fbUser.email, bioSecret, bioProvider);
        }
        var nextFallback =
          typeof FTAuth !== 'undefined' && FTAuth.getPostRegisterDestination
            ? FTAuth.getPostRegisterDestination()
            : FTRoutes.onboarding;
        window.location.href = nextFallback;
        return;
      } catch (fallbackErr) {
        console.warn('[register] fallback after permission-denied', fallbackErr);
      }
    }
    const msg =
      globalThis.FTFirebase && typeof FTFirebase.mapAuthError === 'function'
        ? FTFirebase.mapAuthError(err)
        : 'Não foi possível criar a conta.';
    showErr('reg-email', 'reg-email-error', msg);
    haptic('error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

// Google (mesmo fluxo da tela de login)
$('btn-google-register')?.addEventListener('click', async () => {
  haptic('light');
  const btn = $('btn-google-register');
  if (!(typeof FTSession !== 'undefined' && FTSession.usesFirebase && FTSession.usesFirebase())) {
    showErr('reg-email', 'reg-email-error', 'Google indisponível.');
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
      window.location.href = dest.href;
      return;
    }
  } catch (err) {
    sessionStorage.removeItem('ft_google_redirect_pending');
    showErr('reg-email', 'reg-email-error', FTAuth.mapError(err));
    haptic('error');
  } finally {
    btn.disabled = false;
    btn.style.opacity = '';
  }
});

})();
