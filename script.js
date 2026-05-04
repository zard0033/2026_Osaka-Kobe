// ── Tab switching ──
const panels = document.querySelectorAll('.tab-panel');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabsContainer = document.querySelector('.tabs-panels .container');
const mqMobile = window.matchMedia('(max-width: 600px)');
let currentTab = 0;

function switchTab(idx) {
  if (idx === currentTab) return;
  const goingBack = idx < currentTab;

  tabBtns.forEach((b, i) => {
    b.classList.toggle('active', i === idx);
    b.setAttribute('aria-selected', i === idx ? 'true' : 'false');
    b.setAttribute('tabindex', i === idx ? '0' : '-1');
  });
  tabBtns[idx].scrollIntoView({ block: 'nearest', inline: 'nearest' });

  if (mqMobile.matches) {
    // Mobile: native scroll-snap handles the visual transition
    currentTab = idx;
    tabsContainer.scrollTo({ left: idx * tabsContainer.clientWidth, behavior: 'smooth' });
    return;
  }

  // Desktop: CSS slide animation
  const outgoing = panels[currentTab];
  if (goingBack) outgoing.classList.add('go-back');
  outgoing.classList.add('tab-leaving');
  outgoing.classList.remove('active');
  onAnimEnd(outgoing, () => outgoing.classList.remove('tab-leaving', 'go-back'));

  const incoming = panels[idx];
  if (goingBack) incoming.classList.add('go-back');
  incoming.classList.add('active');
  onAnimEnd(incoming, () => incoming.classList.remove('go-back'));

  currentTab = idx;
  window.scrollTo({ top: document.querySelector('.tabs-nav-wrapper').offsetTop, behavior: 'instant' });
}

// ── Keyboard navigation for tabs ──
document.querySelector('.tabs-nav').addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const count = tabBtns.length;
  let next = currentTab;
  if (e.key === 'ArrowRight') next = (currentTab + 1) % count;
  if (e.key === 'ArrowLeft') next = (currentTab - 1 + count) % count;
  if (e.key === 'Home') next = 0;
  if (e.key === 'End') next = count - 1;
  switchTab(next);
  tabBtns[next].focus();
});

// ── Tab bar scroll fade ──
const tabsNav = document.querySelector('.tabs-nav');
const tabsNavContainer = document.querySelector('.tabs-nav-wrapper .container');
tabsNav.addEventListener('scroll', () => {
  const atEnd = tabsNav.scrollLeft + tabsNav.clientWidth >= tabsNav.scrollWidth - 4;
  tabsNavContainer.classList.toggle('scrolled-end', atEnd);
}, { passive: true });

// ── Option sub-tabs (Day 2) ──
const optPanels = document.querySelectorAll('.option-panel');
const compCards = document.querySelectorAll('.comp-card');
const compDots  = document.querySelectorAll('.comp-dot');
const compGrid  = document.querySelector('.comparison-grid');
let currentOpt = -1;
let optScrollLock = false;

function switchOption(idx, { scroll = false } = {}) {
  if (idx === currentOpt) return;
  currentOpt = idx;
  optPanels.forEach((p, i) => p.classList.toggle('active', i === idx));
  compCards.forEach((c, i) => c.classList.toggle('selected', i === idx));
  compDots.forEach((d, i) => {
    d.classList.toggle('active', i === idx);
    d.setAttribute('aria-selected', i === idx ? 'true' : 'false');
  });
  if (scroll && compGrid && mqMobile.matches) {
    optScrollLock = true;
    const card = compCards[idx];
    const gridRect = compGrid.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const delta = (cardRect.left + cardRect.width / 2) - (gridRect.left + gridRect.width / 2);
    compGrid.scrollBy({ left: delta, behavior: 'smooth' });
    // Prevent the browser's focus-scroll from nudging the outer tab container
    requestAnimationFrame(() => {
      tabsContainer.scrollLeft = currentTab * tabsContainer.clientWidth;
    });
    setTimeout(() => { optScrollLock = false; }, 450);
  }
}
switchOption(0);

compCards.forEach((card, i) => card.addEventListener('click', () => switchOption(i, { scroll: true })));
compDots.forEach((dot, i)   => dot.addEventListener('click', () => switchOption(i, { scroll: true })));

function onAnimEnd(el, fn) {
  let done = false;
  const run = () => { if (!done) { done = true; fn(); } };
  el.addEventListener('animationend', run, { once: true });
  setTimeout(run, 400);
}

