// Test to show what date string is being sent to Treez
const currentDate = new Date();
console.log('🔍 Testing date string generation...');
console.log(`📅 Current UTC: ${currentDate.toISOString()}`);
console.log(`📅 Current EST: ${currentDate.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);

// Test FINAL collection date calculation
const isFinalCollection = true;
console.log(`\n📅 Testing FINAL collection date calculation...`);

if (isFinalCollection) {
  // For FINAL collection, we want the date that just ended at 9:00 PM EST
  // When GitHub Actions runs at 2:15 AM UTC (9:15 PM EST), we want the previous UTC day
  const targetDate = new Date(currentDate);
  targetDate.setUTCDate(targetDate.getUTCDate() - 1);
  
  const year = targetDate.getUTCFullYear();
  const month = targetDate.getUTCMonth() + 1; // getMonth() is 0-indexed
  const day = targetDate.getUTCDate();
  
  console.log(`📅 Target date object: year: ${year}, month: ${month}, day: ${day}`);
  
  // Generate the date string that would be sent to Treez
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  console.log(`📅 Date string sent to Treez: "${dateString}"`);
  
  // Show what this date actually is
  const actualDate = new Date(dateString);
  console.log(`📅 This represents: ${actualDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
}

console.log('\n✅ Date string test completed!'); 