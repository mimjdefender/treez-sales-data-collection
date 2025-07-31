const SalesReporter = require('./reporting');
const fs = require('fs');
const path = require('path');

console.log('📊 Testing reports with current CSV data...');

// Check what CSV files exist
const csvFiles = fs.readdirSync('.').filter(file => file.startsWith('treez-') && file.endsWith('.csv'));
console.log('📁 Found CSV files:', csvFiles);

// Show content of each CSV file
for (const file of csvFiles) {
  const content = fs.readFileSync(file, 'utf8');
  console.log(`\n📄 ${file}:`);
  console.log(content);
}

// Test the reporting system
const reporter = new SalesReporter();
const sales = reporter.loadTodaySales();

console.log('\n📈 Sales data loaded by reporting system:');
for (const [store, amount] of Object.entries(sales)) {
  console.log(`${store}: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
}

const totalSales = Object.values(sales).reduce((sum, amount) => sum + amount, 0);
console.log(`\n💰 Total Sales: $${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

// Generate reports
console.log('\n📊 Generating reports...');
reporter.run420Report().then(() => {
  console.log('✅ 4:20 PM report sent');
  return reporter.run915Report();
}).then(() => {
  console.log('✅ 9:15 PM report sent');
  console.log('📱 Check your Google Chat for the messages!');
}).catch(error => {
  console.error('❌ Report generation failed:', error.message);
}); 