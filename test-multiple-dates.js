const { chromium } = require('playwright');
require('dotenv').config();

async function testMultipleDates() {
  console.log('🔍 Testing multiple dates to find data...');
  
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
    
    // Test multiple dates
    const testDates = [
      { name: 'Today', daysOffset: 0 },
      { name: 'Yesterday', daysOffset: -1 },
      { name: '2 days ago', daysOffset: -2 },
      { name: '3 days ago', daysOffset: -3 },
      { name: '4 days ago', daysOffset: -4 },
      { name: '5 days ago', daysOffset: -5 }
    ];
    
    for (const testDate of testDates) {
      console.log(`\n📅 Testing ${testDate.name}...`);
      
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + testDate.daysOffset);
      const dateString = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
      
      console.log(`📅 Setting date to: ${dateString}`);
      
      // Set the date
      await page.evaluate((dateStr) => {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        if (dateInputs.length > 0) {
          dateInputs[0].value = dateStr;
          dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`Date set to: ${dateStr}`);
        }
      }, dateString);
      
      // Wait for data to load
      await page.waitForTimeout(5000);
      
      // Check if we have data
      const hasData = await page.evaluate(() => {
        const summaryItems = document.querySelectorAll('.summary-item');
        return summaryItems.length > 0;
      });
      
      if (hasData) {
        console.log(`✅ ${testDate.name} HAS DATA!`);
        
        // Get the sales amount
        const salesAmount = await page.evaluate(() => {
          const summaryItems = document.querySelectorAll('.summary-item');
          for (let i = 0; i < summaryItems.length; i++) {
            const text = summaryItems[i].textContent;
            if (text && text.includes('$')) {
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

testMultipleDates().catch(console.error); 