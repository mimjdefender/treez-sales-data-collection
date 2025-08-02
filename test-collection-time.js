const { chromium } = require('playwright');
require('dotenv').config();

const store = {
  name: 'cheboygan', 
  url: 'https://medscafecheboygan.treez.io',
  reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport'
};

async function testCollectionTime() {
  console.log(`🔍 Testing collection time effect for ${store.name}...`);
  
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
    
    // Wait for summary items to be present
    await page.waitForSelector('.summary-item', { timeout: 15000 });
    
    console.log(`🔍 Page loaded, checking current time and data...`);
    
    // Get current time
    const currentTime = new Date();
    console.log(`⏰ Current time: ${currentTime.toLocaleString()}`);
    
    // Check if stores are closed (after 9:00 PM)
    const isAfterClose = currentTime.getHours() >= 21; // 9 PM
    console.log(`🏪 Stores closed: ${isAfterClose ? 'Yes (after 9:00 PM)' : 'No (before 9:00 PM)'}`);
    
    // Get all summary items
    const summaryData = await page.evaluate(() => {
      const summaryItems = document.querySelectorAll('.summary-item');
      console.log('Found summary items:', summaryItems.length);
      
      const items = [];
      for (let i = 0; i < summaryItems.length; i++) {
        const item = summaryItems[i];
        const text = item.textContent;
        const dollarElements = item.querySelectorAll('.sc-ifAKCX.hDwfsa');
        
        items.push({
          index: i + 1,
          text: text,
          dollarElements: Array.from(dollarElements).map(el => el.textContent),
          containsNetSales: text.includes('Net Sales'),
          containsReturns: text.includes('Returns')
        });
      }
      return items;
    });
    
    console.log(`\n📊 Summary Items Analysis:`);
    summaryData.forEach(item => {
      console.log(`\nItem ${item.index}:`);
      console.log(`  Text: "${item.text}"`);
      console.log(`  Dollar Elements: [${item.dollarElements.join(', ')}]`);
      console.log(`  Contains Net Sales: ${item.containsNetSales}`);
      console.log(`  Contains Returns: ${item.containsReturns}`);
    });
    
    // Find Net Sales specifically
    const netSalesItem = summaryData.find(item => item.containsNetSales);
    if (netSalesItem) {
      console.log(`\n🎯 Net Sales Analysis:`);
      console.log(`Item ${netSalesItem.index}: "${netSalesItem.text}"`);
      console.log(`Amounts: [${netSalesItem.dollarElements.join(', ')}]`);
      
      const netSalesAmount = netSalesItem.dollarElements.find(amount => amount !== '$0.00');
      if (netSalesAmount) {
        console.log(`✅ Found non-zero Net Sales: ${netSalesAmount}`);
      } else {
        console.log(`❌ All Net Sales amounts are $0.00`);
      }
    } else {
      console.log(`❌ No Net Sales item found`);
    }
    
  } catch (error) {
    console.error(`Test failed:`, error.message);
  } finally {
    await browser.close();
  }
}

testCollectionTime().then(() => {
  console.log('\n✅ Test completed!');
}).catch(error => {
  console.error('❌ Test failed:', error.message);
}); 