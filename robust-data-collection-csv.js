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

async function robustDataCollectionCSV() {
  const isFinalCollection = process.env.COLLECTION_TIME === "final";
  const targetDate = getTargetDate();
  
  console.log(`🚀 Starting ${isFinalCollection ? 'FINAL' : 'MID-DAY'} data collection using CSV method...`);
  console.log(`⏰ Collection time: ${isFinalCollection ? '9:15 PM (stores closed at 9:00 PM)' : '4:20 PM (mid-day update)'}`);
  console.log(`📅 Target date: ${targetDate.month}/${targetDate.day}/${targetDate.year}`);
  
  const results = {};
  let successCount = 0;

  for (const store of stores) {
    console.log(`\n📊 Processing ${store.name}...`);
    
    try {
      // Try to get data via CSV
      const salesAmount = await getStoreDataViaCSV(store, targetDate);
      
      if (salesAmount > 0) {
        results[store.name] = salesAmount;
        successCount++;
        console.log(`✅ ${store.name}: $${salesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      } else {
        throw new Error(`Failed to get data for ${store.name} - no sales amount found`);
      }
      
      // Create CSV file
      const csvContent = `Store,Sales Amount,Timestamp\n${store.name},${results[store.name]},${new Date().toISOString()}`;
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

async function getStoreDataViaCSV(store, targetDate) {
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
      // Find and set the date input field
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
    
    console.log(`📊 Generating CSV report...`);
    
    // Click the generate report button
    await page.click('button:has-text("Generate Report")');
    
    // Wait for the download to start
    const downloadPromise = page.waitForEvent('download');
    
    // Wait for the download to complete
    const download = await downloadPromise;
    
    // Save the file
    const downloadPath = path.join(__dirname, `${store.name}-report.csv`);
    await download.saveAs(downloadPath);
    
    console.log(`📥 CSV downloaded: ${downloadPath}`);
    
    // Process the CSV to calculate Net Sales
    const netSales = await processCSVForNetSales(downloadPath);
    
    console.log(`💰 Calculated Net Sales: $${netSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    
    return netSales;
    
  } catch (error) {
    console.error(`CSV method failed for ${store.name}:`, error.message);
    return 0;
  } finally {
    await browser.close();
  }
}

async function processCSVForNetSales(csvPath) {
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    
    console.log(`📊 Processing CSV with ${lines.length} lines...`);
    
    let netSales = 0;
    let foundNetSales = false;
    
    for (const line of lines) {
      if (line.includes('Net Sales') || line.includes('net sales')) {
        // Extract the amount from the line
        const match = line.match(/[\$]?([\d,]+\.\d+)/);
        if (match) {
          netSales = parseFloat(match[1].replace(/,/g, ''));
          foundNetSales = true;
          console.log(`✅ Found Net Sales in CSV: $${netSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
          break;
        }
      }
    }
    
    if (!foundNetSales) {
      console.log(`⚠️ Net Sales not found in CSV, calculating from transactions...`);
      // If Net Sales not found, calculate from transaction data
      netSales = calculateNetSalesFromTransactions(lines);
    }
    
    return netSales;
    
  } catch (error) {
    console.error(`Error processing CSV:`, error.message);
    return 0;
  }
}

function calculateNetSalesFromTransactions(lines) {
  let totalSales = 0;
  let totalReturns = 0;
  
  for (const line of lines) {
    // Look for transaction amounts
    const salesMatch = line.match(/[\$]?([\d,]+\.\d+)/);
    if (salesMatch) {
      const amount = parseFloat(salesMatch[1].replace(/,/g, ''));
      
      // Determine if it's a sale or return based on context
      if (line.toLowerCase().includes('return') || line.toLowerCase().includes('refund')) {
        totalReturns += amount;
      } else if (line.toLowerCase().includes('sale') || line.toLowerCase().includes('transaction')) {
        totalSales += amount;
      }
    }
  }
  
  const netSales = totalSales - totalReturns;
  console.log(`📊 Calculated from transactions: Sales $${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Returns $${totalReturns.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Net $${netSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  
  return netSales;
}

// Run the collection
robustDataCollectionCSV().then(() => {
  console.log('\n✅ Data collection completed!');
}).catch(error => {
  console.error('❌ Data collection failed:', error.message);
}); 