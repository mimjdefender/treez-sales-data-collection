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
    const csvFilePath = await downloadCSV(page, store.name, targetDate);
    
    if (!csvFilePath) {
      console.log('❌ CSV download failed');
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
    // Look for date picker or date input
    console.log('🔍 Looking for date picker...');
    
    // Try to find date input field
    const dateInput = await page.locator('input[type="date"], input[name*="date"], input[id*="date"]').first();
    if (await dateInput.isVisible()) {
      console.log('✅ Found date input field');
      const dateString = targetDate.toISOString().split('T')[0];
      await dateInput.fill(dateString);
      console.log(`📅 Set date to ${dateString}`);
      return;
    }
    
    // Try to find date picker button
    const dateButton = await page.locator('button[aria-label*="date"], button[title*="date"], [role="button"]').filter({ hasText: /date|calendar/i }).first();
    if (await dateButton.isVisible()) {
      console.log('✅ Found date picker button');
      await dateButton.click();
      await page.waitForTimeout(1000);
      
      // Try to set the date
      const dateString = targetDate.toISOString().split('T')[0];
      console.log(`📅 Attempting to set date to ${dateString}`);
      // This might need more complex logic depending on the date picker implementation
    }
    
    console.log('⚠️ Date picker not found, proceeding with default date');
    
  } catch (error) {
    console.log('⚠️ Error setting date:', error.message);
  }
}

async function downloadCSV(page, storeName, targetDate) {
  try {
    // Look for download or export button
    console.log('🔍 Looking for CSV download button...');
    
    // Strategy 1: Look for specific Treez portal download elements
    let downloadButton = await page.locator('button, [role="button"], a, .download-btn, .export-btn').filter({ hasText: /download|export|csv|export to csv|download csv/i }).first();
    
    // Strategy 2: Look for any button with download-related text
    if (!downloadButton || !(await downloadButton.isVisible())) {
      downloadButton = await page.locator('button, [role="button"], a').filter({ hasText: /download|export|csv|save|get data/i }).first();
    }
    
    // Strategy 3: Look for any clickable element that might be for downloading
    if (!downloadButton || !(await downloadButton.isVisible())) {
      downloadButton = await page.locator('[onclick*="download"], [onclick*="export"], [href*=".csv"]').first();
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
    
    // Strategy 4: Look for any element that might trigger a download
    console.log('🔍 Looking for alternative download methods...');
    
    // Try clicking on any element that might have download functionality
    const potentialDownloadElements = await page.locator('*').filter({ hasText: /download|export|csv|save|get data/i }).all();
    console.log(`🔍 Found ${potentialDownloadElements.length} potential download elements`);
    
    for (const element of potentialDownloadElements) {
      try {
        const text = await element.textContent();
        console.log(`📄 Checking element: ${text.substring(0, 100)}...`);
        
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
    
    console.log('❌ Download button not found');
    return null;
    
  } catch (error) {
    console.log('❌ CSV download failed:', error.message);
    return null;
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
