const { chromium } = require('playwright');
require('dotenv').config();

const store = {
  name: 'cheboygan', 
  url: 'https://medscafecheboygan.treez.io',
  reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport',
  selector: '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div.summary-item.sc-htpNat.dMpSlv > div.sc-ifAKCX.hDwfsa'
};

async function testSingleStore() {
  console.log(`🔍 Testing ${store.name}...`);
  
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
    
    // Extract sales data
    const salesElement = await page.waitForSelector(store.selector, { timeout: 15000 });
    const salesText = await salesElement.textContent();
    
    console.log(`📊 Raw text found: "${salesText}"`);
    
    const match = salesText.match(/\$([\d,]+\.\d+)/);
    if (match) {
      const cleanNumber = match[1].replace(/,/g, '');
      const salesAmount = parseFloat(cleanNumber);
      console.log(`✅ Sales amount extracted: $${salesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      return salesAmount;
    } else {
      console.log(`❌ No sales amount found in text: "${salesText}"`);
      return 0;
    }
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return 0;
  } finally {
    await browser.close();
  }
}

testSingleStore().then((result) => {
  if (result > 0) {
    console.log(`\n✅ Test successful! Sales: $${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  } else {
    console.log(`\n❌ Test failed - no sales data found`);
  }
}).catch(error => {
  console.error('❌ Test failed:', error.message);
}); 