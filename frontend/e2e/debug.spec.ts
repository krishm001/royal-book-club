import { test, expect } from '@playwright/test';

test('Get console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => {
    errors.push(`PageError: ${error.message}`);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`ConsoleError: ${msg.text()}`);
    }
  });

  await page.goto('/');
  await page.waitForTimeout(3000);
  
  if (errors.length > 0) {
    throw new Error('Caught errors:\n' + errors.join('\n'));
  }
});
