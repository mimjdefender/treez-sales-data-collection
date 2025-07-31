const { chromium } = require('playwright');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Test with just one store to debug
const testStore = {
  name: 'manistee',
  url: 'https://medscafemanistee.treez.io',
  reportUrl: 'https://medscafemanistee.treez.io/portalDispensary/portal/ProductsReport',
  selector: '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div'
};

async function debugDataCollection() {
  console.log('🔍 Debugging data collection for Manistee store...');
  
  try {
    // Check if we have credentials
    if (!process.env.TREEZ_EMAIL || !process.env.TREEZ_PASSWORD) {
      console.log('❌ Missing Treez credentials in environment variables');
      console.log('TREEZ_EMAIL:', process.env.TREEZ_EMAIL ? 'SET' : 'NOT SET');
      console.log('TREEZ_PASSWORD:', process.env.TREEZ_PASSWORD ? 'SET' : 'NOT SET');
      return;
    }

    console.log('✅ Credentials found');
    console.log('🌐 Store URL:', testStore.url);
    console.log('📊 Report URL:', testStore.reportUrl);
    console.log('🎯 Selector:', testStore.selector);

    // Launch browser
    console.log('🚀 Launching browser...');
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const context = await browser.newContext({ 
      acceptDownloads: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    console.log('✅ Browser launched successfully');

    // Navigate to login page
    console.log('🔐 Navigating to login page...');
    await page.goto(`${testStore.url}/portalDispensary/portal/login`, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ Login page loaded');

    // Take screenshot
    await page.screenshot({ path: 'debug-login-page.png' });
    console.log('📸 Screenshot saved: debug-login-page.png');

    // Find and fill email field
    console.log('📧 Looking for email field...');
    const emailField = await page.waitForSelector('#Email', { timeout: 10000 });
    console.log('✅ Email field found');
    await emailField.fill(process.env.TREEZ_EMAIL);
    console.log('✅ Email filled');

    // Find and fill password field
    console.log('🔑 Looking for password field...');
    const passwordField = await page.waitForSelector('#Password', { timeout: 10000 });
    console.log('✅ Password field found');
    await passwordField.fill(process.env.TREEZ_PASSWORD);
    console.log('✅ Password filled');

    // Submit login
    console.log('🚀 Submitting login...');
    await passwordField.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 });
    console.log('✅ Login submitted');

    // Take post-login screenshot
    await page.screenshot({ path: 'debug-post-login.png' });
    console.log('📸 Screenshot saved: debug-post-login.png');

    // Navigate to report page
    console.log('📊 Navigating to report page...');
    await page.goto(testStore.reportUrl, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    console.log('✅ Report page loaded');

    // Take report page screenshot
    await page.screenshot({ path: 'debug-report-page.png' });
    console.log('📸 Screenshot saved: debug-report-page.png');

    // Look for sales element
    console.log('🔍 Looking for sales element...');
    const salesElement = await page.waitForSelector(testStore.selector, { timeout: 30000 });
    console.log('✅ Sales element found');

    // Extract sales data
    const salesText = await salesElement.textContent();
    console.log('📊 Raw sales text:', salesText);

    // Parse sales amount
    const match = salesText.match(/[\d,]+\.\d+/);
    if (match) {
      const cleanNumber = match[0].replace(/,/g, '');
      const salesAmount = parseFloat(cleanNumber);
      console.log('💰 Parsed sales amount:', salesAmount);
      
      // Create CSV
      const csvContent = `Store,Sales Amount,Timestamp\n${testStore.name},${salesAmount},${new Date().toISOString()}`;
      const filePath = path.join(__dirname, `treez-${testStore.name}.csv`);
      fs.writeFileSync(filePath, csvContent);
      console.log('✅ CSV file created:', filePath);
      console.log('📄 CSV content:', csvContent);
    } else {
      console.log('❌ No sales data found in text:', salesText);
    }

    await browser.close();
    console.log('✅ Debug completed successfully');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugDataCollection(); 