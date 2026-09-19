import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/deepikakumari/royalbookclub/frontend/public/help-screenshots';

test.describe('Help Screen Captures Real', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  const capture = async (page, filename) => {
    await page.waitForTimeout(1500); 
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });
    console.log(`Saved ${filename}`);
  };

  test('generate all', async ({ page }) => {
    // 01 Catalog Page
    await page.goto('http://localhost:3000/#/catalog');
    await page.waitForSelector('.book-card', { timeout: 10000 });
    await capture(page, '01_catalog_page.png');
    await capture(page, '16_book_card_highlight.png');
    
    // 07 Book Detail Page
    await page.locator('.book-card').first().click();
    await page.waitForSelector('h1', { timeout: 10000 });
    await capture(page, '07_book_detail_page.png');
    
    // 08 Book Detail NFC Instant
    await page.evaluate(() => sessionStorage.setItem('nfc_session', JSON.stringify({ timestamp: Date.now() })));
    await page.reload();
    await page.waitForSelector('.nfc-countdown-clock', { timeout: 10000 });
    await capture(page, '08_book_detail_nfc_instant.png');
    
    // Wait, the "Instant NFC Checkout" button opens the Checkout Modal... or triggers it instantly?
    // Let's click it. If not logged in, it opens Auth!
    await page.click('button:has-text("Instant NFC Checkout")');
    await page.waitForSelector('.onboarding-overlay', { timeout: 10000 });
    await capture(page, '02_onboarding_signin.png');
    
    const emailBtn = page.locator('button:has-text("Email")').first();
    if (await emailBtn.isVisible()) {
        await emailBtn.click();
        await page.waitForTimeout(1000);
    }
    const createBtn = page.locator('button:has-text("Create")').first();
    if (await createBtn.isVisible()) {
        await createBtn.click();
        await page.waitForTimeout(1000);
    }
    await capture(page, '03_onboarding_signup.png');

    // Create an account!
    await page.fill('input[type="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button:has-text("Continue")');
    
    await page.waitForTimeout(4000); // Wait for auth and load
    
    // Look for TERMS
    await capture(page, '04_onboarding_terms.png');
    const agreeBtn = page.locator('button:has-text("Agree")');
    if (await agreeBtn.isVisible()) {
        await agreeBtn.click();
        await page.waitForTimeout(2000);
    }
    
    await capture(page, '06_onboarding_profile.png');
    
    // We can cancel or close the onboarding here if there is a close button, or just fill it.
    // Let's just reload the page and use Playwright tricks for the rest.
    
    await page.evaluate(() => sessionStorage.removeItem('nfc_session'));
    await page.reload();
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // 09 Scanner modal NFC
    const checkoutBtn = page.locator('button:has-text("Checkout Book"), button:has-text("Secure Checkout")').first();
    if (await checkoutBtn.isVisible()) {
        await checkoutBtn.click();
        await page.waitForTimeout(2000);
        await capture(page, '09_scanner_modal_nfc.png');
        
        await page.click('button:has-text("Manual / Fallback")'); // Switch to QR
        await page.waitForTimeout(1000);
        await capture(page, '10_scanner_modal_qr.png');
        
        // Let's just force the success UI to appear using evaluate!
        // We know that `setInstantConfirmOpen(true)` happens.
        // It's hard to trigger directly without a valid ID.
        // We will just create a tiny component override for the remaining ones.
    }
  });
});
