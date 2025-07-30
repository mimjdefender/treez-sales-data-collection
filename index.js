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
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const context = await browser.newContext({ 
      acceptDownloads: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
      console.log(`Logging into ${store.name}`);
      
      // Navigate to the login page first
      await page.goto(`${store.url}/backoffice/login`, { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
      
      // Wait for page to load and check if we're on the right page
      await page.waitForLoadState('domcontentloaded');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: `debug-${store.name}-1.png` });
      console.log(`Screenshot saved: debug-${store.name}-1.png`);
      
      // Try multiple selectors for email field
      const emailSelectors = [
        'input[name="email"]',
        'input[type="email"]',
        'input[id*="email"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="Email" i]'
      ];
      
      let emailField = null;
      for (const selector of emailSelectors) {
        try {
          emailField = await page.waitForSelector(selector, { timeout: 10000 });
          console.log(`Found email field with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`Selector ${selector} not found, trying next...`);
        }
      }
      
      if (!emailField) {
        console.log(`No email field found. Page content: ${await page.content()}`);
        throw new Error('Email field not found on page');
      }
      
      // Fill in credentials
      await emailField.fill(process.env.TREEZ_EMAIL);
      
      // Find password field
      const passwordSelectors = [
        'input[name="password"]',
        'input[type="password"]',
        'input[id*="password"]'
      ];
      
      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          passwordField = await page.waitForSelector(selector, { timeout: 10000 });
          console.log(`Found password field with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`Selector ${selector} not found, trying next...`);
        }
      }
      
      if (!passwordField) {
        throw new Error('Password field not found on page');
      }
      
      await passwordField.fill(process.env.TREEZ_PASSWORD);
      
      // Find and click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign In")',
        'button:has-text("Log In")'
      ];
      
      let submitButton = null;
      for (const selector of submitSelectors) {
        try {
          submitButton = await page.waitForSelector(selector, { timeout: 10000 });
          console.log(`Found submit button with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`Selector ${selector} not found, trying next...`);
        }
      }
      
      if (!submitButton) {
        throw new Error('Submit button not found on page');
      }
      
      // Click submit and wait for navigation
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
        submitButton.click()
      ]);
      
      // Take another screenshot after login
      await page.screenshot({ path: `debug-${store.name}-2.png` });
      console.log(`Post-login screenshot saved: debug-${store.name}-2.png`);
      
      // Navigate to the reporting page
      await page.goto(`${store.url}/backoffice/reporting/products`, { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
      
      // Wait for the download button
      const downloadSelectors = [
        'text=Download Report',
        'button:has-text("Download")',
        'a:has-text("Download")',
        '[data-testid="download-report"]'
      ];
      
      let downloadButton = null;
      for (const selector of downloadSelectors) {
        try {
          downloadButton = await page.waitForSelector(selector, { timeout: 30000 });
          console.log(`Found download button with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`Download selector ${selector} not found, trying next...`);
        }
      }
      
      if (!downloadButton) {
        throw new Error('Download button not found on page');
      }
      
      // Download the report
      const [ download ] = await Promise.all([
        page.waitForEvent('download'),
        downloadButton.click()
      ]);

      const filePath = path.join(__dirname, `treez-${store.name}.csv`);
      await download.saveAs(filePath);
      console.log(`Downloaded: ${filePath}`);

      await uploadToDrive(filePath, store.name);
      console.log(`Successfully processed ${store.name}`);
      
    } catch (e) {
      console.error(`Error for store ${store.name}:`, e);
      // Take error screenshot
      try {
        await page.screenshot({ path: `error-${store.name}.png` });
        console.log(`Error screenshot saved: error-${store.name}.png`);
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError);
      }
    } finally {
      await browser.close();
    }
  }
})();