const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

async function testCredentials() {
  try {
    console.log('Testing Google Drive credentials...');
    
    const auth = new google.auth.GoogleAuth({
      keyFile: './creds/credentials.json',
      scopes: ['https://www.googleapis.com/auth/drive']
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // Test 1: List shared drives
    console.log('\n1. Testing shared drives access...');
    try {
      const sharedDrives = await drive.drives.list();
      console.log('✅ Shared drives accessible');
      console.log('Available shared drives:', sharedDrives.data.drives?.map(d => d.name) || 'None');
    } catch (e) {
      console.log('❌ Shared drives error:', e.message);
    }
    
    // Test 2: List files in My Drive
    console.log('\n2. Testing My Drive access...');
    try {
      const files = await drive.files.list({
        pageSize: 5,
        fields: 'files(id, name)'
      });
      console.log('✅ My Drive accessible');
      console.log('Files found:', files.data.files?.length || 0);
    } catch (e) {
      console.log('❌ My Drive error:', e.message);
    }
    
    // Test 3: Try to create a test folder
    console.log('\n3. Testing folder creation...');
    try {
      const testFolder = await drive.files.create({
        resource: { 
          name: 'test-sales-data-collection', 
          mimeType: 'application/vnd.google-apps.folder' 
        },
        fields: 'id'
      });
      console.log('✅ Folder creation successful');
      console.log('Test folder ID:', testFolder.data.id);
      
      // Clean up - delete the test folder
      await drive.files.delete({
        fileId: testFolder.data.id
      });
      console.log('✅ Test folder cleaned up');
    } catch (e) {
      console.log('❌ Folder creation error:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Credential test failed:', error.message);
  }
}

testCredentials(); 