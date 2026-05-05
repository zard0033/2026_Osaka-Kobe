// ── Tab switching ──
const panels = document.querySelectorAll('.tab-panel');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabsContainer = document.querySelector('.tabs-panels .container');
const mqMobile = window.matchMedia('(max-width: 600px)');
let currentTab = 0;

function syncMobileHeight() {
  if (!mqMobile.matches) return;
  const pos = tabsContainer.scrollLeft / tabsContainer.clientWidth;
  const i1 = Math.max(0, Math.floor(pos));
  const i2 = Math.min(panels.length - 1, i1 + 1);
  const frac = pos - i1;
  const h1 = panels[i1].scrollHeight;
  const h2 = panels[i2].scrollHeight;
  tabsContainer.style.height = Math.round(h1 + (h2 - h1) * frac) + 'px';
}

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
    syncMobileHeight();
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
  tabsContainer.addEventListener('scroll', syncMobileHeight, { passive: true });
}

// ── Mobile: sync container height on init and resize ──
syncMobileHeight();
mqMobile.addEventListener('change', () => {
  if (mqMobile.matches) syncMobileHeight();
  else tabsContainer.style.height = '';
});
window.addEventListener('resize', syncMobileHeight, { passive: true });

// ── Back to top ──
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 300);
}, { passive: true });
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ── IntersectionObserver for scroll reveals ──
const STAGGER_MS = 80;
const tipCards = [...document.querySelectorAll('.tip-card')];
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = tipCards.indexOf(entry.target);
      setTimeout(() => entry.target.classList.add('visible'), Math.max(idx, 0) * STAGGER_MS);
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

// ── Last updated timestamp ──
(function setLastUpdated() {
  const el = document.getElementById('last-updated');
  if (!el) return;
  const lm = document.lastModified; // "MM/DD/YYYY HH:MM:SS"
  if (!lm) return;
  const [datePart, timePart] = lm.split(' ');
  if (!datePart || !timePart) return;
  const [m, d, y] = datePart.split('/');
  const [h, min] = timePart.split(':');
  el.textContent = `${y}/${m}/${d} ${h}:${min}`;
}());

// ── Fetch helper: returns parsed JSON or null on any failure ──
const fetchJson = (url) =>
  fetch(url).then(r => r.ok ? r.json() : null).catch(() => null);

// ── Live exchange rate (exchangerate-api.com) ──
(function fetchRate() {
  fetchJson('https://api.exchangerate-api.com/v4/latest/JPY').then(data => {
    const twd = data?.rates?.TWD;
    if (!twd) return;
    const rate = twd.toFixed(2);
    const display = document.getElementById('rate-display');
    const footer  = document.getElementById('rate-footer');
    if (display) display.textContent = `¥1 ≈ NT$${rate}`;
    if (footer)  footer.textContent  = rate;
  });
}());

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
  // Open-Meteo free tier: max 15 days ahead. Cap end_date so the request never fails.
  const cap = new Date();
  cap.setDate(cap.getDate() + 15);
  const capStr = cap.toISOString().split('T')[0];
  const effectiveEnd = capStr < TRIP_END ? capStr : TRIP_END;

  fetchJson(
    `https://api.open-meteo.com/v1/forecast?latitude=34.6937&longitude=135.5023` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=Asia%2FTokyo&start_date=${TRIP_START}&end_date=${effectiveEnd}`
  ).then(data => {
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
