import { test } from '@playwright/test';
import path from 'path';
const SCREENSHOT_DIR = '/Users/deepikakumari/royalbookclub/frontend/public/help-screenshots';
test('onboarding', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  const capture = async (filename) => {
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename) });
  };
  
  await page.route('**/api/v1/auth/me', route => route.fulfill({ json: { success: true, data: {} } }));
  await page.route('**/api/v1/public/checkout-settings', route => route.fulfill({
    json: { success: true, data: { gating: { EMAIL_VERIFICATION: true, MEMBER_ADDRESS: true, MEMBER_PHONE: true } } }
  }));

  // 05: EMAIL VERIFY
  await page.addInitScript(() => {
    sessionStorage.setItem('FORCE_ONBOARDING_STEP', '3');
    window.__mockAuth = {
        currentUser: { email: 'test@example.com', providerData: [{ providerId: 'password' }], emailVerified: false }
    };
  });
  await page.goto('http://localhost:3000/#/screenshot-factory?scene=onboarding_signin');
  await capture('05_onboarding_email_verify.png');

  // 06: PROFILE
  await page.addInitScript(() => {
    sessionStorage.setItem('FORCE_ONBOARDING_STEP', '3');
    window.__mockAuth = {
        currentUser: { email: 'test@example.com', providerData: [{ providerId: 'password' }], emailVerified: true }
    };
  });
  await page.goto('http://localhost:3000/#/screenshot-factory?scene=onboarding_signin');
  await capture('06_onboarding_profile.png');
});
