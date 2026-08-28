const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone 12 viewport
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000/#/auth');
  await page.waitForTimeout(2000);
  
  // Fill login
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Enter Archway")');
  
  await page.waitForTimeout(3000);
  
  // Go to book detail
  await page.goto('http://localhost:3000/#/catalog/0440296005');
  await page.waitForTimeout(2000);

  const checkoutBtn = await page.locator('button:has-text("Checkout")').first();
  if (await checkoutBtn.isVisible()) {
    await checkoutBtn.click();
    await page.waitForTimeout(2000);
    
    // Take screenshot of modal open
    await page.screenshot({ path: '/tmp/modal_open_test.png' });
    console.log('Saved to /tmp/modal_open_test.png');
    
    // Click manual tab
    const manualTab = await page.locator('.tab-btn:has-text("Manual")').first();
    if (await manualTab.isVisible()) {
        await manualTab.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '/tmp/modal_manual_test.png' });
        console.log('Saved to /tmp/modal_manual_test.png');
    }
  } else {
    console.log('Could not find checkout button');
  }

  await browser.close();
})();
