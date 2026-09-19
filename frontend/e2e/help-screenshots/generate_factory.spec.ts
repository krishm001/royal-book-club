import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/Users/deepikakumari/royalbookclub/frontend/public/help-screenshots';

test.describe('Help Screen Captures Factory', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  const capture = async (page, scene, filename) => {
    await page.goto(`http://localhost:3000/#/screenshot-factory?scene=${scene}`);
    await page.waitForTimeout(2000); 
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });
    console.log(`Saved ${filename}`);
  };

  test('generate remaining', async ({ page }) => {
    await capture(page, 'onboarding_signin', '02_onboarding_signin.png');
    await capture(page, 'onboarding_signup', '03_onboarding_signup.png');
    await capture(page, 'onboarding_terms', '04_onboarding_terms.png');
    await capture(page, 'onboarding_email_verify', '05_onboarding_email_verify.png');
    await capture(page, 'onboarding_profile', '06_onboarding_profile.png');
    
    await capture(page, 'scanner_modal_nfc', '09_scanner_modal_nfc.png');
    await capture(page, 'scanner_modal_qr', '10_scanner_modal_qr.png');
    await capture(page, 'return_scanner', '13_return_scanner.png');
    
    await capture(page, 'checkout_success', '11_checkout_success.png');
    await capture(page, 'return_success', '14_return_success.png');
    
    // For Gatepass, we need to mock the API fetch so it doesn't crash
    await page.route('**/api/v1/checkout/**', route => route.fulfill({
      json: {
        success: true,
        data: {
          id: 'TEST1234',
          bookTitle: 'The Royal Gardens',
          memberEmail: 'test@example.com',
          status: 'CHECKED_OUT',
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
          checkoutDate: new Date().toISOString()
        }
      }
    }));
    await capture(page, 'gatepass', '12_gatepass_page.png');
  });
});
