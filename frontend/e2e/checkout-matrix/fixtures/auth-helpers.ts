import { Page, expect } from '@playwright/test';

/**
 * Helper functions for authentication and onboarding flows.
 * Uses E2E best practices, robust locators, and ensures production isolation.
 */

export async function loginWithEmailPassword(page: Page, email: string, password: string): Promise<void> {
  // Click 'Enter The Archway' button if visible (initial state)
  const enterBtn = page.getByRole('button', { name: /enter the archway/i });
  if (await enterBtn.isVisible()) {
    await enterBtn.click();
  }

  // Fill credentials
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);

  // Submit
  await page.getByRole('button', { name: /enter|sign in|login/i }).click();

  // Wait for auth state change (profile visible or OnboardingWizard step advance)
  await page.waitForLoadState('networkidle');
}

export async function signUpWithEmailPassword(page: Page, email: string, password: string, firstName: string, lastName: string): Promise<void> {
  // Switch to 'Sign Up' mode
  const signUpTab = page.getByRole('tab', { name: /sign up|register/i });
  if (await signUpTab.isVisible()) {
    await signUpTab.click();
  } else {
    // Or link toggle
    await page.getByRole('button', { name: /create an account/i }).click();
  }

  await page.getByPlaceholder(/first name/i).fill(firstName);
  await page.getByPlaceholder(/last name/i).fill(lastName);
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);

  // Submit register
  await page.getByRole('button', { name: /register|sign up/i }).click();
  
  // Wait for next step
  await page.waitForLoadState('networkidle');
}

/**
 * Note: Google OAuth cannot be fully automated in E2E. Instead:
 * 1. Use Firebase Auth REST API to create a custom token
 * 2. Inject the token into the page via signInWithCustomToken
 * 3. Use page.evaluate() to call Firebase auth directly
 */
export async function simulateGoogleOAuth(page: Page): Promise<void> {
  // In a real implementation, we would fetch a custom token from our test backend
  // e.g. const token = await fetchTestCustomToken('google');
  // Then inject it using page.evaluate:
  /*
  await page.evaluate(async (customToken) => {
    // @ts-ignore
    const auth = window.firebase.auth();
    await auth.signInWithCustomToken(customToken);
  }, token);
  */
  console.log('Simulating Google OAuth via custom token injection...');
  // For the purpose of the skeleton, simulate success wait
  await page.waitForTimeout(1000);
}

/**
 * Similar to Google — use backend custom token endpoint for LinkedIn OAuth.
 */
export async function simulateLinkedInOAuth(page: Page): Promise<void> {
  // Analogous to Google OAuth handling
  console.log('Simulating LinkedIn OAuth via custom token injection...');
  await page.waitForTimeout(1000);
}

export async function completeOnboardingProfile(page: Page, opts: { phone?: string, houseNo?: string, street?: string, city?: string, pinCode?: string }): Promise<void> {
  // Wait for Step 3 (profile form)
  const profileForm = page.locator('form'); // Adjust locator based on actual form wrapper
  await expect(profileForm).toBeVisible();

  if (opts.phone) await page.getByPlaceholder(/phone|mobile/i).fill(opts.phone);
  if (opts.houseNo) await page.getByPlaceholder(/house no|flat/i).fill(opts.houseNo);
  if (opts.street) await page.getByPlaceholder(/street/i).fill(opts.street);
  if (opts.city) await page.getByPlaceholder(/city/i).fill(opts.city);
  if (opts.pinCode) await page.getByPlaceholder(/pin code|postal code/i).fill(opts.pinCode);

  await page.getByRole('button', { name: /save & continue/i }).click();
}

export async function acceptTermsAndPrivacy(page: Page): Promise<void> {
  // Click terms checkbox or 'Read & Accept' for terms
  const termsCheck = page.getByRole('checkbox', { name: /terms/i });
  if (await termsCheck.isVisible()) {
    await termsCheck.check();
  }

  // Click privacy checkbox or 'Read & Accept' for privacy
  const privacyCheck = page.getByRole('checkbox', { name: /privacy/i });
  if (await privacyCheck.isVisible()) {
    await privacyCheck.check();
  }
}

export async function waitForOnboardingClose(page: Page): Promise<void> {
  // Waits for OnboardingWizard modal to disappear
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeHidden();
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  // Checks if user is currently authenticated by looking for 'Profile Ledger' or logout button.
  const profileEl = page.getByText(/profile ledger/i);
  const logoutBtn = page.getByRole('button', { name: /logout|sign out/i });
  
  return (await profileEl.isVisible()) || (await logoutBtn.isVisible());
}

export async function logout(page: Page): Promise<void> {
  const logoutBtn = page.getByRole('button', { name: /logout|sign out/i });
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
    // wait for anonymous state
    await page.waitForLoadState('networkidle');
  }
}
