const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone 12 viewport
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000/#/catalog/0440296005');
  await page.waitForTimeout(2000);

  const checkoutBtn = await page.locator('button:has-text("Checkout")').first();
  if (await checkoutBtn.isVisible()) {
    await checkoutBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/modal_open3.png' });
    console.log('Saved to /tmp/modal_open3.png');
    
    // Also click Scan to see viewfinder
    const scanTab = await page.locator('.tab-btn:has-text("Scan")').first();
    if (await scanTab.isVisible()) {
        await scanTab.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/tmp/modal_open4.png' });
        console.log('Saved to /tmp/modal_open4.png');
    }
  } else {
    console.log('Could not find checkout button');
  }

  await browser.close();
})();
