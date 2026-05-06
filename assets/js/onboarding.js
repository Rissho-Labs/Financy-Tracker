(function () {
  'use strict';

  if (typeof FTSession !== 'undefined') {
    if (!FTSession.isLoggedIn()) {
      window.location.replace('register.html');
      return;
    }
    if (FTSession.isOnboardingDone()) {
      window.location.replace('home.html');
      return;
    }
  }

const $ = (id) => document.getElementById(id);
function haptic(t='light') { if(navigator.vibrate){const p={light:[8],medium:[18],error:[20,50,20]};navigator.vibrate(p[t]||[8]);} }
function fmt(n) { return new Intl.NumberFormat('pt-BR').format(n); }
function fmtCurrency(n) { return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n); }

// Clock
(function(){const el=$('status-clock');if(!el)return;const n=new Date();el.textContent=n.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});})();

// ── State ─────────────────────────────────────────────────────
const state = {
  currentStep: 1,
  totalSteps: 2, // 2 base, becomes 3 if goal selected
  budget: 3000,
  motivation: null,
  goal: { name:'', value:0, start:'', end:'' }
};

// ── Progress ──────────────────────────────────────────────────
function updateProgress() {
  const pct = (state.currentStep / state.totalSteps) * 100;
  $('ob-progress-fill').style.width = pct + '%';
  $('ob-step-label').textContent = `Passo ${state.currentStep} de ${state.totalSteps}`;
}

// ── Step navigation ───────────────────────────────────────────
function goToStep(next) {
  const curr = $(`step-${state.currentStep}`);
  const target = $(`step-${next}`);
  if (!curr || !target) return;

  const goingForward = next > state.currentStep;

  curr.classList.add(goingForward ? 'ob-step--exit' : 'ob-step--hidden');
  curr.classList.remove('ob-step--hidden', 'ob-step--exit');

  if (goingForward) {
    curr.style.transform = 'translateX(-100%)';
    curr.style.opacity = '0';
  } else {
    curr.style.transform = 'translateX(100%)';
    curr.style.opacity = '0';
  }
  curr.style.pointerEvents = 'none';

  target.classList.remove('ob-step--hidden', 'ob-step--exit');
  target.style.transform = goingForward ? 'translateX(100%)' : 'translateX(-100%)';
  target.style.opacity = '0';
  target.style.pointerEvents = '';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.style.transition = 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease';
      target.style.transform = 'translateX(0)';
      target.style.opacity = '1';
    });
  });

  state.currentStep = next;
  updateProgress();
  updateNavButtons();
  haptic('light');
}

function updateNavButtons() {
  const backBtn = $('ob-back-btn');
  const nextBtn = $('ob-next-btn');
  const nextLabel = $('ob-next-label');
  const nextIcon = $('ob-next-icon');

  // Back visibility
  backBtn.classList.toggle('hidden', state.currentStep === 1);

  // Next label
  if (state.currentStep === state.totalSteps) {
    nextLabel.textContent = 'Começar';
    nextIcon.style.display = 'none';
  } else {
    nextLabel.textContent = 'Continuar';
    nextIcon.style.display = '';
  }
}

// ── STEP 1: Budget slider ─────────────────────────────────────
const slider = $('budget-slider');
const budgetDisplay = $('budget-display');
const budgetDaily = $('budget-daily');

function updateBudgetDisplay(val) {
  state.budget = val;
  budgetDisplay.textContent = fmt(val);
  budgetDaily.textContent = fmtCurrency(Math.round(val / 30));
  slider.setAttribute('aria-valuenow', val);
  // Color gradient based on value
  const pct = ((val - 500) / (30000 - 500)) * 100;
  slider.style.background = `linear-gradient(90deg, var(--accent) ${pct}%, rgba(255,255,255,0.08) ${pct}%)`;
  // Highlight matching preset
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.value) === val);
  });
}

slider.addEventListener('input', () => { updateBudgetDisplay(Number(slider.value)); haptic('light'); });
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = Number(btn.dataset.value);
    slider.value = v;
    updateBudgetDisplay(v);
    haptic('light');
  });
});
// Init
updateBudgetDisplay(3000);

// ── STEP 2: Motivation selector ───────────────────────────────
document.querySelectorAll('.motivation-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.motivation-card').forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-checked', 'false');
    });
    card.classList.add('selected');
    card.setAttribute('aria-checked', 'true');
    state.motivation = card.dataset.motivation;
    $('motivation-error').textContent = '';
    $('motivation-error').classList.remove('visible');

    // If goal selected, add step 3
    if (state.motivation === 'goal') {
      state.totalSteps = 3;
    } else {
      state.totalSteps = 2;
    }
    updateProgress();
    haptic('light');
  });
});

