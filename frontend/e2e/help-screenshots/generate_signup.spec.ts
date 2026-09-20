import { test, expect } from '@playwright/test';

test.describe('Generate Signup Screenshot', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  
  test('capture signup popup', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Open signup popup
    await page.evaluate(() => {
      if (window.__E2E_OPEN_ONBOARDING__) {
         window.__E2E_OPEN_ONBOARDING__('signup');
      } else {
         window.dispatchEvent(new CustomEvent('e2e-open-onboarding', { detail: 'signup' }));
      }
    });
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'public/help-screenshots/03_onboarding_signup.png' });
  });
});
