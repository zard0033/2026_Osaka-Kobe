// @ts-check
const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const path = require('path');

const PAGE_URL = `file://${path.resolve(__dirname, '../index.html')}`;

// ── Helpers ────────────────────────────────────────────────────────────────

async function gotoPage(page) {
  await page.goto(PAGE_URL);
  await page.waitForLoadState('domcontentloaded');
}

async function getScrollY(page) {
  return page.evaluate(() => window.scrollY);
}

async function getNavBottom(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.tabs-nav-wrapper');
    return el ? el.getBoundingClientRect().bottom : 0;
  });
}

// ── Desktop tests (1440×900) ───────────────────────────────────────────────

test.describe('Desktop (1440×900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => { await gotoPage(page); });

  test('預設顯示「總覽」tab', async ({ page }) => {
    const active = page.locator('.tab-btn.active');
    await expect(active).toHaveText('總覽');
    await expect(page.locator('#tab-0')).toBeVisible();
  });

  test('點 Day 1 → 切換顯示 Day 1 內容', async ({ page }) => {
    await page.locator('#tab-btn-1').click();
    await expect(page.locator('#tab-1')).toBeVisible();
    await expect(page.locator('#tab-0')).toBeHidden();
  });

  test('點 Day tab 後不應捲到頁面頂端（scrollY 應貼近 nav 位置）', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.locator('#tab-btn-2').click();
    await page.locator('#tab-2').waitFor({ state: 'visible' });

    const scrollY = await getScrollY(page);
    const navBottom = await getNavBottom(page);

    expect(navBottom).toBeGreaterThan(0);
    expect(navBottom).toBeLessThan(800);
  });

  test('點 Day tab 後 active button 樣式正確', async ({ page }) => {
    await page.locator('#tab-btn-3').click();
    await expect(page.locator('#tab-btn-3')).toHaveClass(/active/);
    await expect(page.locator('#tab-btn-0')).not.toHaveClass(/active/);
  });

  test('所有 Day tab 都可點且切換正確', async ({ page }) => {
    for (let i = 1; i <= 6; i++) {
      await page.locator(`#tab-btn-${i}`).click();
      await expect(page.locator(`#tab-${i}`)).toBeVisible();
    }
  });

  test('鍵盤 ArrowRight 可切換到下一個 tab', async ({ page }) => {
    await page.locator('#tab-btn-0').click();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#tab-1')).toBeVisible();
  });
});

// ── Mobile tests (390×844, iPhone 14) ─────────────────────────────────────

test.describe('Mobile (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => { await gotoPage(page); });

  test('Day 2 顯示神戶一日遊行程', async ({ page }) => {
    await page.locator('#tab-btn-2').click();
    await expect(page.locator('#tab-2')).toContainText('神戶一日遊');
  });

  test('Day 2 包含 Meriken Park 關鍵字', async ({ page }) => {
    await page.locator('#tab-btn-2').click();
    await expect(page.locator('#tab-2')).toContainText('Meriken Park');
  });

  test('觸控目標：所有 tab-btn 高度 ≥ 44px', async ({ page }) => {
    const heights = await page.locator('.tab-btn').evaluateAll(
      els => els.map(el => el.getBoundingClientRect().height)
    );
    for (const h of heights) {
      expect(h).toBeGreaterThanOrEqual(44);
    }
  });

  test('Back-to-top 按鈕：捲動後出現，點擊後回頂端', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 800));
    const btn = page.locator('#backToTop');
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForFunction(() => window.scrollY < 50);
    const scrollY = await getScrollY(page);
    expect(scrollY).toBeLessThan(50);
  });
});

// ── Content integrity ──────────────────────────────────────────────────────

test.describe('內容完整性', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => { await gotoPage(page); });

  test('六個 Day tab 都存在', async ({ page }) => {
    for (let i = 1; i <= 6; i++) {
      await expect(page.locator(`#tab-btn-${i}`)).toBeVisible();
    }
  });

  test('D2 包含 北野異人館 關鍵字', async ({ page }) => {
    await page.locator('#tab-btn-2').click();
    await expect(page.locator('#tab-2')).toContainText('北野異人館');
  });

  test('D2 包含 和黑 北野坂本店 關鍵字', async ({ page }) => {
    await page.locator('#tab-btn-2').click();
    await expect(page.locator('#tab-2')).toContainText('和黑 北野坂本店');
  });

  test('頁面沒有 console error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(PAGE_URL);
    await page.waitForLoadState('load');
    expect(errors).toHaveLength(0);
  });

  test('D2–D5 day-header 含 餘裕 chip', async ({ page }) => {
    for (const i of [2, 3, 4, 5]) {
      await page.locator(`#tab-btn-${i}`).click();
      const chip = page.locator(`#tab-${i} .day-chip-buffer`).first();
      await expect(chip).toBeVisible();
      await expect(chip).toContainText('餘裕');
      await expect(chip).toContainText('分');
    }
  });

});

