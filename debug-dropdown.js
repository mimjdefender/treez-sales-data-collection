const { chromium } = require('playwright');
require('dotenv').config();

const store = {
  name: 'cheboygan', 
  url: 'https://medscafecheboygan.treez.io',
  reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport'
};

async function debugDropdown() {
  console.log(`🔍 Debugging dropdown menu for ${store.name}...`);
  
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
    
    console.log(`🔍 Page loaded, clicking "Generate Report"...`);
    
    // Click the generate report button
    await page.click('button:has-text("Generate Report")');
    
    // Wait for the report to generate
    console.log(`⏳ Waiting for report to generate...`);
    await page.waitForTimeout(5000);
    
    console.log(`🔍 Clicking dropdown menu...`);
    
    // Click the dropdown menu
    const dropdownButton = await page.waitForSelector('.ui.scrolling.dropdown.icon', { timeout: 10000 });
    await dropdownButton.click();
    
    // Wait for dropdown to open
    await page.waitForTimeout(2000);
    
    console.log(`🔍 Dropdown opened, analyzing options...`);
    
    // Get all dropdown items
    const dropdownItems = await page.evaluate(() => {
      const allItems = document.querySelectorAll('.item, .menu-item, [role="menuitem"], div[class*="item"]');
      const itemInfo = [];
      
      for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        itemInfo.push({
          index: i + 1,
          text: item.textContent.trim(),
          className: item.className,
          tagName: item.tagName,
          visible: item.offsetParent !== null
        });
      }
      
      return itemInfo;
    });
    
    console.log(`\n📊 Dropdown items found:`);
    dropdownItems.forEach(item => {
      console.log(`\nItem ${item.index}:`);
      console.log(`  Text: "${item.text}"`);
      console.log(`  Tag: "${item.tagName}"`);
      console.log(`  Class: "${item.className}"`);
      console.log(`  Visible: ${item.visible}`);
    });
    
    // Get all text content in the dropdown area
    const dropdownText = await page.evaluate(() => {
      const dropdownArea = document.querySelector('.ui.scrolling.dropdown');
      if (dropdownArea) {
        return dropdownArea.textContent;
      }
      return 'No dropdown area found';
    });
    
    console.log(`\n📊 Full dropdown text content: "${dropdownText}"`);
    
    // Wait for user to see the page
    console.log(`\n⏳ Browser will stay open for 30 seconds so you can see the dropdown...`);
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error(`Debug failed:`, error.message);
  } finally {
    await browser.close();
  }
}

debugDropdown().then(() => {
  console.log('\n✅ Debug completed!');
}).catch(error => {
  console.error('❌ Debug failed:', error.message);
}); 