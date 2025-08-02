const { chromium } = require('playwright');
require('dotenv').config();

const store = {
  name: 'cheboygan', 
  url: 'https://medscafecheboygan.treez.io',
  reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport'
};

async function debugDetailedExtraction() {
  console.log(`🔍 Detailed debugging of extraction process for ${store.name}...`);
  
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
    
    console.log(`🔍 Page loaded, starting detailed extraction analysis...`);
    
    // Step 1: Get all summary items
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
    
    console.log(`\n📊 All Summary Items:`);
    summaryData.forEach(item => {
      console.log(`\nItem ${item.index}:`);
      console.log(`  Text: "${item.text}"`);
      console.log(`  Dollar Elements: [${item.dollarElements.join(', ')}]`);
      console.log(`  Contains Net Sales: ${item.containsNetSales}`);
      console.log(`  Contains Returns: ${item.containsReturns}`);
    });
    
    // Step 2: Test the exact extraction logic from the main script
    console.log(`\n🔍 Testing main script extraction logic...`);
    
    const extractionResult = await page.evaluate(() => {
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
            // Make sure we're getting the correct amount by checking the full text
            const fullText = item.textContent;
            console.log('Full Net Sales item text:', fullText);
            
            // Extract the dollar amount from the full text using regex
            const match = fullText.match(/\$([\d,]+\.\d+)/);
            if (match) {
              console.log('Regex match found:', match[0]);
              return match[0]; // Return the full match including the dollar sign
            } else {
              console.log('No regex match in full text, using dollar element');
              return dollarElement.textContent;
            }
          }
        }
      }
      return null;
    });
    
    console.log(`\n📊 Extraction Result: "${extractionResult}"`);
    
    if (extractionResult) {
      const match = extractionResult.match(/\$([\d,]+\.\d+)/);
      if (match) {
        const cleanNumber = match[1].replace(/,/g, '');
        const salesAmount = parseFloat(cleanNumber);
        console.log(`✅ Parsed amount: $${salesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        
        if (salesAmount > 0) {
          console.log('✅ SUCCESS - Found correct sales data!');
        } else {
          console.log('❌ FAILED - Still getting zero');
        }
      } else {
        console.log(`❌ No regex match found in: "${extractionResult}"`);
      }
    } else {
      console.log(`❌ No extraction result found`);
    }
    
    // Step 3: Try alternative extraction methods
    console.log(`\n🔍 Trying alternative extraction methods...`);
    
    const alternativeResults = await page.evaluate(() => {
      const summaryItems = document.querySelectorAll('.summary-item');
      const results = [];
      
      for (let i = 0; i < summaryItems.length; i++) {
        const item = summaryItems[i];
        const text = item.textContent;
        
        if (text && text.includes('Net Sales')) {
          console.log(`Found Net Sales in item ${i + 1}`);
          
          // Method 1: Direct dollar element
          const dollarElement = item.querySelector('.sc-ifAKCX.hDwfsa');
          const method1 = dollarElement ? dollarElement.textContent : null;
          
          // Method 2: Regex on full text
          const match = text.match(/\$([\d,]+\.\d+)/);
          const method2 = match ? match[0] : null;
          
          // Method 3: All dollar elements in the item
          const allDollarElements = item.querySelectorAll('.sc-ifAKCX.hDwfsa');
          const method3 = Array.from(allDollarElements).map(el => el.textContent);
          
          results.push({
            itemIndex: i + 1,
            fullText: text,
            method1: method1,
            method2: method2,
            method3: method3
          });
        }
      }
      return results;
    });
    
    console.log(`\n📊 Alternative Extraction Results:`);
    alternativeResults.forEach(result => {
      console.log(`\nItem ${result.itemIndex}:`);
      console.log(`  Full Text: "${result.fullText}"`);
      console.log(`  Method 1 (Direct): "${result.method1}"`);
      console.log(`  Method 2 (Regex): "${result.method2}"`);
      console.log(`  Method 3 (All): [${result.method3.join(', ')}]`);
    });
    
    // Wait for user to see the page
    console.log(`\n⏳ Browser will stay open for 30 seconds so you can see the page...`);
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error(`Debug failed:`, error.message);
  } finally {
    await browser.close();
  }
}

debugDetailedExtraction().then(() => {
  console.log('\n✅ Detailed debug completed!');
}).catch(error => {
  console.error('❌ Debug failed:', error.message);
}); 