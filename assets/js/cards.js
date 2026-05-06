(function () {
  'use strict';

  if (typeof FTSession !== 'undefined') {
    if (!FTSession.isLoggedIn()) {
      window.location.replace('../index.html');
      return;
    }
    if (!FTSession.isOnboardingDone()) {
      window.location.replace('onboarding.html');
      return;
    }
  }

const $ = (id) => document.getElementById(id);
function haptic(t='light') { if(navigator.vibrate){const p={light:[8],medium:[18],error:[20,50,20]};navigator.vibrate(p[t]||[8]);} }

// Clock
(function(){const el=$('status-clock');if(!el)return;const n=new Date();el.textContent=n.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});})();

// ── Credit Cards Data (detalhes da fatura por índice) ───────
const ccData = [
  { amount: 'R$ 1.450,20', limitAvailable: 'R$ 3.550,00', limitPct: '29%', closing: '15 Mai', due: '22 Mai' },
  { amount: 'R$ 340,50', limitAvailable: 'R$ 8.000,00', limitPct: '4%', closing: '02 Mai', due: '10 Mai' },
  { amount: 'R$ 4.200,00', limitAvailable: 'R$ 1.800,00', limitPct: '70%', closing: '25 Mai', due: '05 Jun' }
];
function ensureCcData(index) {
  while (ccData.length <= index) {
    ccData.push(ccData[ccData.length % 3]);
  }
}

// Clonar cartões extras guardados no storage (além dos 3 do HTML)
(function appendExtraCards() {
  if (typeof FTCards === 'undefined') return;
  const list = FTCards.getAll();
  const track = $('cc-track');
  const dotHost = $('cc-dots');
  if (!track || !dotHost || list.length <= 3) return;
  const tpl = track.querySelector('.cc-card');
  if (!tpl) return;
  for (let i = 3; i < list.length; i++) {
    const c = list[i];
    const node = tpl.cloneNode(true);
    node.id = 'cc-' + i;
    node.dataset.index = String(i);
    node.classList.remove('active');
    const nm = node.querySelector('.cc-card-name');
    const num = node.querySelector('.cc-card-number');
    const inner = node.querySelector('.cc-card-inner');
    if (nm) nm.textContent = c.holderName || 'Titular';
    if (num) num.textContent = '**** **** **** ' + (c.last4 || '0000');
    if (inner) inner.style.setProperty('--card-bg', FTCards.gradients[c.brand] || FTCards.gradients.other);
    track.appendChild(node);
    const d = document.createElement('button');
    d.className = 'card-dot';
    d.dataset.dot = String(i);
    dotHost.appendChild(d);
  }
})();

// ── Horizontal Carousel Logic ───────────────────────────────
const track = $('cc-track');
const cards = Array.from(track.querySelectorAll('.cc-card'));
const dots = Array.from(document.querySelectorAll('#cc-dots .card-dot'));
let currentIndex = 0;
let startX = 0;
let isDragging = false;

function updateCCDetails(index) {
  ensureCcData(index);
  const data = ccData[index];
  $('cc-invoice-amount').textContent = data.amount;
  $('cc-limit-available').textContent = data.limitAvailable;
  $('cc-limit-fill').style.width = data.limitPct;
  
  const dates = document.querySelectorAll('.cc-date-val');
  if(dates.length >= 2) {
    dates[0].textContent = data.closing;
    dates[1].textContent = data.due;
  }
}

function setActiveCard(index) {
  if (index < 0 || index >= cards.length) return;
  
  cards.forEach((c, i) => {
    c.classList.remove('active');
    c.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease';
    dots[i].classList.remove('active');
    dots[i].setAttribute('aria-selected', 'false');
  });

  cards[index].classList.add('active');
  dots[index].classList.add('active');
  dots[index].setAttribute('aria-selected', 'true');

  cards.forEach((c, i) => {
    if (i < index) {
      // Cards swiped to the left (hidden)
      c.style.transform = `translateX(-100%) scale(0.9)`;
      c.style.zIndex = i;
      c.style.opacity = '0';
      c.style.pointerEvents = 'none';
    } else if (i > index) {
      // Cards peeking to the right
      const offset = (i - index) * 35; // px offset for each subsequent card
      const scale = 1 - ((i - index) * 0.08); // shrink slightly
      c.style.transform = `translateX(${offset}px) scale(${scale})`;
      c.style.zIndex = cards.length - i;
      c.style.opacity = 1 - ((i - index) * 0.2); // fade slightly
      c.style.pointerEvents = 'none'; // only active card is clickable
    } else {
      // Active card
      c.style.transform = 'translateX(0) scale(1)';
      c.style.zIndex = 10;
      c.style.opacity = '1';
      c.style.pointerEvents = 'auto';
    }
  });

  currentIndex = index;
  updateCCDetails(index);
  haptic('light');
}

