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

  try {
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    });

    console.log(`Uploaded to Drive: ${file.data.id}`);
  } catch (uploadError) {
    console.error('Upload error details:', uploadError.message);
    
    // If it's a storage quota issue, try to create in shared drive
    if (uploadError.message.includes('storage quota')) {
      console.log('Storage quota issue detected, trying shared drive...');
      
      try {
        const sharedDrives = await drive.drives.list();
        if (sharedDrives.data.drives && sharedDrives.data.drives.length > 0) {
          const sharedDriveId = sharedDrives.data.drives[0].id;
          
          // Create folder in shared drive
          const sharedFolder = await drive.files.create({
            resource: { 
              name: folderName, 
              mimeType: 'application/vnd.google-apps.folder',
              parents: [sharedDriveId]
            },
            supportsAllDrives: true,
            fields: 'id'
          });
          
          // Upload to shared drive
          const sharedFileMetadata = {
            name: `${storeName}-${new Date().toISOString().split('T')[0]}.csv`,
            parents: [sharedFolder.data.id]
          };
          
          const sharedFile = await drive.files.create({
            resource: sharedFileMetadata,
            media: media,
            supportsAllDrives: true,
            fields: 'id'
          });
          
          console.log(`Uploaded to Shared Drive: ${sharedFile.data.id}`);
        } else {
          throw new Error('No shared drives available for upload');
        }
      } catch (sharedError) {
        console.error('Shared drive upload failed:', sharedError.message);
        throw sharedError;
      }
    } else {
      throw uploadError;
    }
  }
}

module.exports = uploadToDrive;