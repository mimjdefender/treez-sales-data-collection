// Load environment variables from .env file
require('dotenv').config();

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// CSV-BASED APPROACH: Downloads CSV files and calculates net revenue from them
// This approach is more reliable for GitHub Actions than page scraping

const stores = [
  { name: 'cheboygan', url: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport' },
  { name: 'alpena', url: 'https://medscafealpena.treez.io/portalDispensary/portal/ProductsReport' }
];

async function main() {
  console.log('🚀 Starting CSV-based net sales collection...');
  
  // Check credentials
  if (!process.env.TREEZ_EMAIL || !process.env.TREEZ_PASSWORD) {
    console.error('❌ Missing credentials! Please set TREEZ_EMAIL and TREEZ_PASSWORD in .env file');
    process.exit(1);
  }
  
  console.log(`✅ Credentials found for: ${process.env.TREEZ_EMAIL}`);
  
  // Determine collection type
  const collectionTime = process.env.COLLECTION_TIME || 'mid-day';
  console.log(`⏰ Collection time: ${collectionTime === 'final' ? '9:15 PM (final)' : '4:20 PM (mid-day update)'}`);
  
  // Calculate the target date based on timezone logic
  const targetDate = calculateTargetDate();
  console.log(`📅 Target date for CSV download: ${targetDate.toISOString().split('T')[0]} (${targetDate.toLocaleDateString('en-US', { timeZone: 'America/New_York' })} EST)`);
  
  const browser = await chromium.launch({ 
    headless: process.env.GITHUB_ACTIONS ? true : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  
  try {
    const results = {};
    
    for (const store of stores) {
      console.log(`📊 Processing ${store.name}...`);
      
      const netSales = await downloadCSVAndCalculateNetSales(store, browser, targetDate, collectionTime);
      results[store.name] = netSales;
      
      console.log(`💰 ${store.name}: $${netSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    
    // Save results
    let csvContent = `Store,Net Sales,Target Date,Timestamp,Collection Type\n`;
    for (const [storeName, sales] of Object.entries(results)) {
      csvContent += `${storeName},${sales},${targetDate.toISOString().split('T')[0]},${new Date().toISOString()},${collectionTime}\n`;
    }
    
    const filePath = path.join(__dirname, `net-sales-${collectionTime}-${targetDate.toISOString().split('T')[0]}.csv`);
    fs.writeFileSync(filePath, csvContent);
    console.log(`📄 Results saved: ${filePath}`);
    
    // Upload to Google Drive if credentials available
    if (fs.existsSync('./creds/credentials.json')) {
      try {
        const { uploadToDrive } = require('./uploadToDrive.js');
        await uploadToDrive(filePath, 'Net Sales Data');
        console.log('☁️ Results uploaded to Google Drive');
      } catch (error) {
        console.log('⚠️ Google Drive upload failed:', error.message);
      }
    }
    
  } finally {
    await browser.close();
  }
}

function calculateTargetDate() {
  const now = new Date();
  const utcDate = now.getUTCDate();
  const utcMonth = now.getUTCMonth();
  const utcYear = now.getUTCFullYear();
  
  // Get EST date (America/New_York timezone)
  const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const estDay = estDate.getDate();
  const estMonth = estDate.getMonth();
  const estYear = estDate.getFullYear();
  
  console.log(`🌍 UTC Date: ${utcYear}-${(utcMonth + 1).toString().padStart(2, '0')}-${utcDate.toString().padStart(2, '0')}`);
  console.log(`🇺🇸 EST Date: ${estYear}-${(estMonth + 1).toString().padStart(2, '0')}-${estDay.toString().padStart(2, '0')}`);
  
  // If UTC is next day but EST is not, download previous day
  // If both UTC and EST are same day, download current day
  if (utcDate > estDay || (utcDate === 1 && estDay > 1)) {
    // UTC is ahead, download previous day in EST
    const previousDay = new Date(estDate);
    previousDay.setDate(previousDay.getDate() - 1);
    console.log(`📅 Downloading previous day CSV (UTC ahead of EST)`);
    return previousDay;
  } else {
    // Same day, download current day
    console.log(`📅 Downloading current day CSV (UTC and EST same day)`);
    return estDate;
  }
}

async function downloadCSVAndCalculateNetSales(store, browser, targetDate, collectionTime) {
  const page = await browser.newPage();
  
  try {
    // Login
    console.log(`🔐 Logging into ${store.name}...`);
    await page.goto(store.url);
    
    // Check if we need to login
    const loginPageTitle = await page.title();
    if (loginPageTitle.includes('Sign In') || loginPageTitle.includes('Login')) {
      console.log('🔑 Need to login, navigating to login page...');
      await page.goto('https://medscafecheboygan.treez.io/portalDispensary/portal/login');
      await page.waitForTimeout(3000);
      
      // Login process
      await performLogin(page);
      
      // Navigate to reports
      await page.goto(store.url);
      const waitTime = process.env.GITHUB_ACTIONS ? 5000 : 2000;
      console.log(`⏳ Waiting ${waitTime}ms for page to load...`);
      await page.waitForTimeout(waitTime);
    }
    
    // Set the date for CSV download
    console.log(`📅 Setting date to ${targetDate.toLocaleDateString('en-US')} for CSV download...`);
    await setDateForCSVDownload(page, targetDate);
    
    // Generate report first (required before CSV download)
    console.log('📊 Generating report...');
    await generateReport(page);
    
    // Download CSV
    console.log('📥 Downloading CSV file...');
    
    // Debug: Take screenshot and save page content to see what's available
    try {
      console.log('📸 Taking debug screenshot...');
      await page.screenshot({ path: `debug-${store.name}-${Date.now()}.png`, fullPage: true });
      
      console.log('📄 Saving page content for debugging...');
      const pageContent = await page.content();
      fs.writeFileSync(`debug-${store.name}-${Date.now()}.html`, pageContent);
      
      console.log('🔍 Final page title:', await page.title());
      console.log('🔍 Final URL:', page.url());
      
      // Look for any buttons or clickable elements on the page
      const allButtons = await page.locator('button, [role="button"], a, input[type="button"], input[type="submit"]').all();
      console.log(`🔍 Found ${allButtons.length} total buttons/clickable elements`);
      
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        try {
          const button = allButtons[i];
          const text = await button.textContent();
          const tagName = await button.evaluate(el => el.tagName);
          const className = await button.evaluate(el => el.className);
          console.log(`🔍 Button ${i + 1}: <${tagName}> "${text}" class="${className}"`);
        } catch (e) {
          console.log(`🔍 Button ${i + 1}: Error reading - ${e.message}`);
        }
      }
    } catch (e) {
      console.log('⚠️ Debug capture failed:', e.message);
    }
    
    const csvFilePath = await downloadCSV(page, store.name, targetDate);
    
    if (!csvFilePath) {
      console.log('❌ CSV download failed - this approach requires CSV download to work');
      console.log('🔍 Check the debug files to see what elements are available on the page');
      return 0;
    }
    
    // Calculate net revenue from CSV
    console.log('🧮 Calculating net revenue from CSV...');
    const netRevenue = calculateNetRevenueFromCSV(csvFilePath);
    
    // Clean up downloaded file
    if (fs.existsSync(csvFilePath)) {
      fs.unlinkSync(csvFilePath);
      console.log('🗑️ Cleaned up downloaded CSV file');
    }
    
    return netRevenue;
    
  } catch (error) {
    console.error(`❌ Error processing ${store.name}:`, error.message);
    return 0;
  } finally {
    await page.close();
  }
}

async function performLogin(page) {
  console.log('🔍 Checking login page elements...');
  
  // Look for input fields
  const inputFields = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    return Array.from(inputs).map(input => ({
      type: input.type,
      name: input.name,
      id: input.id,
      placeholder: input.placeholder,
      className: input.className
    }));
  });
  console.log('🔍 Found input fields:', inputFields);
  
  // Find and fill email field
  let emailField = await page.locator('input').first();
  if (await emailField.isVisible()) {
    console.log('🔑 Filling email...');
    await emailField.fill(process.env.TREEZ_EMAIL);
    console.log('✅ Email filled');
  }
  
  // Find and fill password field
  let passwordField = await page.locator('input[type="password"]').first();
  if (await passwordField.isVisible()) {
    console.log('🔑 Filling password...');
    await passwordField.fill(process.env.TREEZ_PASSWORD);
    console.log('✅ Password filled');
    
    // Submit
    console.log('🔑 Pressing Enter to submit...');
    await passwordField.press('Enter');
    await page.waitForNavigation();
    console.log('✅ Login successful');
  }
}

async function generateReport(page) {
  try {
    console.log('📊 Looking for Generate Report button...');
    let generateButton = null;
    
    // Strategy 1: Look for button with "Generate Report" text
    try {
      generateButton = await page.locator('button:has-text("Generate Report")').first();
      if (await generateButton.isVisible()) {
        console.log('✅ Found Generate Report button by text');
      }
    } catch (e) {
      console.log('❌ Generate Report button not found by text');
    }
    
    // Strategy 2: Look for any button that might generate reports
    if (!generateButton || !(await generateButton.isVisible())) {
      try {
        generateButton = await page.locator('button').filter({ hasText: /generate|report|submit/i }).first();
        if (await generateButton.isVisible()) {
          console.log('✅ Found button with generate/report text');
        }
      } catch (e) {
        console.log('❌ No generate/report buttons found');
      }
    }
    
    if (generateButton && await generateButton.isVisible()) {
      console.log('📊 Generating report...');
      await generateButton.click();
      
      // Wait longer for GitHub Actions environment
      const reportWaitTime = process.env.GITHUB_ACTIONS ? 10000 : 5000;
      console.log(`⏳ Waiting ${reportWaitTime}ms for report to generate...`);
      await page.waitForTimeout(reportWaitTime);
      
      // Additional wait for data to load
      console.log('⏳ Waiting for data to load...');
      await page.waitForTimeout(3000);
      
      console.log('✅ Report generated');
    } else {
      console.log('⚠️ Generate Report button not found - proceeding without report generation');
    }
  } catch (error) {
    console.log('⚠️ Error generating report:', error.message);
  }
}

async function setDateForCSVDownload(page, targetDate) {
  try {
    console.log('🔍 Looking for date picker with multiple strategies...');
    
    // Strategy 1: Look for date input field
    let dateInput = await page.locator('input[type="date"], input[name*="date"], input[id*="date"]').first();
    if (!dateInput || !(await dateInput.isVisible())) {
      // Strategy 2: Look for any input that might be a date
      dateInput = await page.locator('input').filter({ hasText: /date|calendar/i }).first();
    }
    if (!dateInput || !(await dateInput.isVisible())) {
      // Strategy 3: Look for any input with date-related attributes
      dateInput = await page.locator('input[placeholder*="date"], input[placeholder*="Date"], input[aria-label*="date"]').first();
    }
    
    if (dateInput && await dateInput.isVisible()) {
      console.log('✅ Found date input field');
      const dateString = targetDate.toISOString().split('T')[0];
      await dateInput.fill(dateString);
      console.log(`📅 Set date to ${dateString}`);
      await page.waitForTimeout(1000);
      return;
    }
    
    // Strategy 4: Look for date picker button or calendar icon
    let dateButton = await page.locator('button[aria-label*="date"], button[title*="date"], [role="button"]').filter({ hasText: /date|calendar/i }).first();
    if (!dateButton || !(await dateButton.isVisible())) {
      // Strategy 5: Look for any clickable element with date/calendar text
      dateButton = await page.locator('button, [role="button"], a, .date-picker, .calendar-btn').filter({ hasText: /date|calendar|pick date|select date/i }).first();
    }
    if (!dateButton || !(await dateButton.isVisible())) {
      // Strategy 6: Look for any element that might be a date picker
      dateButton = await page.locator('[onclick*="date"], [onclick*="calendar"], .date-input, .date-field').first();
    }
    
    if (dateButton && await dateButton.isVisible()) {
      console.log('✅ Found date picker button');
      await dateButton.click();
      await page.waitForTimeout(2000);
      
      // Try to set the date in the opened picker
      const dateString = targetDate.toISOString().split('T')[0];
      console.log(`📅 Attempting to set date to ${dateString}`);
      
      // Look for date input in the opened picker
      const pickerDateInput = await page.locator('input[type="date"], input[name*="date"], input[type="text"]').filter({ hasText: /^\d{4}-\d{2}-\d{2}$/ }).first();
      if (pickerDateInput && await pickerDateInput.isVisible()) {
        await pickerDateInput.fill(dateString);
        console.log(`📅 Set date in picker to ${dateString}`);
      }
      
      // Look for a "Done" or "OK" button to close the picker
      const doneButton = await page.locator('button, [role="button"]').filter({ hasText: /done|ok|apply|close|select/i }).first();
      if (doneButton && await doneButton.isVisible()) {
        await doneButton.click();
        console.log('✅ Closed date picker');
      }
      
      await page.waitForTimeout(1000);
      return;
    }
    
    // Strategy 7: Try to find and click on any element that might set the date
    console.log('🔍 Looking for alternative date setting methods...');
    const allElements = await page.locator('*').filter({ hasText: /date|calendar|pick|select/i }).all();
    console.log(`🔍 Found ${allElements.length} elements with date-related text`);
    
    for (const element of allElements) {
      try {
        const text = await element.textContent();
        console.log(`📄 Checking element: "${text.substring(0, 50)}..."`);
        
        if (await element.isVisible()) {
          console.log('🔄 Trying to interact with date element...');
          await element.click();
          await page.waitForTimeout(1000);
          
          // Try to set the date if a picker opened
          const dateString = targetDate.toISOString().split('T')[0];
          const anyDateInput = await page.locator('input[type="date"], input[type="text"]').first();
          if (anyDateInput && await anyDateInput.isVisible()) {
            await anyDateInput.fill(dateString);
            console.log(`📅 Set date to ${dateString}`);
            return;
          }
        }
      } catch (e) {
        console.log('⚠️ Error with date element:', e.message);
      }
    }
    
    console.log('⚠️ Date picker not found, proceeding with default date');
    
  } catch (error) {
    console.log('⚠️ Error setting date:', error.message);
  }
}

async function downloadCSV(page, storeName, targetDate) {
  try {
    console.log('🔍 Looking for CSV download button with multiple strategies...');
    
    // Strategy 1: Look for specific Treez portal download elements
    let downloadButton = await page.locator('button, [role="button"], a, .download-btn, .export-btn').filter({ hasText: /download|export|csv|export to csv|download csv/i }).first();
    
    // Strategy 2: Look for any button with download-related text
    if (!downloadButton || !(await downloadButton.isVisible())) {
      downloadButton = await page.locator('button, [role="button"], a').filter({ hasText: /download|export|csv|save|get data|export data/i }).first();
    }
    
    // Strategy 3: Look for any clickable element that might be for downloading
    if (!downloadButton || !(await downloadButton.isVisible())) {
      downloadButton = await page.locator('[onclick*="download"], [onclick*="export"], [href*=".csv"], [data-action*="download"], [data-action*="export"]').first();
    }
    
    // Strategy 4: Look for any element with download-related classes or IDs
    if (!downloadButton || !(await downloadButton.isVisible())) {
      downloadButton = await page.locator('.download, .export, .csv-download, .data-export, #download, #export').first();
    }
    
    if (await downloadButton.isVisible()) {
      console.log('✅ Found download button');
      
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();
      
      const download = await downloadPromise;
      const suggestedFilename = download.suggestedFilename();
      const downloadPath = path.join(__dirname, `${storeName}-${targetDate.toISOString().split('T')[0]}.csv`);
      
      await download.saveAs(downloadPath);
      console.log(`📥 CSV downloaded: ${downloadPath}`);
      
      return downloadPath;
    }
    
    // Strategy 5: Look for any element that might trigger a download
    console.log('🔍 Looking for alternative download methods...');
    
    // Try clicking on any element that might have download functionality
    const potentialDownloadElements = await page.locator('*').filter({ hasText: /download|export|csv|save|get data|export data|get csv|download data/i }).all();
    console.log(`🔍 Found ${potentialDownloadElements.length} potential download elements`);
    
    for (const element of potentialDownloadElements) {
      try {
        const text = await element.textContent();
        console.log(`📄 Checking element: "${text.substring(0, 100)}..."`);
        
        if (await element.isVisible()) {
          console.log('🔄 Trying to click potential download element...');
          const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
          await element.click();
          
          try {
            const download = await downloadPromise;
            const downloadPath = path.join(__dirname, `${storeName}-${targetDate.toISOString().split('T')[0]}.csv`);
            await download.saveAs(downloadPath);
            console.log(`📥 CSV downloaded via alternative method: ${downloadPath}`);
            return downloadPath;
          } catch (e) {
            console.log('⚠️ No download triggered, trying next element...');
          }
        }
      } catch (e) {
        console.log('⚠️ Error with element:', e.message);
      }
    }
    
    // Strategy 6: Look for any clickable element that might be hidden or have different text
    console.log('🔍 Looking for any clickable elements that might be download buttons...');
    const allClickableElements = await page.locator('button, [role="button"], a, input[type="button"], input[type="submit"]').all();
    console.log(`🔍 Found ${allClickableElements.length} total clickable elements`);
    
    for (let i = 0; i < Math.min(allClickableElements.length, 20); i++) {
      try {
        const element = allClickableElements[i];
        const text = await element.textContent();
        const tagName = await element.evaluate(el => el.tagName);
        const className = await element.evaluate(el => el.className);
        
        // Skip elements that are clearly not download buttons
        if (text.toLowerCase().includes('generate') || text.toLowerCase().includes('submit') || text.toLowerCase().includes('login')) {
          continue;
        }
        
        if (await element.isVisible()) {
          console.log(`🔄 Trying element ${i + 1}: <${tagName}> "${text}" class="${className}"`);
          const downloadPromise = page.waitForEvent('download', { timeout: 3000 });
          await element.click();
          
          try {
            const download = await downloadPromise;
            const downloadPath = path.join(__dirname, `${storeName}-${targetDate.toISOString().split('T')[0]}.csv`);
            await download.saveAs(downloadPath);
            console.log(`📥 CSV downloaded via clickable element: ${downloadPath}`);
            return downloadPath;
          } catch (e) {
            console.log('⚠️ No download triggered, trying next element...');
          }
        }
      } catch (e) {
        console.log(`⚠️ Error with element ${i + 1}:`, e.message);
      }
    }
    
    console.log('❌ Download button not found after trying all strategies');
    return null;
    
  } catch (error) {
    console.log('❌ CSV download failed:', error.message);
    return null;
  }
}

async function extractNetSalesFromPage(page) {
  try {
    console.log('🔍 Extracting net sales from page...');
    
    // Strategy 1: Look for the summary item with net sales (most reliable)
    try {
      const summaryItems = await page.locator('.summary-item').filter({ hasText: /Net Sales/ }).all();
      console.log(`🔍 Found ${summaryItems.length} summary items with Net Sales`);
      
      // Look for the one with actual dollar amounts (not $0.00)
      for (const summaryItem of summaryItems) {
        try {
          const summaryText = await summaryItem.textContent();
          console.log(`📊 Checking summary item: ${summaryText}`);
          
          const match = summaryText.match(/\$([\d,]+\.\d+)/);
          if (match) {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            
            // Skip if it's $0.00 (probably old/empty data)
            if (amount > 0) {
              console.log(`💰 Net sales found in summary: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
              return amount;
            } else {
              console.log(`⚠️  Skipping $0.00 summary item (likely old/empty data)`);
            }
          }
        } catch (e) {
          console.log(`⚠️  Error reading summary item: ${e.message}`);
        }
      }
      
      // If no non-zero amounts found, try the last one (most recent)
      if (summaryItems.length > 0) {
        try {
          const lastSummaryItem = summaryItems[summaryItems.length - 1];
          const summaryText = await lastSummaryItem.textContent();
          console.log(`📊 Trying last summary item: ${summaryText}`);
          
          const match = summaryText.match(/\$([\d,]+\.\d+)/);
          if (match) {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            console.log(`💰 Net sales found in last summary: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            return amount;
          }
        } catch (e) {
          console.log(`⚠️  Error reading last summary item: ${e.message}`);
        }
      }
    } catch (e) {
      console.log('❌ Summary item approach failed:', e.message);
    }
    
    // Strategy 2: Look for any element containing "Net Sales" and a dollar amount
    try {
      const netSalesElements = await page.locator('*').filter({ hasText: /Net Sales.*\$[\d,]+\.\d+/ }).all();
      console.log(`🔍 Found ${netSalesElements.length} elements with Net Sales and dollar amounts`);
      
      for (const element of netSalesElements) {
        try {
          const text = await element.textContent();
          console.log(`📄 Checking element: ${text.substring(0, 100)}...`);
          
          const match = text.match(/\$([\d,]+\.\d+)/);
          if (match) {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            console.log(`💰 Net sales found: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            return amount;
          }
        } catch (e) {
          // Continue to next element
        }
      }
    } catch (e) {
      console.log('❌ Element search approach failed:', e.message);
    }
    
    // Strategy 3: Look for any dollar amount near "Net Sales" text
    try {
      const pageContent = await page.content();
      const netSalesMatch = pageContent.match(/Net Sales[^$]*\$([\d,]+\.\d+)/);
      if (netSalesMatch) {
        const amount = parseFloat(netSalesMatch[1].replace(/,/g, ''));
        console.log(`💰 Net sales found in page content: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        return amount;
      }
    } catch (e) {
      console.log('❌ Page content search failed:', e.message);
    }
    
    console.log('❌ Net sales not found on page');
    return 0;
    
  } catch (error) {
    console.log('❌ Error extracting net sales from page:', error.message);
    return 0;
  }
}

function calculateNetRevenueFromCSV(csvFilePath) {
  try {
    console.log(`📊 Reading CSV file: ${csvFilePath}`);
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    
    // Parse CSV content
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log(`📊 CSV headers: ${headers.join(', ')}`);
    
    // Look for net sales or revenue columns
    let netSalesColumn = -1;
    let revenueColumn = -1;
    
    headers.forEach((header, index) => {
      if (header.toLowerCase().includes('net sales') || header.toLowerCase().includes('net revenue')) {
        netSalesColumn = index;
      }
      if (header.toLowerCase().includes('revenue') || header.toLowerCase().includes('total')) {
        revenueColumn = index;
      }
    });
    
    if (netSalesColumn === -1 && revenueColumn === -1) {
      console.log('❌ No net sales or revenue column found in CSV');
      return 0;
    }
    
    const targetColumn = netSalesColumn !== -1 ? netSalesColumn : revenueColumn;
    console.log(`💰 Using column: ${headers[targetColumn]} (index ${targetColumn})`);
    
    // Calculate total from the column
    let total = 0;
    let validRows = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values[targetColumn]) {
        const amount = parseFloat(values[targetColumn].replace(/[$,]/g, ''));
        if (!isNaN(amount)) {
          total += amount;
          validRows++;
        }
      }
    }
    
    console.log(`📊 Processed ${validRows} rows, total: $${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    return total;
    
  } catch (error) {
    console.log('❌ Error calculating net revenue from CSV:', error.message);
    return 0;
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, downloadCSVAndCalculateNetSales, calculateTargetDate };
