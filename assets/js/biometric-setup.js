(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  function haptic(type) {
    if (navigator.vibrate) {
      const p = { light: [8], medium: [18], error: [20, 50, 20] };
      navigator.vibrate(p[type] || [8]);
    }
  }

  function showErr(msg) {
    const el = $('bio-setup-error');
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.hidden = false;
      el.classList.add('visible');
    } else {
      el.textContent = '';
      el.hidden = true;
      el.classList.remove('visible');
    }
  }

  function goOnboarding() {
    window.location.replace('/pages/onboarding.html');
  }

  (function clock() {
    const el = $('status-clock');
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  })();

  async function boot() {
    if (typeof FTSession === 'undefined' || !FTSession.isLoggedIn()) {
      window.location.replace('/index.html');
      return;
    }
    if (FTSession.isOnboardingDone()) {
      window.location.replace('/pages/home.html');
      return;
    }

    const pending =
      typeof FTAuth !== 'undefined' && FTAuth.getBiometricPending
        ? FTAuth.getBiometricPending()
        : null;

    if (!pending || !pending.email) {
      goOnboarding();
      return;
    }

    const emailEl = $('bio-account-email');
    if (emailEl) emailEl.textContent = pending.email;

    const isNative =
      typeof Capacitor !== 'undefined' &&
      Capacitor.isNativePlatform &&
      Capacitor.isNativePlatform();

    if (!isNative) {
      if (FTAuth.clearBiometricPending) FTAuth.clearBiometricPending();
      goOnboarding();
      return;
    }

    if (FTAuth.isBiometricEnabled && FTAuth.isBiometricEnabled()) {
      goOnboarding();
      return;
    }

    const available =
      FTAuth.isBiometricAvailableOnDevice &&
      (await FTAuth.isBiometricAvailableOnDevice());
    if (!available) {
      if (FTAuth.clearBiometricPending) FTAuth.clearBiometricPending();
      goOnboarding();
      return;
    }
  }

  async function skipBiometric() {
    if (typeof FTAuth !== 'undefined') {
      if (FTAuth.clearBiometricLogin) await FTAuth.clearBiometricLogin();
      else if (FTAuth.clearBiometricPending) FTAuth.clearBiometricPending();
    }
    haptic('light');
    goOnboarding();
  }

  async function enableBiometric() {
    const pending = FTAuth.getBiometricPending();
    if (!pending) {
      goOnboarding();
      return;
    }

    const btn = $('btn-bio-enable');
    btn.classList.add('loading');
    btn.disabled = true;
    $('btn-bio-skip').disabled = true;
    showErr('');
    haptic('medium');

    try {
      const ok = await FTAuth.saveBiometricLogin(
        pending.email,
        pending.secret,
        pending.provider
      );
      if (!ok) {
        showErr('Não foi possível ativar. Tente de novo ou use "Agora não".');
        haptic('error');
        return;
      }
      haptic('medium');
      goOnboarding();
    } catch (err) {
      const msg =
        err && err.code === 'bio/unavailable'
          ? 'Biometria indisponível neste aparelho.'
          : 'Ativação cancelada ou falhou. Você pode tentar de novo.';
      showErr(msg);
      haptic('error');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
      $('btn-bio-skip').disabled = false;
    }
  }

  $('btn-bio-enable')?.addEventListener('click', enableBiometric);
  $('btn-bio-skip')?.addEventListener('click', skipBiometric);

  boot();
})();
