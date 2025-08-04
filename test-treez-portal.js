const { chromium } = require('playwright');
require('dotenv').config();

async function testTreezPortal() {
  console.log('🔍 Testing Treez portal access...');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to Cheboygan portal
    console.log('🌐 Navigating to Cheboygan portal...');
    await page.goto('https://medscafecheboygan.treez.io/portalDispensary/portal/login', { 
      waitUntil: 'networkidle' 
    });
    
    // Login
    console.log('🔐 Logging in...');
    await page.fill('input[type="email"]', process.env.TREEZ_EMAIL);
    await page.fill('input[type="password"]', process.env.TREEZ_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for login and navigate to reports
    await page.waitForTimeout(3000);
    console.log('📊 Navigating to reports...');
    await page.goto('https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport');
    await page.waitForTimeout(5000);
    
    // Check what's on the page
    console.log('🔍 Checking page content...');
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        dateInputs: document.querySelectorAll('input[type="date"]').length,
        timeInputs: document.querySelectorAll('input[type="time"]').length,
        summaryItems: document.querySelectorAll('.summary-item').length
      };
    });
    
    console.log('📊 Page info:', pageInfo);
    
    // Try to find and set date inputs
    console.log('📅 Looking for date inputs...');
    const dateInputs = await page.$$('input[type="date"]');
    console.log(`📅 Found ${dateInputs.length} date inputs`);
    
    if (dateInputs.length > 0) {
      // Try setting today's date
      const today = new Date();
      const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      console.log(`📅 Setting date to: ${dateString}`);
      
      await dateInputs[0].fill(dateString);
      await dateInputs[0].dispatchEvent('change');
      
      // Wait for data to load
      await page.waitForTimeout(5000);
      
      // Check if we have data now
      const summaryItems = await page.$$('.summary-item');
      console.log(`📊 Found ${summaryItems.length} summary items after setting date`);
      
      if (summaryItems.length > 0) {
        for (let i = 0; i < Math.min(summaryItems.length, 5); i++) {
          const text = await summaryItems[i].textContent();
          console.log(`📊 Summary item ${i + 1}: "${text}"`);
        }
      }
    }
    
    // Wait for manual inspection
    console.log('⏳ Waiting 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testTreezPortal().catch(console.error); 