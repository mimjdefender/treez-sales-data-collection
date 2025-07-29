const { chromium } = require('playwright');
const uploadToDrive = require('./uploadToDrive');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const stores = [
  { name: 'cheboygan', url: 'https://medscafecheboygan.treez.io' },
  { name: 'lowell', url: 'https://medscafelowell.treez.io' },
  { name: 'alpena', url: 'https://medscafealpena.treez.io' },
  { name: 'gaylord', url: 'https://medscafegaylord.treez.io' },
  { name: 'rc', url: 'https://medscaferc.treez.io' },
  { name: 'manistee', url: 'https://medscafemanistee.treez.io' }
];

(async () => {
  for (const store of stores) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    try {
      console.log(`Logging into ${store.name}`);
      await page.goto(`${store.url}/backoffice/reporting/products`);
      await page.fill('input[name="email"]', process.env.TREEZ_EMAIL);
      await page.fill('input[name="password"]', process.env.TREEZ_PASSWORD);
      await Promise.all([
        page.waitForNavigation(),
        page.click('button[type="submit"]')
      ]);

      await page.waitForSelector('text=Download Report');
      const [ download ] = await Promise.all([
        page.waitForEvent('download'),
        page.click('text=Download Report')
      ]);

      const filePath = path.join(__dirname, `treez-${store.name}.csv`);
      await download.saveAs(filePath);
      console.log(`Downloaded: ${filePath}`);

      await uploadToDrive(filePath, store.name);
    } catch (e) {
      console.error(`Error for store ${store.name}:`, e);
    } finally {
      await browser.close();
    }
  }
})();