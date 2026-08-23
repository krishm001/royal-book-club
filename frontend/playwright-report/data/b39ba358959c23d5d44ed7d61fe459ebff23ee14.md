# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: home.spec.ts >> Navigation to Library (formerly Salon) works
- Location: e2e/home.spec.ts:19:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Homepage loads correctly and has translated elements', async ({ page }) => {
  4  |   await page.goto('/');
  5  | 
  6  |   // Expect a title "to contain" a substring.
  7  |   await expect(page).toHaveTitle(/Royal Book Club/i);
  8  | 
  9  |   // Expect to find Royal Book Club text or Pavilion
  10 |   const title = page.locator('text=Royal Book Club').first();
  11 |   await expect(title).toBeVisible();
  12 | 
  13 |   // Test that Sovereign/Salon were replaced with Royal/Library
  14 |   // "Royal Assembly" or "Assembly" instead of "Sovereign Assembly"
  15 |   const libraryText = page.locator('text=Library').first();
  16 |   // It might not exist depending on the view, but let's check for it conditionally if it's there
  17 | });
  18 | 
  19 | test('Navigation to Library (formerly Salon) works', async ({ page }) => {
> 20 |   await page.goto('/');
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  21 |   // The nav bar should have links
  22 |   const pavilionLink = page.getByRole('link', { name: 'Pavilion' });
  23 |   await expect(pavilionLink).toBeVisible();
  24 | });
  25 | 
```