/**
 * UI de amizades no perfil
 * @author Rickson.Hirata
 */
(function () {
  'use strict';

  if (typeof FTFriends === 'undefined') return;

  const $ = (id) => document.getElementById(id);

  let lastFocusEl = null;
  let friendsFilterQuery = '';

  function haptic() {
    if (navigator.vibrate) navigator.vibrate([8]);
  }

  function formatBRL(cents) {
    return (Number(cents) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function formatDate(ymd) {
    if (!ymd) return '—';
    const p = String(ymd).split('-');
    if (p.length !== 3) return ymd;
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function friendshipDuration(sinceYmd) {
    if (!sinceYmd) return 'Amizade recente';
    const start = new Date(sinceYmd + 'T12:00:00');
    const now = new Date();
    const months =
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (months < 1) return 'Amigos há menos de 1 mês';
    if (months === 1) return 'Amigos há 1 mês';
    if (months < 12) return 'Amigos há ' + months + ' meses';
    const years = Math.floor(months / 12);
    return years === 1 ? 'Amigos há 1 ano' : 'Amigos há ' + years + ' anos';
  }

  function avatarGradient(id) {
    const hues = [200, 260, 140, 320, 40];
    let n = 0;
    for (let i = 0; i < String(id).length; i++) n += String(id).charCodeAt(i);
    const h = hues[n % hues.length];
    return 'linear-gradient(135deg, hsl(' + h + ',70%,45%), hsl(' + (h + 40) + ',65%,35%))';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function openSheet(id) {
    const el = $(id);
    if (!el) return;
    lastFocusEl = document.activeElement;
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }

  function closeSheet(id) {
    const el = $(id);
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    if (lastFocusEl && typeof lastFocusEl.focus === 'function') {
      lastFocusEl.focus();
    }
  }

  function bindBackdropClose(sheetId) {
    const sheet = $(sheetId);
    if (!sheet) return;
    sheet.querySelectorAll('[data-close]').forEach((node) => {
      node.addEventListener('click', () => {
        const target = node.getAttribute('data-close');
        if (target) closeSheet(target);
      });
    });
    sheet.addEventListener('click', (e) => {
      if (e.target === sheet || e.target.classList.contains('ft-sheet__backdrop')) {
        closeSheet(sheetId);
      }
    });
  }

  function renderFriendsList() {
    const listEl = $('friends-list');
    const emptyEl = $('friends-empty');
    const countEl = $('friends-count');
    if (!listEl || !emptyEl) return;

    const all = FTFriends.getAll();
    const filtered = FTFriends.filterFriends(friendsFilterQuery);
    const total = all.length;

    if (countEl) countEl.textContent = String(total);

    if (total === 0) {
      emptyEl.hidden = false;
      listEl.hidden = true;
      listEl.innerHTML = '';
      return;
    }

    emptyEl.hidden = true;
    listEl.hidden = false;

    if (!filtered.length) {
      listEl.innerHTML =
        '<li class="friends-empty" style="margin:8px 0;border-style:solid;">Nenhum amigo encontrado na busca.</li>';
      return;
    }

    listEl.innerHTML = filtered
      .map(function (f) {
        const ini = FTFriends.initials(f.name);
        const grad = avatarGradient(f.id);
        return (
          '<li class="friend-row" data-friend-id="' +
          escapeHtml(f.id) +
          '">' +
          '<div class="friend-row__avatar" style="background:' +
          grad +
          '">' +
          escapeHtml(ini) +
          '</div>' +
          '<div class="friend-row__info">' +
          '<span class="friend-row__name">' +
          escapeHtml(f.name) +
          '</span>' +
          '<span class="friend-row__tag">@' +
          escapeHtml(f.username) +
          '<span class="friend-row__disc">#' +
          escapeHtml(f.tag) +
          '</span></span>' +
          '</div>' +
          '<button type="button" class="friend-row__view" data-view-friend="' +
          escapeHtml(f.id) +
          '" aria-label="Ver perfil de ' +
          escapeHtml(f.name) +
          '">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
          '</button></li>'
        );
      })
      .join('');

    listEl.querySelectorAll('[data-view-friend]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        haptic();
        openFriendProfile(btn.getAttribute('data-view-friend'));
      });
    });
  }

  function openFriendProfile(friendId) {
    const f = FTFriends.getById(friendId);
    const host = $('friend-profile-body');
    if (!f || !host) return;

    const ini = FTFriends.initials(f.name);
    const grad = avatarGradient(f.id);
    const splits = f.sharedSplits || [];

    let splitsHtml = '';
    if (!splits.length) {
      splitsHtml =
        '<p class="friend-splits-empty">Nenhuma divisão de contas em comum registrada ainda.</p>';
    } else {
      splitsHtml =
        '<ul class="friend-splits-list">' +
        splits
          .map(function (sp) {
            const people = (sp.participants || [])
              .map(function (p) {
                return escapeHtml(p);
              })
              .join(', ');
            return (
              '<li class="friend-split-card">' +
              '<p class="friend-split-card__title">' +
              escapeHtml(sp.title) +
              '</p>' +
              '<p class="friend-split-card__meta">' +
              escapeHtml(formatDate(sp.date)) +
              '</p>' +
              '<p class="friend-split-card__amount">' +
              escapeHtml(formatBRL(sp.amountCents)) +
              '</p>' +
              '<p class="friend-split-card__people"><strong>Participantes:</strong> ' +
              people +
              '</p></li>'
            );
          })
          .join('') +
        '</ul>';
    }

    host.innerHTML =
      '<div class="friend-profile-hero">' +
      '<div class="friend-profile-avatar" style="background:' +
      grad +
      '">' +
      escapeHtml(ini) +
      '</div>' +
      '<h3 class="friend-profile-name">' +
      escapeHtml(f.name) +
      '</h3>' +
      '<p class="friend-profile-handle">@' +
      escapeHtml(f.username) +
      '<span class="friend-row__disc">#' +
      escapeHtml(f.tag) +
      '</span></p>' +
      '<p class="friend-profile-since">' +
      escapeHtml(friendshipDuration(f.friendsSince)) +
      '</p>' +
      '<p class="friend-profile-bio">' +
      escapeHtml(f.bio || 'Sem descrição no perfil.') +
      '</p></div>' +
      '<h4 class="friend-profile-section-title">Divisões em comum</h4>' +
      splitsHtml;

    openSheet('friend-profile-modal');
  }

  function renderSearchResults() {
    const host = $('friend-search-results');
    const empty = $('friend-search-empty');
    if (!host) return;

    const q = ($('friend-search-query') && $('friend-search-query').value) || '';
    const results = FTFriends.searchCatalog(q);

    if (!results.length) {
      host.innerHTML = '';
      if (empty) {
        empty.hidden = false;
        empty.textContent = q
          ? 'Nenhum usuário encontrado.'
          : 'Digite um nome, @usuário ou #id para buscar.';
      }
      return;
    }

    if (empty) empty.hidden = true;

    host.innerHTML = results
      .map(function (u) {
        const ini = FTFriends.initials(u.name);
        const grad = avatarGradient(u.id);
        return (
          '<li class="friend-search-row">' +
          '<div class="friend-row__avatar" style="background:' +
          grad +
          '">' +
          escapeHtml(ini) +
          '</div>' +
          '<div class="friend-search-row__main">' +
          '<span class="friend-row__name">' +
          escapeHtml(u.name) +
          '</span>' +
          '<span class="friend-row__tag">@' +
          escapeHtml(u.username) +
          '<span class="friend-row__disc">#' +
          escapeHtml(u.tag) +
          '</span></span></div>' +
          '<button type="button" class="friend-search-add" data-add-friend="' +
          escapeHtml(u.id) +
          '">Adicionar</button></li>'
        );
      })
      .join('');

    host.querySelectorAll('[data-add-friend]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-add-friend');
        if (FTFriends.addFriend(id)) {
          haptic();
          btn.textContent = 'Adicionado';
          btn.disabled = true;
          renderFriendsList();
          renderSearchResults();
        }
      });
    });
  }

  function openFriendsModal() {
    friendsFilterQuery = '';
    const filter = $('friends-filter');
    if (filter) filter.value = '';
    renderFriendsList();
    openSheet('friends-modal');
    setTimeout(function () {
      filter?.focus();
    }, 320);
  }

  function openSearchModal() {
    const q = $('friend-search-query');
    if (q) q.value = '';
    renderSearchResults();
    openSheet('friend-search-modal');
    setTimeout(function () {
      q?.focus();
    }, 320);
  }

  $('friends-btn')?.addEventListener('click', function () {
    haptic();
    openFriendsModal();
  });

  $('friends-add-btn')?.addEventListener('click', function () {
    haptic();
    openSearchModal();
  });

  $('friends-filter')?.addEventListener('input', function () {
    friendsFilterQuery = this.value;
    renderFriendsList();
  });

  $('friend-search-query')?.addEventListener('input', function () {
    renderSearchResults();
  });

  $('friend-profile-close')?.addEventListener('click', function () {
    closeSheet('friend-profile-modal');
  });

  $('friend-search-close')?.addEventListener('click', function () {
    closeSheet('friend-search-modal');
  });

  bindBackdropClose('friends-modal');
  bindBackdropClose('friend-search-modal');
  bindBackdropClose('friend-profile-modal');

  if (window.FTProfileQR) {
    FTProfileQR.onFriendsChanged = function () {
      renderFriendsList();
      renderSearchResults();
    };
  }

  window.addEventListener('ft-friends-changed', function () {
    renderFriendsList();
    renderSearchResults();
  });

  renderFriendsList();
})();
