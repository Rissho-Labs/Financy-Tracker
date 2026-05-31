/**
 * Amizades — cache local + catálogo demo para busca
 * @author Rickson.Hirata
 */
(function (global) {
  'use strict';

  var KEY = 'ft_friends';

  /** Usuários disponíveis para adicionar (ainda não são amigos até addFriend). */
  var CATALOG = [
    {
      id: 'u_mari',
      name: 'Mariana Costa',
      username: 'mari',
      tag: '4321',
      bio: 'Divide despesas de viagem e restaurantes com o grupo.',
      sharedSplits: [
        {
          id: 'sp1',
          title: 'Churrasco de sábado',
          date: '2025-04-12',
          amountCents: 38500,
          participants: ['@ricardo', '@mari', '@joao'],
        },
        {
          id: 'sp2',
          title: 'Uber para o aeroporto',
          date: '2025-03-28',
          amountCents: 8900,
          participants: ['@ricardo', '@mari'],
        },
      ],
    },
    {
      id: 'u_joao',
      name: 'João Pedro Silva',
      username: 'joao',
      tag: '8821',
      bio: 'Prefere PIX na hora. Sempre fecha a conta no fim do mês.',
      sharedSplits: [
        {
          id: 'sp3',
          title: 'Assinatura streaming',
          date: '2025-05-01',
          amountCents: 5490,
          participants: ['@ricardo', '@joao', '@atariH2030'],
        },
      ],
    },
    {
      id: 'u_atari',
      name: 'Ricardo Atari',
      username: 'atariH2030',
      tag: '1456',
      bio: 'Organizo finanças em grupo e metas compartilhadas.',
      sharedSplits: [
        {
          id: 'sp4',
          title: 'Jantar Sushi',
          date: '2025-04-18',
          amountCents: 24000,
          participants: ['@ricardo', '@atariH2030', '@mari'],
        },
        {
          id: 'sp5',
          title: 'Presente coletivo',
          date: '2025-02-14',
          amountCents: 15000,
          participants: ['@atariH2030', '@ricardo', '@leo'],
        },
      ],
    },
    {
      id: 'u_leo',
      name: 'Leonardo Mendes',
      username: 'leo',
      tag: '2099',
      bio: 'Economista de fim de semana.',
      sharedSplits: [
        {
          id: 'sp6',
          title: 'Aluguel temporada',
          date: '2025-01-10',
          amountCents: 120000,
          participants: ['@ricardo', '@leo', '@mari', '@joao'],
        },
      ],
    },
    {
      id: 'u_ana',
      name: 'Ana Beatriz',
      username: 'anab',
      tag: '7712',
      bio: 'Lista de compras sempre dividida no app.',
      sharedSplits: [],
    },
  ];

  function loadRaw() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveAll(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) {
      /* ignore */
    }
  }

  function findCatalog(id) {
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].id === id) return CATALOG[i];
    }
    return null;
  }

  function normalizeUsername(u) {
    return String(u || '')
      .trim()
      .toLowerCase()
      .replace(/^@/, '');
  }

  function normalizeTag(t) {
    return String(t || '')
      .trim()
      .replace(/^#/, '');
  }

  function findCatalogByHandle(username, tag) {
    var u = normalizeUsername(username);
    var t = normalizeTag(tag);
    for (var i = 0; i < CATALOG.length; i++) {
      var c = CATALOG[i];
      if (c.username.toLowerCase() === u && String(c.tag) === t) return c;
    }
    return null;
  }

  function getCurrentHandle() {
    if (typeof global.FTSession !== 'undefined' && FTSession.parseUser) {
      var user = FTSession.parseUser();
      if (user) {
        return {
          username: normalizeUsername(user.username),
          tag: normalizeTag(user.tag),
        };
      }
    }
    return null;
  }

  /**
   * Adiciona amigo a partir do payload do QR (@user + #tag).
   * @returns {{ ok: boolean, reason?: string, name?: string, id?: string }}
   */
  function addFriendFromQr(parsed) {
    if (!parsed || !parsed.username || !parsed.tag) {
      return { ok: false, reason: 'invalid_payload' };
    }
    var self = getCurrentHandle();
    if (
      self &&
      self.username === normalizeUsername(parsed.username) &&
      self.tag === normalizeTag(parsed.tag)
    ) {
      return { ok: false, reason: 'self' };
    }
    var entry = findCatalogByHandle(parsed.username, parsed.tag);
    if (!entry) {
      return { ok: false, reason: 'not_found' };
    }
    if (isFriend(entry.id)) {
      return { ok: false, reason: 'already_friend', name: entry.name };
    }
    addFriend(entry.id);
    return { ok: true, name: entry.name, id: entry.id };
  }

  function normalizeFriend(entry, friendsSince) {
    return {
      id: entry.id,
      name: entry.name,
      username: String(entry.username || '').toLowerCase(),
      tag: String(entry.tag || '0000'),
      bio: entry.bio || '',
      friendsSince: friendsSince || entry.friendsSince || new Date().toISOString().slice(0, 10),
      sharedSplits: Array.isArray(entry.sharedSplits) ? entry.sharedSplits.slice() : [],
    };
  }

  function getAll() {
    return loadRaw();
  }

  function getById(id) {
    var list = loadRaw();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function count() {
    return loadRaw().length;
  }

  function isFriend(id) {
    return loadRaw().some(function (f) {
      return f.id === id;
    });
  }

  function addFriend(catalogId) {
    var entry = findCatalog(catalogId);
    if (!entry || isFriend(catalogId)) return false;
    var list = loadRaw();
    list.push(
      normalizeFriend(entry, new Date().toISOString().slice(0, 10))
    );
    saveAll(list);
    return true;
  }

  function removeFriend(id) {
    var list = loadRaw().filter(function (f) {
      return f.id !== id;
    });
    saveAll(list);
  }

  /**
   * Busca no catálogo usuários que ainda não são amigos.
   * @param {string} query
   */
  function searchCatalog(query) {
    var q = String(query || '')
      .trim()
      .toLowerCase()
      .replace(/^@/, '');
    var withoutHash = q.replace(/^#/, '');

    return CATALOG.filter(function (u) {
      if (isFriend(u.id)) return false;
      if (!q) return true;
      var handle = '@' + u.username.toLowerCase();
      var disc = '#' + u.tag;
      return (
        u.name.toLowerCase().indexOf(q) >= 0 ||
        u.username.toLowerCase().indexOf(withoutHash) >= 0 ||
        handle.indexOf(q) >= 0 ||
        u.tag.indexOf(withoutHash) >= 0 ||
        disc.indexOf(q) >= 0
      );
    });
  }

  /**
   * Filtra lista de amigos já adicionados.
   */
  function filterFriends(query) {
    var q = String(query || '')
      .trim()
      .toLowerCase()
      .replace(/^@/, '');
    var withoutHash = q.replace(/^#/, '');
    var list = loadRaw();
    if (!q) return list;
    return list.filter(function (f) {
      var handle = '@' + f.username;
      var disc = '#' + f.tag;
      return (
        f.name.toLowerCase().indexOf(q) >= 0 ||
        f.username.toLowerCase().indexOf(withoutHash) >= 0 ||
        handle.toLowerCase().indexOf(q) >= 0 ||
        f.tag.indexOf(withoutHash) >= 0 ||
        disc.toLowerCase().indexOf(q) >= 0
      );
    });
  }

  function initials(name) {
    var parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  global.FTFriends = {
    getAll: getAll,
    getById: getById,
    count: count,
    isFriend: isFriend,
    addFriend: addFriend,
    addFriendFromQr: addFriendFromQr,
    findCatalogByHandle: findCatalogByHandle,
    removeFriend: removeFriend,
    searchCatalog: searchCatalog,
    filterFriends: filterFriends,
    initials: initials,
    catalogSize: function () {
      return CATALOG.length;
    },
  };
})(typeof window !== 'undefined' ? window : global);
