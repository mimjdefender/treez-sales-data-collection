const { chromium } = require('playwright');
require('dotenv').config();

async function testDifferentDates() {
  console.log('🔍 Testing different dates to find data...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login first
    console.log('🔐 Logging in...');
    await page.goto('https://medscafecheboygan.treez.io/portalDispensary/portal/login', { 
      waitUntil: 'networkidle' 
    });
    
    await page.fill('input[type="email"]', process.env.TREEZ_EMAIL);
    await page.fill('input[type="password"]', process.env.TREEZ_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Navigate to reports
    await page.goto('https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport');
    await page.waitForTimeout(5000);
    
    // Test different dates
    const testDates = [
      { name: 'August 2, 2025', date: '2025-08-02' },
      { name: 'August 1, 2025', date: '2025-08-01' },
      { name: 'July 31, 2025', date: '2025-07-31' },
      { name: 'July 30, 2025', date: '2025-07-30' },
      { name: 'July 29, 2025', date: '2025-07-29' },
      { name: 'July 28, 2025', date: '2025-07-28' }
    ];
    
    for (const testDate of testDates) {
      console.log(`\n📅 Testing ${testDate.name}...`);
      
      // Set the date
      await page.evaluate((dateStr) => {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        if (dateInputs.length > 0) {
          dateInputs[0].value = dateStr;
          dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`Date set to: ${dateStr}`);
        }
      }, testDate.date);
      
      // Wait for data to load
      await page.waitForTimeout(5000);
      
      // Check if we have data
      const hasData = await page.evaluate(() => {
        const summaryItems = document.querySelectorAll('.summary-item');
        for (let i = 0; i < summaryItems.length; i++) {
          const text = summaryItems[i].textContent;
          if (text && text.includes('$') && !text.includes('$0.00')) {
            return true;
          }
        }
        return false;
      });
      
      if (hasData) {
        console.log(`✅ ${testDate.name} HAS DATA!`);
        
        // Get the sales amount
        const salesAmount = await page.evaluate(() => {
          const summaryItems = document.querySelectorAll('.summary-item');
          for (let i = 0; i < summaryItems.length; i++) {
            const text = summaryItems[i].textContent;
            if (text && text.includes('$') && !text.includes('$0.00')) {
              return text;
            }
          }
          return 'No sales amount found';
        });
        
        console.log(`💰 Sales amount: ${salesAmount}`);
        break; // Found data, stop testing
      } else {
        console.log(`❌ ${testDate.name} has no data`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testDifferentDates().catch(console.error); 