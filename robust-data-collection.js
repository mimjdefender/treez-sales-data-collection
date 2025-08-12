const { chromium } = require('playwright');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// OPTIMIZATION: This script now prioritizes page scraping over CSV download
// CSV is only downloaded as a fallback when page scraping completely fails
// This improves performance and reliability since CSV calculation is complex

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

// No hardcoded fallback data - only use actual CSV data

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
        // No hardcoded fallback - only use actual data
        console.log(`⚠️ ${store.name}: No sales data found, skipping store`);
        results[store.name] = 0;
      }
      
      // Create CSV file
      const csvContent = `Store,Sales Amount,Timestamp\n${store.name},${results[store.name]},${new Date().toISOString()}`;
      const filePath = path.join(__dirname, `treez-${store.name}.csv`);
      fs.writeFileSync(filePath, csvContent);
      console.log(`📄 CSV created: ${filePath}`);
      
    } catch (error) {
      console.error(`❌ Error processing ${store.name}:`, error.message);
      
      // No hardcoded fallback - only use actual data
      console.log(`⚠️ ${store.name}: Processing failed, skipping store`);
      results[store.name] = 0;
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
  
  try {
    const context = await browser.newContext({ 
      acceptDownloads: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Set up download behavior
    await page.context().setDefaultTimeout(30000);
    
    // Navigate to login first
    console.log(`🔐 Navigating to login page...`);
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
    
    // Navigate to the report page
    console.log(`🌐 Navigating to ${store.reportUrl}`);
    await page.goto(store.reportUrl, { waitUntil: 'networkidle' });
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Set the date for the report
    const targetDate = getTargetDate();
    console.log(`📅 Setting date to ${targetDate.month}/${targetDate.day}/${targetDate.year}...`);
    console.log(`📅 Target date object: *** year: ${targetDate.year}, month: ${targetDate.month}, day: ${targetDate.day} ***`);
    
    // Log current time for debugging
    const currentUTC = new Date();
    const currentEST = new Date(currentUTC.getTime() - (4 * 60 * 60 * 1000)); // EST is UTC-4
    console.log(`📅 Current UTC time: ${currentUTC.toISOString()}`);
    console.log(`📅 Current EST time: ${currentEST.toLocaleDateString('en-US')}, ${currentEST.toLocaleTimeString('en-US')}`);
    
    // Find and fill the date input
    const dateInput = await page.locator('input[type="date"]');
    if (await dateInput.isVisible()) {
      const dateString = `${targetDate.year}-${targetDate.month.toString().padStart(2, '0')}-${targetDate.day.toString().padStart(2, '0')}`;
      console.log(`📅 Setting date input to: ${dateString}`);
      await dateInput.fill(dateString);
      
      // Trigger change event
      await dateInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
      await page.waitForTimeout(1000);
    } else {
      console.log(`⚠️ Date input not found, proceeding with default date`);
    }
    
    // Click "Generate Report" button
    console.log(`📊 Step 1: Clicking "Generate Report"...`);
    const generateButton = await page.locator('button:has-text("Generate Report")');
    if (await generateButton.isVisible()) {
      await generateButton.click();
      console.log(`⏳ Waiting for report to generate...`);
      await page.waitForTimeout(5000); // Wait for report to load
    } else {
      console.log(`⚠️ Generate Report button not found, report may already be generated`);
    }
    
    // Wait for summary items to appear after report generation
    await page.waitForSelector('.summary-item', { timeout: 15000 });
    
    // Check page content after report generation
    console.log(`📊 Checking page content after report generation...`);
    const pageContent = await page.evaluate(() => {
      const summaryItems = document.querySelectorAll('.summary-item');
      const items = [];
      for (let i = 0; i < summaryItems.length; i++) {
        items.push(summaryItems[i].textContent);
      }
      return {
        summaryItems: items,
        pageTitle: document.title,
        url: window.location.href
      };
    });
    console.log(`📊 Page title: ${pageContent.pageTitle}`);
    console.log(`📊 Page URL: ${pageContent.url}`);
    console.log(`📊 Summary items found: ${pageContent.summaryItems.length}`);
    pageContent.summaryItems.forEach((item, index) => {
      console.log(`📊 Summary item ${index + 1}: "${item}"`);
    });
    
    // Use the same logic for both MID-DAY and FINAL collections
    // since the 4:20 PM (MID-DAY) works perfectly on GitHub
    const isFinalCollection = process.env.COLLECTION_TIME === "final";
    if (isFinalCollection) {
      console.log(`⏰ FINAL collection - using same logic as MID-DAY (which works on GitHub)`);
      // Use the same timing as MID-DAY collection since it works perfectly
    }
    
    console.log(`🔍 Report generated, starting sales extraction...`);
    
    // Extract sales data - look for Net Sales specifically
    const salesText = await page.evaluate(() => {
      // Find all summary items
      const summaryItems = document.querySelectorAll('.summary-item');
      console.log('Found summary items:', summaryItems.length);
      
      // Log all summary items for debugging
      for (let i = 0; i < summaryItems.length; i++) {
        const item = summaryItems[i];
        const text = item.textContent;
        console.log(`GitHub Actions - Item ${i + 1}: "${text}"`);
      }
      
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
    
    let pageSalesAmount = 0;
    if (salesText) {
      const match = salesText.match(/\$([\d,]+\.\d+)/);
      if (match) {
        const cleanNumber = match[1].replace(/,/g, '');
        pageSalesAmount = parseFloat(cleanNumber);
        console.log(`💰 Page sales amount: $${pageSalesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }
    }
    
    // If we successfully got sales data from the page, return it immediately
    if (pageSalesAmount > 0) {
      console.log(`✅ Successfully extracted sales from page: $${pageSalesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      console.log(`📊 Skipping CSV download since page data is available`);
      return pageSalesAmount;
    }
    
    // Only download CSV if page scraping completely failed
    // CSV calculation is complex and error-prone, so we prioritize page data
    console.log(`⚠️ Page scraping failed, falling back to CSV download...`);
    
    // Try to download CSV and calculate from transactions (fallback only)
    const csvSalesAmount = await downloadCSVAndCalculate(store, page);
    
    if (csvSalesAmount > 0) {
      console.log(`✅ CSV calculation successful: $${csvSalesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      return csvSalesAmount;
    }
    
    console.log(`❌ No sales amount found from either page or CSV`);
    return 0;
    
  } catch (error) {
    console.error(`Scraping failed for ${store.name}:`, error.message);
    return 0;
  } finally {
    await browser.close();
  }
}

async function downloadCSVAndCalculate(store, page) {
  try {
    console.log(`📊 Step 2: Looking for CSV download options...`);
    
    // Look for the "more-btn" (three dots menu) as shown in the recording
    const moreButton = await page.locator('#more-btn');
    if (await moreButton.isVisible()) {
      console.log(`📊 Found more button, clicking to open dropdown...`);
      await moreButton.click();
      
      // Wait for dropdown to appear
      await page.waitForTimeout(1000);
      
      // Look for "CSV Export" option as shown in the recording
      const csvExportOption = await page.getByRole('menuitem', { name: 'CSV Export' });
      if (await csvExportOption.isVisible()) {
        console.log(`📊 Found CSV Export option, clicking to download...`);
        await csvExportOption.click();
        
        // Wait for download to start with longer timeout for GitHub Actions
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
        
        try {
          const download = await downloadPromise;
          const downloadPath = path.join(__dirname, `${store.name}-transactions.csv`);
          await download.saveAs(downloadPath);
          
          console.log(`📥 CSV downloaded: ${downloadPath}`);
          
          // Verify the CSV file size and content
          const fs = require('fs');
          if (fs.existsSync(downloadPath)) {
            const stats = fs.statSync(downloadPath);
            const fileSize = stats.size;
            console.log(`📄 CSV file size: ${fileSize} bytes`);
            
            if (fileSize < 1000) {
              console.log(`⚠️ WARNING: CSV file is very small (${fileSize} bytes), may be incomplete`);
            }
            
            // Read first few lines to verify content
            const content = fs.readFileSync(downloadPath, 'utf8');
            const lines = content.split('\n');
            console.log(`📄 CSV has ${lines.length} lines`);
            console.log(`📄 First line: "${lines[0]}"`);
            console.log(`📄 Second line: "${lines[1]}"`);
            
            if (lines.length <= 2) {
              console.log(`❌ ERROR: CSV appears to be incomplete (only ${lines.length} lines)`);
            }
          } else {
            console.log(`❌ ERROR: CSV file not found at ${downloadPath}`);
          }
          
          // Process the CSV to calculate Net Sales from transactions
          const netSales = await calculateNetSalesFromCSV(downloadPath);
          
          console.log(`💰 Calculated Net Sales from CSV: $${netSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
          
          return netSales;
          
        } catch (downloadError) {
          console.log(`❌ CSV download failed:`, downloadError.message);
        }
      } else {
        console.log(`❌ CSV Export option not found in dropdown`);
      }
    } else {
      console.log(`❌ More button (#more-btn) not found`);
    }
    
    // Fallback: Look for any export or download buttons
    const exportButtons = await page.evaluate(() => {
      const allButtons = document.querySelectorAll('button');
      const exportInfo = [];
      
      for (let i = 0; i < allButtons.length; i++) {
        const button = allButtons[i];
        const text = button.textContent.toLowerCase();
        if (text.includes('export') || text.includes('download') || text.includes('csv') || text.includes('excel')) {
          exportInfo.push({
            index: i + 1,
            text: button.textContent.trim(),
            className: button.className,
            id: button.id
          });
        }
      }
      
      return exportInfo;
    });
    
    console.log(`📊 Export buttons found:`, exportButtons.length);
    
    // If we found export buttons, try to click them
    if (exportButtons.length > 0) {
      console.log(`📊 Trying to click export button: "${exportButtons[0].text}"`);
      
      // Try to click the first export button
      await page.click(`button:has-text("${exportButtons[0].text}")`);
      
      // Wait for download to start with longer timeout for GitHub Actions
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      
      try {
        const download = await downloadPromise;
        const downloadPath = path.join(__dirname, `${store.name}-transactions.csv`);
        await download.saveAs(downloadPath);
        
        console.log(`📥 CSV downloaded: ${downloadPath}`);
        
        // Verify the CSV file size and content
        const fs = require('fs');
        if (fs.existsSync(downloadPath)) {
          const stats = fs.statSync(downloadPath);
          const fileSize = stats.size;
          console.log(`📄 CSV file size: ${fileSize} bytes`);
          
          if (fileSize < 1000) {
            console.log(`⚠️ WARNING: CSV file is very small (${fileSize} bytes), may be incomplete`);
          }
          
          // Read first few lines to verify content
          const content = fs.readFileSync(downloadPath, 'utf8');
          const lines = content.split('\n');
          console.log(`📄 CSV has ${lines.length} lines`);
          console.log(`📄 First line: "${lines[0]}"`);
          console.log(`📄 Second line: "${lines[1]}"`);
          
          if (lines.length <= 2) {
            console.log(`❌ ERROR: CSV appears to be incomplete (only ${lines.length} lines)`);
          }
        } else {
          console.log(`❌ ERROR: CSV file not found at ${downloadPath}`);
        }
        
        // Process the CSV to calculate Net Sales from transactions
        const netSales = await calculateNetSalesFromCSV(downloadPath);
        
        console.log(`💰 Calculated Net Sales from CSV: $${netSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        
        return netSales;
        
      } catch (downloadError) {
        console.log(`❌ CSV download failed:`, downloadError.message);
      }
    }
    
    // If no export buttons or download failed, try to find CSV data in the page
    console.log(`📊 Looking for transaction data in the page...`);
    
    const transactionData = await page.evaluate(() => {
      // Look for table rows with transaction data
      const rows = document.querySelectorAll('tr, .row, [class*="row"]');
      const transactions = [];
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const text = row.textContent;
        
        // Look for dollar amounts in the row
        const matches = text.match(/\$([\d,]+\.\d+)/g);
        if (matches && matches.length > 0) {
          // Extract the first dollar amount as the transaction amount
          const amount = parseFloat(matches[0].replace(/[$,]/g, ''));
          if (amount > 0) {
            transactions.push(amount);
          }
        }
      }
      
      return transactions;
    });
    
    if (transactionData.length > 0) {
      const totalSales = transactionData.reduce((sum, amount) => sum + amount, 0);
      console.log(`💰 Calculated Net Sales from page transactions: $${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${transactionData.length} transactions)`);
      return totalSales;
    }
    
    console.log(`📊 No transaction data found in page, returning 0`);
    return 0;
    
  } catch (error) {
    console.error(`CSV fallback failed:`, error.message);
    return 0;
  }
}

async function calculateNetSalesFromCSV(csvPath) {
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    
    console.log(`📊 Processing CSV with ${lines.length} lines...`);
    console.log(`📄 CSV content preview (first 3 lines):`);
    lines.slice(0, 3).forEach((line, index) => {
      console.log(`  Line ${index + 1}: "${line}"`);
    });
    
    // Debug: Show all lines to see what we're actually getting
    console.log(`📄 Full CSV content (first 10 lines):`);
    lines.slice(0, 10).forEach((line, index) => {
      console.log(`  Line ${index + 1}: "${line}"`);
    });
    
    // Check if we have any non-empty data lines
    const dataLines = lines.filter(line => line.trim() && !line.toLowerCase().includes('header') && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('summary'));
    console.log(`📊 Found ${dataLines.length} data lines (excluding headers)`);
    
    // Group by transaction ID to avoid double-counting line items
    const transactionTotals = new Map();
    let lineItemCount = 0;
    
    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) {
        continue;
      }
      
      // Skip header lines
      if (line.toLowerCase().includes('header') || line.toLowerCase().includes('total') || line.toLowerCase().includes('summary')) {
        console.log(`📄 Skipping header line: "${line}"`);
        continue;
      }
      
      // Parse CSV line by splitting on commas
      const columns = line.split(',');
      console.log(`📄 Processing line with ${columns.length} columns`);
      
      // Look for the "Net Sales" column (index 33) and "Ticket ID" column (index 6)
      // Header: "Date Open,Time Opened,Date Last Modified,Time Last Modified,Date Closed,Time Closed,Ticket ID,Ticket Line ID,Ticket Type,Ticket Notes,Ticket Created User,Ticket Line Created User,Type,Product Type,Subtype,Brand,Product Name,Classification,Tier,Invoice ID,Revenue Source,State Tracking ID,Batch,Location,Receiving License,Distributor,Qty,Total Weight,Price/Unit,Amount,Unit of Measure,Gross Sales,Discounts,Returns,Net Sales,Taxes,Dynamic Tax Label,Gross Receipts,Cost,Gross Income,Avg Product Margin,Customer Name,Customer ID,MMID,Document ID,DOB,Gender,Age,City,State/Province,Country,Address,Zip Code,Customer Group(s),Customer Type,Customer Source,Email,Phone,Attributes,Product Barcodes,Inventory Barcodes,Total Mg THC,Total Mg CBD,Size,Extraction Method,External ID,Caregiver ID,Caregiver Name,Inventory Type,Cashier,Register #"
      
      if (columns.length >= 34) { // Ensure we have enough columns
        const ticketId = columns[6]; // Ticket ID is at index 6
        const netSalesValue = columns[33]; // Net Sales is at index 33
        
        console.log(`📄 Ticket ID: "${ticketId}", Net Sales: "${netSalesValue}"`);
        
        // Parse the net sales value (remove quotes if present)
        const cleanValue = netSalesValue.replace(/"/g, '').trim();
        const cleanTicketId = ticketId.replace(/"/g, '').trim();
        
        if (cleanValue && cleanValue !== 'Net Sales' && cleanValue !== '' && cleanTicketId && cleanTicketId !== 'Ticket ID') {
          const amount = parseFloat(cleanValue);
          if (!isNaN(amount) && amount > 0) {
            // Add to transaction total
            const currentTotal = transactionTotals.get(cleanTicketId) || 0;
            transactionTotals.set(cleanTicketId, currentTotal + amount);
            lineItemCount++;
            console.log(`💰 Found line item: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} for transaction ${cleanTicketId}`);
          } else {
            console.log(`📄 Invalid or zero amount: "${cleanValue}"`);
          }
        } else {
          console.log(`📄 Empty or header value: "${cleanValue}"`);
        }
      } else {
        console.log(`📄 Line has insufficient columns (${columns.length}), skipping`);
      }
    }
    
    // Calculate total sales from unique transactions
    let totalSales = 0;
    let transactionCount = 0;
    
    for (const [ticketId, transactionTotal] of transactionTotals) {
      totalSales += transactionTotal;
      transactionCount++;
      console.log(`📊 Transaction ${ticketId}: $${transactionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    
    console.log(`📊 Found ${transactionCount} unique transactions (${lineItemCount} line items) totaling $${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    
    return totalSales;
    
  } catch (error) {
    console.error(`Error processing CSV:`, error.message);
    return 0;
  }
}

// Helper function to get the target date for date input
function getTargetDate() {
  const currentDate = new Date();
  
  // Check if this is FINAL collection (9:15 PM EST = 2:15 AM UTC next day)
  const isFinalCollection = process.env.COLLECTION_TIME === "final";
  
  if (isFinalCollection) {
    // For FINAL collection, we want the date that just ended at 9:00 PM EST
    // When GitHub Actions runs at 2:15 AM UTC (9:15 PM EST), we want the previous UTC day
    // because 9:15 PM EST is 2:15 AM UTC the next day
    const targetDate = new Date(currentDate);
    targetDate.setUTCDate(targetDate.getUTCDate() - 1);
    
    const year = targetDate.getUTCFullYear();
    const month = targetDate.getUTCMonth() + 1; // getMonth() is 0-indexed
    const day = targetDate.getUTCDate();
    
    console.log(`📅 FINAL collection: Using previous UTC date (stores closed at 9:00 PM EST)`);
    return { year, month, day };
  } else {
    // For MID-DAY collection, use current UTC date
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // getMonth() is 0-indexed
    const day = currentDate.getDate();
    
    console.log(`📅 MID-DAY collection: Using current UTC date`);
    return { year, month, day };
  }
}

// Run the collection
robustDataCollection().then(() => {
  console.log('\n✅ Data collection completed!');
}).catch(error => {
  console.error('❌ Data collection failed:', error.message);
}); 