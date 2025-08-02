const { chromium } = require('playwright');
require('dotenv').config();

const store = {
  name: 'cheboygan', 
  url: 'https://medscafecheboygan.treez.io',
  reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport'
};

async function debugMainVsDebug() {
  console.log(`🔍 Comparing main script vs debug script for ${store.name}...`);
  
  // Test 1: Debug script approach (visible mode)
  console.log(`\n📊 Test 1: Debug script approach (visible mode)...`);
  
  const browser1 = await chromium.launch({ 
    headless: false, // Use visible mode like debug script
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context1 = await browser1.newContext({ 
    acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page1 = await context1.newPage();

  try {
    // Navigate to login
    await page1.goto(`${store.url}/portalDispensary/portal/login`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Login
    const emailField = await page1.waitForSelector('#Email', { timeout: 10000 });
    await emailField.fill(process.env.TREEZ_EMAIL);
    
    const passwordField = await page1.waitForSelector('#Password', { timeout: 10000 });
    await passwordField.fill(process.env.TREEZ_PASSWORD);
    await passwordField.press('Enter');
    
    await page1.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    
    // Navigate to report
    await page1.goto(store.reportUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for the page to fully load
    await page1.waitForTimeout(15000);
    
    // Wait for summary items to be present
    await page1.waitForSelector('.summary-item', { timeout: 20000 });
    
    console.log(`🔍 Page loaded, analyzing content...`);
    
    // Get all summary items (debug approach)
    const summaryData = await page1.evaluate(() => {
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
    
    console.log(`\n📊 Debug View - All Summary Items:`);
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
      console.log(`\n🎯 Debug View - Net Sales Analysis:`);
      console.log(`Item ${netSalesItem.index}: "${netSalesItem.text}"`);
      console.log(`Amounts: [${netSalesItem.dollarElements.join(', ')}]`);
    }
    
    await browser1.close();
    
  } catch (error) {
    console.error(`Debug test failed:`, error.message);
    await browser1.close();
  }
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Test 2: Main script approach (headless mode)
  console.log(`\n📊 Test 2: Main script approach (headless mode)...`);
  
  const browser2 = await chromium.launch({ 
    headless: true, // Use headless like main script
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context2 = await browser2.newContext({ 
    acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page2 = await context2.newPage();

  try {
    // Navigate to login
    await page2.goto(`${store.url}/portalDispensary/portal/login`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Login
    const emailField = await page2.waitForSelector('#Email', { timeout: 10000 });
    await emailField.fill(process.env.TREEZ_EMAIL);
    
    const passwordField = await page2.waitForSelector('#Password', { timeout: 10000 });
    await passwordField.fill(process.env.TREEZ_PASSWORD);
    await passwordField.press('Enter');
    
    await page2.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    
    // Navigate to report
    await page2.goto(store.reportUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for the page to fully load
    await page2.waitForTimeout(15000);
    
    // Wait for summary items to be present
    await page2.waitForSelector('.summary-item', { timeout: 20000 });
    
    // Additional wait for FINAL collection
    const isFinalCollection = process.env.COLLECTION_TIME === "final";
    if (isFinalCollection) {
      console.log(`⏰ FINAL collection - waiting extra time for page to fully load...`);
      await page2.waitForTimeout(15000);
      await page2.waitForLoadState('networkidle', { timeout: 30000 });
      await page2.waitForSelector('.summary-item', { timeout: 20000 });
    }
    
    console.log(`🔍 Page loaded, starting sales extraction...`);
    
    // Run the exact main script extraction logic
    const salesText = await page2.evaluate(() => {
      const summaryItems = document.querySelectorAll('.summary-item');
      console.log('Found summary items:', summaryItems.length);
      
      for (let i = 0; i < summaryItems.length; i++) {
        const item = summaryItems[i];
        const text = item.textContent;
        console.log(`Item ${i + 1}: "${text}"`);
        
        if (text && text.includes('Net Sales')) {
          console.log(`Found Net Sales in item ${i + 1}`);
          
          const dollarElement = item.querySelector('.sc-ifAKCX.hDwfsa');
          console.log('Net Sales dollar element:', dollarElement ? dollarElement.textContent : 'none');
          
          if (dollarElement) {
            const fullText = item.textContent;
            console.log('Full Net Sales item text:', fullText);
            
            const match = fullText.match(/\$([\d,]+\.\d+)/);
            if (match) {
              console.log('Regex match found:', match[0]);
              return match[0];
            } else {
              console.log('No regex match in full text, using dollar element');
              return dollarElement.textContent;
            }
          }
        }
      }
      return null;
    });
    
    console.log(`🔍 Main script sales text found: "${salesText}"`);
    
    if (salesText) {
      const match = salesText.match(/\$([\d,]+\.\d+)/);
      if (match) {
        const cleanNumber = match[1].replace(/,/g, '');
        const salesAmount = parseFloat(cleanNumber);
        console.log(`✅ Main script Sales: $${salesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }
    }
    
    await browser2.close();
    
  } catch (error) {
    console.error(`Main script test failed:`, error.message);
    await browser2.close();
  }
}

debugMainVsDebug().then(() => {
  console.log('\n✅ Comparison completed!');
}).catch(error => {
  console.error('❌ Comparison failed:', error.message);
}); 