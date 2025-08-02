const { chromium } = require('playwright');
require('dotenv').config();

const store = {
  name: 'cheboygan', 
  url: 'https://medscafecheboygan.treez.io',
  reportUrl: 'https://medscafecheboygan.treez.io/portalDispensary/portal/ProductsReport'
};

// Helper function to get the target date for date input
function getTargetDate() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // getMonth() is 0-indexed
  const day = currentDate.getDate();
  return { year, month, day };
}

async function debugGitHubDate() {
  console.log(`🔍 Debugging date setting for GitHub Actions...`);
  
  const targetDate = getTargetDate();
  console.log(`📅 Target date: ${targetDate.month}/${targetDate.day}/${targetDate.year}`);
  console.log(`🌍 Current timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log(`🕐 Current time: ${new Date().toISOString()}`);
  
  const browser = await chromium.launch({ 
    headless: true, // Use headless for GitHub Actions
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
    
    console.log(`🔍 Page loaded, checking for date input...`);
    
    // Check if there's a date input on the page
    const dateInputInfo = await page.evaluate(() => {
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) {
        return {
          found: true,
          currentValue: dateInput.value,
          placeholder: dateInput.placeholder,
          className: dateInput.className,
          id: dateInput.id
        };
      } else {
        return { found: false };
      }
    });
    
    console.log(`📅 Date input found: ${dateInputInfo.found}`);
    if (dateInputInfo.found) {
      console.log(`  Current value: "${dateInputInfo.currentValue}"`);
      console.log(`  Placeholder: "${dateInputInfo.placeholder}"`);
      console.log(`  Class: "${dateInputInfo.className}"`);
      console.log(`  ID: "${dateInputInfo.id}"`);
    }
    
    // Set the date on the page
    console.log(`🔍 Setting date to ${targetDate.month}/${targetDate.day}/${targetDate.year}...`);
    
    const dateSetResult = await page.evaluate((date) => {
      // Find and set the date input field
      const dateInput = document.querySelector('input[type="date"]');
      if (dateInput) {
        const dateString = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
        dateInput.value = dateString;
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`Date set to: ${dateString}`);
        return { success: true, dateString };
      } else {
        console.log('No date input found');
        return { success: false, error: 'No date input found' };
      }
    }, targetDate);
    
    console.log(`📅 Date set result:`, dateSetResult);
    
    // Wait for date to be set and page to update
    await page.waitForTimeout(3000);
    
    // Check if the date was actually set
    const dateAfterSet = await page.evaluate(() => {
      const dateInput = document.querySelector('input[type="date"]');
      return dateInput ? dateInput.value : null;
    });
    
    console.log(`📅 Date after setting: "${dateAfterSet}"`);
    
    // Wait for summary items to be present
    await page.waitForSelector('.summary-item', { timeout: 15000 });
    
    console.log(`🔍 Page loaded, starting sales extraction...`);
    
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
    
    if (salesText) {
      const match = salesText.match(/\$([\d,]+\.\d+)/);
      if (match) {
        const cleanNumber = match[1].replace(/,/g, '');
        const salesAmount = parseFloat(cleanNumber);
        console.log(`💰 Sales amount: $${salesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        return salesAmount;
      }
    }
    
    console.log(`❌ No sales amount found`);
    return 0;
    
  } catch (error) {
    console.error(`Debug failed:`, error.message);
    return 0;
  } finally {
    await browser.close();
  }
}

debugGitHubDate().then((result) => {
  console.log(`\n✅ Debug completed! Sales amount: $${result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
}).catch(error => {
  console.error('❌ Debug failed:', error.message);
}); 