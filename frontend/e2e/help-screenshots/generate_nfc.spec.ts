import { test } from '@playwright/test';
import path from 'path';
const SCREENSHOT_DIR = '/Users/deepikakumari/royalbookclub/frontend/public/help-screenshots';
test('nfc', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  
  const capture = async (scene, filename) => {
    await page.goto(`http://localhost:3000/#/screenshot-factory?scene=${scene}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename) });
  };
  
  await page.route('**/api/v1/checkout/**', route => route.fulfill({
      json: {
        success: true,
        data: {
          id: 'TEST1234',
          bookTitle: 'The Royal Gardens',
          memberEmail: 'test@example.com',
          status: 'CHECKED_OUT',
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
          checkoutDate: new Date().toISOString()
        }
      }
  }));

  await capture('nfc_instant', '08_book_detail_nfc_instant.png');
  await capture('gatepass', '12_gatepass_page.png');
  // Just in case top scanner was used
  await capture('scanner_modal_qr', '15_top_scanner_p2d.png');
});