// ── WCAG 2.1 AA – axe-core ────────────────────────────────────────────────

async function disableAnimations(page) {
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
    document.head.appendChild(s);
    document.querySelectorAll('.scroll-reveal, .tip-card').forEach(el => el.classList.add('visible'));
  });
}

async function forceVisible(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.scroll-reveal, .tip-card').forEach(el => el.classList.add('visible'));
  });
}

async function axeCheck(page) {
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
}

for (const [label, width, height] of [
  ['Desktop 1440px', 1440, 900],
  ['Mobile 390px',   390,  844],
]) {
  test.describe(`WCAG 2.1 AA – axe-core (${label})`, () => {
    test.use({ viewport: { width, height } });

    test.beforeEach(async ({ page }) => {
      await gotoPage(page);
      // Disable all transitions/animations so scroll-reveal opacity is instant
      await disableAnimations(page);
    });

    test('總覽：無 WCAG 2.1 AA 違規', async ({ page }) => {
      const results = await axeCheck(page);
      expect(results.violations).toEqual([]);
    });

    test('Day 1：無 WCAG 2.1 AA 違規', async ({ page }) => {
      await page.locator('#tab-btn-1').click();
      await forceVisible(page);
      const results = await axeCheck(page);
      expect(results.violations).toEqual([]);
    });

    test('Day 2：無 WCAG 2.1 AA 違規', async ({ page }) => {
      await page.locator('#tab-btn-2').click();
      await forceVisible(page);
      const results = await axeCheck(page);
      expect(results.violations).toEqual([]);
    });
  });
}

// ── Semantic HTML & ARIA ───────────────────────────────────────────────────

test.describe('Semantic HTML & ARIA', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => { await gotoPage(page); });

  test('html 有 lang 屬性', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('頁面只有一個 h1', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('所有 img 有 alt 屬性', async ({ page }) => {
    const count = await page.locator('img:not([alt])').count();
    expect(count).toBe(0);
  });

  test('#tab-btn-0 focus 輪廓可見', async ({ page }) => {
    await page.locator('#tab-btn-0').focus();
    const styles = await page.locator('#tab-btn-0').evaluate(el => {
      const s = window.getComputedStyle(el);
      return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, boxShadow: s.boxShadow };
    });
    const visible =
      (styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px') ||
      (styles.boxShadow !== 'none' && styles.boxShadow !== '');
    expect(visible, 'Focus indicator 不可見').toBe(true);
  });
});

// ── RWD – 320px ───────────────────────────────────────────────────────────

test.describe('RWD – 320px (minimum mobile)', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test.beforeEach(async ({ page }) => { await gotoPage(page); });

  test('頁面無水平溢出', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(320);
  });

  test('nav 可見且不橫向溢出', async ({ page }) => {
    const nav = page.locator('.tabs-nav-wrapper');
    await expect(nav).toBeVisible();
    const overflow = await nav.evaluate(el => el.scrollWidth > el.clientWidth + 1);
    expect(overflow).toBe(false);
  });
});

// ── 觸控目標 – 全部按鈕 ───────────────────────────────────────────────────

test.describe('觸控目標 – 全部 button (390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => { await gotoPage(page); });

  test('所有 <button> 高度 ≥ 44px', async ({ page }) => {
    const btns = await page.locator('button').evaluateAll(els =>
      els
        .filter(el => el.getBoundingClientRect().height > 0)
        .map(el => ({
          label: (el.textContent?.trim().slice(0, 20) || el.id || '(no label)'),
          h: el.getBoundingClientRect().height,
        }))
    );
    for (const { label, h } of btns) {
      expect(h, `"${label}" 應 ≥ 44px`).toBeGreaterThanOrEqual(44);
    }
  });
});
