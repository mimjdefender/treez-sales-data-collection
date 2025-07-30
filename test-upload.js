const uploadToDrive = require('./uploadToDrive');
const fs = require('fs');

async function testUpload() {
  try {
    console.log('Testing uploadToDrive function...');
    
    // Create a test CSV file
    const testContent = 'Store,Sales Amount,Timestamp\ntest,100.00,2024-01-01T00:00:00.000Z';
    const testFilePath = './test-upload.csv';
    
    fs.writeFileSync(testFilePath, testContent);
    console.log('Created test CSV file');
    
    // Test the upload function
    await uploadToDrive(testFilePath, 'test-store');
    
    console.log('✅ Upload test completed successfully');
    
    // Clean up
    fs.unlinkSync(testFilePath);
    console.log('Cleaned up test file');
    
  } catch (error) {
    console.error('❌ Upload test failed:', error.message);
  }
}

testUpload(); 