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

  function goAfterSetup() {
    const from = new URLSearchParams(window.location.search).get('from');
    if (from === 'logout') {
      // Veio do logout: faz logout e vai para login
      if (typeof FTSession !== 'undefined' && FTSession.logout) {
        FTSession.logout().then(() => window.location.replace('/index.html'))
                         .catch(()  => window.location.replace('/index.html'));
      } else {
        window.location.replace('/index.html');
      }
      return;
    }
    if (from === 'login') {
      // Veio do login normal: vai para home ou onboarding dependendo do estado
      const href = (typeof FTSession !== 'undefined' && FTSession.isOnboardingDone?.())
        ? '/pages/home.html'
        : '/pages/onboarding.html';
      window.location.replace(href);
      return;
    }
    goOnboarding();
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
    const from = new URLSearchParams(window.location.search).get('from');
    const fromLogin  = from === 'login';
    const fromLogout = from === 'logout';

    if (typeof FTSession === 'undefined' || !FTSession.isLoggedIn()) {
      window.location.replace('/index.html');
      return;
    }
    // Fluxos de login/logout: onboarding já feito, não redireciona para home antes de perguntar
    if (!fromLogin && !fromLogout && FTSession.isOnboardingDone?.()) {
      window.location.replace('/pages/home.html');
      return;
    }

    const pending =
      typeof FTAuth !== 'undefined' && FTAuth.getBiometricPending
        ? FTAuth.getBiometricPending()
        : null;

    if (!pending || !pending.email) {
      goAfterSetup();
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
      goAfterSetup();
      return;
    }

    // No fluxo de login, sempre mostra a pergunta — biometria pode ter sido re-ativada pelo recordLastLogin
    if (!fromLogin && !fromLogout && FTAuth.isBiometricEnabled && FTAuth.isBiometricEnabled()) {
      goAfterSetup();
      return;
    }

    const available =
      FTAuth.isBiometricAvailableOnDevice &&
      (await FTAuth.isBiometricAvailableOnDevice());
    if (!available) {
      if (FTAuth.clearBiometricPending) FTAuth.clearBiometricPending();
      goAfterSetup();
      return;
    }
  }

  async function skipBiometric() {
    if (typeof FTAuth !== 'undefined') {
      if (FTAuth.clearBiometricLogin) await FTAuth.clearBiometricLogin();
      else if (FTAuth.clearBiometricPending) FTAuth.clearBiometricPending();
    }
    haptic('light');
    goAfterSetup();
  }

  async function enableBiometric() {
    const pending = FTAuth.getBiometricPending();
    if (!pending) {
      goAfterSetup();
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
      goAfterSetup();
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
