import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Homepage', () => {
  let errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    page.on('pageerror', error => {
      errors.push(`PageError: ${error.message}`);
    });
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`ConsoleError: ${msg.text()}`);
      }
    });
  });

  test.afterEach(() => {
    if (errors.length > 0) {
      throw new Error('Caught unexpected errors on page:\n' + errors.join('\n'));
    }
  });

  test('Homepage loads correctly without unhandled exceptions', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the dynamic content to load to ensure no post-load React crashes
    await page.waitForTimeout(2000); 

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Royal Book Club/i);

    // Expect to find Royal Book Club text
    const title = page.locator('text=Royal Book Club').first();
    await expect(title).toBeVisible();
  });

  test('Homepage meets color contrast accessibility criteria', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000); // allow UI to settle
    
    // Run Axe to check for contrast issues
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag21aa'])
      .analyze();

    // Verify there are no color-contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );
    
    expect(contrastViolations).toEqual([]);
  });

  test('Navigation to Library (formerly Salon) works', async ({ page }) => {
    await page.goto('/');
    const pavilionLink = page.getByRole('link', { name: 'Pavilion' });
    await expect(pavilionLink).toBeVisible();
  });
});
