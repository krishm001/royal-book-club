const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone 12 viewport
  const page = await context.newPage();
  await page.goto('http://localhost:3000/#/catalog/0440296005');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/page_content.png' });
  console.log('Saved to /tmp/page_content.png');
  await browser.close();
})();
