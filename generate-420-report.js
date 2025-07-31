const SalesReporter = require('./reporting');

async function generate420Report() {
  try {
    console.log('📊 Generating 4:20 PM Sales Report...');
    
    const reporter = new SalesReporter();
    await reporter.run420Report();
    
    console.log('✅ 4:20 PM report sent successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ 4:20 PM report failed:', error.message);
    process.exit(1);
  }
}

generate420Report(); 