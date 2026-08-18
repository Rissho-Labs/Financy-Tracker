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

  function applyAvatarPreview(photoUrl, displayName) {
    const imgEl = $('profile-avatar-img');
    const initEl = $('profile-initials');
    if (!imgEl) return;
    if (photoUrl) {
      imgEl.src = photoUrl;
      imgEl.alt = displayName || 'Foto de perfil';
      imgEl.classList.remove('hidden');
      if (initEl) initEl.style.display = 'none';
    } else {
      imgEl.removeAttribute('src');
      imgEl.classList.add('hidden');
      if (initEl) initEl.style.display = '';
    }
  }

  function fileToAvatarDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file || !String(file.type || '').startsWith('image/')) {
        reject(new Error('invalid_image'));
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const max = 512;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (!w || !h) throw new Error('image_size');
          if (w > max || h > max) {
            const scale = Math.min(max / w, max / h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('canvas');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('image_load'));
      };
      img.src = url;
    });
  }

  function openAvatarPicker() {
    haptic('light');
    const input = $('avatar-file-input');
    if (!input) return;
    input.value = '';
    input.click();
  }

  async function persistAvatar(dataUrl) {
    const user = typeof FTSession !== 'undefined' ? FTSession.parseUser() : null;
    if (!user) return;

    applyAvatarPreview(dataUrl, user.name);
    user.photoURL = dataUrl;
    user.photoUrl = dataUrl;
    FTSession.saveUser(user);

    const avatarEl = $('profile-avatar');
    if (avatarEl) avatarEl.classList.add('is-uploading');

    try {
      const uid = user.uid;
      const fb = typeof FTFirebase !== 'undefined' ? FTFirebase : null;
      if (uid && fb && typeof fb.uploadAvatarPhoto === 'function' && fb.isReady && fb.isReady()) {
        const remoteUrl = await fb.uploadAvatarPhoto(uid, dataUrl);
        if (typeof fb.updateAuthPhotoURL === 'function') {
          try {
            await fb.updateAuthPhotoURL(remoteUrl);
          } catch (authErr) {
            logUiError('updateAuthPhotoURL', authErr);
          }
        }
        try {
          await fb.saveUserProfile(uid, { photoURL: remoteUrl });
        } catch (profileErr) {
          logUiError('saveUserProfile photo', profileErr);
        }
        user.photoURL = remoteUrl;
        user.photoUrl = remoteUrl;
        FTSession.saveUser(user);
        applyAvatarPreview(remoteUrl, user.name);
      }
    } catch (err) {
      logUiError('persistAvatar', err);
      // Mantém preview local (data URL) se o upload remoto falhar
    } finally {
      if (avatarEl) avatarEl.classList.remove('is-uploading');
    }
  }

  $('edit-avatar-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openAvatarPicker();
  });

  $('profile-avatar')?.addEventListener('click', () => openAvatarPicker());
  $('profile-avatar')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAvatarPicker();
    }
  });

  $('avatar-file-input')?.addEventListener('change', async (e) => {
    const input = e.target;
    const file = input && input.files && input.files[0];
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await persistAvatar(dataUrl);
      haptic('medium');
    } catch (err) {
      logUiError('avatar pick', err);
      haptic('error');
      alert('Não foi possível usar esta imagem. Tente outra foto.');
    } finally {
      if (input) input.value = '';
    }
  });

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

  $('share-link-btn')?.addEventListener('click', async () => {
    haptic('light');
    const btn = $('share-link-btn');
    const user = typeof FTSession !== 'undefined' ? FTSession.parseUser() : null;
    if (!user) return;

    if (!user.tag) {
      user.tag = Math.floor(1000 + Math.random() * 9000).toString();
      FTSession.saveUser(user);
      const tagEl = $('profile-discriminator');
      if (tagEl) tagEl.textContent = '#' + user.tag;
    }
    if (!user.username && user.email && FTSession.defaultUsername) {
      user.username = FTSession.defaultUsername(user.email);
      FTSession.saveUser(user);
    }

    if (typeof FTQR === 'undefined' || typeof FTQR.shareProfile !== 'function') {
      return;
    }

    try {
      if (btn) btn.disabled = true;
      const result = await FTQR.shareProfile(user);
      if (result && result.copied && btn) {
        const label = btn.querySelector('span');
        const prev = label ? label.textContent : '';
        if (label) label.textContent = 'Link copiado';
        setTimeout(() => {
          if (label) label.textContent = prev || 'Compartilhar';
        }, 1600);
      }
    } catch (e) {
      console.log('Share failed', e && e.message);
    } finally {
      if (btn) btn.disabled = false;
    }
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
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (window.FTSheet) {
      FTSheet.open(modal);
    } else {
      modal.classList.add('ft-sheet--open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function closePwModal() {
    const modal = $('pw-modal');
    if (!modal) return;
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (window.FTSheet) {
      FTSheet.close(modal);
    } else {
      modal.classList.remove('ft-sheet--open', 'open');
      modal.setAttribute('aria-hidden', 'true');
    }
    if (lastFocusEl && typeof lastFocusEl.focus === 'function') {
      const tag = String(lastFocusEl.tagName || '').toLowerCase();
      if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
        lastFocusEl.focus();
      }
    }
  }

  if (window.FTSheet && $('pw-modal')) {
    FTSheet.register($('pw-modal'), {
      onClose: function () {
        if (lastFocusEl && typeof lastFocusEl.focus === 'function') {
          const tag = String(lastFocusEl.tagName || '').toLowerCase();
          if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
            lastFocusEl.focus();
          }
        }
      },
    });
  }

  $('btn-change-password')?.addEventListener('click', () => {
    haptic('light');
    openPwModal();
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
