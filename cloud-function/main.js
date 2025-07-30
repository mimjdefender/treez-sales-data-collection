const { chromium } = require('playwright');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const stores = [
  { name: 'cheboygan', url: 'https://medscafecheboygan.treez.io' },
  { name: 'lowell', url: 'https://medscafelowell.treez.io' },
  { name: 'alpena', url: 'https://medscafealpena.treez.io' },
  { name: 'gaylord', url: 'https://medscafegaylord.treez.io' },
  { name: 'rc', url: 'https://medscaferc.treez.io' },
  { name: 'manistee', url: 'https://medscafemanistee.treez.io' }
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
        
        // Navigate to the login page first
        await page.goto(`${store.url}/backoffice/login`, { 
          waitUntil: 'networkidle',
          timeout: 60000 
        });
        
        // Wait for page to load
        await page.waitForLoadState('domcontentloaded');
        
        // Try multiple selectors for email field
        const emailSelectors = [
          'input[name="email"]',
          'input[type="email"]',
          'input[id*="email"]',
          'input[placeholder*="email" i]',
          'input[placeholder*="Email" i]'
        ];
        
        let emailField = null;
        for (const selector of emailSelectors) {
          try {
            emailField = await page.waitForSelector(selector, { timeout: 10000 });
            console.log(`Found email field with selector: ${selector}`);
            break;
          } catch (e) {
            console.log(`Selector ${selector} not found, trying next...`);
          }
        }
        
        if (!emailField) {
          throw new Error('Email field not found on page');
        }
        
        // Fill in credentials
        await emailField.fill(process.env.TREEZ_EMAIL);
        
        // Find password field
        const passwordSelectors = [
          'input[name="password"]',
          'input[type="password"]',
          'input[id*="password"]'
        ];
        
        let passwordField = null;
        for (const selector of passwordSelectors) {
          try {
            passwordField = await page.waitForSelector(selector, { timeout: 10000 });
            console.log(`Found password field with selector: ${selector}`);
            break;
          } catch (e) {
            console.log(`Selector ${selector} not found, trying next...`);
          }
        }
        
        if (!passwordField) {
          throw new Error('Password field not found on page');
        }
        
        await passwordField.fill(process.env.TREEZ_PASSWORD);
        
        // Find and click submit button
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button:has-text("Login")',
          'button:has-text("Sign In")',
          'button:has-text("Log In")'
        ];
        
        let submitButton = null;
        for (const selector of submitSelectors) {
          try {
            submitButton = await page.waitForSelector(selector, { timeout: 10000 });
            console.log(`Found submit button with selector: ${selector}`);
            break;
          } catch (e) {
            console.log(`Selector ${selector} not found, trying next...`);
          }
        }
        
        if (!submitButton) {
          throw new Error('Submit button not found on page');
        }
        
        // Click submit and wait for navigation
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }),
          submitButton.click()
        ]);
        
        // Navigate to the reporting page
        await page.goto(`${store.url}/backoffice/reporting/products`, { 
          waitUntil: 'networkidle',
          timeout: 60000 
        });
        
        // Wait for the download button
        const downloadSelectors = [
          'text=Download Report',
          'button:has-text("Download")',
          'a:has-text("Download")',
          '[data-testid="download-report"]'
        ];
        
        let downloadButton = null;
        for (const selector of downloadSelectors) {
          try {
            downloadButton = await page.waitForSelector(selector, { timeout: 30000 });
            console.log(`Found download button with selector: ${selector}`);
            break;
          } catch (e) {
            console.log(`Download selector ${selector} not found, trying next...`);
          }
        }
        
        if (!downloadButton) {
          throw new Error('Download button not found on page');
        }
        
        // Download the report
        const [ download ] = await Promise.all([
          page.waitForEvent('download'),
          downloadButton.click()
        ]);

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