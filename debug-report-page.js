const { chromium } = require('playwright');
require('dotenv').config();

const store = {
  name: 'cheboygan', 
  url: 'https://medscafecheboygan.treez.io',
  reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport'
};

async function debugReportPage() {
  console.log(`🔍 Debugging report page for ${store.name}...`);
  
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
    
    console.log(`🔍 Report generated, analyzing page structure...`);
    
    // Get all buttons on the page
    const buttons = await page.evaluate(() => {
      const allButtons = document.querySelectorAll('button');
      const buttonInfo = [];
      
      for (let i = 0; i < allButtons.length; i++) {
        const button = allButtons[i];
        buttonInfo.push({
          index: i + 1,
          text: button.textContent.trim(),
          className: button.className,
          id: button.id,
          ariaLabel: button.getAttribute('aria-label'),
          type: button.type,
          visible: button.offsetParent !== null
        });
      }
      
      return buttonInfo;
    });
    
    console.log(`\n📊 Buttons found on page after report generation:`);
    buttons.forEach(button => {
      console.log(`\nButton ${button.index}:`);
      console.log(`  Text: "${button.text}"`);
      console.log(`  Class: "${button.className}"`);
      console.log(`  ID: "${button.id}"`);
      console.log(`  Aria Label: "${button.ariaLabel}"`);
      console.log(`  Type: "${button.type}"`);
      console.log(`  Visible: ${button.visible}`);
    });
    
    // Get all icons and menu elements
    const icons = await page.evaluate(() => {
      const allIcons = document.querySelectorAll('[class*="icon"], [class*="Icon"], svg, [aria-label*="more"], [aria-label*="More"]');
      const iconInfo = [];
      
      for (let i = 0; i < allIcons.length; i++) {
        const icon = allIcons[i];
        iconInfo.push({
          index: i + 1,
          tagName: icon.tagName,
          className: icon.className,
          ariaLabel: icon.getAttribute('aria-label'),
          textContent: icon.textContent.trim(),
          visible: icon.offsetParent !== null
        });
      }
      
      return iconInfo;
    });
    
    console.log(`\n📊 Icons and menu elements found:`);
    icons.forEach(icon => {
      console.log(`\nIcon ${icon.index}:`);
      console.log(`  Tag: "${icon.tagName}"`);
      console.log(`  Class: "${icon.className}"`);
      console.log(`  Aria Label: "${icon.ariaLabel}"`);
      console.log(`  Text: "${icon.textContent}"`);
      console.log(`  Visible: ${icon.visible}`);
    });
    
    // Get page title and URL
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.textContent.substring(0, 500) + '...'
      };
    });
    
    console.log(`\n📊 Page Information:`);
    console.log(`  Title: "${pageInfo.title}"`);
    console.log(`  URL: "${pageInfo.url}"`);
    console.log(`  Body Text (first 500 chars): "${pageInfo.bodyText}"`);
    
    // Wait for user to see the page
    console.log(`\n⏳ Browser will stay open for 30 seconds so you can see the page...`);
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error(`Debug failed:`, error.message);
  } finally {
    await browser.close();
  }
}

debugReportPage().then(() => {
  console.log('\n✅ Debug completed!');
}).catch(error => {
  console.error('❌ Debug failed:', error.message);
}); 