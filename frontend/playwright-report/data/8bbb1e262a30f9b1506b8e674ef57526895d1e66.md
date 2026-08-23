# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: checkout.spec.ts >> E2E Full Flow - Login, Catalog, and Admin >> User can browse catalog and view a book
- Location: e2e/checkout.spec.ts:5:3

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
  3  | test.describe('E2E Full Flow - Login, Catalog, and Admin', () => {
  4  | 
  5  |   test('User can browse catalog and view a book', async ({ page }) => {
  6  |     // Navigate to home
> 7  |     await page.goto('/');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  8  | 
  9  |     // Wait for initial load
  10 |     await expect(page.locator('text=Royal Book Club').first()).toBeVisible();
  11 | 
  12 |     // Go to Study (Catalog)
  13 |     const studyLink = page.locator('a', { hasText: 'Study' }).first();
  14 |     if (await studyLink.isVisible()) {
  15 |       await studyLink.click();
  16 |       await expect(page).toHaveURL(/.*study/);
  17 |     }
  18 |   });
  19 | 
  20 |   // Example test that relies on Github Actions setting TEST_USER_EMAIL
  21 |   test('User can login if credentials are provided', async ({ page }) => {
  22 |     const email = process.env.TEST_USER_EMAIL;
  23 |     const password = process.env.TEST_USER_PASSWORD;
  24 |     
  25 |     // Only run if credentials exist
  26 |     if (!email || !password) {
  27 |       console.log('Skipping login test, no credentials provided');
  28 |       return;
  29 |     }
  30 | 
  31 |     await page.goto('/');
  32 |     
  33 |     // Click Enter Archway (Login)
  34 |     const loginBtn = page.locator('text=Enter The Archway').first();
  35 |     await loginBtn.click();
  36 | 
  37 |     // Fill in credentials
  38 |     await page.fill('input[type="email"]', email);
  39 |     await page.fill('input[type="password"]', password);
  40 | 
  41 |     // Click submit
  42 |     const submitBtn = page.locator('button', { hasText: 'Enter' }).first();
  43 |     if (await submitBtn.isVisible()) {
  44 |       await submitBtn.click();
  45 |       
  46 |       // Expect to be logged in and see Profile Ledger or similar
  47 |       await expect(page.locator('text=Profile Ledger').first()).toBeVisible({ timeout: 10000 });
  48 |     }
  49 |   });
  50 | 
  51 | });
  52 | 
```