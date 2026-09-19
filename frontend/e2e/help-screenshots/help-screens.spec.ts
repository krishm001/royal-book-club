import { test, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'public/help-screenshots');

// Mock data
const MOCK_BOOK = {
  id: '9780743273565',
  isbn: '9780743273565',
  title: 'The Great Gatsby',
  authors: ['F. Scott Fitzgerald'],
  description: 'A novel about the American Dream set in the Jazz Age.',
  coverUrl: 'https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg',
  backCoverUrl: '',
  genre: 'Fiction',
  language: 'English',
  pages: 180,
  publisher: 'Scribner',
  publishDate: '2004-09-30',
  rating: 4.2,
  availableCopies: 3,
  totalCopies: 5,
  tags: ['classic', 'american-literature'],
  ntagUid: '04a3b2c1d0e980',
  ntagUids: ['04a3b2c1d0e980'],
  qrIds: [100000001],
  copies: [
    { copyNo: 1, ntagUid: '04a3b2c1d0e980', qrId: 100000001, status: 'AVAILABLE' },
    { copyNo: 2, ntagUid: '04a3b2c2d0e981', qrId: 100000002, status: 'AVAILABLE' },
    { copyNo: 3, ntagUid: '04a3b2c3d0e982', qrId: 100000003, status: 'CHECKED_OUT', currentCheckoutId: 'co-123' }
  ],
  alternativeIsbns: []
};

const MOCK_BOOKS = [MOCK_BOOK, {
  ...MOCK_BOOK,
  id: '9780061120084',
  isbn: '9780061120084',
  title: 'To Kill a Mockingbird',
  authors: ['Harper Lee'],
  coverUrl: 'https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg',
  genre: 'Fiction',
  pages: 336,
  rating: 4.5,
  qrIds: [100000004],
  copies: [{ copyNo: 1, ntagUid: '04b3c2d1e0f990', qrId: 100000004, status: 'AVAILABLE' }],
}, {
  ...MOCK_BOOK,
  id: '9780141439518',
  isbn: '9780141439518',
  title: 'Pride and Prejudice',
  authors: ['Jane Austen'],
  coverUrl: 'https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg',
  genre: 'Fiction',
  pages: 432,
  rating: 4.3,
}, {
  ...MOCK_BOOK,
  id: '9780451524935',
  isbn: '9780451524935',
  title: '1984',
  authors: ['George Orwell'],
  coverUrl: 'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg',
  genre: 'Fiction',
  pages: 328,
  rating: 4.4,
}];

const MOCK_GENRES = [
  { id: 'fiction', name: 'Fiction', type: 'BOOK' },
  { id: 'non-fiction', name: 'Non-Fiction', type: 'BOOK' },
  { id: 'science', name: 'Science', type: 'BOOK' },
];

const MOCK_USER = {
  uid: 'user-test-001',
  email: 'scholar@royalbookclub.com',
  displayName: 'Royal Scholar',
  firstName: 'Royal',
  lastName: 'Scholar',
  role: 'MEMBER',
  phone: '+91 9876543210',
  houseNo: '42',
  street: 'Palace Road',
  city: 'Bengaluru',
  pinCode: '560001',
  consentAcceptedAt: '2024-01-01T00:00:00Z'
};

const MOCK_CHECKOUT = {
  id: 'co-active-001',
  bookId: '9780743273565',
  memberId: 'user-test-001',
  memberName: 'Royal Scholar',
  memberEmail: 'scholar@royalbookclub.com',
  status: 'CHECKED_OUT',
  checkedOutAt: new Date().toISOString(),
  returnedAt: null,
  ntagUid: '04a3b2c1d0e980',
  nfcOrBarcode: 'NFC'
};

const MOCK_GATING = {
  phoneMandatory: true,
  houseNoMandatory: false,
  streetMandatory: false,
  cityMandatory: true,
  pinCodeMandatory: true,
  enforceEmailVerification: true,
  enforceReturnGeofencing: false,
  enforceReturnQr: true,
  libraryLatitude: 12.9716,
  libraryLongitude: 77.5946,
  validRadiusMeters: 50
};

const MOCK_HERO = {
  headline: 'Words, Wisdom, Will.',
  subHeadline: 'The wisest humans were not the most connected...',
  featuredQuotes: ['A room without books is like a body without a soul. - Cicero'],
  pollQuestion: '',
  pollOptions: []
};

