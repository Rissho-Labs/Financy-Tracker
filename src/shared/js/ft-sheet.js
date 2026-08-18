/**
 * Controlador partilhado de bottom-sheets (.ft-sheet)
 * Pilha, voltar nativo, chrome (seta/X), swipe-down, backdrop.
 */
(function (global) {
  'use strict';

  var OPEN = 'ft-sheet--open';
  var stack = [];
  var handlers = new WeakMap();
  var bound = new WeakSet();
  var drag = null;
  var reducedMotion = false;

  var THRESHOLD = 0.12;
  var FLICK_V = 0.18;
  var AXIS_SLOP = 4;
  var SNAP_MS = '0.18s cubic-bezier(0.2, 0.75, 0.2, 1)';

  function panelOf(el) {
    return el && el.querySelector('.ft-sheet__panel');
  }

  function backdropOf(el) {
    return el && el.querySelector('.ft-sheet__backdrop');
  }

  function optsOf(el) {
    return handlers.get(el) || {};
  }

  function isOpen(el) {
    return !!(el && el.classList.contains(OPEN));
  }

  function canClose(el) {
    var fn = optsOf(el).canClose;
    return typeof fn !== 'function' || fn();
  }

  function topSheet() {
    return stack.length ? stack[stack.length - 1] : null;
  }

  function syncBodyLock() {
    var root = document.documentElement;
    if (stack.length) {
      if (root._ftSheetCloseT) {
        window.clearTimeout(root._ftSheetCloseT);
        root._ftSheetCloseT = 0;
      }
      root.classList.add('ft-sheet-open');
    } else if (!root._ftSheetCloseT) {
      root._ftSheetCloseT = window.setTimeout(function () {
        root._ftSheetCloseT = 0;
        if (!stack.length) root.classList.remove('ft-sheet-open');
      }, 280);
    }
    if (stack.some(function (el) {
      return optsOf(el).lockBody || el.id === 'ft-notif-sheet';
    })) {
      document.body.style.overflow = 'hidden';
    } else if (!stack.length) {
      document.body.style.overflow = '';
    }
  }

  function updateChrome() {
    document.querySelectorAll('.ft-sheet.' + OPEN).forEach(function (el) {
      var back = el.querySelector('.ft-sheet__back');
      if (!back) return;
      var show = stack.length > 1 && topSheet() === el;
      back.hidden = !show;
    });
  }

  function clearPanelMotion(panel, bd) {
    if (!panel) return;
    panel.style.transform = '';
    panel.style.transition = '';
    if (bd) bd.style.opacity = '';
  }

  function setOpenVisual(el, on) {
    var panel = panelOf(el);
    var bd = backdropOf(el);
    if (on) {
      el.classList.add(OPEN);
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'false');
      clearPanelMotion(panel, bd);
    } else {
      el.classList.remove(OPEN, 'open', 'ft-sheet--dragging');
      el.setAttribute('aria-hidden', 'true');
      if (panel) panel.style.willChange = '';
      requestAnimationFrame(function () {
        if (isOpen(el)) return;
        if (panel) panel.style.transform = '';
        if (bd) {
          bd.style.opacity = '';
          bd.style.transition = '';
        }
      });
      window.setTimeout(function () {
        if (isOpen(el) || !panel) return;
        panel.style.transition = '';
      }, 280);
    }
  }

  function runOpen(el) {
    var o = optsOf(el).onOpen;
    if (o) o();
    syncBodyLock();
  }

  function runClose(el) {
    var o = optsOf(el).onClose;
    if (o) o();
    syncBodyLock();
  }

  function register(el, options) {
    if (!el) return;
    var prev = optsOf(el);
    handlers.set(el, Object.assign({}, prev, options || {}));
    bindSheet(el);
  }

  function open(el, options) {
    if (!el) return;
    if (options) register(el, options);
    bindSheet(el);
    if (isOpen(el)) {
      updateChrome();
      return;
    }
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    setOpenVisual(el, true);
    if (stack.indexOf(el) === -1) stack.push(el);
    runOpen(el);
    updateChrome();
  }

  function close(el, force) {
    if (!el || !isOpen(el)) return;
    if (!force && !canClose(el)) return;
    var i = stack.indexOf(el);
    if (i !== -1) stack.splice(i, 1);
    setOpenVisual(el, false);
    runClose(el);
    updateChrome();
  }

  function pop() {
    var el = topSheet();
    if (!el) return false;
    if (!canClose(el)) return false;
    close(el);
    return true;
  }

  function dismissAll() {
    while (stack.length) {
      close(stack[stack.length - 1], true);
    }
  }

  function handleBack() {
    if (stack.length) {
      pop();
      return;
    }
    var App = global.__FT_APP__;
    if (App && typeof App.minimizeApp === 'function') {
      App.minimizeApp();
    }
  }

  function bindBackdrop(el) {
    var bd = backdropOf(el);
    if (bd && !bd.dataset.ftBd) {
      bd.dataset.ftBd = '1';
      bd.addEventListener('click', function () {
        if (topSheet() === el) pop();
      });
    }
    if (!el.dataset.ftRoot) {
      el.dataset.ftRoot = '1';
      el.addEventListener('click', function (e) {
        if (e.target === el && topSheet() === el) pop();
      });
    }
  }

  function bindChrome(el) {
    var xBtn = el.querySelector('.ft-sheet__x');
    var backBtn = el.querySelector('.ft-sheet__back');
    if (xBtn && !xBtn.dataset.ftX) {
      xBtn.dataset.ftX = '1';
      xBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        dismissAll();
      });
    }
    if (backBtn && !backBtn.dataset.ftBack) {
      backBtn.dataset.ftBack = '1';
      backBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        pop();
      });
    }
  }

  function scrollableContent(panel) {
    if (!panel) return null;
    var n = panel.querySelector('.ft-sheet__body, .expense-sheet-body, .ft-notif-body, .friends-list');
    return n || (panel.scrollHeight > panel.clientHeight + 2 ? panel : null);
  }

  function isInteractive(target) {
    return !!(target && target.closest &&
      target.closest('.ft-sheet__back, .ft-sheet__x, input, textarea, select, button, a, label'));
  }

  function isGrabber(target) {
    return !!(target && target.closest &&
      target.closest('.ft-sheet__handle, .ft-sheet__chrome'));
  }

  function applyDragY(panel, y) {
    panel.style.transform = 'translate3d(0,' + y + 'px,0)';
  }

  function abortDrag(el) {
    if (!drag || drag.el !== el) return;
    var panel = drag.panel;
    drag = null;
    el.classList.remove('ft-sheet--dragging');
    if (panel) {
      panel.style.transition = '';
      panel.style.transform = '';
      panel.style.touchAction = '';
    }
  }

  function bindDrag(el) {
    var panel = panelOf(el);
    if (!panel || panel.dataset.ftDrag) return;
    panel.dataset.ftDrag = '1';

    panel.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (topSheet() !== el || !canClose(el) || isInteractive(e.target)) return;
      var sc = scrollableContent(panel);
      var grab = isGrabber(e.target);
      if (!grab && sc === panel) return;
      if (sc && sc.scrollTop > 1 && !grab) return;

      drag = {
        el: el,
        panel: panel,
        bd: backdropOf(el),
        startX: e.clientX,
        startY: e.clientY,
        lastY: e.clientY,
        lastT: e.timeStamp,
        vy: 0,
        dy: 0,
        h: panel.offsetHeight || 320,
        pid: e.pointerId,
        locked: grab,
      };
      panel.style.transition = 'none';
      panel.style.touchAction = 'none';
      if (drag.bd) drag.bd.style.transition = 'none';
      if (grab) {
        el.classList.add('ft-sheet--dragging');
        try { panel.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
    });

    panel.addEventListener('pointermove', function (e) {
      if (!drag || drag.el !== el || drag.pid !== e.pointerId) return;

      var sample = e;
      if (e.getCoalescedEvents) {
        var coalesced = e.getCoalescedEvents();
        if (coalesced && coalesced.length) sample = coalesced[coalesced.length - 1];
      }

      var dx = sample.clientX - drag.startX;
      var dy = sample.clientY - drag.startY;
      var adx = Math.abs(dx);
      var ady = Math.abs(dy);

      if (!drag.locked) {
        if (adx < AXIS_SLOP && ady < AXIS_SLOP) return;
        if (adx > ady) {
          abortDrag(el);
          return;
        }
        drag.locked = true;
        drag.startX = sample.clientX;
        drag.startY = sample.clientY;
        dy = 0;
        el.classList.add('ft-sheet--dragging');
        try { panel.setPointerCapture(drag.pid); } catch (err) { /* ignore */ }
      }

      if (e.cancelable) e.preventDefault();

      var dt = Math.max(1, sample.timeStamp - drag.lastT);
      var inst = (sample.clientY - drag.lastY) / dt;
      drag.vy = drag.vy * 0.65 + inst * 0.35;
      drag.lastY = sample.clientY;
      drag.lastT = sample.timeStamp;
      drag.dy = dy < 0 ? 0 : dy;

      if (reducedMotion) return;
      applyDragY(drag.panel, drag.dy);
      if (drag.bd) {
        drag.bd.style.opacity = String(Math.max(0, 1 - drag.dy / drag.h));
      }
    }, { passive: false });

    panel.addEventListener('touchmove', function (e) {
      if (drag && drag.el === el && drag.locked) e.preventDefault();
    }, { passive: false });

    function endDrag(e) {
      if (!drag || drag.el !== el || drag.pid !== e.pointerId) return;
      var d = drag;
      drag = null;
      try { panel.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }

      var dt = Math.max(1, e.timeStamp - d.lastT);
      var inst = (e.clientY - d.lastY) / dt;
      var vy = d.vy * 0.5 + inst * 0.5;
      var dismiss = d.locked && (d.dy >= d.h * THRESHOLD || vy > FLICK_V || (d.dy > 36 && vy > 0.08));

      el.classList.remove('ft-sheet--dragging');
      d.panel.style.touchAction = '';

      if (dismiss && canClose(el)) {
        d.panel.style.transition = 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)';
        if (d.bd) d.bd.style.opacity = '0';
        close(el);
        return;
      }

      if (d.bd) d.bd.style.opacity = '';
      if (reducedMotion || !d.locked) {
        d.panel.style.transition = '';
        d.panel.style.transform = '';
        return;
      }
      d.panel.style.transition = 'transform ' + SNAP_MS;
      applyDragY(d.panel, 0);
      window.setTimeout(function () {
        if (!isOpen(el)) return;
        d.panel.style.transition = '';
        d.panel.style.transform = '';
      }, 220);
    }

    panel.addEventListener('pointerup', endDrag);
    panel.addEventListener('pointercancel', endDrag);
  }

  function bindSheet(el) {
    if (bound.has(el)) return;
    bound.add(el);
    bindBackdrop(el);
    bindChrome(el);
    bindDrag(el);
  }

  function initBack() {
    var App = global.__FT_APP__;
    if (App && typeof App.addListener === 'function') {
      App.addListener('backButton', function () {
        handleBack();
      });
    }
  }

  function init() {
    reducedMotion = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    document.querySelectorAll('.ft-sheet').forEach(bindSheet);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && stack.length) {
        e.preventDefault();
        pop();
      }
    });
    initBack();
  }

  global.FTSheet = {
    register: register,
    open: open,
    close: close,
    pop: pop,
    dismissAll: dismissAll,
    isOpen: isOpen,
    isSheetOpen: function () {
      return stack.length > 0;
    },
    handleBack: handleBack,
    top: topSheet,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
