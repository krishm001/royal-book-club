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

const getHeaders = (adminToken: string) => ({
  headers: {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }
});

export async function createTestBook(apiBaseUrl: string, adminToken: string): Promise<TestBookData> {
  const bookData = {
    isbn: "E2E_TEST_0001",
    title: "E2E Test Volume — Automated Testing (DO NOT USE)",
    authors: ["E2E Robot"],
    description: "Automated test fixture. If visible in production, please report.",
    isTest: true,
    ntagUid: "e2e000aabbcc",
    ntagUids: ["e2e000aabbcc"],
    qrIds: [999000001],
    availableCopies: 5,
    totalCopies: 5,
    availability: true,
    copies: [{
      copyNo: 1,
      ntagUid: "e2e000aabbcc",
      qrId: 999000001,
      status: "AVAILABLE"
    }]
  };

  try {
    await axios.post(`${apiBaseUrl}/api/v1/books`, bookData, getHeaders(adminToken));
    return {
      isbn: bookData.isbn,
      ntagUid: bookData.ntagUid,
      qrId: bookData.qrIds[0]
    };
  } catch (error) {
    console.error('Failed to create test book:', error);
    throw error;
  }
}

export async function createTestNfcCounter(apiBaseUrl: string, adminToken: string): Promise<void> {
  const counterData = {
    ntagUid: "e2e000aabbcc",
    lastCounterValue: 10,
    isTest: true
  };

  try {
    await axios.post(`${apiBaseUrl}/api/v1/admin/nfc-counters`, counterData, getHeaders(adminToken));
  } catch (error) {
    console.error('Failed to create test NFC counter:', error);
    throw error;
  }
}

export async function createTestUsers(apiBaseUrl: string, adminToken: string): Promise<TestUsersData> {
  const users = {
    unverified: {
      email: `e2e_unverified${TEST_DOMAIN}`,
      password: TEST_PASSWORD,
      emailVerified: false,
      profile: {}
    },
    verifiedIncomplete: {
      email: `e2e_verified_incomplete${TEST_DOMAIN}`,
      password: TEST_PASSWORD,
      emailVerified: true,
      profile: {}
    },
    verifiedComplete: {
      email: `e2e_verified_complete${TEST_DOMAIN}`,
      password: TEST_PASSWORD,
      emailVerified: true,
      profile: {
        phone: "+1234567890",
        address: "123 Test St, Test City, TS 12345"
      }
    }
  };

  const createdUsers: any = {};

  try {
    for (const [key, userData] of Object.entries(users)) {
      const res = await axios.post(`${apiBaseUrl}/api/v1/admin/users`, { ...userData, isTest: true }, getHeaders(adminToken));
      createdUsers[key] = { email: userData.email, password: userData.password, uid: res.data?.uid };
    }
    return createdUsers as TestUsersData;
  } catch (error) {
    console.error('Failed to create test users:', error);
    throw error;
  }
}

export async function setGatingConfig(apiBaseUrl: string, adminToken: string, config: GatingConfigPreset): Promise<void> {
  try {
    await axios.put(`${apiBaseUrl}/api/v1/admin/checkout-settings`, config, getHeaders(adminToken));
  } catch (error) {
    console.error('Failed to set gating config:', error);
    throw error;
  }
}

export async function saveOriginalGatingConfig(apiBaseUrl: string, adminToken: string): Promise<GatingConfigPreset> {
  try {
    const response = await axios.get(`${apiBaseUrl}/api/v1/admin/checkout-settings`, getHeaders(adminToken));
    return response.data;
  } catch (error) {
    console.error('Failed to save original gating config:', error);
    return {};
  }
}

export async function restoreGatingConfig(apiBaseUrl: string, adminToken: string, original: GatingConfigPreset): Promise<void> {
  try {
    if (Object.keys(original).length > 0) {
      await axios.put(`${apiBaseUrl}/api/v1/admin/checkout-settings`, original, getHeaders(adminToken));
    }
  } catch (error) {
    console.error('Failed to restore gating config:', error);
  }
}

export async function cleanupAllTestData(apiBaseUrl: string, adminToken: string): Promise<void> {
  try {
    // Assuming backend has an admin endpoint designed to clean up all items with isTest: true
    await axios.delete(`${apiBaseUrl}/api/v1/admin/test-data`, getHeaders(adminToken));
  } catch (error) {
    console.error('Failed to cleanup test data, errors might not have been thrown to avoid masking test failures:', error);
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
