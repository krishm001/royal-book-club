import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = '/Users/deepikakumari/royalbookclub/frontend/public/help-screenshots';

test.describe('Help Screen Captures V3', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  const capture = async (page, filename) => {
    await page.waitForTimeout(1000); 
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });
    console.log(`Saved ${filename}`);
  };

  test('generate v3 screenshots', async ({ page }) => {
    // 2. Checkout In Progress (Book Detail Page)
    await page.goto('http://localhost:3000/#/catalog');
    await page.waitForSelector('.book-card', { timeout: 10000 });
    
    // Click first book card
    await page.locator('.book-card').first().click();
    
    // Wait for the detail page to load (it shows a checkout button)
    await page.waitForSelector('.checkout-cta-btn', { timeout: 10000 });
    
    await page.evaluate(() => {
      if (window.__E2E_OPEN_PROCESSING__) window.__E2E_OPEN_PROCESSING__();
    });
    await capture(page, '17_checkout_in_progress.png');
  });
});
