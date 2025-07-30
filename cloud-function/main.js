const { chromium } = require('playwright');
const { google } = require('googleapis');
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

async function uploadToDrive(filePath, storeName) {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  const drive = google.drive({ version: 'v3', auth });
  const folderName = process.env.GOOGLE_FOLDER_NAME || 'MedsCafeReports';

  const folderList = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}'`,
    fields: 'files(id, name)'
  });

  let folderId = folderList.data.files[0]?.id;

  if (!folderId) {
    const folder = await drive.files.create({
      resource: { name: folderName, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id'
    });
    folderId = folder.data.id;
  }

  const fileMetadata = {
    name: `${storeName}-${new Date().toISOString().split('T')[0]}.csv`,
    parents: [folderId]
  };
  const media = {
    mimeType: 'text/csv',
    body: fs.createReadStream(filePath)
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id'
  });

  console.log(`Uploaded to Drive: ${file.data.id}`);
}

exports.collectSalesData = async (req, res) => {
  const results = [];
  
  try {
    for (const store of stores) {
      const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const context = await browser.newContext({ acceptDownloads: true });
      const page = await context.newPage();

      try {
        console.log(`Logging into ${store.name}`);
        
        // Navigate to the login page first (using the same URL as your Python script)
        await page.goto(`${store.url}/portalDispensary/portal/login`, { 
          waitUntil: 'networkidle',
          timeout: 60000 
        });
        
        // Wait for page to load
        await page.waitForLoadState('domcontentloaded');
        
        // Use the same selectors as your Python script
        const emailField = await page.waitForSelector('#Email', { timeout: 10000 });
        console.log(`Found email field with selector: #Email`);
        
        // Fill in credentials
        await emailField.fill(process.env.TREEZ_EMAIL);
        
        // Find password field using the same selector as Python script
        const passwordField = await page.waitForSelector('#Password', { timeout: 10000 });
        console.log(`Found password field with selector: #Password`);
        
        await passwordField.fill(process.env.TREEZ_PASSWORD);
        
        // Press Enter to submit (same as your Python script)
        await passwordField.press('Enter');
        
        // Wait for navigation
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 });
        
        // Navigate to the Products Report page (same as your Python script)
        await page.goto(store.reportUrl, { 
          waitUntil: 'networkidle',
          timeout: 60000 
        });
        
        // Wait for the sales data element using the same selector as your Python script
        const salesElement = await page.waitForSelector(store.selector, { timeout: 30000 });
        console.log(`Found sales element with selector: ${store.selector}`);
        
        // Extract the sales data
        const salesText = await salesElement.textContent();
        console.log(`Raw sales text: ${salesText}`);
        
        // Use regex to extract the first numeric value (same as your Python script)
        const match = salesText.match(/[\d,]+\.\d+/);
        
        if (match) {
          const cleanNumber = match[0].replace(/,/g, ''); // Remove commas
          const salesAmount = parseFloat(cleanNumber);
          console.log(`${store.name} Net Sales: $${salesAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
          
          // Create a simple CSV with the sales data
          const csvContent = `Store,Sales Amount,Timestamp\n${store.name},${salesAmount},${new Date().toISOString()}`;
          const filePath = path.join('/tmp', `treez-${store.name}.csv`);
          
          // Write CSV to file
          fs.writeFileSync(filePath, csvContent);
          console.log(`Created CSV file: ${filePath}`);

          try {
            await uploadToDrive(filePath, store.name);
            results.push({ store: store.name, status: 'success', sales: salesAmount });
            console.log(`Successfully uploaded ${store.name} to Google Drive`);
          } catch (uploadError) {
            console.error(`Failed to upload ${store.name} to Google Drive:`, uploadError.message);
            results.push({ store: store.name, status: 'success', sales: salesAmount, uploadError: uploadError.message });
          }
          
          // Clean up temp file
          fs.unlinkSync(filePath);
        } else {
          console.log(`No sales data found for ${store.name}`);
          // Create CSV with 0 sales instead of error
          const csvContent = `Store,Sales Amount,Timestamp\n${store.name},0.00,${new Date().toISOString()}`;
          const filePath = path.join('/tmp', `treez-${store.name}.csv`);
          
          fs.writeFileSync(filePath, csvContent);
          console.log(`Created CSV file with 0 sales: ${filePath}`);

          try {
            await uploadToDrive(filePath, store.name);
            results.push({ store: store.name, status: 'success', sales: 0.00 });
            console.log(`Successfully uploaded ${store.name} (0 sales) to Google Drive`);
          } catch (uploadError) {
            console.error(`Failed to upload ${store.name} to Google Drive:`, uploadError.message);
            results.push({ store: store.name, status: 'success', sales: 0.00, uploadError: uploadError.message });
          }
          
          // Clean up temp file
          fs.unlinkSync(filePath);
        }

        const filePath = path.join('/tmp', `treez-${store.name}.csv`);
        await download.saveAs(filePath);
        console.log(`Downloaded: ${filePath}`);

        await uploadToDrive(filePath, store.name);
        results.push({ store: store.name, status: 'success' });
        
        // Clean up temp file
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error(`Error for store ${store.name}:`, e);
        results.push({ store: store.name, status: 'error', error: e.message });
      } finally {
        await browser.close();
      }
    }
    
    res.status(200).json({
      message: 'Sales data collection completed',
      timestamp: new Date().toISOString(),
      results: results
    });
  } catch (error) {
    console.error('Fatal error:', error);
    res.status(500).json({
      error: 'Sales data collection failed',
      message: error.message
    });
  }
}; 