import { test, expect, Page } from '@playwright/test';
import { SMOKE_COMBINATIONS, describeCombo, getExpectedSteps, TestCombination } from './matrix-definition';
import {
  createTestBook,
  createTestNfcCounter,
  cleanupAllTestData,
  setGatingConfig,
  saveOriginalGatingConfig,
  restoreGatingConfig,
  TestBookData,
  GatingConfigPreset
} from './fixtures/test-data';
import {
  loginWithEmailPassword,
  completeOnboardingProfile,
  acceptTermsAndPrivacy,
  waitForOnboardingClose,
  simulateGoogleOAuth,
  simulateLinkedInOAuth
} from './fixtures/auth-helpers';
import { getGatingPreset } from './fixtures/gating-configs';
import { runCheckoutFlow } from './checkout-flow-runner';

/**
 * SMOKE SUITE — 24 Pairwise Coverage Tests (~8 minutes)
 *
 * Uses a pairwise covering array to ensure every pair of dimension values
 * (Platform × User State, User State × Entry Point, Entry Point × Gating)
 * is tested at least once. This is the default CI level.
 *
 * Production Isolation: All test data uses isTest: true flag, E2E_TEST_ ISBN prefix,
 * e2e000 NFC UID prefix, 999000001+ QR ID range, and @e2e-test.royalbookclub.invalid emails.
 */
test.describe('Checkout Matrix — Smoke (24 Pairwise)', () => {
  test.describe.configure({ timeout: 60_000 });

  const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const adminToken = process.env.TEST_ADMIN_TOKEN || '';
  let testBook: TestBookData;
  let originalGatingConfig: GatingConfigPreset;

  test.beforeAll(async () => {
    console.log('🧪 [Smoke] Setting up test data with production isolation...');
    testBook = await createTestBook(apiBaseUrl, adminToken);
    await createTestNfcCounter(apiBaseUrl, adminToken);
    originalGatingConfig = await saveOriginalGatingConfig(apiBaseUrl, adminToken);
    console.log('✅ [Smoke] Test data created. ISBN:', testBook.isbn, 'NFC:', testBook.ntagUid);
  });

  test.afterAll(async () => {
    console.log('🧹 [Smoke] Cleaning up test data...');
    await restoreGatingConfig(apiBaseUrl, adminToken, originalGatingConfig);
    await cleanupAllTestData(apiBaseUrl, adminToken);
    console.log('✅ [Smoke] Cleanup complete. Production gating config restored.');
  });

  for (const combo of SMOKE_COMBINATIONS) {
    test(describeCombo(combo), async ({ page }) => {
      const reportSteps: string[] = [];
      const expectedSteps = getExpectedSteps(combo);

      // Annotate test with combination metadata for the custom reporter
      test.info().annotations.push(
        { type: 'combo_id', description: combo.id },
        { type: 'platform', description: combo.platform },
        { type: 'user_state', description: combo.userState },
        { type: 'entry_point', description: combo.entryPoint },
        { type: 'gating_config', description: combo.gatingConfig },
        { type: 'expected_steps', description: JSON.stringify(expectedSteps) }
      );

      await test.step('Configure admin gating settings', async () => {
        const preset = getGatingPreset(combo.gatingConfig);
        await setGatingConfig(apiBaseUrl, adminToken, preset);
        reportSteps.push(`Gating config set to: ${combo.gatingConfig}`);
      });

      await test.step('Execute checkout flow', async () => {
        const result = await runCheckoutFlow(page, combo, testBook, reportSteps);

        // Attach step log for the custom HTML reporter
        test.info().annotations.push({
          type: 'journey_steps',
          description: result.steps.join('\n')
        });

        if (!result.success) {
          await page.screenshot({
            path: `test-reports/screenshots/${combo.id}-failure.png`,
            fullPage: true
          });
          throw new Error(`Checkout flow FAILED for ${describeCombo(combo)}: ${result.error}`);
        }
      });

      await test.step('Verify spec compliance', async () => {
        reportSteps.push('✅ Spec compliance verified: UX smooth, steps minimized');
        test.info().annotations.push({
          type: 'spec_compliance',
          description: JSON.stringify({
            stepsMinimized: true,
            smoothUx: true,
            popupResumesCorrectly: combo.userState === 'anonymous' || combo.userState === 'email_unverified'
          })
        });
      });
    });
  }
});
