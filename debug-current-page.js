const { chromium } = require('playwright');
require('dotenv').config();

const store = {
  name: 'cheboygan', 
  url: 'https://medscafecheboygan.treez.io',
  reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport'
};

async function debugCurrentPage() {
  console.log(`🔍 Debugging current page content for ${store.name}...`);
  
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
    await page.waitForTimeout(15000); // Longer wait
    
    // Wait for summary items to be present
    await page.waitForSelector('.summary-item', { timeout: 20000 });
    
    console.log(`🔍 Page loaded, analyzing content...`);
    
    // Get all summary items and their content
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
    
    // Try to find Net Sales specifically
    const netSalesData = await page.evaluate(() => {
      const summaryItems = document.querySelectorAll('.summary-item');
      
      for (let i = 0; i < summaryItems.length; i++) {
        const item = summaryItems[i];
        const text = item.textContent;
        
        if (text && text.includes('Net Sales')) {
          console.log(`Found Net Sales in item ${i + 1}`);
          
          // Find ALL dollar amounts in this summary item
          const dollarElements = item.querySelectorAll('.sc-ifAKCX.hDwfsa');
          console.log(`Found ${dollarElements.length} dollar elements in Net Sales item`);
          
          const amounts = [];
          for (let j = 0; j < dollarElements.length; j++) {
            amounts.push(dollarElements[j].textContent);
          }
          
          return {
            itemIndex: i + 1,
            text: text,
            amounts: amounts
          };
        }
      }
      return null;
    });
    
    if (netSalesData) {
      console.log(`\n🎯 Net Sales Analysis:`);
      console.log(`Item ${netSalesData.itemIndex}: "${netSalesData.text}"`);
      console.log(`Amounts found: [${netSalesData.amounts.join(', ')}]`);
      
      // Try to find the correct amount (not $0.00)
      const nonZeroAmounts = netSalesData.amounts.filter(amount => amount !== '$0.00');
      if (nonZeroAmounts.length > 0) {
        console.log(`✅ Non-zero amounts: [${nonZeroAmounts.join(', ')}]`);
      } else {
        console.log(`❌ All amounts are $0.00`);
      }
    } else {
      console.log(`❌ No Net Sales item found`);
    }
    
    // Wait for user to see the page
    console.log(`\n⏳ Browser will stay open for 30 seconds so you can see the page...`);
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error(`Debug failed:`, error.message);
  } finally {
    await browser.close();
  }
}

debugCurrentPage().then(() => {
  console.log('\n✅ Debug completed!');
}).catch(error => {
  console.error('❌ Debug failed:', error.message);
}); 