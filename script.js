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

// ── Mobile: sync tab buttons after native swipe ──
if (tabsContainer) {
  function syncTabFromScroll() {
    if (!mqMobile.matches) return;
    const nearest = Math.round(tabsContainer.scrollLeft / tabsContainer.clientWidth);
    if (nearest === currentTab || nearest < 0 || nearest >= panels.length) return;
    // Update UI state only — don't call switchTab() to avoid re-triggering scrollTo
    currentTab = nearest;
    tabBtns.forEach((b, i) => {
      b.classList.toggle('active', i === nearest);
      b.setAttribute('aria-selected', i === nearest ? 'true' : 'false');
      b.setAttribute('tabindex', i === nearest ? '0' : '-1');
    });
    tabBtns[nearest].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    syncMobileHeight();
  }
  // scrollend fires after snap animation completes — no mid-animation false positives.
  // Fallback for older browsers uses a 300ms delay so snap has time to settle.
  if ('onscrollend' in window) {
    tabsContainer.addEventListener('scrollend', syncTabFromScroll, { passive: true });
  } else {
    let swipeTimer;
    tabsContainer.addEventListener('scroll', () => {
      clearTimeout(swipeTimer);
      swipeTimer = setTimeout(syncTabFromScroll, 300);
    }, { passive: true });
  }
  tabsContainer.addEventListener('scroll', syncMobileHeight, { passive: true });
}

// ── Mobile: sync container height on init and resize ──
syncMobileHeight();
mqMobile.addEventListener('change', () => {
  if (mqMobile.matches) syncMobileHeight();
  else tabsContainer.style.height = '';
});
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(syncMobileHeight, 16);
}, { passive: true });

// 監聽 panel 高度變化（details 展開、transit-detail 展開等）→ 重新同步容器高度，
// 否則容器高度凍結，展開後的內容會被 footer 蓋住。
if (window.ResizeObserver) {
  const ro = new ResizeObserver(() => syncMobileHeight());
  panels.forEach(p => ro.observe(p));
}

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
  const display = document.getElementById('rate-display');
  const footer  = document.getElementById('rate-footer');
  fetchJson('https://api.exchangerate-api.com/v4/latest/JPY').then(data => {
    const twd = data?.rates?.TWD;
    if (!twd) {
      if (display) display.textContent = '匯率取得失敗';
      return;
    }
    const rate = Math.round(twd * 100) / 100;
    if (display) display.textContent = `¥1 ≈ NT$${rate.toFixed(2)}`;
    if (footer)  footer.textContent  = rate.toFixed(2);
    updateAllCosts(rate);
  });
}());

