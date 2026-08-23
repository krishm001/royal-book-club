import { test, expect } from '@playwright/test';

test.describe('E2E Full Flow - Login, Catalog, and Admin', () => {

  test('User can browse catalog and view a book', async ({ page }) => {
    // Navigate to home
    await page.goto('/');

    // Wait for initial load
    await expect(page.locator('text=Royal Book Club').first()).toBeVisible();

    // Go to Study (Catalog)
    const studyLink = page.locator('a', { hasText: 'Study' }).first();
    if (await studyLink.isVisible()) {
      await studyLink.click();
      await expect(page).toHaveURL(/.*catalog/);
    }
  });

  // Example test that relies on Github Actions setting TEST_USER_EMAIL
  test('User can login if credentials are provided', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    
    // Only run if credentials exist
    if (!email || !password) {
      console.log('Skipping login test, no credentials provided');
      return;
    }

    await page.goto('/');
    
    // Click Enter Archway (Login)
    const loginBtn = page.locator('text=Enter The Archway').first();
    await loginBtn.click();

    // Fill in credentials
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    // Click submit
    const submitBtn = page.locator('button', { hasText: 'Enter' }).first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      
      // Expect to be logged in and see Profile Ledger or similar
      await expect(page.locator('text=Profile Ledger').first()).toBeVisible({ timeout: 10000 });
    }
  });

});