// ── STEP 3: Goal form calculation ────────────────────────────
function recalcGoal() {
  const val   = parseFloat($('goal-value').value) || 0;
  const start = $('goal-start').value;
  const end   = $('goal-end').value;
  const calc  = $('goal-calc');
  const monthly = $('goal-monthly-save');

  if (val > 0 && start && end) {
    const s = new Date(start), e = new Date(end);
    const months = Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
    const perMonth = val / months;
    monthly.textContent = fmtCurrency(perMonth) + '/mês';
    calc.removeAttribute('data-empty');
  } else {
    monthly.textContent = '—';
    calc.setAttribute('data-empty', 'true');
  }
}

['goal-value','goal-start','goal-end'].forEach(id => {
  $(id)?.addEventListener('input', recalcGoal);
  $(id)?.addEventListener('change', recalcGoal);
});

// Set default dates (calendário nativo: ano / mês / dia)
(function(){
  const t0 = new Date();
  const todayStr = t0.toISOString().split('T')[0];
  const t1 = new Date(t0.getTime());
  t1.setFullYear(t1.getFullYear() + 1);
  const yearLater = t1.toISOString().split('T')[0];
  const gs = $('goal-start'), ge = $('goal-end');
  if (gs) {
    gs.value = todayStr;
    gs.min = todayStr;
    gs.addEventListener('change', function () {
      if (ge && ge.value && ge.value < gs.value) ge.value = gs.value;
      if (ge) ge.min = gs.value;
    });
  }
  if (ge) {
    ge.value = yearLater;
    ge.min = todayStr;
  }
  recalcGoal();
})();

// Orçamento: valor manual (fora do intervalo da barra)
(function budgetManual() {
  const wrap = $('budget-manual-wrap');
  const toggle = $('budget-edit-toggle');
  const inp = $('budget-manual-input');
  const apply = $('budget-manual-apply');
  if (!toggle || !wrap || !inp || !apply) return;
  toggle.addEventListener('click', function () {
    const open = !wrap.classList.contains('is-visible');
    wrap.classList.toggle('is-visible', open);
    if (open) {
      inp.value = String(state.budget || 3000);
      inp.focus();
    }
  });
  apply.addEventListener('click', function () {
    let v = parseInt(inp.value, 10);
    if (Number.isNaN(v)) return;
    v = Math.min(30000, Math.max(500, v));
    $('budget-slider').value = String(v);
    updateBudgetDisplay(v);
    wrap.classList.remove('is-visible');
  });
})();

// ── Back button ───────────────────────────────────────────────
$('ob-back-btn').addEventListener('click', () => {
  if (state.currentStep > 1) goToStep(state.currentStep - 1);
});

// ── Next button ───────────────────────────────────────────────
$('ob-next-btn').addEventListener('click', async () => {
  if (state.currentStep === 1) {
    goToStep(2);
  }
  else if (state.currentStep === 2) {
    if (!state.motivation) {
      const err = $('motivation-error');
      err.textContent = 'Por favor, selecione uma opção.';
      err.classList.add('visible');
      haptic('error');
      return;
    }
    if (state.motivation === 'goal') {
      goToStep(3);
    } else {
      await finishOnboarding();
    }
  }
  else if (state.currentStep === 3) {
    // Validate goal form
    let valid = true;
    const name = $('goal-name').value.trim();
    const val  = parseFloat($('goal-value').value);
    const start = $('goal-start').value;
    const end   = $('goal-end').value;

    if (!name) { showFieldErr('goal-name','goal-name-error','Informe o nome do objetivo.'); valid=false; }
    if (!val || val <= 0) { showFieldErr('goal-value','goal-value-error','Informe um valor.'); valid=false; }
    if (!start) { showFieldErr('goal-start','goal-start-error','Selecione a data de início.'); valid=false; }
    if (!end || end <= start) { showFieldErr('goal-end','goal-end-error','Data de conclusão inválida.'); valid=false; }

    if (!valid) { haptic('error'); return; }

    state.goal = { name, value: val, start, end };
    await finishOnboarding();
  }
});

function showFieldErr(fieldId, errId, msg) {
  const f = $(fieldId), e = $(errId);
  if (!f || !e) return;
  f.classList.add('error');
  e.textContent = msg;
  e.classList.add('visible');
}

async function finishOnboarding() {
  const btn = $('ob-next-btn');
  btn.classList.add('loading');
  btn.disabled = true;
  haptic('medium');

  // Save profile data
  const profile = {
    budget: state.budget,
    motivation: state.motivation,
    goal: state.motivation === 'goal' ? state.goal : null,
    onboardingComplete: true,
    completedAt: new Date().toISOString()
  };
  const existing = JSON.parse(localStorage.getItem('ft_user') || '{}');
  localStorage.setItem('ft_user', JSON.stringify({ ...existing, ...profile }));
  localStorage.setItem('ft_onboarding_done', '1');

  await new Promise(r => setTimeout(r, 1200));
  window.location.href = 'home.html';
}

// Init UI
updateProgress();
updateNavButtons();

})();
