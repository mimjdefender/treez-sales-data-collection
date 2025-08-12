// Test script to debug GitHub Actions timezone logic
// This helps test the date logic without running the full data collection

// Simulate GitHub Actions environment
process.env.GITHUB_ACTIONS = 'true';

// Test different collection types
console.log('🧪 Testing GitHub Actions timezone logic...\n');

// Test MID-DAY collection (4:20 PM EST = 9:20 PM UTC)
console.log('📊 Test 1: MID-DAY collection (4:20 PM EST)');
process.env.COLLECTION_TIME = undefined;
testDateLogic();

// Test FINAL collection (9:15 PM EST = 2:15 AM UTC next day)
console.log('\n📊 Test 2: FINAL collection (9:15 PM EST)');
process.env.COLLECTION_TIME = 'final';
testDateLogic();

// Test with TEST_DATE override
console.log('\n📊 Test 3: TEST_DATE override');
process.env.TEST_DATE = '2025-08-10';
process.env.COLLECTION_TIME = undefined;
testDateLogic();

function testDateLogic() {
  const currentDate = new Date();
  
  // For local testing, allow override with environment variable
  const testDate = process.env.TEST_DATE;
  if (testDate) {
    console.log(`🧪 TEST MODE: Using test date from environment: ${testDate}`);
    const [year, month, day] = testDate.split('-').map(Number);
    console.log(`  → Target date: ${year}-${month}-${day}`);
    return { year, month, day };
  }
  
  // Check if this is FINAL collection (9:15 PM EST = 2:15 AM UTC next day)
  const isFinalCollection = process.env.COLLECTION_TIME === "final";
  
  // Check if we're running in GitHub Actions (has GITHUB_ACTIONS environment variable)
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  
  // Debug environment information
  console.log(`🔍 Environment Debug:`);
  console.log(`  - GITHUB_ACTIONS: ${process.env.GITHUB_ACTIONS || 'false'}`);
  console.log(`  - COLLECTION_TIME: ${process.env.COLLECTION_TIME || 'undefined'}`);
  console.log(`  - Current UTC time: ${currentDate.toISOString()}`);
  console.log(`  - Current UTC date: ${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth() + 1}-${currentDate.getUTCDate()}`);
  console.log(`  - Current local time: ${currentDate.toString()}`);
  console.log(`  - Current local date: ${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`);
  
  if (isGitHubActions) {
    console.log(`🌐 GitHub Actions detected - using UTC timezone logic`);
    
    if (isFinalCollection) {
      // For FINAL collection in GitHub Actions (runs at 2:15 AM UTC)
      // We want the date that just ended at 9:00 PM EST (2:00 AM UTC next day)
      // So we use the previous UTC day
      const targetDate = new Date(currentDate);
      targetDate.setUTCDate(targetDate.getUTCDate() - 1);
      
      const year = targetDate.getUTCFullYear();
      const month = targetDate.getUTCMonth() + 1; // getMonth() is 0-indexed
      const day = targetDate.getUTCDate();
      
      console.log(`📅 GitHub Actions FINAL collection: Using previous UTC date (${year}-${month}-${day})`);
      return { year, month, day };
    } else {
      // For MID-DAY collection in GitHub Actions (runs at 9:20 PM UTC)
      // This is 4:20 PM EST on the same UTC day
      // But stores might not have data for this UTC date yet, so try previous UTC day
      const targetDate = new Date(currentDate);
      targetDate.setUTCDate(targetDate.getUTCDate() - 1);
      
      const year = targetDate.getUTCFullYear();
      const month = targetDate.getUTCMonth() + 1; // getMonth() is 0-indexed
      const day = targetDate.getUTCDate();
      
      console.log(`📅 GitHub Actions MID-DAY collection: Using previous UTC date (${year}-${month}-${day}) for EST compatibility`);
      return { year, month, day };
    }
  } else {
    // Local environment - use local date logic
    if (isFinalCollection) {
      // For FINAL collection locally, use previous local day
      const targetDate = new Date(currentDate);
      targetDate.setDate(targetDate.getDate() - 1);
      
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1; // getMonth() is 0-indexed
      const day = targetDate.getDate();
      
      console.log(`📅 Local FINAL collection: Using previous local date (${year}-${month}-${day})`);
      return { year, month, day };
    } else {
      // For MID-DAY collection locally, use current local date
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // getMonth() is 0-indexed
      const day = currentDate.getDate();
      
      console.log(`📅 Local MID-DAY collection: Using current local date (${year}-${month}-${day})`);
      return { year, month, day };
    }
  }
}
