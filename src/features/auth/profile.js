(function () {
  'use strict';

  if (typeof FTSession !== 'undefined') {
    if (!FTSession.isLoggedIn()) {
      window.location.replace(FTRoutes.login);
      return;
    }
    if (!FTSession.isOnboardingDone()) {
      window.location.replace(FTRoutes.onboarding);
      return;
    }
  }

  const $ = (id) => document.getElementById(id);
  const LOG_NS = '[Profile UI]';

  function logUiError(message, detail) {
    try {
      console.warn(LOG_NS, message, detail || '');
    } catch (e) {
      /* noop */
    }
  }

  window.addEventListener('error', (evt) => {
    logUiError('window.error', evt && evt.message ? evt.message : evt);
  });
  window.addEventListener('unhandledrejection', (evt) => {
    logUiError('unhandledrejection', evt && evt.reason ? evt.reason : evt);
  });
  function haptic(t = 'light') {
    if (navigator.vibrate) {
      const p = { light: [8], medium: [18], error: [20, 50, 20] };
      navigator.vibrate(p[t] || [8]);
    }
  }

  // Clock
  (function () {
    const el = $('status-clock');
    if (!el) return;
    const n = new Date();
    el.textContent = n.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  })();

  function loadProfile() {
    const user = typeof FTSession !== 'undefined' ? FTSession.parseUser() : null;
    if (!user) return;

    const emailEl = $('profile-email-display');
    if (emailEl && user.email) emailEl.textContent = user.email;

    if (!user.name && user.email && FTSession.defaultDisplayName) {
      user.name = FTSession.defaultDisplayName(user.email);
      FTSession.saveUser(user);
    }

    const displayName = user.name || 'Utilizador';
    const nameParts = displayName.split(' ').filter(Boolean);
    const nameEl = $('profile-name');
    if (nameEl && nameEl.textContent !== displayName) nameEl.textContent = displayName;

    const initials =
      nameParts.length > 1
        ? nameParts[0][0] + nameParts[nameParts.length - 1][0]
        : nameParts[0]
          ? nameParts[0][0]
          : '?';
    const initEl = $('profile-initials');
    const initialsUp = initials.toUpperCase();
    if (initEl && initEl.textContent !== initialsUp) initEl.textContent = initialsUp;

    let username = user.username ? user.username.toLowerCase() : '';
    if (!username && user.email && FTSession.defaultUsername) {
      username = FTSession.defaultUsername(user.email);
      user.username = username;
      FTSession.saveUser(user);
    }
    if (!username) username = 'utilizador';
    const userEl = $('profile-username');
    const userText = '@' + username;
    if (userEl && userEl.textContent !== userText) userEl.textContent = userText;

    let tag = user.tag;
    if (!tag) {
      tag = Math.floor(1000 + Math.random() * 9000).toString();
      user.tag = tag;
      FTSession.saveUser(user);
    }
    const tagEl = $('profile-discriminator');
    const tagText = '#' + tag;
    if (tagEl && tagEl.textContent !== tagText) tagEl.textContent = tagText;

    const photoUrl = user.photoURL || user.photoUrl || '';
    const imgEl = $('profile-avatar-img');
    if (imgEl) {
      if (photoUrl) {
        if (imgEl.src !== photoUrl) imgEl.src = photoUrl;
        imgEl.alt = displayName;
        imgEl.classList.remove('hidden');
        if (initEl) initEl.style.display = 'none';
      } else {
        imgEl.removeAttribute('src');
        imgEl.classList.add('hidden');
        if (initEl) initEl.style.display = '';
      }
    }
  }
  loadProfile();

  $('copy-tag-btn')?.addEventListener('click', async () => {
    haptic('medium');
    const tagWrap = $('copy-tag-btn');
    const u = $('profile-username').textContent;
    const t = $('profile-discriminator').textContent;
    const fullTag = u + t;

    try {
      await navigator.clipboard.writeText(fullTag);
      const originalBg = tagWrap.style.background;
      tagWrap.style.background = 'rgba(48, 209, 88, 0.2)';
      tagWrap.style.borderColor = 'rgba(48, 209, 88, 0.5)';

      const icon = tagWrap.querySelector('.tag-copy-icon');
      const origIcon = icon.innerHTML;
      icon.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#30D158" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';

      setTimeout(() => {
        tagWrap.style.background = originalBg;
        tagWrap.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        icon.innerHTML = origIcon;
      }, 1500);
    } catch (e) {
      console.log('Clipboard failed');
    }
  });

  $('share-link-btn')?.addEventListener('click', () => {
    haptic('light');
  });
  document.querySelectorAll('.req-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      haptic('medium');
      const li = this.closest('.request-item');
      li.style.transition = 'all 0.3s var(--ease-smooth)';
      li.style.transform = 'scale(0.95)';
      li.style.opacity = '0';
      setTimeout(() => li.remove(), 300);
    });
  });

  let lastFocusEl = null;

  function openPwModal() {
    const modal = $('pw-modal');
    if (!modal) return;
    lastFocusEl = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      $('pw-old')?.focus();
    }, 0);
  }

  function closePwModal() {
    const modal = $('pw-modal');
    if (!modal) return;
    if (lastFocusEl && typeof lastFocusEl.focus === 'function') {
      lastFocusEl.focus();
    }
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  $('btn-change-password')?.addEventListener('click', () => {
    haptic('light');
    openPwModal();
  });
  $('pw-cancel')?.addEventListener('click', () => {
    closePwModal();
  });
  $('pw-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'pw-modal') closePwModal();
  });
  $('pw-save')?.addEventListener('click', async () => {
    const user = FTSession.parseUser();
    if (!user) return;
    const oldPw = $('pw-old').value;
    const n1 = $('pw-new').value;
    const n2 = $('pw-new2').value;

    if (typeof FTSession !== 'undefined' && FTSession.usesFirebase && FTSession.usesFirebase()) {
      alert('Por segurança, altere a senha pelo fluxo “Esqueci a senha” (verificação por e-mail).');
      closePwModal();
      return;
    }

    if (user.passwordDemoHash) {
      const oldHash = await FTSession.hashDemoSecretStrong(oldPw);
      if (oldHash !== user.passwordDemoHash) {
        alert('Senha atual incorreta.');
        return;
      }
    }
    if (!n1 || n1.length < 6) {
      alert('Nova senha: mínimo 6 caracteres.');
      return;
    }
    if (n1 !== n2) {
      alert('Confirmação não coincide.');
      return;
    }
    user.passwordDemoHash = await FTSession.hashDemoSecretStrong(n1);
    delete user.passwordDemo;
    FTSession.saveUser(user);
    $('pw-old').value = '';
    $('pw-new').value = '';
    $('pw-new2').value = '';
    closePwModal();
    haptic('medium');
    alert('Senha atualizada (modo local).');
  });

  if (window.FTNotifications) FTNotifications.bind('#notification-btn');

  $('logout-btn')?.addEventListener('click', () => {
    haptic('medium');
    $('logout-btn').style.opacity = '0.5';
    const goLogin = () => { window.location.href = FTRoutes.login; };
    setTimeout(() => {
      if (typeof FTSession !== 'undefined' && FTSession.logout) {
        FTSession.logout().then(goLogin).catch(goLogin);
      } else if (typeof FTSession !== 'undefined') {
        FTSession.clearAll?.();
        goLogin();
      } else {
        goLogin();
      }
    }, 300);
  });

  document.querySelectorAll('.toggle-switch input').forEach((toggle) => {
    toggle.addEventListener('change', () => haptic('light'));
  });
})();
