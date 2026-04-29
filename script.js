// ── Tab switching ──
const panels = document.querySelectorAll('.tab-panel');
const tabBtns = document.querySelectorAll('.tab-btn');
let currentTab = 0;

function switchTab(idx) {
  if (idx === currentTab) return;
  const goingBack = idx < currentTab;
  panels[currentTab].classList.remove('active', 'slide-back');
  if (goingBack) {
    panels[idx].classList.add('slide-back');
  } else {
    panels[idx].classList.remove('slide-back');
  }
  tabBtns.forEach((b, i) => {
    b.classList.toggle('active', i === idx);
    b.setAttribute('aria-selected', i === idx ? 'true' : 'false');
    b.setAttribute('tabindex', i === idx ? '0' : '-1');
  });
  currentTab = idx;
  panels[idx].classList.add('active');
  tabBtns[idx].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  window.scrollTo({ top: document.querySelector('.tabs-nav-wrapper').offsetTop, behavior: 'smooth' });
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
const mqMobile  = window.matchMedia('(max-width: 600px)');
let currentOpt = 0;
let optScrollLock = false;

function switchOption(idx, { scroll = false } = {}) {
  if (idx === currentOpt) return;
  currentOpt = idx;
  optPanels.forEach((p, i) => p.classList.toggle('active', i === idx));
  compCards.forEach((c, i) => c.classList.toggle('selected', i === idx));
  compDots.forEach((d, i) => d.classList.toggle('active', i === idx));
  if (scroll && compGrid && mqMobile.matches) {
    optScrollLock = true;
    compCards[idx].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    setTimeout(() => { optScrollLock = false; }, 450);
  }
}
// initialise selected state without animating
optPanels.forEach((p, i) => p.classList.toggle('active', i === 0));
compCards.forEach((c, i) => c.classList.toggle('selected', i === 0));
compDots.forEach((d, i) => d.classList.toggle('active', i === 0));

compCards.forEach((card, i) => card.addEventListener('click', () => switchOption(i, { scroll: true })));
compDots.forEach((dot, i)   => dot.addEventListener('click', () => switchOption(i, { scroll: true })));

// Mobile: auto-switch panel based on which card is centered after swipe
if (compGrid) {
  let scrollTimer;
  compGrid.addEventListener('scroll', () => {
    if (optScrollLock || !mqMobile.matches) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const gridRect = compGrid.getBoundingClientRect();
      const center = gridRect.left + gridRect.width / 2;
      let nearest = 0, best = Infinity;
      compCards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - center);
        if (d < best) { best = d; nearest = i; }
      });
      if (nearest !== currentOpt) switchOption(nearest);
    }, 90);
  }, { passive: true });
}

// ── Back to top ──
const backToTop = document.getElementById('backToTop');
window.addEventListener('scroll', () => {
  backToTop.classList.toggle('visible', window.scrollY > 300);
}, { passive: true });
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ── IntersectionObserver for scroll reveals ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const delay = el.classList.contains('tip-card')
        ? Array.from(document.querySelectorAll('.tip-card')).indexOf(el) * 80
        : 0;
      setTimeout(() => el.classList.add('visible'), delay);
      observer.unobserve(el);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.scroll-reveal, .tip-card').forEach(el => observer.observe(el));

// ── Hero auto-scroll to tab nav ──
(function () {
  const heroEl = document.querySelector('.hero');
  const navWrapper = document.querySelector('.tabs-nav-wrapper');
  let autoScrolled = false;
  let lastScrollY = 0;

  const heroObs = new IntersectionObserver((entries) => {
    const entry = entries[0];
    const scrollingDown = window.scrollY > lastScrollY;
    lastScrollY = window.scrollY;
    if (!entry.isIntersecting && scrollingDown && !autoScrolled) {
      autoScrolled = true;
      window.scrollTo({ top: navWrapper.offsetTop, behavior: 'smooth' });
    }
    if (entry.isIntersecting) {
      autoScrolled = false;
    }
  }, { threshold: 0.05 });

  heroObs.observe(heroEl);
})();

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
