const { chromium } = require('playwright');
require('dotenv').config();

const store = {
  name: 'cheboygan', 
  url: 'https://medscafecheboygan.treez.io',
  reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport'
};

async function debugExactMainLogic() {
  console.log(`🔍 Debugging exact main script logic for ${store.name}...`);
  
  const browser = await chromium.launch({ 
    headless: true, // Use headless like the main script
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
    
    console.log(`🔍 Page loaded, starting sales extraction...`);
    
    // Step 1: Get all summary items first (like debug script)
    const allItems = await page.evaluate(() => {
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
    
    console.log(`\n📊 All Summary Items (debug view):`);
    allItems.forEach(item => {
      console.log(`\nItem ${item.index}:`);
      console.log(`  Text: "${item.text}"`);
      console.log(`  Dollar Elements: [${item.dollarElements.join(', ')}]`);
      console.log(`  Contains Net Sales: ${item.containsNetSales}`);
      console.log(`  Contains Returns: ${item.containsReturns}`);
    });
    
    // Step 2: Run the EXACT same logic as main script
    console.log(`\n🔍 Running EXACT main script extraction logic...`);
    
    let salesText = await page.evaluate(() => {
      // Find all summary items
      const summaryItems = document.querySelectorAll('.summary-item');
      console.log('Found summary items:', summaryItems.length);
      
      // Look for the one containing "Net Sales"
      for (let i = 0; i < summaryItems.length; i++) {
        const item = summaryItems[i];
        const text = item.textContent;
        console.log(`Item ${i + 1}: "${text}"`);
        
        if (text && text.includes('Net Sales')) {
          console.log(`Found Net Sales in item ${i + 1}`);
          
          // Find the dollar amount in this summary item
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
    
    console.log(`🔍 Raw sales text found: "${salesText}"`);
    
    // Step 3: If we got $0.00, try the retry logic
    if (salesText === '$0.00') {
      console.log(`⚠️ Got $0.00, trying alternative approach...`);
      
      // Wait a bit longer and try again
      await page.waitForTimeout(5000);
      
      const retrySalesText = await page.evaluate(() => {
        const summaryItems = document.querySelectorAll('.summary-item');
        console.log('Retry - Found summary items:', summaryItems.length);
        
        for (let i = 0; i < summaryItems.length; i++) {
          const item = summaryItems[i];
          const text = item.textContent;
          console.log(`Retry - Item ${i + 1}: "${text}"`);
          
          if (text && text.includes('Net Sales')) {
            console.log(`Retry - Found Net Sales in item ${i + 1}`);
            
            // Try to get all dollar elements in this item
            const allDollarElements = item.querySelectorAll('.sc-ifAKCX.hDwfsa');
            console.log(`Retry - Found ${allDollarElements.length} dollar elements`);
            
            for (let j = 0; j < allDollarElements.length; j++) {
              const amount = allDollarElements[j].textContent;
              console.log(`Retry - Dollar element ${j + 1}: "${amount}"`);
              
              if (amount && amount !== '$0.00') {
                console.log(`Retry - Using non-zero amount: "${amount}"`);
                return amount;
              }
            }
            
            // If all dollar elements are $0.00, try regex on full text
            const fullText = item.textContent;
            console.log('Retry - Full Net Sales item text:', fullText);
            
            const match = fullText.match(/\$([\d,]+\.\d+)/);
            if (match) {
              console.log('Retry - Regex match found:', match[0]);
              return match[0];
            }
          }
        }
        return null;
      });
      
      console.log(`🔍 Retry sales text found: "${retrySalesText}"`);
      
      if (retrySalesText && retrySalesText !== '$0.00') {
        salesText = retrySalesText;
      }
    }
    
    // Step 4: Parse the result
    if (salesText) {
      const match = salesText.match(/\$([\d,]+\.\d+)/);
      if (match) {
        const cleanNumber = match[1].replace(/,/g, '');
        const salesAmount = parseFloat(cleanNumber);
        console.log(`✅ Sales amount: $${salesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        
        if (salesAmount > 0) {
          console.log('✅ SUCCESS - Found correct sales data!');
        } else {
          console.log('❌ FAILED - Still getting zero');
        }
        
        return salesAmount;
      } else {
        console.log(`❌ No regex match found in: "${salesText}"`);
      }
    } else {
      console.log(`❌ No sales text found`);
    }
    
    return 0;
    
  } catch (error) {
    console.error(`Debug failed:`, error.message);
    return 0;
  } finally {
    await browser.close();
  }
}

debugExactMainLogic().then((result) => {
  console.log(`\n📊 Final result: $${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
}).catch(error => {
  console.error('❌ Debug failed:', error.message);
}); 