function onScrollSettled(el, fn, delay = 50) {
  el.addEventListener('scrollend', fn, { passive: true });
  let timer;
  el.addEventListener('scroll', () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  }, { passive: true });
}

// Mobile: auto-switch panel based on which card is centered after swipe
if (compGrid) {
  function syncOptFromScroll() {
    if (optScrollLock || !mqMobile.matches) return;
    const gridRect = compGrid.getBoundingClientRect();
    const center = gridRect.left + gridRect.width / 2;
    let nearest = 0, best = Infinity;
    compCards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - center);
      if (d < best) { best = d; nearest = i; }
    });
    if (nearest !== currentOpt) switchOption(nearest);
  }
  onScrollSettled(compGrid, syncOptFromScroll);
}

// ── Mobile: sync tab buttons after native swipe ──
if (tabsContainer) {
  function syncTabFromScroll() {
    if (!mqMobile.matches) return;
    const nearest = Math.round(tabsContainer.scrollLeft / tabsContainer.clientWidth);
    if (nearest !== currentTab && nearest >= 0 && nearest < panels.length) {
      switchTab(nearest);
    }
  }
  onScrollSettled(tabsContainer, syncTabFromScroll);
}

// ── Back to top ──
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 300);
}, { passive: true });
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ── IntersectionObserver for scroll reveals ──
const tipCards = [...document.querySelectorAll('.tip-card')];
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = tipCards.indexOf(entry.target);
      setTimeout(() => entry.target.classList.add('visible'), Math.max(idx, 0) * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.scroll-reveal, .tip-card').forEach(el => observer.observe(el));

// ── Transit connectors ──
document.querySelectorAll('.tl-transit-btn').forEach(btn => {
  const detail = btn.nextElementSibling;
  btn.addEventListener('click', () => {
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      detail.classList.add('closing');
      onAnimEnd(detail, () => {
        detail.classList.remove('open', 'closing');
        btn.setAttribute('aria-expanded', 'false');
      });
    } else {
      btn.setAttribute('aria-expanded', 'true');
      detail.classList.add('open');
    }
  });
});


// ── Mobile swipe to switch tabs ──
(function () {
  const panelsEl = document.querySelector('.tabs-panels');
  let startX = 0, startY = 0;
  const THRESHOLD = 50;

  panelsEl.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  panelsEl.addEventListener('touchend', e => {
    if (mqMobile.matches) return;
    if (e.target.closest('.comparison-grid')) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;
    const next = dx < 0 ? currentTab + 1 : currentTab - 1;
    if (next < 0 || next >= tabBtns.length) return;
    switchTab(next);
    tabBtns[next].focus();
  }, { passive: true });
})();

const hotelNearbyTpl = document.getElementById('hotel-nearby-tpl');
document.querySelectorAll('.hotel-nearby').forEach(el =>
  el.appendChild(hotelNearbyTpl.content.cloneNode(true))
);

// ── Live weather (Open-Meteo) ──
(function fetchWeather() {
  const WMO_EMOJI = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌧️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '🌨️',
    80: '🌦️', 81: '🌦️', 82: '🌧️',
    95: '⛈️', 96: '⛈️', 99: '⛈️',
  };
  const TRIP_START = '2026-05-16';
  const TRIP_END   = '2026-05-21';

  fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=34.6937&longitude=135.5023` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=Asia%2FTokyo&start_date=${TRIP_START}&end_date=${TRIP_END}`
  )
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
    .then(data => {
      if (!data?.daily) return;
      const { weather_code, temperature_2m_max, temperature_2m_min, precipitation_probability_max } = data.daily;
      for (let i = 0; i < 6; i++) {
        const panel = document.getElementById(`tab-${i + 1}`);
        if (!panel) continue;
        const weatherEl = panel.querySelector('.day-weather-main');
        const rainEl    = panel.querySelector('.day-rain');
        if (!weatherEl || !rainEl) continue;
        const emoji = WMO_EMOJI[weather_code[i]] ?? '🌤️';
        const hi    = Math.round(temperature_2m_max[i]);
        const lo    = Math.round(temperature_2m_min[i]);
        const rain  = precipitation_probability_max[i] ?? 0;
        weatherEl.innerHTML = `${emoji} ${hi}°C <span class="day-weather-lo">/ ${lo}°C</span>`;
        rainEl.textContent  = `💧 ${rain}%`;
      }
    });
}());
