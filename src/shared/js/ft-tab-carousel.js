/**
 * Carrossel touch entre abas (Início → Cartões → Metas → Perfil).
 * v4 — gesto fluido: sem layout thrash no move; pill só com transform;
 * placeholders leves; kill-switch: sessionStorage.ft-carousel = '0'
 * @author Rickson.Hirata
 */
(function (global) {
  'use strict';

  var TAB_IDS = ['nav-home', 'nav-wallet', 'nav-tx', 'nav-profile'];
  var TAB_KEYS = ['home', 'cards', 'goals', 'profile'];
  var TAB_LABELS = ['Início', 'Cartões', 'Metas', 'Perfil'];
  var EDGE_RESIST = 0.28;
  var COMMIT_RATIO = 0.22;
  var COMMIT_VELOCITY = 0.4;
  var AXIS_LOCK = 8;

  var state = {
    index: 0,
    width: 0,
    dragging: false,
    axis: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastT: 0,
    velocity: 0,
    offset: 0,
    animating: false,
    navLock: false,
    pointerId: null,
    touchId: null,
    raf: 0,
    pendingX: null,
  };

  var els = {
    app: null,
    viewport: null,
    track: null,
    prev: null,
    current: null,
    next: null,
    nav: null,
    items: [],
    thumb: null,
  };

  /** Pill só-ícone: tamanho fixo centrado no slot (sem label = sem overlap). */
  var PILL_SIZE = 44;

  /** Slots medidos UMA vez no início do swipe (só transform depois). */
  var thumbDrag = {
    active: false,
    fromIdx: 0,
    toIdx: 0,
    fromX: 0,
    toX: 0,
    y: 0,
    w: PILL_SIZE,
    h: PILL_SIZE,
    lastP: -1,
  };

  function reduceMotion() {
    try {
      return global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  function shouldEnable() {
    try {
      if (sessionStorage.getItem('ft-carousel') === '0') return false;
      if (sessionStorage.getItem('ft-carousel') === '1') return true;
    } catch (e) { /* ignore */ }
    var host = (global.location && location.hostname) || '';
    var ua = navigator.userAgent || '';
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (/Capacitor/i.test(ua) || /; wv\)/.test(ua)) return true;
    try {
      if (global.matchMedia('(pointer: coarse)').matches) return true;
    } catch (e2) { /* ignore */ }
    return false;
  }

  function pathOf(key) {
    return typeof FTRoutes !== 'undefined' && FTRoutes[key] ? FTRoutes[key] : null;
  }

  function currentIndexFromPath() {
    var path = (global.location.pathname || '').replace(/\\/g, '/');
    var i;
    for (i = 0; i < TAB_KEYS.length; i++) {
      var p = pathOf(TAB_KEYS[i]);
      if (!p) continue;
      if (path === p || path.endsWith(p) || path.indexOf(p) !== -1) return i;
    }
    return 0;
  }

  function sheetOpen() {
    return !!document.querySelector('.ft-sheet.ft-sheet--open');
  }

  function isInteractiveTarget(target) {
    if (!target) return true;
    var el = target.nodeType === 1 ? target : target.parentElement;
    if (!el || !el.closest) return true;
    return !!el.closest(
      'input, textarea, select, [contenteditable="true"], ' +
        '.ft-sheet, .home-fab, .gasto-fab, #cc-track, .cards-track, .carousel-container'
    );
  }

  function placeholderHtml(index) {
    var label = TAB_LABELS[index] || '';
    return (
      '<div class="ft-tab-panel-ph" aria-hidden="true">' +
      '<div class="ft-tab-panel-ph__card">' +
      '<span class="ft-tab-panel-ph__label">' +
      label +
      '</span></div></div>'
    );
  }

  function paintAdjacent() {
    if (els.prev) {
      els.prev.innerHTML =
        state.index > 0 ? placeholderHtml(state.index - 1) : '';
    }
    if (els.next) {
      els.next.innerHTML =
        state.index < TAB_KEYS.length - 1 ? placeholderHtml(state.index + 1) : '';
    }
  }

  function clearAdjacent() {
    if (els.prev) els.prev.innerHTML = '';
    if (els.next) els.next.innerHTML = '';
  }

  function measure() {
    state.width = els.viewport ? els.viewport.clientWidth : global.innerWidth || 1;
    if (state.width < 1) state.width = 1;
  }

  function setTrack(x, withTransition) {
    if (!els.track) return;
    if (withTransition) els.track.classList.add('is-animating');
    else els.track.classList.remove('is-animating');
    els.track.style.transform = 'translate3d(' + x + 'px,0,0)';
  }

  function baseX() {
    return -state.width;
  }

  function clampDrag(dx) {
    var atStart = state.index <= 0;
    var atEnd = state.index >= TAB_KEYS.length - 1;
    if ((atStart && dx > 0) || (atEnd && dx < 0)) return dx * EDGE_RESIST;
    return dx;
  }

  function setNavActive(idx) {
    var i;
    for (i = 0; i < els.items.length; i++) {
      var item = els.items[i];
      if (!item) continue;
      var on = i === idx;
      item.classList.toggle('active', on);
      if (on) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    }
  }

  /* ── Pill: settled = ::before no .active; flutuante só no gesto ── */

  function ensureThumb() {
    if (!els.nav || els.thumb) return;
    els.nav.classList.add('ft-nav-thumb-mode');
    var thumb = document.createElement('div');
    thumb.className = 'ft-nav-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    els.nav.insertBefore(thumb, els.nav.firstChild);
    els.thumb = thumb;
  }

  function thumbSetLive(on) {
    if (!els.nav) return;
    if (on) els.nav.classList.add('ft-nav-thumb-live');
    else els.nav.classList.remove('ft-nav-thumb-live');
    if (!els.thumb) return;
    if (on) els.thumb.classList.add('is-live');
    else {
      els.thumb.classList.remove('is-live');
      els.thumb.classList.remove('is-moving');
    }
  }

  function readSlots() {
    if (!els.nav || !els.items.length) return [];
    var navRect = els.nav.getBoundingClientRect();
    var out = [];
    var i;
    for (i = 0; i < els.items.length; i++) {
      var r = els.items[i].getBoundingClientRect();
      out.push({
        cx: r.left - navRect.left + r.width / 2,
        cy: r.top - navRect.top + r.height / 2,
      });
    }
    return out;
  }

  function clampThumbX(x) {
    if (!els.nav) return x;
    var max = Math.max(0, els.nav.clientWidth - PILL_SIZE);
    if (x < 0) return 0;
    if (x > max) return max;
    return x;
  }

  function thumbPosForSlot(slot) {
    return {
      x: clampThumbX(slot.cx - PILL_SIZE / 2),
      y: slot.cy - PILL_SIZE / 2,
    };
  }

  function paintThumbXY(x, y, withTransition) {
    if (!els.thumb) return;
    if (withTransition) els.thumb.classList.add('is-moving');
    else els.thumb.classList.remove('is-moving');
    els.thumb.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  }

  function applyPillBox() {
    if (!els.thumb) return;
    els.thumb.style.width = PILL_SIZE + 'px';
    els.thumb.style.height = PILL_SIZE + 'px';
  }

  /** Estado parado: só ::before no .active — sem pill flutuante. */
  function thumbSettle(idx) {
    thumbDrag.active = false;
    setNavActive(idx);
    thumbSetLive(false);
  }

  function thumbBeginSwipe(fromIdx, toIdx) {
    ensureThumb();
    var slots = readSlots();
    var a = slots[fromIdx];
    var b = slots[toIdx];
    if (!a || !b || !els.thumb) {
      thumbDrag.active = false;
      return;
    }
    applyPillBox();
    var from = thumbPosForSlot(a);
    var to = thumbPosForSlot(b);
    thumbDrag.active = true;
    thumbDrag.fromIdx = fromIdx;
    thumbDrag.toIdx = toIdx;
    thumbDrag.fromX = from.x;
    thumbDrag.toX = to.x;
    thumbDrag.y = from.y;
    thumbDrag.lastP = -1;
    /* Mostra flutuante no sítio do ativo atual; esconde ::before */
    paintThumbXY(from.x, from.y, false);
    thumbSetLive(true);
  }

  function thumbSetProgress(p) {
    if (!thumbDrag.active || !els.thumb) return;
    p = p < 0 ? 0 : p > 1 ? 1 : p;
    if (Math.abs(p - thumbDrag.lastP) < 0.008) return;
    thumbDrag.lastP = p;
    var x = thumbDrag.fromX + (thumbDrag.toX - thumbDrag.fromX) * p;
    paintThumbXY(x, thumbDrag.y, false);
  }

  function thumbAnimateTo(idx, onDone) {
    if (reduceMotion()) {
      thumbSettle(idx);
      if (onDone) onDone();
      return;
    }
    thumbBeginSwipe(state.index, idx);
    if (!thumbDrag.active) {
      thumbSettle(idx);
      if (onDone) onDone();
      return;
    }
    /* Não muda .active a meio — evita o ícone destino “acender” antes do pill */
    requestAnimationFrame(function () {
      paintThumbXY(thumbDrag.toX, thumbDrag.y, true);
    });
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      thumbSettle(idx);
      if (onDone) onDone();
    };
    els.thumb.addEventListener('transitionend', finish, { once: true });
    global.setTimeout(finish, 400);
  }

  function updateNavFromOffset(offset) {
    if (!state.width || !thumbDrag.active) return;
    var p = Math.abs(offset) / state.width;
    if (p > 1) p = 1;
    thumbSetProgress(p);
  }

  function clearNavDrag() {
    thumbSettle(state.index);
  }

  function navigateTo(index) {
    if (state.navLock) return;
    var key = TAB_KEYS[index];
    var url = pathOf(key);
    if (!url || index === state.index) return;
    state.navLock = true;
    try {
      sessionStorage.setItem('ft-tab-nav', '1');
      sessionStorage.setItem('ft-tab-swipe', index > state.index ? 'next' : 'prev');
    } catch (e) { /* ignore */ }
    global.location.href = url;
  }

  function settle(commitDir) {
    state.animating = true;
    measure();
    var target = baseX();
    var destIndex = state.index;
    if (commitDir === 'next' && state.index < TAB_KEYS.length - 1) {
      target = -2 * state.width;
      destIndex = state.index + 1;
    } else if (commitDir === 'prev' && state.index > 0) {
      target = 0;
      destIndex = state.index - 1;
    }

    if (destIndex !== state.index) {
      if (thumbDrag.active) thumbSetProgress(1);
      /* Mantém ft-nav-thumb-live até o unload — sem ::before a saltar no destino */
      setNavActive(destIndex);
      setTrack(target, true);
      var finished = false;
      var done = function () {
        if (finished) return;
        finished = true;
        navigateTo(destIndex);
      };
      els.track.addEventListener('transitionend', done, { once: true });
      global.setTimeout(done, 360);
      return;
    }

    setTrack(target, true);
    clearNavDrag();
    global.setTimeout(function () {
      state.animating = false;
      state.offset = 0;
      setTrack(baseX(), false);
      clearAdjacent();
      if (els.viewport) els.viewport.classList.remove('is-swiping');
    }, 280);
  }

  function flushMove() {
    state.raf = 0;
    if (state.pendingX == null || !state.dragging || state.axis !== 'x') return;
    var x = state.pendingX;
    state.pendingX = null;
    var dx = x - state.startX;
    state.offset = clampDrag(dx);
    setTrack(baseX() + state.offset, false);
    updateNavFromOffset(state.offset);
  }

  function beginDrag(x, y, id, kind) {
    if (state.animating || state.navLock || sheetOpen()) return false;
    measure();
    state.dragging = true;
    state.axis = null;
    state.startX = x;
    state.startY = y;
    state.lastX = x;
    state.lastT = performance.now();
    state.velocity = 0;
    state.offset = 0;
    state.pendingX = null;
    if (kind === 'pointer') state.pointerId = id;
    if (kind === 'touch') state.touchId = id;
    return true;
  }

  function moveDrag(x, y, ev) {
    if (!state.dragging || state.animating) return;
    var dx = x - state.startX;
    var dy = y - state.startY;
    if (!state.axis) {
      if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
      if (Math.abs(dx) > Math.abs(dy) + 2) {
        state.axis = 'x';
        paintAdjacent();
        if (els.viewport) els.viewport.classList.add('is-swiping');
        if (dx < 0 && state.index < TAB_KEYS.length - 1) {
          thumbBeginSwipe(state.index, state.index + 1);
        } else if (dx > 0 && state.index > 0) {
          thumbBeginSwipe(state.index, state.index - 1);
        }
      } else {
        state.axis = 'y';
        return;
      }
    }
    if (state.axis !== 'x') return;
    if (ev && ev.cancelable) ev.preventDefault();
    var now = performance.now();
    var dt = Math.max(1, now - state.lastT);
    state.velocity = (x - state.lastX) / dt;
    state.lastX = x;
    state.lastT = now;
    /* Coalesce para 1 paint / frame — evita jank no WebView */
    state.pendingX = x;
    if (!state.raf) {
      state.raf = global.requestAnimationFrame(flushMove);
    }
  }

  function endDrag() {
    if (!state.dragging) return;
    if (state.raf) {
      global.cancelAnimationFrame(state.raf);
      state.raf = 0;
      flushMove();
    }
    state.dragging = false;
    state.pointerId = null;
    state.touchId = null;
    if (state.axis !== 'x') {
      state.axis = null;
      if (els.viewport) els.viewport.classList.remove('is-swiping');
      return;
    }
    state.axis = null;
    var ratio = state.width ? Math.abs(state.offset) / state.width : 0;
    var flick = Math.abs(state.velocity) >= COMMIT_VELOCITY;
    var commitDir = null;
    if ((ratio >= COMMIT_RATIO || (flick && ratio > 0.08)) && state.offset < 0) {
      commitDir = 'next';
    }
    if ((ratio >= COMMIT_RATIO || (flick && ratio > 0.08)) && state.offset > 0) {
      commitDir = 'prev';
    }
    if (reduceMotion() && commitDir) {
      clearNavDrag();
      navigateTo(commitDir === 'next' ? state.index + 1 : state.index - 1);
      return;
    }
    settle(commitDir);
  }

  function onPointerDown(e) {
    if (e.pointerType === 'touch') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isInteractiveTarget(e.target)) return;
    beginDrag(e.clientX, e.clientY, e.pointerId, 'pointer');
  }

  function onPointerMove(e) {
    if (e.pointerType === 'touch') return;
    if (!state.dragging || state.pointerId == null) return;
    if (e.pointerId !== state.pointerId) return;
    moveDrag(e.clientX, e.clientY, e);
  }

  function onPointerUp(e) {
    if (e && e.pointerType === 'touch') return;
    if (state.pointerId == null) return;
    if (e && e.pointerId != null && e.pointerId !== state.pointerId) return;
    endDrag();
  }

  function onTouchStart(e) {
    if (!e.changedTouches || !e.changedTouches.length) return;
    if (isInteractiveTarget(e.target)) return;
    var t = e.changedTouches[0];
    beginDrag(t.clientX, t.clientY, t.identifier, 'touch');
  }

  function onTouchMove(e) {
    if (!state.dragging || state.touchId == null) return;
    var i;
    var t = null;
    for (i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === state.touchId) {
        t = e.touches[i];
        break;
      }
    }
    if (!t) return;
    moveDrag(t.clientX, t.clientY, e);
  }

  function onTouchEnd(e) {
    if (state.touchId == null) return;
    var i;
    var ended = false;
    for (i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === state.touchId) ended = true;
    }
    if (ended) endDrag();
  }

  function buildShell() {
    els.app = document.getElementById('app');
    els.nav = document.querySelector('.bottom-nav');
    if (!els.app || !els.nav) return false;

    state.index = currentIndexFromPath();
    els.items = TAB_IDS.map(function (id) {
      return document.getElementById(id);
    }).filter(Boolean);

    var moveNodes = [];
    var children = Array.prototype.slice.call(els.app.children);
    var i;
    for (i = 0; i < children.length; i++) {
      var node = children[i];
      if (node === els.nav) continue;
      if (node.matches && node.matches('.ft-sheet, .home-fab, .gasto-fab')) continue;
      if (node.id && /-(modal|sheet)$/.test(node.id)) continue;
      if (node.id === 'expense-sheet' || node.id === 'expense-scan-modal') continue;
      if (node.classList && node.classList.contains('ft-sheet')) continue;
      moveNodes.push(node);
    }

    els.viewport = document.createElement('div');
    els.viewport.className = 'ft-tab-viewport';
    els.viewport.setAttribute('data-ft-tab-carousel', '1');

    els.track = document.createElement('div');
    els.track.className = 'ft-tab-track';

    els.prev = document.createElement('div');
    els.prev.className = 'ft-tab-panel ft-tab-panel--adj';
    els.prev.setAttribute('aria-hidden', 'true');

    els.current = document.createElement('div');
    els.current.className = 'ft-tab-panel ft-tab-panel--current';

    els.next = document.createElement('div');
    els.next.className = 'ft-tab-panel ft-tab-panel--adj';
    els.next.setAttribute('aria-hidden', 'true');

    for (i = 0; i < moveNodes.length; i++) {
      els.current.appendChild(moveNodes[i]);
    }

    els.track.appendChild(els.prev);
    els.track.appendChild(els.current);
    els.track.appendChild(els.next);
    els.viewport.appendChild(els.track);
    els.app.insertBefore(els.viewport, els.nav);
    els.app.classList.add('ft-tab-shell');

    measure();
    setTrack(baseX(), false);
    return true;
  }

  function bind() {
    if (!els.viewport) return;
    els.viewport.addEventListener('pointerdown', onPointerDown, { passive: true });
    els.viewport.addEventListener('pointermove', onPointerMove, { passive: false });
    els.viewport.addEventListener('pointerup', onPointerUp, { passive: true });
    els.viewport.addEventListener('pointercancel', onPointerUp, { passive: true });
    els.viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    els.viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    els.viewport.addEventListener('touchend', onTouchEnd, { passive: true });
    els.viewport.addEventListener('touchcancel', onTouchEnd, { passive: true });
    global.addEventListener(
      'resize',
      function () {
        if (state.animating || state.dragging) return;
        measure();
        setTrack(baseX(), false);
        thumbSettle(state.index);
      },
      { passive: true }
    );
  }

  function goTo(key) {
    if (!els.viewport || !els.track) return false;
    var idx = TAB_KEYS.indexOf(key);
    if (idx < 0 || idx === state.index || state.animating || state.navLock) return false;
    measure();

    if (Math.abs(idx - state.index) !== 1) {
      var urlFar = pathOf(key);
      if (!urlFar) return false;
      state.navLock = true;
      state.animating = true;
      try {
        sessionStorage.setItem('ft-tab-nav', '1');
      } catch (e) { /* ignore */ }
      thumbAnimateTo(idx, function () {
        global.location.href = urlFar;
      });
      return true;
    }

    paintAdjacent();
    if (idx > state.index) thumbBeginSwipe(state.index, idx);
    else thumbBeginSwipe(state.index, idx);
    settle(idx > state.index ? 'next' : 'prev');
    return true;
  }

  function init() {
    if (document.documentElement.hasAttribute('data-ft-tab-carousel')) return;
    if (!shouldEnable()) return;
    if (!document.querySelector('.bottom-nav')) return;
    if (!pathOf('home')) return;
    if (!buildShell()) return;
    document.documentElement.setAttribute('data-ft-tab-carousel', '1');
    if (els.nav) els.nav.classList.add('ft-nav-thumb-mode');
    setNavActive(state.index);
    /* Sem pill flutuante no idle — ::before no .active evita pop no Perfil */
    bind();
  }

  global.FTTabCarousel = {
    init: init,
    goTo: goTo,
    tabs: TAB_KEYS.slice(),
    enabled: shouldEnable,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
