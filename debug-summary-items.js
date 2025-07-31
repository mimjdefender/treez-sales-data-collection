const { chromium } = require('playwright');
require('dotenv').config();

const store = {
  name: 'cheboygan', 
  url: 'https://medscafecheboygan.treez.io',
  reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport'
};

async function debugSummaryItems() {
  console.log(`🔍 Debugging summary items for ${store.name}...`);
  
  const browser = await chromium.launch({ 
    headless: false, // Set to false to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({ 
    acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();

  try {
    // Navigate to login
    console.log(`📱 Navigating to login page...`);
    await page.goto(`${store.url}/portalDispensary/portal/login`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Login
    console.log(`🔐 Logging in...`);
    const emailField = await page.waitForSelector('#Email', { timeout: 10000 });
    await emailField.fill(process.env.TREEZ_EMAIL);
    
    const passwordField = await page.waitForSelector('#Password', { timeout: 10000 });
    await passwordField.fill(process.env.TREEZ_PASSWORD);
    await passwordField.press('Enter');
    
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    
    // Navigate to report
    console.log(`📊 Navigating to report page...`);
    await page.goto(store.reportUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for the page to fully load
    await page.waitForTimeout(10000);
    
    console.log(`🔍 Starting summary items debug...`);
    
    // Debug the summary items
    const debugResult = await page.evaluate(() => {
      const results = {
        summaryItems: [],
        netSalesFound: false,
        allText: document.body.innerText.substring(0, 2000)
      };
      
      // Find all summary items
      const summaryItems = document.querySelectorAll('.summary-item');
      console.log(`Found ${summaryItems.length} summary items`);
      
      for (let i = 0; i < summaryItems.length; i++) {
        const item = summaryItems[i];
        const text = item.textContent;
        const className = item.className;
        
        console.log(`Summary item ${i + 1}: "${text}" (${className})`);
        
        results.summaryItems.push({
          index: i + 1,
          text: text,
          className: className,
          containsNetSales: text.includes('Net Sales'),
          containsDollar: text.includes('$'),
          dollarAmounts: text.match(/\$[\d,]+\.\d+/g) || []
        });
        
        if (text.includes('Net Sales')) {
          results.netSalesFound = true;
          console.log(`✅ Found Net Sales in item ${i + 1}`);
          
          // Look for dollar amount in this item
          const dollarElement = item.querySelector('.sc-ifAKCX.hDwfsa');
          if (dollarElement) {
            console.log(`💰 Dollar element in Net Sales item: "${dollarElement.textContent}"`);
          } else {
            console.log(`❌ No dollar element found in Net Sales item`);
          }
        }
      }
      
      return results;
    });
    
    console.log(`📊 Debug Results:`);
    console.log(`Text preview: ${debugResult.allText.substring(0, 500)}`);
    console.log(`Net Sales found: ${debugResult.netSalesFound}`);
    console.log(`\n📋 Summary items found: ${debugResult.summaryItems.length}`);
    
    debugResult.summaryItems.forEach((item, index) => {
      console.log(`  ${index + 1}. "${item.text}"`);
      console.log(`     Contains Net Sales: ${item.containsNetSales}`);
      console.log(`     Contains Dollar: ${item.containsDollar}`);
      console.log(`     Dollar amounts: ${item.dollarAmounts.join(', ')}`);
    });
    
    // Try the actual extraction logic
    console.log(`\n🔍 Testing actual extraction logic...`);
    const salesText = await page.evaluate(() => {
      // Find all summary items
      const summaryItems = document.querySelectorAll('.summary-item');
      console.log(`Testing with ${summaryItems.length} summary items`);
      
      // Look for the one containing "Net Sales"
      for (let i = 0; i < summaryItems.length; i++) {
        const item = summaryItems[i];
        const text = item.textContent;
        console.log(`Checking item ${i + 1}: "${text}"`);
        
        if (text && text.includes('Net Sales')) {
          console.log(`Found Net Sales in item ${i + 1}`);
          
          // Find the dollar amount in this summary item
          const dollarElement = item.querySelector('.sc-ifAKCX.hDwfsa');
          console.log(`Dollar element found:`, dollarElement ? dollarElement.textContent : 'none');
          
          if (dollarElement) {
            return dollarElement.textContent;
          }
        }
      }
      return null;
    });
    
    console.log(`\n📊 Extraction result: "${salesText}"`);
    
    if (salesText) {
      const match = salesText.match(/\$([\d,]+\.\d+)/);
      if (match) {
        const cleanNumber = match[1].replace(/,/g, '');
        const salesAmount = parseFloat(cleanNumber);
        console.log(`✅ Sales amount extracted: $${salesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        return salesAmount;
      } else {
        console.log(`❌ No dollar amount pattern found in: "${salesText}"`);
      }
    } else {
      console.log(`❌ No sales text found`);
    }
    
    return 0;
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return 0;
  } finally {
    await browser.close();
  }
}

debugSummaryItems().then((result) => {
  if (result > 0) {
    console.log(`\n✅ Debug successful! Sales: $${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  } else {
    console.log(`\n❌ Debug failed - no sales data found`);
  }
}).catch(error => {
  console.error('❌ Debug failed:', error.message);
}); 