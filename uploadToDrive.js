const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

async function uploadToDrive(filePath, storeName) {
  const auth = new google.auth.GoogleAuth({
    keyFile: './creds/credentials.json',
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  const drive = google.drive({ version: 'v3', auth });
  const folderName = process.env.GOOGLE_FOLDER_NAME || 'MedsCafeReports';

  // Try to find the folder in shared drives first
  let folderId = null;
  
  try {
    // List shared drives
    const sharedDrives = await drive.drives.list();
    
    for (const sharedDrive of sharedDrives.data.drives || []) {
      try {
        const folderList = await drive.files.list({
          q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}'`,
          fields: 'files(id, name)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          corpora: 'drive',
          driveId: sharedDrive.id
        });
        
        if (folderList.data.files && folderList.data.files.length > 0) {
          folderId = folderList.data.files[0].id;
          console.log(`Found folder in shared drive: ${sharedDrive.name}`);
          break;
        }
      } catch (e) {
        console.log(`No access to shared drive: ${sharedDrive.name}`);
      }
    }
  } catch (e) {
    console.log('No shared drives available or access denied');
  }

  // If not found in shared drives, try regular drive
  if (!folderId) {
    try {
      const folderList = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}'`,
        fields: 'files(id, name)'
      });

      folderId = folderList.data.files[0]?.id;

      if (!folderId) {
        // Try to create folder in shared drive if available
        const sharedDrives = await drive.drives.list();
        if (sharedDrives.data.drives && sharedDrives.data.drives.length > 0) {
          const sharedDriveId = sharedDrives.data.drives[0].id;
          const folder = await drive.files.create({
            resource: { 
              name: folderName, 
              mimeType: 'application/vnd.google-apps.folder',
              parents: [sharedDriveId]
            },
            supportsAllDrives: true,
            fields: 'id'
          });
          folderId = folder.data.id;
          console.log(`Created folder in shared drive: ${sharedDrives.data.drives[0].name}`);
        } else {
          // Fallback to regular drive
          const folder = await drive.files.create({
            resource: { name: folderName, mimeType: 'application/vnd.google-apps.folder' },
            fields: 'id'
          });
          folderId = folder.data.id;
        }
      }
    } catch (e) {
      console.log('Could not create or find folder in regular drive');
      throw e;
    }
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

module.exports = uploadToDrive;