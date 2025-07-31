const SalesReporter = require('./reporting');

async function generate915Report() {
  try {
    console.log('📊 Generating 9:15 PM Final Sales Report...');
    console.log('🏪 All stores closed at 9:00 PM - collecting final sales data');
    
    const reporter = new SalesReporter();
    await reporter.run915Report();
    
    console.log('✅ 9:15 PM final report sent successfully');
    console.log('📈 Final daily rankings and streak data updated');
    process.exit(0);
  } catch (error) {
    console.error('❌ 9:15 PM final report failed:', error.message);
    process.exit(1);
  }
}

generate915Report(); 