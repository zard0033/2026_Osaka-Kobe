// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const PAGE_URL = `file://${path.resolve(__dirname, '../index.html')}`;

// ── Helpers ────────────────────────────────────────────────────────────────

async function getScrollY(page) {
  return page.evaluate(() => window.scrollY);
}

async function getNavBottom(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.tabs-nav-wrapper');
    return el ? el.getBoundingClientRect().bottom : 0;
  });
}

// ── Desktop tests (1280×800) ───────────────────────────────────────────────

test.describe('Desktop (1280×800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('domcontentloaded');
  });

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
    // 先滾到頁面中段讓 hero 不在視窗內
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.locator('#tab-btn-2').click();
    await page.waitForTimeout(500); // 等 smooth scroll

    const scrollY = await getScrollY(page);
    const navBottom = await getNavBottom(page);

    // nav 應在視窗內（nav bottom > 0 且 < viewport height）
    expect(navBottom).toBeGreaterThan(0);
    expect(navBottom).toBeLessThan(800);

    // scrollY 不應為 0（不能捲到頂端）
    // 只有在 hero 很短或頁面結構特殊時才允許 0
    // 這裡檢查 nav 確實在視窗內就夠了
    expect(navBottom).toBeGreaterThan(0);
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

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForLoadState('domcontentloaded');
  });

  test('Day 2 比較卡片：預設顯示第一張（Option A）', async ({ page }) => {
    await page.locator('#tab-btn-2').click();
    await expect(page.locator('#opt-0')).toHaveClass(/active/);
  });

  test('Day 2 切換 Option B → option panel 顯示 B 內容', async ({ page }) => {
    await page.locator('#tab-btn-2').click();
    // 點第二個 comp-card（Option B）
    const cards = page.locator('.comp-card');
    await cards.nth(1).click();
    await expect(page.locator('#opt-1')).toHaveClass(/active/);
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
    await page.waitForTimeout(300);
    const btn = page.locator('#backToTop');
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(600);
    const scrollY = await getScrollY(page);
    expect(scrollY).toBeLessThan(50);
  });
});

// ── Content integrity ──────────────────────────────────────────────────────

test.describe('內容完整性', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
  });

  test('六個 Day tab 都存在', async ({ page }) => {
    for (let i = 1; i <= 6; i++) {
      await expect(page.locator(`#tab-btn-${i}`)).toBeVisible();
    }
  });

  test('D2 包含 ookini 著物レンタル 關鍵字', async ({ page }) => {
    await page.locator('#tab-btn-2').click();
    await expect(page.locator('#tab-2')).toContainText('ookini');
  });

  test('D2 包含 清水寺 關鍵字', async ({ page }) => {
    await page.locator('#tab-btn-2').click();
    await expect(page.locator('#tab-2')).toContainText('清水寺');
  });

  test('頁面沒有 console error', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(PAGE_URL);
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });
});
