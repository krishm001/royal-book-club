import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['./e2e/checkout-matrix/reporters/checkout-matrix-reporter.ts'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    testIdAttribute: 'data-testid',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  projects: [
    // Existing default project
    {
      name: 'chromium',
      testMatch: /^(?!.*checkout-matrix).*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Sanity: 8 critical path tests, ~3 min
    {
      name: 'sanity',
      testMatch: '**/checkout-matrix/sanity.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // Smoke: 24 pairwise tests, ~8 min
    {
      name: 'smoke',
      testMatch: '**/checkout-matrix/smoke.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    // Full Matrix: all 360 combinations
    {
      name: 'full-matrix',
      testMatch: '**/checkout-matrix/full-matrix.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
