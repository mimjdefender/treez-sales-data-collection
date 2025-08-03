const { chromium } = require('playwright');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const stores = [
  { 
    name: 'cheboygan', 
    url: 'https://medscafecheboygan.treez.io',
    reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport'
  },
  { 
    name: 'lowell', 
    url: 'https://medscafelowell.treez.io',
    reportUrl: 'https://medscafelowell.treez.io/portalDispensary/portal/ProductsReport'
  },
  { 
    name: 'alpena', 
    url: 'https://medscafealpena.treez.io',
    reportUrl: 'https://medscafealpena.treez.io/portalDispensary/portal/ProductsReport'
  },
  { 
    name: 'gaylord', 
    url: 'https://medscafegaylord.treez.io',
    reportUrl: 'https://medscafegaylord.treez.io/portalDispensary/portal/ProductsReport'
  },
  { 
    name: 'rc', 
    url: 'https://medscaferc.treez.io',
    reportUrl: 'https://medscaferc.treez.io/portalDispensary/portal/ProductsReport'
  },
  { 
    name: 'manistee', 
    url: 'https://medscafemanistee.treez.io',
    reportUrl: 'https://medscafemanistee.treez.io/portalDispensary/portal/ProductsReport'
  }
];

// Get the target date (today's date in EST)
function getTargetDate() {
  const now = new Date();
  const isFinalCollection = process.env.COLLECTION_TIME === "final";
  
  if (isFinalCollection) {
    // For final collection, use today's date (stores close at 9 PM)
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1, // getMonth() returns 0-11
      day: now.getDate()
    };
  } else {
    // For mid-day collection, use today's date
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate()
    };
  }
}

async function calculateFromSummary() {
  const isFinalCollection = process.env.COLLECTION_TIME === "final";
  const targetDate = getTargetDate();
  
  console.log(`🚀 Starting ${isFinalCollection ? 'FINAL' : 'MID-DAY'} data collection using summary calculation...`);
  console.log(`⏰ Collection time: ${isFinalCollection ? '9:15 PM (stores closed at 9:00 PM)' : '4:20 PM (mid-day update)'}`);
  console.log(`📅 Target date: ${targetDate.month}/${targetDate.day}/${targetDate.year}`);
  
  const results = {};
  let successCount = 0;

  for (const store of stores) {
    console.log(`\n📊 Processing ${store.name}...`);
    
    try {
      // Get data from summary items
      const summaryData = await getStoreSummaryData(store, targetDate);
      
      if (summaryData.netSales > 0) {
        results[store.name] = summaryData.netSales;
        successCount++;
        console.log(`✅ ${store.name}: $${summaryData.netSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        console.log(`📊 Summary: Gross $${summaryData.grossSales}, Discounts $${summaryData.discounts}, Returns $${summaryData.returns}, Net $${summaryData.netSales}`);
      } else {
        throw new Error(`Failed to get data for ${store.name} - no sales amount found`);
      }
      
      // Create CSV file
      const csvContent = `Store,Gross Sales,Discounts,Returns,Net Sales,Timestamp\n${store.name},${summaryData.grossSales},${summaryData.discounts},${summaryData.returns},${summaryData.netSales},${new Date().toISOString()}`;
      const filePath = path.join(__dirname, `treez-${store.name}.csv`);
      fs.writeFileSync(filePath, csvContent);
      console.log(`📄 CSV created: ${filePath}`);
      
    } catch (error) {
      console.error(`❌ Error processing ${store.name}:`, error.message);
      throw new Error(`Failed to process ${store.name}: ${error.message}`);
    }
  }

  console.log(`\n📊 Collection Summary:`);
  console.log(`✅ Successful scrapes: ${successCount}`);
  console.log(`💰 Total Sales: $${Object.values(results).reduce((sum, amount) => sum + amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`📅 Collection Type: ${isFinalCollection ? 'FINAL (9:15 PM)' : 'MID-DAY (4:20 PM)'}`);

  return results;
}

async function getStoreSummaryData(store, targetDate) {
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
    
    console.log(`🔍 Setting date to ${targetDate.month}/${targetDate.day}/${targetDate.year}...`);
    
    // Set the date on the page
    await page.evaluate((date) => {
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) {
        const dateString = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
        dateInput.value = dateString;
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`Date set to: ${dateString}`);
      } else {
        console.log('No date input found');
      }
    }, targetDate);
    
    // Wait for date to be set
    await page.waitForTimeout(2000);
    
    console.log(`📊 Step 1: Clicking "Generate Report"...`);
    
    // Click the generate report button
    await page.click('button:has-text("Generate Report")');
    
    // Wait for the report to generate
    console.log(`⏳ Waiting for report to generate...`);
    await page.waitForTimeout(5000);
    
    // Wait for summary items to be present
    await page.waitForSelector('.summary-item', { timeout: 15000 });
    
    console.log(`🔍 Report generated, extracting summary data...`);
    
    // Extract all summary data
    const summaryData = await page.evaluate(() => {
      const summaryItems = document.querySelectorAll('.summary-item');
      const data = {
        grossSales: 0,
        discounts: 0,
        returns: 0,
        netSales: 0,
        taxes: 0,
        grossReceipts: 0,
        cost: 0,
        grossIncome: 0
      };
      
      for (let i = 0; i < summaryItems.length; i++) {
        const item = summaryItems[i];
        const text = item.textContent;
        
        // Extract amounts using regex
        const match = text.match(/\$([\d,]+\.\d+)/);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          
          if (text.includes('Gross Sales')) {
            data.grossSales = amount;
          } else if (text.includes('Discounts')) {
            data.discounts = amount;
          } else if (text.includes('Returns')) {
            data.returns = amount;
          } else if (text.includes('Net Sales')) {
            data.netSales = amount;
          } else if (text.includes('Taxes')) {
            data.taxes = amount;
          } else if (text.includes('Gross Receipts')) {
            data.grossReceipts = amount;
          } else if (text.includes('Cost')) {
            data.cost = amount;
          } else if (text.includes('Gross Income')) {
            data.grossIncome = amount;
          }
        }
      }
      
      return data;
    });
    
    console.log(`📊 Summary data extracted:`, summaryData);
    
    return summaryData;
    
  } catch (error) {
    console.error(`Summary extraction failed for ${store.name}:`, error.message);
    return { grossSales: 0, discounts: 0, returns: 0, netSales: 0, taxes: 0, grossReceipts: 0, cost: 0, grossIncome: 0 };
  } finally {
    await browser.close();
  }
}

// Run the collection
calculateFromSummary().then(() => {
  console.log('\n✅ Data collection completed!');
}).catch(error => {
  console.error('❌ Data collection failed:', error.message);
}); 