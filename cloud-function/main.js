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
        await page.goto(`${store.url}/backoffice/reporting/products`);
        await page.fill('input[name="email"]', process.env.TREEZ_EMAIL);
        await page.fill('input[name="password"]', process.env.TREEZ_PASSWORD);
        await Promise.all([
          page.waitForNavigation(),
          page.click('button[type="submit"]')
        ]);

        await page.waitForSelector('text=Download Report');
        const [ download ] = await Promise.all([
          page.waitForEvent('download'),
          page.click('text=Download Report')
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