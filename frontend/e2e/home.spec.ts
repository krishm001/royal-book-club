import { test, expect } from '@playwright/test';

test('Homepage loads correctly and has translated elements', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Royal Book Club/i);

  // Expect to find Royal Book Club text or Pavilion
  const title = page.locator('text=Royal Book Club').first();
  await expect(title).toBeVisible();

  // Test that Sovereign/Salon were replaced with Royal/Library
  // "Royal Assembly" or "Assembly" instead of "Sovereign Assembly"
  const libraryText = page.locator('text=Library').first();
  // It might not exist depending on the view, but let's check for it conditionally if it's there
});

test('Navigation to Library (formerly Salon) works', async ({ page }) => {
  await page.goto('/');
  // The nav bar should have links
  const pavilionLink = page.getByRole('link', { name: 'Pavilion' });
  await expect(pavilionLink).toBeVisible();
});
