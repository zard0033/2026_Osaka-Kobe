// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const PAGE_URL = `file://${path.resolve(__dirname, '../index.html')}`;

const RATE_API = 'https://api.exchangerate-api.com/v4/latest/JPY';

function mockRate(page, twd) {
  return page.route(RATE_API, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ rates: { TWD: twd } }),
    })
  );
}

test.describe('匯率顯示', () => {
  test('正確格式：¥1 ≈ NT$X.XX', async ({ page }) => {
    await mockRate(page, 0.22);
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => {
      const el = document.getElementById('rate-display');
      return el && el.textContent.includes('NT$');
    });
    await expect(page.locator('#rate-display')).toHaveText('¥1 ≈ NT$0.22');
  });

  test('API 失敗時顯示「匯率取得失敗」', async ({ page }) => {
    await page.route(RATE_API, route => route.abort());
    await page.goto(PAGE_URL);
    await page.waitForFunction(
      () => document.getElementById('rate-display')?.textContent === '匯率取得失敗',
      { timeout: 5000 }
    );
    await expect(page.locator('#rate-display')).toHaveText('匯率取得失敗');
  });
});

test.describe('費用計算', () => {
  test('每個 Day 的費用 chip 套用匯率後為正整數', async ({ page }) => {
    await mockRate(page, 0.22);
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => {
      const el = document.getElementById('rate-display');
      return el && el.textContent.includes('NT$');
    });
    for (let d = 1; d <= 6; d++) {
      const chip = page.locator(`.day-chip-cost[data-day="${d}"]`);
      const text = await chip.textContent();
      const num = parseInt((text || '').replace(/[^0-9]/g, ''), 10);
      expect(num, `Day ${d} chip 應為正整數`).toBeGreaterThan(0);
    }
  });

  test('trip-total 等於 fixed-total + local-total', async ({ page }) => {
    await mockRate(page, 0.22);
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => {
      const el = document.getElementById('rate-display');
      return el && el.textContent.includes('NT$');
    });
    const parse = (id) => page.evaluate(id => {
      const el = document.getElementById(id);
      return el ? parseInt(el.textContent.replace(/[^0-9]/g, ''), 10) : 0;
    }, id);

    const fixed = await parse('fixed-total');
    const local = await parse('local-total');
    const trip  = await parse('trip-total');

    expect(fixed).toBeGreaterThan(0);
    expect(local).toBeGreaterThan(0);
    expect(trip).toBe(fixed + local);
  });

  test('匯率為 0 時不顯示費用（fallback 顯示失敗訊息）', async ({ page }) => {
    // rate=0 → !twd → failure path
    await mockRate(page, 0);
    await page.goto(PAGE_URL);
    await page.waitForFunction(
      () => document.getElementById('rate-display')?.textContent === '匯率取得失敗',
      { timeout: 5000 }
    );
    await expect(page.locator('#rate-display')).toHaveText('匯率取得失敗');
  });
});
