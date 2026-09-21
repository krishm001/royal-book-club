import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('Generate Filled Signup Screenshot', () => {
  test('capture signup popup with filled entries', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // 1. Capture Sign Up Options
    await page.evaluate(() => {
      if (window.__E2E_OPEN_ONBOARDING__) {
         window.__E2E_OPEN_ONBOARDING__('signup');
      } else {
         window.dispatchEvent(new CustomEvent('e2e-open-onboarding', { detail: 'signup' }));
      }
    });
    await page.waitForTimeout(1000);
    
    // Click "Continue with Email"
    const emailBtn = page.getByRole('button', { name: /Continue with Email/i });
    if (await emailBtn.isVisible()) {
      await emailBtn.click();
      await page.waitForTimeout(500);
      
      // Fill some dummy data for the screenshot
      await page.getByPlaceholder(/First Name/i).fill('John');
      await page.getByPlaceholder(/Last Name/i).fill('Doe');
      await page.getByPlaceholder(/Email Address/i).fill('john.doe@example.com');
      await page.getByPlaceholder(/Password/i).fill('SecurePass123!');
      
      await page.screenshot({ path: 'public/help-screenshots/03_onboarding_signup.png' });
    } else {
      // Fallback
      await page.screenshot({ path: 'public/help-screenshots/03_onboarding_signup.png' });
    }
  });
});
