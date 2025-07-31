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

async function debugStore(store) {
  console.log(`\n🔍 Debugging ${store.name}...`);
  
  const browser = await chromium.launch({ 
    headless: false, // Set to false to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({ 
    acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();

  try {
    // Navigate to login
    console.log(`📱 Navigating to login page...`);
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
    
    // Navigate to report
    console.log(`📊 Navigating to report page...`);
    await page.goto(store.reportUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait a bit for the page to load
    await page.waitForTimeout(5000);
    
    // Take a screenshot
    console.log(`📸 Taking screenshot...`);
    await page.screenshot({ 
      path: `debug-${store.name}-page.png`,
      fullPage: true 
    });
    
    // Save the HTML content
    console.log(`💾 Saving HTML content...`);
    const htmlContent = await page.content();
    fs.writeFileSync(`debug-${store.name}-page.html`, htmlContent);
    
    // Try to find sales data with different approaches
    console.log(`🔍 Searching for sales data...`);
    
    // Method 1: Look for any text containing dollar amounts
    const allText = await page.evaluate(() => {
      return document.body.innerText;
    });
    
    console.log(`📝 Page text preview (first 1000 chars):`);
    console.log(allText.substring(0, 1000));
    
    // Method 2: Look for elements containing dollar amounts
    const dollarElements = await page.evaluate(() => {
      const elements = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.match(/\$[\d,]+\.\d+/)) {
          elements.push({
            text: text,
            parentTag: node.parentElement.tagName,
            parentClass: node.parentElement.className,
            parentId: node.parentElement.id
          });
        }
      }
      return elements;
    });
    
    console.log(`💰 Found ${dollarElements.length} elements with dollar amounts:`);
    dollarElements.forEach((el, index) => {
      console.log(`  ${index + 1}. "${el.text}" (${el.parentTag}.${el.parentClass})`);
    });
    
    // Method 3: Look for common sales-related text
    const salesKeywords = ['sales', 'total', 'revenue', 'amount', 'sum'];
    const salesElements = await page.evaluate((keywords) => {
      const elements = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim().toLowerCase();
        if (keywords.some(keyword => text.includes(keyword))) {
          elements.push({
            text: node.textContent.trim(),
            parentTag: node.parentElement.tagName,
            parentClass: node.parentElement.className,
            parentId: node.parentElement.id
          });
        }
      }
      return elements;
    }, salesKeywords);
    
    console.log(`📊 Found ${salesElements.length} elements with sales-related keywords:`);
    salesElements.slice(0, 10).forEach((el, index) => {
      console.log(`  ${index + 1}. "${el.text}" (${el.parentTag}.${el.parentClass})`);
    });
    
    // Method 4: Try the original selector
    try {
      const originalSelector = '#root > div > div:nth-child(5) > div > div > div.sc-bdVaJa.IDPDZ > div:nth-child(6) > div';
      const element = await page.$(originalSelector);
      if (element) {
        const text = await element.textContent();
        console.log(`✅ Original selector found: "${text}"`);
      } else {
        console.log(`❌ Original selector not found`);
      }
    } catch (error) {
      console.log(`❌ Original selector error: ${error.message}`);
    }
    
    console.log(`\n📁 Debug files created:`);
    console.log(`  - debug-${store.name}-page.png (screenshot)`);
    console.log(`  - debug-${store.name}-page.html (HTML content)`);
    
  } catch (error) {
    console.error(`❌ Error debugging ${store.name}:`, error.message);
  } finally {
    await browser.close();
  }
}

// Debug the first store only
debugStore(stores[0]).then(() => {
  console.log('\n✅ Debug completed!');
}).catch(error => {
  console.error('❌ Debug failed:', error.message);
}); 