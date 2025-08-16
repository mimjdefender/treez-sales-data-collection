const { chromium } = require('playwright');
require('dotenv').config();

async function debugPageContent() {
  console.log('🔍 Starting page content debug...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Login to Treez
    console.log('🔐 Logging into Treez...');
    await page.goto('https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport');
    
    // Check if we need to login
    const pageTitle = await page.title();
    if (pageTitle.includes('Sign In') || pageTitle.includes('Login')) {
      console.log('🔑 Need to login, navigating to login page...');
      await page.goto('https://medscafecheboygan.treez.io/portalDispensary/portal/login');
      await page.waitForTimeout(3000);
      
      // Fill credentials
      const emailField = await page.locator('input[id="Email"]').first();
      const passwordField = await page.locator('input[id="Password"]').first();
      
      await emailField.fill(process.env.TREEZ_EMAIL);
      await passwordField.fill(process.env.TREEZ_PASSWORD);
      await passwordField.press('Enter');
      
      // Wait for navigation
      await page.waitForNavigation();
      console.log('✅ Login successful');
      
      // Navigate to reports
      await page.goto('https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport');
      await page.waitForTimeout(3000);
    }
    
    // Generate report
    console.log('📊 Generating report...');
    const generateButton = await page.locator('button:has-text("Generate Report")').first();
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForTimeout(5000);
      console.log('✅ Report generated');
    }
    
    // Debug: Show page content
    console.log('\n🔍 === PAGE CONTENT DEBUG ===');
    
    // Page title and URL
    const title = await page.title();
    const url = page.url();
    console.log(`📄 Page title: ${title}`);
    console.log(`🌐 Page URL: ${url}`);
    
    // All summary items
    console.log('\n📊 === SUMMARY ITEMS ===');
    const summaryItems = await page.locator('.summary-item').all();
    console.log(`Found ${summaryItems.length} summary items:`);
    
    for (let i = 0; i < summaryItems.length; i++) {
      try {
        const text = await summaryItems[i].textContent();
        console.log(`  ${i + 1}: "${text}"`);
      } catch (e) {
        console.log(`  ${i + 1}: [Error reading: ${e.message}]`);
      }
    }
    
    // All text containing "Net Sales"
    console.log('\n💰 === NET SALES SEARCH ===');
    const netSalesElements = await page.locator('*').filter({ hasText: /Net Sales/i }).all();
    console.log(`Found ${netSalesElements.length} elements with "Net Sales":`);
    
    for (let i = 0; i < Math.min(netSalesElements.length, 10); i++) {
      try {
        const text = await netSalesElements[i].textContent();
        console.log(`  ${i + 1}: "${text.substring(0, 100)}..."`);
      } catch (e) {
        console.log(`  ${i + 1}: [Error reading: ${e.message}]`);
      }
    }
    
    // Page HTML content (first 2000 chars)
    console.log('\n📄 === PAGE HTML PREVIEW ===');
    const pageContent = await page.content();
    console.log(`Page HTML (first 2000 chars):`);
    console.log(pageContent.substring(0, 2000));
    
    // Wait for user to see the page
    console.log('\n⏸️  Page is open for manual inspection. Press Enter in terminal to continue...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the debug script
if (require.main === module) {
  debugPageContent().catch(console.error);
}
