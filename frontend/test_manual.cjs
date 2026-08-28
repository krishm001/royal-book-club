const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000/#/auth');
  await page.waitForTimeout(2000);
  await page.fill('input[type="email"]', 'test@test.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button:has-text("Enter Archway")');
  await page.waitForTimeout(2000);
  
  await page.goto('http://localhost:3000/#/catalog/0440296005');
  await page.waitForTimeout(3000);
  
  const checkoutBtn = await page.locator('button:has-text("Checkout")').first();
  await checkoutBtn.click();
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: '/tmp/before_manual.png' });
  console.log('Saved before_manual.png');
  
  const manualTab = await page.locator('.tab-btn:has-text("Manual")').first();
  await manualTab.click();
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: '/tmp/after_manual.png' });
  console.log('Saved after_manual.png');
  
  await browser.close();
})();
