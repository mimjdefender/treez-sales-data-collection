const { chromium } = require('playwright');
require('dotenv').config();

async function testDateSettings() {
  console.log('🔍 Testing date/time settings...');
  
  // Test both MID-DAY and FINAL collection times
  const testCases = [
    { name: 'MID-DAY', env: {} },
    { name: 'FINAL', env: { COLLECTION_TIME: 'final' } }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📅 Testing ${testCase.name} collection...`);
    
    // Set environment variables
    if (testCase.env.COLLECTION_TIME) {
      process.env.COLLECTION_TIME = testCase.env.COLLECTION_TIME;
    } else {
      delete process.env.COLLECTION_TIME;
    }
    
    // Get target date using the same logic as robust-data-collection.js
    const currentDate = new Date();
    const isFinalCollection = process.env.COLLECTION_TIME === "final";
    
    let targetDate;
    if (isFinalCollection) {
      // For FINAL collection, we want TODAY's date (the day that just ended at 9:00 PM)
      const estDate = new Date();
      const estTimeString = estDate.toLocaleString('en-US', { timeZone: 'America/New_York' });
      const estDateParts = new Date(estTimeString);
      
      targetDate = { 
        year: estDateParts.getFullYear(), 
        month: estDateParts.getMonth() + 1, 
        day: estDateParts.getDate() 
      };
    } else {
      targetDate = { 
        year: currentDate.getFullYear(), 
        month: currentDate.getMonth() + 1, 
        day: currentDate.getDate() 
      };
    }
    
    console.log(`📅 Target date: ${targetDate.month}/${targetDate.day}/${targetDate.year}`);
    console.log(`📅 Current UTC: ${currentDate.toISOString()}`);
    console.log(`📅 Current EST: ${currentDate.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
    console.log(`📅 Is FINAL collection: ${isFinalCollection}`);
  }
  
  console.log('\n✅ Date testing completed!');
}

testDateSettings().catch(console.error); 