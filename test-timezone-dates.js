// Test to check timezone and date differences
console.log(`🔍 Testing timezone and date differences...`);

const now = new Date();
console.log(`\n📅 Current Date/Time:`);
console.log(`  Local: ${now.toLocaleString()}`);
console.log(`  UTC: ${now.toUTCString()}`);
console.log(`  ISO: ${now.toISOString()}`);

// Check if we're in EST or UTC
const estOffset = -5; // EST is UTC-5
const currentHour = now.getUTCHours();
const estHour = (currentHour + estOffset + 24) % 24;

console.log(`\n⏰ Time Analysis:`);
console.log(`  UTC Hour: ${currentHour}`);
console.log(`  EST Hour: ${estHour}`);

// Check if we're in the same day
const utcDate = now.getUTCDate();
const localDate = now.getDate();
console.log(`\n📆 Date Analysis:`);
console.log(`  UTC Date: ${utcDate}`);
console.log(`  Local Date: ${localDate}`);
console.log(`  Same Day: ${utcDate === localDate ? 'Yes' : 'No'}`);

// Simulate the workflow times
console.log(`\n🕐 Workflow Time Analysis:`);

// 4:20 PM EST = 9:20 PM UTC (same day)
const time420pm = new Date();
time420pm.setUTCHours(21, 20, 0, 0); // 9:20 PM UTC
console.log(`  4:20 PM EST (9:20 PM UTC):`);
console.log(`    Date: ${time420pm.getUTCDate()}`);
console.log(`    Time: ${time420pm.toUTCString()}`);

// 9:15 PM EST = 2:15 AM UTC (next day)
const time915pm = new Date();
time915pm.setUTCHours(2, 15, 0, 0); // 2:15 AM UTC
time915pm.setUTCDate(time915pm.getUTCDate() + 1); // Next day
console.log(`  9:15 PM EST (2:15 AM UTC next day):`);
console.log(`    Date: ${time915pm.getUTCDate()}`);
console.log(`    Time: ${time915pm.toUTCString()}`);

console.log(`\n💡 The 9:15 PM workflow runs on a different date in UTC!`);
console.log(`   This could explain why the sales data is different.`); 