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
    
    // Set the date on the page to ensure we get the correct data
    const targetDate = getTargetDate();
    console.log(`📅 Setting date to ${targetDate.month}/${targetDate.day}/${targetDate.year}...`);
    console.log(`📅 Target date object:`, targetDate);
    console.log(`📅 Current UTC time:`, new Date().toISOString());
    console.log(`📅 Current EST time:`, new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    await page.evaluate((date) => {
      // Find and set the date input field
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) {
        const dateString = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
        dateInput.value = dateString;
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`Date set to: ${dateString}`);
        
        // Debug: Check what date is actually set
        console.log(`📅 Date input value after setting: ${dateInput.value}`);
        
        // For FINAL collection, try to set a time range for the entire day
        // Note: process.env is not available in browser context, so we'll always try to set time range
        console.log(`⏰ Attempting to set time range for entire day`);
        // Look for time range inputs and set them to cover the entire day
        const timeInputs = document.querySelectorAll('input[type="time"]');
        console.log(`📅 Found ${timeInputs.length} time inputs`);
        
        if (timeInputs.length >= 2) {
          timeInputs[0].value = '00:00'; // Start of day
          timeInputs[1].value = '23:59'; // End of day
          timeInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
          timeInputs[1].dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`Time range set: 00:00 - 23:59`);
          console.log(`📅 Time input 1 value: ${timeInputs[0].value}`);
          console.log(`📅 Time input 2 value: ${timeInputs[1].value}`);
        } else {
          console.log(`No time range inputs found, continuing without time range`);
        }
      } else {
        console.log('No date input found, continuing with default date');
      }
    }, targetDate);
    
    // Wait for date to be set and page to update
    await page.waitForTimeout(3000);
    
    // Generate the report first
    console.log(`📊 Step 1: Clicking "Generate Report"...`);
    await page.click('button:has-text("Generate Report")');
    
    // Wait for the report to generate and summary items to appear
    console.log(`⏳ Waiting for report to generate...`);
    await page.waitForTimeout(10000); // Wait longer for full data
    
    // Wait for summary items to be present after report generation
    await page.waitForSelector('.summary-item', { timeout: 15000 });
    
    // Debug: Check what the page shows us
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
    
    // Always try to download CSV for more accurate data
    console.log(`📊 Always downloading CSV for accurate transaction data...`);
    
    // Try to download CSV and calculate from transactions
    const csvSalesAmount = await downloadCSVAndCalculate(store, page);
    
    if (csvSalesAmount > 0) {
      console.log(`✅ CSV calculation successful: $${csvSalesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      return csvSalesAmount;
    } else if (pageSalesAmount > 0) {
      // If CSV failed but we have page data, use that
      console.log(`⚠️ CSV failed, using page data: $${pageSalesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      return pageSalesAmount;
    }
    
    console.log(`❌ No sales amount found`);
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
        
        // Wait for download to start
        const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
        
        try {
          const download = await downloadPromise;
          const downloadPath = path.join(__dirname, `${store.name}-transactions.csv`);
          await download.saveAs(downloadPath);
          
          console.log(`📥 CSV downloaded: ${downloadPath}`);
          
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
      
      // Wait for download to start
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      
      try {
        const download = await downloadPromise;
        const downloadPath = path.join(__dirname, `${store.name}-transactions.csv`);
        await download.saveAs(downloadPath);
        
        console.log(`📥 CSV downloaded: ${downloadPath}`);
        
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
    // For FINAL collection, we want TODAY's date (the day that just ended at 9:00 PM)
    // The stores close at 9:00 PM EST, so we want the current EST date
    const estDate = new Date();
    // Convert to EST timezone
    const estTimeString = estDate.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const estDateParts = new Date(estTimeString);
    
    const year = estDateParts.getFullYear();
    const month = estDateParts.getMonth() + 1; // getMonth() is 0-indexed
    const day = estDateParts.getDate();
    
    console.log(`📅 FINAL collection: Using current EST date (stores closed at 9:00 PM)`);
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