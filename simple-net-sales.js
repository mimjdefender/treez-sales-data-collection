// Load environment variables from .env file
require('dotenv').config();

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// SIMPLIFIED SCRIPT: Only scrapes net sales from the page
// No CSV downloads, no complex fallbacks - just clean, focused functionality

const stores = [
  { name: 'cheboygan', url: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport' },
  { name: 'alpena', url: 'https://medscafealpena.treez.io/portalDispensary/portal/ProductsReport' }
];

async function main() {
  console.log('🚀 Starting simplified net sales collection...');
  
  // Check credentials
  if (!process.env.TREEZ_EMAIL || !process.env.TREEZ_PASSWORD) {
    console.error('❌ Missing credentials! Please set TREEZ_EMAIL and TREEZ_PASSWORD in .env file');
    console.log('📝 Example .env file:');
    console.log('TREEZ_EMAIL=your-email@example.com');
    console.log('TREEZ_PASSWORD=your-password');
    process.exit(1);
  }
  
  console.log(`✅ Credentials found for: ${process.env.TREEZ_EMAIL}`);
  
  // Determine collection type
  const collectionTime = process.env.COLLECTION_TIME || 'mid-day';
  console.log(`⏰ Collection time: ${collectionTime === 'final' ? '9:15 PM (final)' : '4:20 PM (mid-day update)'}`);
  
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
      
      const netSales = await scrapeNetSales(store, browser, collectionTime);
      results[store.name] = netSales;
      
      console.log(`💰 ${store.name}: $${netSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    
    // Save results
    let csvContent = `Store,Net Sales,Timestamp,Collection Type\n`;
    for (const [storeName, sales] of Object.entries(results)) {
      csvContent += `${storeName},${sales},${new Date().toISOString()},${collectionTime}\n`;
    }
    
    const filePath = path.join(__dirname, `net-sales-${collectionTime}-${new Date().toISOString().split('T')[0]}.csv`);
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

async function scrapeNetSales(store, browser, collectionTime) {
  const page = await browser.newPage();
  
  try {
    // Login
    console.log(`🔐 Logging into ${store.name}...`);
    await page.goto('https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport');
    
    // Check if we need to login
    const loginPageTitle = await page.title();
    if (loginPageTitle.includes('Sign In') || loginPageTitle.includes('Login')) {
      console.log('🔑 Need to login, navigating to login page...');
      await page.goto('https://medscafecheboygan.treez.io/portalDispensary/portal/login');
      await page.waitForTimeout(3000);
      
      // Debug: Check what's on the login page
      console.log('🔍 Checking login page elements...');
      const currentPageTitle = await page.title();
      console.log(`📄 Page title: ${currentPageTitle}`);
       
       // Look for all input fields on the page
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
       
       // Try to find email field with multiple strategies
       console.log('🔑 Looking for email field...');
       let emailField = null;
       
       // Strategy 1: Look for email input
       try {
         emailField = await page.locator('input[type="email"]').first();
         if (await emailField.isVisible()) {
           console.log('✅ Found email field by type="email"');
         }
       } catch (e) {
         console.log('❌ Email field not found by type="email"');
       }
       
       // Strategy 2: Look for input with email in name/placeholder
       if (!emailField || !(await emailField.isVisible())) {
         try {
           emailField = await page.locator('input[name*="email"], input[placeholder*="email"], input[placeholder*="Email"]').first();
           if (await emailField.isVisible()) {
             console.log('✅ Found email field by name/placeholder');
           }
         } catch (e) {
           console.log('❌ Email field not found by name/placeholder');
         }
       }
       
       // Strategy 3: Look for any input that might be email
       if (!emailField || !(await emailField.isVisible())) {
         try {
           emailField = await page.locator('input').first();
           if (await emailField.isVisible()) {
             console.log('✅ Using first input field as email field');
           }
         } catch (e) {
           console.log('❌ No input fields found at all');
         }
       }
       
       // Fill email if found
       if (emailField && await emailField.isVisible()) {
         console.log('🔑 Filling email...');
         await emailField.fill(process.env.TREEZ_EMAIL);
         console.log('✅ Email filled');
       } else {
         console.log('❌ Could not find email field');
         return 0;
       }
       
       // Look for password field
       console.log('🔑 Looking for password field...');
       let passwordField = null;
       
       // Strategy 1: Look for password input
       try {
         passwordField = await page.locator('input[type="password"]').first();
         if (await passwordField.isVisible()) {
           console.log('✅ Found password field by type="password"');
         }
       } catch (e) {
         console.log('❌ Password field not found by type="password"');
       }
       
       // Strategy 2: Look for input with password in name/placeholder
       if (!passwordField || !(await passwordField.isVisible())) {
         try {
           passwordField = await page.locator('input[name*="password"], input[placeholder*="password"], input[placeholder*="Password"]').first();
           if (await passwordField.isVisible()) {
             console.log('✅ Found password field by name/placeholder');
           }
         } catch (e) {
           console.log('❌ Password field not found by name/placeholder');
         }
       }
       
       // Strategy 3: Look for second input field
       if (!passwordField || !(await passwordField.isVisible())) {
         try {
           passwordField = await page.locator('input').nth(1);
           if (await passwordField.isVisible()) {
             console.log('✅ Using second input field as password field');
           }
         } catch (e) {
           console.log('❌ Could not find second input field');
         }
       }
       
       // Fill password if found
       if (passwordField && await passwordField.isVisible()) {
         console.log('🔑 Filling password...');
         await passwordField.fill(process.env.TREEZ_PASSWORD);
         console.log('✅ Password filled');
       } else {
         console.log('❌ Could not find password field');
         return 0;
       }
       
       // Press Enter on password field
       console.log('🔑 Pressing Enter to submit...');
       await passwordField.press('Enter');
      
      // Wait for navigation
      await page.waitForNavigation();
      console.log('✅ Login successful');
      
      // Navigate to reports
      await page.goto(store.url);
      
      // Wait longer for GitHub Actions environment
      const waitTime = process.env.GITHUB_ACTIONS ? 5000 : 2000;
      console.log(`⏳ Waiting ${waitTime}ms for page to load...`);
      await page.waitForTimeout(waitTime);
    }
    
    // Skip date selection - Treez automatically shows current day's sales when logged in
    console.log('📅 Using default current day sales (no date selection needed)');
    
         // Generate report - try multiple strategies
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
     
     // Strategy 3: Look for any clickable element that might generate reports
     if (!generateButton || !(await generateButton.isVisible())) {
       try {
         generateButton = await page.locator('[role="button"], button, input[type="submit"]').filter({ hasText: /generate|report|submit|run/i }).first();
         if (await generateButton.isVisible()) {
           console.log('✅ Found clickable element with generate/report text');
         }
       } catch (e) {
         console.log('❌ No clickable generate elements found');
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
    
         // Extract net sales from page - handle multiple elements
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
     
     // Strategy 1.5: Look for net sales in table rows or data cells
     try {
       console.log('🔍 Looking for net sales in table data...');
       const tableCells = await page.locator('td, th, .cell, .data-cell').filter({ hasText: /Net Sales/i }).all();
       console.log(`🔍 Found ${tableCells.length} table cells with Net Sales`);
       
       for (const cell of tableCells) {
         try {
           const cellText = await cell.textContent();
           console.log(`📊 Checking table cell: ${cellText}`);
           
           // Look for dollar amount in this cell or nearby cells
           const row = await cell.locator('..').first();
           const rowText = await row.textContent();
           console.log(`📊 Checking entire row: ${rowText}`);
           
           const match = rowText.match(/\$([\d,]+\.\d+)/);
           if (match) {
             const amount = parseFloat(match[1].replace(/,/g, ''));
             if (amount > 0) {
               console.log(`💰 Net sales found in table row: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
               return amount;
             }
           }
         } catch (e) {
           console.log(`⚠️  Error reading table cell: ${e.message}`);
         }
       }
     } catch (e) {
       console.log('❌ Table cell approach failed:', e.message);
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
     
     // Strategy 4: Look for net sales in various text formats and positions
     try {
       console.log('🔍 Looking for net sales in various text formats...');
       
       // Look for any text containing "Net Sales" and a dollar amount
       const allElements = await page.locator('*').filter({ hasText: /Net Sales/i }).all();
       console.log(`🔍 Found ${allElements.length} elements containing "Net Sales"`);
       
       for (const element of allElements) {
         try {
           const text = await element.textContent();
           console.log(`📄 Checking element text: ${text.substring(0, 150)}...`);
           
           // Look for dollar amounts in the text
           const matches = text.match(/\$([\d,]+\.\d+)/g);
           if (matches) {
             console.log(`💰 Found dollar amounts: ${matches.join(', ')}`);
             
             // Try to find the one that's most likely net sales
             for (const match of matches) {
               const amount = parseFloat(match.replace(/[$,]/g, ''));
               if (amount > 0) {
                 console.log(`💰 Potential net sales amount: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
                 
                 // If this element contains "Net Sales" and has a non-zero amount, it's likely correct
                 if (text.toLowerCase().includes('net sales') && amount > 0) {
                   console.log(`💰 Net sales confirmed: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
                   return amount;
                 }
               }
             }
           }
         } catch (e) {
           console.log(`⚠️  Error reading element: ${e.message}`);
         }
       }
     } catch (e) {
       console.log('❌ Comprehensive text search failed:', e.message);
     }
     
     // Strategy 5: Wait a bit more and try again (sometimes data loads after report generation)
     try {
       console.log('⏳ Waiting for data to load and trying again...');
       await page.waitForTimeout(3000);
       
       // Try the summary items approach again
       const summaryItemsRetry = await page.locator('.summary-item').filter({ hasText: /Net Sales/ }).all();
       console.log(`🔍 Retry: Found ${summaryItemsRetry.length} summary items with Net Sales`);
       
       if (summaryItemsRetry.length > 0) {
         const lastItem = summaryItemsRetry[summaryItemsRetry.length - 1];
         const text = await lastItem.textContent();
         console.log(`📊 Retry checking: ${text}`);
         
         const match = text.match(/\$([\d,]+\.\d+)/);
         if (match) {
           const amount = parseFloat(match[1].replace(/,/g, ''));
           console.log(`💰 Net sales found on retry: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
           return amount;
         }
       }
     } catch (e) {
       console.log('❌ Retry approach failed:', e.message);
     }
     
     console.log('❌ Net sales not found on page');
     
     // Debug: Save page content and screenshot for troubleshooting
     try {
       console.log('📸 Taking debug screenshot...');
       await page.screenshot({ path: `debug-${store.name}-${Date.now()}.png`, fullPage: true });
       
       console.log('📄 Saving page content for debugging...');
       const pageContent = await page.content();
       fs.writeFileSync(`debug-${store.name}-${Date.now()}.html`, pageContent);
       
       console.log('🔍 Final page title:', await page.title());
       console.log('🔍 Final URL:', page.url());
     } catch (e) {
       console.log('⚠️ Debug capture failed:', e.message);
     }
     
     return 0;
    
  } catch (error) {
    console.error(`❌ Error processing ${store.name}:`, error.message);
    return 0;
  } finally {
    await page.close();
  }
}

// No date selection needed - Treez automatically shows current day's sales

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, scrapeNetSales };