function updateAllCosts(rate) {
  const fmt = n => 'NT$' + Math.round(n).toLocaleString();
  document.querySelectorAll('.jpy-amt[data-jpy]').forEach(el => {
    el.textContent = fmt(+el.dataset.jpy * rate);
  });
  const cats = { meal: 0, transit: 0, attraction: 0, usj: 0, haruka: 0 };
  let daySum = 0;
  for (let d = 1; d <= 6; d++) {
    const panel = document.getElementById(`tab-${d}`);
    if (!panel) continue;
    let dayJpy = 0, dayNtd = 0;
    panel.querySelectorAll('[data-jpy]').forEach(el => {
      const v = +el.dataset.jpy;
      dayJpy += v;
      const cat = el.dataset.cat;
      if (cat in cats) cats[cat] += Math.round(v * rate);
    });
    panel.querySelectorAll('[data-ntd]').forEach(el => {
      const v = +el.dataset.ntd;
      dayNtd += v;
      const cat = el.dataset.cat;
      if (cat in cats) cats[cat] += v;
    });
    const dayTotal = Math.round(dayJpy * rate) + dayNtd;
    daySum += dayTotal;
    const chip = document.querySelector(`.day-chip-cost[data-day="${d}"]`);
    if (chip) chip.textContent = fmt(dayTotal);
  }
  const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = fmt(val); };
  setEl('ovr-meals', cats.meal);
  setEl('ovr-transit-metro', cats.transit);
  setEl('ovr-transit-haruka', cats.haruka);
  setEl('ovr-transit', cats.transit + cats.haruka);
  setEl('ovr-attractions', cats.attraction);
  setEl('ovr-usj', cats.usj);
  // Read fixed costs from tab-0 DOM to avoid hardcoded duplication
  const tab0 = document.getElementById('tab-0');
  let fixedTotal = 0, miscTotal = 0, fixedTransit = 0;
  if (tab0) {
    tab0.querySelectorAll('.fixed-cost[data-ntd]').forEach(el => {
      const v = +el.dataset.ntd;
      fixedTotal += v;
      if (el.dataset.cat === 'misc')    miscTotal    += v;
      if (el.dataset.cat === 'transit') fixedTransit += v;
    });
    tab0.querySelectorAll('.fixed-cost[data-jpy]').forEach(el => {
      const v = Math.round(+el.dataset.jpy * rate);
      fixedTotal += v;
      if (el.dataset.cat === 'misc')    miscTotal    += v;
      if (el.dataset.cat === 'transit') fixedTransit += v;
    });
  }
  setEl('fixed-misc-total', miscTotal);
  setEl('fixed-total', fixedTotal);
  const shopping  = Math.round(23000 * rate);
  const localTotal = daySum + shopping;
  setEl('local-total', localTotal);
  const tripTotal = fixedTotal + localTotal;
  setEl('trip-total', tripTotal);
  const budgetEl = document.querySelector('.ov-stat-hi .ov-val');
  if (budgetEl) budgetEl.textContent = fmt(tripTotal);
  const holeEl = document.getElementById('pie-hole-amt');
  if (holeEl) holeEl.innerHTML = 'NT$<br>' + Math.round(tripTotal).toLocaleString();
  updatePie(cats, shopping, miscTotal, fixedTransit, tripTotal);
}


function updatePie(cats, shopping, misc, fixedTransit, total) {
  const flights = 12500, hotel = 6463;
  const transit = fixedTransit + cats.transit + cats.haruka;
  const COLORS  = ['#99463A','#D4895F','#C4A882','#6E2B22','#D4B896','#A0785A','#8B6355','#CFBFB5'];
  const LABELS  = ['機票','餐飲','住宿','USJ','購物','交通','雜費','景點'];
  const IDS     = ['flights','meals','hotel','usj','shopping','transit','misc','attractions'];
  const amts    = [flights, cats.meal, hotel, cats.usj, shopping, transit, misc, cats.attraction];
  const pct     = amt => total > 0 ? (amt / total) * 100 : 0;
  let cum = 0;
  const stops = amts.map((amt, i) => {
    const p = pct(amt);
    const stop = `${COLORS[i]} ${cum.toFixed(1)}% ${(cum + p).toFixed(1)}%`;
    cum += p;
    return stop;
  }).join(', ');
  const pieEl = document.querySelector('.pie-chart');
  if (pieEl) pieEl.style.background = `conic-gradient(${stops})`;
  amts.forEach((amt, i) => {
    const el = document.getElementById(`pie-${IDS[i]}`);
    if (el) el.textContent = `${LABELS[i]} ${pct(amt).toFixed(1)}%`;
  });
}

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
        if (weather_code[i] == null || temperature_2m_max[i] == null) continue;
        const panel = document.getElementById(`tab-${i + 1}`);
        if (!panel) continue;
        const weatherEl = panel.querySelector('.day-weather-main');
        const rainEl    = panel.querySelector('.day-rain');
        if (!weatherEl || !rainEl) continue;
        const emoji = WMO_EMOJI[weather_code[i]] ?? '🌤️';
        const hi    = Math.round(temperature_2m_max[i]);
        const lo    = Math.round(temperature_2m_min[i] ?? temperature_2m_max[i]);
        const rain  = precipitation_probability_max[i] ?? 0;
        weatherEl.textContent = `${emoji} ${hi}°C `;
        const loSpan = document.createElement('span');
        loSpan.className = 'day-weather-lo';
        loSpan.textContent = `/ ${lo}°C`;
        weatherEl.appendChild(loSpan);
        rainEl.textContent = `💧 ${rain}%`;
      }
    });
}());
