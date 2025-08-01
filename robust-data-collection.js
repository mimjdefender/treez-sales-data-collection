const { chromium } = require('playwright');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const stores = [
  { 
    name: 'cheboygan', 
    url: 'https://medscafecheboygan.treez.io',
    reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport',
    selector: '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div.summary-item.sc-htpNat.dMpSlv > div.sc-ifAKCX.hDwfsa'
  },
  { 
    name: 'lowell', 
    url: 'https://medscafelowell.treez.io',
    reportUrl: 'https://medscafelowell.treez.io/portalDispensary/portal/ProductsReport',
    selector: '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div'
  },
  { 
    name: 'alpena', 
    url: 'https://medscafealpena.treez.io',
    reportUrl: 'https://medscafealpena.treez.io/portalDispensary/portal/ProductsReport',
    selector: '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div'
  },
  { 
    name: 'gaylord', 
    url: 'https://medscafegaylord.treez.io',
    reportUrl: 'https://medscafegaylord.treez.io/portalDispensary/portal/ProductsReport',
    selector: '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div'
  },
  { 
    name: 'rc', 
    url: 'https://medscaferc.treez.io',
    reportUrl: 'https://medscaferc.treez.io/portalDispensary/portal/ProductsReport',
    selector: '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div'
  },
  { 
    name: 'manistee', 
    url: 'https://medscafemanistee.treez.io',
    reportUrl: 'https://medscafemanistee.treez.io/portalDispensary/portal/ProductsReport',
    selector: '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div'
  }
];

// Fallback data (use if scraping fails)
const fallbackData = {
  'cheboygan': 4925.41,
  'lowell': 1657.31,
  'alpena': 1196.88,
  'gaylord': 1549.58,
  'rc': 2394.62,
  'manistee': 2822.05
};

async function robustDataCollection() {
  const isFinalCollection = process.env.COLLECTION_TIME === "final";
  console.log(`🚀 Starting ${isFinalCollection ? 'FINAL' : 'MID-DAY'} data collection...`);
  console.log(`⏰ Collection time: ${isFinalCollection ? '9:15 PM (stores closed at 9:00 PM)' : '4:20 PM (mid-day update)'}`);
  
  const results = {};
  let successCount = 0;

  for (const store of stores) {
    console.log(`\n📊 Processing ${store.name}...`);
    
    try {
      // Try to scrape data
      const salesAmount = await scrapeStoreData(store);
      
      if (salesAmount > 0) {
        results[store.name] = salesAmount;
        successCount++;
        console.log(`✅ ${store.name}: $${salesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      } else {
        // Fail instead of using fallback data
        throw new Error(`Failed to scrape data for ${store.name} - no sales amount found`);
      }
      
      // Create CSV file
      const csvContent = `Store,Sales Amount,Timestamp\n${store.name},${results[store.name]},${new Date().toISOString()}`;
      const filePath = path.join(__dirname, `treez-${store.name}.csv`);
      fs.writeFileSync(filePath, csvContent);
      console.log(`📄 CSV created: ${filePath}`);
      
    } catch (error) {
      console.error(`❌ Error processing ${store.name}:`, error.message);
      
      // Fail instead of using fallback data
      throw new Error(`Failed to process ${store.name}: ${error.message}`);
    }
  }

  console.log(`\n📊 Collection Summary:`);
  console.log(`✅ Successful scrapes: ${successCount}`);
  console.log(`💰 Total Sales: $${Object.values(results).reduce((sum, amount) => sum + amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`📅 Collection Type: ${isFinalCollection ? 'FINAL (9:15 PM)' : 'MID-DAY (4:20 PM)'}`);

  return results;
}

async function scrapeStoreData(store) {
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
    
    // Additional wait for FINAL collection to ensure page is fully load
    const isFinalCollection = process.env.COLLECTION_TIME === "final";
    if (isFinalCollection) {
      console.log(`⏰ FINAL collection - waiting extra time for page to fully load...`);
      await page.waitForTimeout(15000); // Extra wait for final collection
      
      // Wait for network to be idle
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      // Wait for summary items to be present again
      await page.waitForSelector('.summary-item', { timeout: 20000 });
    }
    
    console.log(`🔍 Page loaded, starting sales extraction...`);
    
    // Extract sales data - look for Net Sales specifically
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
    
    // If we got $0.00, try a different approach - wait longer and try again
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
    
    if (salesText) {
      const match = salesText.match(/\$([\d,]+\.\d+)/);
      if (match) {
        const cleanNumber = match[1].replace(/,/g, '');
        const salesAmount = parseFloat(cleanNumber);
        
        // Check if this is a final collection and stores are closed
        const isFinalCollection = process.env.COLLECTION_TIME === "final";
        const currentTime = new Date();
        const isAfterClose = currentTime.getHours() >= 21; // 9 PM
        
        if (salesAmount === 0 && isFinalCollection && isAfterClose) {
          console.log(`⚠️ Stores are closed (after 9:00 PM) - sales data may be reset to zero`);
          console.log(`📊 This is expected behavior for final collection after store closing`);
          
          // For final collection after store closing, we might want to use the last known sales data
          // or accept that the data is zero because stores are closed
          console.log(`✅ Accepting $0.00 as valid for closed stores`);
          return 0;
        }
        
        return salesAmount;
      }
    }
    
    return 0;
    
  } catch (error) {
    console.error(`Scraping failed for ${store.name}:`, error.message);
    return 0;
  } finally {
    await browser.close();
  }
}

// Run the collection
robustDataCollection().then(() => {
  console.log('\n✅ Data collection completed!');
}).catch(error => {
  console.error('❌ Data collection failed:', error.message);
}); 