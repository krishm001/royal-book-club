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
      await loginWithEmailPassword(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!);
    } else if (combo.userState === 'google_oauth') {
      await simulateGoogleOAuth(page);
    } else if (combo.userState === 'linkedin_oauth') {
      await simulateLinkedInOAuth(page);
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
        await page.locator('input[name="password"]').fill('password123');
        await page.locator('button:has-text("Sign In")').click();
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
