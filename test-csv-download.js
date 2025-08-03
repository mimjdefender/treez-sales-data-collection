const { chromium } = require('playwright');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const store = {
  name: 'cheboygan', 
  url: 'https://medscafecheboygan.treez.io',
  reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport'
};

async function testCSVDownload() {
  console.log(`🔍 Testing CSV download for ${store.name}...`);
  
  const browser = await chromium.launch({ 
    headless: false, // Use visible mode to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({ 
    acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();

  try {
    // Navigate to login
    await page.goto(`${store.url}/portalDispensary/portal/login`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Login
    const emailField = await page.waitForSelector('#Email', { timeout: 10000 });
    await emailField.fill(process.env.TREEZ_EMAIL);
    
    const passwordField = await page.waitForSelector('#Password', { timeout: 10000 });
    await passwordField.fill(process.env.TREEZ_PASSWORD);
    await passwordField.press('Enter');
    
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    
    // Navigate to report
    await page.goto(store.reportUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for the page to fully load
    await page.waitForTimeout(10000);
    
    console.log(`🔍 Setting date to 8/1/2025...`);
    
    // Set the date on the page
    await page.evaluate(() => {
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) {
        dateInput.value = '2025-08-01';
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`Date set to: 2025-08-01`);
      } else {
        console.log('No date input found');
      }
    });
    
    // Wait for date to be set
    await page.waitForTimeout(2000);
    
    console.log(`📊 Step 1: Clicking "Generate Report"...`);
    
    // Click the generate report button
    await page.click('button:has-text("Generate Report")');
    
    // Wait for the report to generate
    console.log(`⏳ Waiting for report to generate...`);
    await page.waitForTimeout(5000);
    
    console.log(`📊 Step 2: Looking for export/download options...`);
    
    // Look for any export or download buttons
    const exportButtons = await page.evaluate(() => {
      const allButtons = document.querySelectorAll('button');
      const exportInfo = [];
      
      for (let i = 0; i < allButtons.length; i++) {
        const button = allButtons[i];
        const text = button.textContent.toLowerCase();
        if (text.includes('export') || text.includes('download') || text.includes('csv') || text.includes('excel')) {
          exportInfo.push({
            index: i + 1,
            text: button.textContent.trim(),
            className: button.className,
            id: button.id
          });
        }
      }
      
      return exportInfo;
    });
    
    console.log(`\n📊 Export buttons found:`);
    exportButtons.forEach(button => {
      console.log(`\nButton ${button.index}:`);
      console.log(`  Text: "${button.text}"`);
      console.log(`  Class: "${button.className}"`);
      console.log(`  ID: "${button.id}"`);
    });
    
    // Also look for any download links or icons
    const downloadElements = await page.evaluate(() => {
      const allElements = document.querySelectorAll('a, [class*="download"], [class*="export"], [class*="csv"]');
      const downloadInfo = [];
      
      for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];
        const text = element.textContent.toLowerCase();
        const href = element.href || '';
        if (text.includes('download') || text.includes('export') || text.includes('csv') || href.includes('download') || href.includes('export')) {
          downloadInfo.push({
            index: i + 1,
            tagName: element.tagName,
            text: element.textContent.trim(),
            href: href,
            className: element.className
          });
        }
      }
      
      return downloadInfo;
    });
    
    console.log(`\n📊 Download elements found:`);
    downloadElements.forEach(element => {
      console.log(`\nElement ${element.index}:`);
      console.log(`  Tag: "${element.tagName}"`);
      console.log(`  Text: "${element.text}"`);
      console.log(`  Href: "${element.href}"`);
      console.log(`  Class: "${element.className}"`);
    });
    
    // Wait for user to see the page
    console.log(`\n⏳ Browser will stay open for 30 seconds so you can see the page...`);
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error(`Test failed:`, error.message);
  } finally {
    await browser.close();
  }
}

testCSVDownload().then(() => {
  console.log('\n✅ Test completed!');
}).catch(error => {
  console.error('❌ Test failed:', error.message);
}); 