(function () {
  'use strict';

  if (typeof FTSession !== 'undefined' && FTSession.isLoggedIn() && FTSession.isOnboardingDone()) {
    window.location.replace('home.html');
    return;
  }

const $ = (id) => document.getElementById(id);
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
function haptic(t='light') { if(navigator.vibrate){const p={light:[8],medium:[18],error:[20,50,20]};navigator.vibrate(p[t]||[8]);} }

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

// Username availability (simulated)
let usernameTimer;
$('username').addEventListener('input', () => {
  clearTimeout(usernameTimer);
  const status = $('username-status');
  const val = $('username').value.trim();
  status.className = 'field-status';
  if(val.length < 3) return;
  usernameTimer = setTimeout(() => {
    const taken = ['admin','root','finance','tracker','test'].includes(val.toLowerCase());
    status.innerHTML = taken
      ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
      : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    status.className = 'field-status ' + (taken ? 'taken' : 'available');
    if(taken) {
      $('username-error').textContent = 'Nome já em uso.';
      $('username-error').classList.add('visible');
      $('username').classList.add('error');
    } else {
      $('username-error').textContent = '';
      $('username-error').classList.remove('visible');
      $('username').classList.remove('error');
      $('username').classList.add('success');
    }
  }, 600);
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
$('reg-email').addEventListener('blur',()=>{
  const v=$('reg-email').value;
  if(!v) showErr('reg-email','reg-email-error','E-mail é obrigatório.');
  else if(!isEmail(v)) showErr('reg-email','reg-email-error','E-mail inválido.');
  else { clearErr('reg-email','reg-email-error'); markOk('reg-email'); }
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
  if(pw.length<8)                                 { showErr('reg-password','reg-password-error','Mínimo 8 caracteres.'); valid=false; }
  if(pw!==cpw)                                    { showErr('confirm-password','confirm-error','Senhas não coincidem.'); valid=false; }
  if(!terms)                                      { $('terms-error').textContent='Aceite os termos.'; $('terms-error').classList.add('visible'); valid=false; }
  else                                            { $('terms-error').classList.remove('visible'); }

  if(!valid){ haptic('error'); return; }

  const btn = $('btn-register');
  btn.classList.add('loading'); btn.disabled=true;
  haptic('medium');

  await new Promise(r=>setTimeout(r,1500));

  // Save minimal profile to localStorage
  localStorage.setItem(
    'ft_user',
    JSON.stringify({ name, username: user, email, firstLogin: true, passwordDemo: pw, authProvider: 'password' })
  );

  // Redirect to onboarding
  window.location.href = 'onboarding.html';
});

// Google
$('btn-google-register')?.addEventListener('click', () => {
  haptic('light');
  const email = $('reg-email').value.trim();
  if (!isEmail(email)) {
    showErr('reg-email', 'reg-email-error', 'Informe um e-mail válido para continuar.');
    haptic('error');
    return;
  }
  clearErr('reg-email', 'reg-email-error');
  markOk('reg-email');
  const name =
    typeof FTSession !== 'undefined' && FTSession.defaultDisplayName
      ? FTSession.defaultDisplayName(email)
      : 'Utilizador';
  const username =
    typeof FTSession !== 'undefined' && FTSession.defaultUsername
      ? FTSession.defaultUsername(email)
      : 'user';
  localStorage.setItem(
    'ft_user',
    JSON.stringify({ name, username, email, firstLogin: true, authProvider: 'google' })
  );
  window.location.href = 'onboarding.html';
});

})();