test.describe('Help Screen Captures', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  const setupMocks = async (page: Page) => {
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/api/v1/books') && !url.includes('/ntag/')) {
        if (url.match(/\/api\/v1\/books\/[\w-]+$/)) {
          return route.fulfill({ json: { success: true, data: MOCK_BOOK } });
        }
        return route.fulfill({ json: { success: true, data: MOCK_BOOKS } });
      }
      if (url.includes('/api/v1/genres')) {
        return route.fulfill({ json: { success: true, data: MOCK_GENRES } });
      }
      if (url.includes('/checkout-settings')) {
        return route.fulfill({ json: { success: true, data: MOCK_GATING } });
      }
      if (url.includes('/auth/me')) {
        return route.fulfill({ json: { success: true, data: MOCK_USER } });
      }
      if (url.includes('/api/v1/content/hero')) {
        return route.fulfill({ json: { success: true, data: MOCK_HERO } });
      }
      if (url.includes('/api/v1/checkouts/')) {
        return route.fulfill({ json: { success: true, data: MOCK_CHECKOUT } });
      }
      return route.fulfill({ json: { success: true, data: {} } });
    });
  };

  const capture = async (page: Page, filename: string) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for animations
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });
  };

  test('01_catalog_page', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/#/catalog');
    await capture(page, '01_catalog_page.png');
  });

  test('02_onboarding_signin', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/#/catalog');
    // Assuming clicking the first book triggers onboarding if logged out
    const checkoutButton = page.locator('button:has-text("Checkout")').first();
    await checkoutButton.waitFor({ state: 'visible' });
    await checkoutButton.click();
    await page.waitForTimeout(1000);
    await capture(page, '02_onboarding_signin.png');
  });

  test('03_onboarding_signup', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/#/catalog');
    const checkoutButton = page.locator('button:has-text("Checkout")').first();
    await checkoutButton.waitFor({ state: 'visible' });
    await checkoutButton.click();
    await page.waitForTimeout(1000);
    const signupLink = page.locator('text=/Create Account|New reader\\?/');
    if (await signupLink.count() > 0) {
      await signupLink.first().click();
      await page.waitForTimeout(500);
    }
    await capture(page, '03_onboarding_signup.png');
  });

  test('04_onboarding_terms', async ({ page }) => {
    // Note: Depends on simulated state for step 2. Mocking UI state directly via evaluate if possible.
    await setupMocks(page);
    await page.goto('/#/catalog');
    await page.evaluate(() => {
      // Simulate state where user is at Terms step
      window.dispatchEvent(new CustomEvent('TEST_SHOW_WIZARD_STEP', { detail: { step: 'TERMS' } }));
    });
    await capture(page, '04_onboarding_terms.png');
  });

  test('05_onboarding_email_verify', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/#/catalog');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('TEST_SHOW_WIZARD_STEP', { detail: { step: 'EMAIL_VERIFY' } }));
    });
    await capture(page, '05_onboarding_email_verify.png');
  });

  test('06_onboarding_profile', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/#/catalog');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('TEST_SHOW_WIZARD_STEP', { detail: { step: 'PROFILE' } }));
    });
    await capture(page, '06_onboarding_profile.png');
  });

  // Mocking auth for logged-in screens
  const mockAuthUser = async (page: Page) => {
    await page.addInitScript((mockUser) => {
      (window as any).__MOCK_AUTH_USER__ = mockUser;
      localStorage.setItem('auth_user_mock', JSON.stringify(mockUser));
    }, MOCK_USER);
  };

  test('07_book_detail_page', async ({ page }) => {
    await setupMocks(page);
    await mockAuthUser(page);
    await page.goto(`/#/catalog/${MOCK_BOOK.id}`);
    await capture(page, '07_book_detail_page.png');
  });

  test('08_book_detail_nfc_instant', async ({ page }) => {
    await setupMocks(page);
    await mockAuthUser(page);
    await page.addInitScript(() => {
      sessionStorage.setItem('nfc_session', 'true');
    });
    await page.goto(`/#/catalog/${MOCK_BOOK.id}`);
    await capture(page, '08_book_detail_nfc_instant.png');
  });

  test('09_scanner_modal_nfc', async ({ page }) => {
    await setupMocks(page);
    await mockAuthUser(page);
    await page.goto(`/#/catalog/${MOCK_BOOK.id}`);
    const checkoutButton = page.locator('button:has-text("Checkout")').first();
    await checkoutButton.waitFor({ state: 'visible' });
    await checkoutButton.click();
    await page.waitForTimeout(1000);
    await capture(page, '09_scanner_modal_nfc.png');
  });

  test('10_scanner_modal_qr', async ({ page }) => {
    await setupMocks(page);
    await mockAuthUser(page);
    await page.goto(`/#/catalog/${MOCK_BOOK.id}`);
    const checkoutButton = page.locator('button:has-text("Checkout")').first();
    await checkoutButton.waitFor({ state: 'visible' });
    await checkoutButton.click();
    await page.waitForTimeout(1000);
    const qrTab = page.locator('text=/QR|Scan/');
    if (await qrTab.count() > 0) {
      await qrTab.first().click();
      await page.waitForTimeout(500);
    }
    await capture(page, '10_scanner_modal_qr.png');
  });

  test('11_checkout_success', async ({ page }) => {
    await setupMocks(page);
    await mockAuthUser(page);
    await page.goto(`/#/catalog/${MOCK_BOOK.id}`);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('TEST_SHOW_CHECKOUT_SUCCESS'));
    });
    await capture(page, '11_checkout_success.png');
  });

  test('12_gatepass_page', async ({ page }) => {
    await setupMocks(page);
    await mockAuthUser(page);
    await page.goto(`/#/gatepass/${MOCK_CHECKOUT.id}`);
    await capture(page, '12_gatepass_page.png');
  });

  test('13_return_scanner', async ({ page }) => {
    await setupMocks(page);
    await mockAuthUser(page);
    await page.goto(`/#/catalog/${MOCK_BOOK.id}`);
    const returnButton = page.locator('button:has-text("Return")').first();
    if (await returnButton.count() > 0) {
      await returnButton.click();
      await page.waitForTimeout(1000);
    }
    await capture(page, '13_return_scanner.png');
  });

  test('14_return_success', async ({ page }) => {
    await setupMocks(page);
    await mockAuthUser(page);
    await page.goto(`/#/catalog/${MOCK_BOOK.id}`);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('TEST_SHOW_RETURN_SUCCESS'));
    });
    await capture(page, '14_return_success.png');
  });

  test('15_top_scanner_p2d', async ({ page }) => {
    await setupMocks(page);
    await mockAuthUser(page);
    await page.goto('/#/catalog');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('TEST_SHOW_TOP_SCANNER_P2D'));
    });
    await capture(page, '15_top_scanner_p2d.png');
  });

  test('16_book_card_highlight', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/#/catalog');
    await page.waitForLoadState('networkidle');
    const firstCard = page.locator('.book-card, article').first();
    if (await firstCard.count() > 0) {
      await firstCard.scrollIntoViewIfNeeded();
    }
    await capture(page, '16_book_card_highlight.png');
  });
});
