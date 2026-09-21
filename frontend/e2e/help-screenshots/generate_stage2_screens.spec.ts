import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('Generate Stage 2 Screenshots', () => {
  test('capture various onboarding screens', async ({ page }) => {
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
    await page.screenshot({ path: 'public/help-screenshots/stage2_1_options.png' });

    // 2. Click "Continue with Email" to show Email form
    const emailBtn = page.getByRole('button', { name: /Continue with Email/i });
    if (await emailBtn.isVisible()) {
      await emailBtn.click();
      await page.waitForTimeout(500);
      
      // Fill some dummy data for the screenshot
      await page.getByPlaceholder(/First Name/i).fill('Alice');
      await page.getByPlaceholder(/Last Name/i).fill('Smith');
      await page.getByPlaceholder(/Email/i).fill('alice@example.com');
      await page.getByPlaceholder(/Password/i).fill('password123');
      
      await page.screenshot({ path: 'public/help-screenshots/stage2_2_email_form.png' });
    }

    // 3. We can't easily click submit without triggering real Firebase auth errors since we are mocking.
    // Let's force the state to 'verification' via eval
    await page.evaluate(() => {
       window.dispatchEvent(new CustomEvent('e2e-set-onboarding-step', { detail: 'verification' }));
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'public/help-screenshots/stage2_3_verification.png' });

    // 4. Force state to 'covenant'
    await page.evaluate(() => {
       window.dispatchEvent(new CustomEvent('e2e-set-onboarding-step', { detail: 'covenant' }));
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'public/help-screenshots/stage2_4_covenant.png' });
    
    // 5. Force state to 'profile' (Location/Phone)
    await page.evaluate(() => {
       window.dispatchEvent(new CustomEvent('e2e-set-onboarding-step', { detail: 'profile' }));
    });
    await page.waitForTimeout(500);
    // Fill dummy data
    const phoneInput = page.getByPlaceholder(/Phone Number/i);
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('+1 234 567 8900');
    }
    const locInput = page.getByPlaceholder(/Location/i);
    if (await locInput.isVisible()) {
      await locInput.fill('123 Main St, New York');
    }
    await page.screenshot({ path: 'public/help-screenshots/stage2_5_profile.png' });

    // Also update the final state screenshot for Stage 2 (New User) as requested
    await page.screenshot({ path: 'public/help-screenshots/03_onboarding_signup.png' });
  });
});
