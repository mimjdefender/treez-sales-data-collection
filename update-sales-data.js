const fs = require('fs');
const path = require('path');

// Current sales data (update these values manually)
const currentSales = {
  'cheboygan': 4925.41,
  'lowell': 1657.31,
  'alpena': 1196.88,
  'gaylord': 1549.58,
  'rc': 2394.62,
  'manistee': 2822.05
};

console.log('📊 Updating sales data...');

for (const [store, sales] of Object.entries(currentSales)) {
  const csvContent = `Store,Sales Amount,Timestamp\n${store},${sales},${new Date().toISOString()}`;
  const filePath = path.join(__dirname, `treez-${store}.csv`);
  fs.writeFileSync(filePath, csvContent);
  console.log(`✅ Updated ${store}: $${sales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
}

console.log('\n📊 Generating reports with updated data...');

// Generate reports
const SalesReporter = require('./reporting');
const reporter = new SalesReporter();

reporter.run420Report().then(() => {
  console.log('✅ 4:20 PM report sent');
  return reporter.run915Report();
}).then(() => {
  console.log('✅ 9:15 PM report sent');
  console.log('📱 Check your Google Chat for the messages!');
}).catch(error => {
  console.error('❌ Report generation failed:', error.message);
}); 