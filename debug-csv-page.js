const { chromium } = require('playwright');
require('dotenv').config();

const store = {
  name: 'cheboygan', 
  url: 'https://medscafecheboygan.treez.io',
  reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport'
};

async function debugCSVPage() {
  console.log(`🔍 Debugging CSV page for ${store.name}...`);
  
  const browser = await chromium.launch({ 
    headless: false, // Use visible mode to see what's happening
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
    
    console.log(`🔍 Page loaded, analyzing structure...`);
    
    // Get all buttons on the page
    const buttons = await page.evaluate(() => {
      const allButtons = document.querySelectorAll('button');
      const buttonInfo = [];
      
      for (let i = 0; i < allButtons.length; i++) {
        const button = allButtons[i];
        buttonInfo.push({
          index: i + 1,
          text: button.textContent.trim(),
          className: button.className,
          id: button.id,
          type: button.type
        });
      }
      
      return buttonInfo;
    });
    
    console.log(`\n📊 Buttons found on page:`);
    buttons.forEach(button => {
      console.log(`\nButton ${button.index}:`);
      console.log(`  Text: "${button.text}"`);
      console.log(`  Class: "${button.className}"`);
      console.log(`  ID: "${button.id}"`);
      console.log(`  Type: "${button.type}"`);
    });
    
    // Get all input fields
    const inputs = await page.evaluate(() => {
      const allInputs = document.querySelectorAll('input');
      const inputInfo = [];
      
      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        inputInfo.push({
          index: i + 1,
          type: input.type,
          value: input.value,
          placeholder: input.placeholder,
          className: input.className,
          id: input.id
        });
      }
      
      return inputInfo;
    });
    
    console.log(`\n📊 Input fields found on page:`);
    inputs.forEach(input => {
      console.log(`\nInput ${input.index}:`);
      console.log(`  Type: "${input.type}"`);
      console.log(`  Value: "${input.value}"`);
      console.log(`  Placeholder: "${input.placeholder}"`);
      console.log(`  Class: "${input.className}"`);
      console.log(`  ID: "${input.id}"`);
    });
    
    // Get page title and URL
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.textContent.substring(0, 500) + '...'
      };
    });
    
    console.log(`\n📊 Page Information:`);
    console.log(`  Title: "${pageInfo.title}"`);
    console.log(`  URL: "${pageInfo.url}"`);
    console.log(`  Body Text (first 500 chars): "${pageInfo.bodyText}"`);
    
    // Wait for user to see the page
    console.log(`\n⏳ Browser will stay open for 30 seconds so you can see the page...`);
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error(`Debug failed:`, error.message);
  } finally {
    await browser.close();
  }
}

debugCSVPage().then(() => {
  console.log('\n✅ Debug completed!');
}).catch(error => {
  console.error('❌ Debug failed:', error.message);
}); 