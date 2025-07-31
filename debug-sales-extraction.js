const { chromium } = require('playwright');
require('dotenv').config();

const store = {
  name: 'cheboygan', 
  url: 'https://medscafecheboygan.treez.io',
  reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport'
};

async function debugSalesExtraction() {
  console.log(`🔍 Debugging sales extraction for ${store.name}...`);
  
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
    
    // Wait a bit for the page to load
    await page.waitForTimeout(5000);
    
    console.log(`🔍 Starting sales data extraction debug...`);
    
    // Debug the sales extraction logic
    const debugResult = await page.evaluate(() => {
      const results = {
        netSalesElements: [],
        dollarElements: [],
        summaryItems: [],
        allText: document.body.innerText.substring(0, 2000)
      };
      
      // Look for "Net Sales" text
      const allElements = Array.from(document.querySelectorAll('*'));
      console.log(`Found ${allElements.length} total elements`);
      
      for (const element of allElements) {
        if (element.textContent && element.textContent.includes('Net Sales')) {
          results.netSalesElements.push({
            text: element.textContent,
            tagName: element.tagName,
            className: element.className,
            id: element.id
          });
        }
        
        if (element.textContent && element.textContent.match(/\$[\d,]+\.\d+/)) {
          results.dollarElements.push({
            text: element.textContent,
            tagName: element.tagName,
            className: element.className,
            id: element.id
          });
        }
        
        if (element.className && typeof element.className === 'string' && element.className.includes('summary-item')) {
          results.summaryItems.push({
            text: element.textContent,
            className: element.className
          });
        }
      }
      
      return results;
    });
    
    console.log(`📊 Debug Results:`);
    console.log(`Text preview: ${debugResult.allText.substring(0, 500)}`);
    console.log(`\n💰 Dollar elements found: ${debugResult.dollarElements.length}`);
    debugResult.dollarElements.slice(0, 10).forEach((el, index) => {
      console.log(`  ${index + 1}. "${el.text}" (${el.tagName}.${el.className})`);
    });
    
    console.log(`\n📊 Net Sales elements found: ${debugResult.netSalesElements.length}`);
    debugResult.netSalesElements.forEach((el, index) => {
      console.log(`  ${index + 1}. "${el.text}" (${el.tagName}.${el.className})`);
    });
    
    console.log(`\n📋 Summary items found: ${debugResult.summaryItems.length}`);
    debugResult.summaryItems.slice(0, 5).forEach((el, index) => {
      console.log(`  ${index + 1}. "${el.text}" (${el.className})`);
    });
    
    // Try the actual extraction logic
    console.log(`\n🔍 Testing actual extraction logic...`);
    const salesText = await page.evaluate(() => {
      // Find all elements with text content
      const elements = Array.from(document.querySelectorAll('*'));
      console.log(`Testing with ${elements.length} elements`);
      
      // Look for "Net Sales" text
      for (const element of elements) {
        if (element.textContent && element.textContent.trim() === 'Net Sales') {
          console.log(`Found "Net Sales" in element:`, element.tagName, element.className);
          
          // Find the parent container
          const parent = element.closest('.summary-item') || element.parentElement;
          console.log(`Parent element:`, parent ? parent.tagName : 'none');
          
          if (parent) {
            // Look for dollar amount in the same container
            const dollarElement = parent.querySelector('.sc-ifAKCX.hDwfsa');
            console.log(`Dollar element found:`, dollarElement ? dollarElement.textContent : 'none');
            
            if (dollarElement) {
              return dollarElement.textContent;
            }
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

debugSalesExtraction().then((result) => {
  if (result > 0) {
    console.log(`\n✅ Debug successful! Sales: $${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  } else {
    console.log(`\n❌ Debug failed - no sales data found`);
  }
}).catch(error => {
  console.error('❌ Debug failed:', error.message);
}); 