import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/deepikakumari/royalbookclub/frontend/public/help-screenshots';

test.describe('Help Screen Captures Real - Fixes', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  const capture = async (page, filename) => {
    await page.waitForTimeout(2000); 
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });
    console.log(`Saved ${filename}`);
  };

  test('generate fixes', async ({ page }) => {
    // 03 Signup
    await page.goto('http://localhost:3000/#/catalog');
    await page.evaluate(() => {
        sessionStorage.setItem('FORCE_ONBOARDING_MODE', 'signup');
    });
    await page.reload();
    await page.locator('.book-card').first().click();
    await page.waitForSelector('h1', { timeout: 10000 });
    const checkoutBtn = page.locator('button:has-text("Checkout Book"), button:has-text("Instant NFC Checkout"), button:has-text("Secure Checkout")').first();
    if (await checkoutBtn.isVisible()) {
        await checkoutBtn.click();
        await page.waitForSelector('.onboarding-overlay', { timeout: 10000 });
        await capture(page, '03_onboarding_signup.png');
    }
    
    // Fill out signup
    await page.fill('input[type="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[type="password"]', 'password123');
    await page.fill('input[placeholder*="First"]', 'John');
    await page.fill('input[placeholder*="Last"]', 'Doe');
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(5000);
    
    await capture(page, '04_onboarding_terms.png');
    const agreeBtn = page.locator('button:has-text("Agree")');
    if (await agreeBtn.isVisible()) {
        await agreeBtn.click();
        await page.waitForTimeout(2000);
    }
    
    await capture(page, '06_onboarding_profile.png');
    
    // 11 Checkout Success Modal!
    await page.goto('http://localhost:3000/#/catalog');
    await page.evaluate(() => {
        sessionStorage.setItem('FORCE_CHECKOUT_SUCCESS', 'true');
    });
    await page.reload();
    await page.locator('.book-card').first().click();
    await page.waitForSelector('.nfc-modal-overlay', { timeout: 10000 });
    await capture(page, '11_checkout_success.png');
    
    // 12 Gatepass!
    await page.evaluate(() => {
        sessionStorage.setItem('FORCE_GATEPASS_USER', 'true');
    });
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
    await page.route('**/api/v1/books/**', route => route.fulfill({
      json: {
        success: true,
        data: {
          id: 'b1',
          title: 'The Royal Gardens',
          coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300&h=440'
        }
      }
    }));
    await page.goto('http://localhost:3000/#/gatepass/test1234');
    await page.waitForTimeout(3000);
    await capture(page, '12_gatepass_page.png');
  });
});
