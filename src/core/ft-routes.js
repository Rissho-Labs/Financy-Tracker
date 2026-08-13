/**
 * Rotas absolutas da aplicação (Feature-Sliced Design)
 * @author Rickson.Hirata
 */
(function (global) {
  'use strict';

  global.FTRoutes = {
    login: '/index.html',
    home: '/features/transactions/home.html',
    gastos: '/features/transactions/gastos.html',
    history: '/features/transactions/history.html',
    cards: '/features/cards/cards.html',
    goals: '/features/goals/goals.html',
    onboarding: '/features/auth/onboarding.html',
    register: '/features/auth/register.html',
    profile: '/features/auth/profile.html',
    invite: '/features/auth/invite.html',
    biometric: '/features/biometrics/biometric-setup.html',
    resetPassword: '/features/auth/reset-password.html',
    resetSenha: '/features/auth/reset-senha.html',
    verificarEmail: '/features/auth/verificar-email.html',
  };
})(typeof window !== 'undefined' ? window : globalThis);
