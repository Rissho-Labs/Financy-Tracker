/**
 * Retorno do redirect Google + delegação ao FTAuth.
 */
(function (global) {
  'use strict';

  async function handleRedirectOnLoad() {
    if (!global.FTFirebase || !FTFirebase.isReady()) return;
    if (!global.FTAuth) return;
    try {
      const result = await FTFirebase.handleGoogleRedirectResult();
      if (!result || !result.user) return;
      sessionStorage.removeItem('ft_google_redirect_pending');
      const dest = await FTAuth.routeAfterGoogleSignIn(result);
      global.location.replace(dest.href);
    } catch (err) {
      sessionStorage.removeItem('ft_google_redirect_pending');
      console.warn('[FTGoogleAuth] redirect', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleRedirectOnLoad);
  } else {
    handleRedirectOnLoad();
  }
})(typeof window !== 'undefined' ? window : globalThis);
