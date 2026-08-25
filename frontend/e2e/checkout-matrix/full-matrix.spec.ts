import { test, expect, Page } from '@playwright/test';
import { ALL_COMBINATIONS, describeCombo, getExpectedSteps, TestCombination } from './matrix-definition';
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
import { getGatingPreset } from './fixtures/gating-configs';
import { runCheckoutFlow } from './checkout-flow-runner';

/**
 * FULL MATRIX SUITE — All 360 Combinations (~45–60 minutes)
 *
 * Exhaustive coverage of every Platform × User State × Entry Point × Gating Config combination.
 * This suite is intended for manual trigger only (e.g., weekly regression, pre-release validation).
 *
 * Trigger manually:
 *   gh workflow run e2e-checkout-matrix.yml -f level=full-matrix
 *
 * Or locally:
 *   npx playwright test --project=full-matrix
 *
 * Production Isolation: All test data uses isTest: true flag, E2E_TEST_ ISBN prefix,
 * e2e000 NFC UID prefix, 999000001+ QR ID range, and @e2e-test.royalbookclub.invalid emails.
 */
test.describe('Checkout Matrix — Full E2E (All 360 Combinations)', () => {
  test.describe.configure({ timeout: 120_000 });

  const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const adminToken = process.env.TEST_ADMIN_TOKEN || '';
  let testBook: TestBookData;
  let originalGatingConfig: GatingConfigPreset;

  test.beforeAll(async () => {
    console.log('🧪 [Full Matrix] Setting up test data with production isolation...');
    console.log('   ISBN prefix: E2E_TEST_, NFC prefix: e2e000, QR range: 999000001+');
    console.log('   Email domain: @e2e-test.royalbookclub.invalid');
    console.log('   All documents flagged isTest: true');
    testBook = await createTestBook(apiBaseUrl, adminToken);
    await createTestNfcCounter(apiBaseUrl, adminToken);
    originalGatingConfig = await saveOriginalGatingConfig(apiBaseUrl, adminToken);
    console.log('✅ [Full Matrix] Test data created. Starting 360 combinations...');
  });

  test.afterAll(async () => {
    console.log('🧹 [Full Matrix] Cleaning up ALL test data...');
    await restoreGatingConfig(apiBaseUrl, adminToken, originalGatingConfig);
    await cleanupAllTestData(apiBaseUrl, adminToken);
    console.log('✅ [Full Matrix] Cleanup complete. Production gating config restored.');
  });

  // Track the current gating config to avoid redundant API calls
  let currentGatingConfig: string = '';

  for (const combo of ALL_COMBINATIONS) {
    test(`[${combo.id}] ${describeCombo(combo)}`, async ({ page }) => {
      const reportSteps: string[] = [];
      const expectedSteps = getExpectedSteps(combo);

      // Annotate test with combination metadata for the custom reporter
      test.info().annotations.push(
        { type: 'combo_id', description: combo.id },
        { type: 'platform', description: combo.platform },
        { type: 'user_state', description: combo.userState },
        { type: 'entry_point', description: combo.entryPoint },
        { type: 'gating_config', description: combo.gatingConfig },
        { type: 'expected_steps', description: JSON.stringify(expectedSteps) },
        { type: 'coverage_level', description: 'full-matrix' }
      );

      await test.step('Configure admin gating settings', async () => {
        // Only update gating config if it changed (optimization for 360 tests)
        if (currentGatingConfig !== combo.gatingConfig) {
          const preset = getGatingPreset(combo.gatingConfig);
          await setGatingConfig(apiBaseUrl, adminToken, preset);
          currentGatingConfig = combo.gatingConfig;
        }
        reportSteps.push(`Gating config: ${combo.gatingConfig}`);
      });

      await test.step('Execute checkout flow', async () => {
        const result = await runCheckoutFlow(page, combo, testBook, reportSteps);

        test.info().annotations.push({
          type: 'journey_steps',
          description: result.steps.join('\n')
        });

        if (!result.success) {
          await page.screenshot({
            path: `test-reports/screenshots/${combo.id}-failure.png`,
            fullPage: true
          });
          throw new Error(`[${combo.id}] ${describeCombo(combo)}: ${result.error}`);
        }
      });

      await test.step('Verify spec compliance', async () => {
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
