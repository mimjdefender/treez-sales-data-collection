const { chromium } = require('playwright');
require('dotenv').config();

async function debugTreezData() {
  console.log('🔍 Starting comprehensive Treez data debug...');
  
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
    
    // Check what's on the page BEFORE generating report
    console.log('\n🔍 === BEFORE GENERATING REPORT ===');
    const beforeTitle = await page.title();
    const beforeUrl = page.url();
    console.log(`📄 Page title: ${beforeTitle}`);
    console.log(`🌐 Page URL: ${beforeUrl}`);
    
    // Check for any date filters or settings
    console.log('\n📅 === CHECKING FOR DATE FILTERS ===');
    try {
      const dateElements = await page.locator('*').filter({ hasText: /date|Date|DATE/ }).all();
      console.log(`Found ${dateElements.length} elements with date-related text:`);
      for (let i = 0; i < Math.min(dateElements.length, 5); i++) {
        try {
          const text = await dateElements[i].textContent();
          console.log(`  ${i + 1}: "${text.substring(0, 100)}..."`);
        } catch (e) {
          console.log(`  ${i + 1}: [Error reading: ${e.message}]`);
        }
      }
    } catch (e) {
      console.log('❌ Error checking date elements:', e.message);
    }
    
    // Check summary items before report generation
    console.log('\n📊 === SUMMARY ITEMS BEFORE REPORT ===');
    try {
      const beforeSummaryItems = await page.locator('.summary-item').all();
      console.log(`Found ${beforeSummaryItems.length} summary items before report generation:`);
      for (let i = 0; i < beforeSummaryItems.length; i++) {
        try {
          const text = await beforeSummaryItems[i].textContent();
          console.log(`  ${i + 1}: "${text}"`);
        } catch (e) {
          console.log(`  ${i + 1}: [Error reading: ${e.message}]`);
        }
      }
    } catch (e) {
      console.log('❌ Error reading summary items before report:', e.message);
    }
    
    // Generate report
    console.log('\n📊 === GENERATING REPORT ===');
    const generateButton = await page.locator('button:has-text("Generate Report")').first();
    if (await generateButton.isVisible()) {
      console.log('✅ Found Generate Report button, clicking...');
      await generateButton.click();
      await page.waitForTimeout(5000);
      console.log('✅ Report generated');
    } else {
      console.log('⚠️ Generate Report button not found');
    }
    
    // Check what's on the page AFTER generating report
    console.log('\n🔍 === AFTER GENERATING REPORT ===');
    const afterTitle = await page.title();
    const afterUrl = page.url();
    console.log(`📄 Page title: ${afterTitle}`);
    console.log(`🌐 Page URL: ${afterUrl}`);
    
    // Check summary items after report generation
    console.log('\n📊 === SUMMARY ITEMS AFTER REPORT ===');
    try {
      const afterSummaryItems = await page.locator('.summary-item').all();
      console.log(`Found ${afterSummaryItems.length} summary items after report generation:`);
      for (let i = 0; i < afterSummaryItems.length; i++) {
        try {
          const text = await afterSummaryItems[i].textContent();
          console.log(`  ${i + 1}: "${text}"`);
        } catch (e) {
          console.log(`  ${i + 1}: [Error reading: ${e.message}]`);
        }
      }
    } catch (e) {
      console.log('❌ Error reading summary items after report:', e.message);
    }
    
    // Check for any error messages or warnings
    console.log('\n⚠️ === CHECKING FOR ERRORS/WARNINGS ===');
    try {
      const errorElements = await page.locator('*').filter({ hasText: /error|Error|ERROR|warning|Warning|WARNING|no data|No Data|NO DATA/ }).all();
      console.log(`Found ${errorElements.length} elements with error/warning text:`);
      for (let i = 0; i < Math.min(errorElements.length, 5); i++) {
        try {
          const text = await errorElements[i].textContent();
          console.log(`  ${i + 1}: "${text.substring(0, 100)}..."`);
        } catch (e) {
          console.log(`  ${i + 1}: [Error reading: ${e.message}]`);
        }
      }
    } catch (e) {
      console.log('❌ Error checking for errors/warnings:', e.message);
    }
    
    // Check page source for any clues
    console.log('\n📄 === PAGE SOURCE ANALYSIS ===');
    try {
      const pageContent = await page.content();
      
      // Look for any date-related information
      const dateMatches = pageContent.match(/\d{1,2}\/\d{1,2}\/\d{4}/g);
      if (dateMatches) {
        console.log('📅 Found dates in page source:', dateMatches.slice(0, 5));
      }
      
      // Look for any "last updated" or similar text
      const lastUpdatedMatch = pageContent.match(/last.*updated|Last.*Updated|LAST.*UPDATED/gi);
      if (lastUpdatedMatch) {
        console.log('🕒 Found "last updated" references:', lastUpdatedMatch.slice(0, 3));
      }
      
      // Look for any timezone information
      const timezoneMatch = pageContent.match(/UTC|EST|EDT|PST|PDT|GMT/gi);
      if (timezoneMatch) {
        console.log('🌍 Found timezone references:', timezoneMatch.slice(0, 5));
      }
      
    } catch (e) {
      console.log('❌ Error analyzing page source:', e.message);
    }
    
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
  debugTreezData().catch(console.error);
}
