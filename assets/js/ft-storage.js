/**
 * Sincroniza cache local com a versão atual do app.
 * Limpa dados efêmeros (gastos/cartões de sessão) quando o schema ou o build mudam,
 * evitando resquícios de demos ou estruturas antigas após atualizações.
 */
(function (global) {
  'use strict';

  /** Incremente quando o formato dos dados em cache mudar. */
  var SCHEMA_VERSION = 3;

  var KEY_SCHEMA = 'ft_storage_schema';
  var KEY_BUILD = 'ft_last_build';

  var EPHEMERAL_SESSION = [
    'ft_transactions',
    'ft_cards',
    'ft_app_session'
  ];

  var EPHEMERAL_LOCAL = [
    'ft_transactions',
    'ft_cards'
  ];

  function currentBuild() {
    try {
      return String(global.__FT_BUILD__ || 'dev');
    } catch (e) {
      return 'dev';
    }
  }

  function purgeEphemeral() {
    var i;
    try {
      for (i = 0; i < EPHEMERAL_SESSION.length; i++) {
        sessionStorage.removeItem(EPHEMERAL_SESSION[i]);
      }
    } catch (e) { /* ignore */ }
    try {
      for (i = 0; i < EPHEMERAL_LOCAL.length; i++) {
        localStorage.removeItem(EPHEMERAL_LOCAL[i]);
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * Compara schema/build salvos com os atuais; purga cache efêmero se desatualizado.
   * @returns {boolean} true se houve limpeza
   */
  function sync() {
    var storedSchema = '';
    var storedBuild = '';
    try {
      storedSchema = localStorage.getItem(KEY_SCHEMA) || '';
      storedBuild = localStorage.getItem(KEY_BUILD) || '';
    } catch (e) { /* ignore */ }

    var build = currentBuild();
    var changed =
      storedSchema !== String(SCHEMA_VERSION) ||
      storedBuild !== build;

    if (changed) {
      purgeEphemeral();
      try {
        localStorage.setItem(KEY_SCHEMA, String(SCHEMA_VERSION));
        localStorage.setItem(KEY_BUILD, build);
      } catch (e) { /* ignore */ }
    }

    return changed;
  }

  sync();

  global.FTStorage = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    sync: sync,
    purgeEphemeral: purgeEphemeral
  };
})(typeof window !== 'undefined' ? window : globalThis);
