const fs = require('fs');
const path = require('path');

// Create sample CSV files with current sales data
const sampleData = {
  'cheboygan': 4925.41,
  'lowell': 1657.31,
  'alpena': 1196.88,
  'gaylord': 1549.58,
  'rc': 2394.62,
  'manistee': 2822.05
};

console.log('📊 Creating sample CSV files with current sales data...');

for (const [store, sales] of Object.entries(sampleData)) {
  const csvContent = `Store,Sales Amount,Timestamp\n${store},${sales},${new Date().toISOString()}`;
  const filePath = path.join(__dirname, `treez-${store}.csv`);
  fs.writeFileSync(filePath, csvContent);
  console.log(`✅ Created ${filePath} with sales: $${sales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
}

console.log('\n📊 Testing data reading...');

// Test the reporting system's data reading
const SalesReporter = require('./reporting');
const reporter = new SalesReporter();

const sales = reporter.loadTodaySales();
console.log('\n📈 Sales data loaded:');
for (const [store, amount] of Object.entries(sales)) {
  console.log(`${store}: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
}

const totalSales = Object.values(sales).reduce((sum, amount) => sum + amount, 0);
console.log(`\n💰 Total Sales: $${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

// Test report generation
console.log('\n📊 Testing report generation...');
reporter.run420Report().then(() => {
  console.log('✅ 4:20 PM report test completed');
}).catch(error => {
  console.error('❌ 4:20 PM report test failed:', error.message);
}); 