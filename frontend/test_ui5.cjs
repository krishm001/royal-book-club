const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message));
  await page.goto('http://localhost:3000/#/catalog/0440296005');
  await page.waitForTimeout(5000);
  await browser.close();
})();
