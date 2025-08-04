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
      // For FINAL collection, we want the date that just ended at 9:00 PM EST
      // When GitHub Actions runs at 2:15 AM UTC (9:15 PM EST), we want the previous UTC day
      const targetDateObj = new Date(currentDate);
      targetDateObj.setUTCDate(targetDateObj.getUTCDate() - 1);
      
      targetDate = { 
        year: targetDateObj.getUTCFullYear(), 
        month: targetDateObj.getUTCMonth() + 1, 
        day: targetDateObj.getUTCDate() 
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
    
    if (isFinalCollection) {
      // Show what date we're actually querying
      const queryDate = new Date(currentDate);
      queryDate.setUTCDate(queryDate.getUTCDate() - 1);
      console.log(`📅 Querying for date: ${queryDate.getUTCMonth() + 1}/${queryDate.getUTCDate()}/${queryDate.getUTCFullYear()}`);
    }
  }
  
  console.log('\n✅ Date testing completed!');
}

testDateSettings().catch(console.error); 