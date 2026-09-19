import { test } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = '/Users/deepikakumari/royalbookclub/frontend/public/help-screenshots';

test('fast captures', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });

  const capture = async (filename) => {
    await page.waitForTimeout(1500); 
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });
    console.log(`Saved ${filename}`);
  };

  // 1. SIGNUP POPUP
  await page.goto('http://localhost:3000/#/screenshot-factory?scene=onboarding_signup');
  await page.evaluate(() => sessionStorage.setItem('FORCE_ONBOARDING_MODE', 'signup'));
  await page.reload();
  await capture('03_onboarding_signup.png');

  // 2. CHECKOUT SUCCESS POPUP
  // I injected FORCE_CHECKOUT_SUCCESS into BookDetailPage.jsx
  await page.goto('http://localhost:3000/#/catalog');
  await page.evaluate(() => sessionStorage.setItem('FORCE_CHECKOUT_SUCCESS', 'true'));
  await page.reload();
  await page.locator('.book-card').first().click();
  await page.waitForSelector('.nfc-modal-overlay', { timeout: 10000 });
  await capture('11_checkout_success.png');
  await page.evaluate(() => sessionStorage.removeItem('FORCE_CHECKOUT_SUCCESS'));

  // 3. GATEPASS
  // I injected FORCE_GATEPASS_USER into GatepassPage.jsx
  await page.evaluate(() => sessionStorage.setItem('FORCE_GATEPASS_USER', 'true'));
  await page.route('**/api/v1/checkout/**', route => route.fulfill({
    json: {
      success: true,
      data: {
        id: 'test1234',
        bookId: 'b1',
        bookTitle: 'The Royal Gardens',
        memberEmail: 'test@example.com',
        status: 'CHECKED_OUT',
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        checkoutDate: new Date().toISOString()
      }
    }
  }));
  await page.route('**/api/v1/books/b1**', route => route.fulfill({
    json: {
      success: true,
      data: {
        id: 'b1',
        title: 'The Royal Gardens',
        coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300&h=440',
        authors: ['Royal Author']
      }
    }
  }));
  await page.goto('http://localhost:3000/#/gatepass/test1234');
  await capture('12_gatepass_page.png');
});
