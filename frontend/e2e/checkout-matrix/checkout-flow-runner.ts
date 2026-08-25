import { Page, expect } from '@playwright/test';
import { TestCombination } from './matrix-definition';
import { TestBookData } from './fixtures/test-data';
import { 
  loginWithEmailPassword, 
  completeOnboardingProfile, 
  acceptTermsAndPrivacy, 
  waitForOnboardingClose, 
  simulateGoogleOAuth, 
  simulateLinkedInOAuth 
} from './fixtures/auth-helpers';

export async function runCheckoutFlow(
  page: Page,
  combo: TestCombination,
  testBook: TestBookData,
  reportSteps: string[]
): Promise<{ success: boolean; steps: string[]; error?: string }> {
  try {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    
    reportSteps.push(`Setting up user state: ${combo.userState}`);
    if (combo.userState === 'anonymous') {
      await page.context().clearCookies();
    } else if (combo.userState === 'email_verified_complete') {
      await loginWithEmailPassword(page, 'e2e_verified_complete@e2e-test.royalbookclub.invalid', process.env.TEST_USER_PASSWORD || 'E2eTestPass123!');
    } else if (combo.userState === 'email_verified_incomplete') {
      await loginWithEmailPassword(page, 'e2e_verified_incomplete@e2e-test.royalbookclub.invalid', process.env.TEST_USER_PASSWORD || 'E2eTestPass123!');
    } else if (combo.userState === 'google_oauth') {
      await simulateGoogleOAuth(page);
    } else if (combo.userState === 'linkedin_oauth') {
      await simulateLinkedInOAuth(page);
    }
    // For 'email_unverified', we don't login here because the test handles the signup/login during the flow itself,
    // OR we login here and then it hits the verify modal. The matrix definition expects the user to be in the unverified state.
    else if (combo.userState === 'email_unverified') {
      await loginWithEmailPassword(page, 'e2e_unverified@e2e-test.royalbookclub.invalid', process.env.TEST_USER_PASSWORD || 'E2eTestPass123!');
    }

    let targetUrl = '';
    reportSteps.push(`Navigating to entry point: ${combo.entryPoint}`);
    
    switch(combo.entryPoint) {
      case 'nfc_tap_valid':
        targetUrl = `${baseUrl}/?u=e2e000aabbcc&c=20`;
        break;
      case 'nfc_tap_expired':
        targetUrl = `${baseUrl}/?u=e2e000aabbcc&c=5`;
        break;
      case 'qr_scan':
      case 'qr_deeplink':
        targetUrl = `${baseUrl}/?qr=999000001`;
        break;
      case 'direct_url':
        targetUrl = `${baseUrl}/#/catalog/${testBook.isbn}`;
        break;
    }
    
    await page.goto(targetUrl);
    reportSteps.push(`Navigated to ${targetUrl}`);
    
    await page.waitForLoadState('networkidle');
    
    if (combo.entryPoint === 'nfc_tap_expired') {
      await expect(page.locator('text=Instant NFC Checkout')).not.toBeVisible();
      reportSteps.push('NFC expired: NO instant button visible');
      return { success: true, steps: reportSteps };
    }
    
    if (combo.entryPoint === 'nfc_tap_valid') {
      const instantBtn = page.locator('text=Instant NFC Checkout');
      await expect(instantBtn).toBeVisible();
      await instantBtn.click();
      reportSteps.push('Clicked Instant NFC Checkout');
    } else {
      const checkoutBtn = page.locator('button:has-text("Checkout")').first();
      await expect(checkoutBtn).toBeVisible();
      await checkoutBtn.click();
      reportSteps.push('Clicked standard Checkout button');
    }
    
    const wizardOpen = await page.locator('.onboarding-wizard').isVisible().catch(() => false);
    if (wizardOpen) {
      reportSteps.push('OnboardingWizard opened');
      
      if (combo.userState === 'anonymous') {
        reportSteps.push('Entered email and password');
        await page.locator('input[name="email"]').fill('anon@e2e-test.royalbookclub.invalid');
        await page.locator('input[name="password"]').fill(process.env.TEST_USER_PASSWORD || 'E2eTestPass123!');
        await page.locator('button:has-text("Sign In")').click();
      }

      // If gating requires email verification and we are unverified or anonymous, we need to verify!
      if (['phone_email', 'full_gating'].includes(combo.gatingConfig) && 
          ['email_unverified', 'anonymous'].includes(combo.userState)) {
        
        const isVerifyModalVisible = await page.locator('text=Verify your email').isVisible({ timeout: 5000 }).catch(() => false);
        if (isVerifyModalVisible) {
           reportSteps.push('Simulating mid-test email verification via backend API...');
           const emailToVerify = combo.userState === 'anonymous' ? 'anon@e2e-test.royalbookclub.invalid' : 'e2e_unverified@e2e-test.royalbookclub.invalid';
           const axios = require('axios');
           const e2eSecret = process.env.E2E_SHARED_SECRET || 'test-secret';
           await axios.post(`${baseUrl}/api/v1/e2e/verify-email?email=${encodeURIComponent(emailToVerify)}`, {}, { headers: { 'X-E2E-Secret': e2eSecret } });
           reportSteps.push('Email verified on backend. Waiting for frontend to poll and advance...');
        }
      }

      // If we are incomplete or anonymous, we might need to fill out the profile
      if (['email_verified_incomplete', 'email_unverified', 'anonymous'].includes(combo.userState)) {
        // Just call the helper which attempts to fill gating fields if they are visible
        await completeOnboardingProfile(page);
        reportSteps.push('Attempted to fill profile fields if present');
      }
      
      await waitForOnboardingClose(page);
      reportSteps.push('Profile saved, wizard closed');
    }
    
    reportSteps.push('Checkout executed successfully');
    await expect(page.locator('text=View Gatepass')).toBeVisible({ timeout: 15000 });
    reportSteps.push('View Gatepass button visible');
    
    return { success: true, steps: reportSteps };
  } catch (error: any) {
    reportSteps.push(`Error: ${error.message}`);
    return { success: false, steps: reportSteps, error: error.message };
  }
}
