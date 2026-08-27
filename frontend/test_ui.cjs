const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone 12 viewport
  const page = await context.newPage();
  
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message));

  console.log('Navigating to Book Detail Page...');
  await page.goto('http://localhost:3000/#/catalog/0440296005');
  await page.waitForLoadState('networkidle');

  console.log('Taking screenshot of page load...');
  await page.screenshot({ path: '/tmp/page_load.png' });

  // Find the button that opens the scanner modal
  // The button for "Self-Checkout" or "Borrow"
  console.log('Looking for checkout button...');
  const checkoutBtn = await page.locator('button:has-text("Checkout"), button:has-text("Borrow"), button.checkout-btn').first();
  if (await checkoutBtn.isVisible()) {
    console.log('Clicking checkout button...');
    await checkoutBtn.click();
    await page.waitForTimeout(1000);
    console.log('Taking screenshot of modal...');
    await page.screenshot({ path: '/tmp/modal_open.png' });

    console.log('Clicking Manual tab...');
    const manualTab = await page.locator('.tab-btn:has-text("Manual")').first();
    if (await manualTab.isVisible()) {
      await manualTab.click();
      await page.waitForTimeout(500);
      console.log('Taking screenshot after manual tab click...');
      await page.screenshot({ path: '/tmp/modal_manual.png' });
    }
  } else {
    console.log('Could not find checkout button. Printing page content:');
    console.log(await page.content());
  }

  await browser.close();
})();