// Touch events for horizontal swiping
track.addEventListener('touchstart', e => {
  startX = e.touches[0].clientX;
  isDragging = true;
  
  // Disable transition during drag
  cards.forEach(c => {
    c.style.transition = 'none';
  });
});

track.addEventListener('touchmove', e => {
  if (!isDragging) return;
  const deltaX = e.touches[0].clientX - startX;
  const activeCard = cards[currentIndex];
  
  // Dragging active card to the left
  if (deltaX < 0 && currentIndex < cards.length - 1) {
    activeCard.style.transform = `translateX(${deltaX}px)`;
    // The next card starts expanding
    const nextCard = cards[currentIndex + 1];
    const progress = Math.min(Math.abs(deltaX) / window.innerWidth, 1);
    const offset = 35 - (35 * progress);
    const scale = 0.92 + (0.08 * progress);
    nextCard.style.transform = `translateX(${offset}px) scale(${scale})`;
    nextCard.style.opacity = 0.8 + (0.2 * progress);
  } 
  // Dragging to the right (pulling previous card back)
  else if (deltaX > 0 && currentIndex > 0) {
    const prevCard = cards[currentIndex - 1];
    prevCard.style.opacity = Math.min(deltaX / 100, 1);
    const offset = -window.innerWidth + deltaX;
    prevCard.style.transform = `translateX(${offset > 0 ? 0 : offset}px) scale(1)`;
  }
});

track.addEventListener('touchend', e => {
  if (!isDragging) return;
  isDragging = false;
  const deltaX = e.changedTouches[0].clientX - startX;
  
  // Restore transitions
  cards.forEach(c => {
    c.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease';
  });

  if (deltaX < -50 && currentIndex < cards.length - 1) {
    setActiveCard(currentIndex + 1);
  } else if (deltaX > 50 && currentIndex > 0) {
    setActiveCard(currentIndex - 1);
  } else {
    setActiveCard(currentIndex); // snap back
  }
});

// Dot clicks
dots.forEach(dot => {
  dot.addEventListener('click', () => {
    const idx = parseInt(dot.dataset.dot);
    if(idx !== currentIndex) setActiveCard(idx);
  });
});

// Load Profile Name onto Cards
function loadProfileName() {
  const userStr = localStorage.getItem('ft_user');
  if(userStr) {
    try {
      const user = JSON.parse(userStr);
      if(user.name) {
        document.querySelectorAll('.cc-card-name').forEach(el => {
          el.textContent = user.name;
        });
      }
    } catch(e) {}
  }
}

// Init
setActiveCard(0);
loadProfileName();

const modal = $('add-card-modal');
document.querySelector('.add-card-btn-top')?.addEventListener('click', () => {
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
});
$('cc-add-cancel')?.addEventListener('click', () => {
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true');
});
modal?.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
});
$('cc-add-save')?.addEventListener('click', () => {
  const name = ($('cc-add-name')?.value || '').trim() || 'Titular';
  const last4 = ($('cc-add-last4')?.value || '').replace(/\D/g, '').slice(-4);
  if (last4.length !== 4) {
    alert('Informe os 4 últimos dígitos.');
    return;
  }
  const brand = $('cc-add-brand')?.value || 'other';
  FTCards.add({ holderName: name, last4, brand });
  modal?.classList.remove('open');
  location.reload();
});

if (window.FTNotifications) FTNotifications.bind('#notification-btn');

})();
