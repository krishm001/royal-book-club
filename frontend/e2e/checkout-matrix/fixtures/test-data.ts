/**
 * Test Data Fixtures for Checkout Matrix E2E Tests
 *
 * PRODUCTION ISOLATION STRATEGY:
 * This file handles creation and cleanup of ALL test data used by the checkout matrix E2E tests.
 * It is critical to ensure zero interference with production data.
 *
 * - Test ISBNs: Prefix `E2E_TEST_` (e.g., `E2E_TEST_0001`). Real ISBNs are 10 or 13 digit numbers.
 * - Test NFC UIDs: Prefix `e2e000` (e.g., `e2e000aabbcc`). Real NFC UIDs are hardware serial numbers.
 * - Test QR IDs: Range `999000001-999999999`. Production QR IDs start from `100000001`.
 * - Test user emails: Domain `@e2e-test.royalbookclub.invalid` (RFC 2606 reserved `.invalid` TLD)
 * - isTest flag: ALL test documents get `isTest: true` field. Backend `getAllBooks()` and `getAllCheckouts()` filter these out.
 */

import axios from 'axios';

export interface TestBookData {
  isbn: string;
  ntagUid: string;
  qrId: number;
}

export interface TestUserCredentials {
  email: string;
  password?: string;
  uid?: string;
}

export interface TestUsersData {
  unverified: TestUserCredentials;
  verifiedIncomplete: TestUserCredentials;
  verifiedComplete: TestUserCredentials;
}

export interface GatingConfigPreset {
  phoneMandatory?: boolean;
  enforceEmailVerification?: boolean;
  maxActiveCheckouts?: number;
}

const TEST_DOMAIN = '@e2e-test.royalbookclub.invalid';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'E2eTestPass123!';

const getHeaders = (secret: string) => ({
  headers: {
    'X-E2E-Secret': secret,
    'Content-Type': 'application/json'
  }
});

export async function setupTestData(apiBaseUrl: string, secret: string): Promise<TestBookData> {
  try {
    await axios.post(`${apiBaseUrl}/api/v1/e2e/setup`, {}, getHeaders(secret));
    return {
      isbn: "E2E_TEST_0001",
      ntagUid: "e2e000aabbcc",
      qrId: 999000001
    };
  } catch (error) {
    console.error('Failed to run E2E setup:', error);
    throw error;
  }
}

export async function cleanupAllTestData(apiBaseUrl: string, secret: string): Promise<void> {
  try {
    await axios.delete(`${apiBaseUrl}/api/v1/e2e/teardown`, getHeaders(secret));
  } catch (error) {
    console.error('Failed to cleanup E2E data:', error);
  }
}

export async function setGatingConfig(apiBaseUrl: string, secret: string, config: GatingConfigPreset): Promise<void> {
  try {
    await axios.put(`${apiBaseUrl}/api/v1/e2e/gating-config`, config, getHeaders(secret));
  } catch (error) {
    console.error('Failed to set gating config:', error);
    throw error;
  }
}

export async function saveOriginalGatingConfig(apiBaseUrl: string, secret: string): Promise<GatingConfigPreset> {
  try {
    const response = await axios.get(`${apiBaseUrl}/api/v1/e2e/gating-config`, getHeaders(secret));
    return response.data;
  } catch (error) {
    console.error('Failed to save original gating config:', error);
    return {};
  }
}

export async function restoreGatingConfig(apiBaseUrl: string, secret: string, original: GatingConfigPreset): Promise<void> {
  try {
    if (Object.keys(original).length > 0) {
      await axios.put(`${apiBaseUrl}/api/v1/e2e/gating-config`, original, getHeaders(secret));
    }
  } catch (error) {
    console.error('Failed to restore gating config:', error);
  }
}

export async function verifyEmailMidTest(apiBaseUrl: string, secret: string, email: string): Promise<void> {
  try {
    await axios.post(`${apiBaseUrl}/api/v1/e2e/verify-email?email=${encodeURIComponent(email)}`, {}, getHeaders(secret));
  } catch (error) {
    console.error('Failed to verify email mid-test:', error);
    throw error;
  }
}

export async function globalSetup(): Promise<void> {
  const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const adminToken = process.env.TEST_ADMIN_TOKEN || '';

  console.log('Running global setup for Checkout Matrix E2E Tests...');
  try {
    await createTestBook(apiBaseUrl, adminToken);
    await createTestNfcCounter(apiBaseUrl, adminToken);
    await createTestUsers(apiBaseUrl, adminToken);
    console.log('Test data setup complete.');
  } catch (error) {
    console.error('Error during global setup:', error);
  }
}

export async function globalTeardown(): Promise<void> {
  const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const adminToken = process.env.TEST_ADMIN_TOKEN || '';

  console.log('Running global teardown for Checkout Matrix E2E Tests...');
  await cleanupAllTestData(apiBaseUrl, adminToken);
  console.log('Test data cleanup complete.');
}
