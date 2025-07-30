const { chromium } = require('playwright');
const uploadToDrive = require('./uploadToDrive');
const SalesReporter = require('./reporting');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const stores = [
  { 
    name: 'cheboygan', 
    url: 'https://medscafecheboygan.treez.io',
    reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport',
    selector: '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div.summary-item.sc-htpNat.dMpSlv > div.sc-ifAKCX.hDwfsa'
  },
  { 
    name: 'lowell', 
    url: 'https://medscafelowell.treez.io',
    reportUrl: 'https://medscafelowell.treez.io/portalDispensary/portal/ProductsReport',
    selector: '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div'
  },
  { 
    name: 'alpena', 
    url: 'https://medscafealpena.treez.io',
    reportUrl: 'https://medscafealpena.treez.io/portalDispensary/portal/ProductsReport',
    selector: '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div'
  },
  { 
    name: 'gaylord', 
    url: 'https://medscafegaylord.treez.io',
    reportUrl: 'https://medscafegaylord.treez.io/portalDispensary/portal/ProductsReport',
    selector: '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div'
  },
  { 
    name: 'rc', 
    url: 'https://medscaferc.treez.io',
    reportUrl: 'https://medscaferc.treez.io/portalDispensary/portal/ProductsReport',
    selector: '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div'
  },
  { 
    name: 'manistee', 
    url: 'https://medscafemanistee.treez.io',
    reportUrl: 'https://medscafemanistee.treez.io/portalDispensary/portal/ProductsReport',
    selector: '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div'
  }
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
      
      // Navigate to the login page first (using the same URL as your Python script)
      await page.goto(`${store.url}/portalDispensary/portal/login`, { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
      
      // Wait for page to load
      await page.waitForLoadState('domcontentloaded');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: `debug-${store.name}-1.png` });
      console.log(`Screenshot saved: debug-${store.name}-1.png`);
      
      // Use the same selectors as your Python script
      const emailField = await page.waitForSelector('#Email', { timeout: 10000 });
      console.log(`Found email field with selector: #Email`);
      
      // Fill in credentials
      await emailField.fill(process.env.TREEZ_EMAIL);
      
      // Find password field using the same selector as Python script
      const passwordField = await page.waitForSelector('#Password', { timeout: 10000 });
      console.log(`Found password field with selector: #Password`);
      
      await passwordField.fill(process.env.TREEZ_PASSWORD);
      
      // Press Enter to submit (same as your Python script)
      await passwordField.press('Enter');
      
      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 });
      
      // Take another screenshot after login
      await page.screenshot({ path: `debug-${store.name}-2.png` });
      console.log(`Post-login screenshot saved: debug-${store.name}-2.png`);
      
      // Navigate to the Products Report page (same as your Python script)
      await page.goto(store.reportUrl, { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
      
      // Wait for the sales data element using the same selector as your Python script
      const salesElement = await page.waitForSelector(store.selector, { timeout: 30000 });
      console.log(`Found sales element with selector: ${store.selector}`);
      
      // Extract the sales data
      const salesText = await salesElement.textContent();
      console.log(`Raw sales text: ${salesText}`);
      
              // Use regex to extract the first numeric value (same as your Python script)
        const match = salesText.match(/[\d,]+\.\d+/);
        
        if (match) {
          const cleanNumber = match[0].replace(/,/g, ''); // Remove commas
          const salesAmount = parseFloat(cleanNumber);
          console.log(`${store.name} Net Sales: $${salesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
          
          // Create a simple CSV with the sales data
          const csvContent = `Store,Sales Amount,Timestamp\n${store.name},${salesAmount},${new Date().toISOString()}`;
          const filePath = path.join(__dirname, `treez-${store.name}.csv`);
          
          // Write CSV to file
          const fs = require('fs');
          fs.writeFileSync(filePath, csvContent);
          console.log(`Created CSV file: ${filePath}`);

          try {
            await uploadToDrive(filePath, store.name);
            console.log(`Successfully uploaded ${store.name} to Google Drive`);
          } catch (uploadError) {
            console.error(`Failed to upload ${store.name} to Google Drive:`, uploadError.message);
            // Continue processing other stores even if upload fails
          }
          
          console.log(`Successfully processed ${store.name}`);
        } else {
          console.log(`No sales data found for ${store.name}`);
          // Create CSV with 0 sales instead of throwing error
          const csvContent = `Store,Sales Amount,Timestamp\n${store.name},0.00,${new Date().toISOString()}`;
          const filePath = path.join(__dirname, `treez-${store.name}.csv`);
          
          const fs = require('fs');
          fs.writeFileSync(filePath, csvContent);
          console.log(`Created CSV file with 0 sales: ${filePath}`);

          try {
            await uploadToDrive(filePath, store.name);
            console.log(`Successfully uploaded ${store.name} (0 sales) to Google Drive`);
          } catch (uploadError) {
            console.error(`Failed to upload ${store.name} to Google Drive:`, uploadError.message);
          }
        }
      
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

  // Generate reports based on time
  const reporter = new SalesReporter();
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  
  // Check if it's 4:20 PM (16:20) or 9:15 PM (21:15)
  if (currentHour === 16 && currentMinute >= 20 && currentMinute < 25) {
    console.log('🕐 4:20 PM detected - generating 4:20 PM report...');
    await reporter.run420Report();
  } else if (currentHour === 21 && currentMinute >= 15 && currentMinute < 20) {
    console.log('🕐 9:15 PM detected - generating final daily report...');
    await reporter.run915Report();
  } else {
    // For testing purposes, generate reports if we have data
    console.log('📊 Data collection completed. Checking for report generation...');
    
    // If we have sales data, generate appropriate report
    const sales = reporter.loadTodaySales();
    const hasData = Object.values(sales).some(amount => amount > 0);
    
    if (hasData) {
      if (currentHour < 18) { // Before 6 PM - 4:20 PM report
        console.log('🕐 Generating 4:20 PM report...');
        await reporter.run420Report();
      } else { // After 6 PM - 9:15 PM report
        console.log('🕐 Generating 9:15 PM final report...');
        await reporter.run915Report();
      }
    } else {
      console.log('📊 No sales data available for reports.');
    }
  }
})();