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

  var THRESHOLD = 0.25;
  var FLICK_V = 0.6;

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
      clearPanelMotion(panel, bd);
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
    var n = panel.querySelector('.expense-sheet-body, .ft-notif-body, .friends-list');
    return n || (panel.scrollHeight > panel.clientHeight ? panel : null);
  }

  function dragStartEligible(target, panel) {
    if (!target || !target.closest) return false;
    if (target.closest('.ft-sheet__back, .ft-sheet__x, input, textarea, select, button, a, label')) {
      return false;
    }
    if (target.closest('.ft-sheet__handle, .ft-sheet__chrome')) return true;
    return false;
  }

  function bindDrag(el) {
    var panel = panelOf(el);
    if (!panel || panel.dataset.ftDrag) return;
    panel.dataset.ftDrag = '1';

    panel.addEventListener('pointerdown', function (e) {
      if (topSheet() !== el || !canClose(el)) return;
      if (!dragStartEligible(e.target, panel)) return;
      var sc = scrollableContent(panel);
      if (sc && sc.scrollTop > 0) return;

      drag = {
        el: el,
        panel: panel,
        bd: backdropOf(el),
        startX: e.clientX,
        startY: e.clientY,
        lastY: e.clientY,
        lastT: e.timeStamp,
        dy: 0,
        pid: e.pointerId,
      };
      el.classList.add('ft-sheet--dragging');
      try {
        panel.setPointerCapture(e.pointerId);
      } catch (err) { /* ignore */ }
    });

    panel.addEventListener('pointermove', function (e) {
      if (!drag || drag.el !== el || drag.pid !== e.pointerId) return;
      var dx = e.clientX - drag.startX;
      var dy = e.clientY - drag.startY;
      if (drag.dy === 0 && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
        drag = null;
        el.classList.remove('ft-sheet--dragging');
        return;
      }
      drag.dy = Math.max(0, dy);
      drag.lastY = e.clientY;
      drag.lastT = e.timeStamp;
      if (reducedMotion) return;
      drag.panel.style.transition = 'none';
      drag.panel.style.transform = 'translateY(' + drag.dy + 'px)';
      if (drag.bd) {
        var h = drag.panel.offsetHeight || 1;
        drag.bd.style.opacity = String(Math.max(0, 1 - drag.dy / h));
      }
    });

    function endDrag(e) {
      if (!drag || drag.el !== el || drag.pid !== e.pointerId) return;
      var d = drag;
      drag = null;
      el.classList.remove('ft-sheet--dragging');
      try {
        panel.releasePointerCapture(e.pointerId);
      } catch (err) { /* ignore */ }

      var h = d.panel.offsetHeight || 320;
      var dt = Math.max(1, e.timeStamp - d.lastT);
      var vy = (e.clientY - d.lastY) / dt;
      var dismiss = d.dy >= h * THRESHOLD || vy > FLICK_V;

      d.panel.style.transition = '';
      if (d.bd) d.bd.style.opacity = '';

      if (dismiss && canClose(el)) {
        close(el);
        return;
      }
      if (!reducedMotion) {
        d.panel.style.transform = 'translateY(0)';
      }
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
